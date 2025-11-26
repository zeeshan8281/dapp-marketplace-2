// pages/dapps/[slug].js
import Head from 'next/head';
import { datoFetch } from '../../lib/datocms';
import { useTheme } from '../../contexts/ThemeContext';

// Query to fetch dapp by ID
const QUERY = `
  query DappById($id: ItemId!) {
    dapp(filter: { id: { eq: $id } }) {
      id
      title
      shortDescription
      screenshots {
        url(imgixParams: { w: 800, h: 600, fit: crop })
      }
      tvlUsd
      tokenPriceUsd
      tokenLogoUrl
      lastSyncedAt
      protocolId
      categoryDefillama
      defillamaUrl
      alchemyRecentActivity
      # unifiedMetadata  # Field doesn't exist in schema yet
      goldrushSection
      # Note: chains, categories, and tags are stored in alchemyRecentActivity JSON, not as relationships
    }
  }
`;

function DataSourceBadge({ source, color }) {
  const colors = {
    defillama: { bg: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.4)' },
    alchemy: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.4)' }
  };
  const style = colors[source] || { bg: 'rgba(107, 114, 128, 0.2)', text: '#9ca3af', border: 'rgba(107, 114, 128, 0.4)' };
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      backgroundColor: style.bg,
      color: style.text,
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '1px',
      fontFamily: '"Aspekta", sans-serif',
      border: `1px solid ${style.border}`,
      boxShadow: `0 0 10px ${style.border}20`
    }}>
      {source === 'defillama' && '📊'}
      {source === 'alchemy' && '⚡'}
      {source}
    </span>
  );
}

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

function getAccentColor(title, theme) {
  if (theme === 'light') {
    const colors = [
      { primary: '#3b82f6', secondary: '#2563eb' },
      { primary: '#2563eb', secondary: '#1d4ed8' },
      { primary: '#ff6b35', secondary: '#ff8c42' },
      { primary: '#9d4edd', secondary: '#7c3aed' },
      { primary: '#ffbe0b', secondary: '#f59e0b' },
      { primary: '#06ffa5', secondary: '#10b981' },
    ];
    const index = (title?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  } else {
    const colors = [
      { primary: '#00f5ff', secondary: '#00d9ff' },
      { primary: '#00ff88', secondary: '#39ff14' },
      { primary: '#ff6b35', secondary: '#ff8c42' },
      { primary: '#9d4edd', secondary: '#c77dff' },
      { primary: '#ffbe0b', secondary: '#ffd60a' },
      { primary: '#06ffa5', secondary: '#00f5ff' },
    ];
    const index = (title?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  }
}

export default function DappDetail({ dapp, error }) {
  const { theme, mounted: themeMounted } = useTheme();
  const colors = getThemeColors(theme);
  
  // Generate default accent color (used in error page)
  const defaultAccent = getAccentColor('default', theme);
  
  // Wait for theme to mount to avoid hydration mismatch
  if (!themeMounted) {
    return null;
  }
  
  if (error || !dapp) {
    return (
      <>
        <Head>
          <title>DApp Not Found | dApp Marketplace</title>
        </Head>
        <main style={{ 
          minHeight: '100vh', 
          background: colors.bg, 
          color: colors.text, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          transition: 'background 0.3s ease, color 0.3s ease',
          padding: 32
        }}>
          <div style={{ textAlign: 'center', maxWidth: 600 }}>
            <h1 style={{ fontSize: 64, fontFamily: '"Aspekta", sans-serif', color: '#ef4444', marginBottom: 16 }}>404</h1>
            <h2 style={{ fontSize: 24, fontFamily: '"Aspekta", sans-serif', color: defaultAccent.primary, marginBottom: 8 }}>DApp Not Found</h2>
            <p style={{ fontSize: 16, color: colors.textTertiary, marginBottom: 32 }}>
              {error || 'The dapp you\'re looking for doesn\'t exist or may have been removed.'}
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a 
                href="/dapps" 
                style={{ 
                  color: defaultAccent.primary, 
                  textDecoration: 'none', 
                  padding: '12px 24px',
                  border: `2px solid ${defaultAccent.primary}40`,
                  borderRadius: 8,
                  fontFamily: '"Aspekta", sans-serif',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  transition: 'all 0.3s',
                  display: 'inline-block'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${defaultAccent.primary}20`;
                  e.currentTarget.style.borderColor = defaultAccent.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = `${defaultAccent.primary}40`;
                }}
              >
                ← Browse All DApps
              </a>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Parse unified metadata
  let unified = null;
  if (dapp.unifiedMetadata) {
    try {
      unified = typeof dapp.unifiedMetadata === 'string' 
        ? JSON.parse(dapp.unifiedMetadata) 
        : dapp.unifiedMetadata;
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Parse Alchemy data (fallback)
  let alchemyData = null;
  if (dapp.alchemyRecentActivity) {
    try {
      alchemyData = typeof dapp.alchemyRecentActivity === 'string' 
        ? JSON.parse(dapp.alchemyRecentActivity) 
        : dapp.alchemyRecentActivity;
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Get data from unified metadata with fallbacks
  const displayName = unified?.name || dapp.title || 'Unknown DApp';
  const accent = getAccentColor(displayName, theme);

  // GoldRush supported chains list (with all common variations)
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
    // Common variations/aliases (must include these for matching)
    'op mainnet', 'arbitrum', 'starknet', 'polygon zk evm', 'polygon zk-evm',
    'zk sync era', 'zksync', 'bsc', 'binance smart chain', 'bnb', 'matic',
    'avalanche', 'avax', 'avalanche cchain', 'avalanche c chain',
    // Additional common names from Alchemy
    'bnb chain', 'op mainnet', 'polygon zkevm', 'polygon zk evm', 'polygon zk-evm',
    'zk sync', 'zksync era', 'zk sync era'
  ];

  // Normalize chain name for matching (case-insensitive, handles common variations)
  const normalizeChainName = (name) => {
    if (!name || typeof name !== 'string') return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars for matching
      .replace(/\s+(mainnet|testnet|network|chain)$/i, '') // Remove common suffixes
      .trim();
  };

  // Check if chain name matches a GoldRush chain (with fuzzy matching)
  const isGoldRushChain = (chainName) => {
    if (!chainName || typeof chainName !== 'string') return false;
    const normalized = normalizeChainName(chainName);
    
    // Remove common suffixes/prefixes for better matching
    const cleaned = normalized
      .replace(/\s+(mainnet|testnet|network|chain)$/i, '')
      .replace(/^(the\s+)/i, '')
      .trim();
    
    // Exact match
    for (const goldRushChain of GOLDRUSH_CHAINS) {
      const goldRushNormalized = normalizeChainName(goldRushChain);
      const goldRushCleaned = goldRushNormalized
        .replace(/\s+(mainnet|testnet|network|chain)$/i, '')
        .replace(/^(the\s+)/i, '')
        .trim();
      
      if (normalized === goldRushNormalized || cleaned === goldRushCleaned) {
        return true;
      }
    }
    
    // Fuzzy match - check if normalized chain name contains or is contained by any GoldRush chain
    // This handles cases like "Solana Mainnet" matching "solana", "Polygon zkEVM" matching "polygon zkevm"
    for (const goldRushChain of GOLDRUSH_CHAINS) {
      const goldRushNormalized = normalizeChainName(goldRushChain);
      const goldRushCleaned = goldRushNormalized
        .replace(/\s+(mainnet|testnet|network|chain)$/i, '')
        .replace(/^(the\s+)/i, '')
        .trim();
      
      // Check if either the full name or cleaned name matches
      if (normalized.includes(goldRushNormalized) || goldRushNormalized.includes(normalized) ||
          cleaned.includes(goldRushCleaned) || goldRushCleaned.includes(cleaned)) {
        return true;
      }
    }
    
    return false;
  };

  // Get chains from unified, alchemyRecentActivity, or fallback
  // Filter out Alchemy record IDs (strings starting with "rec") and only keep actual chain names
  const chains = unified?.chains || (() => {
    try {
      const alchemyData = dapp.alchemyRecentActivity 
        ? (typeof dapp.alchemyRecentActivity === 'string' 
            ? JSON.parse(dapp.alchemyRecentActivity) 
            : dapp.alchemyRecentActivity)
        : null;
      if (alchemyData?.chains && Array.isArray(alchemyData.chains)) {
        return alchemyData.chains
          .map(chain => {
            if (typeof chain === 'string') {
              // Skip Alchemy record IDs (they start with "rec")
              if (chain.startsWith('rec') && chain.length > 10) {
                return null;
              }
              return chain;
            }
            return chain?.name || chain;
          })
          .filter(Boolean)
          .filter(chain => !chain.startsWith('rec') || chain.length <= 10); // Filter out any remaining IDs
      }
    } catch (e) {}
    return [];
  })();

  // Check if dapp is on any GoldRush chain
  // Extract chains from alchemyRecentActivity, unified, or dapp title
  const dappChainNames = chains || [];
  const unifiedChainNames = unified?.chains || [];
  const allChainNames = [...new Set([...dappChainNames, ...unifiedChainNames])];
  
  // Also check if the dapp title itself matches a GoldRush chain (for chain dapps like "Polygon zkEVM")
  const dappTitle = dapp.title || '';
  const isDappTitleGoldRush = isGoldRushChain(dappTitle);
  
  const isOnGoldRushChain = isDappTitleGoldRush || allChainNames.some(chainName => isGoldRushChain(chainName));

  // Get logo URL with priority: screenshots > unified > token > alchemy > defillama
  // Normalize and validate URL (helper function)
  const normalizeLogoUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    url = url.trim();
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/') || url.startsWith('data:')) {
      return url;
    }
    return null;
  };

  // Get logo URL with fallback chain
  const getLogoUrl = () => {
    const urls = [];
    
    // Priority order
  if (dapp.screenshots && dapp.screenshots.length > 0 && dapp.screenshots[0].url) {
      const url = normalizeLogoUrl(dapp.screenshots[0].url);
      if (url) urls.push(url);
    }
    if (unified?.logoUrl) {
      const url = normalizeLogoUrl(unified.logoUrl);
      if (url) urls.push(url);
    }
    if (dapp.tokenLogoUrl) {
      const url = normalizeLogoUrl(dapp.tokenLogoUrl);
      if (url) urls.push(url);
    }
    if (alchemyData?.logoUrl) {
      const url = normalizeLogoUrl(alchemyData.logoUrl);
      if (url) urls.push(url);
    }
    if (alchemyData?.logoCdnUrl) {
      const url = normalizeLogoUrl(alchemyData.logoCdnUrl);
      if (url) urls.push(url);
    }
    if (dapp.protocolId) {
      urls.push(`https://icons.llama.fi/${dapp.protocolId}.png`);
    }
    
    return urls[0] || null;
  };

  const logoUrl = getLogoUrl();

  const hasDefiLlama = !!(unified?.isDefiProtocol || dapp.protocolId);
  const hasAlchemy = !!(unified?.dataQuality?.hasAlchemyData || alchemyData);

  // Get the best available description
  const getDescription = () => {
    if (unified?.description) return unified.description;
    if (alchemyData?.longDescription) return alchemyData.longDescription;
    if (alchemyData?.description && alchemyData.description.length > 100) return alchemyData.description;
    if (dapp.shortDescription && dapp.shortDescription.length > 100) return dapp.shortDescription;
    return alchemyData?.description || dapp.shortDescription || 'No description available.';
  };

  const description = getDescription();

  // Get TVL from unified or fallback
  const tvl = unified?.tvlUsd || dapp.tvlUsd;
  
  // Get category from unified or fallback
  const category = unified?.category || dapp.categoryDefillama;
  
  // Get categories array from unified, alchemyRecentActivity, or fallback
  const categories = unified?.categories || (() => {
    try {
      const alchemyData = dapp.alchemyRecentActivity 
        ? (typeof dapp.alchemyRecentActivity === 'string' 
            ? JSON.parse(dapp.alchemyRecentActivity) 
            : dapp.alchemyRecentActivity)
        : null;
      if (alchemyData?.categories && Array.isArray(alchemyData.categories)) {
        return alchemyData.categories.map(cat => typeof cat === 'string' ? cat : cat.name || cat);
      }
    } catch (e) {}
    return [];
  })();
  
  // Normalize and validate URLs
  const normalizeUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    url = url.trim();
    if (!url) return null;
    // Ensure it's a valid URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return null;
    }
    return url;
  };

  // Get links from unified with fallbacks, ensuring they're not mixed up
  // Try all possible sources: unified > alchemyData > dapp fields
  let websiteUrl = unified?.websiteUrl || 
                   alchemyData?.websiteUrl || 
                   alchemyData?.website ||
                   null;
  let twitterUrl = unified?.twitterUrl || 
                   alchemyData?.twitterUrl || 
                   (alchemyData?.twitter && alchemyData.twitter.startsWith('http') ? alchemyData.twitter : null) ||
                   null;
  const twitterHandle = unified?.twitterHandle || 
                        (alchemyData?.twitter && !alchemyData.twitter.startsWith('http') ? alchemyData.twitter : null);
  
  // Normalize URLs
  websiteUrl = normalizeUrl(websiteUrl);
  twitterUrl = normalizeUrl(twitterUrl);
  
  // Ensure websiteUrl is not a Twitter URL
  if (websiteUrl && (websiteUrl.includes('twitter.com') || websiteUrl.includes('x.com'))) {
    // If websiteUrl is actually Twitter, move it to twitterUrl
    if (!twitterUrl) {
      twitterUrl = websiteUrl;
    }
    websiteUrl = null;
  }
  
  // Ensure twitterUrl is actually Twitter
  if (twitterUrl && !twitterUrl.includes('twitter.com') && !twitterUrl.includes('x.com')) {
    // If twitterUrl is not Twitter, it might be the website
    if (!websiteUrl) {
      websiteUrl = twitterUrl;
    }
    twitterUrl = null;
  }
  
  // Get other links from all possible sources
  const githubUrl = normalizeUrl(unified?.githubUrl || alchemyData?.githubUrl || null);
  const discordUrl = normalizeUrl(unified?.discordUrl || alchemyData?.discordUrl || null);
  const documentationUrl = normalizeUrl(unified?.documentationUrl || alchemyData?.documentationUrl || null);
  const defillamaUrl = normalizeUrl(unified?.defillamaUrl || dapp.defillamaUrl || null);
  const alchemyUrl = normalizeUrl(unified?.alchemyUrl || 
                                   (alchemyData?.slug ? `https://dapp-store.alchemy.com/dapps/${alchemyData.slug}` : null) ||
                                   null);
  
  // Get TVL trends
  const tvlChange1d = unified?.tvlChange1d;
  const tvlChange7d = unified?.tvlChange7d;
  const tvlChange1m = unified?.tvlChange1m;
  
  // Get token metrics
  const marketCap = unified?.marketCap;
  const tokenPrice = unified?.tokenPrice || dapp.tokenPriceUsd;
  const tokenSymbol = unified?.tokenSymbol;
  const fdv = unified?.fdv;
  
  // Get related dapps
  const relatedDapps = unified?.relatedDapps || [];
  
  // Split into paragraphs if there are line breaks
  const descriptionParagraphs = description.split('\n\n').filter(p => p.trim().length > 0);

  return (
    <>
      <Head>
        <title>{dapp.title} | DApps Terminal</title>
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
        paddingBottom: '60px',
        position: 'relative',
        overflow: 'hidden',
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

        {/* Header */}
        <header style={{ 
          position: 'relative',
          zIndex: 1,
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
            padding: '0 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2
          }}>
            <a 
              href="/dapps" 
              style={{ 
                color: accent.primary, 
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 700,
                fontFamily: '"Aspekta", sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                padding: '10px 20px',
                backgroundColor: `${accent.primary}10`,
                borderRadius: 8,
                border: `1px solid ${accent.primary}30`,
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${accent.primary}20`;
                e.currentTarget.style.boxShadow = `0 0 20px ${accent.primary}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${accent.primary}10`;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {'<'} EXIT
            </a>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* Data source badges removed */}
            </div>
          </div>
        </header>

        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 32px', position: 'relative', zIndex: 1 }}>
          {/* Hero Section */}
          <section style={{
            marginBottom: 48,
            position: 'relative',
            overflow: 'hidden',
            padding: 40,
            background: theme === 'dark' 
              ? `linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)`
              : `linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(255, 255, 255, 1) 100%)`,
            backdropFilter: 'blur(20px)',
            borderRadius: 24,
            border: `2px solid ${accent.primary}30`,
            boxShadow: `0 8px 32px ${colors.shadow}, 0 0 60px ${accent.primary}20`,
            transition: 'all 0.3s ease'
          }}>
            {/* Decorative gradient overlay */}
            <div style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 300,
              height: 300,
              background: `radial-gradient(circle, ${accent.primary}15 0%, transparent 70%)`,
              borderRadius: '50%',
              filter: 'blur(40px)',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 200,
              height: 200,
              background: `radial-gradient(circle, ${accent.secondary}10 0%, transparent 70%)`,
              borderRadius: '50%',
              filter: 'blur(30px)',
              pointerEvents: 'none'
            }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 32, alignItems: 'flex-start' }}>
            <div 
              style={{ 
                width: 120,
                height: 120,
                borderRadius: '50%',
                backgroundColor: 'transparent',
                padding: 0,
                border: `2px solid ${accent.primary}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 6px 20px ${accent.primary}25`
              }}
            >
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={dapp.title}
                style={{
                    width: dapp.title === 'Base' ? '60%' : '100%',
                    height: dapp.title === 'Base' ? '60%' : '100%',
                    objectFit: dapp.title === 'Base' ? 'contain' : 'cover',
                    borderRadius: '50%',
                  display: 'block',
                }}
                onError={(e) => {
                    // Hide broken image and show fallback initial
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
                loading="lazy"
                crossOrigin="anonymous"
              />
            ) : null}
              {/* Fallback logo (initial) */}
            <div 
              style={{ 
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.secondary} 100%)`,
                display: logoUrl ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0a0e27',
                fontSize: 48,
                fontWeight: 900,
                  fontFamily: '"Aspekta", sans-serif'
              }}
            >
              {displayName?.charAt(0)?.toUpperCase() || '?'}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: 48,
                fontWeight: 900,
                fontFamily: '"Aspekta", sans-serif',
                color: accent.primary,
                margin: 0,
                marginBottom: 16,
                textTransform: 'uppercase',
                letterSpacing: '2px'
              }}>
                {displayName}
              </h1>
              {category && (
                <div style={{ marginBottom: 16 }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    backgroundColor: `${accent.primary}20`,
                    color: accent.primary,
                    border: `1px solid ${accent.primary}40`,
                    fontFamily: '"Aspekta", sans-serif'
                  }}>
                    {category}
                  </span>
                </div>
              )}
              {/* Status Badges */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {unified?.featured && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    backgroundColor: `${accent.secondary}20`,
                    color: accent.secondary,
                    border: `1px solid ${accent.secondary}40`,
                    fontFamily: '"Aspekta", sans-serif'
                  }}>
                    ⭐ Featured
                  </span>
                )}
                {unified?.verified && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    backgroundColor: `${accent.primary}20`,
                    color: accent.primary,
                    border: `1px solid ${accent.primary}40`,
                    fontFamily: '"Aspekta", sans-serif'
                  }}>
                    ✓ Verified
                  </span>
                )}
                {unified?.isDefiProtocol && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    color: '#a78bfa',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    fontFamily: '"Aspekta", sans-serif'
                  }}>
                    📊 DeFi Protocol
                  </span>
                )}
                {chains && chains.length > 0 && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    backgroundColor: `${colors.textTertiary}20`,
                    color: colors.textSecondary,
                    border: `1px solid ${colors.textTertiary}40`,
                    fontFamily: '"Aspekta", sans-serif'
                  }}>
                    🔗 {chains.length} Chain{chains.length !== 1 ? 's' : ''}
                  </span>
                )}
                    </div>

              {/* Metrics Grid removed - TVL moved to Details section */}
              </div>
            </div>
          </section>

          {/* About Section */}
          <section style={{
            marginBottom: 48,
            padding: 40,
            background: theme === 'dark' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)',
            backdropFilter: 'blur(20px)',
            borderRadius: 20,
            border: `1px solid ${colors.border}`,
            transition: 'background 0.3s ease, border-color 0.3s ease'
          }}>
            <h2 style={{
              fontSize: 24,
              fontWeight: 700,
              fontFamily: '"Aspekta", sans-serif',
              color: accent.primary,
              marginBottom: 24,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              📖 ABOUT
            </h2>
            
            {/* Multi-paragraph description */}
            <div style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: colors.textSecondary,
              marginBottom: 24
            }}>
              {descriptionParagraphs.length > 0 ? (
                descriptionParagraphs.map((paragraph, idx) => (
                  <p key={idx} style={{
                    marginBottom: idx < descriptionParagraphs.length - 1 ? 20 : 0,
                    marginTop: 0
                  }}>
                    {paragraph.trim()}
                  </p>
                ))
              ) : (
                <p style={{ margin: 0 }}>{description}</p>
              )}
            </div>

            {/* Key Features / Highlights - Hidden for Layer 1, Layer 2 Blockchains, and Foundational Chain */}
            {category !== 'Layer 1 Blockchains' && category !== 'Layer 2 Blockchains' && category !== 'Foundational Chain' && 
             (chains?.length > 0 || categories?.length > 0 || unified?.featured || unified?.verified) && (
              <div style={{
                marginTop: 32,
                padding: 24,
                background: theme === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.5)',
                borderRadius: 12,
                border: `1px solid ${colors.border}`
              }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: colors.textTertiary,
                  marginBottom: 16,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontFamily: '"Aspekta", sans-serif'
                }}>
                  KEY HIGHLIGHTS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {unified?.featured && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: `${accent.secondary}20`,
                      border: `1px solid ${accent.secondary}40`
                    }}>
                      <span>⭐</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: accent.secondary }}>Featured Project</span>
                    </div>
                  )}
                  {unified?.verified && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: `${accent.primary}20`,
                      border: `1px solid ${accent.primary}40`
                    }}>
                      <span>✓</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: accent.primary }}>Verified</span>
                    </div>
                  )}
                  {unified?.isDefiProtocol && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.4)'
                    }}>
                      <span>📊</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa' }}>DeFi Protocol</span>
                    </div>
                  )}
                  {chains && chains.length > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: `${colors.textTertiary}15`,
                      border: `1px solid ${colors.textTertiary}30`
                    }}>
                      <span>🔗</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary }}>
                        {chains.length} Chain{chains.length !== 1 ? 's' : ''} Supported
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Data source info removed */}
          </section>

          {/* Links & Resources Section */}
          {(websiteUrl || twitterUrl || githubUrl || discordUrl || documentationUrl) && (
            <section style={{
              marginBottom: 48,
              padding: 40,
              background: theme === 'dark' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)',
              backdropFilter: 'blur(20px)',
              borderRadius: 20,
              border: `1px solid ${colors.border}`,
              transition: 'background 0.3s ease, border-color 0.3s ease'
            }}>
              <h2 style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: '"Aspekta", sans-serif',
                color: accent.primary,
                marginBottom: 24,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                🔗 LINKS & RESOURCES
              </h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 16 
              }}>
                {websiteUrl && (
                  <a 
                    href={websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      padding: '16px 20px',
                      background: `${accent.primary}15`,
                      color: accent.primary,
                      borderRadius: 12,
                      textDecoration: 'none',
                      fontFamily: '"Aspekta", sans-serif',
                      fontSize: 14,
                      fontWeight: 600,
                      border: `1px solid ${accent.primary}30`,
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      boxShadow: `0 2px 8px ${accent.primary}10`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${accent.primary}25`;
                      e.currentTarget.style.boxShadow = `0 4px 16px ${accent.primary}30`;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `${accent.primary}15`;
                      e.currentTarget.style.boxShadow = `0 2px 8px ${accent.primary}10`;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span style={{ fontSize: 20 }}>🌐</span>
                    <span style={{ flex: 1 }}>Website</span>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>→</span>
                  </a>
                )}
                {twitterUrl && (
                  <a 
                    href={twitterUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      padding: '16px 20px',
                      background: 'rgba(29, 161, 242, 0.15)',
                      color: '#1DA1F2',
                      borderRadius: 12,
                      textDecoration: 'none',
                      fontFamily: '"Aspekta", sans-serif',
                      fontSize: 14,
                      fontWeight: 600,
                      border: '1px solid rgba(29, 161, 242, 0.3)',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      boxShadow: '0 2px 8px rgba(29, 161, 242, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(29, 161, 242, 0.25)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(29, 161, 242, 0.3)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(29, 161, 242, 0.15)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(29, 161, 242, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span style={{ fontSize: 20 }}>🐦</span>
                    <span style={{ flex: 1 }}>{twitterHandle || 'Twitter'}</span>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>→</span>
                  </a>
                )}
                {githubUrl && (
                  <a 
                    href={githubUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      padding: '16px 20px',
                      background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                      color: colors.text,
                      borderRadius: 12,
                      textDecoration: 'none',
                      fontFamily: '"Aspekta", sans-serif',
                      fontSize: 14,
                      fontWeight: 600,
                      border: `1px solid ${colors.border}`,
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      boxShadow: `0 2px 8px ${colors.shadow}`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.boxShadow = `0 4px 16px ${colors.shadow}`;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.boxShadow = `0 2px 8px ${colors.shadow}`;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span style={{ fontSize: 20 }}>💻</span>
                    <span style={{ flex: 1 }}>GitHub</span>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>→</span>
                  </a>
                )}
                {discordUrl && (
                  <a 
                    href={discordUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      padding: '16px 20px',
                      background: 'rgba(88, 101, 242, 0.15)',
                      color: '#5865F2',
                      borderRadius: 12,
                      textDecoration: 'none',
                      fontFamily: '"Aspekta", sans-serif',
                      fontSize: 14,
                      fontWeight: 600,
                      border: '1px solid rgba(88, 101, 242, 0.3)',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      boxShadow: '0 2px 8px rgba(88, 101, 242, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(88, 101, 242, 0.25)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(88, 101, 242, 0.3)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(88, 101, 242, 0.15)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(88, 101, 242, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span style={{ fontSize: 20 }}>💬</span>
                    <span style={{ flex: 1 }}>Discord</span>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>→</span>
                  </a>
                )}
                {documentationUrl && (
                  <a 
                    href={documentationUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      padding: '16px 20px',
                      background: `${accent.primary}15`,
                      color: accent.primary,
                      borderRadius: 12,
                      textDecoration: 'none',
                      fontFamily: '"Aspekta", sans-serif',
                      fontSize: 14,
                      fontWeight: 600,
                      border: `1px solid ${accent.primary}30`,
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      boxShadow: `0 2px 8px ${accent.primary}10`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${accent.primary}25`;
                      e.currentTarget.style.boxShadow = `0 4px 16px ${accent.primary}30`;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `${accent.primary}15`;
                      e.currentTarget.style.boxShadow = `0 2px 8px ${accent.primary}10`;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span style={{ fontSize: 20 }}>📚</span>
                    <span style={{ flex: 1 }}>Documentation</span>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>→</span>
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Details Section - Only show if there's content (chains, categories, TVL, or chain TVL) */}
          {((chains && chains.length > 0) || 
            (categories && categories.length > 0) || 
            (tvl && tvl > 0) ||
            (unified?.chainTvl && Object.keys(unified.chainTvl).length > 0)) && (
          <section style={{
            padding: 40,
            background: theme === 'dark' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)',
            backdropFilter: 'blur(20px)',
            borderRadius: 20,
            border: `1px solid ${colors.border}`,
            transition: 'background 0.3s ease, border-color 0.3s ease'
          }}>
            <h2 style={{
              fontSize: 24,
              fontWeight: 700,
              fontFamily: '"Aspekta", sans-serif',
              color: accent.primary,
              marginBottom: 24,
              textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
            }}>
                📋 DETAILS
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
              {/* TVL Section */}
              {tvl && tvl > 0 && (
                <div>
                  <div style={{ 
                    fontSize: 12,
                    color: colors.textTertiary, 
                    marginBottom: 12, 
                    textTransform: 'uppercase', 
                    fontFamily: '"Aspekta", sans-serif',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    💰 TOTAL VALUE LOCKED
                  </div>
                  <div style={{
                    padding: '16px 20px',
                    borderRadius: 10,
                    background: theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)',
                    border: `1px solid ${accent.primary}30`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}>
                    <div style={{ 
                      fontSize: 24, 
                      fontWeight: 800, 
                      color: accent.primary, 
                      fontFamily: '"Aspekta", sans-serif',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap'
                    }}>
                      <span>${tvl >= 1000000000 ? (tvl / 1000000000).toFixed(2) + 'B' : (tvl / 1000000).toFixed(2) + 'M'}</span>
                      {tvlChange1d !== null && tvlChange1d !== undefined && (
                        <span style={{
                          fontSize: 12,
                          color: tvlChange1d >= 0 ? accent.secondary : '#ef4444',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          {tvlChange1d >= 0 ? '↑' : '↓'} {Math.abs(tvlChange1d).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    {(tvlChange7d !== null || tvlChange1m !== null) && (
                      <div style={{
                        display: 'flex',
                        gap: 12,
                        fontSize: 10,
                        color: colors.textTertiary,
                        flexWrap: 'wrap'
                      }}>
                        {tvlChange7d !== null && tvlChange7d !== undefined && (
                          <span style={{ 
                            color: tvlChange7d >= 0 ? accent.secondary : '#ef4444',
                            fontWeight: 600
                          }}>
                            7d: {tvlChange7d >= 0 ? '+' : ''}{tvlChange7d.toFixed(1)}%
                          </span>
                        )}
                        {tvlChange1m !== null && tvlChange1m !== undefined && (
                          <span style={{ 
                            color: tvlChange1m >= 0 ? accent.secondary : '#ef4444',
                            fontWeight: 600
                          }}>
                            30d: {tvlChange1m >= 0 ? '+' : ''}{tvlChange1m.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
                {chains && chains.length > 0 && (
                <div>
                  <div style={{ 
                        fontSize: 12,
                    color: colors.textTertiary, 
                    marginBottom: 12, 
                    textTransform: 'uppercase', 
                    fontFamily: '"Aspekta", sans-serif',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    🔗 SUPPORTED CHAINS ({chains.length})
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                    gap: 10 
                  }}>
                    {chains.map((chain, idx) => (
                      <div key={idx} style={{
                        padding: '12px 16px',
                        borderRadius: 10,
                        background: theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)',
                        border: `1px solid ${accent.primary}30`,
                        fontSize: 13,
                        fontWeight: 600,
                        color: accent.primary,
                        fontFamily: '"Aspekta", sans-serif',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = accent.primary;
                        e.currentTarget.style.background = theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(248, 250, 252, 1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = `0 4px 12px ${accent.primary}20`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = `${accent.primary}30`;
                        e.currentTarget.style.background = theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      >
                        {chain}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {categories && categories.length > 0 && (
                <div>
                  <div style={{ 
                    fontSize: 12, 
                    color: colors.textTertiary, 
                    marginBottom: 12, 
                    textTransform: 'uppercase', 
                    fontFamily: '"Aspekta", sans-serif',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    🏷️ CATEGORIES ({categories.length})
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 10 
                  }}>
                    {categories.map((cat, idx) => (
                      <span key={idx} style={{
                        padding: '10px 16px',
                        borderRadius: 10,
                        background: `linear-gradient(135deg, ${accent.secondary}20 0%, ${accent.secondary}10 100%)`,
                        border: `1px solid ${accent.secondary}40`,
                        fontSize: 13,
                        fontWeight: 600,
                        color: accent.secondary,
                        fontFamily: '"Aspekta", sans-serif',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = accent.secondary;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = `0 4px 12px ${accent.secondary}30`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = `${accent.secondary}40`;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {unified?.chainTvl && Object.keys(unified.chainTvl).length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ 
                        fontSize: 12,
                    color: colors.textTertiary, 
                    marginBottom: 12, 
                    textTransform: 'uppercase', 
                    fontFamily: '"Aspekta", sans-serif',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}>
                    💰 CHAIN TVL BREAKDOWN
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: 10 
                  }}>
                    {Object.entries(unified.chainTvl)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([chain, tvl]) => (
                      <div key={chain} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderRadius: 10,
                        background: theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)',
                        border: `1px solid ${accent.primary}20`,
                        fontSize: 13,
                        fontFamily: '"Aspekta", sans-serif',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = accent.primary;
                        e.currentTarget.style.background = theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(248, 250, 252, 1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = `${accent.primary}20`;
                        e.currentTarget.style.background = theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)';
                      }}
                      >
                        <span style={{ 
                          color: colors.textSecondary, 
                          fontWeight: 600,
                          fontSize: 12
                        }}>
                          {chain}
                      </span>
                        <span style={{ 
                          color: accent.primary, 
                          fontWeight: 700,
                          fontSize: 13
                        }}>
                          ${tvl >= 1000000000 ? (tvl / 1000000000).toFixed(2) + 'B' : (tvl / 1000000).toFixed(2) + 'M'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
                  </div>
            </section>
          )}

          {/* Build on {Dapp name} using GoldRush Section - Editable from DatoCMS */}
          {(() => {
            // Parse GoldRush section data from DatoCMS field
            let goldRushSectionData = null;
            if (dapp.goldrushSection) {
              try {
                goldRushSectionData = typeof dapp.goldrushSection === 'string' 
                  ? JSON.parse(dapp.goldrushSection) 
                  : dapp.goldrushSection;
              } catch (e) {
                console.warn('Failed to parse goldrushSection:', e);
              }
            }

            // Determine if section should be shown
            // Priority: 1. DatoCMS field enabled flag, 2. Auto-detect from chains
            const shouldShow = goldRushSectionData?.enabled !== false && 
                              (goldRushSectionData?.enabled === true || isOnGoldRushChain);

            if (!shouldShow) return null;

            // Get title (from DatoCMS field or default to dapp name)
            const sectionTitle = goldRushSectionData?.title || 
                                `BUILD ON ${dapp.title?.toUpperCase() || 'THIS CHAIN'} USING GOLDRUSH`;

            // Get links (from DatoCMS field or default)
            const links = goldRushSectionData?.links || [
              { label: 'GoldRush Docs', url: 'https://goldrush.dev', icon: '🚀' }
            ];

            return (
              <section style={{
                marginBottom: 48,
                padding: 40,
                background: theme === 'dark' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)',
                backdropFilter: 'blur(20px)',
                borderRadius: 20,
                border: `1px solid ${colors.border}`,
                transition: 'background 0.3s ease, border-color 0.3s ease'
              }}>
                <h2 style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: '"Aspekta", sans-serif',
                  color: accent.primary,
                  marginBottom: 24,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  ⚡ {sectionTitle}
                </h2>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: 16 
                }}>
                  {links.map((link, idx) => (
                    <a 
                      key={idx}
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        padding: '16px 20px',
                        background: `${accent.secondary}15`,
                        color: accent.secondary,
                        borderRadius: 12,
                        textDecoration: 'none',
                        fontFamily: '"Aspekta", sans-serif',
                        fontSize: 14,
                        fontWeight: 600,
                        border: `1px solid ${accent.secondary}30`,
                        transition: 'all 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        boxShadow: `0 2px 8px ${accent.secondary}10`
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${accent.secondary}25`;
                        e.currentTarget.style.boxShadow = `0 4px 16px ${accent.secondary}30`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `${accent.secondary}15`;
                        e.currentTarget.style.boxShadow = `0 2px 8px ${accent.secondary}10`;
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{link.icon || '🔗'}</span>
                      <span style={{ flex: 1 }}>{link.label}</span>
                      <span style={{ fontSize: 12, opacity: 0.7 }}>→</span>
                    </a>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Related Dapps Section */}
          {relatedDapps && relatedDapps.length > 0 && (
            <section style={{
              marginBottom: 48,
              padding: 40,
              background: theme === 'dark' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)',
              backdropFilter: 'blur(20px)',
              borderRadius: 20,
              border: `1px solid ${colors.border}`,
              transition: 'background 0.3s ease, border-color 0.3s ease'
            }}>
              <h2 style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: '"Aspekta", sans-serif',
                color: accent.primary,
                marginBottom: 24,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                🔗 RELATED DAPPS
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 20
              }}>
                {relatedDapps.map((relatedDapp, idx) => (
                  <a
                    key={idx}
                    href={`/dapps/${relatedDapp.slug || (relatedDapp.name ? relatedDapp.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') : 'unknown')}`}
                    style={{
                      padding: 20,
                      background: theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                      borderRadius: 16,
                      border: `1px solid ${colors.border}`,
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'all 0.3s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      alignItems: 'center',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = accent.primary;
                      e.currentTarget.style.background = theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 1)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 8px 24px ${accent.primary}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = colors.border;
                      e.currentTarget.style.background = theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {relatedDapp.logoUrl && (
                      <img
                        src={relatedDapp.logoUrl}
                        alt={relatedDapp.name}
                        style={{
                          width: 60,
                          height: 60,
                          objectFit: 'contain',
                          borderRadius: 12,
                          backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(248, 250, 252, 0.9)',
                          padding: 8,
                          border: `1px solid ${accent.primary}30`
                        }}
                      />
                    )}
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: accent.primary,
                      fontFamily: '"Aspekta", sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {relatedDapp.name}
                    </div>
                    {relatedDapp.shortDescription && (
                      <div style={{
                        fontSize: 11,
                        color: colors.textTertiary,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {relatedDapp.shortDescription}
                </div>
              )}
                  </a>
                ))}
            </div>
          </section>
          )}
        </div>
      </main>
    </>
  );
}

// Helper to generate slug from title
export async function getServerSideProps({ params }) {
  try {
    // params.slug is actually the dapp ID from the URL
    const dappId = params.slug;
    
    if (!dappId) {
      return {
        props: {
          dapp: null,
          error: 'No dapp ID provided'
        }
      };
    }
    
    const data = await datoFetch(QUERY, { id: dappId });
    
    if (!data || !data.dapp) {
      console.error(`DApp not found for ID: ${dappId}`);
      return {
        props: {
          dapp: null,
          error: `DApp not found: ${dappId}`
        }
      };
    }

    return {
      props: {
        dapp: data.dapp
      }
    };
  } catch (err) {
    console.error('DatoCMS Error in getServerSideProps:', err);
    console.error('Params:', params);
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Failed to load dapp';
    return {
      props: {
        dapp: null,
        error: errorMessage
      }
    };
  }
}

