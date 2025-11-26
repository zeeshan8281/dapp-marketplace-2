// pages/dapps/index.js
import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import { datoFetch } from '../../lib/datocms';
import DappCard from '../../components/DappCard';
import { useTheme } from '../../contexts/ThemeContext';

const QUERY = `
  query ListDapps($first: IntType, $skip: IntType) {
    allDapps(first: $first, skip: $skip, orderBy: _updatedAt_DESC) {
      id
      title
      # slug  # Uncomment once GraphQL schema refreshes (usually 2-3 minutes)
      shortDescription
      screenshots {
        url(imgixParams: { w: 200, h: 200, fit: crop })
      }
      tvlUsd
      tokenPriceUsd
      tokenLogoUrl
      lastSyncedAt
      protocolId
      categoryDefillama
      alchemyRecentActivity
      # unifiedMetadata  # Uncomment once GraphQL schema refreshes (usually 2-3 minutes)
      # Note: chains, categories, and tags are stored in alchemyRecentActivity JSON, not as relationships
    }
    _allDappsMeta {
      count
    }
    # Note: Categories are extracted from alchemyRecentActivity, not from separate models
    # Chains can be queried from the Chain model (if available)
    # allChains(first: 100, orderBy: name_ASC) {
    #   id
    #   name
    # }
  }
`;

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

export default function DappsPage({ dapps = [], totalCount = 0, categories = [], chains = [], tags = [], error }) {
  const router = useRouter();
  const { theme, mounted: themeMounted } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCombinedCategory, setSelectedCombinedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [mounted, setMounted] = useState(false);
  const itemsPerPage = 20;

  // Initialize page from URL query
  useEffect(() => {
    if (router.query.page) {
      const page = parseInt(router.query.page, 10);
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page);
      }
    }
    setMounted(true);
  }, [router.query.page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    // Update URL without page param when filters change
    if (router.query.page) {
      router.replace('/dapps', undefined, { shallow: true });
    }
  }, [searchQuery, selectedCombinedCategory]);

  // Update URL when page changes
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    router.push(`/dapps?page=${newPage}`, undefined, { shallow: true });
  };

  // Ensure theme is available (fallback to 'dark' if not mounted yet)
  const safeTheme = theme || 'dark';
  const colors = getThemeColors(safeTheme);

  // Safety check: ensure dapps is always an array
  const safeDapps = Array.isArray(dapps) ? dapps : [];
  
  // Early return with error display if critical error (but still render something)
  if (error && safeDapps.length === 0 && totalCount === 0) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        padding: 40, 
        textAlign: 'center', 
        color: colors.text,
        background: colors.bg 
      }}>
        <h1 style={{ color: colors.text }}>Error Loading Dapps</h1>
        <p style={{ color: colors.textSecondary }}>{error}</p>
      </div>
    );
  }

  // Extract combined categories from both DeFiLlama and Alchemy (human-readable names only, eliminate duplicates)
  const combinedCategories = useMemo(() => {
    const cats = new Set();
    
    // Helper to check if a string looks like an ID (starts with "rec" and is alphanumeric)
    const isId = (str) => {
      if (typeof str !== 'string') return false;
      return /^rec[a-zA-Z0-9]+$/.test(str);
    };
    
    safeDapps.forEach(dapp => {
      // Add DeFiLlama category (already human-readable)
      if (dapp.categoryDefillama && !isId(dapp.categoryDefillama)) {
        cats.add(dapp.categoryDefillama);
      }
      
      // Extract Alchemy categories from alchemy_recent_activity
      if (dapp.alchemyRecentActivity) {
        try {
          const alchemyData = typeof dapp.alchemyRecentActivity === 'string'
            ? JSON.parse(dapp.alchemyRecentActivity)
            : dapp.alchemyRecentActivity;
          
          if (alchemyData?.categories && Array.isArray(alchemyData.categories)) {
            alchemyData.categories.forEach(cat => {
              // Extract human-readable name from category object
              if (typeof cat === 'string') {
                // Only add if it's not an ID (Set automatically eliminates duplicates)
                if (!isId(cat)) {
                  cats.add(cat);
                }
              } else if (cat && typeof cat === 'object') {
                // Extract the name field from the category object (skip if it's an ID)
                const catName = cat.name;
                if (catName && typeof catName === 'string' && !isId(catName)) {
                  cats.add(catName);
                }
              }
            });
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });
    
    // Set automatically eliminates duplicates, return sorted array
    return Array.from(cats).sort();
  }, [safeDapps]);

  const filteredDapps = useMemo(() => {
    if (!safeDapps || safeDapps.length === 0) return [];
    
    return safeDapps.filter(dapp => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = dapp.title?.toLowerCase().includes(query);
        const matchesDesc = dapp.shortDescription?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // Combined category filter (DeFiLlama + Alchemy) - human-readable names only
      if (selectedCombinedCategory) {
        let matches = false;
        
        // Helper to check if a string looks like an ID
        const isId = (str) => {
          if (typeof str !== 'string') return false;
          return /^rec[a-zA-Z0-9]+$/.test(str);
        };
        
        // Check DeFiLlama category (skip if it's an ID)
        if (dapp.categoryDefillama && !isId(dapp.categoryDefillama) && dapp.categoryDefillama === selectedCombinedCategory) {
          matches = true;
        }
        
        // Check Alchemy categories (extract names from objects, skip IDs)
        if (!matches) {
          try {
            const alchemyData = typeof dapp.alchemyRecentActivity === 'string'
              ? JSON.parse(dapp.alchemyRecentActivity)
              : dapp.alchemyRecentActivity;
            
            if (alchemyData?.categories && Array.isArray(alchemyData.categories)) {
              matches = alchemyData.categories.some(cat => {
                if (typeof cat === 'string') {
                  // Skip IDs, only match actual names
                  return !isId(cat) && cat === selectedCombinedCategory;
                } else if (cat && typeof cat === 'object') {
                  // Match by name field (human-readable, skip if name is an ID)
                  const catName = cat.name;
                  return catName && !isId(catName) && catName === selectedCombinedCategory;
                }
                return false;
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        if (!matches) return false;
      }

      return true;
    });
  }, [safeDapps, selectedCombinedCategory, searchQuery]);

  // Paginate filtered results
  const totalPages = Math.ceil(filteredDapps.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDapps = filteredDapps.slice(startIndex, endIndex);

  return (
    <>
      <Head>
        <title>DApps Terminal | Browse Protocols</title>
        <style>{`
          @font-face {
            font-family: 'Aspekta';
            src: url('https://cdn.jsdelivr.net/gh/uncut-wtf/aspekta@main/fonts/Aspekta-Regular.woff2') format('woff2'),
                 url('https://cdn.jsdelivr.net/gh/uncut-wtf/aspekta@main/fonts/Aspekta-Regular.woff') format('woff');
            font-weight: 400;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Aspekta';
            src: url('https://cdn.jsdelivr.net/gh/uncut-wtf/aspekta@main/fonts/Aspekta-Medium.woff2') format('woff2'),
                 url('https://cdn.jsdelivr.net/gh/uncut-wtf/aspekta@main/fonts/Aspekta-Medium.woff') format('woff');
            font-weight: 500;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Aspekta';
            src: url('https://cdn.jsdelivr.net/gh/uncut-wtf/aspekta@main/fonts/Aspekta-SemiBold.woff2') format('woff2'),
                 url('https://cdn.jsdelivr.net/gh/uncut-wtf/aspekta@main/fonts/Aspekta-SemiBold.woff') format('woff');
            font-weight: 600;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Aspekta';
            src: url('https://cdn.jsdelivr.net/gh/uncut-wtf/aspekta@main/fonts/Aspekta-Bold.woff2') format('woff2'),
                 url('https://cdn.jsdelivr.net/gh/uncut-wtf/aspekta@main/fonts/Aspekta-Bold.woff') format('woff');
            font-weight: 700;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Aspekta';
            src: url('https://cdn.jsdelivr.net/gh/uncut-wtf/aspekta@main/fonts/Aspekta-ExtraBold.woff2') format('woff2'),
                 url('https://cdn.jsdelivr.net/gh/uncut-wtf/aspekta@main/fonts/Aspekta-ExtraBold.woff') format('woff');
            font-weight: 800;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Aspekta';
            src: url('https://cdn.jsdelivr.net/gh/uncut-wtf/aspekta@main/fonts/Aspekta-Black.woff2') format('woff2'),
                 url('https://cdn.jsdelivr.net/gh/uncut-wtf/aspekta@main/fonts/Aspekta-Black.woff') format('woff');
            font-weight: 900;
            font-style: normal;
            font-display: swap;
          }
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes glow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
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
      </Head>
      <main style={{
        minHeight: '100vh',
        background: colors.bg,
        backgroundImage: `
          linear-gradient(${colors.grid} 1px, transparent 1px),
          linear-gradient(90deg, ${colors.grid} 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        color: colors.text,
        fontFamily: '"Aspekta", -apple-system, sans-serif',
        padding: '32px 20px 60px',
        transition: 'background 0.3s ease, color 0.3s ease'
      }}>
        {/* Animated gradient background */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: colors.gradient,
          backgroundSize: '400% 400%',
          animation: 'gradientShift 20s ease infinite',
          opacity: theme === 'dark' ? 0.6 : 0.3,
          zIndex: 0,
          pointerEvents: 'none',
          transition: 'opacity 0.3s ease'
        }} />

        <div style={{ maxWidth: 1600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <header style={{
            marginBottom: 48,
            textAlign: 'center',
            padding: '40px 0',
            background: colors.headerGradient,
            borderRadius: 20,
            border: `1px solid ${colors.border}`,
            boxShadow: `0 8px 32px ${colors.shadow}, 0 0 40px ${colors.border}80`,
            transition: 'all 0.3s ease'
          }}>
            <h1 
              key={theme}
              style={{
                fontSize: 48,
                fontWeight: 900,
                fontFamily: '"Aspekta", sans-serif',
                background: colors.titleGradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
                margin: 0,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                transition: 'background 0.3s ease',
                willChange: 'background'
              }}
            >
              dApp Marketplace
            </h1>
            <p style={{
              color: colors.textTertiary,
              fontSize: 16,
              margin: 0,
              fontFamily: '"Aspekta", sans-serif'
            }}>
              {totalCount || 0} PROTOCOLS
            </p>
          </header>

          {/* Filters */}
          <div style={{
            marginBottom: 32,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            padding: 24,
            background: theme === 'dark' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)',
            backdropFilter: 'blur(20px)',
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            transition: 'all 0.3s ease'
          }}>
            {/* Search */}
            <input
              type="text"
              placeholder="SEARCH PROTOCOLS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: '1 1 300px',
                padding: '12px 16px',
                background: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                color: colors.text,
                fontSize: 14,
                fontFamily: '"Aspekta", sans-serif',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = colors.accent;
                e.target.style.boxShadow = `0 0 20px ${colors.border}80`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.border;
                e.target.style.boxShadow = 'none';
              }}
            />

            {/* Combined Category Filter (DeFiLlama + Alchemy) */}
            <select
              value={selectedCombinedCategory}
              onChange={(e) => setSelectedCombinedCategory(e.target.value)}
              style={{
                padding: '12px 16px',
                background: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                color: colors.text,
                fontSize: 14,
                fontFamily: '"Aspekta", sans-serif',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.3s'
              }}
            >
              <option value="">ALL CATEGORIES</option>
              {combinedCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Results count and pagination info */}
          <div style={{
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div style={{
              color: colors.textTertiary,
              fontSize: 14,
              fontFamily: '"Aspekta", sans-serif'
            }}>
              {filteredDapps.length} {filteredDapps.length === 1 ? 'PROTOCOL' : 'PROTOCOLS'} FOUND
              {totalPages > 1 && ` • PAGE ${currentPage} OF ${totalPages}`}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center'
              }}>
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 16px',
                    background: currentPage === 1 
                      ? (theme === 'dark' ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241, 245, 249, 0.6)')
                      : (theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)'),
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    color: currentPage === 1 ? colors.textTertiary : colors.text,
                    fontSize: 14,
                    fontFamily: '"Aspekta", sans-serif',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    outline: 'none',
                    transition: 'all 0.3s',
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== 1) {
                      e.currentTarget.style.borderColor = colors.accent;
                      e.currentTarget.style.boxShadow = `0 0 10px ${colors.border}40`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== 1) {
                      e.currentTarget.style.borderColor = colors.border;
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  ← PREV
                </button>
                
                {/* Page numbers */}
                <div style={{
                  display: 'flex',
                  gap: 4,
                  alignItems: 'center'
                }}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        style={{
                          minWidth: 40,
                          height: 40,
                          padding: '8px 12px',
                          background: currentPage === pageNum
                            ? colors.accent
                            : (theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)'),
                          border: `1px solid ${currentPage === pageNum ? colors.accent : colors.border}`,
                          borderRadius: 8,
                          color: currentPage === pageNum 
                            ? (theme === 'dark' ? '#0a0e27' : '#ffffff')
                            : colors.text,
                          fontSize: 14,
                          fontWeight: currentPage === pageNum ? 700 : 400,
                          fontFamily: '"Aspekta", sans-serif',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'all 0.3s',
                          boxShadow: currentPage === pageNum 
                            ? `0 0 20px ${colors.accent}60`
                            : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage !== pageNum) {
                            e.currentTarget.style.borderColor = colors.accent;
                            e.currentTarget.style.boxShadow = `0 0 10px ${colors.border}40`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentPage !== pageNum) {
                            e.currentTarget.style.borderColor = colors.border;
                            e.currentTarget.style.boxShadow = 'none';
                          }
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 16px',
                    background: currentPage === totalPages
                      ? (theme === 'dark' ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241, 245, 249, 0.6)')
                      : (theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)'),
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    color: currentPage === totalPages ? colors.textTertiary : colors.text,
                    fontSize: 14,
                    fontFamily: '"Aspekta", sans-serif',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    outline: 'none',
                    transition: 'all 0.3s',
                    opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== totalPages) {
                      e.currentTarget.style.borderColor = colors.accent;
                      e.currentTarget.style.boxShadow = `0 0 10px ${colors.border}40`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== totalPages) {
                      e.currentTarget.style.borderColor = colors.border;
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  NEXT →
                </button>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              padding: 24,
              marginBottom: 32,
              background: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              color: theme === 'dark' ? '#fca5a5' : '#dc2626'
            }}>
              <strong>⚠️ Error:</strong> {error}
            </div>
          )}

          {/* Dapps Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))',
            gap: 24
          }}>
            {paginatedDapps.map((dapp, idx) => {
              // Prioritize logo sources
              let logoUrl = null;
              
              if (dapp.screenshots && dapp.screenshots.length > 0 && dapp.screenshots[0].url) {
                logoUrl = dapp.screenshots[0].url;
              } else if (dapp.tokenLogoUrl) {
                logoUrl = dapp.tokenLogoUrl;
              } else if (dapp.alchemyRecentActivity) {
                try {
                  const alchemyData = typeof dapp.alchemyRecentActivity === 'string' 
                    ? JSON.parse(dapp.alchemyRecentActivity) 
                    : dapp.alchemyRecentActivity;
                  if (alchemyData?.logoUrl) {
                    logoUrl = alchemyData.logoUrl;
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
              
              if (!logoUrl && dapp.protocolId) {
                logoUrl = `https://icons.llama.fi/${dapp.protocolId}.png`;
              }
              
              const mappedDapp = {
                ...dapp,
                short_description: dapp.shortDescription,
                logo: logoUrl ? { url: logoUrl } : null,
                chains: (() => {
                  // Extract chains from alchemyRecentActivity
                  // Filter out Alchemy record IDs (strings starting with "rec") and only keep actual chain names
                  try {
                    const alchemyData = dapp.alchemyRecentActivity 
                      ? (typeof dapp.alchemyRecentActivity === 'string' 
                          ? JSON.parse(dapp.alchemyRecentActivity) 
                          : dapp.alchemyRecentActivity)
                      : null;
                    if (alchemyData?.chains && Array.isArray(alchemyData.chains)) {
                      return alchemyData.chains
                        .map(chain => {
                          const chainName = typeof chain === 'string' ? chain : (chain?.name || chain);
                          // Skip Alchemy record IDs (they start with "rec" and are long)
                          if (typeof chainName === 'string' && chainName.startsWith('rec') && chainName.length > 10) {
                            return null;
                          }
                          return {
                            id: `chain-${chainName}`,
                            name: chainName
                          };
                        })
                        .filter(Boolean);
                    }
                  } catch (e) {}
                  return [];
                })(),
                categories: (() => {
                  // Extract categories from alchemyRecentActivity
                  try {
                    const alchemyData = dapp.alchemyRecentActivity 
                      ? (typeof dapp.alchemyRecentActivity === 'string' 
                          ? JSON.parse(dapp.alchemyRecentActivity) 
                          : dapp.alchemyRecentActivity)
                      : null;
                    if (alchemyData?.categories && Array.isArray(alchemyData.categories)) {
                      return alchemyData.categories.map(cat => ({
                        id: `cat-${cat}`,
                        name: typeof cat === 'string' ? cat : cat.name || cat
                      }));
                    }
                  } catch (e) {}
                  return [];
                })(),
                tags: [], // Tags not available in current schema
                tvl_usd: dapp.tvlUsd || null,
                token_price_usd: dapp.tokenPriceUsd || null,
                token_price_change_24h: null,
                last_synced_at: dapp.lastSyncedAt,
                categoryDefillama: dapp.categoryDefillama,
                protocolId: dapp.protocolId,
                token_logo_url: dapp.tokenLogoUrl,
                alchemy_recent_activity: dapp.alchemyRecentActivity,
              };
              return (
                <div
                  key={dapp.id}
                  style={{
                    animation: mounted ? `slideIn 0.5s ease-out ${idx * 0.05}s both` : 'none'
                  }}
                >
                  <DappCard dapp={mappedDapp} theme={theme} />
                </div>
              );
            })}
          </div>

          {/* Pagination Controls (Bottom) */}
          {totalPages > 1 && (
            <div style={{
              marginTop: 48,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  background: currentPage === 1 
                    ? (theme === 'dark' ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241, 245, 249, 0.6)')
                    : (theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)'),
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  color: currentPage === 1 ? colors.textTertiary : colors.text,
                  fontSize: 14,
                  fontFamily: '"Aspekta", sans-serif',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  outline: 'none',
                  transition: 'all 0.3s',
                  opacity: currentPage === 1 ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.borderColor = colors.accent;
                    e.currentTarget.style.boxShadow = `0 0 10px ${colors.border}40`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                ← PREV
              </button>
              
              {/* Page numbers */}
              <div style={{
                display: 'flex',
                gap: 4,
                alignItems: 'center'
              }}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      style={{
                        minWidth: 40,
                        height: 40,
                        padding: '8px 12px',
                        background: currentPage === pageNum
                          ? colors.accent
                          : (theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)'),
                        border: `1px solid ${currentPage === pageNum ? colors.accent : colors.border}`,
                        borderRadius: 8,
                        color: currentPage === pageNum 
                          ? (theme === 'dark' ? '#0a0e27' : '#ffffff')
                          : colors.text,
                        fontSize: 14,
                        fontWeight: currentPage === pageNum ? 700 : 400,
                        fontFamily: '"Aspekta", sans-serif',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'all 0.3s',
                        boxShadow: currentPage === pageNum 
                          ? `0 0 20px ${colors.accent}60`
                          : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== pageNum) {
                          e.currentTarget.style.borderColor = colors.accent;
                          e.currentTarget.style.boxShadow = `0 0 10px ${colors.border}40`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== pageNum) {
                          e.currentTarget.style.borderColor = colors.border;
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  background: currentPage === totalPages
                    ? (theme === 'dark' ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241, 245, 249, 0.6)')
                    : (theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)'),
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  color: currentPage === totalPages ? colors.textTertiary : colors.text,
                  fontSize: 14,
                  fontFamily: '"Aspekta", sans-serif',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  outline: 'none',
                  transition: 'all 0.3s',
                  opacity: currentPage === totalPages ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== totalPages) {
                    e.currentTarget.style.borderColor = colors.accent;
                    e.currentTarget.style.boxShadow = `0 0 10px ${colors.border}40`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== totalPages) {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                NEXT →
              </button>
            </div>
          )}

          {filteredDapps.length === 0 && !error && (
            <div style={{
              textAlign: 'center',
              padding: 60,
              color: colors.textTertiary,
              fontSize: 18
            }}>
              NO PROTOCOLS FOUND
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export async function getServerSideProps() {
  try {
    // Fetch all dapps using pagination (max 500 per request)
    const allDapps = [];
    let skip = 0;
    const pageSize = 500;
    let hasMore = true;

    while (hasMore) {
      const data = await datoFetch(QUERY, { first: pageSize, skip });
      const dapps = data.allDapps || [];
      allDapps.push(...dapps);
      
      if (dapps.length < pageSize) {
        hasMore = false;
      } else {
        skip += pageSize;
      }
    }

    // Fetch metadata and other data
    const firstPage = await datoFetch(QUERY, { first: 1, skip: 0 });
    
    // Deduplicate dapps by ID (in case API returns duplicates)
    const uniqueDapps = [];
    const seenIds = new Set();
    for (const dapp of allDapps) {
      if (!seenIds.has(dapp.id)) {
        seenIds.add(dapp.id);
        uniqueDapps.push(dapp);
      }
    }
    
    // Also deduplicate by title (case-insensitive) - keep the first one
    const titleMap = new Map();
    const finalDapps = [];
    for (const dapp of uniqueDapps) {
      const titleKey = (dapp.title || '').toLowerCase().trim();
      if (titleKey && titleMap.has(titleKey)) {
        // Skip duplicate title - already have one
        continue;
      }
      if (titleKey) {
        titleMap.set(titleKey, true);
      }
      finalDapps.push(dapp);
    }
    
    // Prioritize ordering:
    // 1. Chain dapps (specific chain names) - all chains from goldrush-docs
    // 2. Dapps with TVL (tvlUsd > 0), sorted by TVL desc
    // 3. Remaining dapps
    
    // Only foundational chains + Solana (all other frontier chains removed)
    const chainDappNames = [
      'StarkNet', 'Ethereum', // Foundational chains (Polygon zkEVM removed, OP Mainnet merged into Optimism)
      'Base', // Foundational
      'Solana', // Only Solana from frontier chains
      // All other frontier chains removed:
      // 'Arbitrum', 'HyperCore', 'Sei', 'Plasma', 'Monad', 'Sonic', 'Berachain', 'HyperEVM', 'Viction',
      // 'Taiko', 'Avalanche C-Chain', 'Mantle', 'Linea', 'Arbitrum Nova',
      // 'Oasis Sapphire', 'zkSync Era', 'World Chain', 'Axie/Ronin', 'ApeChain', 'Scroll', 'Unichain', 'Ink', 'Lens',
      'Optimism', // OP Mainnet merged into Optimism
      'Polygon', 'Gnosis', 'BNB Smart Chain (BSC)', 'Bitcoin'
    ];
    const chainDapps = [];
    const nonChainDapps = [];
    
    finalDapps.forEach(dapp => {
      if (chainDappNames.includes(dapp.title)) {
        chainDapps.push(dapp);
      } else {
        nonChainDapps.push(dapp);
      }
    });
    
    // Sort chain dapps by the order in chainDappNames
    chainDapps.sort((a, b) => {
      const indexA = chainDappNames.indexOf(a.title);
      const indexB = chainDappNames.indexOf(b.title);
      return indexA - indexB;
    });
    
    // Split non-chain dapps into those with TVL and the rest
    const tvlDapps = [];
    const otherDapps = [];
    nonChainDapps.forEach(dapp => {
      const tvl = typeof dapp.tvlUsd === 'number' ? dapp.tvlUsd : null;
      if (tvl && tvl > 0) {
        tvlDapps.push(dapp);
      } else {
        otherDapps.push(dapp);
      }
    });
    
    // Sort TVL dapps by TVL descending (highest TVL first)
    tvlDapps.sort((a, b) => (b.tvlUsd || 0) - (a.tvlUsd || 0));
    
    // Combine: chains first, then TVL dapps, then everything else
    const prioritizedDapps = [...chainDapps, ...tvlDapps, ...otherDapps];
    
    return {
      props: {
        dapps: prioritizedDapps,
        totalCount: firstPage._allDappsMeta?.count || prioritizedDapps.length,
        categories: [], // Categories extracted from alchemyRecentActivity
        chains: [], // Chains will be available once GraphQL schema refreshes
        tags: [] // Tags not available in current schema
      }
    };
  } catch (err) {
    console.error('DatoCMS Error:', err);
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? err.message 
      : null;
    return {
      props: {
        dapps: [],
        totalCount: 0,
        categories: [], // Categories extracted from alchemyRecentActivity
        chains: [], // Chains extracted from alchemyRecentActivity
        tags: [], // Tags not available in current schema
        error: errorMessage
      }
    };
  }
}

