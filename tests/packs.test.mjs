// Sector packs (development plan tasks 3.1 to 3.3): the wording names no sector outside the pack files, every pack
// fills every token, and the pack is fixed on the server once a position is recorded.
// Run: node tests/packs.test.mjs   (the word-for-word check of the insurer pack is tests/e2e/specs/pack-regression.spec.js)
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { checkSave, packLocked } from '../lib/core/rbac.js';
const require = createRequire(import.meta.url);
const Packs = require('../public/packs.js');
const at = (p) => new URL('../' + p, import.meta.url);
let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };

// content.js is what tools/build-content.mjs makes from content.json and the packs
const before = readFileSync(at('public/content.js'), 'utf8');
execFileSync(process.execPath, [new URL('../tools/build-content.mjs', import.meta.url).pathname], { stdio: 'pipe' });
ok('content.js is up to date with content.json and content/packs (run node tools/build-content.mjs)', readFileSync(at('public/content.js'), 'utf8') === before);
const window = {}; new Function('window', before)(window);
const BASE = window.RAF_CONTENT;
const ids = readdirSync(at('content/packs')).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
ok('every pack file is in content.js', ids.every(id => BASE.packs[id]) && Object.keys(BASE.packs).length === ids.length, ids.join(', '));

for (const id of ids) {
  const c = Packs.resolve(BASE, id);
  ok(`${id}: no token left unfilled`, Packs.unfilled(c).length === 0, Packs.unfilled(c).join(', '));
  ok(`${id}: names its functions and inputs I1 to I11`, c.functions.length >= 5 && c.inputs.map(i => i.ref).join() === 'I1,I2,I3,I4,I5,I6,I7,I8,I9,I10,I11');
}

// No sector wording outside the packs. The worked example is a general insurer, so its own lines may say so.
const SECTOR = /\b(insurers?|policyholders?)\b/i;
const left = (file, skip = () => false) => readFileSync(at(file), 'utf8').split('\n').map((l, i) => [i + 1, l]).filter(([n, l]) => SECTOR.test(l.replace(/\b(e|S\.engagement|X\.engagement|meta|engagement|data\.engagement|newData\.engagement)\.insurer\b|\binsurer:|'engagement\.insurer'/g, '')) && !skip(n, l));
ok('content.json names no sector', left('public/content.json').length === 0, left('public/content.json').map(x => x[0]).join(', '));
const app = readFileSync(at('public/app.js'), 'utf8').split('\n');
const exStart = app.findIndex(l => l.startsWith('function buildExample(')) + 1, exEnd = exStart + app.slice(exStart).findIndex(l => l === '}') + 1;
const example = (n, l) => (n >= exStart && n <= exEnd) || /fictional|Corvane|WORKED EXAMPLE|N\.entity is "insurer"/i.test(l);
ok('app.js names no sector outside the worked example', left('public/app.js', example).length === 0, left('public/app.js', example).map(x => x[0]).join(', '));
for (const f of ['lib/core/roles.js', 'lib/core/notify.js', 'lib/core/review.js', 'lib/identity/people.js', 'public/export.js']) ok(`${f} names no sector`, left(f).length === 0, left(f).map(x => x[0]).join(', '));

// the lock
const eng = (extra = {}) => ({ schema: 'triodian.raf.v1', engagement: { id: 'e1', insurer: 'Acme', sectorPack: 'generalInsurer' }, people: [], decisions: { d1: { cells: {} } }, current: {}, measureOwners: {}, challenge: [], questionsForCounsel: [], calibration: { status: 'default', version: 0, issued: [] }, history: [], ...extra });
const admin = { id: 'ad', name: 'Admin', roles: [], isAdmin: true, active: true };
const swap = (old) => { const n = JSON.parse(JSON.stringify(old)); n.engagement.sectorPack = 'superTrustee'; return checkSave(old, n, admin, [admin]); };
ok('nothing recorded: the pack is open', !packLocked(eng()) && !swap(eng()).error);
const withPos = eng({ decisions: { d1: { cells: { 'd1.uw.own': { value: 'A2' } } } } });
ok('a position recorded: the pack is fixed', packLocked(withPos) && swap(withPos).status === 409, swap(withPos).error);
ok('a version agreed: the pack is fixed', packLocked(eng({ calibration: { status: 'working', version: 1, issued: [] } })));
const bad = eng(); const nb = JSON.parse(JSON.stringify(bad)); nb.engagement.sectorPack = '<script>';
ok('a pack id that is not an id is refused', checkSave(bad, nb, admin, [admin]).status === 400);

console.log(fails ? `\n${fails} failed` : '\nall passed'); process.exit(fails ? 1 : 0);
