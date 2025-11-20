// check-model-fields.mjs
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function checkModelFields() {
  try {
    const itemTypes = await client.itemTypes.list();
    const dappModel = itemTypes.find(t => {
      const apiKey = t.attributes?.api_key || t.api_key;
      return apiKey === 'dapp';
    });

    if (!dappModel) {
      console.error('❌ Dapp model not found');
      return;
    }

    console.log('📋 Dapp Model Fields:\n');
    const fields = await client.fields.list(dappModel.id);
    
    fields.forEach(field => {
      const apiKey = field.attributes?.api_key || field.api_key;
      const fieldType = field.attributes?.field_type || field.field_type;
      console.log(`  - ${apiKey} (${fieldType})`);
    });

    // Check one dapp to see what fields it actually has
    const dapps = await client.items.list({ filter: { type: dappModel.id }, limit: 1 });
    if (dapps.length > 0) {
      const dapp = dapps[0];
      console.log(`\n📱 Sample dapp (${dapp.id}):`);
      console.log('  Attributes keys:', Object.keys(dapp.attributes || {}));
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  }
}

if (!process.env.DATOCMS_API_TOKEN) {
  console.error('❌ DATOCMS_API_TOKEN required');
  process.exit(1);
}

checkModelFields();

