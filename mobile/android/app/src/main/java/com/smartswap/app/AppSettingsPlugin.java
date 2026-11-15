package com.smartswap.app;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opens the Android settings screens the app needs to send people to when a
 * permission was denied for good ("app") or the phone's location is off
 * ("location"). Registered in MainActivity; used by src/services/device/appSettings.ts.
 */
@CapacitorPlugin(name = "AppSettings")
public class AppSettingsPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        String target = call.getString("target", "app");
        Intent intent;
        if ("location".equals(target)) {
            intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            // No settings screen, no activity or a SecurityException: JS shows its own message
            call.reject("Could not open settings: " + error.getMessage(), "SETTINGS_UNAVAILABLE", error);
        }
    }
}
