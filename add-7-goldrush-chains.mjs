// add-7-goldrush-chains.mjs - Add the 7 specific GoldRush chains
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

// The 7 chains to add
const CHAINS_TO_ADD = [
  { name: 'StarkNet', category: 'Frontier', priority: 2 },
  { name: 'Cronos', category: 'Frontier', priority: 2 },
  { name: 'Polygon zkEVM', category: 'Frontier', priority: 2 },
  { name: 'Ethereum', category: 'Foundational', priority: 1 },
  { name: 'Solana', category: 'Frontier', priority: 2 },
  { name: 'OP Mainnet', category: 'Foundational', priority: 1 },
  { name: 'Arbitrum', category: 'Frontier', priority: 2 },
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

// Check if chain already exists (with fuzzy matching)
async function chainExists(chainModelId, chainName) {
  const existingChains = await client.items.list({
    filter: { type: chainModelId }
  });
  
  const normalized = normalizeChainName(chainName);
  return existingChains.some(chain => {
    const existingName = (chain.title || chain.name || '').toLowerCase().trim();
    const existingNormalized = normalizeChainName(existingName);
    return existingNormalized === normalized || 
           existingNormalized.includes(normalized) || 
           normalized.includes(existingNormalized);
  });
}

// Create chain
async function createChain(chainModelId, chainData) {
  try {
    const payload = {
      item_type: { type: "item_type", id: chainModelId },
      name: chainData.name,
    };

    const created = await client.items.create(payload);
    await client.items.publish(created.id);
    return created;
  } catch (err) {
    console.error(`[error creating ${chainData.name}]`, err.body?.data || err.message || err);
    throw err;
  }
}

// Main function
async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🔍 Finding Chain model...\n');
    const chainModelId = await findModelIdByApiKey('chain');
    console.log(`✅ Found Chain model (id: ${chainModelId})\n`);

    console.log(`📋 Adding ${CHAINS_TO_ADD.length} chains...\n`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const chainData of CHAINS_TO_ADD) {
      const exists = await chainExists(chainModelId, chainData.name);
      
      if (exists) {
        console.log(`⏭️  Skipping "${chainData.name}" - already exists`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`➕ Creating "${chainData.name}"...`);
        const created = await createChain(chainModelId, chainData);
        console.log(`   ✅ Created (id: ${created.id})`);
        createdCount++;
      } catch (err) {
        console.error(`   ❌ Failed to create "${chainData.name}":`, err.message);
      }
    }

    console.log(`\n✅ Complete!`);
    console.log(`   Created: ${createdCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total: ${CHAINS_TO_ADD.length}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();

