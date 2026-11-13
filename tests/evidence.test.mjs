// The APRA letter evidence index (development plan task R.2): AI Risk Appetite lists its artefacts and, over the
// ASSESSMENT binding, AI Use Assessment's, for AI Board Direction. Run: node tests/evidence.test.mjs
import { appetiteEvidence } from '../lib/core/api.js';

let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
const eng = (cal, more) => ({ getEngagement: async () => ({ data: { engagement: { insurer: 'Coastline Super' }, calibration: cal, challenge: [], ...more }, updatedAt: '2026-11-01T00:00:00Z' }) });
const ua = { format: 'triodian.evidence.v1', app: 'UA', company: 'Coastline Super', artefacts: [{ app: 'UA', id: 'DL1', name: 'AI dependency register', status: 'recorded', asOf: '2026-10-20', letter: ['G3'], cps: [], iso: ['A.10.3'] }] };

let r = await appetiteEvidence(eng({ status: 'approved', version: 2, approvedOn: '2026-10-30', minuteRef: 'BM-7' }, { inUse: { on: '2026-10-28', measures: [] }, aims: { limits: [{ id: 'L1' }, { id: 'L2' }] } }), async () => ua);
const by = id => r.body.artefacts.find(a => a.id === id);
ok('answers 200 with the evidence format', r.status === 200 && r.body.format === 'triodian.evidence.v1' && r.body.app === 'RA');
ok('an approved appetite records the statement at the approval date and minute', by('statement').status === 'recorded' && by('statement').asOf === '2026-10-30' && /BM-7/.test(by('statement').note));
ok('the in-use measures and the K11 limits are listed', by('inUse').status === 'recorded' && by('limits').status === 'recorded' && /2 limits/.test(by('limits').note));
ok('the Use Assessment artefacts are added', by('DL1') && by('DL1').app === 'UA' && !r.body.notes.length);
r = await appetiteEvidence(eng({ status: 'working', version: 1, agreedOn: '2026-10-25' }), null);
ok('an agreed but unapproved appetite is draft', r.body.artefacts.find(a => a.id === 'statement').status === 'draft');
ok('with no ASSESSMENT binding it says so in a note', r.body.notes.some(n => /no ASSESSMENT service binding/.test(n)));
r = await appetiteEvidence(eng({ status: 'default' }), async () => ({ status: 404, error: 'There is no AI use assessment yet.' }));
ok('an error from AI Use Assessment is a note, not a failure', r.status === 200 && r.body.notes.some(n => /no AI use assessment yet/.test(n)));
ok('with nothing agreed, the outputs have none yet', r.body.artefacts.find(a => a.id === 'statement').status === 'none');
r = await appetiteEvidence({ getEngagement: async () => null }, null);
ok('with no engagement it still answers, with a note', r.status === 200 && !r.body.artefacts.length && /no AI risk appetite engagement/.test(r.body.notes[0]));
// Task ISO.5: the Statement of Applicability goes with the artefacts, as a list of controls; the limits register is
// counted as the app keeps it ({ rows }), and is named as a Triodian input.
r = await appetiteEvidence(eng({ status: 'approved', version: 1, approvedOn: '2026-11-25', minuteRef: 'Board minute 2026/11-07' }, { aims: { limits: { rows: [{ id: 'LIM-01' }, { id: 'LIM-02' }, { id: 'LIM-03' }], file: 'ai-limits.csv' }, soa: { rows: [{ line: 2, control: 'A.2.2', title: 'AI policy', applicable: true, justification: 'Board-approved AI policy', implemented: 'yes' }, { line: 3, control: 'A.8.2', title: 'x', applicable: false, justification: 'Members are not users', implemented: '' }] } } }), async () => ua);
ok('the response carries the Statement of Applicability as controls', Array.isArray(r.body.soa) && r.body.soa.length === 2 && r.body.soa[0].control === 'A.2.2' && r.body.soa[0].applicable === true && r.body.soa[1].applicable === false && !('line' in r.body.soa[0]));
ok('the limits register is counted from its rows and named as a Triodian input', by('limits').status === 'recorded' && /^3 limits from the limits register \(a Triodian input, separate from the Statement of Applicability\)$/.test(by('limits').note), by('limits').note);
ok('no artefact of the appetite is tagged to A.5 or clause 6.1.4', r.body.artefacts.every(a => !(a.iso || []).some(x => /^A\.5\b/.test(x) || x === '6.1.4')));
r = await appetiteEvidence(eng({ status: 'default' }, {}), async () => ua);
ok('with no Statement of Applicability the list is empty', Array.isArray(r.body.soa) && r.body.soa.length === 0);
console.log(fails ? `\n${fails} failed` : '\nall passed'); process.exit(fails ? 1 : 0);
