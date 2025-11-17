// components/ThemeToggle.jsx
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <button
      onClick={toggleTheme}
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        width: 50,
        height: 50,
        borderRadius: '50%',
        border: theme === 'dark' 
          ? '2px solid rgba(0, 245, 255, 0.5)' 
          : '2px solid rgba(59, 130, 246, 0.5)',
        background: theme === 'dark'
          ? 'rgba(15, 23, 42, 0.95)'
          : 'rgba(255, 255, 255, 0.95)',
        color: theme === 'dark' ? '#00f5ff' : '#3b82f6',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
        backdropFilter: 'blur(10px)',
        boxShadow: theme === 'dark'
          ? '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 245, 255, 0.3)'
          : '0 4px 16px rgba(0, 0, 0, 0.1), 0 0 20px rgba(59, 130, 246, 0.3)',
        transition: 'all 0.3s ease',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = theme === 'dark'
          ? '0 6px 24px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 245, 255, 0.4)'
          : '0 6px 24px rgba(0, 0, 0, 0.15), 0 0 30px rgba(59, 130, 246, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = theme === 'dark'
          ? '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 245, 255, 0.2)'
          : '0 4px 16px rgba(0, 0, 0, 0.1), 0 0 20px rgba(59, 130, 246, 0.2)';
      }}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

