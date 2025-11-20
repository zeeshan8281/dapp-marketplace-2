// add-7-chains.mjs - Delete 8 dapps and rename 7 existing chains
import { buildClient } from "@datocms/cma-client-node";

/*
  USAGE:
  - Set DATOCMS_API_TOKEN (full-access CMA token)
  - Run: DATOCMS_API_TOKEN=xxxxx node add-7-chains.mjs

  This script:
  1. Deletes 8 oldest dapps to free up space
  2. Renames 7 existing chains to: StarkNet, Cronos, Polygon zkEVM, Ethereum, Solana, OP Mainnet, Arbitrum
     (This avoids creating new items and hitting plan limits)
*/

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

// The 7 chains to rename existing chains to (excluding Celer Network)
const CHAINS_TO_RENAME = [
  { name: 'StarkNet', priority: 2, category: 'Frontier' },
  { name: 'Cronos', priority: 2, category: 'Frontier' },
  { name: 'Polygon zkEVM', priority: 2, category: 'Frontier' },
  { name: 'Ethereum', priority: 1, category: 'Foundational' },
  { name: 'Solana', priority: 2, category: 'Frontier' },
  { name: 'OP Mainnet', priority: 1, category: 'Foundational' },
  { name: 'Arbitrum', priority: 2, category: 'Frontier' },
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

// Delete 8 oldest dapps
async function delete8Dapps() {
  try {
    console.log('🗑️  Deleting 8 oldest dapps...\n');

    const dappModelId = await findModelIdByApiKey('dapp');
    
    // Get all dapps, sorted by creation date (oldest first)
    const items = await client.items.list({ 
      filter: { type: dappModelId },
      orderBy: { _createdAt: 'ASC' }
    });

    if (items.length === 0) {
      console.log('   No dapps found');
      return { deleted: 0 };
    }

    console.log(`   Found ${items.length} total dapps`);
    const toDelete = items.slice(0, Math.min(8, items.length));
    console.log(`   Deleting ${toDelete.length} oldest dapps...\n`);

    let deleted = 0;
    let failed = 0;

    for (const item of toDelete) {
      try {
        const itemId = item.id;
        const title = item.attributes?.title || itemId;
        
        await client.items.destroy(itemId);
        console.log(`   [deleted] ${title} (${itemId})`);
        deleted++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`   [error] Failed to delete ${item.id}:`, err.message);
        failed++;
      }
    }

    console.log(`\n✅ Deleted ${deleted} dapps (${failed} failed)\n`);
    return { deleted, failed };
  } catch (err) {
    console.error('❌ Error deleting dapps:', err.message);
    return { deleted: 0, failed: 0 };
  }
}


// Rename 7 existing chains
async function rename7Chains() {
  try {
    console.log('🔄 Renaming 7 existing chains...\n');

    const chainModelId = await findModelIdByApiKey('chain');
    console.log(`✅ Found Chain model (id: ${chainModelId})\n`);

    // Get all existing chains
    const existingChains = await client.items.list({
      filter: { type: chainModelId },
      orderBy: { _createdAt: 'ASC' }
    });

    console.log(`   Found ${existingChains.length} existing chains\n`);

    if (existingChains.length < CHAINS_TO_RENAME.length) {
      console.error(`❌ Not enough chains to rename! Need ${CHAINS_TO_RENAME.length}, found ${existingChains.length}`);
      return { renamed: 0, failed: 0 };
    }

    let renamed = 0;
    let failed = 0;

    // Rename the first 7 chains to match our target names
    for (let i = 0; i < CHAINS_TO_RENAME.length; i++) {
      const existingChain = existingChains[i];
      const targetChain = CHAINS_TO_RENAME[i];
      
      try {
        const oldName = existingChain.attributes?.name || existingChain.name || 'Unknown';
        
        await client.items.update(existingChain.id, {
          name: targetChain.name
        });
        
        console.log(`[renamed] "${oldName}" → "${targetChain.name}"`);
        renamed++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`[error] Failed to rename chain ${existingChain.id}:`, err.body?.data || err.message || err);
        failed++;
      }
    }

    console.log('\n✅ Chain renaming complete!');
    console.log(`   Renamed: ${renamed} chains`);
    console.log(`   Failed: ${failed} chains`);

    return { renamed, failed };
  } catch (err) {
    console.error('❌ Error renaming chains:', err.message);
    return { renamed: 0, failed: 0 };
  }
}

// Main function
async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🔄 Deleting 8 dapps and renaming 7 existing chains...\n');
    console.log('Chains to rename to:');
    CHAINS_TO_RENAME.forEach((chain, i) => {
      console.log(`   ${i + 1}. ${chain.name} (${chain.category})`);
    });
    console.log('');

    // Step 1: Delete 8 dapps
    const deleteResult = await delete8Dapps();
    
    if (deleteResult.deleted < 8) {
      console.warn(`⚠️  Only deleted ${deleteResult.deleted} dapps (needed 8). Continuing anyway...\n`);
    }

    // Step 2: Rename 7 existing chains (to avoid creating new items)
    const renameResult = await rename7Chains();

    console.log('\n✅ All operations complete!');
    console.log(`   Dapps deleted: ${deleteResult.deleted}`);
    console.log(`   Chains renamed: ${renameResult.renamed}`);
    console.log(`   Chains failed: ${renameResult.failed}`);

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();

