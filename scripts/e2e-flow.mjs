#!/usr/bin/env node
/**
 * Browser end-to-end test of the proposal flow (`npm run e2e:flow`).
 *
 * Starts the mobile app with Vite, answers the API from `audit-ui-fixtures.mjs`
 * and drives a phone-sized browser like a person would:
 *
 *   1. Explore → item detail → New swap (3 steps) → direct proposal → sent.
 *   2. Home → New swap (search the item) → circular → Searching (it must wait for
 *      the user) → results, then back: step 3, 2 and 1, never a second search.
 *   3. No ring found: "Propose a direct swap" replaces Searching, so back from the
 *      confirmation returns to step 3.
 *   4. Own item opened from Profile: only "Delete my item".
 *   5. Explore asks the API without the user's own items and shows none of them.
 *
 * Back is the browser history back, the same `history.back()` Android's back button
 * runs on a secondary screen (see App.tsx). Exit code 0 only when every check passes.
 *
 * Environment: E2E_BROWSER_CHANNEL (default msedge), E2E_OUT (default <os tmp>/smartswap-e2e).
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { respond } from './audit-ui-fixtures.mjs';
import { API_PREFIX, isUp, startVite, stopVite, waitForServer } from './ui-harness.mjs';

const PORT = 5198;
const BASE = `http://localhost:${PORT}`;
const CHANNEL = process.env.E2E_BROWSER_CHANNEL ?? 'msedge';
const OUT = process.env.E2E_OUT ?? join(tmpdir(), 'smartswap-e2e');
const URL_TIMEOUT = 8000;

const results = [];

/** A logged-in phone context whose API answers come from the fixtures; records every call. */
const newPhone = async (browser, scenario = 'default') => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
    locale: 'es-CO',
  });
  await context.addInitScript(() => {
    localStorage.setItem('smartswap_locale', 'es');
    localStorage.setItem('smartswap_theme', 'light');
    localStorage.setItem('smartswap_jwt_token', 'e2e-token');
  });
  const calls = [];
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.startsWith(API_PREFIX) && url.host !== `localhost:${PORT}`) {
      const path = url.pathname.slice(API_PREFIX.length);
      calls.push({ method: request.method(), path, query: url.search, body: request.postDataJSON?.() ?? null });
      const answer = respond(request.method(), path + url.search, scenario);
      if (!answer) return route.fulfill({ status: 404, json: { message: 'e2e: no fixture' } });
      return route.fulfill({ status: answer[0], json: answer[1] });
    }
    if (url.hostname === 'localhost' || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return { context, page, calls, errors };
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const pathOf = (page) => {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}`;
};

const waitPath = (page, pattern) => page.waitForURL((url) => pattern.test(`${url.pathname}${url.search}`), { timeout: URL_TIMEOUT });

const run = async (name, browser, scenario, body) => {
  const phone = await newPhone(browser, scenario);
  try {
    await body(phone);
    assert(phone.errors.length === 0, `page errors: ${phone.errors.join(' | ')}`);
    results.push({ name, ok: true });
    console.log(`ok    ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.log(`FAIL  ${name}\n      ${error.message}\n      at ${pathOf(phone.page)}`);
    await phone.page.screenshot({ path: join(OUT, `${name.replace(/\W+/g, '-')}.png`) }).catch(() => {});
  } finally {
    await phone.context.close();
  }
};

const continueStep = (page) => page.click('[data-testid=configure-continue-button]');

const main = async () => {
  mkdirSync(OUT, { recursive: true });
  if (await isUp(BASE)) throw new Error(`Port ${PORT} is already in use; stop that server and run again.`);
  const logPath = join(OUT, 'vite.log');
  const vite = startVite(PORT, logPath);
  let browser = null;
  try {
    await waitForServer(BASE, vite, 90000, logPath);
    browser = await chromium.launch({ channel: CHANNEL, headless: true });

    await run('direct proposal from the item detail', browser, 'default', async ({ page, calls }) => {
      await page.goto(`${BASE}/explore`, { waitUntil: 'networkidle' });
      assert((await page.locator('main button', { hasText: /^Proponer/ }).count()) === 0, 'Explore cards still show a Propose button');
      await page.click('[data-testid=object-card-i-laura-2]');
      await waitPath(page, /^\/item\/i-laura-2$/);
      await page.click('[data-testid=item-propose-button]');
      await waitPath(page, /^\/swap\/configure\?step=1&want=i-laura-2&fixed=1$/);

      await page.click('[data-testid=offer-option-i-me-1]');
      await continueStep(page);
      await waitPath(page, /step=2/);
      assert((await page.locator('[data-testid=configure-want-search]').count()) === 0, 'step 2 lets the fixed item change');
      assert(await page.getByText('Guitarra acústica Yamaha C40 con estuche').isVisible(), 'step 2 does not show the item from the detail');
      await continueStep(page);
      await waitPath(page, /step=3/);
      await continueStep(page); // Direct is the default type
      await waitPath(page, /^\/swap\/proposal\/confirm$/);

      await page.locator('main label:has(input[type=checkbox])').click();
      await page.locator('main button').filter({ hasText: /enviar/i }).last().click();
      await waitPath(page, /^\/swap\/proposal\/sent$/);
      const direct = calls.filter((call) => call.path === '/routes/direct');
      assert(direct.length === 1, `expected 1 POST /routes/direct, got ${direct.length}`);
      assert(
        direct[0].body?.offeredItemId === 'i-me-1' && direct[0].body?.wantedItemId === 'i-laura-2',
        `wrong direct proposal body ${JSON.stringify(direct[0].body)}`,
      );
      assert(!calls.some((call) => call.path === '/routes/search'), 'a direct proposal searched rings');

      // The back arrow of "Proposal sent" goes Home, never back to the sent form
      await page.getByRole('button', { name: 'Volver atrás' }).click();
      await waitPath(page, /^\/home$/);
    });

    await run('circular search waits, and back walks the steps without searching again', browser, 'default', async ({ page, calls }) => {
      await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' });
      await page.goto(`${BASE}/swap/configure`, { waitUntil: 'networkidle' });
      await page.click('[data-testid=offer-option-i-me-1]');
      await continueStep(page);
      await waitPath(page, /step=2/);
      await page.fill('[data-testid=configure-want-search]', 'bicicleta');
      await page.click('[data-testid=want-option-i-laura-1]');
      await continueStep(page);
      await waitPath(page, /step=3/);
      await page.click('[data-testid=swap-mode-circular]');
      await continueStep(page);
      await waitPath(page, /^\/swap\/searching\?/);

      await page.waitForSelector('[data-testid=searching-view-routes]');
      await page.waitForTimeout(5000);
      assert(/^\/swap\/searching\?/.test(pathOf(page)), 'Searching moved on by itself');
      const searches = calls.filter((call) => call.path === '/routes/search');
      assert(searches.length === 1, `expected 1 search, got ${searches.length}`);
      const body = searches[0].body ?? {};
      assert(
        body.wantedItemId === 'i-laura-1' && body.minSteps === 3 && body.offeredItemId === 'i-me-1',
        `search does not ask for rings toward the chosen item: ${JSON.stringify(body)}`,
      );

      await page.click('[data-testid=searching-view-routes]');
      await waitPath(page, /^\/swap\/results\?/);

      await page.goBack();
      await waitPath(page, /^\/swap\/configure\?step=3/);
      assert(await page.locator('[data-testid=swap-mode-circular] input').isChecked(), 'step 3 lost the circular choice');
      await page.goBack();
      await waitPath(page, /^\/swap\/configure\?step=2/);
      await page.goBack();
      await waitPath(page, /^\/swap\/configure\?step=1/);
      await page.waitForTimeout(800);
      const after = calls.filter((call) => call.path === '/routes/search').length;
      assert(after === 1, `going back searched again (${after} searches)`);
    });

    await run('a ring found is sent as a ring, not as a direct offer', browser, 'default', async ({ page, calls }) => {
      await page.goto(`${BASE}/swap/configure?step=3&have=i-me-1&want=i-laura-1&mode=circular`, { waitUntil: 'networkidle' });
      await continueStep(page);
      await page.click('[data-testid=searching-view-routes]');
      await waitPath(page, /^\/swap\/results\?/);
      await page.getByRole('button', { name: 'Ver ruta' }).first().click();
      await waitPath(page, /^\/swap\/route\//);
      await page.locator('main button').filter({ hasText: /propon|propos/i }).last().click();
      await waitPath(page, /^\/swap\/proposal\/confirm$/);
      await page.locator('main label:has(input[type=checkbox])').click();
      await page.locator('main button').filter({ hasText: /enviar/i }).last().click();
      await waitPath(page, /^\/swap\/proposal\/sent$/);
      assert(calls.filter((call) => call.path === '/routes/propose').length === 1, 'the ring was not sent once');
      assert(!calls.some((call) => call.path === '/routes/direct'), 'a ring was sent as a direct offer');
    });

    await run('no ring: propose direct, and back returns to step 3', browser, 'noRings', async ({ page, calls }) => {
      await page.goto(`${BASE}/swap/configure?step=3&have=i-me-1&want=i-laura-1&mode=circular`, { waitUntil: 'networkidle' });
      await continueStep(page);
      await page.waitForSelector('[data-testid=searching-propose-direct]');
      assert(await page.getByTestId('searching-back').isVisible(), 'the empty state has no Back button');
      await page.click('[data-testid=searching-propose-direct]');
      await waitPath(page, /^\/swap\/proposal\/confirm$/);
      await page.goBack();
      await waitPath(page, /^\/swap\/configure\?step=3/);
      // And forward again to send it: the direct offer carries both chosen items
      await continueStep(page);
      await page.click('[data-testid=searching-propose-direct]');
      await waitPath(page, /^\/swap\/proposal\/confirm$/);
      await page.locator('main label:has(input[type=checkbox])').click();
      await page.locator('main button').filter({ hasText: /enviar/i }).last().click();
      await waitPath(page, /^\/swap\/proposal\/sent$/);
      const direct = calls.filter((call) => call.path === '/routes/direct');
      assert(
        direct.length === 1 && direct[0].body?.offeredItemId === 'i-me-1' && direct[0].body?.wantedItemId === 'i-laura-1',
        `wrong direct proposal: ${JSON.stringify(direct.map((call) => call.body))}`,
      );
      await page.goBack();
      await waitPath(page, /^\/swap\/configure\?step=3/);
      await page.waitForTimeout(800);
      const searches = calls.filter((call) => call.path === '/routes/search').length;
      assert(searches === 2, `expected 2 searches (one per visit), got ${searches}`);
    });

    await run('a reserved item says so, without offering a direct swap', browser, 'wantReserved', async ({ page }) => {
      await page.goto(`${BASE}/swap/configure?step=3&have=i-me-1&want=i-laura-1&mode=circular`, { waitUntil: 'networkidle' });
      await continueStep(page);
      await page.getByText('Este artículo ya no está disponible').waitFor();
      assert((await page.locator('[data-testid=searching-propose-direct]').count()) === 0, 'offers a direct swap for a reserved item');
      await page.click('[data-testid=searching-back]');
      await waitPath(page, /^\/swap\/configure\?step=3/);
    });

    await run('an offered item that is gone sends the user back to step 1 with a notice', browser, 'default', async ({ page }) => {
      await page.goto(`${BASE}/swap/configure?step=3&have=i-gone&want=i-laura-1&mode=direct`, { waitUntil: 'networkidle' });
      await page.getByTestId('configure-offer-gone').waitFor();
      assert(await page.getByText('Paso 1 de 3').isVisible(), 'did not go back to step 1');
    });

    await run('no ring: Back returns to step 3', browser, 'noRings', async ({ page }) => {
      await page.goto(`${BASE}/swap/configure?step=3&have=i-me-1&want=i-laura-1&mode=circular`, { waitUntil: 'networkidle' });
      await continueStep(page);
      await page.click('[data-testid=searching-back]');
      await waitPath(page, /^\/swap\/configure\?step=3/);
    });

    await run('own item from Profile only offers to delete it', browser, 'default', async ({ page }) => {
      await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
      await page.click('[data-testid=profile-item-i-me-1]');
      await waitPath(page, /^\/item\/i-me-1$/);
      assert(await page.getByRole('button', { name: /eliminar mi publicación/i }).isVisible(), 'no delete button on the own item');
      assert((await page.locator('[data-testid=item-propose-button]').count()) === 0, 'own item offers a proposal');
    });

    await run('every screen opens at the top; Explore keeps its place and offers Back to top', browser, 'default', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 480 });
      await page.goto(`${BASE}/explore`, { waitUntil: 'networkidle' });
      assert((await page.locator('[data-testid=back-to-top]').count()) === 0, 'Back to top shows before scrolling');
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(400);
      const explorePosition = await page.evaluate(() => window.scrollY);
      assert(explorePosition > 480, `Explore did not scroll more than one screen (${explorePosition})`);
      assert(await page.getByTestId('back-to-top').isVisible(), 'Back to top missing after one screen');

      await page.locator('[data-testid^=object-card-]').last().click();
      await waitPath(page, /^\/item\//);
      await page.waitForTimeout(300);
      assert((await page.evaluate(() => window.scrollY)) === 0, 'the item detail did not open at the top');

      await page.goBack();
      await waitPath(page, /^\/explore$/);
      await page.waitForTimeout(400);
      const back = await page.evaluate(() => window.scrollY);
      assert(Math.abs(back - explorePosition) < 4, `Explore lost its place (${back} vs ${explorePosition})`);

      await page.getByTestId('back-to-top').click();
      await page.waitForFunction(() => window.scrollY === 0, null, { timeout: 3000 });
    });

    await run('Explore leaves out the own items', browser, 'default', async ({ page, calls }) => {
      await page.goto(`${BASE}/explore`, { waitUntil: 'networkidle' });
      const listCalls = calls.filter((call) => call.path === '/items' && call.method === 'GET');
      assert(listCalls.length > 0 && listCalls.every((call) => call.query.includes('excludeOwnerId=u-me')), `Explore asked for the catalog with the own items: ${listCalls.map((call) => call.query).join(' ; ')}`);
      assert((await page.locator('[data-testid=object-card-i-me-1]').count()) === 0, 'Explore shows an own item');
      assert((await page.locator('[data-testid^=object-card-]').count()) === 5, 'Explore does not show the 5 items of other users');
    });
  } finally {
    await browser?.close();
    stopVite(vite);
  }

  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} flows passed`);
  process.exitCode = failed.length === 0 && results.length > 0 ? 0 : 1;
};

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
