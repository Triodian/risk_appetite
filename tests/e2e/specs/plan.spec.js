// The engagement plan (development plan task 0.7) generates from the worked example and opens in Word.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { ADMIN } from '../helpers.js';

function unzip(buf, name) {
  let e = buf.length - 22; while (e > 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  let p = buf.readUInt32LE(e + 16);
  for (let n = buf.readUInt16LE(e + 10); n > 0; n--) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    if (buf.toString('utf8', p + 46, p + 46 + nl) === name) { const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28), raw = buf.subarray(start, start + size); return (method ? inflateRawSync(raw) : raw).toString('utf8'); }
    p += 46 + nl + xl + cl;
  }
  return '';
}
const text = xml => xml.replace(/<w:tab\/>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');

test('the engagement plan generates from the worked example and opens in Word', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => d.accept());
  await p.goto('/');
  await expect(p.locator('.examplebar', { hasText: 'Worked example:' })).toBeVisible({ timeout: 15_000 });
  await p.locator('nav.steps [data-act="go"][data-to="outputs"]').first().click();
  await p.locator('[data-act="outTab"][data-t="plan"]').first().click();
  for (const h of ['Steps', 'Sessions and who attends', 'Attendees by role', 'Inputs needed from the insurer', 'Sign-off points']) await expect(p.locator('.md :is(h2,h3,h4)', { hasText: h }).first()).toBeVisible();
  const dl = p.waitForEvent('download');
  await p.click('#out-docx');
  const f = await dl; expect(f.suggestedFilename()).toMatch(/\.docx$/);
  const body = text(unzip(readFileSync(await f.path()), 'word/document.xml'));
  for (const s of ['Engagement plan', 'Session 1', 'Board approval', 'I11']) expect(body).toContain(s);
  expect(errs).toEqual([]);
  await ctx.close();
});
