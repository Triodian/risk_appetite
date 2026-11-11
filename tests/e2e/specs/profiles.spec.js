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

// The header says each thing once. On the demo site the demo band carries the worked example's note, so the app shows
// no band of its own; a client site has no demo band, so the app's band carries it.
test('the worked example is named once: in the demo band on the demo site, in the app’s band on a client site', async ({ browser }) => {
  for (const [base, demo] of [[BASE, true], [CLIENT_BASE, false]]) {
    const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': 'damian.hickey@triodian.com' }, viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto(base + '/');
    await p.waitForTimeout(1500);
    if (!(await p.locator('.examplenote').count())) { // not open yet: open it from the menu or the start screen
      const menu = await p.locator('header [data-act="drawer"]').count(); if (menu) await p.click('header [data-act="drawer"]');
      await p.locator((menu ? '.drawer ' : '') + '[data-act="example"]', { hasText: 'Open the worked example' }).first().click();
    }
    const note = p.locator('.examplenote', { hasText: 'Worked example:' });
    await expect(note).toHaveCount(1); await expect(note).toBeVisible({ timeout: 15_000 });
    await expect(p.locator('.tsu-band .examplenote')).toHaveCount(demo ? 1 : 0);
    await expect(p.locator('.examplebar.examplenote')).toHaveCount(demo ? 0 : 1);
    const hdr = await p.locator('header.hdr').innerText();
    expect(hdr).toContain('AI Risk Appetite');
    expect(hdr).not.toMatch(/fictional|worked example|not saved/i);
    expect(hdr.indexOf('Askew Lane Partners')).toBeLessThan(hdr.indexOf('Privileged and confidential')); // the firm, then the marking
    await note.getByRole('button', { name: /Leave/ }).click();
    await expect(p.locator('.examplenote')).toHaveCount(0);
    expect(errs).toEqual([]);
    await ctx.close();
  }
});
