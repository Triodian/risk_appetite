// Who may change what in AI Risk Appetite, with several roles per person and a GC role (development plan task 0.6).
// Run: node tests/rbac.test.mjs
import { checkSave, buildPeople } from '../lib/core/rbac.js';
import { can, rolesOf } from '../lib/core/roles.js';
import { handle } from '../lib/core/api.js';

let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
const users = [
  { id: 'cn', name: 'Cass', roles: ['counsel'], active: true }, { id: 'gc', name: 'Gina', roles: ['gc'], active: true },
  { id: 'cr', name: 'Chris', roles: ['cro'], active: true }, { id: 'rk', name: 'Rae', roles: ['risk'], active: true },
  { id: 'bd', name: 'Board', roles: ['board'], active: true }, { id: 'tr', name: 'Tri', roles: ['triodian'], active: true },
  { id: 'cb', name: 'Cro+Board', roles: ['cro', 'board'], active: true }, { id: 'old', name: 'Olu', role: 'risk', active: true },
  { id: 'nr', name: 'No role', roles: [], active: true }, { id: 'ad', name: 'Admin', roles: [], isAdmin: true, active: true },
];
const U = id => users.find(u => u.id === id);
const base = () => ({ schema: 'triodian.raf.v1', engagement: { id: 'e1', insurer: 'Acme', overallPosition: '' }, people: [], decisions: { d1: { cells: {} }, d2: { cells: {} } },
  current: {}, measureOwners: {}, challenge: [], questionsForCounsel: [{ ref: 'QC-01', decision: 'd1', question: 'Q?', response: '', status: 'open', raisedBy: 'tr' }],
  calibration: { status: 'working', version: 1, agreedBy: 'Chris', agreedById: 'cr', agreedOn: '2026-10-30', approvedOn: '', minuteRef: '', approvedBy: '', issued: [] }, history: [] });
const save = (who, f, old) => { const o = old || base(), n = JSON.parse(JSON.stringify(o)); f(n); n.history.push({ at: 'x', action: 't' }); return checkSave(o, n, U(who), users); };
const allowed = (label, who, f, want, old) => { const r = save(who, f, old); ok(label, !r.error === want, r.error); };

// roles, one or several
ok('rolesOf reads a list', rolesOf({ roles: ['cro', 'board'] }).join() === 'cro,board');
ok('rolesOf reads an older single role', rolesOf({ role: 'risk' }).join() === 'risk');
ok('rolesOf drops unknown roles', rolesOf({ roles: ['cro', 'chef'] }).join() === 'cro');
ok('can: any one of the roles is enough', can('approval', ['cro', 'board']) && can('agree', ['cro', 'board']));
ok('can: still takes a single role', can('agree', 'cro') && !can('agree', 'risk'));

// the GC role
allowed('the GC writes the overall position', 'gc', n => { n.engagement.overallPosition = 'Acme accepts AI that assists.'; }, true);
allowed('the GC records a response to a question for counsel', 'gc', n => { n.questionsForCounsel[0].response = 'Yes'; n.questionsForCounsel[0].status = 'answered'; }, true);
allowed('counsel still does', 'cn', n => { n.questionsForCounsel[0].response = 'Yes'; n.questionsForCounsel[0].status = 'answered'; }, true);
allowed('the risk function cannot respond to a question for counsel', 'rk', n => { n.questionsForCounsel[0].response = 'Yes'; }, false);
allowed('the GC cannot record board approval', 'gc', n => { n.calibration.status = 'approved'; n.calibration.approvedOn = '2026-11-06'; n.calibration.minuteRef = 'M1'; n.calibration.approvedBy = 'Board'; }, false);
allowed('the GC cannot agree the working appetite', 'gc', n => { n.calibration.agreedById = 'gc'; }, false);

// several roles
const approve = n => { n.calibration.status = 'approved'; n.calibration.approvedOn = '2026-11-06'; n.calibration.minuteRef = 'M1'; n.calibration.approvedBy = 'Board'; };
allowed('a person who is CRO and board record may record approval', 'cb', approve, true);
allowed('and may also edit decisions, as the CRO', 'cb', n => { n.decisions.d1.cells['d1.uw.own'] = { value: 'A2', status: 'set' }; }, true);
allowed('the board record role alone may not edit decisions', 'bd', n => { n.decisions.d1.cells['d1.uw.own'] = { value: 'A2', status: 'set' }; }, false);
allowed('a user stored with an older single role keeps its permissions', 'old', n => { n.decisions.d1.cells['d1.uw.own'] = { value: 'A2', status: 'set' }; }, true);
allowed('a user with no role changes nothing', 'nr', n => { n.engagement.overallPosition = 'x'; }, false);
const r = save('bd', n => { n.decisions.d1.cells['d1.uw.own'] = { value: 'A2', status: 'set' }; });
ok('the refusal names the role', /Your role \(Board record\)/.test(r.error || ''), r.error);
const r2 = save('cb', n => { n.questionsForCounsel[0].response = 'x'; });
ok('with several roles, the refusal names them all', /Your roles \(CRO, Board record\)/.test(r2.error || ''), r2.error);
const signed = save('cb', approve);
ok('history is signed with every role held', signed.data && /Cro\+Board \(CRO, Board record\)/.test(signed.data.history.slice(-1)[0].by), signed.data && signed.data.history.slice(-1)[0].by);

// the people list carries every role
const ppl = buildPeople(users, []);
ok('people carry roles and the first as role', ppl.find(p => p.id === 'cb').roles.join() === 'cro,board' && ppl.find(p => p.id === 'cb').role === 'cro');
ok('a user stored with an older single role appears with it', ppl.find(p => p.id === 'old').roles.join() === 'risk');
ok('a user with no role is not in the people list', !ppl.some(p => p.id === 'nr'));

// Admin: adding and changing users with several roles
function memStore(list) {
  const s = { users: list.map(u => ({ ...u })), audits: [] };
  const known = {
    async init() {}, async getUserByEmail(e) { const u = s.users.find(x => x.email === e); return u ? { ...u } : null; }, async getUser(id) { const u = s.users.find(x => x.id === id); return u ? { ...u } : null; },
    async getUserByPendingEmail() { return null; }, async countActiveAdmins() { return s.users.filter(u => u.isAdmin && u.active).length; },
    async insertUser(u) { s.users.push({ ...u, active: true }); }, async updateUser(id, u) { const i = s.users.findIndex(x => x.id === id); s.users[i] = { ...s.users[i], ...u }; },
    async audit(actor, action, target, detail) { s.audits.push({ action, detail }); }, async listUsers() { return s.users.map(u => ({ ...u })); }, async touchUser() {}, async noteAccessRequest() {},
  };
  return { store: new Proxy(known, { get: (t, k) => k in t ? t[k] : async () => null }), s };
}
const admin = { id: 'a1', email: 'admin@x.com', name: 'Admin', organisation: '', roles: [], isAdmin: true, active: true };
const req = (path, body) => ({ method: 'POST', path, email: 'admin@x.com', text: async () => JSON.stringify(body), site: '', origin: 'https://x', sender: null, defer() {} });
{ const { store, s } = memStore([admin]);
  const a = await handle(req('/api/admin/users', { email: 'gina@x.com', name: 'Gina', roles: ['cro', 'gc'] }), store);
  const u = s.users.find(x => x.email === 'gina@x.com');
  ok('Admin adds a user with two roles, stored in the standard order', a.status === 201 && u && u.roles.join() === 'gc,cro' && u.role === 'gc', JSON.stringify(a.body));
  const b = await handle(req('/api/admin/users', { email: 'x2@x.com', name: 'X', roles: ['chef'] }), store);
  ok('an unknown role is refused', b.status === 400 && /Unknown engagement role/.test(b.body.error));
  const c = await handle(req('/api/admin/users', { email: 'x3@x.com', name: 'Y', role: 'risk' }), store);
  ok('an older client sending one role still works', c.status === 201 && s.users.find(x => x.email === 'x3@x.com').roles.join() === 'risk');
  ok('the audit records the roles', s.audits.some(x => x.action === 'user.create' && (x.detail.roles || []).join() === 'gc,cro')); }

console.log(fails ? `\n${fails} failed` : '\nAll passed'); process.exit(fails ? 1 : 0);
