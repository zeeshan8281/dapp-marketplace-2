// seed-alchemy-dapps.mjs - Seed dapps from Alchemy's public dapp store
import { buildClient } from "@datocms/cma-client-node";
import fetch from 'node-fetch';

/*
  USAGE:
  - Set DATOCMS_API_TOKEN (full-access CMA token)
  - Run: DATOCMS_API_TOKEN=xxxxx node seed-alchemy-dapps.mjs [LIMIT]
  
  OPTIONS:
  - LIMIT (optional): Maximum number of new dapps to create (to stay within plan limits)
  - --only-goldrush: ONLY fetch dapps on GoldRush-supported chains (skip others)
  - Or set environment variables:
    * MAX_CREATE=100: Limit number of dapps to create
    * ONLY_GOLDRUSH=true: Only fetch GoldRush chain dapps

  EXAMPLES:
  - Create all dapps: DATOCMS_API_TOKEN=xxxxx node seed-alchemy-dapps.mjs
  - Create max 50: DATOCMS_API_TOKEN=xxxxx node seed-alchemy-dapps.mjs 50
  - ONLY GoldRush chains: DATOCMS_API_TOKEN=xxxxx node seed-alchemy-dapps.mjs --only-goldrush
  - GoldRush chains, max 100: MAX_CREATE=100 ONLY_GOLDRUSH=true DATOCMS_API_TOKEN=xxxxx node seed-alchemy-dapps.mjs

  This script:
  1. Fetches ALL dapps from Alchemy's public dapp store (multiple pages)
  2. Creates dapp records in DatoCMS for dapps that don't exist yet
  3. Includes description, logo URL, chains, and categories from Alchemy
  4. Combines data with DeFiLlama when available
  5. Respects creation limits to avoid hitting plan quotas
*/

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });
const ALCHEMY_DAPP_STORE_API = 'https://dapp-store.alchemy.com';
const DEFILLAMA_API = 'https://api.llama.fi';

// GoldRush supported chains - prioritized list from https://goldrush.dev/docs/chains/overview
// Priority: 1 = Foundational, 2 = Frontier, 3 = Community, 4 = Archived
// Includes multiple name variations that Alchemy might use
const GOLDRUSH_CHAINS = {
  // Foundational (Priority 1)
  'ethereum': { priority: 1, category: 'Foundational', aliases: ['eth', 'ethereum mainnet', 'ethereum main', 'eth mainnet'] },
  'polygon': { priority: 1, category: 'Foundational', aliases: ['matic', 'polygon mainnet', 'polygon pos'] },
  'bnb smart chain': { priority: 1, category: 'Foundational', aliases: ['bsc', 'binance smart chain', 'binance', 'bnb'] },
  'bsc': { priority: 1, category: 'Foundational', aliases: ['bnb smart chain', 'binance smart chain', 'binance', 'bnb'] },
  'binance smart chain': { priority: 1, category: 'Foundational', aliases: ['bsc', 'bnb smart chain', 'binance', 'bnb'] },
  'optimism': { priority: 1, category: 'Foundational', aliases: ['optimism mainnet', 'op mainnet', 'optimistic ethereum'] },
  'base': { priority: 1, category: 'Foundational', aliases: ['base mainnet', 'base chain'] },
  'gnosis': { priority: 1, category: 'Foundational', aliases: ['gnosis chain', 'xdai', 'gnosis mainnet'] },
  
  // Frontier (Priority 2)
  'bitcoin': { priority: 2, category: 'Frontier', aliases: ['btc', 'bitcoin mainnet'] },
  'avalanche': { priority: 2, category: 'Frontier', aliases: ['avax', 'avalanche c chain', 'avalanche cchain', 'avalanche c-chain'] },
  'avalanche c-chain': { priority: 2, category: 'Frontier', aliases: ['avalanche', 'avax', 'avalanche cchain', 'avalanche c chain'] },
  'adi': { priority: 2, category: 'Frontier', aliases: [] },
  'apechain': { priority: 2, category: 'Frontier', aliases: ['ape chain'] },
  'arbitrum': { priority: 2, category: 'Frontier', aliases: ['arbitrum one', 'arbitrum mainnet', 'arb1'] },
  'arbitrum nova': { priority: 2, category: 'Frontier', aliases: ['arbitrum nova mainnet', 'nova'] },
  'astar': { priority: 2, category: 'Frontier', aliases: ['astar network'] },
  'aurora': { priority: 2, category: 'Frontier', aliases: ['aurora mainnet'] },
  'boba': { priority: 2, category: 'Frontier', aliases: ['boba network', 'boba mainnet'] },
  'canto': { priority: 2, category: 'Frontier', aliases: ['canto network'] },
  'celo': { priority: 2, category: 'Frontier', aliases: ['celo network', 'celo mainnet'] },
  'cronos': { priority: 2, category: 'Frontier', aliases: ['cronos mainnet', 'crypto.org chain'] },
  'cronos zkevm': { priority: 2, category: 'Frontier', aliases: ['cronos zk evm', 'cronos zk-evm'] },
  'oasis': { priority: 2, category: 'Frontier', aliases: ['oasis network', 'oasis emerald'] },
  'manta pacific': { priority: 2, category: 'Frontier', aliases: ['manta', 'manta network'] },
  'moonbeam': { priority: 2, category: 'Frontier', aliases: ['moonbeam network'] },
  'moonriver': { priority: 2, category: 'Frontier', aliases: ['moonriver network'] },
  'redstone': { priority: 2, category: 'Frontier', aliases: ['redstone chain'] },
  'zetachain': { priority: 2, category: 'Frontier', aliases: ['zeta chain', 'zeta'] },
  
  // Community (Priority 3)
  'blast': { priority: 3, category: 'Community', aliases: ['blast mainnet', 'blast network'] },
  'fantom': { priority: 3, category: 'Community', aliases: ['fantom opera', 'fantom mainnet', 'ftm'] },
  'linea': { priority: 3, category: 'Community', aliases: ['linea mainnet', 'linea network'] },
  'mantle': { priority: 3, category: 'Community', aliases: ['mantle mainnet', 'mantle network'] },
  'scroll': { priority: 3, category: 'Community', aliases: ['scroll mainnet', 'scroll network'] },
  'zksync era': { priority: 3, category: 'Community', aliases: ['zksync', 'zk sync era', 'zksync mainnet'] },
  'zksync': { priority: 3, category: 'Community', aliases: ['zksync era', 'zk sync era', 'zksync mainnet'] },
  
  // Archived (Priority 4)
  'harmony': { priority: 4, category: 'Archived', aliases: ['harmony one', 'harmony mainnet'] },
  'lisk': { priority: 4, category: 'Archived', aliases: ['lisk network'] },
  'loot chain': { priority: 4, category: 'Archived', aliases: ['loot', 'lootchain'] },
};

// Create reverse lookup for aliases
const CHAIN_ALIASES = {};
Object.entries(GOLDRUSH_CHAINS).forEach(([key, value]) => {
  CHAIN_ALIASES[key] = key; // Direct match
  if (value.aliases) {
    value.aliases.forEach(alias => {
      CHAIN_ALIASES[alias] = key;
    });
  }
});

// Normalize chain name for matching
function normalizeChainName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Check if a chain name matches a GoldRush chain (with fuzzy matching)
function findGoldRushChain(chainName) {
  if (!chainName) return null;
  
  const normalized = normalizeChainName(chainName);
  
  // Direct match
  if (GOLDRUSH_CHAINS[normalized]) {
    return { key: normalized, ...GOLDRUSH_CHAINS[normalized] };
  }
  
  // Check aliases
  if (CHAIN_ALIASES[normalized]) {
    const key = CHAIN_ALIASES[normalized];
    return { key, ...GOLDRUSH_CHAINS[key] };
  }
  
  // Fuzzy matching - check if normalized name contains or is contained by any chain name
  for (const [key, chainInfo] of Object.entries(GOLDRUSH_CHAINS)) {
    const keyNormalized = normalizeChainName(key);
    
    // Exact match after normalization
    if (keyNormalized === normalized) {
      return { key, ...chainInfo };
    }
    
    // Contains match (e.g., "ethereum mainnet" contains "ethereum")
    if (normalized.includes(keyNormalized) || keyNormalized.includes(normalized)) {
      return { key, ...chainInfo };
    }
    
    // Check aliases with contains
    if (chainInfo.aliases) {
      for (const alias of chainInfo.aliases) {
        const aliasNormalized = normalizeChainName(alias);
        if (normalized.includes(aliasNormalized) || aliasNormalized.includes(normalized)) {
          return { key, ...chainInfo };
        }
      }
    }
  }
  
  return null;
}

// Check if dapp is on GoldRush chains and get priority
function getGoldRushPriority(dapp) {
  let highestPriority = 999; // Lower number = higher priority
  let bestCategory = null;
  let matchedChains = [];

  // Check chains from Alchemy data
  if (dapp.chains && Array.isArray(dapp.chains)) {
    for (const chain of dapp.chains) {
      const chainName = typeof chain === 'string' ? chain : (chain.name || chain);
      const match = findGoldRushChain(chainName);
      
      if (match) {
        if (match.priority < highestPriority) {
          highestPriority = match.priority;
          bestCategory = match.category;
        }
        matchedChains.push({ name: chainName, ...match });
      }
    }
  }

  // Also check from alchemy_recent_activity if available
  if (dapp.alchemy_recent_activity) {
    try {
      const alchemyData = typeof dapp.alchemy_recent_activity === 'string'
        ? JSON.parse(dapp.alchemy_recent_activity)
        : dapp.alchemy_recent_activity;
      
      if (alchemyData.chains && Array.isArray(alchemyData.chains)) {
        for (const chain of alchemyData.chains) {
          const chainName = typeof chain === 'string' ? chain : (chain.name || chain);
          const match = findGoldRushChain(chainName);
          
          if (match) {
            if (match.priority < highestPriority) {
              highestPriority = match.priority;
              bestCategory = match.category;
            }
            const existing = matchedChains.find(c => normalizeChainName(c.name) === normalizeChainName(chainName));
            if (!existing) {
              matchedChains.push({ name: chainName, ...match });
            }
          }
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  return {
    priority: highestPriority === 999 ? null : highestPriority,
    category: bestCategory,
    matchedChains,
    isGoldRush: highestPriority !== 999
  };
}

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
      github: protocolData.github || null,
      // TVL trends
      change_1d: protocolData.change_1d || null,
      change_7d: protocolData.change_7d || null,
      change_1m: protocolData.change_1m || null,
      // Token metrics
      mcap: protocolData.mcap || null,
      tokenPrice: protocolData.tokenPrice || null,
      tokenSymbol: protocolData.tokenSymbol || protocolData.symbol || null,
      fdv: protocolData.fdv || null
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
    if (!res.ok) {
      if (res.status === 404) return null;
      // Rate limit or other error - return null but don't log to avoid spam
      return null;
    }
    const data = await res.json();
    return data;
  } catch (err) {
    // Silently fail for prioritization - we'll retry during creation
    return null;
  }
}

// Filter out only: APIs, SDKs, Investment Firms, and Educational Content
function isActualDapp(alchemyDapp) {
  const name = (alchemyDapp.name || '').toLowerCase();
  const description = (alchemyDapp.description || alchemyDapp.longDescription || '').toLowerCase();
  
  // Exclude patterns: APIs, SDKs, Investment Firms, Educational Content
  const excludePatterns = [
    ' api',
    'api ',
    ' sdk',
    'sdk ',
    'university',
    'bootcamp',
    'tutorial',
    'course',
    'courses',
    'learning',
    'education',
    'educational',
    'venture',
    'ventures',
    'fund',
    'capital',
    'investment',
    'investor',
    'investors',
    'vc firm',
    'venture capital',
  ];
  
  // Check name
  for (const pattern of excludePatterns) {
    if (name.includes(pattern)) {
      return false;
    }
  }
  
  // Check categories - only exclude APIs, SDKs, Investment, Education
  const categories = alchemyDapp.categories || [];
  const excludeCategories = [
    'apis',
    'api',
    'sdks',
    'sdk',
    'venture capital',
    'vc',
    'investment',
    'investors',
    'education',
    'educational',
    'tutorials',
    'tutorial',
    'courses',
    'course',
    'learning',
  ];
  
  for (const cat of categories) {
    const catName = (typeof cat === 'string' ? cat : cat?.name || '').toLowerCase();
    for (const excludeCat of excludeCategories) {
      if (catName.includes(excludeCat)) {
        return false;
      }
    }
  }
  
  // Check description for API/SDK/Investment/Education indicators
  const excludeIndicators = [
    'use our api',
    'use our sdk',
    'api endpoint',
    'sdk for',
    'investment fund',
    'venture capital',
    'vc firm',
    'educational platform',
    'learning platform',
    'bootcamp',
    'tutorial',
  ];
  
  for (const indicator of excludeIndicators) {
    if (description.includes(indicator)) {
      return false;
    }
  }
  
  return true;
}

// Fetch dapps from Alchemy's dapp store - fetches ALL available dapps
async function fetchAllAlchemyDapps() {
  const allDapps = [];
  let page = 1;
  let hasMore = true;
  let totalCount = null;

  console.log(`📡 Fetching ALL dapps from Alchemy Dapp Store...\n`);

  while (hasMore) {
    try {
      const res = await fetch(`${ALCHEMY_DAPP_STORE_API}/dapps?page=${page}`);
      if (!res.ok) {
        console.log(`[page ${page}] HTTP ${res.status}, stopping...`);
        hasMore = false;
        break;
      }

      const data = await res.json();
      
      // Get total count from first page
      if (page === 1 && data.total) {
        totalCount = data.total;
        console.log(`📊 Total dapps available: ${totalCount}\n`);
      }
      
      if (!data.records || data.records.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`[page ${page}] Found ${data.records.length} dapps (${allDapps.length + data.records.length}/${totalCount || '?'} total)`);
      
      // Add all dapps from this page
      allDapps.push(...data.records);
      
      // Check if we've fetched all available dapps
      if (totalCount && allDapps.length >= totalCount) {
        hasMore = false;
        break;
      }
      
      // If this page has fewer records than expected, we might be at the end
      if (data.records.length < 50) { // Assuming ~50 per page
        hasMore = false;
        break;
      }
      
      page++;

      // Rate limiting - be respectful to the API
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
    // Use cached detail if available (from prioritization phase), otherwise fetch
    let alchemyDetail = alchemyDapp._detail || null;
    if (!alchemyDetail && alchemyDapp.slug) {
      alchemyDetail = await fetchAlchemyDappDetail(alchemyDapp.slug);
      if (alchemyDetail) {
        console.log(`  [Alchemy] Fetched detailed data with longDescription`);
      }
    } else if (alchemyDetail) {
      console.log(`  [Alchemy] Using cached detailed data`);
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
    
    // Generate slug from name
    const generateSlug = (name) => {
      if (!name || typeof name !== 'string') return null;
      return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    };

    const slug = generateSlug(alchemyDapp.name) || alchemyDapp.slug || null;

    const payload = {
      item_type: { type: "item_type", id: dappModelId },
      title: alchemyDapp.name,
      short_description: shortDescription,
    };

    // Note: slug field removed - it doesn't exist in the model

    // Add DeFiLlama data if found
    if (defiLlamaData) {
      payload.protocol_id = defiLlamaData.protocolId;
      
      // Validate TVL - must be a number, not an array
      let validTvl = null;
      if (defiLlamaData.tvl != null && defiLlamaData.tvl !== undefined) {
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
        payload.tvl_usd = validTvl;
      }
      
      payload.category_defillama = defiLlamaData.category;
      payload.chain_tvl = defiLlamaData.chainTvls ? JSON.stringify(
        Object.entries(defiLlamaData.chainTvls).map(([chain, tvl]) => ({ chain, tvl }))
      ) : null;
      payload.defillama_url = defiLlamaData.defillamaUrl;
      payload.last_synced_at = new Date().toISOString();
      payload.last_sync_status = 'ok';
      if (validTvl) {
        console.log(`  [DeFiLlama] Found matching protocol: ${defiLlamaData.protocolId} (TVL: $${(validTvl / 1000000).toFixed(1)}M)`);
      } else {
        console.log(`  [DeFiLlama] Found matching protocol: ${defiLlamaData.protocolId} (no valid TVL)`);
      }
    }

    // Helper to truncate text to max length
    const truncate = (text, maxLen = 5000) => {
      if (!text || typeof text !== 'string') return null;
      return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
    };
    
    // Helper to extract chain names only (not full objects)
    const extractChainNames = (chains) => {
      if (!chains || !Array.isArray(chains)) return [];
      return chains.map(chain => {
        if (typeof chain === 'string') return chain;
        if (chain?.name) return chain.name;
        return null;
      }).filter(Boolean);
    };
    
    // Helper to extract category names only
    const extractCategoryNames = (categories) => {
      if (!categories || !Array.isArray(categories)) return [];
      return categories.map(cat => {
        if (typeof cat === 'string') return cat;
        if (cat?.name) return cat.name;
        return null;
      }).filter(Boolean);
    };
    
    // Store optimized Alchemy data (reduced size to stay under 300KB limit)
    const alchemyData = {
      // Core identification
      name: alchemyDapp.name,
      slug: alchemyDapp.slug,
      
      // Single best description (truncated to 5000 chars max)
      description: truncate(
        alchemyDetail?.longDescription || 
        alchemyDetail?.description || 
        alchemyDapp.shortDescription || 
        alchemyDapp.description,
        5000
      ),
      
      // Media (single best logo URL)
      logoUrl: alchemyDetail?.logoCdnUrl || alchemyDapp.logoCdnUrl || null,
      
      // Chains and categories (names only, not full objects)
      chains: extractChainNames(alchemyDetail?.chains || alchemyDapp.chains),
      categories: extractCategoryNames(
        alchemyDetail?.vipChildCategory || 
        alchemyDetail?.categories ||
        alchemyDapp.vipChildCategory || 
        alchemyDapp.categories
      ),
      
      // Metadata
      eyebrowText: alchemyDetail?.eyebrowText || alchemyDapp.eyebrowText || null,
      source: 'alchemy_dapp_store',
      
      // Links and social (single best URL for each)
      websiteUrl: alchemyDetail?.website || 
                  alchemyDetail?.websiteUrl || 
                  alchemyDapp.websiteUrl || 
                  null,
      twitterUrl: alchemyDetail?.twitter ? 
                  (alchemyDetail.twitter.startsWith('http') ? alchemyDetail.twitter : `https://twitter.com/${alchemyDetail.twitter.replace('@', '')}`) :
                  (alchemyDetail?.twitterUrl || alchemyDapp.twitterUrl || null),
      discordUrl: alchemyDetail?.discordUrl || alchemyDapp.discordUrl || null,
      githubUrl: alchemyDetail?.githubUrl || alchemyDapp.githubUrl || null,
      documentationUrl: alchemyDetail?.documentationUrl || alchemyDapp.documentationUrl || null,
      
      // Status flags only (not dates to save space)
      featured: alchemyDetail?.featured || false,
      verified: alchemyDetail?.verified || false
    };
    
    // Add DeFiLlama links if available (prioritize DeFiLlama over Alchemy for links)
    if (defiLlamaData) {
      alchemyData.websiteUrl = defiLlamaData.url || alchemyData.websiteUrl;
      alchemyData.twitterUrl = defiLlamaData.twitter ? `https://twitter.com/${defiLlamaData.twitter.replace('@', '')}` : alchemyData.twitterUrl;
      alchemyData.githubUrl = defiLlamaData.github || alchemyData.githubUrl;
      // Update description from DeFiLlama if it's better (truncated)
      if (defiLlamaData.description && (!alchemyData.description || defiLlamaData.description.length > (alchemyData.description?.length || 0))) {
        alchemyData.description = truncate(defiLlamaData.description, 5000);
      }
    }
    
    // Only store if there's meaningful data, and check size
    if (alchemyDapp.shortDescription || alchemyDapp.logoCdnUrl || alchemyDapp.chains || alchemyDapp.vipChildCategory || defiLlamaData) {
      let jsonString = JSON.stringify(alchemyData);
      const sizeKB = Buffer.byteLength(jsonString, 'utf8') / 1024;
      
      // If still too large, further truncate description
      if (sizeKB > 250) { // Leave some buffer under 300KB limit
        const currentDesc = alchemyData.description || '';
        const bytesToRemove = (sizeKB - 250) * 1024;
        const charsToRemove = Math.ceil(bytesToRemove / 2); // Rough estimate: ~2 bytes per char
        const targetSize = Math.max(1000, currentDesc.length - charsToRemove);
        alchemyData.description = truncate(currentDesc, targetSize);
        jsonString = JSON.stringify(alchemyData);
      }
      
      payload.alchemy_recent_activity = jsonString;
    }

    // Debug: log payload keys
    console.log(`[debug] Creating "${alchemyDapp.name}" with fields: ${Object.keys(payload).filter(k => k !== 'item_type').join(', ')}`);
    
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

  // Get limit from environment variable or command line arg (default: no limit)
  const maxCreate = process.env.MAX_CREATE 
    ? parseInt(process.env.MAX_CREATE, 10) 
    : (process.argv[2] ? parseInt(process.argv[2], 10) : null);

  if (maxCreate && maxCreate <= 0) {
    console.error('❌ MAX_CREATE must be a positive number');
    process.exit(1);
  }

  // Option to ONLY fetch dapps on GoldRush chains (skip others)
  const onlyGoldRush = process.env.ONLY_GOLDRUSH === 'true' || process.argv.includes('--only-goldrush');

  try {
    console.log('🚀 Starting Alchemy dapp seeding...\n');
    if (maxCreate) {
      console.log(`⚠️  LIMIT MODE: Will create maximum ${maxCreate} new dapps\n`);
    } else {
      console.log(`📊 UNLIMITED MODE: Will create all available dapps\n`);
    }
    if (onlyGoldRush) {
      console.log(`🌟 GOLDRUSH-ONLY MODE: Will ONLY fetch dapps on GoldRush-supported chains\n`);
    }

    // Find Dapp model
    const dappModelId = await findModelIdByApiKey('dapp');
    console.log(`✅ Found Dapp model (id: ${dappModelId})\n`);

    // Fetch ALL dapps from Alchemy
    const allAlchemyDapps = await fetchAllAlchemyDapps();

    if (allAlchemyDapps.length === 0) {
      console.log('⚠️  No dapps found in Alchemy store');
      return;
    }

    // Filter out only: APIs, SDKs, Investment Firms, and Educational Content
    console.log('🔍 Filtering out APIs, SDKs, Investment Firms, and Educational Content...\n');
    const alchemyDapps = allAlchemyDapps.filter(dapp => isActualDapp(dapp));
    console.log(`✅ Filtered: ${allAlchemyDapps.length} total items → ${alchemyDapps.length} actual dapps\n`);
    
    if (alchemyDapps.length === 0) {
      console.log('⚠️  No actual dapps found after filtering');
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

    // Prioritize dapps on GoldRush chains
    console.log('🌟 Prioritizing dapps on GoldRush-supported chains...\n');
    console.log('📡 Fetching detail data for chain name resolution (this may take a moment)...\n');
    
    // Fetch detail data to get actual chain names (not just IDs from list endpoint)
    // The detail endpoint has actual chain names, not just IDs
    // We'll batch these requests with rate limiting
    console.log('   Fetching detail data for chain name resolution...\n');
    const prioritizedDapps = [];
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < alchemyDapps.length; i += batchSize) {
      const batch = alchemyDapps.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (dapp) => {
          // Fetch detail to get actual chain names (not just IDs)
          const detail = await fetchAlchemyDappDetail(dapp.slug);
          // Merge detail chains into dapp for priority checking
          const dappWithDetail = {
            ...dapp,
            chains: detail?.chains || dapp.chains || [],
            _detail: detail // Store detail for later use in createDapp
          };
          return {
            dapp: dappWithDetail,
            goldRush: getGoldRushPriority(dappWithDetail)
          };
        })
      );
      prioritizedDapps.push(...batchResults);
      
      // Progress indicator
      if ((i + batchSize) % 100 === 0 || i + batchSize >= alchemyDapps.length) {
        process.stdout.write(`   Processed ${Math.min(i + batchSize, alchemyDapps.length)}/${alchemyDapps.length} dapps...\r`);
      }
      
      // Rate limiting between batches
      if (i + batchSize < alchemyDapps.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    console.log(`\n   ✅ Fetched detail data for ${prioritizedDapps.length} dapps\n`);
    
    // Sort by priority
    prioritizedDapps.sort((a, b) => {
      // Sort by: GoldRush priority (lower = better), then by name
      if (a.goldRush.priority !== b.goldRush.priority) {
        if (a.goldRush.priority === null) return 1;
        if (b.goldRush.priority === null) return -1;
        return a.goldRush.priority - b.goldRush.priority;
      }
      return (a.dapp.name || '').localeCompare(b.dapp.name || '');
    });

    // Count statistics
    const foundationalCount = prioritizedDapps.filter(p => p.goldRush.priority === 1).length;
    const frontierCount = prioritizedDapps.filter(p => p.goldRush.priority === 2).length;
    const communityCount = prioritizedDapps.filter(p => p.goldRush.priority === 3).length;
    const archivedCount = prioritizedDapps.filter(p => p.goldRush.priority === 4).length;
    const nonGoldRushCount = prioritizedDapps.filter(p => !p.goldRush.isGoldRush).length;
    const totalGoldRushCount = foundationalCount + frontierCount + communityCount + archivedCount;

    console.log(`📊 Dapp Priority Breakdown (from ${prioritizedDapps.length} total dapps):`);
    console.log(`   🌟 Foundational (Priority 1): ${foundationalCount} dapps`);
    console.log(`   ⚡ Frontier (Priority 2): ${frontierCount} dapps`);
    console.log(`   👥 Community (Priority 3): ${communityCount} dapps`);
    console.log(`   📦 Archived (Priority 4): ${archivedCount} dapps`);
    console.log(`   ✅ Total GoldRush-supported: ${totalGoldRushCount} dapps`);
    console.log(`   ⚠️  Non-GoldRush chains: ${nonGoldRushCount} dapps`);
    if (onlyGoldRush) {
      console.log(`\n   🎯 FILTERING: Will only process ${totalGoldRushCount} GoldRush dapps (skipping ${nonGoldRushCount} others)\n`);
    } else {
      console.log(`\n   ℹ️  All dapps will be processed, but GoldRush dapps are prioritized first\n`);
    }

    // Create new dapps (prioritized order)
    let created = 0;
    let skipped = 0;
    let skippedNonGoldRush = 0;
    let limitReached = false;
    let createdByPriority = { 1: 0, 2: 0, 3: 0, 4: 0, other: 0 };

    for (const { dapp: alchemyDapp, goldRush } of prioritizedDapps) {
      // Check if we've reached the limit
      if (maxCreate && created >= maxCreate) {
        limitReached = true;
        console.log(`\n⚠️  Reached creation limit of ${maxCreate} dapps. Stopping...`);
        break;
      }
      
      // FILTER: If onlyGoldRush mode, skip dapps not on GoldRush chains
      if (onlyGoldRush && !goldRush.isGoldRush) {
        skippedNonGoldRush++;
        skipped++;
        continue; // Skip non-GoldRush dapps
      }
      
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
        const priorityLabel = goldRush.isGoldRush 
          ? `[${goldRush.category}]` 
          : '[Other]';
        console.log(`[created] ${priorityLabel} "${alchemyDapp.name}" (id: ${itemId})`);
        created++;
        if (goldRush.priority) {
          createdByPriority[goldRush.priority] = (createdByPriority[goldRush.priority] || 0) + 1;
        } else {
          createdByPriority.other = (createdByPriority.other || 0) + 1;
        }
        existingTitles.add(titleLower);
      } else {
        console.log(`[failed] "${alchemyDapp.name}"`);
      }

      // Rate limiting (longer delay to avoid hitting DeFiLlama rate limits)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n✅ Seeding complete!');
    console.log(`   Created: ${created} dapps`);
    console.log(`   Skipped: ${skipped} dapps`);
    if (onlyGoldRush && skippedNonGoldRush > 0) {
      console.log(`   ⚠️  Skipped (non-GoldRush chains): ${skippedNonGoldRush} dapps`);
    }
    console.log(`\n📊 Created by Priority:`);
    console.log(`   🌟 Foundational: ${createdByPriority[1] || 0}`);
    console.log(`   ⚡ Frontier: ${createdByPriority[2] || 0}`);
    console.log(`   👥 Community: ${createdByPriority[3] || 0}`);
    console.log(`   📦 Archived: ${createdByPriority[4] || 0}`);
    console.log(`   ⚠️  Other: ${createdByPriority.other || 0}`);
    if (limitReached) {
      console.log(`\n⚠️  Hit creation limit. To continue, run:`);
      console.log(`   MAX_CREATE=${maxCreate} DATOCMS_API_TOKEN=xxxxx node seed-alchemy-dapps.mjs`);
      console.log(`   (This will skip already created dapps and continue)`);
    }
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

