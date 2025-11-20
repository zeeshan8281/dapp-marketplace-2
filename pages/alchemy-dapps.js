// pages/alchemy-dapps.js
// Display cached Alchemy dapps from localStorage
import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getAlchemyDappsFromStorage } from '../lib/fetch-alchemy-dapps';
import DappCard from '../components/DappCard';
import { useTheme } from '../contexts/ThemeContext';

// Theme colors helper
function getThemeColors(theme) {
  if (theme === 'light') {
    return {
      bg: '#ffffff',
      bgSecondary: '#f8fafc',
      bgTertiary: '#f1f5f9',
      text: '#0f172a',
      textSecondary: '#475569',
      textTertiary: '#64748b',
      accent: '#3b82f6',
      accentSecondary: '#2563eb',
      border: 'rgba(59, 130, 246, 0.2)',
      borderHover: 'rgba(59, 130, 246, 0.4)',
      shadow: 'rgba(0, 0, 0, 0.1)',
      grid: 'rgba(59, 130, 246, 0.05)',
      gradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%, #ffffff 100%)',
      headerGradient: 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
      titleGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    };
  } else {
    return {
      bg: '#0a0e27',
      bgSecondary: '#1a1f3a',
      bgTertiary: '#0f172a',
      text: '#e2e8f0',
      textSecondary: '#cbd5e1',
      textTertiary: '#94a3b8',
      accent: '#00f5ff',
      accentSecondary: '#00ff88',
      border: 'rgba(0, 245, 255, 0.3)',
      borderHover: 'rgba(0, 245, 255, 0.5)',
      shadow: 'rgba(0, 0, 0, 0.4)',
      grid: 'rgba(0, 245, 255, 0.03)',
      gradient: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 25%, #0f172a 50%, #1a1f3a 75%, #0a0e27 100%)',
      headerGradient: 'linear-gradient(180deg, rgba(0, 245, 255, 0.1) 0%, rgba(0, 245, 255, 0.05) 100%)',
      titleGradient: 'linear-gradient(135deg, #00f5ff 0%, #00ff88 100%)',
    };
  }
}

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
  
  // Check _detail if available
  if (alchemyDapp._detail) {
    if (alchemyDapp._detail.vipChildCategory && Array.isArray(alchemyDapp._detail.vipChildCategory)) {
      for (const cat of alchemyDapp._detail.vipChildCategory) {
        const catName = typeof cat === 'string' ? cat : (cat?.name || '');
        if (checkCategory(catName)) {
          return true;
        }
      }
    }
    if (alchemyDapp._detail.vipParentCategory && Array.isArray(alchemyDapp._detail.vipParentCategory)) {
      for (const cat of alchemyDapp._detail.vipParentCategory) {
        const catName = typeof cat === 'string' ? cat : (cat?.name || '');
        if (checkCategory(catName)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// Transform Alchemy dapp data to match DappCard format
function transformAlchemyDapp(alchemyDapp, index) {
  // Extract chain names - handle multiple formats
  const chains = [];
  const extractChainName = (chain) => {
    if (typeof chain === 'string') return chain;
    if (chain && typeof chain === 'object') {
      return chain.name || chain.title || chain.label || chain.id || null;
    }
    return null;
  };
  
  // Check main chains array
  if (alchemyDapp.chains && Array.isArray(alchemyDapp.chains)) {
    alchemyDapp.chains.forEach(chain => {
      const chainName = extractChainName(chain);
      if (chainName) {
        chains.push({ id: `chain-${index}-${chainName}`, name: chainName });
      }
    });
  }
  
  // Also check _detail.chains if available
  if (alchemyDapp._detail && alchemyDapp._detail.chains && Array.isArray(alchemyDapp._detail.chains)) {
    alchemyDapp._detail.chains.forEach(chain => {
      const chainName = extractChainName(chain);
      if (chainName) {
        const exists = chains.some(c => c.name === chainName);
        if (!exists) {
          chains.push({ id: `chain-${index}-${chainName}`, name: chainName });
        }
      }
    });
  }

  // Extract categories
  const categories = [];
  if (alchemyDapp.vipChildCategory && Array.isArray(alchemyDapp.vipChildCategory)) {
    alchemyDapp.vipChildCategory.forEach(cat => {
      if (typeof cat === 'string') {
        categories.push({ id: `cat-${index}-${cat}`, name: cat });
      } else if (cat && typeof cat === 'object' && cat.name) {
        categories.push({ id: `cat-${index}-${cat.name}`, name: cat.name });
      }
    });
  }

  // STEP 1: Check if dapp is in Layer 1 or Layer 2 Blockchains category
  const isLayer1OrLayer2 = isLayer1OrLayer2Blockchain(alchemyDapp);
  
  // STEP 2: If in Layer 1/2 category, check if the DAPP ITSELF is a GoldRush chain
  // (These are the chains themselves, not dapps on chains)
  let isGoldRush = false;
  if (isLayer1OrLayer2) {
    // Get dapp name (these ARE the chains themselves, not dapps on chains)
    const dappName = alchemyDapp.name || '';
    const dappSlug = alchemyDapp.slug || '';
    
    // Normalize for matching
    const normalizedDappName = normalizeChainName(dappName);
    const normalizedDappSlug = normalizeChainName(dappSlug);
    
    // Check if dapp name/slug matches a GoldRush chain (exact match only)
    if (normalizedDappName && isGoldRushChain(normalizedDappName)) {
      isGoldRush = true;
    } else if (normalizedDappSlug && isGoldRushChain(normalizedDappSlug)) {
      isGoldRush = true;
    }
    
    // For Layer 1/2 blockchains, we ONLY want the chains themselves, not dapps on chains
    // So we DON'T check if it's "on" a GoldRush chain - we only check if the dapp IS a GoldRush chain
  }

  // Add "goldrush" as a category if it passes both checks
  if (isGoldRush) {
    const hasGoldRushCategory = categories.some(cat => cat.name.toLowerCase() === 'goldrush');
    if (!hasGoldRushCategory) {
      categories.push({ id: `cat-${index}-goldrush`, name: 'goldrush' });
    }
  }

  // Build tags - add "goldrush" tag if it passes both checks
  const tags = [];
  if (isGoldRush) {
    tags.push({ id: `tag-${index}-goldrush`, tag: 'goldrush' });
  }

  // Build alchemy_recent_activity structure
  // Include "goldrush" in categories if applicable
  const categoryNames = categories.map(c => c.name);
  if (isGoldRush && !categoryNames.includes('goldrush')) {
    categoryNames.push('goldrush');
  }
  
  const alchemyData = {
    name: alchemyDapp.name,
    slug: alchemyDapp.slug,
    description: alchemyDapp.shortDescription || alchemyDapp.description || alchemyDapp.longDescription || '',
    longDescription: alchemyDapp.longDescription || alchemyDapp.description || alchemyDapp.shortDescription || '',
    logoUrl: alchemyDapp.logoCdnUrl || alchemyDapp.logoUrl,
    chains: chains.map(c => c.name),
    categories: categoryNames,
    websiteUrl: alchemyDapp.website || alchemyDapp.websiteUrl,
    twitterUrl: alchemyDapp.twitter || alchemyDapp.twitterUrl,
    discordUrl: alchemyDapp.discordUrl,
    githubUrl: alchemyDapp.githubUrl,
    documentationUrl: alchemyDapp.documentationUrl,
    eyebrowText: alchemyDapp.eyebrowText
  };

  return {
    id: `alchemy-${alchemyDapp.slug || alchemyDapp.name || index}`,
    title: alchemyDapp.name || 'Unnamed DApp',
    shortDescription: alchemyDapp.shortDescription || alchemyDapp.description || alchemyDapp.longDescription || '',
    short_description: alchemyDapp.shortDescription || alchemyDapp.description || alchemyDapp.longDescription || '',
    screenshots: alchemyDapp.logoCdnUrl || alchemyDapp.logoUrl ? [{
      url: alchemyDapp.logoCdnUrl || alchemyDapp.logoUrl
    }] : null,
    tvlUsd: null,
    tvl_usd: null,
    tokenPriceUsd: null,
    token_price_usd: null,
    tokenLogoUrl: null,
    token_logo_url: null,
    lastSyncedAt: null,
    last_synced_at: null,
    protocolId: null,
    categoryDefillama: categories.length > 0 ? categories[0].name : null,
    alchemyRecentActivity: JSON.stringify(alchemyData),
    alchemy_recent_activity: JSON.stringify(alchemyData),
    chains: chains,
    categories: categories,
    tags: tags,
    logo: alchemyDapp.logoCdnUrl || alchemyDapp.logoUrl ? {
      url: alchemyDapp.logoCdnUrl || alchemyDapp.logoUrl
    } : null
  };
}

export default function AlchemyDappsPage() {
  const router = useRouter();
  const { theme, mounted: themeMounted } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [alchemyDapps, setAlchemyDapps] = useState([]);
  const itemsPerPage = 20;

  // Load dapps from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = getAlchemyDappsFromStorage();
        if (cached && Array.isArray(cached)) {
          console.log(`[Alchemy DApps] Loaded ${cached.length} dapps from localStorage`);
          setAlchemyDapps(cached);
        } else {
          console.warn('[Alchemy DApps] No dapps found in localStorage. Key: alchemy_dapps_cache');
          // Check if the key exists but is empty or invalid
          const raw = localStorage.getItem('alchemy_dapps_cache');
          if (raw) {
            console.warn('[Alchemy DApps] Raw data exists but failed to parse:', raw.substring(0, 100));
          }
        }
      } catch (err) {
        console.error('[Alchemy DApps] Error loading from localStorage:', err);
      }
      setMounted(true);
    }
  }, []);

  // Initialize page from URL query
  useEffect(() => {
    if (router.query.page) {
      const page = parseInt(router.query.page, 10);
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page);
      }
    }
  }, [router.query.page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    if (router.query.page) {
      router.replace('/alchemy-dapps', undefined, { shallow: true });
    }
  }, [searchQuery, selectedCategory]);

  // Update URL when page changes
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    router.push(`/alchemy-dapps?page=${newPage}`, undefined, { shallow: true });
  };

  // Ensure theme is available
  const safeTheme = theme || 'dark';
  const colors = getThemeColors(safeTheme);

  // Transform Alchemy dapps to DappCard format
  const transformedDapps = useMemo(() => {
    const transformed = alchemyDapps.map((dapp, index) => transformAlchemyDapp(dapp, index));
    
    // Debug: Log goldrush dapps
    if (typeof window !== 'undefined' && transformed.length > 0) {
      const goldrushDapps = transformed.filter(d => {
        const hasGoldRushCategory = d.categories?.some(cat => {
          const catName = typeof cat === 'string' ? cat : (cat?.name || cat?.tag);
          return catName && catName.toLowerCase() === 'goldrush';
        });
        const hasGoldRushTag = d.tags?.some(tag => {
          const tagName = typeof tag === 'string' ? tag : (tag?.tag || tag?.name);
          return tagName && tagName.toLowerCase() === 'goldrush';
        });
        return hasGoldRushCategory || hasGoldRushTag;
      });
      console.log(`[Alchemy DApps] Total: ${transformed.length}, GoldRush: ${goldrushDapps.length}`);
      if (goldrushDapps.length > 0) {
        console.log(`[GoldRush DApps] First 5:`, goldrushDapps.slice(0, 5).map(d => ({
          name: d.title,
          categories: d.categories?.map(c => typeof c === 'string' ? c : c.name),
          tags: d.tags?.map(t => typeof t === 'string' ? t : t.tag)
        })));
      }
    }
    
    return transformed;
  }, [alchemyDapps]);

  // Extract unique categories (including "goldrush")
  const categories = useMemo(() => {
    const cats = new Set();
    transformedDapps.forEach(dapp => {
      if (dapp.categories && Array.isArray(dapp.categories)) {
        dapp.categories.forEach(cat => {
          if (cat && cat.name) {
            cats.add(cat.name);
          }
        });
      }
      // Also check alchemy_recent_activity
      if (dapp.alchemy_recent_activity) {
        try {
          const alchemyData = JSON.parse(dapp.alchemy_recent_activity);
          if (alchemyData.categories && Array.isArray(alchemyData.categories)) {
            alchemyData.categories.forEach(cat => {
              if (typeof cat === 'string') {
                cats.add(cat);
              }
            });
          }
        } catch (e) {
          // Ignore
        }
      }
    });
    // Sort with "goldrush" first if it exists
    const sorted = Array.from(cats).sort();
    if (sorted.includes('goldrush')) {
      return ['goldrush', ...sorted.filter(c => c !== 'goldrush')];
    }
    return sorted;
  }, [transformedDapps]);

  // Filter dapps
  const filteredDapps = useMemo(() => {
    const filtered = transformedDapps.filter(dapp => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = dapp.title?.toLowerCase().includes(query);
        const matchesDescription = dapp.shortDescription?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory) {
        let matches = false;
        
        // Special handling for "goldrush"
        if (selectedCategory.toLowerCase() === 'goldrush') {
          // Check categories array first (most reliable)
          if (dapp.categories && Array.isArray(dapp.categories)) {
            matches = dapp.categories.some(cat => {
              if (!cat) return false;
              const catName = typeof cat === 'string' ? cat : (cat.name || cat.tag);
              return catName && catName.toLowerCase() === 'goldrush';
            });
          }
          
          // Check tags
          if (!matches && dapp.tags && Array.isArray(dapp.tags)) {
            matches = dapp.tags.some(tag => {
              if (!tag) return false;
              const tagName = typeof tag === 'string' ? tag : (tag.tag || tag.name);
              return tagName && tagName.toLowerCase() === 'goldrush';
            });
          }
          
          // Check alchemy_recent_activity
          if (!matches && dapp.alchemy_recent_activity) {
            try {
              const alchemyData = typeof dapp.alchemy_recent_activity === 'string'
                ? JSON.parse(dapp.alchemy_recent_activity)
                : dapp.alchemy_recent_activity;
              if (alchemyData && alchemyData.categories && Array.isArray(alchemyData.categories)) {
                matches = alchemyData.categories.some(cat => {
                  if (typeof cat === 'string') {
                    return cat.toLowerCase() === 'goldrush';
                  }
                  return false;
                });
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        } else {
          // Regular category filtering
          // Check categories array
          if (dapp.categories && Array.isArray(dapp.categories)) {
            matches = dapp.categories.some(cat => {
              if (!cat) return false;
              const catName = typeof cat === 'string' ? cat : (cat.name || cat.tag);
              return catName && catName.toLowerCase() === selectedCategory.toLowerCase();
            });
          }
          
          // Check alchemy_recent_activity
          if (!matches && dapp.alchemy_recent_activity) {
            try {
              const alchemyData = typeof dapp.alchemy_recent_activity === 'string'
                ? JSON.parse(dapp.alchemy_recent_activity)
                : dapp.alchemy_recent_activity;
              if (alchemyData && alchemyData.categories && Array.isArray(alchemyData.categories)) {
                matches = alchemyData.categories.some(cat => {
                  if (typeof cat === 'string') {
                    return cat.toLowerCase() === selectedCategory.toLowerCase();
                  }
                  return false;
                });
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
        
        if (!matches) return false;
      }

      return true;
    });
    
    // Debug filter results
    if (typeof window !== 'undefined' && selectedCategory) {
      console.log(`[Filter] selectedCategory: "${selectedCategory}", filtered: ${filtered.length} of ${transformedDapps.length}`);
      if (selectedCategory.toLowerCase() === 'goldrush') {
        // Check if any filtered dapps don't actually have goldrush
        const incorrectlyIncluded = filtered.filter(d => {
          const hasGoldRushCategory = d.categories?.some(c => {
            const n = typeof c === 'string' ? c : c.name;
            return n && n.toLowerCase() === 'goldrush';
          });
          const hasGoldRushTag = d.tags?.some(t => {
            const n = typeof t === 'string' ? t : t.tag;
            return n && n.toLowerCase() === 'goldrush';
          });
          const hasInAlchemy = (() => {
            try {
              const alchemyData = typeof d.alchemy_recent_activity === 'string'
                ? JSON.parse(d.alchemy_recent_activity)
                : d.alchemy_recent_activity;
              return alchemyData?.categories?.some(c => 
                typeof c === 'string' && c.toLowerCase() === 'goldrush'
              );
            } catch (e) {
              return false;
            }
          })();
          return !hasGoldRushCategory && !hasGoldRushTag && !hasInAlchemy;
        });
        
        if (incorrectlyIncluded.length > 0) {
          console.warn(`[Filter] ⚠️ ${incorrectlyIncluded.length} dapps incorrectly included in goldrush filter:`, 
            incorrectlyIncluded.slice(0, 5).map(d => d.title));
        } else {
          console.log(`[Filter] ✅ All ${filtered.length} filtered dapps have goldrush category/tag`);
        }
      }
    }
    
    return filtered;
  }, [transformedDapps, selectedCategory, searchQuery]);

  // Paginate filtered results
  const totalPages = Math.ceil(filteredDapps.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDapps = filteredDapps.slice(startIndex, endIndex);

  if (!mounted || !themeMounted) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Alchemy DApps | Browse Cached DApps</title>
        <meta name="description" content="Browse dapps cached from Alchemy DApp Store" />
      </Head>
      <main style={{
        minHeight: '100vh',
        background: colors.bg,
        color: colors.text,
        transition: 'background 0.3s ease, color 0.3s ease'
      }}>
        {/* Header */}
        <header style={{
          background: colors.headerGradient,
          borderBottom: `1px solid ${colors.border}`,
          padding: '32px 0',
          marginBottom: '48px',
          backdropFilter: 'blur(10px)',
          boxShadow: `0 4px 30px ${colors.shadow}`,
          transition: 'background 0.3s ease, border-color 0.3s ease'
        }}>
          <div style={{
            maxWidth: 1600,
            margin: '0 auto',
            padding: '0 32px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16
            }}>
              <div>
                <h1 style={{
                  fontSize: 48,
                  fontWeight: 800,
                  margin: 0,
                  background: colors.titleGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontFamily: '"Aspekta", sans-serif',
                  letterSpacing: '-1px',
                  marginBottom: 8
                }}>
                  Alchemy DApps
                </h1>
                <p style={{
                  fontSize: 16,
                  color: colors.textSecondary,
                  margin: 0,
                  fontFamily: '"Aspekta", sans-serif'
                }}>
                  {alchemyDapps.length} dapps cached from Alchemy DApp Store
                </p>
              </div>
              <a
                href="/fetch-dapps"
                style={{
                  padding: '12px 24px',
                  background: colors.accent,
                  color: '#000',
                  textDecoration: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: '"Aspekta", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s',
                  display: 'inline-block'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${colors.accent}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Fetch More
              </a>
            </div>
          </div>
        </header>

        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 32px' }}>
          {/* Filters */}
          <div style={{
            marginBottom: 32,
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* Search */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                type="text"
                placeholder="Search dapps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  color: colors.text,
                  fontSize: 16,
                  fontFamily: '"Aspekta", sans-serif',
                  transition: 'all 0.3s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accent}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Category Filter */}
            <div style={{ minWidth: 200 }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  color: colors.text,
                  fontSize: 16,
                  fontFamily: '"Aspekta", sans-serif',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='${encodeURIComponent(colors.text)}' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 16px center',
                  paddingRight: '40px'
                }}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div style={{
            marginBottom: 24,
            color: colors.textSecondary,
            fontSize: 14,
            fontFamily: '"Aspekta", sans-serif'
          }}>
            Showing {filteredDapps.length} of {alchemyDapps.length} dapps
            {searchQuery && ` matching "${searchQuery}"`}
            {selectedCategory && ` in "${selectedCategory}"`}
          </div>

          {/* Dapps Grid */}
          {paginatedDapps.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
              gap: 24,
              marginBottom: 48
            }}>
              {paginatedDapps.map((dapp, idx) => (
                <div
                  key={dapp.id}
                  style={{
                    animation: mounted ? `slideIn 0.5s ease-out ${idx * 0.05}s both` : 'none'
                  }}
                >
                  <DappCard dapp={dapp} theme={theme} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: 80,
              textAlign: 'center',
              color: colors.textTertiary,
              fontFamily: '"Aspekta", sans-serif'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                No dapps found
              </div>
              <div style={{ fontSize: 14 }}>
                {alchemyDapps.length === 0
                  ? 'No dapps cached yet. Go to /fetch-dapps to fetch some!'
                  : 'Try adjusting your search or filters'}
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              marginBottom: 48,
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '10px 20px',
                  background: currentPage === 1 ? colors.bgTertiary : colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  color: currentPage === 1 ? colors.textTertiary : colors.text,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontFamily: '"Aspekta", sans-serif',
                  transition: 'all 0.3s',
                  opacity: currentPage === 1 ? 0.5 : 1
                }}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 2 && page <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      style={{
                        padding: '10px 16px',
                        background: page === currentPage ? colors.accent : colors.bgSecondary,
                        border: `1px solid ${page === currentPage ? colors.accent : colors.border}`,
                        borderRadius: 8,
                        color: page === currentPage ? '#000' : colors.text,
                        fontSize: 14,
                        fontWeight: page === currentPage ? 700 : 600,
                        cursor: 'pointer',
                        fontFamily: '"Aspekta", sans-serif',
                        transition: 'all 0.3s',
                        minWidth: 44
                      }}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  page === currentPage - 3 ||
                  page === currentPage + 3
                ) {
                  return (
                    <span key={page} style={{ color: colors.textTertiary, padding: '0 4px' }}>
                      ...
                    </span>
                  );
                }
                return null;
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '10px 20px',
                  background: currentPage === totalPages ? colors.bgTertiary : colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  color: currentPage === totalPages ? colors.textTertiary : colors.text,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontFamily: '"Aspekta", sans-serif',
                  transition: 'all 0.3s',
                  opacity: currentPage === totalPages ? 0.5 : 1
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

