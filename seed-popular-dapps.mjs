// seed-popular-dapps.mjs - Seed popular DeFiLlama protocols as dapps
import { buildClient } from "@datocms/cma-client-node";
import fetch from 'node-fetch';

/*
  USAGE:
  - Set DATOCMS_API_TOKEN (full-access CMA token)
  - Run: DATOCMS_API_TOKEN=xxxxx node seed-popular-dapps.mjs

  This script:
  1. Fetches top protocols from DeFiLlama
  2. Creates dapp records in DatoCMS
*/

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });
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

// Main function
async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🚀 Starting DeFiLlama dapp seeding...\n');

    // Find Dapp model
    const dappModelId = await findModelIdByApiKey('dapp');
    console.log(`✅ Found Dapp model (id: ${dappModelId})\n`);

    // Fetch top protocols from DeFiLlama
    console.log('📡 Fetching top protocols from DeFiLlama...\n');
    const res = await fetch(`${DEFILLAMA_API}/protocols`);
    if (!res.ok) {
      throw new Error(`Failed to fetch protocols: ${res.status}`);
    }

    const protocols = await res.json();
    console.log(`✅ Found ${protocols.length} protocols\n`);

    // Sort by TVL and take top 50
    const topProtocols = protocols
      .filter(p => p.tvl && p.tvl > 0)
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, 50);

    console.log(`📋 Seeding top ${topProtocols.length} protocols by TVL...\n`);

    // Get existing dapps
    const existingItems = await client.items.list({ filter: { type: dappModelId } });
    const existingTitles = new Set(existingItems.map(item => {
      const attrs = item.attributes || {};
      return (attrs.title || '').toLowerCase();
    }));

    // Create dapps
    let created = 0;
    let skipped = 0;

    for (const protocol of topProtocols) {
      const titleLower = (protocol.name || '').toLowerCase();

      // Skip if already exists
      if (existingTitles.has(titleLower)) {
        console.log(`[skip] ${protocol.name} already exists`);
        skipped++;
        continue;
      }

      try {
        const payload = {
          item_type: { type: "item_type", id: dappModelId },
          title: protocol.name,
          short_description: protocol.description || '',
          protocol_id: protocol.slug,
          tvl_usd: protocol.tvl,
          category_defillama: protocol.category || null,
          defillama_url: `https://defillama.com/protocol/${protocol.slug}`,
          last_synced_at: new Date().toISOString(),
          last_sync_status: 'ok'
        };

        // Add chain TVL if available
        if (protocol.chainTvls && Object.keys(protocol.chainTvls).length > 0) {
          payload.chain_tvl = JSON.stringify(
            Object.entries(protocol.chainTvls).map(([chain, tvl]) => ({ chain, tvl }))
          );
        }

        const createdItem = await client.items.create(payload);
        
        // Extract item ID
        let itemId = null;
        if (createdItem) {
          if (createdItem.id) {
            itemId = createdItem.id;
          } else if (createdItem.data?.id) {
            itemId = createdItem.data.id;
          } else if (typeof createdItem === 'string') {
            itemId = createdItem;
          }
        }

        if (itemId) {
          console.log(`[created] ${protocol.name} (${protocol.slug}) - TVL: $${(protocol.tvl / 1000000).toFixed(1)}M`);
          created++;
          
          // Try to publish - skip if it fails (item was still created)
          try {
            await client.items.publish({ items: [{ type: "item", id: itemId }] });
          } catch (publishErr) {
            // Log but don't fail - item was created successfully, will publish later
            console.log(`  [warning] Could not publish - will publish later with check-and-publish-dapps.mjs`);
          }
        } else {
          console.error(`[error] Could not extract ID for ${protocol.name}`, JSON.stringify(createdItem, null, 2));
        }

        existingTitles.add(titleLower);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`[error] Failed to create ${protocol.name}:`, err.body?.data || err.message);
      }
    }

    console.log('\n✅ Seeding complete!');
    console.log(`   Created: ${created} dapps`);
    console.log(`   Skipped: ${skipped} dapps (already exist)`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Publish all created dapps:`);
    console.log(`      DATOCMS_API_TOKEN=xxxxx node check-and-publish-dapps.mjs`);
    console.log(`   2. Sync additional data:`);
    console.log(`      DATOCMS_API_TOKEN=xxxxx node sync-dapps.mjs`);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();

