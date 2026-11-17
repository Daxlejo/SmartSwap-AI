package com.smartswap.app;

import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Paints the Android status and navigation bars with the app's own theme (not the
 * system one), so dark mode no longer leaves a white strip around the WebView.
 *
 * Capacitor's SystemBars only switches the icon style and repaints the area behind
 * the bars with the theme's windowBackground (white in a light system theme), so
 * this plugin sets that area, the legacy bar colors (Android < 15) and the icon
 * style together. The last choice is saved so the next launch starts with the
 * right colors before the web app loads. Used by src/native/systemBars.ts.
 */
@CapacitorPlugin(name = "ThemeBars")
public class ThemeBarsPlugin extends Plugin {

    private static final String PREFS = "theme_bars";
    private static final String KEY_COLOR = "color";
    private static final String KEY_DARK = "dark";

    private int color = Color.parseColor("#f8fafc");
    private boolean dark = false;

    @Override
    public void load() {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, 0);
        color = prefs.getInt(KEY_COLOR, color);
        dark = prefs.getBoolean(KEY_DARK, dark);
        getBridge().executeOnMainThread(this::applyLater);
    }

    @PluginMethod
    public void apply(PluginCall call) {
        String hex = call.getString("color");
        Boolean isDark = call.getBoolean("dark");
        if (hex == null || isDark == null) {
            call.reject("color and dark are required", "INVALID_ARGUMENTS");
            return;
        }
        int parsed;
        try {
            parsed = Color.parseColor(hex);
        } catch (IllegalArgumentException error) {
            call.reject("Invalid color: " + hex, "INVALID_COLOR", error);
            return;
        }
        color = parsed;
        dark = isDark;
        getContext().getSharedPreferences(PREFS, 0).edit().putInt(KEY_COLOR, color).putBoolean(KEY_DARK, dark).apply();
        getBridge().executeOnMainThread(() -> {
            applyNow();
            call.resolve();
        });
    }

    @Override
    protected void handleOnConfigurationChanged(Configuration newConfig) {
        super.handleOnConfigurationChanged(newConfig);
        // SystemBars repaints the bars from the system theme on the same callback; run after it
        applyLater();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        applyLater();
    }

    private void applyLater() {
        View decor = getActivity().getWindow().getDecorView();
        decor.post(this::applyNow);
    }

    @SuppressWarnings("deprecation")
    private void applyNow() {
        Window window = getActivity().getWindow();
        View decor = window.getDecorView();

        // Area behind the bars when Android 15+ draws the app edge to edge
        decor.setBackgroundColor(color);

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decor);
        controller.setAppearanceLightStatusBars(!dark);
        controller.setAppearanceLightNavigationBars(!dark);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            window.setStatusBarColor(color);
            // Before Android 8 the navigation icons are always light, so a light bar would hide them
            boolean lightNavUnsupported = Build.VERSION.SDK_INT < Build.VERSION_CODES.O;
            window.setNavigationBarColor(lightNavUnsupported && !dark ? Color.BLACK : color);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Without this, 3-button navigation gets a translucent white scrim in dark mode
            window.setNavigationBarContrastEnforced(false);
            window.setStatusBarContrastEnforced(false);
        }
    }
}
