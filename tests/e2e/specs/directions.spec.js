// The board directions in AI Risk Appetite (development plan task 3.5). In the worked example with the fixture's
// directions loaded: decision 1 shows BD1 to BD3, and check K11 holds back a ceiling above the board's posture until a
// reason and a board revisit are recorded. Set-up loads the file; the link to AI Board Direction answers when it is
// not running (as here) with the reason.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ADMIN, api } from '../helpers.js';

const F = JSON.parse(readFileSync(new URL('../fixtures/board-directions.json', import.meta.url), 'utf8'));

test('decision 1 shows the board’s directions, and K11 holds back a ceiling above BD1', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('/');
  await expect(p.locator('.examplebar', { hasText: 'Worked example:' })).toBeVisible({ timeout: 15_000 });
  const before = await p.evaluate(() => window.RAF.checks().map(k => k.id));
  expect(before).not.toContain('K11'); // no directions loaded: K11 does not run

  await p.evaluate((F) => { const S = window.RAF.state; S.boardDirections = { source: 'file', loadedOn: '2026-11-10', file: F }; const c = S.decisions.d1.cells; c['d1.cl.own'] = { ...(c['d1.cl.own'] || {}), value: 'A3', status: 'set', reason: '', boardRevisit: '' }; window.RAF.render(); window.RAF.go('d1'); }, F);
  await expect(p.locator('body')).toContainText('The board’s directions for this decision · BD1, BD2, BD3');
  await expect(p.locator('body')).toContainText('Claims: Cautious · up to A2 · A person decides every decline');
  const k11 = await p.evaluate(() => window.RAF.checks().find(k => k.id === 'K11'));
  expect(k11.state).toBe('fail');
  expect(k11.off.map(o => o.id)).toContain('d1.cl.own');
  expect(k11.off.find(o => o.id === 'd1.cl.own').why).toContain('A3 is above A2');

  // a reason alone is not enough; with a board revisit it passes for that cell
  await p.evaluate(() => { window.RAF.state.decisions.d1.cells['d1.cl.own'].reason = 'Triage only, with sampling'; });
  expect(await p.evaluate(() => window.RAF.checks().find(k => k.id === 'K11').off.map(o => o.id))).toContain('d1.cl.own');
  await p.evaluate(() => { window.RAF.state.decisions.d1.cells['d1.cl.own'].boardRevisit = 'Board meeting 9 December 2026'; });
  expect(await p.evaluate(() => window.RAF.checks().find(k => k.id === 'K11').off.map(o => o.id))).not.toContain('d1.cl.own');
  expect(errs).toEqual([]);
  await ctx.close();
});

test('set-up loads the directions from a file; the link answers with the reason when AI Board Direction is not reached', async ({ browser }) => {
  const r = await api('GET', '/api/directions-from-board');
  expect([502, 503]).toContain(r.status);
  expect(r.body.error).toMatch(/Board Direction app/);

  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); sessionStorage.setItem('triodian.example.left', '1'); } catch (e) {} });
  const saves = []; let serve = null, rev = 0;
  await ctx.route('**/api/engagement', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: serve ? { exists: true, revision: rev, data: serve } : { exists: false, revision: 0, people: [] } });
    serve = route.request().postDataJSON().data; saves.push(serve); rev += 1;
    return route.fulfill({ json: { revision: rev } });
  });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('/admin/'); await p.locator('[data-act="new"]').click();
  await expect(p.locator('body')).toContainText('5 · Board directions');
  await p.setInputFiles('#dirIn', new URL('../fixtures/board-directions.json', import.meta.url).pathname);
  await expect(p.locator('#toast')).toContainText('Board directions loaded: version V2');
  await expect(p.locator('body')).toContainText('Every function matches a BD1 area.');
  await p.evaluate(() => window.RAF.save());
  await expect.poll(() => saves.length && saves[saves.length - 1].boardDirections && saves[saves.length - 1].boardDirections.file.version).toBe('V2');
  expect(errs).toEqual([]);
  await ctx.close();
});
