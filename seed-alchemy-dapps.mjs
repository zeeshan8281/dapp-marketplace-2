// seed-alchemy-dapps.mjs - Seed dapps from Alchemy's public dapp store
import { buildClient } from "@datocms/cma-client-node";
import fetch from 'node-fetch';

/*
  USAGE:
  - Set DATOCMS_API_TOKEN (full-access CMA token)
  - Run: DATOCMS_API_TOKEN=xxxxx node seed-alchemy-dapps.mjs

  This script:
  1. Fetches dapps from Alchemy's public dapp store (multiple pages)
  2. Creates dapp records in DatoCMS for dapps that don't exist yet
  3. Includes description, logo URL, chains, and categories from Alchemy
  4. Combines data with DeFiLlama when available
*/

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });
const ALCHEMY_DAPP_STORE_API = 'https://dapp-store.alchemy.com';
const DEFILLAMA_API = 'https://api.llama.fi';

// Helper: Find model ID by API key
async function findModelIdByApiKey(apiKey) {
  const itemTypes = await client.itemTypes.list();
  const match = itemTypes.find((t) => {
    const modelApiKey = t.attributes?.api_key || t.api_key;
    return modelApiKey === apiKey;
  });
  if (!match) throw new Error(`Model with api_key="${apiKey}" not found.`);
  return match.id;
}

// Fetch DeFiLlama protocol data by name/slug
async function fetchDefiLlamaByName(name, slug) {
  try {
    // First, get all protocols
    const res = await fetch(`${DEFILLAMA_API}/protocols`);
    if (!res.ok) return null;
    
    const protocols = await res.json();
    
    // Try to find by slug first (most reliable)
    let match = protocols.find(p => 
      p.slug && p.slug.toLowerCase() === slug.toLowerCase()
    );
    
    // If not found, try by name (case-insensitive, partial match)
    if (!match) {
      const nameLower = name.toLowerCase();
      match = protocols.find(p => 
        p.name && p.name.toLowerCase() === nameLower ||
        p.name && p.name.toLowerCase().includes(nameLower) ||
        nameLower.includes(p.name?.toLowerCase())
      );
    }
    
    if (!match) return null;
    
    // Fetch detailed protocol data
    const protocolRes = await fetch(`${DEFILLAMA_API}/protocol/${match.slug}`);
    if (!protocolRes.ok) return null;
    
    const protocolData = await protocolRes.json();
    
    return {
      protocolId: match.slug,
      tvl: protocolData.tvl || match.tvl || null,
      category: protocolData.category || match.category || null,
      chainTvls: protocolData.chainTvls || null,
      description: protocolData.description || null,
      defillamaUrl: `https://defillama.com/protocol/${match.slug}`,
      // Additional fields for full description and links
      url: protocolData.url || null,
      twitter: protocolData.twitter || null,
      github: protocolData.github || null
    };
  } catch (err) {
    console.error(`[DeFiLlama] Error fetching data for ${name}:`, err.message);
    return null;
  }
}

// Fetch detailed dapp data from Alchemy detail endpoint
async function fetchAlchemyDappDetail(slug) {
  try {
    const res = await fetch(`${ALCHEMY_DAPP_STORE_API}/dapps/${slug}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`[Alchemy] Error fetching detail for ${slug}:`, err.message);
    return null;
  }
}

// Fetch dapps from Alchemy's dapp store
async function fetchAllAlchemyDapps(limit = 150) {
  const allDapps = [];
  let page = 1;
  let hasMore = true;

  console.log(`📡 Fetching up to ${limit} dapps from Alchemy Dapp Store...\n`);

  while (hasMore && page <= 20 && allDapps.length < limit) { // Limit to 20 pages and stop at limit
    try {
      const res = await fetch(`${ALCHEMY_DAPP_STORE_API}/dapps?page=${page}`);
      if (!res.ok) {
        console.log(`[page ${page}] HTTP ${res.status}, stopping...`);
        hasMore = false;
        break;
      }

      const data = await res.json();
      if (!data.records || data.records.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`[page ${page}] Found ${data.records.length} dapps`);
      
      // Only add dapps up to the limit
      const remaining = limit - allDapps.length;
      if (remaining > 0) {
        allDapps.push(...data.records.slice(0, remaining));
      }
      
      // Stop if we've reached the limit
      if (allDapps.length >= limit) {
        hasMore = false;
        break;
      }
      
      page++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`[page ${page}] Error:`, err.message);
      hasMore = false;
    }
  }

  console.log(`\n✅ Total dapps fetched from Alchemy: ${allDapps.length}\n`);
  return allDapps;
}

// Check if dapp exists in DatoCMS (by title only, since slug field doesn't exist)
async function dappExists(dappModelId, title) {
  try {
    const items = await client.items.list({
      filter: {
        type: dappModelId,
        fields: {
          title: { eq: title }
        }
      }
    });
    return items.length > 0;
  } catch (err) {
    // If filter fails, try listing all and checking
    try {
      const items = await client.items.list({ filter: { type: dappModelId } });
      return items.some(item => {
        const attrs = item.attributes || {};
        return attrs.title === title;
      });
    } catch (err2) {
      return false;
    }
  }
}

// Create dapp in DatoCMS with combined Alchemy + DeFiLlama data
async function createDapp(dappModelId, alchemyDapp) {
  try {
    // Fetch detailed Alchemy data (includes longDescription)
    let alchemyDetail = null;
    if (alchemyDapp.slug) {
      alchemyDetail = await fetchAlchemyDappDetail(alchemyDapp.slug);
      if (alchemyDetail) {
        console.log(`  [Alchemy] Fetched detailed data with longDescription`);
      }
    }
    
    // Try to find matching DeFiLlama data
    const defiLlamaData = await fetchDefiLlamaByName(alchemyDapp.name, alchemyDapp.slug);
    
    // Use DeFiLlama description if available and better, otherwise use Alchemy
    const shortDescription = defiLlamaData?.description && defiLlamaData.description.length > 20
      ? defiLlamaData.description
      : (alchemyDapp.shortDescription || alchemyDapp.description || '');
    
    // Get full description (prioritize DeFiLlama, then Alchemy longDescription from detail endpoint, then regular description)
    const fullDescription = defiLlamaData?.description || 
                           (alchemyDetail?.longDescription) ||
                           alchemyDapp.longDescription || 
                           alchemyDapp.description || 
                           alchemyDapp.shortDescription || 
                           null;
    
    const payload = {
      item_type: { type: "item_type", id: dappModelId },
      title: alchemyDapp.name,
      // Note: slug field may not exist in the model, so we skip it
      short_description: shortDescription,
    };

    // Add DeFiLlama data if found
    if (defiLlamaData) {
      payload.protocol_id = defiLlamaData.protocolId;
      payload.tvl_usd = defiLlamaData.tvl;
      payload.category_defillama = defiLlamaData.category;
      payload.chain_tvl = defiLlamaData.chainTvls ? JSON.stringify(
        Object.entries(defiLlamaData.chainTvls).map(([chain, tvl]) => ({ chain, tvl }))
      ) : null;
      payload.defillama_url = defiLlamaData.defillamaUrl;
      payload.last_synced_at = new Date().toISOString();
      payload.last_sync_status = 'ok';
      console.log(`  [DeFiLlama] Found matching protocol: ${defiLlamaData.protocolId} (TVL: $${(defiLlamaData.tvl / 1000000).toFixed(1)}M)`);
    }

    // Store Alchemy data in alchemy_recent_activity (includes full description and links)
    const alchemyData = {
      name: alchemyDapp.name,
      slug: alchemyDapp.slug,
      description: alchemyDapp.shortDescription || alchemyDapp.description,
      // Use longDescription from detail endpoint if available
      longDescription: alchemyDetail?.longDescription || 
                      alchemyDapp.longDescription || 
                      alchemyDapp.description || 
                      null,
      logoUrl: alchemyDapp.logoCdnUrl,
      chains: alchemyDapp.chains || [],
      categories: alchemyDapp.vipChildCategory || [],
      eyebrowText: alchemyDapp.eyebrowText,
      source: 'alchemy_dapp_store',
      // Add website and social links from detail endpoint (more complete)
      websiteUrl: alchemyDetail?.website || alchemyDapp.websiteUrl || null,
      twitterUrl: alchemyDetail?.twitter || alchemyDapp.twitterUrl || null,
      discordUrl: alchemyDapp.discordUrl || null,
      githubUrl: alchemyDapp.githubUrl || null,
      documentationUrl: alchemyDapp.documentationUrl || null
    };
    
    // Add DeFiLlama links if available (prioritize DeFiLlama over Alchemy for links)
    if (defiLlamaData) {
      alchemyData.websiteUrl = defiLlamaData.url || alchemyData.websiteUrl;
      alchemyData.twitterUrl = defiLlamaData.twitter ? `https://twitter.com/${defiLlamaData.twitter.replace('@', '')}` : alchemyData.twitterUrl;
      alchemyData.githubUrl = defiLlamaData.github || alchemyData.githubUrl;
      // Store full description from DeFiLlama if it's better
      if (defiLlamaData.description && (!alchemyData.longDescription || defiLlamaData.description.length > alchemyData.longDescription.length)) {
        alchemyData.longDescription = defiLlamaData.description;
      }
    }
    
    // Only store if there's meaningful data
    if (alchemyDapp.shortDescription || alchemyDapp.logoCdnUrl || alchemyDapp.chains || alchemyDapp.vipChildCategory || defiLlamaData) {
      payload.alchemy_recent_activity = JSON.stringify(alchemyData);
    }

    const created = await client.items.create(payload);
    
    // Extract item ID from various possible response structures
    let itemId = null;
    if (created) {
      // Try different ways to get the ID
      if (created.id) {
        itemId = created.id;
      } else if (created.data?.id) {
        itemId = created.data.id;
      } else if (created.data && created.data.type === 'item' && created.data.id) {
        itemId = created.data.id;
      } else if (created.attributes?.id) {
        itemId = created.attributes.id;
      } else if (typeof created === 'string') {
        itemId = created;
      } else {
        // Last resort: try to find id in the JSON string
        const responseStr = JSON.stringify(created);
        const idMatch = responseStr.match(/"id"\s*:\s*"([^"]+)"/);
        if (idMatch) {
          itemId = idMatch[1];
        }
      }
    }
    
    if (!itemId) {
      console.error(`[error] Could not extract item ID from response for "${alchemyDapp.name}":`, JSON.stringify(created, null, 2));
      return null;
    }
    
    // Ensure itemId is a string
    const itemIdStr = String(itemId);
    
    // Skip publishing for now - items are created but not published
    // Run check-and-publish-dapps.mjs after seeding to publish all items
    console.log(`[created] "${alchemyDapp.name}" (id: ${itemIdStr}) - will publish later`);
    
    return itemIdStr;
  } catch (err) {
    console.error(`[error creating ${alchemyDapp.name}]`, err.body?.data || err.message || err);
    return null;
  }
}

// Main function
async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🚀 Starting Alchemy dapp seeding...\n');

    // Find Dapp model
    const dappModelId = await findModelIdByApiKey('dapp');
    console.log(`✅ Found Dapp model (id: ${dappModelId})\n`);

    // Fetch 150 dapps from Alchemy
    const alchemyDapps = await fetchAllAlchemyDapps(150);

    if (alchemyDapps.length === 0) {
      console.log('⚠️  No dapps found in Alchemy store');
      return;
    }

    // Get existing dapps to avoid duplicates
    console.log('📋 Checking existing dapps in DatoCMS...\n');
    const existingItems = await client.items.list({ filter: { type: dappModelId } });
    const existingTitles = new Set(existingItems.map(item => {
      const attrs = item.attributes || {};
      return (attrs.title || '').toLowerCase();
    }));

    console.log(`Found ${existingTitles.size} existing dapps in DatoCMS\n`);

    // Create new dapps
    let created = 0;
    let skipped = 0;

    for (const alchemyDapp of alchemyDapps) {
      const titleLower = (alchemyDapp.name || '').toLowerCase();

      // Skip if already exists (by title only, since slug field doesn't exist)
      if (existingTitles.has(titleLower)) {
        console.log(`[skip] "${alchemyDapp.name}" already exists`);
        skipped++;
        continue;
      }

      // Create new dapp
      const itemId = await createDapp(dappModelId, alchemyDapp);
      if (itemId) {
        console.log(`[created] "${alchemyDapp.name}" (id: ${itemId})`);
        created++;
        existingTitles.add(titleLower);
      } else {
        console.log(`[failed] "${alchemyDapp.name}"`);
      }

      // Rate limiting (longer delay to avoid hitting DeFiLlama rate limits)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n✅ Seeding complete!');
    console.log(`   Created: ${created} dapps`);
    console.log(`   Skipped: ${skipped} dapps (already exist)`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Publish all created dapps:`);
    console.log(`      DATOCMS_API_TOKEN=xxxxx node check-and-publish-dapps.mjs`);
    console.log(`   2. Sync DeFiLlama data:`);
    console.log(`      DATOCMS_API_TOKEN=xxxxx node sync-dapps.mjs`);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();

