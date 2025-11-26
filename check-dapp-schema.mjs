// check-dapp-schema.mjs - Check the actual schema of the Dapp model
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🔍 Checking Dapp model schema...\n');
    
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
    
    console.log(`✅ Found Dapp model: ${dappModel.name} (id: ${dappModel.id})\n`);
    
    // Get all fields
    const fields = await client.fields.list(dappModel.id);
    
    console.log(`📋 Dapp model has ${fields.length} fields:\n`);
    
    // Check chains field specifically
    const chainsField = fields.find(f => {
      const apiKey = f.attributes?.api_key || f.api_key;
      return apiKey === 'chains';
    });
    
    if (chainsField) {
      const fieldType = chainsField.attributes?.field_type || chainsField.field_type;
      console.log(`🔗 Chains field found:`);
      console.log(`   API Key: ${chainsField.attributes?.api_key || chainsField.api_key}`);
      console.log(`   Type: ${fieldType}`);
      console.log(`   Label: ${chainsField.attributes?.label || chainsField.label}`);
      
      if (fieldType === 'links') {
        console.log(`   ✅ This is a relationship field (links)`);
        const validators = chainsField.attributes?.validators || chainsField.validators || {};
        if (validators.items_item_type) {
          console.log(`   Linked to: Chain model`);
        }
      } else {
        console.log(`   ⚠️  This is NOT a relationship field - it's a ${fieldType}`);
        console.log(`   💡 Chains should be a 'links' field type to create relationships`);
      }
    } else {
      console.log(`⚠️  No 'chains' field found on Dapp model`);
    }
    
    console.log(`\n📋 All fields on Dapp model:\n`);
    fields.forEach((field, idx) => {
      const apiKey = field.attributes?.api_key || field.api_key;
      const fieldType = field.attributes?.field_type || field.field_type;
      const label = field.attributes?.label || field.label;
      console.log(`   ${idx + 1}. ${apiKey} (${fieldType}) - ${label}`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  }
}

main();


