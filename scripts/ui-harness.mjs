/**
 * Shared by the browser scripts (`audit:ui`, `e2e:flow`): starts the mobile app with
 * Vite pointed at a fake API host, so every `/api/v1/*` call can be answered from
 * fixtures inside Playwright, and stops it again.
 */
import { spawn, execSync } from 'node:child_process';
import { openSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const API_PREFIX = '/api/v1';
/** Host the app calls for the API; the browser scripts intercept it. */
export const FAKE_API_ORIGIN = 'http://audit.local';

export const isUp = async (url) => {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
};

/** Waits for Vite, failing at once if the process exits (e.g. the port is taken). */
export const waitForServer = async (url, child, timeoutMs, logPath) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) {
      throw new Error(`Vite exited with code ${child.exitCode}; see ${logPath}`);
    }
    if (await isUp(url)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`The mobile app did not start at ${url} (see ${logPath})`);
};

export const startVite = (port, logPath) => {
  const log = openSync(logPath, 'w');
  return spawn('npm', ['--workspace=mobile', 'run', 'dev', '--', '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    shell: true,
    detached: process.platform !== 'win32',
    env: { ...process.env, VITE_API_URL: `${FAKE_API_ORIGIN}${API_PREFIX}`, VITE_DEMO_PASSWORD: '' },
    stdio: ['ignore', log, log],
  });
};

export const stopVite = (child) => {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    } catch (error) {
      // 128: the process tree is already gone
      if (error.status !== 128) console.error(`Could not stop Vite (pid ${child.pid}): ${error.message}`);
    }
  } else {
    // The shell wrapper leads its own group: kill the group so Vite goes too
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      console.error(`Could not stop Vite (pid ${child.pid}): ${error.message}`);
    }
  }
};
