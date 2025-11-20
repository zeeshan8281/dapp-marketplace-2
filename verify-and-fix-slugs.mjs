// verify-and-fix-slugs.mjs - Verify all slugs are correct and fix any mismatches
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

// Generate slug from name (same function as in generate-slugs.mjs)
function generateSlug(name) {
  if (!name || typeof name !== 'string') return null;
  
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🔍 Verifying and fixing slugs for all dapps...\n');

    // Get all dapps
    const dapps = await client.items.list({ filter: { type: 'dapp' } });
    console.log(`📋 Found ${dapps.length} dapps\n`);

    let fixed = 0;
    let correct = 0;
    let errors = 0;

    for (const dapp of dapps) {
      const title = dapp.attributes?.title || dapp.title;
      const currentSlug = dapp.attributes?.slug || dapp.slug;
      
      if (!title) {
        console.log(`⚠️  Skipping dapp ${dapp.id} (no title)`);
        continue;
      }

      // Generate expected slug from title
      const expectedSlug = generateSlug(title);
      
      if (!expectedSlug) {
        console.log(`⚠️  Could not generate slug for "${title}"`);
        continue;
      }

      // Check if slug is correct
      if (currentSlug === expectedSlug) {
        console.log(`✅ "${title}" - slug correct: ${currentSlug}`);
        correct++;
        continue;
      }

      // Slug is incorrect or missing, fix it
      try {
        await client.items.update(dapp.id, {
          slug: expectedSlug
        });
        
        console.log(`🔧 Fixed "${title}": ${currentSlug || '(none)'} -> ${expectedSlug}`);
        fixed++;
      } catch (err) {
        console.error(`❌ Failed to fix "${title}":`, err.message);
        errors++;
      }
    }

    console.log(`\n✅ Verification complete!`);
    console.log(`   Correct: ${correct}`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Errors: ${errors}`);

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  }
}

main();

