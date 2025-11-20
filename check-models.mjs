// check-models.mjs - Check what models exist in DatoCMS
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('📋 Checking DatoCMS models...\n');

    const itemTypes = await client.itemTypes.list();
    
    if (itemTypes.length === 0) {
      console.log('⚠️  No models found. You need to create models first.');
      console.log('\nRequired models:');
      console.log('  - Chain (api_key: "chain")');
      console.log('  - Dapp (api_key: "dapp")');
      console.log('  - Category (api_key: "category")');
      console.log('  - Tag (api_key: "tag")');
      return;
    }

    console.log(`✅ Found ${itemTypes.length} models:\n`);
    console.log('─'.repeat(60));
    itemTypes.forEach(itemType => {
      const apiKey = itemType.attributes?.api_key || itemType.api_key || 'N/A';
      const name = itemType.attributes?.name || itemType.name || 'Unknown';
      console.log(`  ${name.padEnd(30)} (api_key: ${apiKey.padEnd(20)})`);
    });
    console.log('─'.repeat(60));

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  }
}

main();

