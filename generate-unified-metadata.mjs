// generate-unified-metadata.mjs - Generate unified metadata for all dapps
import { buildClient } from "@datocms/cma-client-node";

/*
  USAGE:
  - Set DATOCMS_API_TOKEN (full-access CMA token)
  - Run: DATOCMS_API_TOKEN=xxxxx node generate-unified-metadata.mjs

  This script:
  1. Fetches all dapps from DatoCMS
  2. Generates unified_metadata from Alchemy and DeFiLlama data
  3. Updates each dapp with the unified metadata
  4. Ensures all fields have proper fallbacks (no empty values)
*/

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

// Helper to normalize Twitter handle/URL
function normalizeTwitter(twitter) {
  if (!twitter) return null;
  if (typeof twitter !== 'string') return null;
  
  // If it's already a URL, return it
  if (twitter.startsWith('http')) return twitter;
  
  // Extract handle (remove @ if present)
  const handle = twitter.replace('@', '').trim();
  if (!handle) return null;
  
  return {
    url: `https://twitter.com/${handle}`,
    handle: `@${handle}`
  };
}

// Helper to extract chain names from various formats
function extractChainNames(chains) {
  if (!chains || !Array.isArray(chains)) return [];
  
  return chains
    .map(chain => {
      if (typeof chain === 'string') return chain;
      if (chain?.name) return chain.name;
      return null;
    })
    .filter(Boolean)
    .map(name => name.trim())
    .filter(name => name.length > 0);
}

// Helper to extract category names
function extractCategoryNames(categories) {
  if (!categories || !Array.isArray(categories)) return [];
  
  return categories
    .map(cat => {
      if (typeof cat === 'string') return cat;
      if (cat?.name) return cat.name;
      return null;
    })
    .filter(Boolean)
    .map(name => name.trim())
    .filter(name => name.length > 0);
}

// Helper to calculate completeness score
function calculateCompleteness(metadata) {
  const fields = [
    'name', 'slug', 'description', 'logoUrl', 'tvlUsd',
    'category', 'chains', 'websiteUrl', 'twitterUrl', 'githubUrl'
  ];
  
  let filled = 0;
  fields.forEach(field => {
    const value = metadata[field];
    if (value !== null && value !== undefined) {
      if (Array.isArray(value) && value.length > 0) filled++;
      else if (typeof value === 'object' && Object.keys(value).length > 0) filled++;
      else if (typeof value === 'string' && value.trim().length > 0) filled++;
      else if (typeof value === 'number' && value > 0) filled++;
      else if (typeof value === 'boolean') filled++;
    }
  });
  
  return Math.round((filled / fields.length) * 100);
}

// Generate unified metadata from dapp data
function generateUnifiedMetadata(dapp, minimal = false) {
  // Parse Alchemy data
  let alchemyData = null;
  try {
    if (dapp.alchemy_recent_activity) {
      alchemyData = typeof dapp.alchemy_recent_activity === 'string'
        ? JSON.parse(dapp.alchemy_recent_activity)
        : dapp.alchemy_recent_activity;
    }
  } catch (e) {
    // Ignore parse errors
  }

  // Parse DeFiLlama chain TVL
  let defillamaChainTvl = null;
  try {
    if (dapp.chain_tvl) {
      const parsed = typeof dapp.chain_tvl === 'string' 
        ? JSON.parse(dapp.chain_tvl)
        : dapp.chain_tvl;
      if (Array.isArray(parsed)) {
        defillamaChainTvl = {};
        parsed.forEach(item => {
          if (item.chain && item.tvl) {
            defillamaChainTvl[item.chain] = item.tvl;
          }
        });
      }
    }
  } catch (e) {
    // Ignore parse errors
  }

  // Initialize unified metadata
  const unified = {
    name: null,
    slug: null,
    description: null,
    logoUrl: null,
    iconUrl: null,
    tvlUsd: null,
    chainTvl: null,
    category: null,
    categories: null,
    chains: null,
    websiteUrl: null,
    twitterUrl: null,
    twitterHandle: null,
    discordUrl: null,
    githubUrl: null,
    documentationUrl: null,
    defillamaUrl: null,
    alchemyUrl: null,
    featured: false,
    verified: false,
    isDefiProtocol: false,
    sources: {},
    lastUpdated: new Date().toISOString(),
    dataQuality: {
      hasAlchemyData: false,
      hasDefillamaData: false,
      completenessScore: 0
    }
  };

  // Track sources
  const sources = {};

  // ===== NAME =====
  // Priority: DeFiLlama (via title) > Alchemy name > DatoCMS title
  if (dapp.title) {
    unified.name = dapp.title.trim();
    sources.name = 'datocms';
  }
  if (alchemyData?.name && (!unified.name || alchemyData.name.length > unified.name.length)) {
    unified.name = alchemyData.name.trim();
    sources.name = sources.name ? 'both' : 'alchemy';
  }

  // ===== SLUG =====
  if (dapp.protocol_id) {
    unified.slug = dapp.protocol_id;
    sources.slug = 'defillama';
  }
  if (alchemyData?.slug) {
    unified.slug = alchemyData.slug;
    sources.slug = sources.slug ? 'both' : 'alchemy';
  }

  // ===== DESCRIPTION =====
  // Priority: Longest available description (truncated based on minimal mode)
  const descriptions = [
    dapp.short_description,
    alchemyData?.description,
    alchemyData?.longDescription
  ].filter(Boolean).sort((a, b) => b.length - a.length);
  
  if (descriptions.length > 0) {
    let desc = descriptions[0].trim();
    // Truncate based on mode
    const maxLength = minimal ? 500 : 3000;
    if (desc.length > maxLength) {
      desc = desc.substring(0, maxLength) + '...';
    }
    unified.description = desc;
    if (dapp.short_description === descriptions[0]) sources.description = 'datocms';
    else if (alchemyData?.longDescription === descriptions[0]) sources.description = 'alchemy';
    else sources.description = 'alchemy';
  }

  // ===== LOGO =====
  // Priority: Token logo > Alchemy CDN > Alchemy logo
  if (dapp.token_logo_url) {
    unified.logoUrl = dapp.token_logo_url;
    sources.logoUrl = 'token';
  }
  if (alchemyData?.logoUrl && !unified.logoUrl) {
    unified.logoUrl = alchemyData.logoUrl;
    sources.logoUrl = sources.logoUrl ? 'both' : 'alchemy';
  }

  // ===== TVL =====
  if (dapp.tvl_usd && dapp.tvl_usd > 0) {
    unified.tvlUsd = dapp.tvl_usd;
    unified.isDefiProtocol = true;
    sources.tvlUsd = 'defillama';
  }

  // ===== TVL TRENDS =====
  // Extract from alchemy_recent_activity if stored there
  if (alchemyData?.defillamaMetrics) {
    if (alchemyData.defillamaMetrics.change_1d !== null && alchemyData.defillamaMetrics.change_1d !== undefined) {
      unified.tvlChange1d = alchemyData.defillamaMetrics.change_1d;
    }
    if (alchemyData.defillamaMetrics.change_7d !== null && alchemyData.defillamaMetrics.change_7d !== undefined) {
      unified.tvlChange7d = alchemyData.defillamaMetrics.change_7d;
    }
    if (alchemyData.defillamaMetrics.change_1m !== null && alchemyData.defillamaMetrics.change_1m !== undefined) {
      unified.tvlChange1m = alchemyData.defillamaMetrics.change_1m;
    }
  }

  // ===== TOKEN METRICS =====
  if (alchemyData?.defillamaMetrics) {
    if (alchemyData.defillamaMetrics.mcap) {
      unified.marketCap = alchemyData.defillamaMetrics.mcap;
    }
    if (alchemyData.defillamaMetrics.tokenPrice) {
      unified.tokenPrice = alchemyData.defillamaMetrics.tokenPrice;
    }
    if (alchemyData.defillamaMetrics.tokenSymbol) {
      unified.tokenSymbol = alchemyData.defillamaMetrics.tokenSymbol;
    }
    if (alchemyData.defillamaMetrics.fdv) {
      unified.fdv = alchemyData.defillamaMetrics.fdv;
    }
  }

  // ===== CHAIN TVL =====
  // Only include if not in minimal mode (limit to top 5 chains by TVL in minimal mode)
  if (defillamaChainTvl && Object.keys(defillamaChainTvl).length > 0 && !minimal) {
    const sortedChains = Object.entries(defillamaChainTvl)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Limit to top 10 chains
    unified.chainTvl = Object.fromEntries(sortedChains);
    sources.chainTvl = 'defillama';
  }

  // ===== CATEGORY =====
  if (dapp.category_defillama) {
    unified.category = dapp.category_defillama;
    sources.category = 'defillama';
  }
  if (alchemyData?.categories && alchemyData.categories.length > 0 && !unified.category) {
    unified.category = alchemyData.categories[0];
    sources.category = 'alchemy';
  }

  // ===== CATEGORIES (array) =====
  const allCategories = new Set();
  if (dapp.category_defillama) allCategories.add(dapp.category_defillama);
  if (alchemyData?.categories) {
    extractCategoryNames(alchemyData.categories).forEach(cat => allCategories.add(cat));
  }
  if (allCategories.size > 0) {
    unified.categories = Array.from(allCategories);
    sources.categories = 'both';
  }

  // ===== CHAINS =====
  const allChains = new Set();
  // Add chains from DatoCMS relationships if available
  if (dapp.chains && Array.isArray(dapp.chains)) {
    dapp.chains.forEach(chain => {
      if (chain?.name) allChains.add(chain.name);
    });
  }
  // Add chains from Alchemy
  if (alchemyData?.chains) {
    extractChainNames(alchemyData.chains).forEach(chain => allChains.add(chain));
  }
  // Add chains from chainTvl
  if (defillamaChainTvl) {
    Object.keys(defillamaChainTvl).forEach(chain => allChains.add(chain));
  }
  if (allChains.size > 0) {
    unified.chains = Array.from(allChains).sort();
    sources.chains = 'both';
  }

  // ===== WEBSITE URL =====
  // Priority: DeFiLlama URL > Alchemy websiteUrl
  if (alchemyData?.websiteUrl) {
    unified.websiteUrl = alchemyData.websiteUrl;
    sources.websiteUrl = 'alchemy';
  }

  // ===== TWITTER =====
  const twitter = normalizeTwitter(alchemyData?.twitterUrl || alchemyData?.twitter);
  if (twitter) {
    unified.twitterUrl = twitter.url;
    unified.twitterHandle = twitter.handle;
    sources.twitterUrl = 'alchemy';
  }

  // ===== DISCORD =====
  if (alchemyData?.discordUrl) {
    unified.discordUrl = alchemyData.discordUrl;
    sources.discordUrl = 'alchemy';
  }

  // ===== GITHUB =====
  if (alchemyData?.githubUrl) {
    unified.githubUrl = alchemyData.githubUrl;
    sources.githubUrl = 'alchemy';
  }

  // ===== DOCUMENTATION =====
  if (alchemyData?.documentationUrl) {
    unified.documentationUrl = alchemyData.documentationUrl;
    sources.documentationUrl = 'alchemy';
  }

  // ===== EXTERNAL REFERENCES =====
  if (dapp.defillama_url) {
    unified.defillamaUrl = dapp.defillama_url;
  } else if (dapp.protocol_id) {
    unified.defillamaUrl = `https://defillama.com/protocol/${dapp.protocol_id}`;
  }

  if (alchemyData?.slug) {
    unified.alchemyUrl = `https://dapp-store.alchemy.com/dapps/${alchemyData.slug}`;
  }

  // ===== RELATED DAPPS =====
  // Extract from Alchemy data
  if (alchemyData?.relatedDappsAndTools && Array.isArray(alchemyData.relatedDappsAndTools) && alchemyData.relatedDappsAndTools.length > 0) {
    unified.relatedDapps = alchemyData.relatedDappsAndTools.slice(0, 6).map(dapp => ({
      name: dapp.name,
      slug: dapp.slug,
      logoUrl: dapp.logoCdnUrl,
      shortDescription: dapp.shortDescription
    }));
  } else if (alchemyData?.alternatives && Array.isArray(alchemyData.alternatives) && alchemyData.alternatives.length > 0) {
    unified.relatedDapps = alchemyData.alternatives.slice(0, 6).map(dapp => ({
      name: dapp.name,
      slug: dapp.slug,
      logoUrl: dapp.logoCdnUrl,
      shortDescription: dapp.shortDescription
    }));
  }

  // ===== STATUS FLAGS =====
  if (alchemyData?.featured !== undefined) {
    unified.featured = alchemyData.featured === true;
  }
  if (alchemyData?.verified !== undefined) {
    unified.verified = alchemyData.verified === true;
  }

  // ===== SOURCE TRACKING =====
  unified.sources = sources;

  // ===== DATA QUALITY =====
  unified.dataQuality.hasAlchemyData = !!alchemyData;
  unified.dataQuality.hasDefillamaData = !!(dapp.protocol_id || dapp.tvl_usd);
  unified.dataQuality.completenessScore = calculateCompleteness(unified);

  // Remove null values to keep JSON clean
  const cleaned = {};
  Object.entries(unified).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value) && value.length === 0) return;
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return;
      cleaned[key] = value;
    }
  });

  // Final size check - if still too large, truncate description further or remove optional fields
  let jsonString = JSON.stringify(cleaned);
  let sizeKB = Buffer.byteLength(jsonString, 'utf8') / 1024;
  
  if (sizeKB > 250) {
    // First, try truncating description
    const bytesToRemove = (sizeKB - 250) * 1024;
    const charsToRemove = Math.ceil(bytesToRemove / 2);
    if (cleaned.description) {
      const targetSize = Math.max(500, cleaned.description.length - charsToRemove);
      cleaned.description = cleaned.description.substring(0, targetSize) + '...';
      jsonString = JSON.stringify(cleaned);
      sizeKB = Buffer.byteLength(jsonString, 'utf8') / 1024;
    }
    
    // If still too large, remove chainTvl (optional field)
    if (sizeKB > 250 && cleaned.chainTvl) {
      delete cleaned.chainTvl;
      jsonString = JSON.stringify(cleaned);
      sizeKB = Buffer.byteLength(jsonString, 'utf8') / 1024;
    }
    
    // If still too large, truncate description more aggressively
    if (sizeKB > 250 && cleaned.description) {
      cleaned.description = cleaned.description.substring(0, 1000) + '...';
      jsonString = JSON.stringify(cleaned);
      sizeKB = Buffer.byteLength(jsonString, 'utf8') / 1024;
    }
  }

  return cleaned;
}

// Main function
async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🚀 Generating unified metadata for all dapps...\n');

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

    const dappModelId = dappModel.id;
    console.log(`✅ Found Dapp model (id: ${dappModelId})\n`);

    // Check if unified_metadata field exists, if not, create it
    const fields = await client.fields.list(dappModelId);
    let unifiedMetadataField = fields.find(f => {
      const apiKey = f.attributes?.api_key || f.api_key;
      return apiKey === 'unified_metadata';
    });

    if (!unifiedMetadataField) {
      console.log('📝 Creating unified_metadata field...');
      unifiedMetadataField = await client.fields.create(dappModelId, {
        label: 'Unified Metadata',
        api_key: 'unified_metadata',
        field_type: 'text',
        validators: {}
      });
      console.log('✅ Created unified_metadata field\n');
    } else {
      console.log('✅ unified_metadata field already exists\n');
    }

    // Fetch all dapps
    const allDapps = await client.items.list({
      filter: { type: dappModelId }
    });

    console.log(`📋 Found ${allDapps.length} dapps to process\n`);

    let updated = 0;
    let failed = 0;

    for (const dapp of allDapps) {
      try {
        // Check existing record size (estimate from alchemy_recent_activity)
        let existingSize = 0;
        if (dapp.alchemy_recent_activity) {
          const alchemyStr = typeof dapp.alchemy_recent_activity === 'string' 
            ? dapp.alchemy_recent_activity 
            : JSON.stringify(dapp.alchemy_recent_activity);
          existingSize = Buffer.byteLength(alchemyStr, 'utf8') / 1024;
        }
        
        // If existing record is already very large, create minimal unified metadata
        const unifiedMetadata = existingSize > 200 
          ? generateUnifiedMetadata(dapp, true) // minimal mode
          : generateUnifiedMetadata(dapp, false);
          
        let jsonString = JSON.stringify(unifiedMetadata);
        const metadataSizeKB = Buffer.byteLength(jsonString, 'utf8') / 1024;
        const totalSizeKB = existingSize + metadataSizeKB;

        // Final safety check - if total would exceed limit, create minimal version
        if (totalSizeKB > 280) {
          const minimalMetadata = generateUnifiedMetadata(dapp, true);
          jsonString = JSON.stringify(minimalMetadata);
          const minimalSizeKB = Buffer.byteLength(jsonString, 'utf8') / 1024;
          
          if (existingSize + minimalSizeKB > 280) {
            console.log(`⚠️  [SKIP] "${dapp.title || 'Unknown'}" - record already too large (${existingSize.toFixed(1)}KB existing)`);
            failed++;
            continue;
          }
          
          await client.items.update(dapp.id, {
            unified_metadata: jsonString
          });
          
          const completeness = minimalMetadata.dataQuality?.completenessScore || 0;
          console.log(`✅ [${completeness}%] "${dapp.title || 'Unknown'}" (minimal, ${minimalSizeKB.toFixed(1)}KB)`);
          updated++;
        } else {
          await client.items.update(dapp.id, {
            unified_metadata: jsonString
          });

          const completeness = unifiedMetadata.dataQuality?.completenessScore || 0;
          console.log(`✅ [${completeness}%] "${dapp.title || 'Unknown'}" (${metadataSizeKB.toFixed(1)}KB)`);
          updated++;
        }
      } catch (err) {
        if (err.body?.data?.[0]?.attributes?.code === 'TECHNICAL_LIMIT_REACHED') {
          console.log(`⚠️  [SKIP] "${dapp.title || 'Unknown'}" - exceeds size limit`);
        } else {
          console.error(`❌ Failed to update "${dapp.title || 'Unknown'}":`, err.message);
        }
        failed++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n✅ Unified metadata generation complete!');
    console.log(`   Updated: ${updated} dapps`);
    console.log(`   Failed: ${failed} dapps`);

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();

