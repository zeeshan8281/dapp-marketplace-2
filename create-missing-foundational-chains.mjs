// create-missing-foundational-chains.mjs - Create missing foundational chains
import { buildClient } from "@datocms/cma-client-node";

const DATOCMS_API_TOKEN = process.env.DATOCMS_API_TOKEN;

if (!DATOCMS_API_TOKEN) {
  console.error('❌ DATOCMS_API_TOKEN environment variable is required');
  process.exit(1);
}

const client = buildClient({ apiToken: DATOCMS_API_TOKEN });

// Missing foundational chains with their descriptions
const missingChains = [
  {
    title: 'Ethereum',
    description: 'Ethereum is the leading smart contract blockchain, powering thousands of decentralized applications (dApps) including DeFi, NFTs, DAOs, and more. With a secure proof-of-stake consensus mechanism and the largest developer ecosystem in Web3, Ethereum is the foundational layer for on-chain innovation.',
    category: 'Foundational Chain'
  },
  {
    title: 'Polygon zkEVM',
    description: 'With over 1.3 billion transactions recorded, 130 million unique wallets and ~2.7 million monthly active users, Polygon Proof of Stake (POS) is the most proven scaling solution in web3, and the best way to launch a web3 project that\'s ready for a global audience.',
    category: 'Foundational Chain'
  },
  {
    title: 'Solana',
    description: 'Solana is a high-performance blockchain supporting builders around the world creating crypto apps that scale today.',
    category: 'Frontier Chain'
  }
];

async function main() {
  try {
    console.log('🚀 Creating missing foundational chains...\n');
    
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
    
    let created = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const chain of missingChains) {
      const titleLower = chain.title.toLowerCase().trim();
      
      if (existingTitles.has(titleLower)) {
        console.log(`⏭️  ${chain.title}: Already exists`);
        skipped++;
        continue;
      }
      
      try {
        const payload = {
          item_type: { type: "item_type", id: dappModel.id },
          title: chain.title,
          short_description: chain.description,
          category_defillama: chain.category
        };
        
        const createdItem = await client.items.create(payload);
        await client.items.publish(createdItem.id);
        
        console.log(`✅ ${chain.title}: Created and published`);
        created++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (err) {
        console.error(`❌ ${chain.title}: Failed - ${err.message}`);
        failed++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`\n✨ Done!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

