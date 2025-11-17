// sync-dapps.mjs - Sync DeFiLlama and Alchemy data to existing DatoCMS dapps
import { buildClient } from "@datocms/cma-client-node";
import fetch from 'node-fetch';

/*
  USAGE:
  - Set DATOCMS_API_TOKEN (full-access CMA token)
  - Run: DATOCMS_API_TOKEN=xxxxx node sync-dapps.mjs

  This script:
  1. Fetches all dapps from DatoCMS
  2. For each dapp, fetches data from DeFiLlama (if protocol_id exists)
  3. Updates TVL, category, chain TVL, and other fields
  4. Publishes updated items
*/

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });
const DEFILLAMA_API = 'https://api.llama.fi';
const ALCHEMY_DAPP_STORE_API = 'https://dapp-store.alchemy.com';

// Fetch DeFiLlama protocol data
async function fetchDefiLlamaProtocol(protocolId) {
  try {
    const res = await fetch(`${DEFILLAMA_API}/protocol/${protocolId}`);
    if (!res.ok) return null;
    const protocolData = await res.json();
    
    // Return with additional fields for links
    return {
      ...protocolData,
      url: protocolData.url || null,
      twitter: protocolData.twitter || null,
      github: protocolData.github || null
    };
  } catch (err) {
    console.error(`[DeFiLlama] Error fetching ${protocolId}:`, err.message);
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

// Fetch Alchemy dapp data by name
async function fetchAlchemyDapp(name) {
  try {
    // Search through pages (limited search)
    for (let page = 1; page <= 5; page++) {
      const res = await fetch(`${ALCHEMY_DAPP_STORE_API}/dapps?page=${page}`);
      if (!res.ok) break;
      
      const data = await res.json();
      if (!data.records) break;
      
      const match = data.records.find(d => 
        d.name && d.name.toLowerCase() === name.toLowerCase()
      );
      
      if (match) {
        // Fetch detailed data from detail endpoint to get longDescription
        let detail = null;
        if (match.slug) {
          detail = await fetchAlchemyDappDetail(match.slug);
          if (detail) {
            console.log(`  [Alchemy] Fetched detailed data with longDescription`);
          }
        }
        
        return {
          name: match.name,
          slug: match.slug,
          description: match.shortDescription || match.description,
          // Use longDescription from detail endpoint
          longDescription: detail?.longDescription || match.longDescription || match.description || null,
          logoUrl: match.logoCdnUrl,
          chains: match.chains || [],
          categories: match.vipChildCategory || [],
          eyebrowText: match.eyebrowText,
          // Get links from detail endpoint (more complete)
          websiteUrl: detail?.website || match.websiteUrl || null,
          twitterUrl: detail?.twitter || match.twitterUrl || null,
          discordUrl: match.discordUrl || null,
          githubUrl: match.githubUrl || null,
          documentationUrl: match.documentationUrl || null
        };
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return null;
  } catch (err) {
    console.error(`[Alchemy] Error fetching ${name}:`, err.message);
    return null;
  }
}

// Update dapp in DatoCMS
async function updateDapp(dappId, updates) {
  try {
    // Only update fields that have changed
    const payload = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== null && updates[key] !== undefined) {
        payload[key] = updates[key];
      }
    });

    if (Object.keys(payload).length === 0) {
      console.log(`[skip] No changes for dapp ${dappId}`);
      return;
    }

    await client.items.update(dappId, payload);
    
    // Publish the updated item
    try {
      await client.items.publish({ items: [{ type: "item", id: dappId }] });
      console.log(`[updated & published] Dapp ${dappId}`);
    } catch (publishErr) {
      // Log error but continue - item was updated successfully
      console.log(`[updated] Dapp ${dappId} (publish failed: ${publishErr.message || publishErr})`);
      console.log(`[info] Run 'node check-and-publish-dapps.mjs' to publish later`);
    }
  } catch (err) {
    console.error(`[error] Updating dapp ${dappId}:`, err.body?.data || err.message || err);
  }
}

// Search DeFiLlama by name (similar to seed script)
async function searchDefiLlamaByName(name) {
  try {
    const res = await fetch(`${DEFILLAMA_API}/protocols`);
    if (!res.ok) return null;
    
    const protocols = await res.json();
    const nameLower = name.toLowerCase();
    
    // Try to find by name (case-insensitive, partial match)
    const match = protocols.find(p => 
      p.name && p.name.toLowerCase() === nameLower ||
      p.name && p.name.toLowerCase().includes(nameLower) ||
      nameLower.includes(p.name?.toLowerCase())
    );
    
    if (!match) return null;
    
    // Fetch detailed protocol data
    const protocolRes = await fetch(`${DEFILLAMA_API}/protocol/${match.slug}`);
    if (!protocolRes.ok) return null;
    
    const protocolData = await protocolRes.json();
    
    return {
      ...protocolData,
      protocolId: match.slug,
      url: protocolData.url || null,
      twitter: protocolData.twitter || null,
      github: protocolData.github || null
    };
  } catch (err) {
    console.error(`[DeFiLlama] Error searching for ${name}:`, err.message);
    return null;
  }
}

// Sync a single dapp
async function syncDapp(dapp) {
  // DatoCMS CMA returns items with fields directly on the object
  const dappId = dapp.id;
  const title = dapp.title || 'Unknown';
  const protocolId = dapp.protocol_id || null;

  console.log(`\n📊 Syncing: ${title}${protocolId ? ` (${protocolId})` : ''}`);

  let defiLlamaData = null;
  if (protocolId) {
    defiLlamaData = await fetchDefiLlamaProtocol(protocolId);
  } else if (title && title !== 'Unknown') {
    // Try to find DeFiLlama data by name if no protocol_id
    console.log(`  [DeFiLlama] No protocol_id, searching by name: ${title}`);
    defiLlamaData = await searchDefiLlamaByName(title);
    if (defiLlamaData) {
      console.log(`  [DeFiLlama] Found matching protocol: ${defiLlamaData.protocolId}`);
    }
  }

  const updates = {
    last_synced_at: new Date().toISOString(),
    last_sync_status: 'ok'
  };

  // Only update TVL if DeFiLlama actually has it (don't overwrite existing TVL with null!)
  // Handle both number and array formats from DeFiLlama
  let validTvl = null;
  if (defiLlamaData && defiLlamaData.tvl != null && defiLlamaData.tvl !== undefined) {
    if (Array.isArray(defiLlamaData.tvl) && defiLlamaData.tvl.length > 0) {
      // If TVL is an array, get the latest (last) value
      const latestTvl = defiLlamaData.tvl[defiLlamaData.tvl.length - 1];
      if (typeof latestTvl === 'number' && latestTvl > 0) {
        validTvl = latestTvl;
      } else if (typeof latestTvl === 'object' && latestTvl.totalLiquidityUSD) {
        // Sometimes it's an object with totalLiquidityUSD
        validTvl = latestTvl.totalLiquidityUSD;
      }
    } else if (typeof defiLlamaData.tvl === 'number' && defiLlamaData.tvl > 0) {
      // Direct number value
      validTvl = defiLlamaData.tvl;
    }
  }
  
  if (validTvl != null && validTvl > 0) {
    updates.tvl_usd = validTvl;
    console.log(`  [DeFiLlama] TVL: $${(validTvl / 1000000).toFixed(1)}M`);
  } else if (defiLlamaData) {
    console.log(`  [DeFiLlama] No valid TVL data (keeping existing value if any)`);
  } else {
    console.log(`  [DeFiLlama] No protocol found (no protocol_id and name search failed)`);
  }

  // Update protocol_id if we found it via name search
  if (defiLlamaData && defiLlamaData.protocolId && !protocolId) {
    updates.protocol_id = defiLlamaData.protocolId;
    console.log(`  [DeFiLlama] Setting protocol_id: ${defiLlamaData.protocolId}`);
  }

  // Only update category if we have it
  if (defiLlamaData && defiLlamaData.category) {
    updates.category_defillama = defiLlamaData.category;
  }

  // Only update chain TVL if we have it
  if (defiLlamaData && defiLlamaData.chainTvls && Object.keys(defiLlamaData.chainTvls).length > 0) {
    updates.chain_tvl = JSON.stringify(
      Object.entries(defiLlamaData.chainTvls).map(([chain, tvl]) => ({ chain, tvl }))
    );
  }

  // Always update the URL if we have a protocol ID
  const finalProtocolId = defiLlamaData?.protocolId || protocolId;
  if (finalProtocolId) {
    updates.defillama_url = `https://defillama.com/protocol/${finalProtocolId}`;
  }

  // Update or fetch Alchemy data with full descriptions and links
  let alchemyData = null;
  try {
    // Fields are directly on the dapp object
    const existingAlchemy = dapp.alchemy_recent_activity;
    if (existingAlchemy) {
      alchemyData = typeof existingAlchemy === 'string' 
        ? JSON.parse(existingAlchemy) 
        : existingAlchemy;
    }
  } catch (e) {
    // Ignore parse errors
  }

  // Try to fetch detailed Alchemy data if we have a slug
  let alchemyDetail = null;
  if (alchemyData?.slug) {
    alchemyDetail = await fetchAlchemyDappDetail(alchemyData.slug);
    if (alchemyDetail) {
      console.log(`  [Alchemy] Fetched detailed data with longDescription from slug`);
    }
  }
  
  // Fetch fresh Alchemy data or update existing with DeFiLlama links
  const freshAlchemyData = await fetchAlchemyDapp(title);
  
  if (freshAlchemyData || defiLlamaData || alchemyDetail) {
    const updatedAlchemyData = alchemyData || freshAlchemyData || {};
    
    // Merge fresh Alchemy data
    if (freshAlchemyData) {
      Object.assign(updatedAlchemyData, freshAlchemyData);
    }
    
    // Update with detail endpoint data if available
    if (alchemyDetail) {
      if (alchemyDetail.longDescription) {
        updatedAlchemyData.longDescription = alchemyDetail.longDescription;
      }
      if (alchemyDetail.website) {
        updatedAlchemyData.websiteUrl = alchemyDetail.website;
      }
      if (alchemyDetail.twitter) {
        updatedAlchemyData.twitterUrl = alchemyDetail.twitter;
      }
      // Use detail endpoint categories (full objects with names) if available
      if (alchemyDetail.vipChildCategory && Array.isArray(alchemyDetail.vipChildCategory)) {
        updatedAlchemyData.categories = alchemyDetail.vipChildCategory;
      }
    }
    
    // Add DeFiLlama links and description if available
    if (defiLlamaData) {
      updatedAlchemyData.websiteUrl = defiLlamaData.url || updatedAlchemyData.websiteUrl;
      updatedAlchemyData.twitterUrl = defiLlamaData.twitter 
        ? `https://twitter.com/${defiLlamaData.twitter.replace('@', '')}` 
        : updatedAlchemyData.twitterUrl;
      updatedAlchemyData.githubUrl = defiLlamaData.github || updatedAlchemyData.githubUrl;
      
      // Update full description if DeFiLlama has a better one
      if (defiLlamaData.description && 
          (!updatedAlchemyData.longDescription || 
           defiLlamaData.description.length > updatedAlchemyData.longDescription.length)) {
        updatedAlchemyData.longDescription = defiLlamaData.description;
      }
    }
    
    updatedAlchemyData.source = updatedAlchemyData.source || 'alchemy_dapp_store';
    updates.alchemy_recent_activity = JSON.stringify(updatedAlchemyData);
    
    if (freshAlchemyData) {
      console.log(`  [Alchemy] Found and updated dapp data`);
    }
    if (alchemyDetail) {
      console.log(`  [Alchemy] Updated with detailed longDescription`);
    }
    if (defiLlamaData) {
      console.log(`  [DeFiLlama] Updated links and description`);
    }
  } else {
    console.log(`  [Alchemy] No additional data found`);
  }

  await updateDapp(dappId, updates);

  // Rate limiting
  await new Promise(resolve => setTimeout(resolve, 500));
}

// Main function
async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🚀 Starting dapp sync...\n');

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
    console.log(`📋 Found ${dapps.length} dapps to sync\n`);

    if (dapps.length === 0) {
      console.log('⚠️  No dapps found');
      return;
    }

    // Sync each dapp
    let synced = 0;
    let failed = 0;

    for (const dapp of dapps) {
      try {
        await syncDapp(dapp);
        synced++;
      } catch (err) {
        console.error(`[error] Failed to sync dapp ${dapp.id}:`, err.message);
        failed++;
      }
    }

    console.log('\n✅ Sync complete!');
    console.log(`   Synced: ${synced} dapps`);
    console.log(`   Failed: ${failed} dapps`);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();

