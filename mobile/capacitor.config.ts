import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartswap.app',
  appName: 'SmartSwap',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
  },
  // Splash: Android's own splash (styles.xml, AppTheme.NoActionBarLaunch), kept by
  // MainActivity until the web app loads. Bar colors: ThemeBarsPlugin + src/native/systemBars.ts.
  plugins: {
    SystemBars: {
      // The WebView gets the bar sizes as safe-area insets (index.html uses viewport-fit=cover),
      // and the keyboard resizes the content instead of covering the focused field.
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
