// remove-community-archived-chains.mjs - Remove community and archived chain dapps
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🗑️  Removing community and archived chain dapps...\n');
    
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
    
    // Fetch all dapps (paginated)
    const allDapps = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    
    while (hasMore) {
      const pageDapps = await client.items.list({
        filter: { type: dappModel.id },
        page: { limit, offset }
      });
      
      if (pageDapps.length === 0) {
        hasMore = false;
      } else {
        allDapps.push(...pageDapps);
        if (pageDapps.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
    }
    
    console.log(`📋 Found ${allDapps.length} total dapps\n`);
    
    let deleted = 0;
    let skipped = 0;
    let failed = 0;
    
    // Check each dapp
    for (const dapp of allDapps) {
      try {
        // Check if it's a chain dapp with community or archived support level
        let isCommunityOrArchived = false;
        let supportLevel = null;
        
        // Check alchemyRecentActivity for chain metadata
        const alchemyData = dapp.alchemyRecentActivity || dapp.alchemy_recent_activity;
        if (alchemyData) {
          try {
            const parsed = typeof alchemyData === 'string' ? JSON.parse(alchemyData) : alchemyData;
            if (parsed.chainMetadata) {
              supportLevel = parsed.chainMetadata.supportLevel;
              if (supportLevel === 'community' || supportLevel === 'archived') {
                isCommunityOrArchived = true;
              }
            }
            // Also check if isChain flag exists
            if (parsed.isChain && (supportLevel === 'community' || supportLevel === 'archived')) {
              isCommunityOrArchived = true;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Also check category
        const category = dapp.categoryDefillama || dapp.category_defillama;
        if (category && (category.includes('Community') || category.includes('Archived'))) {
          isCommunityOrArchived = true;
        }
        
        if (!isCommunityOrArchived) {
          skipped++;
          continue;
        }
        
        // Delete the dapp
        await client.items.destroy(dapp.id);
        deleted++;
        console.log(`   🗑️  Deleted: "${dapp.title}" (${supportLevel || 'community/archived'})`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (err) {
        failed++;
        console.error(`   ❌ Failed to delete "${dapp.title}":`, err.message);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`   Total dapps checked: ${allDapps.length}`);
    console.log(`   Deleted: ${deleted}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Failed: ${failed}`);
    console.log('\n✅ Removal complete!');
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  }
}

main();


