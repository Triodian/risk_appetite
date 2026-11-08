// Sector packs (development plan tasks 3.1 to 3.3). With the general insurer pack, the worked example's screens and
// outputs are word for word what they were before the wording became tokens. The golden copies in tests/e2e/golden
// were captured from the app before any token was introduced; GOLDEN=update rewrites them (only do that on purpose).
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { ADMIN } from '../helpers.js';

const DIR = new URL('../golden/insurer/', import.meta.url);
const UPDATE = process.env.GOLDEN === 'update';
const SCREENS = ['overview', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'checks', 'challenge', 'outputs', 'reference'];
const OUTPUTS = ['pack', 'paper', 'statement', 'schedule', 'session', 'calibration', 'checks', 'plan'];

async function capture(browser) {
  // Times in the outputs follow the browser's zone; the golden copies were captured in Brisbane, so the test runs there.
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 }, timezoneId: 'Australia/Brisbane', locale: 'en-AU' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');
  await expect(page.locator('.examplebar', { hasText: 'Worked example:' })).toBeVisible({ timeout: 15_000 });
  const got = await page.evaluate(async ({ SCREENS, OUTPUTS }) => {
    const d = new Date(), M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const p2 = (n) => String(n).padStart(2, '0');
    const todays = [`${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`, `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`];
    const norm = (s) => todays.reduce((t, x) => t.split(x).join('[today]'), s).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
    const out = {};
    for (const s of SCREENS) { RAF.go(s); await new Promise(r => setTimeout(r, 60)); out['screen-' + s] = norm(document.getElementById('app').innerText); }
    for (const t of OUTPUTS) out['output-' + t] = norm(RAF.output(t));
    // The content the app works from, keys sorted; the pack list itself is left out (it is not wording on screen).
    const sorted = (o) => Array.isArray(o) ? o.map(sorted) : o && typeof o === 'object' ? Object.fromEntries(Object.keys(o).filter(k => k !== 'packs' && k !== 'pack').sort().map(k => [k, sorted(o[k])])) : o;
    out['content-labels'] = norm(JSON.stringify(sorted(RAF.content ? RAF.content() : window.RAF_CONTENT), null, 1));
    return out;
  }, { SCREENS, OUTPUTS });
  await ctx.close();
  return { got, errors };
}

test('the general insurer pack reproduces the worked example word for word', async ({ browser }) => {
  const { got, errors } = await capture(browser);
  expect(errors).toEqual([]);
  if (UPDATE) { mkdirSync(DIR, { recursive: true }); for (const [k, v] of Object.entries(got)) writeFileSync(new URL(k + '.txt', DIR), v); return; }
  for (const [k, v] of Object.entries(got)) {
    const f = new URL(k + '.txt', DIR);
    expect(existsSync(f), `golden copy ${k}.txt`).toBe(true);
    expect(v, k).toBe(readFileSync(f, 'utf8'));
  }
});
