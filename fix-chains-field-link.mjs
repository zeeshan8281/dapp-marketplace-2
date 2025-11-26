// fix-chains-field-link.mjs - Fix the chains field to properly link to Chain model
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🔧 Fixing chains field to link to Chain model...\n');
    
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
    
    // Find Chain model
    const chainModel = itemTypes.find(t => {
      const apiKey = t.attributes?.api_key || t.api_key;
      return apiKey === 'chain';
    });
    
    if (!chainModel) {
      console.error('❌ Chain model not found');
      process.exit(1);
    }
    
    console.log(`✅ Found Dapp model: ${dappModel.name} (id: ${dappModel.id})`);
    console.log(`✅ Found Chain model: ${chainModel.name} (id: ${chainModel.id})\n`);
    
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
    
    console.log(`📋 Found chains field (id: ${chainsField.id})\n`);
    
    // Update the field to link to Chain model
    console.log('🔧 Updating chains field to link to Chain model...\n');
    
    await client.fields.update(chainsField.id, {
      validators: {
        items_item_type: {
          on_publish_with_unpublished_references_strategy: "fail",
          on_reference_unpublish_strategy: "delete_references",
          on_reference_delete_strategy: "delete_references",
          item_types: [chainModel.id]
        }
      }
    });
    
    console.log('✅ Chains field updated successfully!');
    console.log(`   Now linked to: ${chainModel.name} (${chainModel.id})\n`);
    console.log('⏳ GraphQL schema will refresh in 2-3 minutes...');
    console.log('💡 After refresh, you can query chains with: chains { id name }');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  }
}

main();


