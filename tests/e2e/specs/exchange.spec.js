// The files AI Risk Appetite writes and reads conform to the published exchange schemas (Triodian_Metamodel
// exchange/, vendored in vendor/exchange by tools/sync-exchange.mjs; development plan task R.4).
import { test, expect } from '@playwright/test';
import { ADMIN } from '../helpers.js';
import { exchangeErrors, fixture } from '../exchange.js';
import { boardView } from '../../../lib/core/api.js';

test('writes: the calibration set and the board view, from the worked example', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); await p.goto('/');
  await expect(p.locator('.examplenote', { hasText: 'Worked example:' })).toBeVisible({ timeout: 15_000 });
  const { set, state } = await p.evaluate(() => ({ set: window.RAF.calibrationSet(), state: JSON.parse(JSON.stringify(window.RAF.state)) }));
  expect(exchangeErrors('calibration-set-v1.schema.json', set)).toEqual([]);
  // the board view as GET /api/board-view answers it for that engagement, once agreed and approved
  const c = state.calibration; c.status = 'approved'; c.version = 1; c.approvedOn = '2026-12-02'; c.minuteRef = 'Board minute 2026/12-04';
  c.issued = [{ version: 1, status: 'approved', on: '2026-12-02', by: 'The Board', minuteRef: 'Board minute 2026/12-04', set }];
  state.inUse = { on: '2026-12-01', source: 'assessment', generated: '2026-12-01T00:00:00Z', entries: 3, ...fixture('in-use-feed.json') && { measures: fixture('in-use-feed.json').measures.map(m => ({ ...m, measure: 'x', limit: '0' })), gapsByPriority: { High: 1, Medium: 0, Low: 0 }, overdue: [] } };
  const v = await boardView({ init: async () => {}, getEngagement: async () => ({ data: state, revision: 1 }) });
  expect(v.status).toBe(200);
  expect(exchangeErrors('board-view-v1.schema.json', v.body)).toEqual([]);
  await ctx.close();
});

test('reads: the board directions and the register extracts it is tested with conform', () => {
  expect(exchangeErrors('board-directions-v1.schema.json', fixture('board-directions.json'))).toEqual([]);
  expect(exchangeErrors('register-extract-v2.schema.json', fixture('in-use-feed.json'))).toEqual([]);
  expect(exchangeErrors('register-extract-v1.schema.json', fixture('register-extract-v1.json'))).toEqual([]);
});
