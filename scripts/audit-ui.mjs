#!/usr/bin/env node
/**
 * UI audit at phone size (`npm run audit:ui`).
 *
 * Starts the mobile app with Vite, answers every API call from
 * `audit-ui-fixtures.mjs` (no database, no Render, no passwords) and visits
 * each screen at 360×800 in the light and the dark theme. Per screen it counts:
 *
 *   texto<14   visible text rendered under 14 px (Material icon ligatures excluded)
 *   tactil<44  tappable elements smaller than 44×44 px
 *   elipsis    text actually cut with an ellipsis (truncate or line-clamp)
 *   contraste  axe-core `color-contrast` violations (nodes)
 *   scroll     1 when, after scrolling with the wheel, the end of the content is
 *              still below the viewport or under a bottom bar (BottomNav, action bar)
 *   barras     sticky/fixed bars with a see-through background (content shows behind)
 *
 * Environment:
 *   AUDIT_BASE_URL         use an already running app instead of starting Vite
 *   AUDIT_BROWSER_CHANNEL  Playwright channel, default msedge (e.g. chrome)
 *   AUDIT_OUT              output folder, default <os tmp>/smartswap-audit
 *   AUDIT_THEMES           comma list, default light,dark
 *   AUDIT_ONLY             comma list of screen ids to run
 *
 * Writes report.md, report.json and one screenshot per screen and theme.
 * Exit code 0 only when every metric is 0.
 */
import { chromium } from 'playwright-core';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { respond } from './audit-ui-fixtures.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AXE_PATH = require.resolve('axe-core/axe.min.js');
const PORT = 5199;
const CHANNEL = process.env.AUDIT_BROWSER_CHANNEL ?? 'msedge';
const OUT = process.env.AUDIT_OUT ?? join(tmpdir(), 'smartswap-audit');
const THEMES = (process.env.AUDIT_THEMES ?? 'light,dark').split(',').map((t) => t.trim());
const ONLY = process.env.AUDIT_ONLY ? process.env.AUDIT_ONLY.split(',').map((s) => s.trim()) : null;
const VIEWPORT = { width: 360, height: 800 };
const API_PREFIX = '/api/v1';

/** A 1×1 PNG used as the item photo in the Publish flow. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const METRICS = ['texto<14', 'tactil<44', 'elipsis', 'contraste', 'scroll', 'barras'];

/**
 * Screens in visiting order. `auth: false` runs without a session.
 * `go` drives the page to the screen; the default is a plain navigation.
 */
const SCREENS = [
  { id: 'login', path: '/login', auth: false },
  { id: 'register', path: '/register', auth: false },
  { id: 'home', path: '/home' },
  { id: 'explore', path: '/explore' },
  { id: 'publish', path: '/publish' },
  {
    // Step 2 is the long form: upload a photo the way the file picker would, then continue
    id: 'publish-info',
    path: '/publish',
    go: async (page) => {
      await page.setInputFiles('input[type=file]', { name: 'foto.png', mimeType: 'image/png', buffer: TINY_PNG });
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: /continuar|continue/i }).click();
      await page.waitForSelector('#description');
    },
  },
  { id: 'trades', path: '/swaps' },
  { id: 'profile', path: '/profile' },
  { id: 'notifications', path: '/notifications' },
  { id: 'configure', path: '/swap/configure' },
  { id: 'searching', path: '/swap/searching?have=i-me-1&q=Bicicleta', settleMs: 600 },
  { id: 'results', path: '/swap/results?have=i-me-1&q=Bicicleta' },
  { id: 'route-detail', path: '/swap/route/r-active' },
  {
    id: 'proposal-confirm',
    path: '/swap/route/r-suggested',
    go: async (page) => {
      await page.locator('main button').filter({ hasText: /propon|propos|enviar|send/i }).last().click();
      await page.waitForURL('**/swap/proposal/confirm');
    },
  },
  {
    id: 'proposal-sent',
    path: '/swap/route/r-suggested',
    go: async (page) => {
      await page.locator('main button').filter({ hasText: /propon|propos|enviar|send/i }).last().click();
      await page.waitForURL('**/swap/proposal/confirm');
      // The native checkbox is visually hidden; tap its label like a person would
      await page.locator('main label:has(input[type=checkbox])').click();
      await page.locator('main button').filter({ hasText: /confirm|enviar|send/i }).last().click();
      await page.waitForURL('**/swap/proposal/sent');
    },
  },
];

// ---------------------------------------------------------------------------
// Measurements, executed inside the page
// ---------------------------------------------------------------------------

/* eslint-disable no-undef */
function measureInPage() {
  const isVisible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const describe = (el) => {
    const text = (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().replace(/\s+/g, ' ');
    return `${el.tagName.toLowerCase()}: ${text.slice(0, 40)}`;
  };

  // 1. Text under 14 px
  const smallText = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim()) continue;
    const el = node.parentElement;
    if (!el || !isVisible(el)) continue;
    const cs = getComputedStyle(el);
    if (/Material Symbols/i.test(cs.fontFamily)) continue;
    if (['STYLE', 'SCRIPT', 'TITLE'].includes(el.tagName)) continue;
    if (parseFloat(cs.fontSize) < 14) smallText.add(el);
  }

  // 2. Tap targets under 44×44
  const tappable = document.querySelectorAll(
    'a[href],button,[role=button],[role=tab],[role=switch],[role=link],[role=checkbox],[role=radio],[role=option],input:not([type=hidden]),select,textarea,summary',
  );
  const smallTargets = [];
  for (const el of tappable) {
    if (!isVisible(el) || el.closest('[aria-hidden="true"],[inert]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 44 - 0.5 || r.height < 44 - 0.5) smallTargets.push(`${describe(el)} (${Math.round(r.width)}×${Math.round(r.height)})`);
  }

  // 3. Text cut with an ellipsis
  const ellipsis = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!isVisible(el)) continue;
    const cs = getComputedStyle(el);
    const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none';
    const cutX = cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1;
    const cutY = clamp && el.scrollHeight > el.clientHeight + 1;
    if (cutX || cutY) ellipsis.push(describe(el));
  }

  // 5. Bars that let the content show through
  const bars = [];
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'sticky' && cs.position !== 'fixed') continue;
    if (!isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < innerWidth / 2 || r.height > innerHeight * 0.6) continue;
    const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
    const alpha = m ? Number(m[1].split(/[ ,/]+/).filter(Boolean)[3] ?? 1) : 1;
    if (cs.backgroundColor === 'transparent' || alpha < 1) bars.push(`${describe(el)} (alpha ${alpha})`);
  }

  return {
    'texto<14': [...smallText].map(describe),
    'tactil<44': smallTargets,
    elipsis: ellipsis,
    barras: bars,
  };
}

/** After scrolling to the end: is the last piece of content visible above every bottom bar? */
function scrollEndInPage() {
  const isFixedLike = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).position === 'fixed') return n;
    }
    return null;
  };
  // Lowest point that is not covered by a bottom bar
  let limit = innerHeight;
  for (const el of document.body.querySelectorAll('*')) {
    if (getComputedStyle(el).position !== 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.height < 1 || r.width < innerWidth / 2 || r.height > innerHeight * 0.6) continue;
    if (r.bottom < innerHeight - 2) continue;
    for (const part of [el, ...el.querySelectorAll('*')]) {
      const pr = part.getBoundingClientRect();
      if (pr.height > 0 && pr.top > innerHeight / 2) limit = Math.min(limit, pr.top);
    }
  }
  // Lowest piece of real content (text, images, controls) outside fixed layers
  const root = document.querySelector('main') ?? document.body;
  let bottom = 0;
  let last = '';
  for (const el of root.querySelectorAll('*')) {
    if (isFixedLike(el)) continue;
    const isLeaf =
      ['IMG', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'svg'].includes(el.tagName) ||
      [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
    if (!isLeaf) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.bottom > bottom) {
      bottom = r.bottom;
      last = (el.innerText || el.tagName).trim().slice(0, 40);
    }
  }
  return { ok: bottom <= limit + 1, bottom: Math.round(bottom), limit: Math.round(limit), last };
}
/* eslint-enable no-undef */

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const waitForServer = async (url, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`The mobile app did not start at ${url}`);
};

const startVite = () => {
  const child = spawn('npm', ['--workspace=mobile', 'run', 'dev', '--', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    shell: true,
    env: { ...process.env, VITE_API_URL: `http://audit.local${API_PREFIX}`, VITE_DEMO_PASSWORD: '' },
    stdio: 'ignore',
  });
  return child;
};

const stopVite = (child) => {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // already gone
    }
  } else {
    child.kill('SIGTERM');
  }
};

const newContext = async (browser, theme, withSession) => {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    locale: 'es-CO',
    colorScheme: theme,
  });
  await context.addInitScript(
    ([t, session]) => {
      localStorage.setItem('smartswap_theme', t);
      localStorage.setItem('smartswap_locale', 'es');
      if (session) localStorage.setItem('smartswap_jwt_token', 'audit-token');
      else localStorage.removeItem('smartswap_jwt_token');
    },
    [theme, withSession],
  );
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith(API_PREFIX) && url.host !== `localhost:${PORT}`) {
      const answer = respond(route.request().method(), url.pathname.slice(API_PREFIX.length) + url.search);
      if (!answer) return route.fulfill({ status: 404, json: { message: 'audit: no fixture' } });
      const [status, body] = answer;
      return route.fulfill({ status, json: body });
    }
    if (url.hostname === 'localhost' || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    return route.abort();
  });
  return context;
};

const auditScreen = async (context, base, screen, theme) => {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(`${base}${screen.path}`, { waitUntil: 'networkidle' });
    if (screen.go) await screen.go(page);
    await page.waitForTimeout(screen.settleMs ?? 1200);
    await page.screenshot({ path: join(OUT, `${screen.id}-${theme}.png`) });

    const found = await page.evaluate(measureInPage);
    await page.addScriptTag({ path: AXE_PATH });
    const axe = await page.evaluate(async () => {
      // eslint-disable-next-line no-undef
      const r = await axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } });
      return {
        violations: r.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(' ')} — ${n.any[0]?.message ?? ''}`)),
        incomplete: r.incomplete.reduce((sum, v) => sum + v.nodes.length, 0),
      };
    });

    // Scroll like a finger would: wheel events follow the same scroll chaining as touch
    await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
    for (let i = 0; i < 20; i += 1) {
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(400);
    const end = await page.evaluate(scrollEndInPage);
    await page.screenshot({ path: join(OUT, `${screen.id}-${theme}-end.png`) });

    return {
      screen: screen.id,
      theme,
      url: page.url().replace(base, ''),
      details: {
        ...found,
        contraste: axe.violations,
        scroll: end.ok ? [] : [`content ends at ${end.bottom}px, visible up to ${end.limit}px (last: "${end.last}")`],
      },
      axeIncomplete: axe.incomplete,
      errors,
    };
  } catch (error) {
    return { screen: screen.id, theme, url: screen.path, failed: String(error.message ?? error), details: {}, errors };
  } finally {
    await page.close();
  }
};

const main = async () => {
  mkdirSync(OUT, { recursive: true });
  let vite = null;
  let base = process.env.AUDIT_BASE_URL?.replace(/\/+$/, '');
  if (!base) {
    base = `http://localhost:${PORT}`;
    vite = startVite();
    await waitForServer(base, 90000);
  }

  const browser = await chromium.launch({ channel: CHANNEL, headless: true });
  const rows = [];
  try {
    for (const theme of THEMES) {
      const contexts = {
        anon: await newContext(browser, theme, false),
        session: await newContext(browser, theme, true),
      };
      for (const screen of SCREENS) {
        if (ONLY && !ONLY.includes(screen.id)) continue;
        const ctx = screen.auth === false ? contexts.anon : contexts.session;
        const row = await auditScreen(ctx, base, screen, theme);
        rows.push(row);
        const counts = METRICS.map((m) => `${m}=${row.details[m]?.length ?? '?'}`).join(' ');
        console.log(`${row.failed ? 'ERROR' : 'ok   '} ${theme.padEnd(5)} ${screen.id.padEnd(17)} ${row.failed ?? counts}`);
      }
      await contexts.anon.close();
      await contexts.session.close();
    }
  } finally {
    await browser.close();
    stopVite(vite);
  }

  const count = (row, m) => row.details[m]?.length ?? 0;
  const lines = [
    `# audit:ui — ${VIEWPORT.width}×${VIEWPORT.height}`,
    '',
    `| Pantalla | Tema | ${METRICS.join(' | ')} |`,
    `|---|---|${METRICS.map(() => '---:').join('|')}|`,
    ...rows.map((r) => `| ${r.screen}${r.failed ? ' (ERROR)' : ''} | ${r.theme} | ${METRICS.map((m) => count(r, m)).join(' | ')} |`),
  ];
  for (const theme of THEMES) {
    const own = rows.filter((r) => r.theme === theme);
    lines.push(`| **Total** | **${theme}** | ${METRICS.map((m) => `**${own.reduce((s, r) => s + count(r, m), 0)}**`).join(' | ')} |`);
  }
  const report = lines.join('\n');
  writeFileSync(join(OUT, 'report.md'), `${report}\n`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(rows, null, 2));
  console.log(`\n${report}\n\nDetails and screenshots: ${OUT}`);

  const failed = rows.some((r) => r.failed || METRICS.some((m) => count(r, m) > 0));
  process.exit(failed ? 1 : 0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
