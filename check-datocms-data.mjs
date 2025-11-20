// check-datocms-data.mjs
// Check what data is actually stored in DatoCMS for dapps

import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function checkDatoCMSData() {
  try {
    console.log('🔍 Checking DatoCMS data...\n');

    const dappModelId = await findModelIdByApiKey('dapp');
    const allDapps = await client.items.list({ 
      filter: { type: dappModelId },
      limit: 10 // Check first 10
    });

    console.log(`📊 Checking ${allDapps.length} dapps...\n`);

    for (const dapp of allDapps) {
      const title = dapp.attributes?.title || dapp.title || 'Unknown';
      const id = dapp.id;
      
      console.log(`\n📱 ${title} (${id})`);
      console.log('   Fields present:');
      
      // Check each field
      const fields = {
        'title': dapp.attributes?.title || dapp.title,
        'shortDescription': dapp.attributes?.short_description || dapp.attributes?.shortDescription || dapp.shortDescription,
        'alchemyRecentActivity': (dapp.attributes?.alchemy_recent_activity || dapp.attributes?.alchemyRecentActivity) ? 'EXISTS' : 'MISSING',
        'defillamaUrl': dapp.attributes?.defillama_url || dapp.attributes?.defillamaUrl || dapp.defillamaUrl,
        'protocolId': dapp.attributes?.protocol_id || dapp.attributes?.protocolId || dapp.protocolId,
        'tvlUsd': dapp.attributes?.tvl_usd || dapp.attributes?.tvlUsd || dapp.tvlUsd,
        'chains': dapp.relationships?.chains?.data?.length || 0,
        'categories': dapp.relationships?.categories?.data?.length || 0,
      };
      
      for (const [field, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null && value !== 'MISSING' && value !== 0) {
          console.log(`   ✅ ${field}: ${typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : value}`);
        } else {
          console.log(`   ❌ ${field}: ${value === 'MISSING' ? 'MISSING' : 'empty/null'}`);
        }
      }
      
      // Check alchemyRecentActivity content if it exists
      const alchemyField = dapp.attributes?.alchemy_recent_activity || dapp.attributes?.alchemyRecentActivity;
      if (alchemyField) {
        try {
          const alchemyData = typeof alchemyField === 'string'
            ? JSON.parse(alchemyField)
            : alchemyField;
          
          console.log(`   📦 Alchemy data structure:`);
          console.log(`      - name: ${alchemyData?.name || 'missing'}`);
          console.log(`      - websiteUrl: ${alchemyData?.websiteUrl || 'missing'}`);
          console.log(`      - twitterUrl: ${alchemyData?.twitterUrl || 'missing'}`);
          console.log(`      - chains: ${alchemyData?.chains?.length || 0} chains`);
          console.log(`      - categories: ${alchemyData?.categories?.length || 0} categories`);
        } catch (e) {
          console.log(`   ⚠️  Alchemy data exists but cannot parse: ${e.message}`);
        }
      }
    }

    console.log(`\n✅ Check complete!`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

async function findModelIdByApiKey(apiKey) {
  const itemTypes = await client.itemTypes.list();
  const match = itemTypes.find((t) => {
    const modelApiKey = t.attributes?.api_key || t.api_key;
    return modelApiKey === apiKey;
  });
  if (!match) throw new Error(`Model with api_key="${apiKey}" not found.`);
  return match.id;
}

if (!process.env.DATOCMS_API_TOKEN) {
  console.error('❌ DATOCMS_API_TOKEN environment variable is required');
  process.exit(1);
}

checkDatoCMSData();

