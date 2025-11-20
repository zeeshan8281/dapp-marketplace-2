// add-slug-field.mjs - Add slug field to Dapp model
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🚀 Adding slug field to Dapp model...\n');

    // Find Dapp model
    const itemTypes = await client.itemTypes.list();
    const dappModel = itemTypes.find(t => (t.attributes?.api_key || t.api_key) === 'dapp');
    
    if (!dappModel) {
      console.error('❌ Dapp model not found');
      process.exit(1);
    }

    const modelId = dappModel.id;
    console.log(`📝 Found Dapp model (id: ${modelId})\n`);

    // Check if slug field already exists
    const fields = await client.fields.list(modelId);
    const slugField = fields.find(f => (f.attributes?.api_key || f.api_key) === 'slug');
    
    if (slugField) {
      console.log('⏭️  Slug field already exists, skipping...');
      return;
    }

    // Create slug field
    console.log('📝 Creating slug field...');
    await client.fields.create(modelId, {
      label: 'Slug',
      api_key: 'slug',
      field_type: 'string',
      validators: {
        unique: {}
      },
      appearance: {
        editor: 'single_line',
        parameters: {
          heading: false
        },
        addons: []
      }
    });

    console.log('✅ Slug field created successfully!\n');
    console.log('💡 Next step: Run generate-slugs.mjs to populate slugs for existing dapps');

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  }
}

main();

