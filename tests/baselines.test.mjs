// Best-practice baselines (development plan task BP.4): a pack for each baseline, generated from the Metamodel, that
// names no jurisdiction's regulator or rules, and that names the accountable authority for a public body.
// Run: node tests/baselines.test.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../public/shared/packs.js'), T = require('../public/shared/terms.js');
let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
const src = readFileSync(new URL('../public/content.js', import.meta.url), 'utf8');
const BASE = JSON.parse(src.slice(src.indexOf('=') + 1).trim().replace(/;$/, ''));
const ids = Object.keys(BASE.packs).filter(id => BASE.packs[id].baseline);
ok('eight baseline packs', ids.length === 8, ids.join());
ok('the list puts jurisdiction packs first', P.list(BASE).findIndex(p => p.baseline) === P.list(BASE).filter(p => !p.baseline).length);
for (const id of ids) {
  const r = P.resolve(BASE, id), body = JSON.stringify({ ...r, packs: undefined });
  const left = ['MAS', 'APRA', 'CPS 230', 'Singapore', 'Monetary Authority'].filter(t => body.includes(t));
  ok(`${id}: names no jurisdiction's regulator or rules`, !left.length, left.join());
  ok(`${id}: no unfilled tokens`, !P.unfilled(r).length, P.unfilled(r).join());
  ok(`${id}: functions are the baseline's areas`, r.functions.length >= 5 && new Set(r.functions.map(f => f.id)).size === r.functions.length);
  ok(`${id}: carries its governing body`, r.governingBody === BASE.packs[id].governingBody);
}
ok('jurisdiction packs keep the board', P.resolve(BASE, 'generalInsurer').governingBody === 'board');
const g = P.resolve(BASE, 'bpGovernment');
ok('government names the accountable authority', g.governingBody === 'accountableAuthority' && T.relabel('Board approves the appetite', g.governingBody) === 'Accountable authority approves the appetite');
console.log(fails ? `\n${fails} failure(s)` : '\nAll baseline checks pass');
process.exit(fails ? 1 : 0);
