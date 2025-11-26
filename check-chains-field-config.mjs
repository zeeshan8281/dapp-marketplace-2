// check-chains-field-config.mjs - Check the chains field configuration in detail
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🔍 Checking chains field configuration in detail...\n');
    
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
    
    // Get chains field
    const fields = await client.fields.list(dappModel.id);
    const chainsField = fields.find(f => {
      const apiKey = f.attributes?.api_key || f.api_key;
      return apiKey === 'chains';
    });
    
    if (!chainsField) {
      console.error('❌ Chains field not found');
      process.exit(1);
    }
    
    console.log('📋 Chains Field Configuration:\n');
    console.log(JSON.stringify(chainsField, null, 2));
    
    const fieldType = chainsField.attributes?.field_type || chainsField.field_type;
    const validators = chainsField.attributes?.validators || chainsField.validators || {};
    
    console.log('\n🔍 Analysis:\n');
    console.log(`   Field Type: ${fieldType}`);
    console.log(`   Validators: ${JSON.stringify(validators, null, 2)}`);
    
    if (fieldType === 'links') {
      console.log('\n✅ Field is correctly configured as a "links" field');
      
      if (validators.items_item_type) {
        const itemTypes = validators.items_item_type.item_types || [];
        console.log(`   Linked to ${itemTypes.length} item type(s)`);
        
        // Get the linked model info
        for (const linkedTypeId of itemTypes) {
          const linkedType = itemTypes.find(t => t.id === linkedTypeId);
          if (!linkedType) {
            const allTypes = await client.itemTypes.list();
            const found = allTypes.find(t => t.id === linkedTypeId);
            if (found) {
              const apiKey = found.attributes?.api_key || found.api_key;
              console.log(`   - Linked to: ${found.name} (${apiKey})`);
            } else {
              console.log(`   - Linked to: Unknown (id: ${linkedTypeId})`);
            }
          }
        }
      } else {
        console.log('   ⚠️  No item_type validators found - field may not be properly linked');
      }
    } else {
      console.log(`\n❌ Field type is "${fieldType}" but should be "links"`);
    }
    
    console.log('\n💡 GraphQL Schema Refresh:');
    console.log('   DatoCMS GraphQL schema typically refreshes automatically within 2-3 minutes');
    console.log('   after field changes. If it\'s been longer, try:');
    console.log('   1. Making a small change to the field (e.g., update hint)');
    console.log('   2. Saving the field again in DatoCMS UI');
    console.log('   3. Waiting another 2-3 minutes');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  }
}

main();


