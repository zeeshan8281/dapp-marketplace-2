// set-starknet-goldrush-section.mjs - Set GoldRush section for StarkNet dapp
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    // Find StarkNet dapp
    const itemTypes = await client.itemTypes.list();
    const dappModel = itemTypes.find(t => (t.attributes?.api_key || t.api_key) === 'dapp');
    
    const dapps = await client.items.list({ filter: { type: dappModel.id } });
    const starknet = dapps.find(d => (d.title || '').trim() === 'StarkNet');

    if (!starknet) {
      console.error('❌ StarkNet dapp not found');
      process.exit(1);
    }

    console.log(`✅ Found StarkNet dapp (id: ${starknet.id})\n`);

    // Create GoldRush section JSON
    const goldRushSection = {
      enabled: true,
      title: "BUILD ON STARKNET USING GOLDRUSH",
      links: [
        {
          label: "GoldRush Docs",
          url: "https://goldrush.dev",
          icon: "🚀"
        },
        {
          label: "StarkNet API",
          url: "https://goldrush.dev/docs/chains/starknet",
          icon: "📚"
        },
        {
          label: "Get Started",
          url: "https://goldrush.dev/docs/getting-started",
          icon: "⚡"
        }
      ]
    };

    // Update the dapp
    await client.items.update(starknet.id, {
      goldrush_section: JSON.stringify(goldRushSection, null, 2)
    });

    await client.items.publish(starknet.id);

    console.log('✅ Updated StarkNet with GoldRush section data\n');
    console.log('📋 GoldRush Section JSON:');
    console.log(JSON.stringify(goldRushSection, null, 2));
    console.log('\n💡 You can now edit this in DatoCMS:');
    console.log('   1. Go to Content > Dapp model');
    console.log('   2. Find "StarkNet"');
    console.log('   3. Edit the "GoldRush Section" field');
    console.log('   4. Modify the JSON as needed');

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.body?.data) {
      console.error('Details:', JSON.stringify(err.body.data, null, 2));
    }
    process.exit(1);
  }
}

main();

