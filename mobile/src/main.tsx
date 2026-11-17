import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import { App } from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';
import { preferencesStorage } from './services/storage/preferencesStorage';
import { initNative } from './native';
import './index.css';

// Apply the stored theme (light by default) before React mounts to avoid a flash of the wrong theme
document.documentElement.classList.toggle('dark', preferencesStorage.getTheme() === 'dark');

// Android system bars follow that theme; the API starts waking up (see src/native/)
initNative();

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ThemeProvider>
    </React.StrictMode>,
  );
}
