// Jurisdiction overlays (development plan task US.4; the Metamodel's adding-a-jurisdiction, step J.4): each US main
// sector has a pack built on its baseline, with the functions, decisions and measures unchanged and the inputs naming
// the documents a US entity in the sector usually holds. Run: node tests/overlays.test.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const P = createRequire(import.meta.url)('../public/shared/packs.js');

let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
globalThis.window = {}; eval(readFileSync(new URL('../public/content.js', import.meta.url), 'utf8')); const B = window.RAF_CONTENT;
const O = JSON.parse(readFileSync(new URL('../content/overlays/us.json', import.meta.url), 'utf8'));
const us = Object.values(B.packs).filter(p => p.overlay === 'US');

ok('five US packs', us.length === 5, us.map(p => p.id).join());
ok('the US packs list as United States, before the baselines', P.list(B).filter(p => p.jurisdiction === 'US').length === 5 && P.list(B).findIndex(p => p.jurisdiction === 'US') < P.list(B).findIndex(p => p.baseline));
for (const o of O.packs) {
  const p = B.packs[o.id], base = B.packs[o.builtOn];
  const r = P.resolve(B, o.id), rb = P.resolve(B, o.builtOn);
  ok(`${o.id}: built on ${o.builtOn}, not itself a baseline`, p && p.builtOn === base.baseline && !p.baseline && p.governingBody === base.governingBody);
  ok(`${o.id}: functions, decisions' purposes and measures are the baseline's`, JSON.stringify(r.functions) === JSON.stringify(rb.functions) && JSON.stringify(r.measures) === JSON.stringify(rb.measures) && r.decisions.every((d, i) => d.purpose === rb.decisions[i].purpose));
  ok(`${o.id}: still eleven inputs, the overlay ones renamed in the list and the framework table`, r.inputs.length === 11 && Object.entries(o.inputs).every(([ref, [name, short]]) => r.inputs.find(i => i.ref === ref).name === name && r.frameworkMarkdown.includes(`| ${ref} | ${short} |`)));
  ok(`${o.id}: no token left unfilled`, !P.unfilled(r).length, P.unfilled(r).join());
  ok(`${o.id}: the note says counsel decides what applies`, /counsel's question/.test(p.note));
  ok(`${o.id}: no "must" or "required" in the overlay's words`, !/\b(must|required)\b/i.test(JSON.stringify(o)));
  if (o.consequencePrompt) ok(`${o.id}: decision 2 asks the sector's own consequence question`, r.decisions[1].prompts[1] === o.consequencePrompt);
}
ok('Australian and Singapore packs are unchanged by the overlay', ['adi', 'masFi', 'superTrustee', 'generalInsurer'].every(id => !B.packs[id].overlay));

console.log(fails ? `\n${fails} failed` : '\nAll passed');
process.exit(fails ? 1 : 0);
