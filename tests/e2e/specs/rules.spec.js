// Regression tests for what the October 2026 QA run found: each save below was accepted, or went wrong, before
// the fix. Every refused save must leave the stored engagement unchanged.
import { test, expect } from '@playwright/test';
import { api, editAs, pageAs, U, ADMIN } from '../helpers.js';

test.describe.configure({ mode: 'serial' });

let ids = {};
const stored = async () => (await api('GET', '/api/engagement')).body;

test('the administrator starts the engagement', async ({ browser }) => {
  const users = (await api('GET', '/api/admin/users')).body.users;
  ids = Object.fromEntries(users.map(u => [u.email, u.id]));
  if ((await stored()).exists) return;
  const page = await pageAs(browser, ADMIN, '/admin/');
  await page.locator('[data-act="new"]').click();
  await page.evaluate(() => window.RAF.save());
  await expect.poll(async () => (await api('GET', '/api/engagement')).body.exists, { timeout: 15_000 }).toBe(true);
  await page.context().close();
  const d = (await stored()).data;
  expect(d.schema).toBe('triodian.raf.v1');
});

test.describe('malformed saves are refused with a 400, not a server error', () => {
  const cases = {
    'two challenge points with the same ref': d => { const c = { ref: 'CH-90', raisedBy: ids[U.risk], decision: 'd1', cell: '', point: 'x', response: '', status: 'open' }; d.challenge = [...(d.challenge || []), c, { ...c, point: 'y' }]; },
    'a challenge point that is not a record': d => { d.challenge = [...(d.challenge || []), null]; },
    'a challenge ref that is not a valid reference': d => { d.challenge = [...(d.challenge || []), { ref: '<b>x</b>', decision: 'd1', point: 'x', status: 'open' }]; },
    'questions for counsel that are not a list': d => { d.questionsForCounsel = { ref: 'QC-01' }; },
    'a decision that is not a record': d => { d.decisions.d1 = 'x'; },
    'a version that is not a whole number': d => { d.calibration.version = '2'; },
  };
  for (const [name, change] of Object.entries(cases)) {
    test(name, async () => {
      const before = await stored();
      const r = await editAs(U.risk, change);
      expect(r.status, JSON.stringify(r.body)).toBe(400);
      expect((await stored()).revision).toBe(before.revision);
    });
  }
});

test('the CRO agrees version 1, recorded in the CRO\'s own name', async () => {
  const r = await editAs(U.cro, d => {
    const c = d.calibration;
    Object.assign(c, { status: 'working', version: 1, agreedBy: 'Someone Else', agreedById: ids[U.cro], agreedOn: '2026-10-18' });
    c.issued.push({ version: 1, status: 'working', on: '2026-10-18', by: 'Someone Else', set: { schema: 'triodian.raf.calibration.v1', parameters: {} } });
  });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  const c = (await stored()).data.calibration;
  expect(c.agreedBy).toBe('cro (test)');
  expect(c.issued.at(-1).by).toBe('cro (test)');
});

test('the board records approval; the record names who entered it', async () => {
  const r = await editAs(U.board, d => {
    const c = d.calibration;
    Object.assign(c, { status: 'approved', approvedOn: '2026-10-18', minuteRef: 'BRC-2026-11-12', approvedBy: 'Board Risk Committee' });
    c.issued.push({ version: 1, status: 'approved', on: '2026-10-18', by: 'Not The Board', minuteRef: 'BRC-2026-11-12', set: { schema: 'triodian.raf.calibration.v1', parameters: {} } });
  });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  const x = (await stored()).data.calibration.issued.at(-1);
  expect(x.by).toBe('Board Risk Committee');
  expect(x.recordedBy).toBe('board (test)');
});

test('the independent reviewer cannot reopen the approved appetite or raise the version on its own', async () => {
  const before = await stored();
  expect((await editAs(U.ir, d => { d.calibration.status = 'working'; })).status).toBe(403);
  expect((await editAs(U.ir, d => { d.calibration.version += 1; d.calibration.status = 'working'; })).status).toBe(403);
  expect((await stored()).revision).toBe(before.revision);
});

test('a change after approval raises version 2, which waits for the CRO and then for the board', async () => {
  const cell = 'd1.uw.own';
  const r = await editAs(U.recorder, d => {
    d.decisions.d1.cells = d.decisions.d1.cells || {};
    const p = d.decisions.d1.cells[cell] = d.decisions.d1.cells[cell] || { value: null, condition: '', testable: false, reason: '', proposedBy: '', recordedBy: '', owner: '', dissent: '', status: 'unset', notSetOwner: '', notSetDue: '', source: '' };
    p.value = p.value === 'A1' ? 'A2' : 'A1'; p.status = 'set';
    Object.assign(d.calibration, { version: 2, status: 'working', agreedBy: '', agreedById: '', agreedOn: '' });
  });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  // The board cannot approve a version the CRO has not agreed.
  const ap = await editAs(U.board, d => { Object.assign(d.calibration, { status: 'approved', approvedOn: '2026-10-19', minuteRef: 'm2' }); });
  expect(ap.status).toBe(403);
  // The CRO can agree it.
  const ag = await editAs(U.cro, d => {
    Object.assign(d.calibration, { agreedBy: 'cro (test)', agreedById: ids[U.cro], agreedOn: '2026-10-19' });
    d.calibration.issued.push({ version: 2, status: 'working', on: '2026-10-19', by: 'cro (test)', set: { schema: 'triodian.raf.calibration.v1', parameters: {} } });
  });
  expect(ag.status, JSON.stringify(ag.body)).toBe(200);
  // The assessment app still reads the approved version 1, and is told version 2 exists.
  const cs = await api('GET', '/api/calibration-set', undefined, U.counsel);
  expect(cs.body.version).toBe(1);
  expect(cs.body.status).toBe('approved');
  expect(cs.body.laterVersion).toMatchObject({ version: 2, status: 'working' });
  // The emails name the CRO as the person who agreed, and tell the CRO that version 2 waited.
  const n = (await api('GET', '/api/admin/notifications')).body;
  const list = JSON.stringify(n);
  expect(list).toContain('Version 2 is waiting for agreement');
  expect(list).not.toContain('recorder (test) agreed the working appetite');
});

test('who raised a challenge point, and its decision, cannot be rewritten', async () => {
  const add = await editAs(U.cro, d => { d.challenge.push({ ref: 'CH-80', raisedBy: ids[U.cro], decision: 'd1', cell: '', point: 'A point', response: '', status: 'open' }); });
  expect(add.status, JSON.stringify(add.body)).toBe(200);
  const r = await editAs(U.ir, d => { Object.assign(d.challenge.find(c => c.ref === 'CH-80'), { decision: 'd2', point: 'Rewritten' }); });
  expect(r.status).toBe(403);
  expect((await stored()).data.challenge.find(c => c.ref === 'CH-80').point).toBe('A point');
});

test('outputs keep a date inside a minute reference as written', async ({ browser }) => {
  const page = await pageAs(browser, U.counsel, '/');
  const out = await page.evaluate(() => window.RAF.datesAU('minute BRC-2026-11-12 item 4, approved 2026-11-12'));
  expect(out).toContain('BRC-2026-11-12 item 4');
  expect(out).not.toContain('approved 2026-11-12');
  expect(page._errors).toEqual([]);
});

test('on a phone, every admin tab can be reached and none sits under the avatar', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 390, height: 844 } });
  // The demo introduction (public/suite.js) opens once per session; mark it seen so it doesn't cover the app under test.
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const page = await ctx.newPage(); await page.goto('/admin/'); await page.waitForTimeout(800);
  const tab = page.locator('.area-tabs button', { hasText: 'Notifications' });
  await tab.scrollIntoViewIfNeeded();
  const t = await tab.boundingBox(), a = await page.locator('.hdr-r').boundingBox();
  expect(t.x + t.width).toBeLessThanOrEqual(a.x + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await ctx.close();
});
