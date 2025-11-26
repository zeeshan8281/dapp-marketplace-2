// link-chains-to-dapps.mjs - Link chains to dapps based on alchemyRecentActivity data
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

// Normalize chain name for matching (case-insensitive, handles variations)
function normalizeChainName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+(mainnet|testnet|network|chain)$/i, '')
    .trim();
}

// Find chain by name (fuzzy matching)
async function findChainByName(chainName, allChains) {
  if (!chainName || typeof chainName !== 'string') return null;
  
  const normalized = normalizeChainName(chainName);
  
  // Try exact match first
  let match = allChains.find(c => {
    const chainNameNormalized = normalizeChainName(c.name || c.title || '');
    return chainNameNormalized === normalized;
  });
  
  if (match) return match;
  
  // Try partial match
  match = allChains.find(c => {
    const chainNameNormalized = normalizeChainName(c.name || c.title || '');
    return chainNameNormalized.includes(normalized) || normalized.includes(chainNameNormalized);
  });
  
  return match || null;
}

// Extract chains from alchemyRecentActivity
function extractChainsFromAlchemy(alchemyData) {
  if (!alchemyData) return [];
  
  try {
    const data = typeof alchemyData === 'string' 
      ? JSON.parse(alchemyData) 
      : alchemyData;
    
    if (!data.chains || !Array.isArray(data.chains)) return [];
    
    const chains = [];
    for (const chain of data.chains) {
      let chainName = null;
      
      if (typeof chain === 'string') {
        // Skip Alchemy record IDs (they start with "rec" and are long)
        if (chain.startsWith('rec') && chain.length > 10) {
          continue;
        }
        chainName = chain;
      } else if (chain && typeof chain === 'object') {
        chainName = chain.name || chain.title || chain;
      }
      
      if (chainName && typeof chainName === 'string' && chainName.trim()) {
        chains.push(chainName.trim());
      }
    }
    
    return [...new Set(chains)]; // Remove duplicates
  } catch (e) {
    return [];
  }
}

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🔗 Linking chains to dapps...\n');
    
    // Find models
    const itemTypes = await client.itemTypes.list();
    const dappModel = itemTypes.find(t => {
      const apiKey = t.attributes?.api_key || t.api_key;
      return apiKey === 'dapp';
    });
    
    const chainModel = itemTypes.find(t => {
      const apiKey = t.attributes?.api_key || t.api_key;
      return apiKey === 'chain';
    });
    
    if (!dappModel) {
      console.error('❌ Dapp model not found');
      process.exit(1);
    }
    
    if (!chainModel) {
      console.error('❌ Chain model not found');
      process.exit(1);
    }
    
    console.log(`✅ Found Dapp model: ${dappModel.name}`);
    console.log(`✅ Found Chain model: ${chainModel.name}\n`);
    
    // Fetch all chains
    console.log('📋 Fetching all chains...');
    const allChains = await client.items.list({
      filter: { type: chainModel.id }
    });
    console.log(`   Found ${allChains.length} chains\n`);
    
    // Create a map for quick lookup
    const chainMap = new Map();
    allChains.forEach(chain => {
      const name = chain.name || chain.title || '';
      const normalized = normalizeChainName(name);
      if (normalized) {
        chainMap.set(normalized, chain);
        // Also store by original name for exact matches
        chainMap.set(name.toLowerCase().trim(), chain);
      }
    });
    
    // Fetch all dapps
    console.log('📋 Fetching all dapps...');
    const allDapps = await client.items.list({
      filter: { type: dappModel.id }
    });
    console.log(`   Found ${allDapps.length} dapps\n`);
    
    let linked = 0;
    let skipped = 0;
    let failed = 0;
    let totalLinks = 0;
    
    console.log('🔗 Processing dapps...\n');
    
    for (let i = 0; i < allDapps.length; i++) {
      const dapp = allDapps[i];
      const dappName = dapp.title || dapp.name || dapp.id;
      
      try {
        // Extract chains from alchemyRecentActivity
        const alchemyData = dapp.alchemyRecentActivity || dapp.alchemy_recent_activity;
        const chainNames = extractChainsFromAlchemy(alchemyData);
        
        if (chainNames.length === 0) {
          skipped++;
          continue;
        }
        
        // Find matching chain records
        const chainIds = [];
        const matchedChains = [];
        
        for (const chainName of chainNames) {
          // Try direct lookup first
          let chain = chainMap.get(chainName.toLowerCase().trim());
          
          // If not found, try fuzzy matching
          if (!chain) {
            chain = await findChainByName(chainName, allChains);
          }
          
          if (chain && chain.id) {
            chainIds.push(chain.id);
            matchedChains.push(chain.name || chain.title || chainName);
          }
        }
        
        if (chainIds.length === 0) {
          skipped++;
          continue;
        }
        
        // Check current chains on dapp
        const currentChains = dapp.chains || [];
        const currentChainIds = currentChains.map(c => 
          typeof c === 'string' ? c : (c.id || c)
        );
        
        // Only update if different
        const newChainIds = [...new Set(chainIds)];
        const needsUpdate = JSON.stringify(newChainIds.sort()) !== JSON.stringify(currentChainIds.sort());
        
        if (!needsUpdate) {
          skipped++;
          continue;
        }
        
        // Update dapp with chain links (just IDs as strings)
        await client.items.update(dapp.id, {
          chains: newChainIds
        });
        
        linked++;
        totalLinks += newChainIds.length;
        console.log(`   ✅ "${dappName}": Linked ${newChainIds.length} chain(s) - [${matchedChains.join(', ')}]`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        failed++;
        console.error(`   ❌ Failed to process "${dappName}":`, err.message);
      }
      
      // Progress indicator
      if ((i + 1) % 50 === 0) {
        console.log(`   📊 Progress: ${i + 1}/${allDapps.length} dapps processed...`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`   Total dapps: ${allDapps.length}`);
    console.log(`   Dapps with chains linked: ${linked}`);
    console.log(`   Total chain relationships: ${totalLinks}`);
    console.log(`   Skipped (no chains found): ${skipped}`);
    console.log(`   Failed: ${failed}`);
    console.log('\n✅ Chain linking complete!');
    console.log('💡 GraphQL queries can now use: chains { id name }');
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  }
}

main();

