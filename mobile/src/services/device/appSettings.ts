import { Capacitor, registerPlugin } from '@capacitor/core';

/** Which Android settings screen to open. */
export type SettingsTarget = 'app' | 'location';

interface AppSettingsPlugin {
  open(options: { target: SettingsTarget }): Promise<void>;
}

/** Native side: android/app/src/main/java/com/smartswap/app/AppSettingsPlugin.java */
const AppSettings = registerPlugin<AppSettingsPlugin>('AppSettings');

/** True where the settings screens can be opened (the Android app, not the browser). */
export const canOpenSettings = (): boolean => Capacitor.getPlatform() === 'android';

/**
 * Opens the app's permission screen (`app`) or the phone's location switch (`location`).
 * Rejects when the screen cannot be opened, so the caller can say so.
 */
export const openSettings = (target: SettingsTarget): Promise<void> => AppSettings.open({ target });
