// cleanup-items.mjs - Clean up items to free up space within DatoCMS limits
import { buildClient } from "@datocms/cma-client-node";

/*
  USAGE:
  - Set DATOCMS_API_TOKEN (full-access CMA token)
  - Run: DATOCMS_API_TOKEN=xxxxx node cleanup-items.mjs [MODEL] [COUNT]
  
  OPTIONS:
  - MODEL (optional): Model API key to clean (e.g., "dapp", "chain", "post")
  - COUNT (optional): Number of items to delete (default: 10)
  
  EXAMPLES:
  - Delete 10 oldest dapps: DATOCMS_API_TOKEN=xxxxx node cleanup-items.mjs dapp 10
  - Delete 5 oldest posts: DATOCMS_API_TOKEN=xxxxx node cleanup-items.mjs post 5
  - Delete all test items: DATOCMS_API_TOKEN=xxxxx node cleanup-items.mjs
*/

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

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

// Delete items from a model
async function deleteItems(modelApiKey, count = 10) {
  try {
    console.log(`🗑️  Deleting ${count} oldest items from "${modelApiKey}" model...\n`);

    const modelId = await findModelIdByApiKey(modelApiKey);
    
    // Get all items, sorted by creation date (oldest first)
    const items = await client.items.list({ 
      filter: { type: modelId },
      orderBy: { _createdAt: 'ASC' }
    });

    if (items.length === 0) {
      console.log(`   No items found in "${modelApiKey}" model`);
      return { deleted: 0, total: 0 };
    }

    console.log(`   Found ${items.length} total items`);
    const toDelete = items.slice(0, Math.min(count, items.length));
    console.log(`   Deleting ${toDelete.length} oldest items...\n`);

    let deleted = 0;
    let failed = 0;

    for (const item of toDelete) {
      try {
        const itemId = item.id;
        const title = item.attributes?.title || item.attributes?.name || itemId;
        
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

    return { deleted, total: items.length, failed };
  } catch (err) {
    console.error(`❌ Error deleting items from "${modelApiKey}":`, err.message);
    return { deleted: 0, total: 0, failed: 0 };
  }
}

// Show current usage
async function showUsage() {
  try {
    console.log('📊 Current DatoCMS Usage:\n');

    const itemTypes = await client.itemTypes.list();
    const usage = {};

    for (const itemType of itemTypes) {
      const apiKey = itemType.attributes?.api_key || itemType.api_key;
      const name = itemType.attributes?.name || itemType.name || 'Unknown';
      
      try {
        const items = await client.items.list({ filter: { type: itemType.id } });
        const count = items.length;
        usage[apiKey || name] = { name, count, apiKey: apiKey || 'N/A' };
      } catch (err) {
        usage[apiKey || name] = { name, count: 'Error', apiKey: apiKey || 'N/A' };
      }
    }

    let total = 0;
    console.log('Breakdown by Model:');
    console.log('─'.repeat(60));
    Object.entries(usage)
      .sort((a, b) => (b[1].count || 0) - (a[1].count || 0))
      .forEach(([key, data]) => {
        const count = typeof data.count === 'number' ? data.count : 0;
        total += count;
        console.log(`  ${data.name.padEnd(30)} (${data.apiKey.padEnd(20)}): ${data.count}`);
      });
    console.log('─'.repeat(60));
    console.log(`\nTotal Items: ${total}\n`);

    return { usage, total };
  } catch (err) {
    console.error('❌ Error getting usage:', err.message);
    return { usage: {}, total: 0 };
  }
}

// Main function
async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  // Get arguments
  const modelApiKey = process.argv[2] || null;
  const count = process.argv[3] ? parseInt(process.argv[3], 10) : 10;

  if (count <= 0) {
    console.error('❌ Count must be a positive number');
    process.exit(1);
  }

  try {
    console.log('🧹 DatoCMS Cleanup Tool\n');

    // Show current usage
    const { usage, total } = await showUsage();

    if (!modelApiKey) {
      console.log('💡 Usage:');
      console.log('   DATOCMS_API_TOKEN=xxxxx node cleanup-items.mjs [MODEL] [COUNT]');
      console.log('\n   Examples:');
      console.log('   - Delete 10 oldest dapps: node cleanup-items.mjs dapp 10');
      console.log('   - Delete 5 oldest posts: node cleanup-items.mjs post 5');
      console.log('   - Delete 20 oldest items from any model: node cleanup-items.mjs [model] 20');
      console.log('\n   Available models:');
      Object.entries(usage).forEach(([key, data]) => {
        if (typeof data.count === 'number' && data.count > 0) {
          console.log(`     - ${data.apiKey} (${data.name}): ${data.count} items`);
        }
      });
      return;
    }

    // Delete items
    const result = await deleteItems(modelApiKey, count);

    console.log('\n✅ Cleanup complete!');
    console.log(`   Deleted: ${result.deleted} items`);
    console.log(`   Failed: ${result.failed} items`);
    console.log(`   Remaining in "${modelApiKey}": ${result.total - result.deleted} items`);

    // Show updated usage
    console.log('\n📊 Updated Usage:');
    const { total: newTotal } = await showUsage();
    console.log(`\n   Freed up: ${total - newTotal} items`);

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();

