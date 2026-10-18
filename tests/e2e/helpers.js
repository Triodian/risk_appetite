// Shared helpers: call the API or open a page as a given user.
import { BASE } from './playwright.config.js';
export { BASE };
export const ADMIN = 'damian.hickey@triodian.com';
export const U = { counsel: 'counsel@ra.test', recorder: 'recorder@ra.test', cro: 'cro@ra.test', risk: 'risk@ra.test', ir: 'ir@ra.test', board: 'board@ra.test' };
export const ROLE = { counsel: 'counsel', recorder: 'triodian', cro: 'cro', risk: 'risk', ir: 'independent', board: 'board' };

export async function api(method, path, body, as = ADMIN) {
  const r = await fetch(BASE + path, { method, headers: { 'X-Dev-User': as, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null; try { json = await r.json(); } catch (e) { /* not JSON */ }
  return { status: r.status, body: json };
}

/** Read the engagement, let `change` edit a copy, save it as `as`. Returns the save response. */
export async function editAs(as, change) {
  const cur = await api('GET', '/api/engagement', undefined, as);
  const data = structuredClone(cur.body.data);
  change(data);
  return api('PUT', '/api/engagement', { revision: cur.body.revision, data }, as);
}

/** A page signed in as `as`, collecting script errors in page._errors. */
export async function pageAs(browser, as, path = '/') {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': as }, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page._errors = [];
  page.on('pageerror', e => page._errors.push(String(e)));
  page.on('dialog', d => d.accept());
  await page.goto(path); await page.waitForTimeout(800);
  return page;
}
