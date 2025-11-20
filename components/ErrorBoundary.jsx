// components/ErrorBoundary.jsx
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if error is related to MetaMask or wallet connections
    const errorMessage = error?.message || String(error) || '';
    const isWalletError = 
      errorMessage.includes('MetaMask') ||
      errorMessage.includes('Failed to connect') ||
      errorMessage.includes('wallet') ||
      errorMessage.includes('ethereum') ||
      errorMessage.includes('chrome-extension://') ||
      errorMessage.includes('User rejected') ||
      errorMessage.includes('User denied');
    
    // Suppress wallet errors - don't show error boundary
    if (isWalletError) {
      console.warn('Wallet connection error suppressed by ErrorBoundary:', errorMessage);
      return { hasError: false, error: null };
    }
    
    // For other errors, show error boundary
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error but suppress wallet-related errors
    const errorMessage = error?.message || String(error) || '';
    const isWalletError = 
      errorMessage.includes('MetaMask') ||
      errorMessage.includes('Failed to connect') ||
      errorMessage.includes('wallet') ||
      errorMessage.includes('ethereum');
    
    if (!isWalletError) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Only show error UI for non-wallet errors
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#ef4444'
        }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

