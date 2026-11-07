// The users.roles migration (development plan task 0.6), run against SQLite through a small D1 shim.
// Run: node tests/roles-migration.test.mjs
// Before deploying, run it on an export of the live database too:
//   npx wrangler d1 export <database-name> --remote --output live.sql
//   node tests/roles-migration.test.mjs live.sql
// With a file it loads the export, runs the migration and checks every user kept their role; nothing is written back.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { d1Store } from '../lib/store/d1.js';

let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };

function d1(sql) {
  const stmt = (q, args = []) => ({
    bind: (...a) => stmt(q, a),
    async run() { const r = sql.prepare(q).run(...args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; },
    async first() { return sql.prepare(q).get(...args) || null; },
    async all() { return { results: sql.prepare(q).all(...args) }; },
    _q: q, _a: args,
  });
  return { prepare: q => stmt(q), async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; } };
}

const file = process.argv[2];
if (file) {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(file, 'utf8'));
  const before = sql.prepare('SELECT id, role FROM users').all();
  await d1Store(d1(sql)).init();
  const after = new Map((await d1Store(d1(sql)).listUsers()).map(u => [u.id, u]));
  ok(`export: ${before.length} users after the migration`, after.size === before.length);
  for (const b of before) {
    const u = after.get(b.id);
    ok(`export: ${b.id} keeps ${b.role || 'no role'}`, u && (b.role ? u.roles.join() === b.role && u.role === b.role : u.roles.length === 0), u && u.roles.join());
  }
} else {
  // a users table as it stood before roles, with three users
  const sql = new DatabaseSync(':memory:');
  sql.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL DEFAULT '', organisation TEXT NOT NULL DEFAULT '',
    role TEXT, is_admin INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, created_by TEXT NOT NULL,
    updated_at TEXT NOT NULL, updated_by TEXT NOT NULL, last_seen_at TEXT)`);
  const ins = sql.prepare(`INSERT INTO users (id, email, name, role, is_admin, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'x', 'x', 'x', 'x')`);
  ins.run('u1', 'cro@x.com', 'Chris', 'cro', 0); ins.run('u2', 'admin@x.com', 'Admin', null, 1); ins.run('u3', 'risk@x.com', 'Rae', 'risk', 0);
  const store = d1Store(d1(sql));
  await store.init();
  const cols = sql.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  ok('init adds the roles column', cols.includes('roles'));
  ok('existing roles are copied', sql.prepare('SELECT roles FROM users WHERE id = ?').get('u1').roles === 'cro');
  ok('a user with no role stays without one', sql.prepare('SELECT roles FROM users WHERE id = ?').get('u2').roles === null);
  const u1 = await store.getUser('u1');
  ok('the store reads roles and the first as role', u1.roles.join() === 'cro' && u1.role === 'cro');
  await store.init();
  ok('running init again changes nothing', sql.prepare('SELECT COUNT(*) AS n FROM users WHERE roles IS NOT NULL').get().n === 2);

  await store.updateUser('u1', { ...u1, roles: ['cro', 'board'] }, 'admin@x.com', 'y');
  let row = sql.prepare('SELECT role, roles FROM users WHERE id = ?').get('u1');
  ok('update writes roles, with the first in role for older code', row.roles === 'cro,board' && row.role === 'cro', JSON.stringify(row));
  ok('the store reads several roles back', (await store.getUser('u1')).roles.join() === 'cro,board');
  await store.insertUser({ id: 'u4', email: 'gc@x.com', name: 'Gina', organisation: '', roles: ['gc'] }, 'admin@x.com', 'z');
  row = sql.prepare('SELECT role, roles FROM users WHERE id = ?').get('u4');
  ok('insert writes role and roles', row.roles === 'gc' && row.role === 'gc');
  await store.updateUser('u3', { ...(await store.getUser('u3')), roles: [] }, 'admin@x.com', 'z');
  row = sql.prepare('SELECT role, roles FROM users WHERE id = ?').get('u3');
  ok('removing every role clears both columns', row.roles === null && row.role === null);
  // a row written by older code (role only, after the migration) is still read
  sql.prepare(`UPDATE users SET role = 'counsel', roles = NULL WHERE id = 'u3'`).run();
  ok('a role written by older code is still read', (await store.getUser('u3')).roles.join() === 'counsel');
}
console.log(fails ? `\n${fails} failed` : '\nAll passed'); process.exit(fails ? 1 : 0);
