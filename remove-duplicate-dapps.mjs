// remove-duplicate-dapps.mjs - Find and remove duplicate dapps
import { buildClient } from "@datocms/cma-client-node";

/*
  USAGE:
  - Set DATOCMS_API_TOKEN (full-access CMA token)
  - Dry run (preview only): DATOCMS_API_TOKEN=xxxxx node remove-duplicate-dapps.mjs --dry-run
  - Actually delete: DATOCMS_API_TOKEN=xxxxx node remove-duplicate-dapps.mjs

  This script:
  1. Finds all dapps
  2. Groups them by title (case-insensitive)
  3. For duplicates, keeps the best one (most complete data)
  4. Deletes the rest (unless --dry-run is used)
*/

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

// Check for dry-run mode
const isDryRun = process.argv.includes('--dry-run');

// Score a dapp to determine which one to keep (higher score = better)
function scoreDapp(dapp) {
  let score = 0;
  // DatoCMS CMA returns fields directly on the object, not in attributes
  const attrs = dapp.attributes || {};
  const title = dapp.title || attrs.title || '';
  
  // More fields = better
  if (dapp.short_description || attrs.short_description) score += 10;
  if (dapp.protocol_id || attrs.protocol_id) score += 20; // DeFiLlama data
  if (dapp.tvl_usd || attrs.tvl_usd) score += 30; // TVL is valuable
  if (dapp.category_defillama || attrs.category_defillama) score += 10;
  if (dapp.alchemy_recent_activity || attrs.alchemy_recent_activity) score += 20; // Alchemy data
  if (dapp.last_synced_at || attrs.last_synced_at) score += 10; // Recently synced
  if (dapp.token_price_usd || attrs.token_price_usd) score += 10;
  
  // Check if published (prefer published)
  if (dapp.meta?.status === 'published') score += 15;
  
  // Prefer newer items (by ID or creation date)
  // This is a tiebreaker - newer items might have better data
  
  return score;
}

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

    console.log(`✅ Found Dapp model (id: ${dappModel.id})\n`);

    // Fetch all dapps
    const dapps = await client.items.list({ filter: { type: dappModel.id } });
    console.log(`📋 Found ${dapps.length} total dapps\n`);

    // Group by title (case-insensitive)
    // DatoCMS CMA returns fields directly on the object, not in attributes
    const titleGroups = new Map();
    
    for (const dapp of dapps) {
      // Try multiple ways to get the title
      const title = (dapp.title || dapp.attributes?.title || '').trim();
      
      if (!title) {
        console.log(`⚠️  Skipping dapp ${dapp.id} - no title`);
        continue;
      }
      
      // Normalize title: lowercase, remove extra spaces, remove common suffixes
      let normalizedTitle = title
        .toLowerCase()
        .replace(/\s+/g, ' ') // Multiple spaces to single space
        .trim();
      
      // Remove common suffixes that might cause duplicates
      normalizedTitle = normalizedTitle
        .replace(/\s+(finance|protocol|defi|dao|network|chain)$/i, '')
        .trim();
      
      if (!titleGroups.has(normalizedTitle)) {
        titleGroups.set(normalizedTitle, []);
      }
      
      titleGroups.get(normalizedTitle).push(dapp);
    }

    // Find duplicates
    const duplicates = [];
    for (const [titleKey, group] of titleGroups.entries()) {
      if (group.length > 1) {
        duplicates.push({
          title: group[0].attributes?.title || titleKey,
          items: group
        });
      }
    }

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }

    console.log(`🔴 Found ${duplicates.length} duplicate groups:\n`);
    
    let totalDuplicates = 0;
    let toDelete = [];

    for (const dup of duplicates) {
      const displayTitle = dup.items[0].title || dup.items[0].attributes?.title || dup.title;
      console.log(`  "${displayTitle}": ${dup.items.length} copies`);
      totalDuplicates += dup.items.length - 1; // -1 because we keep one
      
      // Score each item and keep the best one
      const scored = dup.items.map(dapp => ({
        dapp,
        score: scoreDapp(dapp)
      }));
      
      // Sort by score (highest first), then by ID (newer first as tiebreaker)
      scored.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // Tiebreaker: prefer newer ID (lexicographically larger)
        return b.dapp.id.localeCompare(a.dapp.id);
      });
      
      const keep = scored[0].dapp;
      const deleteList = scored.slice(1).map(s => s.dapp);
      
      const keepTitle = keep.title || keep.attributes?.title || keep.id;
      console.log(`    ✅ Keeping: ${keepTitle} (id: ${keep.id}, score: ${scored[0].score})`);
      for (const del of deleteList) {
        const delTitle = del.title || del.attributes?.title || del.id;
        const delScore = scored.find(s => s.dapp.id === del.id)?.score || 0;
        console.log(`    ❌ Deleting: ${delTitle} (id: ${del.id}, score: ${delScore})`);
        toDelete.push(del);
      }
      console.log('');
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Duplicate groups: ${duplicates.length}`);
    console.log(`   Items to delete: ${toDelete.length}`);
    console.log(`   Items to keep: ${duplicates.length}\n`);

    if (toDelete.length === 0) {
      console.log('✅ Nothing to delete!');
      return;
    }

    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - No items will be deleted\n');
      console.log('   To actually delete duplicates, run without --dry-run flag\n');
      return;
    }

    console.log('⚠️  About to delete duplicate dapps...\n');

    // Delete duplicates
    let deleted = 0;
    let failed = 0;

    for (const dapp of toDelete) {
      try {
        await client.items.destroy(dapp.id);
        const title = dapp.title || dapp.attributes?.title || dapp.id;
        console.log(`✅ [deleted] ${title} (${dapp.id})`);
        deleted++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        const title = dapp.title || dapp.attributes?.title || dapp.id;
        console.error(`❌ [error] Failed to delete ${title}:`, err.body?.data || err.message);
        failed++;
      }
    }

    console.log('\n✅ Deduplication complete!');
    console.log(`   Deleted: ${deleted} duplicates`);
    if (failed > 0) {
      console.log(`   Failed: ${failed} deletions`);
    }
    console.log(`   Kept: ${duplicates.length} unique dapps`);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();

