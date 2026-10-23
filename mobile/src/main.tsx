import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import { App } from './App';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// Apply initial theme before React mounts to avoid flash of wrong theme (FOUC)
try {
  const savedTheme = localStorage.getItem('smartswap-theme');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
} catch {
  // Graceful fallback for environments with restricted storage access
}

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>,
  );
}
