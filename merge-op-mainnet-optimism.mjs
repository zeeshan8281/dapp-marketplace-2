// merge-op-mainnet-optimism.mjs - Merge OP Mainnet into Optimism and remove Polygon zkEVM
import { buildClient } from "@datocms/cma-client-node";

const DATOCMS_API_TOKEN = process.env.DATOCMS_API_TOKEN;

if (!DATOCMS_API_TOKEN) {
  console.error('❌ DATOCMS_API_TOKEN environment variable is required');
  process.exit(1);
}

const client = buildClient({ apiToken: DATOCMS_API_TOKEN });

async function main() {
  try {
    console.log('🚀 Merging OP Mainnet into Optimism and removing Polygon zkEVM...\n');
    
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
    const allDapps = await client.items.list({
      filter: { type: dappModel.id }
    });
    
    // Find the dapps we need to work with
    const polygonZkEVM = allDapps.find(d => d.title === 'Polygon zkEVM');
    const opMainnet = allDapps.find(d => d.title === 'OP Mainnet');
    const optimism = allDapps.find(d => d.title === 'Optimism');
    
    if (!optimism) {
      console.error('❌ Optimism dapp not found');
      process.exit(1);
    }
    
    // Step 1: Merge OP Mainnet data into Optimism (if OP Mainnet exists)
    if (opMainnet) {
      console.log('📝 Merging OP Mainnet into Optimism...');
      
      // Get OP Mainnet's alchemy_recent_activity
      let opMainnetData = {};
      try {
        if (opMainnet.alchemy_recent_activity) {
          opMainnetData = typeof opMainnet.alchemy_recent_activity === 'string' 
            ? JSON.parse(opMainnet.alchemy_recent_activity) 
            : opMainnet.alchemy_recent_activity;
        }
      } catch (e) {
        // Ignore parse errors
      }
      
      // Get Optimism's alchemy_recent_activity
      let optimismData = {};
      try {
        if (optimism.alchemy_recent_activity) {
          optimismData = typeof optimism.alchemy_recent_activity === 'string' 
            ? JSON.parse(optimism.alchemy_recent_activity) 
            : optimism.alchemy_recent_activity;
        }
      } catch (e) {
        // Ignore parse errors
      }
      
      // Merge data (prefer Optimism's data, but add OP Mainnet's if missing)
      const mergedData = {
        ...opMainnetData,
        ...optimismData, // Optimism data takes precedence
        // Ensure we have Optimism's logo
        logoUrl: optimismData.logoUrl || opMainnetData.logoUrl,
        logoCdnUrl: optimismData.logoCdnUrl || opMainnetData.logoCdnUrl,
        // Merge chains if they're arrays
        chains: [...new Set([
          ...(optimismData.chains || []),
          ...(opMainnetData.chains || []),
          'OP Mainnet', // Explicitly add OP Mainnet as a chain
          'Optimism'
        ])]
      };
      
      // Update Optimism with merged data
      const payload = {
        alchemy_recent_activity: JSON.stringify(mergedData),
        // Use better description if OP Mainnet has one
        short_description: opMainnet.short_description && opMainnet.short_description.length > optimism.short_description?.length
          ? opMainnet.short_description
          : optimism.short_description || opMainnet.short_description
      };
      
      await client.items.update(optimism.id, payload);
      console.log('✅ Merged OP Mainnet data into Optimism');
      
      // Delete OP Mainnet
      await client.items.destroy(opMainnet.id);
      console.log('✅ Deleted OP Mainnet dapp');
    } else {
      console.log('⏭️  OP Mainnet not found, skipping merge');
    }
    
    // Step 2: Delete Polygon zkEVM
    if (polygonZkEVM) {
      console.log('🗑️  Deleting Polygon zkEVM...');
      await client.items.destroy(polygonZkEVM.id);
      console.log('✅ Deleted Polygon zkEVM dapp');
    } else {
      console.log('⏭️  Polygon zkEVM not found, skipping deletion');
    }
    
    console.log('\n✨ Done!');
    console.log('📝 Next steps:');
    console.log('   1. Update the priority list in pages/dapps/index.js to remove "Polygon zkEVM" and "OP Mainnet"');
    console.log('   2. Keep "Optimism" in the priority list');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

