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
  // Parse unified metadata
  let unified = null;
  if (dapp.unified_metadata) {
    try {
      unified = typeof dapp.unified_metadata === 'string' 
        ? JSON.parse(dapp.unified_metadata) 
        : dapp.unified_metadata;
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Get data from unified metadata with fallbacks
  const price = dapp.token_price_usd;
  const change = dapp.token_price_change_24h;
  const tvl = unified?.tvlUsd || dapp.tvl_usd;
  
  // Get category from unified or fallback
  const category = unified?.category || dapp.categoryDefillama;
  
  // Get description from unified or fallback
  const description = unified?.description || dapp.short_description || dapp.description || 'No description available';
  
  // Validate and normalize URL
  const normalizeUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    // Remove whitespace
    url = url.trim();
    if (!url) return null;
    // If already absolute URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If relative URL, try to make it absolute (assuming it's from DatoCMS)
    if (url.startsWith('/')) {
      return url;
    }
    // If it's a data URL, return as is
    if (url.startsWith('data:')) {
      return url;
    }
    // Otherwise, assume it's invalid
    return null;
  };

  // Get all possible logo URLs in priority order for fallback chain
  const getLogoUrls = () => {
    const urls = [];
    
    // 1. Screenshots (DatoCMS - most reliable)
    if (dapp.screenshots && dapp.screenshots.length > 0 && dapp.screenshots[0].url) {
      const url = normalizeUrl(dapp.screenshots[0].url);
      if (url) urls.push(url);
    }
    
    // 2. Unified metadata logo
    if (unified?.logoUrl) {
      const url = normalizeUrl(unified.logoUrl);
      if (url) urls.push(url);
    }
    
    // 3. Token logo URL
    if (dapp.token_logo_url) {
      const url = normalizeUrl(dapp.token_logo_url);
      if (url) urls.push(url);
    }
    
    // 4. DatoCMS logo field
    if (dapp.logo?.url) {
      const url = normalizeUrl(dapp.logo.url);
      if (url) urls.push(url);
    }
    
    // 5. Alchemy logo
    if (dapp.alchemy_recent_activity) {
      try {
        const alchemyData = typeof dapp.alchemy_recent_activity === 'string' 
          ? JSON.parse(dapp.alchemy_recent_activity) 
          : dapp.alchemy_recent_activity;
        if (alchemyData?.logoUrl) {
          const url = normalizeUrl(alchemyData.logoUrl);
          if (url) urls.push(url);
        }
        // Also check logoCdnUrl
        if (alchemyData?.logoCdnUrl) {
          const url = normalizeUrl(alchemyData.logoCdnUrl);
          if (url) urls.push(url);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // 6. DeFiLlama icon (last resort)
    if (dapp.protocolId) {
      urls.push(`https://icons.llama.fi/${dapp.protocolId}.png`);
    }
    
    // Remove duplicates
    return [...new Set(urls)];
  };
  
  const logoUrls = useMemo(() => getLogoUrls(), [dapp]);
  const [logoUrl, setLogoUrl] = useState(logoUrls[0] || null);
  const [logoError, setLogoError] = useState(false);
  const [logoLoading, setLogoLoading] = useState(true);
  
  // Reset logo state when dapp changes
  useEffect(() => {
    setLogoUrl(logoUrls[0] || null);
    setLogoError(false);
    setLogoLoading(true);
  }, [logoUrls]);
  
  // Preload image to check if it's valid
  useEffect(() => {
    if (!logoUrl) {
      setLogoLoading(false);
      return;
    }
    
    const img = new Image();
    let cancelled = false;
    
    img.onload = () => {
      if (!cancelled) {
        setLogoLoading(false);
        setLogoError(false);
      }
    };
    
    img.onerror = () => {
      if (!cancelled) {
        // Try next URL in fallback chain
        const currentIndex = logoUrls.indexOf(logoUrl);
        if (currentIndex < logoUrls.length - 1) {
          setLogoUrl(logoUrls[currentIndex + 1]);
        } else {
          // All logos failed
          setLogoError(true);
          setLogoLoading(false);
        }
      }
    };
    
    // Set crossOrigin to anonymous to avoid CORS issues (if possible)
    img.crossOrigin = 'anonymous';
    img.src = logoUrl;
    
    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [logoUrl, logoUrls]);

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
      href={`/dapps/${dapp.id}`}
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
            {logoUrl && !logoError && !logoLoading ? (
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
                  boxShadow: `0 4px 16px rgba(0, 0, 0, 0.3), 0 0 20px ${accent.primary}20`,
                  display: 'block'
                }}
                onError={(e) => {
                  // Additional error handling (in case preload missed it)
                  const currentIndex = logoUrls.indexOf(logoUrl);
                  if (currentIndex < logoUrls.length - 1) {
                    setLogoUrl(logoUrls[currentIndex + 1]);
                  } else {
                    setLogoError(true);
                    setLogoLoading(false);
                  }
                }}
                loading="lazy"
                crossOrigin="anonymous"
              />
            ) : logoLoading ? (
              // Loading placeholder
              <div 
                style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${accent.primary}20 0%, ${accent.secondary}20 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${accent.primary}40`,
                  boxShadow: `0 4px 16px rgba(0, 0, 0, 0.3), 0 0 20px ${accent.primary}20`,
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  border: `3px solid ${accent.primary}40`,
                  borderTopColor: accent.primary,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              </div>
            ) : (
              // Fallback when all logos fail
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
                  fontFamily: '"Aspekta", sans-serif',
                  boxShadow: `0 4px 16px rgba(0, 0, 0, 0.3), 0 0 20px ${accent.primary}40`,
                  border: `2px solid ${accent.primary}40`
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
              fontFamily: '"Aspekta", sans-serif',
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
              {description}
            </div>

            {/* Category badge */}
            {category && (
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
                  fontFamily: '"Aspekta", sans-serif'
                }}>
                  {category}
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
                    fontFamily: '"Aspekta", sans-serif'
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
                    fontFamily: '"Aspekta", sans-serif'
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
                  fontFamily: '"Aspekta", sans-serif'
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

