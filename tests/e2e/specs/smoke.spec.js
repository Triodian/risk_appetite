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

test('demo: the three-app introduction opens first, and Switch app reopens it', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': U.counsel }, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage(); await page.goto('/'); await page.waitForTimeout(800);
  const dlg = page.getByRole('dialog', { name: 'From what the law expects to evidence each AI use fits' });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole('link', { name: /Open Obligations Atlas/ })).toHaveAttribute('href', /obligations-atlas\.triodian\.com\/\?suite=1/);
  await page.keyboard.press('Escape'); await expect(dlg).toBeHidden();
  await page.reload(); await page.waitForTimeout(500); await expect(dlg).toBeHidden();
  await page.getByRole('button', { name: /Switch app/ }).click(); await expect(dlg).toBeVisible();
  await ctx.close();
});
