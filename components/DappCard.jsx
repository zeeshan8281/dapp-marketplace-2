// components/DappCard.jsx
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

function fmtMoney(n) {
  if (n == null) return "—";
  if (n >= 1000000000) return "$" + (n / 1000000000).toFixed(2) + "B";
  if (n >= 1000000) return "$" + (n / 1000000).toFixed(2) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(2) + "K";
  return "$" + n.toFixed(2);
}

// Get logo URL from various sources - prioritize in order
function getLogoUrl(dapp) {
  // 1. Check screenshots first (most reliable DatoCMS source)
  if (dapp.screenshots && dapp.screenshots.length > 0 && dapp.screenshots[0].url) {
    return dapp.screenshots[0].url;
  }
  
  // 2. Check token logo URL (from Alchemy/CoinGecko)
  if (dapp.token_logo_url) return dapp.token_logo_url;
  
  // 3. Check DatoCMS logo field (if it exists)
  if (dapp.logo?.url) return dapp.logo.url;
  
  // 4. Check Alchemy dapp store data (if available)
  if (dapp.alchemy_recent_activity) {
    try {
      const alchemyData = typeof dapp.alchemy_recent_activity === 'string' 
        ? JSON.parse(dapp.alchemy_recent_activity) 
        : dapp.alchemy_recent_activity;
      if (alchemyData?.logoUrl) {
        return alchemyData.logoUrl;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // 5. DeFiLlama icon as last resort
  if (dapp.protocolId) {
    return `https://icons.llama.fi/${dapp.protocolId}.png`;
  }
  
  return null;
}

export default function DappCard({ dapp, theme = 'dark' }) {
  const price = dapp.token_price_usd;
  const change = dapp.token_price_change_24h;
  const tvl = dapp.tvl_usd;
  
  // Get all possible logo URLs in priority order for fallback chain
  const getLogoUrls = () => {
    const urls = [];
    if (dapp.screenshots && dapp.screenshots.length > 0 && dapp.screenshots[0].url) {
      urls.push(dapp.screenshots[0].url);
    }
    if (dapp.token_logo_url) urls.push(dapp.token_logo_url);
    if (dapp.logo?.url) urls.push(dapp.logo.url);
    if (dapp.alchemy_recent_activity) {
      try {
        const alchemyData = typeof dapp.alchemy_recent_activity === 'string' 
          ? JSON.parse(dapp.alchemy_recent_activity) 
          : dapp.alchemy_recent_activity;
        if (alchemyData?.logoUrl) {
          urls.push(alchemyData.logoUrl);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    if (dapp.protocolId) {
      urls.push(`https://icons.llama.fi/${dapp.protocolId}.png`);
    }
    return urls;
  };
  
  const logoUrls = useMemo(() => getLogoUrls(), [dapp]);
  const [logoUrl, setLogoUrl] = useState(logoUrls[0] || null);
  const [logoError, setLogoError] = useState(false);
  
  // Reset logo state when dapp changes
  useEffect(() => {
    setLogoUrl(logoUrls[0] || null);
    setLogoError(false);
  }, [logoUrls]);

  // Calculate freshness indicator
  const getFreshnessColor = (lastSynced) => {
    if (!lastSynced) return '#64748b';
    const minutesAgo = (Date.now() - new Date(lastSynced).getTime()) / (1000 * 60);
    if (minutesAgo < 30) return '#00ff88';
    if (minutesAgo < 360) return '#ff6b35';
    return '#ef4444';
  };

  const freshnessColor = getFreshnessColor(dapp.last_synced_at);
  const hasData = tvl != null || price != null;

  // Generate neon accent color based on title
  const getAccentColor = (title) => {
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
  };

  const accent = getAccentColor(dapp.title);

  return (
    <Link 
      href={`/dapps/${dapp.slug || dapp.id}`}
      style={{ 
        display: "block", 
        textDecoration: "none", 
        color: "inherit",
        position: 'relative'
      }}
    >
      <div
        style={{ 
          padding: 28, 
          borderRadius: 16, 
          backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${accent.primary}40`,
          boxShadow: theme === 'dark' 
            ? `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 0 ${accent.primary}40`
            : `0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 0 ${accent.primary}40`,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
          e.currentTarget.style.borderColor = accent.primary;
          e.currentTarget.style.boxShadow = theme === 'dark'
            ? `0 20px 40px rgba(0, 0, 0, 0.5), 0 0 40px ${accent.primary}60, 0 0 80px ${accent.primary}30`
            : `0 20px 40px rgba(0, 0, 0, 0.15), 0 0 40px ${accent.primary}60, 0 0 80px ${accent.primary}30`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.borderColor = `${accent.primary}40`;
          e.currentTarget.style.boxShadow = theme === 'dark'
            ? `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 0 ${accent.primary}40`
            : `0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 0 ${accent.primary}40`;
        }}
      >
        {/* Animated accent bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${accent.primary} 0%, ${accent.secondary} 100%)`,
          boxShadow: `0 0 10px ${accent.primary}80`
        }} />

        {/* Glowing corner accent */}
        <div style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent.primary}20 0%, transparent 70%)`,
          filter: 'blur(20px)',
          transition: 'all 0.4s'
        }} />

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{
            position: 'relative',
            flexShrink: 0
          }}>
            {logoUrl && !logoError ? (
              <img 
                src={logoUrl} 
                alt={dapp.title} 
                style={{ 
                  width: 80, 
                  height: 80, 
                  objectFit: "contain",
                  borderRadius: 12,
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  padding: 12,
                  border: `2px solid ${accent.primary}40`,
                  boxShadow: `0 4px 16px rgba(0, 0, 0, 0.3), 0 0 20px ${accent.primary}20`
                }}
                onError={(e) => {
                  // Try next logo URL in the fallback chain
                  const currentIndex = logoUrls.indexOf(logoUrl);
                  if (currentIndex < logoUrls.length - 1) {
                    // Try next URL
                    setLogoUrl(logoUrls[currentIndex + 1]);
                  } else {
                    // All logos failed, show fallback
                    setLogoError(true);
                  }
                }}
              />
            ) : (
              <div 
                style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.secondary} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0a0e27',
                  fontSize: 32,
                  fontWeight: 900,
                  fontFamily: '"Orbitron", monospace',
                  boxShadow: `0 4px 16px rgba(0, 0, 0, 0.3), 0 0 20px ${accent.primary}40`
                }}
              >
                {dapp.title?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontWeight: 700, 
              fontSize: 20, 
              marginBottom: 8,
              color: accent.primary,
              fontFamily: '"Orbitron", monospace',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {dapp.title}
            </div>
            
            <div style={{ 
              fontSize: 14, 
              color: '#94a3b8',
              marginBottom: 16,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {dapp.short_description || dapp.description || 'No description available'}
            </div>

            {/* Category badge */}
            {dapp.categoryDefillama && (
              <div style={{ marginBottom: 12 }}>
                <span style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 11,
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
            <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: 'wrap' }}>
              {(tvl != null && tvl !== undefined && tvl !== 0) && (
                <div>
                  <div style={{ 
                    fontSize: 18, 
                    fontWeight: 700, 
                    color: accent.primary,
                    fontFamily: '"Orbitron", monospace'
                  }}>
                    {fmtMoney(tvl)}
                  </div>
                  <div style={{ 
                    fontSize: 11, 
                    color: theme === 'dark' ? '#64748b' : '#64748b', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px' 
                  }}>
                    TVL
                  </div>
                </div>
              )}
              
              {price != null && (
                <div>
                  <div style={{ 
                    fontSize: 18, 
                    fontWeight: 700, 
                    color: accent.secondary,
                    fontFamily: '"Orbitron", monospace'
                  }}>
                    {fmtMoney(price)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Price
                  </div>
                </div>
              )}

              {/* Sync status */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: freshnessColor,
                  boxShadow: `0 0 8px ${freshnessColor}80`
                }} />
                <span style={{ 
                  fontSize: 11, 
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: '"JetBrains Mono", monospace'
                }}>
                  {dapp.last_synced_at ? 'SYNCED' : 'NOT SYNCED'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

