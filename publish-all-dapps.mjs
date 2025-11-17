// publish-all-dapps.mjs - Publish all dapps (regardless of current status)
import { buildClient } from "@datocms/cma-client-node";

/*
  USAGE:
  - Set DATOCMS_API_TOKEN (full-access CMA token)
  - Run: DATOCMS_API_TOKEN=xxxxx node publish-all-dapps.mjs

  This script:
  1. Finds all dapps
  2. Publishes them all (even if already published, this ensures they're up to date)
*/

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🚀 Publishing all dapps...\n');

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

    console.log(`✅ Found Dapp model (id: ${dappModel.id})\n`);

    // Fetch all dapps
    const dapps = await client.items.list({ filter: { type: dappModel.id } });
    console.log(`📋 Found ${dapps.length} total dapps\n`);

    if (dapps.length === 0) {
      console.log('⚠️  No dapps found');
      return;
    }

    // Publish all dapps
    let published = 0;
    let failed = 0;

    console.log('📤 Publishing dapps...\n');

    for (const dapp of dapps) {
      try {
        await client.items.publish({ items: [{ type: "item", id: dapp.id }] });
        const title = dapp.attributes?.title || dapp.title || dapp.id;
        console.log(`✅ [published] ${title}`);
        published++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        const title = dapp.attributes?.title || dapp.title || dapp.id;
        console.error(`❌ [error] Failed to publish ${title}:`, err.body?.data || err.message);
        failed++;
      }
    }

    console.log('\n✅ Publishing complete!');
    console.log(`   Published: ${published} dapps`);
    if (failed > 0) {
      console.log(`   Failed: ${failed} dapps`);
    }
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();

