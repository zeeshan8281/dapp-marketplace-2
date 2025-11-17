// check-and-publish-dapps.mjs - Publish all unpublished dapps
import { buildClient } from "@datocms/cma-client-node";

/*
  USAGE:
  - Set DATOCMS_API_TOKEN (full-access CMA token)
  - Run: DATOCMS_API_TOKEN=xxxxx node check-and-publish-dapps.mjs

  This script:
  1. Finds all unpublished dapps
  2. Publishes them
*/

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🚀 Checking for unpublished dapps...\n');

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

    // Check which ones are unpublished
    const unpublished = [];
    for (const dapp of dapps) {
      try {
        const meta = await client.items.find(dapp.id);
        // Check if item is published
        if (!meta.meta?.status || meta.meta.status !== 'published') {
          unpublished.push(dapp);
        }
      } catch (err) {
        // If we can't check, assume it's unpublished
        unpublished.push(dapp);
      }
    }

    console.log(`📝 Found ${unpublished.length} unpublished dapps\n`);

    if (unpublished.length === 0) {
      console.log('✅ All dapps are already published!');
      return;
    }

    // Publish in batches
    let published = 0;
    let failed = 0;

    for (const dapp of unpublished) {
      try {
        await client.items.publish({ items: [{ type: "item", id: dapp.id }] });
        console.log(`[published] ${dapp.attributes?.title || dapp.id}`);
        published++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`[error] Failed to publish ${dapp.id}:`, err.body?.data || err.message);
        failed++;
      }
    }

    console.log('\n✅ Publishing complete!');
    console.log(`   Published: ${published} dapps`);
    console.log(`   Failed: ${failed} dapps`);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();

