#!/usr/bin/env node
/**
 * Browser smoke test of the seeded demo network (`npm run smoke:demo`).
 *
 * Needs the API and the mobile web app already running, and the demo seed applied
 * (`npm --workspace=api run db:seed`). The mobile app must be started with
 * VITE_DEMO_PASSWORD so the demo account switcher is visible.
 *
 * Environment:
 *   SMOKE_DEMO_PASSWORD   required; same value as SEED_DEMO_PASSWORD / VITE_DEMO_PASSWORD
 *   SMOKE_BASE_URL        mobile app, default http://localhost:5173
 *   SMOKE_API_URL         API, default http://localhost:3000/api/v1
 *   SMOKE_BROWSER_CHANNEL Playwright browser channel, default msedge (e.g. chrome)
 *   SMOKE_OUT             screenshot folder, default <os tmp>/smartswap-smoke
 *   SMOKE_NEW_USER=1      also register a throwaway user to check the empty states. It
 *                         leaves a `qa.smoke.*@example.com` row behind: delete it afterwards.
 *
 * Exit code 0 when every check passes, 1 otherwise.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = (process.env.SMOKE_BASE_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
const API = (process.env.SMOKE_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/+$/, '');
const CHANNEL = process.env.SMOKE_BROWSER_CHANNEL ?? 'msedge';
const OUT = process.env.SMOKE_OUT ?? join(tmpdir(), 'smartswap-smoke');
const WITH_NEW_USER = process.env.SMOKE_NEW_USER === '1';
const DEMO_PASSWORD = process.env.SMOKE_DEMO_PASSWORD;

if (!DEMO_PASSWORD) {
  console.error('Set SMOKE_DEMO_PASSWORD (the demo accounts password).');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

// The API sits behind a remote database: give lists time to arrive before asserting.
const SETTLE_MS = 4500;

const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` ${extra}` : ''}`);
};

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-CO' });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

const shot = (name) => page.screenshot({ path: join(OUT, `${name}.png`) });
const bodyText = () => page.locator('body').innerText();
const tab = (label) => page.getByRole('button', { name: new RegExp(label, 'i') });

try {
  // 1. Login screen lists the six seeded accounts
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('section[aria-label="Cuentas demo"]', { timeout: 30000 });
  const accounts = await page.locator('section[aria-label="Cuentas demo"] button').count();
  check('switcher shows the 6 demo accounts', accounts === 6, `(${accounts})`);
  await shot('01-login-switcher');

  // 2. One tap as Alex
  await page.getByRole('button', { name: 'Entrar como Alex' }).click();
  await page.waitForURL('**/home', { timeout: 30000 });
  await page.waitForSelector('text=Hola, Alex', { timeout: 20000 });
  await page.waitForSelector('text=Mochila', { timeout: 20000 });
  let text = await bodyText();
  check('Alex lands on /home with his in-progress route', text.includes('Mochila') && text.includes('Parlante'));
  check('home has no demo leftovers', !/SR-8492|Fujifilm|1,420|Alex Morales/.test(text));
  await shot('02-home-alex');

  // 3. Canjes tabs for Alex
  await page.goto(`${BASE}/swaps`);
  await page.waitForTimeout(SETTLE_MS);
  check('Alex Recibidas is an empty state', (await bodyText()).includes('No tienes propuestas por responder'));
  await tab('Enviadas').click();
  check('Alex Enviadas lists SW-4821', (await bodyText()).includes('SW-4821'));
  await tab('En curso').click();
  text = await bodyText();
  check('Alex En curso shows SW-4821 with 2 of 3 steps', text.includes('SW-4821') && /2 de 3/.test(text));
  await shot('03-trades-en-curso-alex');

  // 4. The engine through the UI: bike for a guitar is a 2-person cycle with Valeria
  await page.goto(`${BASE}/swap/configure`);
  await page.waitForSelector('text=Lo que ofreces', { timeout: 15000 });
  await page.waitForTimeout(800);
  for (let i = 0; i < 4 && !(await bodyText()).includes('Bicicleta de montaña'); i++) {
    await page.getByRole('button', { name: 'Cambiar', exact: true }).click();
  }
  await page.getByPlaceholder(/Ej\./).fill('Guitarra');
  await page.getByRole('button', { name: /Buscar Rutas Inteligentes/ }).click();
  await page.waitForURL('**/swap/results**', { timeout: 40000 });
  await page.waitForSelector('text=Valeria', { timeout: 30000 });
  check('search finds the 2-person cycle with Valeria', (await bodyText()).includes('Valeria'));
  await shot('04-results-bike');

  // 5. Switch accounts from the profile: Alex -> Diego -> Laura
  await page.goto(`${BASE}/profile`);
  await page.waitForSelector('section[aria-label="Cuentas demo"]', { timeout: 15000 });
  await page.getByRole('button', { name: 'Entrar como Diego' }).click();
  await page.waitForURL('**/home', { timeout: 30000 });
  await page.waitForSelector('text=Hola, Diego', { timeout: 20000 });
  text = await bodyText();
  check('switching lands on Diego with no Alex data', text.includes('Hola, Diego') && !text.includes('Hola, Alex'));
  await page.goto(`${BASE}/swaps`);
  await page.waitForTimeout(SETTLE_MS);
  text = await bodyText();
  check('Diego Recibidas has the pending proposal from Alex', /Alex/.test(text) && /Aceptar/.test(text));
  await shot('05-trades-recibidas-diego');

  await page.goto(`${BASE}/profile`);
  await page.getByRole('button', { name: 'Entrar como Laura' }).click();
  await page.waitForURL('**/home', { timeout: 30000 });
  await page.waitForSelector('text=Hola, Laura', { timeout: 20000 });
  await page.goto(`${BASE}/swaps`);
  await page.waitForTimeout(SETTLE_MS);
  await tab('En curso').click();
  text = await bodyText();
  check('Laura (outside the proposal) has an empty En curso', text.includes('No tienes trueques en curso') && !text.includes('SW-4821'));

  // 6. Optional: a brand-new user sees every empty state
  if (WITH_NEW_USER) {
    const email = `qa.smoke.${Date.now()}@example.com`;
    const password = 'QaSmoke-Temp#2026';
    const registration = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Usuario Nuevo', municipalityCode: '52001' }),
    });
    check('throwaway user registered', registration.ok, `(${registration.status}) ${email}`);
    await page.goto(`${BASE}/login`);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE}/login`);
    await page.getByPlaceholder(/correo|email/i).first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: /Iniciar sesión|Entrar|Ingresar/i }).first().click();
    await page.waitForURL('**/home', { timeout: 30000 });
    await page.waitForTimeout(SETTLE_MS + 500);
    check('new user Home invites to publish', (await bodyText()).includes('Publica tu primer objeto'));
    await shot('06-new-user-home');
    await page.goto(`${BASE}/swaps`);
    await page.waitForTimeout(SETTLE_MS);
    check('new user Recibidas is empty', (await bodyText()).includes('No tienes propuestas por responder'));
    await tab('Enviadas').click();
    check('new user Enviadas is empty', (await bodyText()).includes('Aún no has enviado propuestas'));
    await tab('En curso').click();
    check('new user En curso is empty', (await bodyText()).includes('No tienes trueques en curso'));
    await page.goto(`${BASE}/notifications`);
    await page.waitForTimeout(SETTLE_MS);
    await page.getByRole('button', { name: 'Canjes', exact: true }).click();
    check('new user Notificaciones (Canjes) is empty', (await bodyText()).includes('No tienes notificaciones'));
    await page.goto(`${BASE}/explore`);
    await page.waitForTimeout(SETTLE_MS);
    await page.getByPlaceholder(/Buscar/).first().fill('zzzzzz');
    check('Explorar is empty with filters', (await bodyText()).includes('No encontramos objetos con estos filtros'));
  }

  // 7. A failed load shows an error with retry, never made-up data
  await page.route('**/api/v1/routes', (route) => route.abort());
  await page.goto(`${BASE}/swaps`);
  await page.waitForTimeout(SETTLE_MS + 500);
  check('failed load shows the error state with retry', (await bodyText()).includes('Reintentar'));
  await shot('07-error-state');

  check('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '));
} catch (error) {
  check('smoke run completed', false, String(error instanceof Error ? error.message.split('\n')[0] : error));
  await shot('failure').catch(() => undefined);
} finally {
  await browser.close();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed. Screenshots: ${OUT}`);
process.exit(failed.length > 0 ? 1 : 0);
