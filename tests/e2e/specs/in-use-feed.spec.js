// The in-use feed in AI Risk Appetite (development plan task 3.7). Decision 3 takes a register extract v1 or v2: K10
// works from either, and a v2 also puts the measures on decision 8. The link to AI Use Assessment answers when it is
// not running (as here) with the reason.
import { test, expect } from '@playwright/test';
import { ADMIN, api } from '../helpers.js';

const fx = name => new URL('../fixtures/' + name, import.meta.url).pathname;

async function example(browser) {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); p._errors = []; p.on('pageerror', e => p._errors.push(String(e)));
  await p.goto('/'); await expect(p.locator('.examplebar', { hasText: 'Worked example:' })).toBeVisible({ timeout: 15_000 });
  return { ctx, p };
}

for (const [file, v2] of [['register-extract-v1.json', false], ['in-use-feed.json', true]]) {
  test(`decision 3 takes ${v2 ? 'the in-use feed v2' : 'a register extract v1'}, and K10 runs from it`, async ({ browser }) => {
    const { ctx, p } = await example(browser);
    await p.evaluate(() => window.RAF.go('d3'));
    await p.setInputFiles('#extractIn', fx(file));
    await expect(p.locator('#toast')).toContainText(v2 ? 'In-use feed loaded' : 'Register extract loaded');
    const r = await p.evaluate(() => ({ reg: window.RAF.state.current.register, pair: window.RAF.state.current.commonPair, k10: window.RAF.checks().find(k => k.id === 'K10') }));
    expect(r.reg.entries).toBe(3);
    expect(r.pair).toEqual({ tier: 'A3', consequence: 'C4' });
    expect(r.reg.maxReceived).toBe('E3');
    expect(r.k10.state).not.toBe('cannot');
    await p.evaluate(() => window.RAF.go('d8'));
    if (v2) {
      await expect(p.locator('body')).toContainText('In use now · from the AI Use Assessment in-use feed');
      await expect(p.locator('body')).toContainText('Gaps by priority: High 1 · Medium 2 · Low 0. Overdue: 1.');
      await expect(p.locator('body')).toContainText('67%');
    } else await expect(p.locator('body')).not.toContainText('In use now');
    expect(p._errors).toEqual([]);
    await ctx.close();
  });
}

test('the link to AI Use Assessment answers with the reason when it is not reached', async () => {
  const r = await api('GET', '/api/feedback-from-assessment');
  expect([502, 503]).toContain(r.status);
  expect(r.body.error).toMatch(/Use Assessment app/);
});
