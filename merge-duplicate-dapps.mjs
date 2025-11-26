// merge-duplicate-dapps.mjs - Find and merge duplicate dapps
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🔍 Finding duplicate dapps...\n');
    
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
    
    // Fetch all dapps (handle pagination)
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
    
    // Group by normalized title (case-insensitive)
    const titleGroups = new Map();
    
    allDapps.forEach(dapp => {
      const title = dapp.title || '';
      const normalized = title.toLowerCase().trim();
      
      if (!normalized) return;
      
      if (!titleGroups.has(normalized)) {
        titleGroups.set(normalized, []);
      }
      titleGroups.get(normalized).push(dapp);
    });
    
    // Find duplicates
    const duplicates = [];
    titleGroups.forEach((dapps, normalizedTitle) => {
      if (dapps.length > 1) {
        duplicates.push({
          title: normalizedTitle,
          dapps: dapps
        });
      }
    });
    
    console.log(`🔍 Found ${duplicates.length} duplicate groups\n`);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }
    
    let merged = 0;
    let deleted = 0;
    let failed = 0;
    
    for (const group of duplicates) {
      const dapps = group.dapps;
      console.log(`\n📦 Duplicate group: "${group.title}" (${dapps.length} copies)`);
      
      // Sort by creation date (keep the oldest one, or by updated date)
      dapps.sort((a, b) => {
        const dateA = new Date(a._firstPublishedAt || a._createdAt || 0);
        const dateB = new Date(b._firstPublishedAt || b._createdAt || 0);
        return dateA - dateB;
      });
      
      const keep = dapps[0];
      const toDelete = dapps.slice(1);
      
      console.log(`   ✅ Keeping: "${keep.title}" (id: ${keep.id}, created: ${keep._firstPublishedAt || keep._createdAt})`);
      
      // Merge data from duplicates into the one we're keeping
      let needsUpdate = false;
      const updateData = {};
      
      for (const dup of toDelete) {
        // Merge short_description if keep doesn't have one
        if (!keep.shortDescription && dup.shortDescription) {
          updateData.short_description = dup.shortDescription;
          needsUpdate = true;
        }
        
        // Merge tvl_usd (keep the higher value)
        const keepTvl = keep.tvlUsd || keep.tvl_usd || 0;
        const dupTvl = dup.tvlUsd || dup.tvl_usd || 0;
        if (dupTvl > keepTvl) {
          updateData.tvl_usd = dupTvl;
          needsUpdate = true;
        }
        
        // Merge screenshots if keep doesn't have any
        if ((!keep.screenshots || keep.screenshots.length === 0) && dup.screenshots && dup.screenshots.length > 0) {
          // Note: Can't directly merge file uploads via API easily, so we'll skip this
        }
        
        // Merge alchemy_recent_activity if keep doesn't have one
        if (!keep.alchemyRecentActivity && !keep.alchemy_recent_activity && (dup.alchemyRecentActivity || dup.alchemy_recent_activity)) {
          updateData.alchemy_recent_activity = dup.alchemyRecentActivity || dup.alchemy_recent_activity;
          needsUpdate = true;
        }
      }
      
      // Update the kept dapp if needed
      if (needsUpdate) {
        try {
          await client.items.update(keep.id, updateData);
          console.log(`   🔄 Merged data into kept dapp`);
          merged++;
        } catch (err) {
          console.error(`   ⚠️  Failed to merge data:`, err.message);
        }
      }
      
      // Delete duplicates
      for (const dup of toDelete) {
        try {
          await client.items.destroy(dup.id);
          console.log(`   🗑️  Deleted: "${dup.title}" (id: ${dup.id})`);
          deleted++;
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          console.error(`   ❌ Failed to delete "${dup.title}":`, err.message);
          failed++;
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`   Duplicate groups found: ${duplicates.length}`);
    console.log(`   Dapps merged: ${merged}`);
    console.log(`   Duplicates deleted: ${deleted}`);
    console.log(`   Failed deletions: ${failed}`);
    console.log('\n✅ Duplicate merge complete!');
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  }
}

main();

