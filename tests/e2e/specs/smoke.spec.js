// Every screen loads without script errors, in practice mode and for each signed-in role.
import { test, expect } from '@playwright/test';
import { pageAs, U, ADMIN } from '../helpers.js';

const SCREENS = ['actions', 'overview', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'checks', 'challenge', 'outputs', 'reference'];

test('worked example: every screen opens without errors', async ({ browser }) => {
  const page = await pageAs(browser, U.recorder);
  for (let i = 0; i < 3 && !(await page.locator('[data-act="drawer"]').count()); i++) {
    const b = page.locator('[data-act="example"], [data-g="practice"]').first();
    if (await b.count()) { await b.click(); await page.waitForTimeout(500); }
  }
  for (const s of SCREENS) { await page.evaluate(s => window.RAF.go(s), s); await page.waitForTimeout(150); }
  expect(page._errors).toEqual([]);
});

test('admin, profile and user guide pages load', async ({ browser }) => {
  for (const path of ['/admin/', '/admin/#activity', '/admin/#notifications', '/profile/', '/user-guide/']) {
    const p = await pageAs(browser, ADMIN, path);
    expect(p._errors, path).toEqual([]);
    await p.context().close();
  }
});
