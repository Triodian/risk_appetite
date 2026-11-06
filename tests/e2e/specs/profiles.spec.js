// The demo and client profiles (development plan tasks 0.2 and 0.3): the demo site shows the demo band and the demo
// sign-in; the same Worker with the client profile's settings shows neither.
import { test, expect } from '@playwright/test';
import { BASE, CLIENT_BASE } from '../playwright.config.js';

test('the demo site shows the demo band and the demo sign-in', async ({ browser }) => {
  const ctx = await browser.newContext(); const p = await ctx.newPage();
  await p.goto(BASE + '/login');
  await expect(p.locator('html')).toHaveAttribute('data-suite-demo', 'on');
  await expect(p.locator('html')).toHaveAttribute('data-demo-login', 'on');
  await expect(p.locator('#username')).toBeVisible();
  await p.goto(BASE + '/');
  await expect(p.locator('.tsu-band')).toHaveCount(1);
  await ctx.close();
});

test('the client profile shows no demo band and offers email sign-in only', async ({ browser }) => {
  const ctx = await browser.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(CLIENT_BASE + '/login');
  await expect(p.locator('html')).toHaveAttribute('data-suite-demo', 'off');
  await expect(p.locator('html')).toHaveAttribute('data-demo-login', 'off');
  await expect(p.locator('#username')).toBeHidden();
  await expect(p.locator('#email-link')).toBeVisible();
  await expect(p.locator('#email-link')).toHaveText('Sign in with your work email');
  // the demo username sign-in is refused
  const r = await p.request.post(CLIENT_BASE + '/auth/login', { form: { username: 'trio_demo', password: 'anything', next: '/' }, maxRedirects: 0 });
  expect(r.headers()['location'] || '').toContain('failed=1');
  // the app itself has no demo band or app switcher
  await p.goto(CLIENT_BASE + '/');
  await expect(p.locator('html')).toHaveAttribute('data-suite-demo', 'off');
  await p.waitForTimeout(500);
  await expect(p.locator('.tsu-band')).toHaveCount(0);
  await expect(p.locator('.tsu-dialog, .tsu-modal, [aria-label="Triodian apps"]')).toHaveCount(0);
  expect(errs).toEqual([]);
  await ctx.close();
});
