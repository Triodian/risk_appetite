// The board view (development plan task 3.6): what AI Board Direction shows for each board meeting. It carries the
// approved calibration set exactly as GET /calibration-set serves it, where the appetite stands, and the latest in-use
// measures. Run: node tests/board-view.test.mjs
import { boardView, issuedCalibration } from '../lib/core/api.js';

let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
const set2 = { schema: 'triodian.calibration.v1', P1: { Claims: { own: { tier: 'A2' } } }, P9: 40 }, set3 = { ...set2, P9: 30 };
const data = { engagement: { insurer: 'Acme Super', sectorPack: 'superTrustee' }, calibration: { status: 'working', version: 3, agreedOn: '2026-11-20', approvedOn: '2026-10-17', minuteRef: 'M-7',
  issued: [{ version: 2, status: 'approved', on: '2026-10-17', by: 'Board', minuteRef: 'M-7', set: set2 }, { version: 3, status: 'working', on: '2026-11-20', by: 'CRO', set: set3 }] },
  current: { register: { on: '2026-11-21', entries: 12, measures: [{ ref: 'M6', measure: 'Share…', limit: '[ ]%', value: 40, basis: 'x' }], gapsByPriority: { High: 1, Medium: 0, Low: 2 }, overdue: [] } } };
const store = d => ({ init: async () => {}, getEngagement: async () => (d ? { data: d, revision: 4 } : null) });

const v = await boardView(store(data)), c = await issuedCalibration(store(data));
ok('the board view answers', v.status === 200 && v.body.format === 'triodian.raf.boardview.v1');
ok('its approved positions are the calibration set as issued, word for word', JSON.stringify(v.body.approved) === JSON.stringify(c.body));
ok('the approved version is served, with the later working version named', v.body.approved.version === 2 && v.body.approved.status === 'approved' && v.body.approved.laterVersion.version === 3);
ok('it says where the appetite stands now', v.body.appetite.status === 'working' && v.body.appetite.version === 3);
ok('it carries the latest in-use measures', v.body.inUse && v.body.inUse.measures[0].value === 40 && v.body.inUse.gapsByPriority.Low === 2);
ok('and the sector pack, so Board Direction can read the functions', v.body.sectorPack === 'superTrustee');
const none = await boardView(store({ engagement: { insurer: 'A' }, calibration: { status: 'default', version: 0, issued: [] }, current: {} }));
ok('before anything is issued it still answers, saying why there are no approved positions', none.status === 200 && none.body.approved === null && /No calibration set/.test(none.body.approvedNote) && none.body.inUse === null);
ok('with no engagement it answers 404', (await boardView(store(null))).status === 404);
console.log(fails ? `\n${fails} failed` : '\nall passed'); process.exit(fails ? 1 : 0);
