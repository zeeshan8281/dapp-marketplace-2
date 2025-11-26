// add-all-chains-as-dapps.mjs - Create dapp records for all chains from goldrush-docs
import { buildClient } from "@datocms/cma-client-node";
import fs from "fs";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

// Load chains from goldrush-docs
const CHAINS_JSON_PATH = "/Users/zeeshan/Downloads/goldrush-docs-main/data/dato-chains.json";

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🚀 Creating dapp records for all chains...\n');
    
    // Load chains data
    const chainsData = JSON.parse(fs.readFileSync(CHAINS_JSON_PATH, 'utf8'));
    const allChains = chainsData.data.allBlockchains
      .filter(c => !c.testnet && c.displayname && !c.displayname.toLowerCase().includes('testnet'))
      .map(c => ({
        name: c.displayname,
        description: c.description && c.description !== '-' ? c.description : null,
        chainname: c.chainname
      }))
      .filter((c, idx, arr) => arr.findIndex(x => x.name === c.name) === idx); // Remove duplicates
    
    console.log(`📋 Found ${allChains.length} chains to process\n`);
    
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
    
    // Get existing dapps
    const existingDapps = await client.items.list({
      filter: { type: dappModel.id }
    });
    const existingTitles = new Set(existingDapps.map(d => (d.title || '').toLowerCase().trim()));
    
    console.log(`📊 Found ${existingDapps.length} existing dapps\n`);
    
    let created = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const chain of allChains) {
      const titleLower = chain.name.toLowerCase().trim();
      
      if (existingTitles.has(titleLower)) {
        skipped++;
        continue;
      }
      
      try {
        const payload = {
          item_type: { type: "item_type", id: dappModel.id },
          title: chain.name,
          short_description: chain.description || `${chain.name} blockchain network.`
        };
        
        const createdItem = await client.items.create(payload);
        await client.items.publish(createdItem.id);
        
        created++;
        console.log(`   ✅ Created: "${chain.name}"`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (err) {
        failed++;
        console.error(`   ❌ Failed to create "${chain.name}":`, err.message);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`   Total chains: ${allChains.length}`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped (already exist): ${skipped}`);
    console.log(`   Failed: ${failed}`);
    console.log('\n✅ Done! All chains are now dapp records.');
    console.log('💡 They will appear at the top of the list on the next page refresh.');
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  }
}

main();


