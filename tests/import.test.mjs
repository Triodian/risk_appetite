// Importing the client's own registers (development plan task R.1): the shared reader in public/shared/import.js.
// The same file is in AI Use Assessment, AI Board Direction and AI Risk Appetite. Run: node tests/import.test.mjs
import { readFileSync } from 'node:fs';
import { parseCsv, readArrangements, writeArrangements, readLimits, readSoA, summary } from '../public/shared/import.js';

let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
const fx = f => readFileSync(new URL('./fixtures/' + f, import.meta.url), 'utf8');

ok('CSV: quotes, doubled quotes, CRLF and a byte-order mark', JSON.stringify(parseCsv('﻿a,"b, c","say ""hi"""\r\n1,2,3\r\n')) === JSON.stringify([['a', 'b, c', 'say "hi"'], ['1', '2', '3']]));
ok('CSV: a quoted line break stays in the cell', parseCsv('a,"x\ny"\n')[0][1] === 'x\ny');

const a = readArrangements(fx('provider-register.csv'));
ok('the 50-row provider register loads, skipping the privilege marking above the header', !a.error && a.rows.length === 50, a.error || a.rows.length);
ok('the two malformed rows are refused, each with its line and reason', a.refused.length === 2 && /no provider/.test(a.refused[0].reason) && /Boundary "B9"/.test(a.refused[1].reason), JSON.stringify(a.refused));
ok('the client’s ids are kept', a.rows[0].providerId === 'PR-0101' && a.rows[0].systemId === 'AIS-001');
const again = readArrangements(writeArrangements(a.rows));
ok('written out and read back, the rows are the same (the ids round-trip)', JSON.stringify(again.rows.map(({ line, ...r }) => r)) === JSON.stringify(a.rows.map(({ line, ...r }) => r)) && !again.refused.length);
ok('headers are matched by name and alias, in any order and case', readArrangements('System Name,Supplier,Provider ID\nChatbot,Acme,PR-1\n').rows[0].providerId === 'PR-1');
ok('a file with no header row says which column it looks for', /provider_register_id/.test(readArrangements('just,some,text\n').error || ''));
ok('a duplicate system id is refused', /appears twice/.test((readArrangements('provider_register_id,system_id,provider,system\nP1,S1,A,x\nP1,S1,A,y\n').refused[0] || {}).reason || ''));
ok('an id with odd characters is refused', readArrangements('provider_register_id,provider,system\n<b>,A,x\n').refused.length === 1);

const l = readLimits(fx('ai-limits.csv'));
ok('the 30-limit register loads', !l.error && l.rows.length === 30 && !l.refused.length, l.error || JSON.stringify(l.refused[0]));
ok('a limit gives a function and an authority ceiling or a consequence level', l.rows.every(r => r.function && (r.authority || r.consequence)));
ok('a limit with neither is refused', /no authority ceiling/.test((readLimits('limit_id,function\nL1,Claims\n').refused[0] || {}).reason || ''));
ok('a control that is not an Annex A reference is refused', /Annex A/.test((readLimits('limit_id,function,authority,control\nL1,Claims,A2,9.2\n').refused[0] || {}).reason || ''));
const s = readSoA(fx('statement-of-applicability.csv'));
ok('the Statement of Applicability loads', !s.error && s.rows.length === 6 && s.rows.filter(r => r.applicable).length === 5, s.error);
ok('the summary counts what loaded and names the first row refused', summary('limits', readLimits('limit_id,function,authority\nL1,Claims,A2\nL2,Claims,\n')) === '1 limits loaded; 1 row refused (line 3: no authority ceiling (A1 to A6) or consequence level (C1 to C5)).');
console.log(fails ? `\n${fails} failed` : '\nall passed'); process.exit(fails ? 1 : 0);
