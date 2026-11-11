// Practitioner branding (development plan task 0.4): the worked example names a fictional practitioner firm with a
// logo. The firm shows beside the privilege marking in the header, and a Word export carries the firm, its line and
// the logo in the page header above the marking. The same test is in every Triodian app.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { ADMIN } from '../helpers.js';

const FIRM = 'Askew Lane Partners (fictional)', LINE = 'Prepared by Askew Lane Partners using the Triodian method';
const DOWNLOAD = async page => { await page.locator('[data-to="outputs"]').first().click(); await page.locator('[data-act="downloadDocx"]:not([disabled])').first().click(); };

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

test('the worked example carries the practitioner’s branding in the header and the Word export', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept());
  await page.goto('/');
  await expect(page.locator('.examplenote', { hasText: 'Worked example:' })).toBeVisible({ timeout: 15_000 });
  const chip = page.locator('.brandchip').first();
  await expect(chip).toContainText('Askew Lane Partners'); // the header names the worked example once, in its note, so the name drops "(fictional)" there
  await expect(chip.locator('img')).toHaveCount(1);
  const dl = page.waitForEvent('download');
  await DOWNLOAD(page);
  const file = await dl;
  const buf = readFileSync(await file.path()), head = unzip(buf, 'word/header1.xml'), core = unzip(buf, 'docProps/core.xml');
  expect(head).toContain(FIRM);
  expect(head).toContain(LINE);
  expect(head).toMatch(/<w:drawing[ >]/);
  expect(core).toContain(`<dc:creator>${FIRM}</dc:creator>`);
  expect(errors).toEqual([]);
  await ctx.close();
});
