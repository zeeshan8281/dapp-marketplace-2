// add-goldrush-section-field.mjs - Add GoldRush section field to Dapp model
import { buildClient } from "@datocms/cma-client-node";

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

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🔍 Finding Dapp model...\n');
    const dappModelId = await findModelIdByApiKey('dapp');
    console.log(`✅ Found Dapp model (id: ${dappModelId})\n`);

    // Check if field already exists
    const existingFields = await client.fields.list(dappModelId);
    const fieldExists = existingFields.some(f => {
      const apiKey = f.attributes?.api_key || f.api_key;
      return apiKey === 'goldrush_section';
    });

    if (fieldExists) {
      console.log('⏭️  Field "goldrush_section" already exists. Skipping creation.\n');
      return;
    }

    console.log('📝 Creating "goldrush_section" field...\n');
    
    // Create JSON field to store GoldRush section data
    // Structure: { enabled: boolean, title: string, links: [{ label: string, url: string, icon: string }] }
    const field = await client.fields.create(dappModelId, {
      label: 'GoldRush Section',
      api_key: 'goldrush_section',
      field_type: 'text',
      validators: {},
      appearance: {
        editor: 'textarea',
        parameters: {},
        addons: []
      },
      hint: 'JSON object for GoldRush "Build on {Dapp} using GoldRush" section. Format: {"enabled": true, "title": "Custom title (optional)", "links": [{"label": "Docs", "url": "https://...", "icon": "🚀"}]}'
    });

    console.log(`✅ Created field "goldrush_section" (id: ${field.id})\n`);
    console.log('📋 Field Details:');
    console.log(`   API Key: goldrush_section`);
    console.log(`   Type: text (JSON)`);
    console.log(`   Label: GoldRush Section\n`);
    console.log('💡 Usage:');
    console.log('   Store JSON in this field with the following structure:');
    console.log('   {');
    console.log('     "enabled": true,');
    console.log('     "title": "Custom title (optional - defaults to dapp name)",');
    console.log('     "links": [');
    console.log('       {"label": "GoldRush Docs", "url": "https://goldrush.dev", "icon": "🚀"},');
    console.log('       {"label": "API Reference", "url": "https://...", "icon": "📚"}');
    console.log('     ]');
    console.log('   }');

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.body?.data) {
      console.error('Details:', JSON.stringify(err.body.data, null, 2));
    }
    process.exit(1);
  }
}

main();

