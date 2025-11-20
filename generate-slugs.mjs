// generate-slugs.mjs - Generate and update slugs for all dapps
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

// Generate slug from name
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

// Ensure unique slug by appending number if needed
async function getUniqueSlug(baseSlug, excludeId = null) {
  if (!baseSlug) return null;
  
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    try {
      const items = await client.items.list({
        filter: {
          type: 'dapp',
          fields: {
            slug: { eq: slug }
          }
        }
      });
      
      // Filter out the current item if updating
      const conflicting = items.filter(item => item.id !== excludeId);
      
      if (conflicting.length === 0) {
        return slug;
      }
      
      // Try with counter
      slug = `${baseSlug}-${counter}`;
      counter++;
    } catch (err) {
      // If filter doesn't work, try a different approach
      const allItems = await client.items.list({ filter: { type: 'dapp' } });
      const conflicting = allItems.filter(item => {
        const itemSlug = item.attributes?.slug || item.slug;
        return itemSlug === slug && item.id !== excludeId;
      });
      
      if (conflicting.length === 0) {
        return slug;
      }
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
}

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🚀 Generating slugs for all dapps...\n');

    // Get all dapps
    const dapps = await client.items.list({ filter: { type: 'dapp' } });
    console.log(`📋 Found ${dapps.length} dapps\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const dapp of dapps) {
      const title = dapp.attributes?.title || dapp.title;
      const currentSlug = dapp.attributes?.slug || dapp.slug;
      
      if (!title) {
        console.log(`⏭️  Skipping dapp ${dapp.id} (no title)`);
        skipped++;
        continue;
      }

      // Generate slug from title
      const newSlug = await getUniqueSlug(generateSlug(title), dapp.id);
      
      if (!newSlug) {
        console.log(`⚠️  Could not generate slug for "${title}"`);
        skipped++;
        continue;
      }

      // Skip if slug already exists and is correct
      if (currentSlug === newSlug) {
        console.log(`⏭️  "${title}" already has correct slug: ${newSlug}`);
        skipped++;
        continue;
      }

      try {
        // Update dapp with slug
        await client.items.update(dapp.id, {
          slug: newSlug
        });
        
        console.log(`✅ "${title}" -> ${newSlug}`);
        updated++;
      } catch (err) {
        console.error(`❌ Failed to update "${title}":`, err.message);
        errors++;
      }
    }

    console.log(`\n✅ Slug generation complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
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

