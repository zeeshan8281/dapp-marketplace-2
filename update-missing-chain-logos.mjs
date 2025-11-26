// update-missing-chain-logos.mjs - Update logos for chains not in goldrush-docs
import { buildClient } from "@datocms/cma-client-node";

const DATOCMS_API_TOKEN = process.env.DATOCMS_API_TOKEN;

if (!DATOCMS_API_TOKEN) {
  console.error('❌ DATOCMS_API_TOKEN environment variable is required');
  process.exit(1);
}

const client = buildClient({ apiToken: DATOCMS_API_TOKEN });

// Manual logo URLs for chains not in goldrush-docs
// Using DeFiLlama chain icons or other reliable sources
const chainLogos = {
  'StarkNet': 'https://icons.llama.fi/starknet.jpg',
  'OP Mainnet': 'https://icons.llama.fi/optimism.jpg',
  'Optimism': 'https://www.datocms-assets.com/86369/1670347457-optimism-icon-white.svg', // From goldrush-docs
};

async function main() {
  try {
    console.log('🚀 Updating missing chain logos...\n');
    
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
    
    // Fetch all dapps
    const allDapps = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    
    while (hasMore) {
      const dapps = await client.items.list({
        filter: { type: dappModel.id },
        page: { offset, limit }
      });
      allDapps.push(...dapps);
      if (dapps.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }
    
    console.log(`📦 Found ${allDapps.length} dapps in DatoCMS\n`);
    
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    
    // Process each chain that needs a logo
    for (const [chainName, logoUrl] of Object.entries(chainLogos)) {
      const dapp = allDapps.find(d => d.title === chainName);
      
      if (!dapp) {
        console.log(`⚠️  ${chainName}: Dapp not found in DatoCMS`);
        skipped++;
        continue;
      }
      
      // Check if already has logo in alchemy_recent_activity
      let alchemyData = {};
      try {
        if (dapp.alchemy_recent_activity) {
          alchemyData = typeof dapp.alchemy_recent_activity === 'string' 
            ? JSON.parse(dapp.alchemy_recent_activity) 
            : dapp.alchemy_recent_activity;
        }
      } catch (e) {
        // Ignore parse errors
      }
      
      // Skip if logo already set and matches
      if (alchemyData.logoUrl === logoUrl) {
        console.log(`⏭️  ${chainName}: Logo already set`);
        skipped++;
        continue;
      }
      
      try {
        // Update logo URL in alchemy_recent_activity
        alchemyData.logoUrl = logoUrl;
        alchemyData.logoCdnUrl = logoUrl;
        
        const payload = {
          alchemy_recent_activity: JSON.stringify(alchemyData)
        };
        
        await client.items.update(dapp.id, payload);
        
        console.log(`✅ ${chainName}: Updated logo URL: ${logoUrl}`);
        updated++;
      } catch (error) {
        console.error(`❌ ${chainName}: Failed to update logo - ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`\n✨ Done!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

