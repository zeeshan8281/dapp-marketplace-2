// lib/fetch-alchemy-dapps.js
// Utility to fetch dapps from Alchemy and store in localStorage

const ALCHEMY_DAPP_STORE_API = 'https://dapp-store.alchemy.com';

// GoldRush supported chains - EXACT list from user (with variations for matching)
const GOLDRUSH_CHAINS = [
  'ethereum', 'base', 'gnosis', 'bnb smart chain', 'optimism', 'polygon',
  'berachain', 'axie/ronin', 'hyperevm', 'lens', 'linea', 'mantle', 'monad testnet',
  'oasis sapphire', 'palm', 'sei', 'zksync era', 'bitcoin', 'solana', 'unichain',
  'apechain', 'avalanche c-chain', 'boba bnb', 'gunzilla testnet', 'ink', 'scroll',
  'taiko', 'viction', 'world chain', 'zora', 'aurora', 'cronos', 'oasis', 'fantom',
  'moonbeam', 'moonriver', 'zetachain', 'beam', 'opbnb', 'dexalot', 'meldchain',
  'mirai testnet', 'numbers protocol', 'shrapnel', 'step network', 'uptn', 'xana chain',
  'blast', 'canto', 'celo', 'defi kingdoms', 'fraxtal', 'horizen eon', 'manta pacific',
  'merlin', 'metis', 'movement mevm', 'polygon zkevm',
  // Common variations/aliases
  'op mainnet', 'arbitrum', 'starknet', 'polygon zk evm', 'polygon zk-evm',
  'zk sync era', 'zksync', 'bsc', 'binance smart chain', 'bnb', 'matic',
  'avalanche', 'avax', 'avalanche cchain', 'avalanche c chain'
];

// Normalize chain name for matching (case-insensitive)
function normalizeChainName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.toLowerCase().trim();
}

// Check if chain name matches a GoldRush chain
function isGoldRushChain(chainName) {
  if (!chainName || typeof chainName !== 'string') return false;
  const normalized = normalizeChainName(chainName);
  return GOLDRUSH_CHAINS.some(chain => normalizeChainName(chain) === normalized);
}

// Check if dapp is in Layer 1 or Layer 2 Blockchains category
function isLayer1OrLayer2Blockchain(alchemyDapp) {
  const checkCategory = (catName) => {
    if (!catName || typeof catName !== 'string') return false;
    const normalized = catName.toLowerCase().trim();
    return (
      normalized === 'layer 1 blockchains' ||
      normalized === 'layer 2 blockchains' ||
      normalized === 'layer 1 blockchains (l1s)' ||
      normalized === 'layer 2 blockchains (l2s)' ||
      normalized.includes('layer 1 blockchains') ||
      normalized.includes('layer 2 blockchains')
    );
  };
  
  // Check vipChildCategory
  if (alchemyDapp.vipChildCategory && Array.isArray(alchemyDapp.vipChildCategory)) {
    for (const cat of alchemyDapp.vipChildCategory) {
      const catName = typeof cat === 'string' ? cat : (cat?.name || '');
      if (checkCategory(catName)) {
        return true;
      }
    }
  }
  
  // Check vipParentCategory
  if (alchemyDapp.vipParentCategory && Array.isArray(alchemyDapp.vipParentCategory)) {
    for (const cat of alchemyDapp.vipParentCategory) {
      const catName = typeof cat === 'string' ? cat : (cat?.name || '');
      if (checkCategory(catName)) {
        return true;
      }
    }
  }
  
  return false;
}

// Check if dapp matches GoldRush criteria
function matchesGoldRush(alchemyDapp) {
  // STEP 1: Check if dapp is in Layer 1 or Layer 2 Blockchains category
  const isLayer1OrLayer2 = isLayer1OrLayer2Blockchain(alchemyDapp);
  
  if (!isLayer1OrLayer2) {
    return false;
  }
  
  // STEP 2: If in Layer 1/2 category, check if the DAPP ITSELF is a GoldRush chain
  // (These are the chains themselves, not dapps on chains)
  const dappName = alchemyDapp.name || '';
  const dappSlug = alchemyDapp.slug || '';
  
  // Normalize dapp name for matching
  const normalizedDappName = normalizeChainName(dappName);
  const normalizedDappSlug = normalizeChainName(dappSlug);
  
  // Check if dapp name/slug matches a GoldRush chain (exact match only)
  if (normalizedDappName && isGoldRushChain(normalizedDappName)) {
    return true;
  }
  if (normalizedDappSlug && isGoldRushChain(normalizedDappSlug)) {
    return true;
  }
  
  // For Layer 1/2 blockchains, we ONLY want the chains themselves, not dapps on chains
  // So we DON'T check if it's "on" a GoldRush chain - we only check if the dapp IS a GoldRush chain
  return false;
}

/**
 * Fetches dapps from Alchemy API and stores them in localStorage
 * @param {number} limit - Maximum number of dapps to fetch (default: 200)
 * @returns {Promise<Array>} Array of fetched dapps
 */
export async function fetchAndStoreAlchemyDapps(limit = 200) {
  if (typeof window === 'undefined') {
    console.error('This function must be run in the browser');
    return [];
  }

  const allDapps = [];
  let page = 1;
  let hasMore = true;
  const STORAGE_KEY = 'alchemy_dapps_cache';
  const STORAGE_TIMESTAMP_KEY = 'alchemy_dapps_cache_timestamp';

  console.log(`📡 Fetching up to ${limit} dapps from Alchemy Dapp Store...`);

  try {
    while (hasMore && allDapps.length < limit) {
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

      // Add dapps up to the limit
      const remaining = limit - allDapps.length;
      const toAdd = data.records.slice(0, remaining);
      allDapps.push(...toAdd);

      console.log(`[page ${page}] Fetched ${toAdd.length} dapps (${allDapps.length}/${limit} total)`);

      if (allDapps.length >= limit) {
        hasMore = false;
        break;
      }

      page++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Fetch detail data for each dapp and filter for GoldRush matches
    console.log(`\n📥 Fetching detailed data for ${allDapps.length} dapps...`);
    console.log(`🔍 Filtering for GoldRush chains (Layer 1/2 Blockchains on GoldRush chains)...`);
    const detailedDapps = [];
    const goldRushDapps = [];
    
    for (let i = 0; i < allDapps.length; i++) {
      const dapp = allDapps[i];
      let enrichedDapp = dapp;
      
      // Fetch detail data if available
      if (dapp.slug) {
        try {
          const detailRes = await fetch(`${ALCHEMY_DAPP_STORE_API}/dapps/${dapp.slug}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            enrichedDapp = {
              ...dapp,
              ...detailData,
              _detail: detailData // Keep original detail data
            };
          }
        } catch (err) {
          console.warn(`Failed to fetch detail for ${dapp.name}:`, err.message);
        }
      }

      // Check if this dapp matches GoldRush criteria
      if (matchesGoldRush(enrichedDapp)) {
        goldRushDapps.push(enrichedDapp);
        detailedDapps.push(enrichedDapp);
      }

      // Progress indicator
      if ((i + 1) % 50 === 0) {
        console.log(`  Progress: ${i + 1}/${allDapps.length} dapps fetched, ${goldRushDapps.length} GoldRush matches found`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`\n✅ Filtering complete:`);
    console.log(`   Total fetched: ${allDapps.length} dapps`);
    console.log(`   GoldRush matches: ${goldRushDapps.length} dapps`);
    console.log(`   Storing only GoldRush matches to save localStorage space`);

    // Store only GoldRush matches in localStorage
    try {
      const jsonString = JSON.stringify(detailedDapps);
      const sizeInMB = (new Blob([jsonString]).size / 1024 / 1024).toFixed(2);
      console.log(`\n💾 Attempting to store ${detailedDapps.length} GoldRush dapps (${sizeInMB} MB)...`);
      
      localStorage.setItem(STORAGE_KEY, jsonString);
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, new Date().toISOString());
      
      // Verify it was stored
      const verify = localStorage.getItem(STORAGE_KEY);
      if (verify) {
        const parsed = JSON.parse(verify);
        console.log(`\n✅ Successfully stored ${parsed.length} GoldRush dapps in localStorage`);
        console.log(`   Key: ${STORAGE_KEY}`);
        console.log(`   Size: ${sizeInMB} MB`);
        console.log(`   Timestamp: ${new Date().toISOString()}`);
      } else {
        console.error('❌ Storage failed: Data was not saved to localStorage');
      }
    } catch (err) {
      console.error('❌ Failed to store in localStorage:', err);
      // localStorage might be full, try to clear old data
      if (err.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded. Clearing old cache and trying smaller subset...');
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
        // Try storing a smaller subset
        const subset = detailedDapps.slice(0, Math.floor(detailedDapps.length * 0.8));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(subset));
          localStorage.setItem(STORAGE_TIMESTAMP_KEY, new Date().toISOString());
          console.log(`✅ Stored ${subset.length} dapps (reduced due to storage limits)`);
        } catch (subsetErr) {
          console.error('❌ Even subset failed to store:', subsetErr);
          // Try even smaller
          const smaller = detailedDapps.slice(0, 500);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(smaller));
            localStorage.setItem(STORAGE_TIMESTAMP_KEY, new Date().toISOString());
            console.log(`✅ Stored ${smaller.length} dapps (minimal set)`);
          } catch (smallErr) {
            console.error('❌ Failed to store even minimal set:', smallErr);
          }
        }
      }
    }

    return detailedDapps;
  } catch (err) {
    console.error('Error fetching dapps:', err);
    return [];
  }
}

/**
 * Gets dapps from localStorage
 * @returns {Array|null} Array of dapps or null if not found
 */
export function getAlchemyDappsFromStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem('alchemy_dapps_cache');
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (err) {
    console.error('Error reading from localStorage:', err);
    return null;
  }
}

/**
 * Gets the timestamp of when dapps were last cached
 * @returns {string|null} ISO timestamp or null
 */
export function getAlchemyDappsCacheTimestamp() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem('alchemy_dapps_cache_timestamp');
  } catch (err) {
    return null;
  }
}

/**
 * Clears the cached dapps from localStorage
 */
export function clearAlchemyDappsCache() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('alchemy_dapps_cache');
  localStorage.removeItem('alchemy_dapps_cache_timestamp');
  console.log('✅ Cleared Alchemy dapps cache from localStorage');
}

