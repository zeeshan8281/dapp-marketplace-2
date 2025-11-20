// setup-models.mjs - Create required models in DatoCMS
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🚀 Setting up DatoCMS models...\n');

    // Check if models already exist
    const existingTypes = await client.itemTypes.list();
    const existingApiKeys = new Set(existingTypes.map(t => t.attributes?.api_key || t.api_key));

    const modelsToCreate = [
      {
        name: 'Chain',
        apiKey: 'chain',
        singleton: false,
        fields: [
          { apiKey: 'name', label: 'Name', fieldType: 'string', validators: { required: {} } }
        ]
      },
      {
        name: 'Dapp',
        apiKey: 'dapp',
        singleton: false,
        fields: [
          { apiKey: 'title', label: 'Title', fieldType: 'string', validators: { required: {} } },
          { apiKey: 'slug', label: 'Slug', fieldType: 'string', validators: { unique: {}, format: { predefined_pattern: 'slug' } } },
          { apiKey: 'short_description', label: 'Short Description', fieldType: 'text' },
          { apiKey: 'screenshots', label: 'Screenshots', fieldType: 'file', validators: { extension: { extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] } } },
          { apiKey: 'protocol_id', label: 'Protocol ID', fieldType: 'string' },
          { apiKey: 'tvl_usd', label: 'TVL USD', fieldType: 'float' },
          { apiKey: 'category_defillama', label: 'Category (DeFiLlama)', fieldType: 'string' },
          { apiKey: 'chain_tvl', label: 'Chain TVL', fieldType: 'text' },
          { apiKey: 'defillama_url', label: 'DeFiLlama URL', fieldType: 'string' },
          { apiKey: 'alchemy_recent_activity', label: 'Alchemy Recent Activity', fieldType: 'text' },
          { apiKey: 'token_price_usd', label: 'Token Price USD', fieldType: 'float' },
          { apiKey: 'token_logo_url', label: 'Token Logo URL', fieldType: 'string' },
          { apiKey: 'last_synced_at', label: 'Last Synced At', fieldType: 'date_time' },
          { apiKey: 'last_sync_status', label: 'Last Sync Status', fieldType: 'string' }
        ]
      },
      {
        name: 'Category',
        apiKey: 'category',
        singleton: false,
        fields: [
          { apiKey: 'name', label: 'Name', fieldType: 'string', validators: { required: {} } }
        ]
      }
    ];

    for (const model of modelsToCreate) {
      if (existingApiKeys.has(model.apiKey)) {
        console.log(`⏭️  Model "${model.name}" (${model.apiKey}) already exists, skipping...`);
        continue;
      }

      try {
        console.log(`📝 Creating model "${model.name}" (${model.apiKey})...`);
        
        // Create the model
        const itemType = await client.itemTypes.create({
          name: model.name,
          api_key: model.apiKey,
          singleton: model.singleton || false
        });

        console.log(`   ✅ Created model (id: ${itemType.id})`);

        // Create fields
        for (const field of model.fields) {
          try {
            await client.fields.create(itemType.id, {
              label: field.label,
              api_key: field.apiKey,
              field_type: field.fieldType,
              validators: field.validators || {}
            });
            console.log(`   ✅ Created field: ${field.apiKey}`);
          } catch (fieldErr) {
            console.error(`   ⚠️  Failed to create field ${field.apiKey}:`, fieldErr.message);
          }
        }

        // Add relationship fields if needed
        if (model.apiKey === 'dapp') {
          // Add chains relationship
          try {
            await client.fields.create(itemType.id, {
              label: 'Chains',
              api_key: 'chains',
              field_type: 'links',
              validators: {
                items_item_type: {
                  item_types: [existingTypes.find(t => (t.attributes?.api_key || t.api_key) === 'chain')?.id].filter(Boolean)
                }
              }
            });
            console.log(`   ✅ Created relationship field: chains`);
          } catch (err) {
            // Chain model might not exist yet, we'll add this later
            console.log(`   ⏭️  Skipping chains relationship (chain model not ready)`);
          }

          // Add categories relationship
          try {
            await client.fields.create(itemType.id, {
              label: 'Categories',
              api_key: 'categories',
              field_type: 'links',
              validators: {
                items_item_type: {
                  item_types: [existingTypes.find(t => (t.attributes?.api_key || t.api_key) === 'category')?.id].filter(Boolean)
                }
              }
            });
            console.log(`   ✅ Created relationship field: categories`);
          } catch (err) {
            console.log(`   ⏭️  Skipping categories relationship (category model not ready)`);
          }
        }

        console.log(`\n✅ Model "${model.name}" setup complete!\n`);
      } catch (err) {
        console.error(`❌ Failed to create model "${model.name}":`, err.message);
        if (err.body) {
          console.error('   Details:', JSON.stringify(err.body, null, 2));
        }
      }
    }

    console.log('\n✅ Model setup complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Seed chains:');
    console.log('      DATOCMS_API_TOKEN=xxxxx node seed-goldrush-chains.mjs');
    console.log('   2. Seed dapps:');
    console.log('      DATOCMS_API_TOKEN=xxxxx node seed-alchemy-dapps.mjs');

  } catch (err) {
    console.error('❌ Fatal error:', err);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  }
}

main();

