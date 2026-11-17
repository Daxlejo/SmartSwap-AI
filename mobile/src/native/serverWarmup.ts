import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { healthService } from '@/services/health/health.service';

/** Two pings closer than this are pointless: the first one already woke the server. */
export const WARMUP_MIN_INTERVAL_MS = 60_000;

/**
 * Returns a function that pings GET /health, at most once per `minIntervalMs`.
 * The answer is ignored: the point is to start waking the free Render instance
 * before the user's first real request (ServerStatusBanner reports the status).
 */
export const createWarmup = (
  ping: () => Promise<unknown> = () => healthService.isServerUp(),
  now: () => number = Date.now,
  minIntervalMs: number = WARMUP_MIN_INTERVAL_MS,
): (() => void) => {
  let lastPing = Number.NEGATIVE_INFINITY;
  return () => {
    const current = now();
    if (current - lastPing < minIntervalMs) return;
    lastPing = current;
    // isServerUp never rejects; the catch only guards a custom ping
    void ping().catch(() => undefined);
  };
};

/**
 * Warms the API up as soon as the app opens (before React mounts) and every time
 * the Android app comes back from the background, when Render may have slept.
 */
export const startServerWarmup = (warmup: () => void = createWarmup()): void => {
  warmup();
  if (Capacitor.getPlatform() !== 'android') return;
  void App.addListener('resume', warmup);
};
