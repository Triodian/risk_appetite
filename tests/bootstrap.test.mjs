// Who becomes the first administrator, and who may change an email (security review 15 Nov 2026, S.3 and S.4).
// node tests/bootstrap.test.mjs
import { handle } from '../lib/core/api.js';
import { readFileSync } from 'node:fs';
let fails = 0; const check = (n, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + n); if (!ok) fails++; };

function memStore(users = [], closed = false) {
  const s = { users: users.map(u => ({ ...u })), audits: [], closed };
  const known = {
    async init() {},
    async getUserByEmail(e) { const u = s.users.find(x => x.email === e); return u ? { ...u } : null; },
    async getUser(id) { const u = s.users.find(x => x.id === id); return u ? { ...u } : null; },
    async getUserByPendingEmail() { return null; },
    async countActiveAdmins() { return s.users.filter(u => u.isAdmin && u.active).length; },
    async insertUser(u) { s.users.push({ ...u, active: true }); },
    async updateUser(id, u) { const i = s.users.findIndex(x => x.id === id); s.users[i] = { ...s.users[i], ...u, email: s.users[i].email }; },
    async audit(actor, action, target, detail) { s.audits.push({ actor, action, target, detail }); },
    async listUsers() { return s.users.map(u => ({ ...u })); },
    async bootstrapClosed() { return s.closed; },
    async closeBootstrap() { s.closed = true; },
    async noteAccessRequest() {}, async touchUser() {}, async clearAccessRequest() {}, async listAccessRequests() { return []; },
  };
  return { store: new Proxy(known, { get: (t, k) => k in t ? t[k] : async () => null }), s };
}
const req = (email, path, firstAdmins, method = 'GET', body) => ({ method, path, email, text: async () => JSON.stringify(body || {}), site: '', origin: 'https://x', sender: null, defer() {}, firstAdmins, demoAdmins: [] });

check('no administrator address is compiled into the app', !/BOOTSTRAP_ADMINS|@triodian\.com/.test(readFileSync(new URL('../lib/config.js', import.meta.url), 'utf8')) && !/BOOTSTRAP_ADMINS/.test(readFileSync(new URL('../lib/core/api.js', import.meta.url), 'utf8')));

{ const { store, s } = memStore([]);
  const r = await handle(req('vendor@triodian.com', '/api/me', ['admin@client.example']), store);
  check('an address not in this deployment’s FIRST_ADMINS is refused on an empty deployment', r.status === 403 && s.users.length === 0);
  const f = await handle(req('admin@client.example', '/api/me', ['admin@client.example']), store);
  check('the deployment’s own first administrator is admitted once', f.status === 200 && f.body.user.isAdmin === true && s.closed === true && s.audits.some(a => a.action === 'bootstrap.closed'));
  // The administrator is later deactivated by mistake and the list is empty again: the path does not reopen.
  s.users = [];
  const g = await handle(req('admin@client.example', '/api/me', ['admin@client.example']), store);
  check('once closed, bootstrap never reopens, even with no administrator left', g.status === 403 && s.users.length === 0);
}
{ const { store, s } = memStore([{ id: 'a1', email: 'owner@client.example', name: 'Owner', roles: [], isAdmin: true, active: true }]);
  const r = await handle(req('late@client.example', '/api/me', ['late@client.example']), store);
  check('a listed address is not admitted where an administrator already exists, and the path closes', r.status === 403 && s.closed === true);
}
// S.3: an administrator cannot change a person's email
{ const admin = { id: 'a1', email: 'owner@client.example', name: 'Owner', organisation: '', roles: [], isAdmin: true, active: true };
  const person = { id: 'p1', email: 'counsel@firm.example', name: 'Cass', organisation: 'Firm', roles: ['gc'], isAdmin: false, active: true };
  const { store, s } = memStore([admin, person], true);
  const put = body => handle(req('owner@client.example', '/api/admin/users/p1', [], 'PUT', body), store);
  const r = await put({ ...person, email: 'attacker@evil.example' });
  check('an administrator changing an email is refused 403: ' + r.status, r.status === 403 && r.body.code === 'email_locked' && s.users[1].email === 'counsel@firm.example');
  const o = await put({ ...person, name: 'Cassandra' });
  check('the same edit without the email change is fine', o.status === 200 && s.users[1].name === 'Cassandra');
}
console.log(fails ? fails + ' failed' : 'all passed'); if (fails) process.exit(1);
