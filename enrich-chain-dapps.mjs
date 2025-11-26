// enrich-chain-dapps.mjs - Enrich chain dapps with data from goldrush-docs
import { buildClient } from "@datocms/cma-client-node";
import fs from "fs";
import path from "path";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });
const CHAINS_JSON_PATH = "/Users/zeeshan/Downloads/goldrush-docs-main/data/dato-chains.json";
const CHAINS_MDX_DIR = "/Users/zeeshan/Downloads/goldrush-docs-main/chains";

// Normalize chain name for matching
function normalizeChainName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Extract overview from MDX file
function extractOverviewFromMDX(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract content between "## Overview" and next ##
    const overviewMatch = content.match(/## Overview\s*\n\n([\s\S]*?)(?=\n##|\n###|$)/);
    if (overviewMatch && overviewMatch[1]) {
      return overviewMatch[1]
        .trim()
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
        .trim();
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🚀 Enriching chain dapps with goldrush-docs data...\n');
    
    // Load chains data
    const chainsData = JSON.parse(fs.readFileSync(CHAINS_JSON_PATH, 'utf8'));
    const allChains = chainsData.data.allBlockchains
      .filter(c => !c.testnet && c.displayname && !c.displayname.toLowerCase().includes('testnet'))
      .map(c => ({
        name: c.displayname,
        chainname: c.chainname,
        chainid: c.chainid,
        description: c.description && c.description !== '-' ? c.description : null,
        url: c.url,
        blockexplorer: c.blockexplorer,
        nativegastoken: c.nativegastoken,
        blocktime: c.blocktime,
        support: c.support, // foundational, frontier, community, archived
        imgsvg: c.imgsvg?.url,
        imgwhite: c.imgwhite?.url,
        imgblack: c.imgblack?.url,
        chainthemecolor: c.chainthemecolor?.hex
      }))
      .filter((c, idx, arr) => arr.findIndex(x => x.name === c.name) === idx); // Remove duplicates
    
    console.log(`📋 Found ${allChains.length} chains in goldrush-docs\n`);
    
    // Create lookup map
    const chainMap = new Map();
    allChains.forEach(chain => {
      const normalized = normalizeChainName(chain.name);
      chainMap.set(normalized, chain);
      // Also store by exact name
      chainMap.set(chain.name.toLowerCase().trim(), chain);
    });
    
    // Find Dapp model
    const itemTypes = await client.itemTypes.list();
    const dappModel = itemTypes.find(t => {
      const apiKey = t.attributes?.api_key || t.api_key;
      return apiKey === 'dapp';
    });
    
    if (!dappModel) {
      console.error('❌ Dapp model not found');
      process.exit(1);
    }
    
    // Fetch all dapps (paginated)
    const allDapps = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    
    while (hasMore) {
      const pageDapps = await client.items.list({
        filter: { type: dappModel.id },
        page: { limit, offset }
      });
      
      if (pageDapps.length === 0) {
        hasMore = false;
      } else {
        allDapps.push(...pageDapps);
        if (pageDapps.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
    }
    
    console.log(`📋 Found ${allDapps.length} dapps in DatoCMS\n`);
    
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    
    // Process each dapp
    for (const dapp of allDapps) {
      const dappTitle = dapp.title || '';
      if (!dappTitle) continue;
      
      // Try to find matching chain
      const normalized = normalizeChainName(dappTitle);
      let chainData = chainMap.get(normalized) || chainMap.get(dappTitle.toLowerCase().trim());
      
      // If not found, try to find by partial match
      if (!chainData) {
        for (const [key, chain] of chainMap.entries()) {
          if (normalized.includes(key) || key.includes(normalized)) {
            chainData = chain;
            break;
          }
        }
      }
      
      if (!chainData) {
        skipped++;
        continue;
      }
      
      try {
        // Build update payload
        const updateData = {};
        
        // Update description if better one exists
        if (chainData.description && chainData.description.length > (dapp.shortDescription || '').length) {
          updateData.short_description = chainData.description;
        }
        
        // Build enriched alchemyRecentActivity data
        let alchemyData = {};
        try {
          if (dapp.alchemyRecentActivity || dapp.alchemy_recent_activity) {
            const existing = typeof (dapp.alchemyRecentActivity || dapp.alchemy_recent_activity) === 'string'
              ? JSON.parse(dapp.alchemyRecentActivity || dapp.alchemy_recent_activity)
              : (dapp.alchemyRecentActivity || dapp.alchemy_recent_activity);
            alchemyData = { ...existing };
          }
        } catch (e) {
          // Start fresh if parse fails
        }
        
        // Enrich with chain data
        alchemyData.name = chainData.name;
        alchemyData.websiteUrl = chainData.url || alchemyData.websiteUrl;
        alchemyData.website = chainData.url || alchemyData.website;
        alchemyData.description = chainData.description || alchemyData.description;
        alchemyData.source = 'goldrush_chain';
        alchemyData.isChain = true;
        
        // Add chain metadata
        alchemyData.chainMetadata = {
          chainName: chainData.chainname,
          chainId: chainData.chainid,
          nativeGasToken: chainData.nativegastoken,
          blockTime: chainData.blocktime,
          supportLevel: chainData.support,
          blockExplorer: chainData.blockexplorer,
          themeColor: chainData.chainthemecolor
        };
        
        // Try to get overview from MDX file
        const mdxFileName = chainData.chainname?.replace(/-mainnet$/, '').replace(/-testnet$/, '') || normalized;
        const mdxPath = path.join(CHAINS_MDX_DIR, `${mdxFileName}.mdx`);
        const overview = extractOverviewFromMDX(mdxPath);
        
        if (overview && overview.length > (chainData.description || '').length) {
          alchemyData.longDescription = overview;
          if (!updateData.short_description || overview.length > updateData.short_description.length) {
            updateData.short_description = overview.substring(0, 500) + (overview.length > 500 ? '...' : '');
          }
        }
        
        updateData.alchemy_recent_activity = JSON.stringify(alchemyData);
        
        // Update category based on support level
        if (chainData.support) {
          const categoryMap = {
            'foundational': 'Foundational Chain',
            'frontier': 'Frontier Chain',
            'community': 'Community Chain',
            'archived': 'Archived Chain'
          };
          const category = categoryMap[chainData.support] || chainData.support;
          updateData.category_defillama = category;
        }
        
        // Update dapp
        await client.items.update(dapp.id, updateData);
        
        updated++;
        console.log(`   ✅ Enriched: "${dappTitle}"`);
        console.log(`      - Description: ${chainData.description ? '✅' : '❌'}`);
        console.log(`      - Website: ${chainData.url ? '✅' : '❌'}`);
        console.log(`      - Block Explorer: ${chainData.blockexplorer ? '✅' : '❌'}`);
        console.log(`      - Chain ID: ${chainData.chainid || 'N/A'}`);
        console.log(`      - Native Token: ${chainData.nativegastoken || 'N/A'}`);
        console.log(`      - Support Level: ${chainData.support || 'N/A'}`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (err) {
        failed++;
        console.error(`   ❌ Failed to enrich "${dappTitle}":`, err.message);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`   Total dapps: ${allDapps.length}`);
    console.log(`   Enriched: ${updated}`);
    console.log(`   Skipped (no match): ${skipped}`);
    console.log(`   Failed: ${failed}`);
    console.log('\n✅ Chain enrichment complete!');
    console.log('💡 All chain dapps now have rich metadata from goldrush-docs.');
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  }
}

main();


