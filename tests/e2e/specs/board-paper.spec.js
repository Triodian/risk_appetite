// The board paper in plain words (development plan task 3.8), generated from the worked example: what the board is
// asked to resolve, the eight positions as sentences, and the changes since last year.
import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { ADMIN } from '../helpers.js';

test('the board paper generates from the worked example', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 }, timezoneId: 'Australia/Brisbane' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('/'); await expect(p.locator('.examplenote', { hasText: 'Worked example:' })).toBeVisible({ timeout: 15_000 });
  const md = await p.evaluate(() => window.RAF.output('paper'));
  if (process.env.SHOW_PAPER) writeFileSync(process.env.SHOW_PAPER, md);
  expect(md.split('\n')[0]).not.toBe('');
  expect(md).toContain('# Board paper: the AI risk appetite in plain words');
  expect(md).toContain('## What the board is asked to resolve');
  for (const [i, name] of ['Authority', 'Consequence thresholds', 'Evidence expected', 'Shortfall tolerance', 'Unknowns', 'Location and concentration', 'Triggers', 'Change and review'].entries()) expect(md).toContain(`### ${i + 1}. ${name}`);
  expect(md).toContain('## Changes since last year');
  expect(md).toContain('- **Claims.** Own staff: up to');
  expect(md).not.toMatch(/\b(must|required to|complies|compliant)\b/i); // the language rules: what was recorded, not what the law requires
  expect(md).not.toContain('undefined');
  // in a review, the changes since last year's approved version
  const review = await p.evaluate(() => { const S = window.RAF.state, id = 'd1.cl.own', was = S.decisions.d1.cells[id].value; S.previous = { version: 3, approvedOn: '2025-11-20', minuteRef: 'Board minute 2025/11-02', cells: { [id]: ['A2'] } }; const md = window.RAF.output('paper'); return { md, was }; });
  expect(review.md).toContain('The board approved version 3 on 20 November 2025 (minute Board minute 2025/11-02). 1 position has changed since then:');
  expect(review.md).toMatch(new RegExp('Claims · Own staff \\| A2[^|]* \\| ' + review.was));
  // it is on the Outputs screen with the others
  await p.evaluate(() => window.RAF.go('outputs'));
  await expect(p.locator('body')).toContainText('Board paper (plain words)');
  expect(errs).toEqual([]);
  await ctx.close();
});
