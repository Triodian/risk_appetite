// The shared identity (development plan tasks 1B.2, 1B.3 and 1B.5): people added once, roles per app, one sign-in.
// The same file is in the four engagement apps. Uses SQLite through a small D1 shim.  Run: node tests/identity.test.mjs
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { copyLegacyUsers, identityUsers, withIdentity, SUITE_APPS } from '../lib/identity/people.js';
import { sessionEmail, handleAuth } from '../lib/identity/session.js';

let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
function d1(sql) {
  const stmt = (q, args = []) => ({
    bind: (...a) => stmt(q, a),
    async run() { const r = sql.prepare(q).run(...args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; },
    async first() { return sql.prepare(q).get(...args) || null; },
    async all() { return { results: sql.prepare(q).all(...args) }; },
  });
  return { prepare: q => stmt(q), async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; } };
}
const usersTable = (withRole) => `CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL DEFAULT '', organisation TEXT NOT NULL DEFAULT '',
  ${withRole ? 'role TEXT, ' : ''}roles TEXT, is_admin INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL, updated_by TEXT NOT NULL, last_seen_at TEXT, pending_email TEXT, date_format TEXT, time_zone TEXT, notify_email INTEGER NOT NULL DEFAULT 1)`;

// two apps' own users tables, as they stand before the identity database
const ra = new DatabaseSync(':memory:'), bd = new DatabaseSync(':memory:'), id = new DatabaseSync(':memory:');
ra.exec(usersTable(true)); bd.exec(usersTable(false));
const add = (db, row) => { const k = Object.keys(row); db.prepare(`INSERT INTO users (${k.join(',')}, created_at, created_by, updated_at, updated_by) VALUES (${k.map(() => '?').join(',')}, 'x', 'x', 'x', 'x')`).run(...Object.values(row)); };
add(ra, { id: 'u-ra-1', email: 'cro@acme.test', name: 'Chris', role: 'cro', roles: null, is_admin: 0 });
add(ra, { id: 'u-ra-2', email: 'admin@acme.test', name: 'Ada', role: null, roles: null, is_admin: 1, date_format: 'dmy' });
add(ra, { id: 'u-ra-3', email: 'gone@acme.test', name: 'Gone', role: 'risk', roles: 'risk', is_admin: 0, active: 0 });
add(bd, { id: 'u-bd-1', email: 'CRO@acme.test', name: 'Christopher', roles: 'cro,director', is_admin: 0 });
add(bd, { id: 'u-bd-2', email: 'chair@acme.test', name: 'Cass', roles: 'chair', is_admin: 1 });
const I = d1(id);

// 1B.5: copying each app's users in, once
let r = await copyLegacyUsers(I, d1(ra), 'risk-appetite');
ok('Risk Appetite: three people, three memberships', r.people === 3 && r.memberships === 3, JSON.stringify(r));
r = await copyLegacyUsers(I, d1(bd), 'board-direction');
ok('Board Direction: the CRO is joined by email, not duplicated', r.people === 1 && r.memberships === 2, JSON.stringify(r));
r = await copyLegacyUsers(I, d1(ra), 'risk-appetite');
ok('copying again adds nothing', r.people === 0 && r.memberships === 0);
const RA = identityUsers(I, 'risk-appetite'), BD = identityUsers(I, 'board-direction');
let u = await RA.getUser('u-ra-1');
ok('each app keeps its own ids', u && u.email === 'cro@acme.test' && (await BD.getUser('u-bd-1')).email === 'cro@acme.test');
ok('a single older role becomes the roles list', u.roles.join() === 'cro' && u.role === 'cro');
ok('roles stay per app', (await BD.getUser('u-bd-1')).roles.join() === 'cro,director');
ok('the first app’s name is kept for the person', (await BD.getUser('u-bd-1')).name === 'Chris');
ok('administrator stays per app', (await RA.getUser('u-ra-2')).isAdmin && !(await BD.getUserByEmail('admin@acme.test')));
ok('an inactive user stays inactive', (await RA.getUser('u-ra-3')).active === false);
ok('preferences come across', (await RA.getUser('u-ra-2')).dateFormat === 'dmy');
ok('lookup by email ignores case', (await BD.getUserByEmail('CHAIR@acme.test')).id === 'u-bd-2');
ok('each app lists only its members', (await RA.listUsers()).length === 3 && (await BD.listUsers()).length === 2);
ok('admins are counted per app', (await RA.countActiveAdmins()) === 1 && (await BD.countActiveAdmins()) === 1);

// people added once
const nu = { id: 'u-new', email: 'chair@acme.test', name: '', organisation: '', roles: ['board'], isAdmin: false };
await RA.insertUser(nu, 'admin@acme.test', 'now');
u = await RA.getUserByEmail('chair@acme.test');
ok('adding a known person to another app joins their record and id', u && u.id === 'u-bd-2' && nu.id === 'u-bd-2' && u.name === 'Cass' && u.roles.join() === 'board');
ok('their roles in the first app are untouched', (await BD.getUser('u-bd-2')).roles.join() === 'chair');
await RA.updateUser('u-bd-2', { ...u, name: 'Cassandra', organisation: 'Acme', roles: ['board'], isAdmin: false, active: true }, 'admin@acme.test', 'now');
ok('a name changed in one app shows in every app', (await BD.getUser('u-bd-2')).name === 'Cassandra');
await RA.updatePrefs('u-bd-2', 'iso', 'Australia/Brisbane', false);
ok('preferences are the person’s, across the suite', (await BD.getUser('u-bd-2')).timeZone === 'Australia/Brisbane' && (await BD.getUser('u-bd-2')).notify === false);
const fresh = { id: 'u-n2', email: 'new@acme.test', name: 'Nia', organisation: '', roles: ['risk'], isAdmin: false };
await RA.insertUser(fresh, 'admin@acme.test', 'now');
ok('a new person keeps the id given', (await RA.getUserByEmail('new@acme.test')).id === 'u-n2');
const others = await RA.otherApps(['u-ra-1', 'u-bd-2', 'u-n2']);
ok('Admin can see each person’s roles in the other apps', others['u-ra-1'][0].app === 'board-direction' && others['u-ra-1'][0].roles.join() === 'cro,director' && !others['u-n2']);
ok('the suite apps are named', SUITE_APPS.length === 4 && SUITE_APPS.every(a => a.id && a.name && Object.keys(a.roles).length));
ok('Admin gets role names for the other apps', others['u-ra-1'][0].roleNames.join() === 'CRO (company, connected mode),Director (board)');
// this app's roles match the suite list, so Admin names them the same everywhere
const appId = (readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8').match(/const APP_ID = '([^']+)'/) || [])[1];
const mine = await import('../lib/core/roles.js').then(m => m.ROLES).catch(() => null) || await import('../public/shared/rules.js').then(m => m.ROLES);
const entry = SUITE_APPS.find(a => a.id === appId);
ok(`this app (${appId}) is in the suite list with the same roles`, entry && JSON.stringify(Object.fromEntries(mine.map(r => [r.id, r.name]))) === JSON.stringify(entry.roles));

// withIdentity: the app's store keeps its own methods and takes the user methods from the shared database
let initCalls = 0;
const store = withIdentity({ async init() { initCalls++; }, async getEngagement() { return 'mine'; }, async getUser() { return 'old'; } }, identityUsers(I, 'board-direction', d1(bd)));
await store.init();
ok('the wrapped store runs its own init and keeps its other methods', initCalls === 1 && (await store.getEngagement()) === 'mine');
ok('the wrapped store reads users from the shared database', (await store.getUser('u-bd-1')).email === 'cro@acme.test');

// 1B.3: one sign-in. Sessions in the shared database; the cookie is shared across the parent domain.
const hash = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
id.exec(`INSERT INTO sessions VALUES ('${await hash('tok1')}', 'cro@acme.test', 'x', '2999-01-01T00:00:00Z')`);
const envSuite = { IDENTITY: I, DB: d1(bd), SUITE_COOKIE_DOMAIN: 'acme.example', SUITE_SESSION_COOKIE: 'tri_suite' };
const req = (host, cookie, path = '/') => new Request(`https://${host}${path}`, { headers: { Cookie: cookie } });
ok('a suite session is read in any app', (await sessionEmail(req('appetite.acme.example', 'tri_suite=tok1'), envSuite)) === 'cro@acme.test'
  && (await sessionEmail(req('board.acme.example', 'tri_suite=tok1'), { ...envSuite, DB: d1(ra) })) === 'cro@acme.test');
ok('another cookie name is not read (live and test kept apart)', (await sessionEmail(req('appetite.acme.example', 'tri_suite=tok1'), { ...envSuite, SUITE_SESSION_COOKIE: 'tri_suite_test' })) === null);
ok('without the binding the suite cookie means nothing', (await sessionEmail(req('appetite.acme.example', 'tri_suite=tok1'), { DB: d1(bd) })) === null);
bd.exec(`CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)`);
bd.exec(`INSERT INTO sessions VALUES ('${await hash('old1')}', 'chair@acme.test', 'x', '2999-01-01T00:00:00Z')`);
ok('an app’s own session from before the binding still works', (await sessionEmail(req('board.acme.example', 'tri_session=old1'), envSuite)) === 'chair@acme.test');
const out = await handleAuth(req('board.acme.example', 'tri_suite=tok1', '/auth/logout'), envSuite);
const set = out.headers.getSetCookie ? out.headers.getSetCookie() : [out.headers.get('Set-Cookie')];
ok('signing out ends the suite session', (await sessionEmail(req('appetite.acme.example', 'tri_suite=tok1'), envSuite)) === null);
ok('and clears the shared cookie on the parent domain', set.some(c => /^tri_suite=;/.test(c) && /Domain=acme\.example/.test(c)), set.join(' | '));

console.log(fails ? `\n${fails} failed` : '\nAll passed'); process.exit(fails ? 1 : 0);
