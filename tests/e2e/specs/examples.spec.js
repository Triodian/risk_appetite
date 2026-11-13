// Worked examples by sector. Triodian Start opens the app on one with ?example=<sector>; the choice holds for the
// browser session, and the menu offers the other. The superannuation example (Coastline Super, fictional) is the same
// fund as the worked examples in AI Board Direction and AI Use Assessment: the board's directions are loaded, every
// check passes and the board has approved the appetite.
import { test, expect } from '@playwright/test';
import { ADMIN } from '../helpers.js';

async function start(browser, path) {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); p._errors = []; p.on('pageerror', e => p._errors.push(String(e))); p.on('dialog', d => d.accept());
  await p.goto(path);
  await expect(p.locator('.examplenote', { hasText: 'Worked example:' }).first()).toBeVisible({ timeout: 15_000 });
  return { ctx, p };
}

test('?example=superannuation opens Coastline Super with the super pack, the board’s directions and an approved appetite', async ({ browser }) => {
  const { ctx, p } = await start(browser, '/?example=superannuation');
  await expect(p.locator('.examplenote').first()).toContainText('a fictional superannuation trustee, Coastline Super');
  await expect(p).toHaveURL(/\/(#.*)?$/);
  await p.goto('/?other=1&example=superannuation');                // only its own parameter is removed, so the suite's stays for the suite to read
  await expect(p).toHaveURL(/\/\?other=1(#.*)?$/);
  await expect(p.locator('.examplenote', { hasText: 'Coastline Super' }).first()).toBeVisible({ timeout: 15_000 });
  const s = await p.evaluate(() => { const S = window.RAF.state, ck = window.RAF.checks(); const last = S.calibration.issued[S.calibration.issued.length - 1];
    return { name: S.engagement.insurer, pack: S.engagement.sectorPack, fns: S.functions.map(f => f.id).join(), cal: S.calibration.status, issued: S.calibration.issued.map(i => i.status).join(), failing: ck.filter(k => k.state === 'fail').map(k => k.id),
      dir: S.boardDirections.file.company + ' ' + S.boardDirections.file.version, claims: last.set.parameters.P1['Claims and group insurance'], k11: (ck.find(k => k.id === 'K11') || {}).state,
      over: S.functions.flatMap(f => ['own', 'provider', 'platform'].map(l => `d1.${f.id}.${l}`)).filter(id => { const max = { ms: 4, ci: 2, ad: 2, iv: 4, ap: 4, cd: 2, fi: 2, lc: 1, to: 4 }[id.split('.')[1]]; return +S.decisions.d1.cells[id].value.slice(1) > max; }) }; });
  expect(s.name).toBe('Coastline Super (fictional)'); expect(s.pack).toBe('superTrustee');
  expect(s.fns).toBe('ms,ci,ad,iv,ap,cd,fi,lc,to');
  expect(s.failing).toEqual([]);                                   // every check passes, K11 among them
  expect(s.k11).toBe('pass');
  expect(s.cal).toBe('approved'); expect(s.issued).toBe('working,approved');
  expect(s.dir).toBe('Coastline Super V2');                       // the directions the Board Direction example records
  expect(s.over).toEqual(['d1.ci.provider']);                      // one ceiling above the board's direction, with its reason and revisit
  expect(s.claims.provider.tier).toBe('A3');
  // the pack's words, not the insurer's
  await p.evaluate(() => window.RAF.go('d1'));
  await expect(p.locator('body')).toContainText('Claims and group insurance');
  await expect(p.locator('body')).toContainText('The board’s directions for this decision');
  await expect(p.locator('body')).toContainText('A person decides every death or disablement claim');
  await expect(p.locator('body')).not.toContainText('Corvane');
  await expect(p.locator('body')).not.toContainText('Underwriting and pricing');
  // the choice holds on a plain reload
  await p.goto('/');
  await expect(p.locator('.examplenote', { hasText: 'Coastline Super' }).first()).toBeVisible({ timeout: 15_000 });
  expect(p._errors).toEqual([]);
  await ctx.close();
});

test('the default is the insurer example; the menu switches between them, each with its own pack', async ({ browser }) => {
  const { ctx, p } = await start(browser, '/');
  await expect(p.locator('.examplenote').first()).toContainText('a fictional general insurer, Corvane General');
  expect(await p.evaluate(() => window.RAF.state.engagement.sectorPack)).toBe('generalInsurer');
  // the insurer example reads the directions the Board Direction insurer example records; K11 holds back two claims ceilings
  const ins = await p.evaluate(() => { const S = window.RAF.state, k = window.RAF.checks().find(x => x.id === 'K11'); return { dir: S.boardDirections.file.company + ' ' + S.boardDirections.file.version, state: k.state, off: k.off.map(x => x.id),
    carried: ['d1.uw.provider', 'd1.cl.provider', 'd1.fr.provider'].every(id => S.decisions.d1.cells[id].reason && S.decisions.d1.cells[id].boardRevisit) }; });
  expect(ins).toEqual({ dir: 'Corvane General Insurance V2', state: 'fail', off: ['d1.cl.own', 'd1.cl.platform'], carried: true });
  await p.click('header [data-act="drawer"]');
  await expect(p.locator('.drawer [data-act="example"][data-ex="insurance"]')).toHaveCount(0);   // already open
  await p.locator('.drawer [data-act="example"][data-ex="superannuation"]').click();
  await expect(p.locator('.examplenote').first()).toContainText('Coastline Super');
  expect(await p.evaluate(() => window.RAF.state.functions[0].name)).toBe('Member services and communications');
  await p.click('header [data-act="drawer"]');
  await p.locator('.drawer [data-act="example"][data-ex="insurance"]').click();
  await expect(p.locator('.examplenote').first()).toContainText('Corvane General');
  const back = await p.evaluate(() => ({ pack: window.RAF.state.engagement.sectorPack, fn: window.RAF.state.functions[0].name, cal: window.RAF.state.calibration.status }));
  expect(back).toEqual({ pack: 'generalInsurer', fn: 'Underwriting and pricing', cal: 'default' });   // the insurer example is as it was
  // a sector this app has no example for opens the first
  await p.goto('/?example=unregulated');
  await expect(p.locator('.examplenote').first()).toContainText('Corvane General');
  expect(p._errors).toEqual([]);
  await ctx.close();
});

test('?example=banking opens Wattlebrook Bank with the ADI pack, the board’s directions and an approved appetite', async ({ browser }) => {
  const { ctx, p } = await start(browser, '/?example=banking');
  await expect(p.locator('.examplenote').first()).toContainText('a fictional bank, Wattlebrook Bank');
  const s = await p.evaluate(() => { const S = window.RAF.state, ck = window.RAF.checks(); const last = S.calibration.issued[S.calibration.issued.length - 1];
    return { name: S.engagement.insurer, pack: S.engagement.sectorPack, fns: S.functions.map(f => f.id).join(), cal: S.calibration.status, issued: S.calibration.issued.map(i => i.status).join(), failing: ck.filter(k => k.state === 'fail').map(k => k.id),
      dir: S.boardDirections.file.company + ' ' + S.boardDirections.file.version, fc: last.set.parameters.P1['Financial crime (AML/CTF, fraud and scams)'], k11: (ck.find(k => k.id === 'K11') || {}).state, minute: last.set.minuteRef,
      over: S.functions.flatMap(f => ['own', 'provider', 'platform'].map(l => `d1.${f.id}.${l}`)).filter(id => { const max = { rl: 2, dp: 4, bi: 2, fc: 2, ch: 2, cs: 4, tm: 2, rc: 1, to: 4 }[id.split('.')[1]]; return +S.decisions.d1.cells[id].value.slice(1) > max; }) }; });
  expect(s.name).toBe('Wattlebrook Bank (fictional)'); expect(s.pack).toBe('adi');
  expect(s.fns).toBe('rl,dp,bi,fc,ch,cs,tm,rc,to');
  expect(s.failing).toEqual([]); expect(s.k11).toBe('pass');
  expect(s.cal).toBe('approved'); expect(s.issued).toBe('working,approved'); expect(s.minute).toBe('Board minute 2026/11-09');
  expect(s.dir).toBe('Wattlebrook Bank V2');                       // the directions the Board Direction example records
  expect(s.over).toEqual(['d1.fc.provider']);                      // one ceiling above the board's direction, with its reason and revisit
  expect(s.fc.provider.tier).toBe('A3');
  await p.evaluate(() => window.RAF.go('d1'));
  await expect(p.locator('body')).toContainText('Financial crime (AML/CTF, fraud and scams)');
  await expect(p.locator('body')).toContainText('The board’s directions for this decision');
  await expect(p.locator('body')).toContainText('A person decides before an account is frozen or closed');
  await expect(p.locator('body')).not.toContainText('Corvane');
  await expect(p.locator('body')).not.toContainText('Coastline');
  for (const scr of ['d2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'checks', 'outputs']) expect(await p.evaluate(x => { try { window.RAF.go(x); return true; } catch (e) { return String(e); } }, scr)).toBe(true);
  expect(p._errors).toEqual([]);
  await ctx.close();
});
