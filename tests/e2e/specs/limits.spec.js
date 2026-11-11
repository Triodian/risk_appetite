// The client's ISO/IEC 42001 limits and Statement of Applicability (development plan task R.1). In the worked example,
// the 30-limit register and the sample Statement of Applicability load; a limit above the appetite fails K11 with the
// limit named, a limit within it passes, and one for a function the engagement does not have is listed as having no
// board position.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ADMIN } from '../helpers.js';

const fx = f => readFileSync(new URL('../../fixtures/' + f, import.meta.url), 'utf8');
// The sample register is written for a super trustee; the worked example is a general insurer, so its functions are renamed.
const SUPER = ['Member services and communications', 'Claims and group insurance', 'Advice', 'Investments', 'Administration and payments', 'Complaints and disputes', 'Finance and reporting', 'Legal and compliance', 'Technology operations'];
const INS = ['Customer communications', 'Claims', 'Underwriting and pricing', 'Fraud and investigations', 'Policy administration', 'Complaints and disputes', 'Finance and reserving', 'Legal and compliance', 'Something else entirely'];

test('the limits register and the Statement of Applicability load, and K11 names a limit above the appetite', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('/'); await expect(p.locator('.examplenote', { hasText: 'Worked example:' })).toBeVisible({ timeout: 15_000 });
  let limits = fx('ai-limits.csv'); SUPER.forEach((n, i) => { limits = limits.split(n).join(INS[i]); });
  await p.evaluate(({ limits, soa }) => { window.RAF.useAims('limits', limits, 'ai-limits.csv'); window.RAF.useAims('soa', soa, 'statement-of-applicability.csv'); }, { limits, soa: fx('statement-of-applicability.csv') });
  const r = await p.evaluate(() => ({ aims: window.RAF.state.aims, res: window.RAF.limits(), k11: window.RAF.checks().find(k => k.id === 'K11') }));
  expect(r.aims.limits.rows.length).toBe(30);
  expect(r.aims.soa.rows.length).toBe(6);
  const by = id => r.res.find(x => x.limit.id === id);
  expect(by('LIM-01').state).toBe('consequence'); // every fifth limit in the sample is a consequence limit
  expect(by('LIM-09').state).toBe('none'); // Something else entirely: no such function
  const above = r.res.filter(x => x.state === 'above');
  expect(above.length).toBeGreaterThan(0);
  expect(r.k11.state).toBe('fail');
  for (const x of above) expect(r.k11.off.some(o => o.id === 'LIMIT:' + x.limit.id && o.why.startsWith(`limit ${x.limit.id} (`))).toBe(true);
  expect(r.k11.off.find(o => o.id.startsWith('LIMIT:')).why).toMatch(/is above the appetite ceiling A\d for .* \(decision 1\)/);
  // decision 1 lists them
  await p.evaluate(() => window.RAF.go('d1'));
  await expect(p.locator('body')).toContainText(`own AI limits (ISO/IEC 42001) · 30 limits: ${above.length} above`);
  expect(errs).toEqual([]);
  await ctx.close();
});
