// The status the practice hub reads over a service binding (development plan task 4.1): stage, counts, roles and
// dates only, never names, positions or the wording of questions and challenges. Run: node tests/status.test.mjs
import { readFileSync } from 'node:fs';
import { engagementStatus, STATUS_FORMAT } from '../lib/core/status.js';
import { statusForService } from '../src/status.js';

let fails = 0;
const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
const KEYS = ['app', 'format', 'generated', 'lastActivity', 'nextBoardDate', 'nextSignOff', 'openActions', 'stage', 'waitingOn'];
const at = { today: '2026-11-10', now: '2026-11-10T00:00:00.000Z' };
const pos = (status, value) => ({ value, condition: 'Only with a person reviewing every decline', status, owner: 'p3', notSetOwner: status === 'notSet' ? 'p4' : '', proposedBy: 'p2' });
const engagement = calStatus => ({
  engagement: { insurer: 'Corvane General Insurance (fictional)', sessionDates: ['2026-11-12', ''] },
  people: [{ id: 'p2', name: 'Priya Raman', roles: ['cro'] }],
  decisions: { d1: { cells: { 'd1.A1': pos('set', 'A3'), 'd1.A2': pos('set', 'A2') } }, d2: { cells: { 'd2.C4': pos('notSet', null) } }, d3: { cells: {} } },
  questionsForCounsel: [{ ref: 'QC-01', question: 'Is every shortfall measured against the board’s own words?', status: 'open' }, { ref: 'QC-02', question: 'x', status: 'answered' }],
  challenge: [{ ref: 'CH-02', point: 'The hardship part of C4 has no definition.', status: 'open' }, { ref: 'CH-03', point: 'y', status: 'closed' }],
  calibration: { status: calStatus, issued: [] },
});

let s = engagementStatus(null, at);
ok('no engagement: not started', s.format === STATUS_FORMAT && s.app === 'risk-appetite' && s.stage.step === 0 && s.openActions === 0 && s.nextSignOff === null);

s = engagementStatus({ data: engagement('default'), updatedAt: '2026-11-09T03:00:00Z' }, at);
ok('only the contract fields', JSON.stringify(Object.keys(s).sort()) === JSON.stringify(KEYS), Object.keys(s).join());
ok('recording: decisions started out of eight', s.stage.step === 2 && s.stage.steps === 4 && s.stage.label === 'Decisions: positions recorded in 2 of 8', JSON.stringify(s.stage));
ok('recording: waits on counsel, the challenge, the position not set', JSON.stringify(s.waitingOn) === '[{"role":"Counsel","actions":1},{"role":"CRO or counsel","actions":1},{"role":"Position owners","actions":1}]' && s.openActions === 3, JSON.stringify(s.waitingOn));
ok('recording: the CRO’s agreement is next', s.nextSignOff.label === 'The CRO agrees the working appetite' && s.lastActivity === '2026-11-09');
const text = JSON.stringify(s), leaks = ['Corvane', 'Priya', 'A3', 'person reviewing', 'shortfall', 'hardship'].filter(w => text.includes(w));
ok('no company, names, positions, questions or challenges', !leaks.length, leaks.join(' | '));

s = engagementStatus({ data: engagement('working') }, at);
ok('working appetite: the board’s approval is next and waiting', s.stage.step === 3 && s.nextSignOff.label === 'The board approves the working appetite' && s.waitingOn.some(w => w.role === 'Board'));
s = engagementStatus({ data: engagement('approved') }, at);
ok('approved: last step, no sign-off left', s.stage.step === 4 && s.stage.label === 'Approved by the board' && s.nextSignOff === null && !s.waitingOn.some(w => w.role === 'Board'));
s = engagementStatus({ data: { decisions: {}, calibration: { status: 'default' } } }, at);
ok('nothing recorded: set-up', s.stage.step === 1 && s.stage.label === 'Set-up' && s.openActions === 0);

const dbWith = data => { const stmt = () => ({ bind() { return this; }, first: async () => data ? ({ revision: 3, data: JSON.stringify(data), updated_at: '2026-11-09T05:00:00Z', updated_by: 'y' }) : null, all: async () => ({ results: [] }), run: async () => ({ meta: {} }) }); return { prepare: stmt, batch: async () => [], exec: async () => ({}) }; };
s = await statusForService({ DB: dbWith(engagement('working')) }, new Date('2026-11-10T00:00:00Z'));
ok('statusForService reads the stored engagement', s.stage.step === 3 && s.lastActivity === '2026-11-09' && s.generated === '2026-11-10T00:00:00.000Z');
const fresh = { prepare: () => ({ bind() { return this; }, first: async () => { throw new Error('D1_ERROR: no such table: engagement: SQLITE_ERROR'); }, all: async () => { throw new Error('D1_ERROR: no such table: users: SQLITE_ERROR'); } }) };
s = await statusForService({ DB: fresh }, new Date('2026-11-10T00:00:00Z'));
ok('a deployment nobody has opened (no tables yet): not started', s.stage.step === 0 && s.stage.label === 'Not started', JSON.stringify(s.stage));
let threw = false; try { await statusForService({}); } catch (e) { threw = true; }
ok('no database: it throws, so the hub shows the app as unreachable', threw);

const idx = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8'), svc = readFileSync(new URL('../src/status-service.js', import.meta.url), 'utf8');
ok('src/index.js exports StatusService', /export \{ StatusService \} from '\.\/status-service\.js'/.test(idx));
ok('StatusService offers status() only', (svc.match(/async \w+\(/g) || []).join() === 'async status(' && /class StatusService extends WorkerEntrypoint/.test(svc));
console.log(fails ? `\n${fails} failed` : '\nAll passed'); process.exit(fails ? 1 : 0);
