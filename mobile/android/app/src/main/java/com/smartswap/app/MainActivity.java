package com.smartswap.app;

import android.os.Bundle;
import android.os.SystemClock;
import android.webkit.WebView;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    /** Upper bound for the splash, so a slow WebView never leaves it stuck on screen. */
    private static final long SPLASH_MAX_MS = 3000;

    private volatile boolean webReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The splash stays until the web app has loaded, instead of flashing an empty WebView
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        long start = SystemClock.uptimeMillis();
        splash.setKeepOnScreenCondition(() -> !webReady && SystemClock.uptimeMillis() - start < SPLASH_MAX_MS);

        // App-local plugins are registered before the bridge starts
        registerPlugin(AppSettingsPlugin.class);
        registerPlugin(ThemeBarsPlugin.class);
        super.onCreate(savedInstanceState);

        if (getBridge() == null) {
            webReady = true;
            return;
        }
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                webReady = true;
            }
        });
    }
}
