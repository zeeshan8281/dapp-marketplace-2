// pages/_app.js
import { useEffect } from 'react';
import Script from 'next/script';
import { ThemeProvider } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import ErrorBoundary from '../components/ErrorBoundary';

// Disable Next.js error overlay completely
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Remove error overlay if it exists
  const removeErrorOverlay = () => {
    const overlay = document.getElementById('__next-build-watcher') || 
                    document.querySelector('[data-nextjs-dialog]') ||
                    document.querySelector('[id^="__next"]')?.querySelector('[role="dialog"]');
    if (overlay) {
      overlay.remove();
    }
    
    // Also remove any error overlay styles
    const style = document.getElementById('__next-error-overlay-styles');
    if (style) {
      style.remove();
    }
  };

  // Run immediately and on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeErrorOverlay);
  } else {
    removeErrorOverlay();
  }

  // Watch for new error overlays
  const observer = new MutationObserver(removeErrorOverlay);
  observer.observe(document.body, { childList: true, subtree: true });
}

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Suppress MetaMask and wallet connection errors from showing in error overlay
    const handleError = (event) => {
      // Check if error is related to MetaMask or wallet connections
      const errorMessage = event.error?.message || event.message || String(event.error || event) || '';
      const isWalletError = 
        errorMessage.includes('MetaMask') ||
        errorMessage.includes('Failed to connect') ||
        errorMessage.includes('wallet') ||
        errorMessage.includes('ethereum') ||
        errorMessage.includes('chrome-extension://') ||
        errorMessage.includes('nkbihfbeogaeaoehlefnkodbefgpgknn'); // MetaMask extension ID
      
      if (isWalletError) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.warn('Wallet connection error suppressed:', errorMessage);
        return false;
      }
    };

    // Handle unhandled promise rejections (common with wallet connections)
    const handleUnhandledRejection = (event) => {
      const errorMessage = event.reason?.message || String(event.reason) || '';
      const isWalletError = 
        errorMessage.includes('MetaMask') ||
        errorMessage.includes('Failed to connect') ||
        errorMessage.includes('wallet') ||
        errorMessage.includes('ethereum') ||
        errorMessage.includes('User rejected') ||
        errorMessage.includes('User denied') ||
        errorMessage.includes('chrome-extension://') ||
        errorMessage.includes('nkbihfbeogaeaoehlefnkodbefgpgknn'); // MetaMask extension ID
      
      if (isWalletError) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.warn('Wallet connection rejection suppressed:', errorMessage);
        return false;
      }
    };

    // Suppress Next.js error overlay for wallet errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      const isWalletError = 
        errorMessage.includes('MetaMask') ||
        errorMessage.includes('Failed to connect') ||
        errorMessage.includes('wallet') ||
        errorMessage.includes('ethereum') ||
        errorMessage.includes('chrome-extension://') ||
        errorMessage.includes('nkbihfbeogaeaoehlefnkodbefgpgknn'); // MetaMask extension ID
      
      if (isWalletError) {
        console.warn('Wallet error suppressed:', ...args);
        return;
      }
      
      originalConsoleError.apply(console, args);
    };

    // Add error handlers with highest priority (capture phase)
    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    
    // Suppress Next.js error overlay by intercepting its initialization
    if (typeof window !== 'undefined') {
      // Override window.onerror before Next.js sets it up
      const originalOnError = window.onerror;
      window.onerror = function(message, source, lineno, colno, error) {
        const errorMessage = message || String(error) || '';
        const isWalletError = 
          errorMessage.includes('MetaMask') ||
          errorMessage.includes('Failed to connect') ||
          errorMessage.includes('wallet') ||
          errorMessage.includes('ethereum') ||
          errorMessage.includes('chrome-extension://') ||
          (source && source.includes('chrome-extension://'));
        
        if (isWalletError) {
          console.warn('Wallet error suppressed (onerror):', errorMessage);
          return true; // Prevent default error handling
        }
        
        if (originalOnError) {
          return originalOnError.call(this, message, source, lineno, colno, error);
        }
        return false;
      };

      // Aggressively remove error overlay elements
      const removeOverlay = () => {
        // Remove Next.js error overlay
        const selectors = [
          '[data-nextjs-dialog]',
          '#__next-build-watcher',
          '[id*="error"]',
          '[class*="error-overlay"]',
          '[class*="ErrorOverlay"]',
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent || '';
            if (text.includes('MetaMask') || text.includes('Failed to connect') || text.includes('wallet')) {
              el.remove();
            }
          });
        });
      };

      // Run immediately and periodically
      removeOverlay();
      const interval = setInterval(removeOverlay, 100);
      
      // Clean up interval on unmount
      return () => {
        clearInterval(interval);
        window.removeEventListener('error', handleError, true);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
        if (originalOnError) {
          window.onerror = originalOnError;
        }
        console.error = originalConsoleError;
      };
    }

  }, []);

  return (
    <>
      <Script
        id="suppress-wallet-errors"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Aggressively remove error overlay
              function removeErrorOverlay() {
                const selectors = [
                  '[data-nextjs-dialog]',
                  '#__next-build-watcher',
                  '[id*="error"]',
                  '[class*="error-overlay"]',
                  '[class*="ErrorOverlay"]',
                  '[role="dialog"]'
                ];
                selectors.forEach(selector => {
                  document.querySelectorAll(selector).forEach(el => {
                    const text = el.textContent || '';
                    if (text.includes('MetaMask') || text.includes('Failed to connect') || text.includes('wallet') || text.includes('chrome-extension://')) {
                      el.remove();
                    }
                  });
                });
              }
              
              // Run immediately
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', removeErrorOverlay);
              } else {
                removeErrorOverlay();
              }
              
              // Watch for new overlays
              const observer = new MutationObserver(removeErrorOverlay);
              observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
              
              // Also run periodically
              setInterval(removeErrorOverlay, 50);
            })();
          `,
        }}
      />
      <ErrorBoundary>
        <ThemeProvider>
          <style jsx global>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
          <Component {...pageProps} />
          <ThemeToggle />
        </ThemeProvider>
      </ErrorBoundary>
    </>
  );
}

