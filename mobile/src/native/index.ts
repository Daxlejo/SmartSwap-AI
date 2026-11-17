import { startServerWarmup } from './serverWarmup';
import { startSystemBarsSync } from './systemBars';

/**
 * Native (Android) integration, started once from main.tsx before React mounts.
 * Each piece is a no-op where it does not apply, so the web build is unaffected.
 */
export const initNative = (): void => {
  startSystemBarsSync();
  startServerWarmup();
};
