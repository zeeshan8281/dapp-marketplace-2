// check-datocms-limits.mjs - Check current DatoCMS usage and plan limits
import { buildClient } from "@datocms/cma-client-node";

/*
  USAGE:
  - Set DATOCMS_API_TOKEN (full-access CMA token)
  - Run: DATOCMS_API_TOKEN=xxxxx node check-datocms-limits.mjs

  This script:
  1. Counts total items in your DatoCMS project
  2. Shows breakdown by model type
  3. Helps you understand your current usage
*/

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('📊 Checking DatoCMS usage...\n');

    // Get all item types
    const itemTypes = await client.itemTypes.list();
    console.log(`✅ Found ${itemTypes.length} model types\n`);

    // Count items per type
    const usage = {};
    let totalItems = 0;

    for (const itemType of itemTypes) {
      const apiKey = itemType.attributes?.api_key || itemType.api_key;
      const name = itemType.attributes?.name || itemType.name || 'Unknown';
      
      try {
        const items = await client.items.list({ 
          filter: { type: itemType.id },
          page: { limit: 1 } // Just get count, not all items
        });
        
        // Get total count using meta
        const allItems = await client.items.list({ filter: { type: itemType.id } });
        const count = allItems.length;
        
        usage[apiKey || name] = {
          name,
          count,
          apiKey: apiKey || 'N/A'
        };
        totalItems += count;
      } catch (err) {
        console.error(`⚠️  Error counting ${name}:`, err.message);
        usage[apiKey || name] = {
          name,
          count: 'Error',
          apiKey: apiKey || 'N/A'
        };
      }
    }

    console.log('📈 Current Usage:\n');
    console.log(`Total Items: ${totalItems}\n`);
    
    console.log('Breakdown by Model:');
    console.log('─'.repeat(60));
    Object.entries(usage)
      .sort((a, b) => (b[1].count || 0) - (a[1].count || 0))
      .forEach(([key, data]) => {
        console.log(`  ${data.name.padEnd(30)} (${data.apiKey.padEnd(20)}): ${data.count}`);
      });
    console.log('─'.repeat(60));

    console.log('\n💡 DatoCMS Plan Limits (typical):');
    console.log('   Free Plan:      ~100 records');
    console.log('   Starter Plan:   ~1,000 records');
    console.log('   Professional:   ~10,000 records');
    console.log('   Enterprise:     Custom limits');
    console.log('\n   Check your exact limits at:');
    console.log('   https://dashboard.datocms.com/account/plan');
    console.log('\n   If you hit limits, use MAX_CREATE to batch imports:');
    console.log('   MAX_CREATE=50 DATOCMS_API_TOKEN=xxxxx node seed-alchemy-dapps.mjs');

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  }
}

main();

