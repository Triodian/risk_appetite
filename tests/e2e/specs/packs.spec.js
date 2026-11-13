// Sector packs in set-up (development plan tasks 3.2 and 3.3). The engagement is served from a stub, so the test
// starts from a fresh engagement whatever the shared test engagement holds; every save the page makes is captured.
import { test, expect } from '@playwright/test';
import { ADMIN } from '../helpers.js';

async function adminPage(browser, serve) {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); sessionStorage.setItem('triodian.example.left', '1'); } catch (e) {} });
  const saves = []; let rev = serve ? 1 : 0;
  await ctx.route('**/api/engagement', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: serve ? { exists: true, revision: rev, data: serve } : { exists: false } });
    const d = route.request().postDataJSON().data; saves.push(d); serve = d; rev += 1;
    return route.fulfill({ json: { revision: rev } });
  });
  const p = await ctx.newPage(); p._errors = []; p.on('pageerror', e => p._errors.push(String(e)));
  await p.goto('/admin/'); await p.waitForTimeout(800);
  return { ctx, p, saves };
}

test('choosing the super trustee pack changes the labels, functions and inputs; a position fixes it', async ({ browser }) => {
  const { ctx, p, saves } = await adminPage(browser, null);
  await p.locator('[data-act="new"]').click();
  const pack = p.locator('#f_engagement_sectorPack');
  await expect(pack).toHaveValue('generalInsurer');
  await expect(p.locator('label[for="f_engagement_insurer"], label:has(#f_engagement_insurer)').first()).toContainText('Insurer');

  await pack.selectOption('superTrustee');
  await expect(p.locator('#toast')).toContainText('Superannuation trustee');
  await expect(p.locator('label:has(#f_engagement_insurer)').first()).toContainText('Trustee');
  expect(await p.evaluate(() => window.RAF.state.functions.map(f => f.name)[0])).toBe('Member services and communications');
  await expect(p.locator('body')).toContainText('Administration agreement and group insurance policy terms');
  await expect(p.locator('body')).not.toContainText('binders');
  await p.evaluate(() => window.RAF.save());
  await expect.poll(() => saves.length && saves[saves.length - 1].engagement.sectorPack).toBe('superTrustee');
  const last = saves[saves.length - 1];
  expect(last.functions.map(f => f.id)).toEqual(['ms', 'ci', 'ad', 'iv', 'ap', 'cd', 'fi', 'lc', 'to']);
  expect(last.decisions.d8.events.find(e => e.id === 'e4').event).toBe('A material AI incident, at the trustee or in its supply chain');
  expect(p._errors).toEqual([]);
  await ctx.close();

  // once a position is recorded, the pack cannot be changed
  const withPos = JSON.parse(JSON.stringify(last)); withPos.decisions.d1.cells['d1.ms.own'] = { value: 'A2', condition: '', testable: false, reason: '', proposedBy: '', recordedBy: '', owner: '', dissent: '', status: 'set', notSetOwner: '', notSetDue: '', source: '' };
  const b = await adminPage(browser, withPos);
  await expect(b.p.locator('#f_engagement_sectorPack')).toBeDisabled();
  await expect(b.p.locator('body')).toContainText('It is now fixed, because a position has been recorded.');
  expect(b.p._errors).toEqual([]);
  await b.ctx.close();
});

test('a baseline for a public body names the accountable authority; its functions are the baseline areas', async ({ browser }) => {
  const { ctx, p, saves } = await adminPage(browser, null);
  await p.locator('[data-act="new"]').click();
  const pack = p.locator('#f_engagement_sectorPack');
  await expect(pack.locator('option')).toHaveCount(12);
  await pack.selectOption('bpGovernment');
  await expect(p.locator('label:has(#f_engagement_insurer)').first()).toContainText('Agency');
  await expect(p.locator('#app')).toContainText('accountable authority');
  expect(await p.evaluate(() => /\bboards?\b/.test(document.getElementById('app').innerText))).toBe(false);
  expect(await p.evaluate(() => window.RAF.state.functions.map(f => f.name)[0])).toBe('Service delivery');
  await p.evaluate(() => window.RAF.save());
  await expect.poll(() => saves.length && saves[saves.length - 1].engagement.sectorPack).toBe('bpGovernment');
  // a company's pack names the board again
  await pack.selectOption('bpCiCorporate');
  await expect(p.locator('#app')).toContainText('board');
  expect(p._errors).toEqual([]);
  await ctx.close();
});
