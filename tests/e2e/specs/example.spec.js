// The app opens in the worked example, with the band to leave it; once left, a reload stays out.
// The same test is in every Triodian app that has a worked example.
import { test, expect } from '@playwright/test';
import { ADMIN } from '../helpers.js';

test('opens in the worked example; leaving it is remembered for the session', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept());
  await page.goto('/');
  const band = page.locator('.examplenote', { hasText: 'Worked example:' });
  await expect(band).toBeVisible({ timeout: 15_000 });
  await expect(band).toContainText('for practice only. Nothing is saved.');
  await band.getByRole('button', { name: 'Leave the worked example' }).click();
  await expect(band).toHaveCount(0);
  await page.reload(); await page.waitForTimeout(1500);
  await expect(page.locator('.examplenote', { hasText: 'Worked example:' })).toHaveCount(0);
  // It opens again from the menu or, with no engagement yet, the start screen, with the same wording in every app.
  const menu = await page.locator('header [data-act="drawer"]').count();
  if (menu) await page.click('header [data-act="drawer"]');
  await page.locator((menu ? '.drawer ' : '') + '[data-act="example"]', { hasText: 'Open the worked example' }).first().click();
  await expect(page.locator('.examplenote', { hasText: 'Worked example:' })).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});
