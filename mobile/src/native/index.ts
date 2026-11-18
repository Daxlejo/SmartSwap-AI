import { startServerWarmup } from './serverWarmup';
import { startSystemBarsSync } from './systemBars';

/** Runs one best-effort native piece; a failure is logged and never blocks React from mounting. */
const runSafely = (name: string, start: () => unknown): void => {
  try {
    start();
  } catch (error) {
    console.error(`[native] ${name} failed to start`, error);
  }
};

/**
 * Native (Android) integration, started once from main.tsx before React mounts.
 * Each piece is a no-op where it does not apply, so the web build is unaffected.
 */
export const initNative = (): void => {
  runSafely('systemBars', startSystemBarsSync);
  runSafely('serverWarmup', startServerWarmup);
};
