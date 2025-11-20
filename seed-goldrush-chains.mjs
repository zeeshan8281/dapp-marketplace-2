// seed-goldrush-chains.mjs - Seed chains from GoldRush supported chains list
import { buildClient } from "@datocms/cma-client-node";

/*
  USAGE:
  - Set DATOCMS_API_TOKEN (full-access CMA token)
  - Run: DATOCMS_API_TOKEN=xxxxx node seed-goldrush-chains.mjs

  This script:
  1. Seeds all 48 GoldRush-supported chains into DatoCMS
  2. Marks chains with priority levels (Foundational > Frontier > Community > Archived)
  3. These chains will be prioritized when seeding dapps
*/

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

// GoldRush supported chains from https://goldrush.dev/docs/chains/overview
// Priority: 1 = Foundational, 2 = Frontier, 3 = Community, 4 = Archived
const GOLDRUSH_CHAINS = [
  // Foundational Chains (Priority 1) - Guaranteed product parity
  { name: 'Ethereum', goldrushName: 'eth-mainnet', category: 'Foundational', priority: 1, mainnet: true, testnet: true },
  { name: 'Polygon', goldrushName: 'matic-mainnet', category: 'Foundational', priority: 1, mainnet: true, testnet: true },
  { name: 'BNB Smart Chain', goldrushName: 'bsc-mainnet', category: 'Foundational', priority: 1, mainnet: true, testnet: true },
  { name: 'Optimism', goldrushName: 'optimism-mainnet', category: 'Foundational', priority: 1, mainnet: true, testnet: true },
  { name: 'Base', goldrushName: 'base-mainnet', category: 'Foundational', priority: 1, mainnet: true, testnet: true },
  { name: 'Gnosis', goldrushName: 'gnosis-mainnet', category: 'Foundational', priority: 1, mainnet: true, testnet: true },
  
  // Frontier Chains (Priority 2) - Cutting-edge networks
  { name: 'Bitcoin', goldrushName: 'btc-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  { name: 'Avalanche C-Chain', goldrushName: 'avalanche-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: true },
  { name: 'ADI', goldrushName: 'adi-testnet', category: 'Frontier', priority: 2, mainnet: false, testnet: true },
  { name: 'ApeChain', goldrushName: 'apechain-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  { name: 'Arbitrum', goldrushName: 'arbitrum-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: true },
  { name: 'Arbitrum Nova', goldrushName: 'arbitrum-nova-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  { name: 'Astar', goldrushName: 'astar-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  { name: 'Aurora', goldrushName: 'aurora-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  { name: 'Boba', goldrushName: 'boba-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  { name: 'Canto', goldrushName: 'canto-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  { name: 'Celo', goldrushName: 'celo-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  { name: 'Cronos', goldrushName: 'cronos-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  { name: 'Cronos zkEVM', goldrushName: 'cronos-zkevm-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  { name: 'Oasis', goldrushName: 'oasis-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  { name: 'Manta Pacific', goldrushName: 'manta-pacific-mainnet', category: 'Frontier', priority: 2, mainnet: false, testnet: true },
  { name: 'Moonbeam', goldrushName: 'moonbeam-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  { name: 'Moonriver', goldrushName: 'moonriver-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  { name: 'Redstone', goldrushName: 'redstone-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  { name: 'ZetaChain', goldrushName: 'zetachain-mainnet', category: 'Frontier', priority: 2, mainnet: true, testnet: false },
  
  // Community Chains (Priority 3) - Community-supported networks
  { name: 'Blast', goldrushName: 'blast-mainnet', category: 'Community', priority: 3, mainnet: true, testnet: false },
  { name: 'Fantom', goldrushName: 'fantom-mainnet', category: 'Community', priority: 3, mainnet: true, testnet: false },
  { name: 'Linea', goldrushName: 'linea-mainnet', category: 'Community', priority: 3, mainnet: true, testnet: true },
  { name: 'Mantle', goldrushName: 'mantle-mainnet', category: 'Community', priority: 3, mainnet: true, testnet: false },
  { name: 'Scroll', goldrushName: 'scroll-mainnet', category: 'Community', priority: 3, mainnet: true, testnet: true },
  { name: 'zkSync Era', goldrushName: 'zksync-era-mainnet', category: 'Community', priority: 3, mainnet: true, testnet: false },
  
  // Archived Chains (Priority 4) - Limited data availability
  { name: 'Harmony', goldrushName: 'harmony-mainnet', category: 'Archived', priority: 4, mainnet: true, testnet: true },
  { name: 'Lisk', goldrushName: 'lisk-mainnet', category: 'Archived', priority: 4, mainnet: true, testnet: true },
  { name: 'Loot Chain', goldrushName: 'loot-chain-mainnet', category: 'Archived', priority: 4, mainnet: true, testnet: false },
];

// Helper: Find model ID by API key
async function findModelIdByApiKey(apiKey) {
  const itemTypes = await client.itemTypes.list();
  const match = itemTypes.find((t) => {
    const modelApiKey = t.attributes?.api_key || t.api_key;
    return modelApiKey === apiKey;
  });
  if (!match) throw new Error(`Model with api_key="${apiKey}" not found.`);
  return match.id;
}

// Normalize chain name for matching
function normalizeChainName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Create or update chain
async function createOrUpdateChain(chainModelId, chainData) {
  try {
    // Check if chain exists
    const existingChains = await client.items.list({
      filter: {
        type: chainModelId,
        fields: {
          name: { eq: chainData.name }
        }
      }
    });

    const payload = {
      item_type: { type: "item_type", id: chainModelId },
      name: chainData.name,
      // Store GoldRush metadata (if you have fields for these)
      // You may need to add these fields to your Chain model in DatoCMS
    };

    // Try to add GoldRush-specific fields if they exist in your schema
    // These are optional - adjust based on your actual DatoCMS schema
    if (chainData.goldrushName) {
      // payload.goldrush_name = chainData.goldrushName; // Uncomment if field exists
    }
    if (chainData.category) {
      // payload.category = chainData.category; // Uncomment if field exists
    }
    if (chainData.priority) {
      // payload.priority = chainData.priority; // Uncomment if field exists
    }

    if (existingChains.length > 0) {
      // Update existing chain
      const existing = existingChains[0];
      await client.items.update(existing.id, payload);
      console.log(`[updated] "${chainData.name}" (priority: ${chainData.priority}, category: ${chainData.category})`);
      return { id: existing.id, isNew: false };
    } else {
      // Create new chain
      const created = await client.items.create(payload);
      const itemId = created.id || created.data?.id || created.data?.id;
      console.log(`[created] "${chainData.name}" (priority: ${chainData.priority}, category: ${chainData.category})`);
      return { id: itemId, isNew: true };
    }
  } catch (err) {
    console.error(`[error] Failed to create/update "${chainData.name}":`, err.body?.data || err.message || err);
    return null;
  }
}

// Main function
async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🚀 Seeding GoldRush-supported chains...\n');
    console.log(`📊 Total chains to seed: ${GOLDRUSH_CHAINS.length}\n`);

    // Find Chain model
    const chainModelId = await findModelIdByApiKey('chain');
    console.log(`✅ Found Chain model (id: ${chainModelId})\n`);

    // Sort by priority (Foundational first)
    const sortedChains = [...GOLDRUSH_CHAINS].sort((a, b) => a.priority - b.priority);

    let created = 0;
    let updated = 0;
    let failed = 0;

    // Process Foundational chains first
    console.log('🌟 Processing Foundational Chains (Priority 1)...\n');
    const foundational = sortedChains.filter(c => c.priority === 1);
    for (const chain of foundational) {
      const result = await createOrUpdateChain(chainModelId, chain);
      if (result && result.id) {
        if (result.isNew) {
          created++;
        } else {
          updated++;
        }
      } else {
        failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Process Frontier chains
    console.log('\n⚡ Processing Frontier Chains (Priority 2)...\n');
    const frontier = sortedChains.filter(c => c.priority === 2);
    for (const chain of frontier) {
      const result = await createOrUpdateChain(chainModelId, chain);
      if (result && result.id) {
        if (result.isNew) {
          created++;
        } else {
          updated++;
        }
      } else {
        failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Process Community chains
    console.log('\n👥 Processing Community Chains (Priority 3)...\n');
    const community = sortedChains.filter(c => c.priority === 3);
    for (const chain of community) {
      const result = await createOrUpdateChain(chainModelId, chain);
      if (result && result.id) {
        if (result.isNew) {
          created++;
        } else {
          updated++;
        }
      } else {
        failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Process Archived chains
    console.log('\n📦 Processing Archived Chains (Priority 4)...\n');
    const archived = sortedChains.filter(c => c.priority === 4);
    for (const chain of archived) {
      const result = await createOrUpdateChain(chainModelId, chain);
      if (result && result.id) {
        if (result.isNew) {
          created++;
        } else {
          updated++;
        }
      } else {
        failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n✅ Chain seeding complete!');
    console.log(`   Created: ${created} chains`);
    console.log(`   Updated: ${updated} chains`);
    console.log(`   Failed: ${failed} chains`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Seed dapps (will prioritize GoldRush chains):`);
    console.log(`      DATOCMS_API_TOKEN=xxxxx node seed-alchemy-dapps.mjs`);
    console.log(`   2. Publish chains:`);
    console.log(`      DATOCMS_API_TOKEN=xxxxx node check-and-publish-dapps.mjs`);

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();

