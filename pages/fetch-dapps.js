// pages/fetch-dapps.js
// Page to fetch and store Alchemy dapps in localStorage
import { useState, useEffect } from 'react';
import { fetchAndStoreAlchemyDapps, getAlchemyDappsFromStorage, getAlchemyDappsCacheTimestamp, clearAlchemyDappsCache } from '../lib/fetch-alchemy-dapps';
import { useTheme } from '../contexts/ThemeContext';

function getThemeColors(theme) {
  if (theme === 'dark') {
    return {
      bg: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textTertiary: '#94a3b8',
      border: 'rgba(148, 163, 184, 0.2)',
      accent: '#00ff88',
      accentSecondary: '#00f5ff',
      shadow: 'rgba(0, 0, 0, 0.5)'
    };
  } else {
    return {
      bg: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      textSecondary: '#475569',
      textTertiary: '#64748b',
      border: 'rgba(15, 23, 42, 0.1)',
      accent: '#00ff88',
      accentSecondary: '#00f5ff',
      shadow: 'rgba(0, 0, 0, 0.1)'
    };
  }
}

export default function FetchDappsPage() {
  const { theme, mounted } = useTheme();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [cachedDapps, setCachedDapps] = useState(null);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);
  const [limit, setLimit] = useState(200);

  const colors = getThemeColors(theme);

  useEffect(() => {
    // Load cached data on mount
    const cached = getAlchemyDappsFromStorage();
    const timestamp = getAlchemyDappsCacheTimestamp();
    setCachedDapps(cached);
    setCacheTimestamp(timestamp);
  }, []);

  const handleFetch = async () => {
    setLoading(true);
    setProgress('Starting fetch...');

    // Override console.log to capture progress
    const originalLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('Fetching') || message.includes('page') || message.includes('Progress') || message.includes('Stored')) {
        setProgress(message);
      }
      originalLog(...args);
    };

    try {
      const dapps = await fetchAndStoreAlchemyDapps(limit);
      
      // Reload cached data
      const cached = getAlchemyDappsFromStorage();
      const timestamp = getAlchemyDappsCacheTimestamp();
      setCachedDapps(cached);
      setCacheTimestamp(timestamp);
      
      setProgress(`✅ Successfully fetched and stored ${dapps.length} dapps!`);
    } catch (err) {
      setProgress(`❌ Error: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
      console.log = originalLog;
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the cached dapps?')) {
      clearAlchemyDappsCache();
      setCachedDapps(null);
      setCacheTimestamp(null);
      setProgress('✅ Cache cleared');
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      color: colors.text,
      padding: 40,
      transition: 'background 0.3s ease, color 0.3s ease'
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 8,
          color: colors.accent,
          fontFamily: '"Aspekta", sans-serif'
        }}>
          Fetch Alchemy Dapps
        </h1>
        <p style={{
          color: colors.textSecondary,
          marginBottom: 32,
          fontSize: 14
        }}>
          Fetch dapps from Alchemy API and store them in localStorage for local development.
        </p>

        <div style={{
          background: colors.surface,
          padding: 24,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          marginBottom: 24
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              color: colors.textSecondary,
              fontSize: 14,
              fontWeight: 600
            }}>
              Number of dapps to fetch:
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 200)}
              min={1}
              max={500}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                color: colors.text,
                fontSize: 16,
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleFetch}
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: loading ? colors.textTertiary : colors.accent,
                color: '#000',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: '"Aspekta", sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.3s',
                opacity: loading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${colors.accent}40`;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {loading ? 'Fetching...' : 'Fetch Dapps'}
            </button>

            {cachedDapps && (
              <button
                onClick={handleClear}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: '"Aspekta", sans-serif',
                  transition: 'all 0.3s',
                  opacity: loading ? 0.6 : 1
                }}
              >
                Clear Cache
              </button>
            )}
          </div>

          {progress && (
            <div style={{
              marginTop: 16,
              padding: 12,
              background: colors.bg,
              borderRadius: 8,
              fontSize: 13,
              color: colors.textSecondary,
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              maxHeight: 200,
              overflow: 'auto'
            }}>
              {progress}
            </div>
          )}
        </div>

        {cachedDapps && (
          <div style={{
            background: colors.surface,
            padding: 24,
            borderRadius: 12,
            border: `1px solid ${colors.border}`
          }}>
            <h2 style={{
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 16,
              color: colors.accent,
              fontFamily: '"Aspekta", sans-serif'
            }}>
              Cached Dapps
            </h2>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <div>
                <div style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: colors.text,
                  fontFamily: '"Aspekta", sans-serif'
                }}>
                  {cachedDapps.length}
                </div>
                <div style={{
                  fontSize: 12,
                  color: colors.textTertiary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Dapps Cached
                </div>
              </div>
              {cacheTimestamp && (
                <div style={{
                  fontSize: 12,
                  color: colors.textTertiary
                }}>
                  Last updated:<br />
                  {new Date(cacheTimestamp).toLocaleString()}
                </div>
              )}
            </div>
            <div style={{
              fontSize: 13,
              color: colors.textSecondary,
              lineHeight: 1.6
            }}>
              <p>✅ Dapps are stored in localStorage and ready to use.</p>
              <p>You can now use <code style={{
                background: colors.bg,
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 12
              }}>getAlchemyDappsFromStorage()</code> to access them.</p>
            </div>
          </div>
        )}

        {!cachedDapps && (
          <div style={{
            background: colors.surface,
            padding: 24,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            textAlign: 'center',
            color: colors.textTertiary
          }}>
            No dapps cached yet. Click "Fetch Dapps" to start.
          </div>
        )}
      </div>
    </div>
  );
}

