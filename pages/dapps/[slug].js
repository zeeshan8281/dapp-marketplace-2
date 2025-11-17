// pages/dapps/[slug].js
import Head from 'next/head';
import { datoFetch } from '../../lib/datocms';
import { useTheme } from '../../contexts/ThemeContext';

const QUERY = `
  query DappDetail($id: ItemId!) {
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
      chains {
        id
        name
      }
      categories {
        id
        name
      }
      tags {
        id
        tag
      }
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
      fontFamily: '"JetBrains Mono", monospace',
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
          transition: 'background 0.3s ease, color 0.3s ease'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 48, fontFamily: '"Orbitron", monospace', color: '#ef4444' }}>404</h1>
            <p style={{ fontSize: 18, color: colors.textTertiary }}>DApp not found</p>
            <a href="/dapps" style={{ color: colors.accent, textDecoration: 'none', marginTop: 20, display: 'inline-block' }}>← Back to DApps</a>
          </div>
        </main>
      </>
    );
  }

  const accent = getAccentColor(dapp.title, theme);
  
  // Parse Alchemy data
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

  // Get logo URL
  let logoUrl = null;
  if (dapp.screenshots && dapp.screenshots.length > 0 && dapp.screenshots[0].url) {
    logoUrl = dapp.screenshots[0].url;
  } else if (dapp.tokenLogoUrl) {
    logoUrl = dapp.tokenLogoUrl;
  } else if (alchemyData?.logoUrl) {
    logoUrl = alchemyData.logoUrl;
  } else if (dapp.protocolId) {
    logoUrl = `https://icons.llama.fi/${dapp.protocolId}.png`;
  }

  const hasDefiLlama = !!dapp.protocolId;
  const hasAlchemy = !!alchemyData;

  // Get the best available description (prioritize full/long description)
  const getDescription = () => {
    // Priority: longDescription > description > shortDescription
    if (alchemyData?.longDescription) return alchemyData.longDescription;
    if (alchemyData?.description && alchemyData.description.length > 100) return alchemyData.description;
    if (dapp.shortDescription && dapp.shortDescription.length > 100) return dapp.shortDescription;
    return alchemyData?.description || dapp.shortDescription || 'No description available.';
  };

  const description = getDescription();
  
  // Split into paragraphs if there are line breaks
  const descriptionParagraphs = description.split('\n\n').filter(p => p.trim().length > 0);

  return (
    <>
      <Head>
        <title>{dapp.title} | DApps Terminal</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
        <style>{`
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
        fontFamily: '"DM Sans", -apple-system, sans-serif',
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
                fontFamily: '"JetBrains Mono", monospace',
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
              {hasDefiLlama && <DataSourceBadge source="defillama" />}
              {hasAlchemy && <DataSourceBadge source="alchemy" />}
            </div>
          </div>
        </header>

        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 32px', position: 'relative', zIndex: 1 }}>
          {/* Hero Section */}
          <section style={{
            marginBottom: 48,
            display: 'flex',
            gap: 32,
            alignItems: 'flex-start',
            padding: 40,
            background: theme === 'dark' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)',
            backdropFilter: 'blur(20px)',
            borderRadius: 20,
            border: `1px solid ${colors.border}`,
            boxShadow: `0 8px 32px ${colors.shadow}, 0 0 40px ${colors.border}80`,
            transition: 'background 0.3s ease, border-color 0.3s ease'
          }}>
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt={dapp.title}
                style={{
                  width: 120,
                  height: 120,
                  objectFit: 'contain',
                  borderRadius: 16,
                  backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                  padding: 16,
                  border: `2px solid ${accent.primary}40`
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: 48,
                fontWeight: 900,
                fontFamily: '"Orbitron", monospace',
                color: accent.primary,
                margin: 0,
                marginBottom: 16,
                textTransform: 'uppercase',
                letterSpacing: '2px'
              }}>
                {dapp.title}
              </h1>
              {dapp.categoryDefillama && (
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
                    fontFamily: '"JetBrains Mono", monospace'
                  }}>
                    {dapp.categoryDefillama}
                  </span>
                </div>
              )}
              {/* Metrics */}
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                {dapp.tvlUsd && (
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: accent.primary, fontFamily: '"Orbitron", monospace' }}>
                      ${(dapp.tvlUsd / 1000000).toFixed(2)}M
                    </div>
                    <div style={{ fontSize: 12, color: colors.textTertiary, textTransform: 'uppercase' }}>TVL</div>
                  </div>
                )}
                {dapp.tokenPriceUsd && (
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: accent.secondary, fontFamily: '"Orbitron", monospace' }}>
                      ${dapp.tokenPriceUsd.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 12, color: colors.textTertiary, textTransform: 'uppercase' }}>PRICE</div>
                  </div>
                )}
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
              fontFamily: '"Orbitron", monospace',
              color: accent.primary,
              marginBottom: 24,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              ABOUT
            </h2>
            
            {/* Multi-paragraph description */}
            <div style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: colors.textSecondary
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

            {/* Show data source */}
            <div style={{
              marginTop: 24,
              paddingTop: 24,
              borderTop: `1px solid ${accent.primary}20`,
              fontSize: 12,
              color: colors.textTertiary,
              fontFamily: '"JetBrains Mono", monospace'
            }}>
              {alchemyData?.longDescription && '📝 Extended description available'}
              {!alchemyData?.longDescription && hasDefiLlama && '📊 Description from DeFiLlama'}
              {!alchemyData?.longDescription && !hasDefiLlama && hasAlchemy && '⚡ Description from Alchemy'}
            </div>
          </section>

          {/* Links & Resources Section */}
          {(alchemyData?.websiteUrl || alchemyData?.twitterUrl || alchemyData?.githubUrl || alchemyData?.discordUrl || alchemyData?.documentationUrl || dapp.defillamaUrl) && (
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
                fontFamily: '"Orbitron", monospace',
                color: accent.primary,
                marginBottom: 24,
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                LINKS & RESOURCES
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {alchemyData?.websiteUrl && (
                  <a 
                    href={alchemyData.websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      padding: '12px 20px',
                      background: `${accent.primary}20`,
                      color: accent.primary,
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 14,
                      border: `1px solid ${accent.primary}40`,
                      transition: 'all 0.3s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${accent.primary}30`;
                      e.currentTarget.style.boxShadow = `0 0 20px ${accent.primary}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `${accent.primary}20`;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    🌐 Website →
                  </a>
                )}
                {alchemyData?.twitterUrl && (
                  <a 
                    href={alchemyData.twitterUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      padding: '12px 20px',
                      background: `${accent.primary}20`,
                      color: accent.primary,
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 14,
                      border: `1px solid ${accent.primary}40`,
                      transition: 'all 0.3s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${accent.primary}30`;
                      e.currentTarget.style.boxShadow = `0 0 20px ${accent.primary}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `${accent.primary}20`;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    🐦 Twitter →
                  </a>
                )}
                {alchemyData?.githubUrl && (
                  <a 
                    href={alchemyData.githubUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      padding: '12px 20px',
                      background: `${accent.primary}20`,
                      color: accent.primary,
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 14,
                      border: `1px solid ${accent.primary}40`,
                      transition: 'all 0.3s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${accent.primary}30`;
                      e.currentTarget.style.boxShadow = `0 0 20px ${accent.primary}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `${accent.primary}20`;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    💻 GitHub →
                  </a>
                )}
                {alchemyData?.discordUrl && (
                  <a 
                    href={alchemyData.discordUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      padding: '12px 20px',
                      background: `${accent.primary}20`,
                      color: accent.primary,
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 14,
                      border: `1px solid ${accent.primary}40`,
                      transition: 'all 0.3s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${accent.primary}30`;
                      e.currentTarget.style.boxShadow = `0 0 20px ${accent.primary}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `${accent.primary}20`;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    💬 Discord →
                  </a>
                )}
                {alchemyData?.documentationUrl && (
                  <a 
                    href={alchemyData.documentationUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      padding: '12px 20px',
                      background: `${accent.primary}20`,
                      color: accent.primary,
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 14,
                      border: `1px solid ${accent.primary}40`,
                      transition: 'all 0.3s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${accent.primary}30`;
                      e.currentTarget.style.boxShadow = `0 0 20px ${accent.primary}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `${accent.primary}20`;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    📚 Documentation →
                  </a>
                )}
                {dapp.defillamaUrl && (
                  <a 
                    href={dapp.defillamaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      padding: '12px 20px',
                      background: `${accent.secondary}20`,
                      color: accent.secondary,
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 14,
                      border: `1px solid ${accent.secondary}40`,
                      transition: 'all 0.3s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${accent.secondary}30`;
                      e.currentTarget.style.boxShadow = `0 0 20px ${accent.secondary}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `${accent.secondary}20`;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    📊 DeFiLlama →
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Details Section */}
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
              fontFamily: '"Orbitron", monospace',
              color: accent.primary,
              marginBottom: 24,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              DETAILS
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
              {dapp.chains && dapp.chains.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 8, textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace' }}>
                    CHAINS
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {dapp.chains.map(chain => (
                      <span key={chain.id} style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        backgroundColor: `${accent.primary}20`,
                        color: accent.primary,
                        fontSize: 12,
                        fontFamily: '"JetBrains Mono", monospace'
                      }}>
                        {chain.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {dapp.categories && dapp.categories.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 8, textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace' }}>
                    CATEGORIES
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {dapp.categories.map(cat => (
                      <span key={cat.id} style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        backgroundColor: `${accent.secondary}20`,
                        color: accent.secondary,
                        fontSize: 12,
                        fontFamily: '"JetBrains Mono", monospace'
                      }}>
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {dapp.defillamaUrl && (
                <div>
                  <div style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 8, textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace' }}>
                    LINKS
                  </div>
                  <a 
                    href={dapp.defillamaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      color: accent.primary,
                      textDecoration: 'none',
                      fontSize: 14,
                      fontFamily: '"JetBrains Mono", monospace'
                    }}
                  >
                    View on DeFiLlama →
                  </a>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const data = await datoFetch(QUERY, { id: params.slug });
    
    if (!data.dapp) {
      return {
        props: {
          dapp: null,
          error: 'DApp not found'
        }
      };
    }

    return {
      props: {
        dapp: data.dapp
      }
    };
  } catch (err) {
    console.error('DatoCMS Error:', err);
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

