// Evidence regimes outside Australia (development plan US.6). The same file is in the three engagement apps.
// Run: node tests/evidence-regimes.test.mjs
import { regimeFor, regimeItemsFor, REGIMES, LETTER, TAGS, tagLine, indexMarkdown, coverage, ISO, covers } from '../public/shared/evidence.js';
let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
const letterIds = new Set(LETTER.map(b => b.id)), isoIds = new Set(ISO.map(x => x[0]).concat(['A.2', 'A.3', 'A.4', 'A.5', 'A.6', 'A.7', 'A.8', 'A.9', 'A.10']));

// the regimes are well formed
for (const [key, R] of Object.entries(REGIMES)) {
  ok(`${key}: every item has an id, text, ref, covers and iso`, R.items.every(i => i.id && i.text && i.ref && i.covers.length && i.iso.length));
  ok(`${key}: covers name letter bullets only`, R.items.every(i => i.covers.every(c => letterIds.has(c))), R.items.flatMap(i => i.covers).filter(c => !letterIds.has(c)).join());
  ok(`${key}: iso names clauses, objectives or controls`, R.items.every(i => i.iso.every(c => isoIds.has(c))), R.items.flatMap(i => i.iso).filter(c => !isoIds.has(c)).join());
  ok(`${key}: item ids are unique`, new Set(R.items.map(i => i.id)).size === R.items.length);
  ok(`${key}: carries a note that the mapping is Triodian’s reading`, /Triodian’s reading/.test(R.note));
}
// lookup
ok('Australia is the letter', regimeFor('AU').id === 'AU' && regimeFor(undefined).items.length === LETTER.length);
ok('a US main sector gets its own regime, by sector id or by pack id', regimeFor('US', 'US-BANKING').id === 'US:US-BANKING' && regimeFor('US', 'usBanking').id === 'US:US-BANKING' && regimeFor('US', 'usCriticalInfrastructure').id === 'US:US-CRITICAL-INFRASTRUCTURE');
ok('any other US sector gets NIST AI RMF', regimeFor('US', 'US-PAYMENTS').id === 'US' && regimeFor('US').id === 'US');
ok('a jurisdiction with no regime yet gets none', regimeFor('SG', 'SG-BANKING') === null && regimeFor('CA') === null);
// every output reaches at least one item of every US regime, so no output is silently dropped from a US index
for (const [key, R] of Object.entries(REGIMES)) {
  const unreached = Object.entries(TAGS).flatMap(([app, t]) => Object.keys(t).filter(id => !regimeItemsFor(R, t[id]).length).map(id => app + '.' + id));
  ok(`${key}: every tagged output is evidence for at least one item`, unreached.length === 0, unreached.join(', '));
  ok(`${key}: every item has at least one output that can evidence it`, R.items.every(i => Object.values(TAGS).some(t => Object.values(t).some(x => regimeItemsFor(R, x).some(y => y.id === i.id)))));
}
// tag lines
ok('a US bank output names the US banking regime, not the APRA letter', /^US banking /.test(tagLine('UA', 'DL1', 'US', 'usBanking')) && !/APRA|CPS 230/.test(tagLine('UA', 'DL1', 'US', 'usBanking')));
ok('an Australian output is as it was', tagLine('UA', 'DL1', 'AU') === tagLine('UA', 'DL1') && /^APRA letter /.test(tagLine('UA', 'DL1')));
ok('an unmapped jurisdiction carries ISO/IEC 42001 alone', tagLine('UA', 'DL1', 'SG') === 'ISO/IEC 42001 A.10.3');
// the index
const A = [{ app: 'UA', id: 'DL1', name: 'AI dependency register', status: 'recorded', asOf: '2026-11-01', ...TAGS.UA.DL1 }, { app: 'RA', id: 'statement', name: 'AI risk appetite statement', status: 'draft', asOf: null, ...TAGS.RA.statement }];
const us = indexMarkdown({ artefacts: A, by: 'regime', jurisdiction: 'US', sector: 'US-BANKING', gatheredOn: '2026-11-16', company: 'Harlow Ridge Bank' });
ok('the US banking index lists the regime’s expectations with their instruments', /## MR1 ·/.test(us) && /SR 26-2/.test(us) && /## TP2 ·/.test(us) && /Interagency Guidance 2023/.test(us));
ok('and names no Australian instrument', !/APRA|CPS 230/.test(us));
ok('an expectation the outputs evidence shows them; one they do not says none yet', /## MR1 ·[\s\S]*?AI dependency register/.test(us) && /## TP2 ·[\s\S]*?None yet/.test(us.split('## TP3')[0]));
ok('it closes with the expectations not yet evidenced and the regime’s note', /## Expectations with no evidence yet/.test(us) && /Triodian’s reading/.test(us));
const usIso = indexMarkdown({ artefacts: A, by: 'iso', jurisdiction: 'US', sector: 'US-BANKING', gatheredOn: 'x' });
ok('the ISO view for a US bank cross-references the regime, not the letter', /US banking: /.test(usIso) && !/Letter bullets/.test(usIso));
const sg = indexMarkdown({ artefacts: A, by: 'regime', jurisdiction: 'SG', gatheredOn: 'x' });
ok('an unmapped jurisdiction falls back to the ISO view with no regime section', /by ISO\/IEC 42001:2023 clause/.test(sg) && !/with no evidence yet/.test(sg));
ok('coverage counts regime items for a US sector and letter bullets for Australia', coverage(A, 'US', 'US-INSURANCE').of === REGIMES['US:US-INSURANCE'].items.length && coverage(A).of === LETTER.length && coverage(A, 'SG').of === 0);
console.log(fails ? `\n${fails} failed` : '\nAll passed'); process.exit(fails ? 1 : 0);
