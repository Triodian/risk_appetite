// DEMO ADDITION: emails in DEMO_ADMINS become active administrators when they sign in.  node tests/demo-admin.test.mjs
import { handle } from '../lib/core/api.js';
let fails = 0; const check = (n, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + n); if (!ok) fails++; };

// An in-memory stand-in for the store: users and the audit log are real; everything else answers empty.
function memStore(users = []) {
  const s = { users: users.map(u => ({ ...u })), audits: [] };
  const known = {
    async init() {},
    async getUserByEmail(e) { const u = s.users.find(x => x.email === e); return u ? { ...u } : null; },
    async getUserByPendingEmail() { return null; },
    async countActiveAdmins() { return s.users.filter(u => u.isAdmin && u.active).length; },
    async insertUser(u) { s.users.push({ ...u, active: true }); },
    async updateUser(id, u) { const i = s.users.findIndex(x => x.id === id); s.users[i] = { ...s.users[i], ...u }; },
    async audit(actor, action, target, detail) { s.audits.push({ actor, action, target, detail }); },
    async listUsers() { return s.users.map(u => ({ ...u })); },
    async noteAccessRequest() {},
    async touchUser() {},
  };
  const store = new Proxy(known, { get: (t, k) => k in t ? t[k] : async () => null });
  return { store, s };
}
const req = (email, path, demoAdmins) => ({ method: 'GET', path, email, text: async () => '', site: '', origin: 'https://x', sender: null, defer() {}, demoAdmins });
const admin = { id: 'a1', email: 'owner@triodian.com', name: 'Owner', organisation: '', role: null, roles: [], isAdmin: true, active: true };

{ const { store, s } = memStore([admin]);
  const r = await handle(req('demo@triodian.com', '/api/me', ['demo@triodian.com']), store);
  check('a new demo email is created as an active administrator', r.status === 200 && r.body.user.isAdmin === true && r.body.user.active === true);
  check('and it is audited as a demo administrator', s.audits.some(a => a.action === 'user.create' && /DEMO_ADMINS/.test(a.detail.reason)));
  const a = await handle(req('demo@triodian.com', '/api/admin/users', ['demo@triodian.com']), store);
  check('the demo user can open admin routes', a.status === 200); }
{ const { store, s } = memStore([admin, { id: 'd1', email: 'demo@triodian.com', name: 'Demo', organisation: '', role: 'cro', roles: ['cro'], isAdmin: false, active: false }]);
  const r = await handle(req('demo@triodian.com', '/api/me', ['demo@triodian.com']), store);
  check('an existing, deactivated demo user is made an active administrator and keeps their role', r.status === 200 && r.body.user.isAdmin && r.body.user.active && (r.body.user.role === 'cro' || (r.body.user.roles || []).includes('cro')));
  check('and the change is audited', s.audits.some(a => a.action === 'user.update')); }
{ const { store } = memStore([admin]);
  const r = await handle(req('demo@triodian.com', '/api/me', []), store);
  check('without DEMO_ADMINS the same email is refused', r.status === 403); }
{ const { store, s } = memStore([admin]);
  await handle(req('someone@firm.com', '/api/me', ['demo@triodian.com']), store);
  check('other emails are not affected', !s.users.some(u => u.email === 'someone@firm.com')); }
console.log(fails ? fails + ' failed' : 'all passed'); if (fails) process.exit(1);
