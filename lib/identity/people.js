// Shared identity: people, their memberships of each app, and sessions (development plan task 1B.2).
// The same file is in the AI Risk Appetite, AI Use Assessment, AI Confidentiality Exposure Assessment and AI Board
// Direction repos. Change it in one, copy it to the others (tools/sync-identity.mjs), and keep them identical.
//
// When a Worker has the IDENTITY binding (one D1 database shared by the suite), its users come from here instead of
// its own users table. A person is added once and keeps one name, organisation, email and set of preferences across
// the suite. What a person may do stays per app: each app has its own membership with its roles, administrator flag
// and active flag.
//
// Ids: every app keeps the user ids its engagement data already refers to. A membership's local_id is that id; a person
// added later gets the same id in every app they join.
//
// People are copied into the shared database from an app's own users table the first time that app starts with the
// binding (copyLegacyUsers, plan task 1B.5). Until then nothing changes: an app without the binding uses its own table.

export const IDENTITY_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    organisation TEXT NOT NULL DEFAULT '',
    pending_email TEXT,
    date_format TEXT,
    time_zone TEXT,
    notify_email INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS memberships (
    app TEXT NOT NULL,
    local_id TEXT NOT NULL,
    person_id TEXT NOT NULL,
    roles TEXT NOT NULL DEFAULT '',
    is_admin INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    last_seen_at TEXT,
    PRIMARY KEY (app, local_id),
    UNIQUE (app, person_id)
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS memberships_person ON memberships (person_id)`,
];

/** The apps that share the identity database, by the id each uses in memberships, with their role names for Admin.
 *  Each app's own lib/core/roles.js (or public/shared/rules.js) stays the authority on what a role may do; tests in each
 *  app check that its roles match this list. */
export const SUITE_APPS = [
  { id: 'risk-appetite', name: 'AI Risk Appetite', roles: {"counsel": "Counsel (facilitator)", "gc": "General counsel (insurer)", "triodian": "Triodian (recorder)", "cro": "CRO", "risk": "Insurer risk function", "independent": "Independent reviewer", "board": "Board record"} },
  { id: 'use-assessment', name: 'AI Use Assessment', roles: {"methodOwner": "Method owner (Triodian)", "assessor": "Assessor (Triodian)", "peer": "Peer reviewer (Triodian)", "validation": "Validation (Triodian)", "delivery": "Delivery manager (Triodian)", "counsel": "Counsel", "gc": "GC", "owner": "Arrangement owner (insurer)", "ir": "Independent reviewer", "cro": "CRO (insurer)", "executive": "Second approver (company executive)"} },
  { id: 'confidentiality', name: 'AI Confidentiality Exposure Assessment', roles: {"methodOwner": "Method owner (Triodian)", "assessor": "Assessor (Triodian)", "peer": "Classification reviewer (Triodian)", "validation": "Validation (Triodian)", "delivery": "Delivery manager (Triodian)", "counsel": "Counsel (law firm)", "gc": "GC or approving executive (company)", "dealLead": "Deal team lead (company)", "tenantOwner": "Tenant owner (company)", "checker": "Independent checker", "executive": "Second approver (company executive)"} },
  { id: 'board-direction', name: 'AI Board Direction', roles: {"methodOwner": "Method owner (Triodian)", "recorder": "Recorder (Triodian)", "advisor": "Board advisor", "gc": "General counsel", "chair": "Chair (board)", "director": "Director (board)", "ceo": "CEO or accountable executive (company)", "cro": "CRO (company, connected mode)", "areaOwner": "Area owner (company)"} },
];

const COLS = `m.local_id AS id, p.id AS person_id, p.email, p.name, p.organisation, m.roles, m.is_admin, m.active, m.created_at, m.created_by,
  m.updated_at, m.updated_by, m.last_seen_at, p.pending_email, p.date_format, p.time_zone, p.notify_email`;
const FROM = 'FROM memberships m JOIN people p ON p.id = m.person_id';
const rolesList = v => (Array.isArray(v) ? v : String(v || '').split(',')).map(x => String(x).trim()).filter(Boolean);
const toUser = r => {
  if (!r) return null;
  const roles = rolesList(r.roles);
  return {
    id: r.id, personId: r.person_id, email: r.email, name: r.name, organisation: r.organisation, roles, role: roles[0] || null,
    isAdmin: !!r.is_admin, active: !!r.active, createdAt: r.created_at, createdBy: r.created_by, updatedAt: r.updated_at, updatedBy: r.updated_by,
    lastSeenAt: r.last_seen_at || null, pendingEmail: r.pending_email || null, dateFormat: r.date_format || null, timeZone: r.time_zone || null, notify: r.notify_email !== 0,
  };
};
/** The roles an app's user record holds: a list, or an older single role. */
const rolesOfRecord = u => rolesList(Array.isArray(u.roles) && u.roles.length ? u.roles : u.role ? [u.role] : u.roles);

const readyFor = new WeakMap();
async function ensure(db) {
  if (readyFor.get(db)) return;
  await db.batch(IDENTITY_SCHEMA.map(s => db.prepare(s)));
  readyFor.set(db, true);
}

/**
 * Copies an app's own users into the shared database, once (plan task 1B.5). Each user keeps their id in this app.
 * A person already known by email (from another app) is joined, not duplicated; their name and organisation stay as
 * first recorded. Safe to run again: existing memberships are left alone. Returns { people, memberships } added.
 */
export async function copyLegacyUsers(idb, appDb, app, now = new Date().toISOString()) {
  await ensure(idb);
  const cols = (await appDb.prepare('PRAGMA table_info(users)').all()).results.map(c => c.name);
  if (!cols.length) return { people: 0, memberships: 0 };
  const has = c => cols.includes(c);
  const sel = ['id', 'email', 'name', 'organisation', has('roles') ? 'roles' : "'' AS roles", has('role') ? 'role' : 'NULL AS role', 'is_admin', 'active',
    'created_at', 'created_by', 'updated_at', 'updated_by', has('last_seen_at') ? 'last_seen_at' : 'NULL AS last_seen_at',
    has('pending_email') ? 'pending_email' : 'NULL AS pending_email', has('date_format') ? 'date_format' : 'NULL AS date_format',
    has('time_zone') ? 'time_zone' : 'NULL AS time_zone', has('notify_email') ? 'notify_email' : '1 AS notify_email'].join(', ');
  const { results } = await appDb.prepare(`SELECT ${sel} FROM users`).all();
  let people = 0, memberships = 0;
  for (const u of results) {
    const email = String(u.email || '').trim().toLowerCase(); if (!email) continue;
    if (await idb.prepare('SELECT 1 AS x FROM memberships WHERE app = ? AND local_id = ?').bind(app, u.id).first()) continue;
    let person = await idb.prepare('SELECT id FROM people WHERE email = ?').bind(email).first();
    if (!person) {
      const pid = (await idb.prepare('SELECT 1 AS x FROM people WHERE id = ?').bind(u.id).first()) ? 'p' + crypto.randomUUID().replace(/-/g, '').slice(0, 12) : u.id;
      await idb.prepare(`INSERT INTO people (id, email, name, organisation, pending_email, date_format, time_zone, notify_email, created_at, created_by, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(pid, email, u.name || '', u.organisation || '', u.pending_email || null, u.date_format || null, u.time_zone || null,
        u.notify_email === 0 ? 0 : 1, u.created_at || now, u.created_by || 'copied', u.updated_at || now, u.updated_by || 'copied').run();
      person = { id: pid }; people++;
    }
    if (await idb.prepare('SELECT 1 AS x FROM memberships WHERE app = ? AND person_id = ?').bind(app, person.id).first()) continue; // same person twice in one app: keep the first
    await idb.prepare(`INSERT INTO memberships (app, local_id, person_id, roles, is_admin, active, created_at, created_by, updated_at, updated_by, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(app, u.id, person.id, rolesOfRecord(u).join(','), u.is_admin ? 1 : 0, u.active === 0 ? 0 : 1,
      u.created_at || now, u.created_by || 'copied', u.updated_at || now, u.updated_by || 'copied', u.last_seen_at || null).run();
    memberships++;
  }
  return { people, memberships };
}

/**
 * The user methods of an app's store, read from the shared database for one app. Same names and shapes as the app's
 * own store (lib/store/d1.js), so the rest of the server does not change. appDb: the app's own database, copied from
 * once on first use.
 */
export function identityUsers(idb, app, appDb) {
  let copied = false;
  const one = async (where, ...args) => toUser(await idb.prepare(`SELECT ${COLS} ${FROM} WHERE m.app = ? AND ${where}`).bind(app, ...args).first());
  const person = async id => idb.prepare('SELECT person_id FROM memberships WHERE app = ? AND local_id = ?').bind(app, id).first();
  return {
    async initIdentity() {
      await ensure(idb);
      if (!copied && appDb) { await copyLegacyUsers(idb, appDb, app); copied = true; }
    },
    async getUserByEmail(email) { return one('p.email = ?', String(email).toLowerCase()); },
    async getUser(id) { return one('m.local_id = ?', id); },
    async listUsers() { const { results } = await idb.prepare(`SELECT ${COLS} ${FROM} WHERE m.app = ? ORDER BY m.active DESC, p.name COLLATE NOCASE, p.email`).bind(app).all(); return results.map(toUser); },
    async countActiveAdmins() { const r = await idb.prepare('SELECT COUNT(*) AS n FROM memberships WHERE app = ? AND is_admin = 1 AND active = 1').bind(app).first(); return r.n; },
    /** Adds a member. A person already in the suite (by email) joins with their existing record and id. */
    async insertUser(u, by, now) {
      const email = String(u.email).toLowerCase();
      let p = await idb.prepare('SELECT id FROM people WHERE email = ?').bind(email).first();
      // A known person keeps their name and organisation unless new ones are given.
      if (p && (u.name || u.organisation)) await idb.prepare("UPDATE people SET name = CASE WHEN ? <> '' THEN ? ELSE name END, organisation = CASE WHEN ? <> '' THEN ? ELSE organisation END, updated_at = ?, updated_by = ? WHERE id = ?").bind(u.name || '', u.name || '', u.organisation || '', u.organisation || '', now, by, p.id).run();
      if (!p) {
        p = { id: u.id };
        await idb.prepare(`INSERT INTO people (id, email, name, organisation, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(p.id, email, u.name || '', u.organisation || '', now, by, now, by).run();
      }
      // In this app the person keeps the id other apps know them by, unless that id is taken here.
      const taken = await idb.prepare('SELECT 1 AS x FROM memberships WHERE app = ? AND local_id = ?').bind(app, p.id).first();
      const local = taken ? u.id : p.id;
      await idb.prepare(`INSERT INTO memberships (app, local_id, person_id, roles, is_admin, active, created_at, created_by, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`).bind(app, local, p.id, rolesOfRecord(u).join(','), u.isAdmin ? 1 : 0, now, by, now, by).run();
      u.id = local; // callers read the user back by this id
    },
    /** Changes a member: roles, administrator and active here; name, organisation and email for the whole suite. */
    async updateUser(id, u, by, now) {
      const m = await person(id); if (!m) return;
      await idb.batch([
        idb.prepare('UPDATE memberships SET roles = ?, is_admin = ?, active = ?, updated_at = ?, updated_by = ? WHERE app = ? AND local_id = ?')
          .bind(rolesOfRecord(u).join(','), u.isAdmin ? 1 : 0, u.active ? 1 : 0, now, by, app, id),
        idb.prepare('UPDATE people SET email = ?, name = ?, organisation = ?, updated_at = ?, updated_by = ? WHERE id = ?')
          .bind(String(u.email).toLowerCase(), u.name || '', u.organisation || '', now, by, m.person_id),
      ]);
    },
    async getUserByPendingEmail(email) { return one('p.pending_email = ? AND m.active = 1', String(email).toLowerCase()); },
    async setPendingEmail(id, email, now) { const m = await person(id); if (m) await idb.prepare('UPDATE people SET pending_email = ?, updated_at = ?, updated_by = email WHERE id = ?').bind(email, now, m.person_id).run(); },
    async confirmEmail(id, email, now) { const m = await person(id); if (m) await idb.prepare('UPDATE people SET email = ?, pending_email = NULL, updated_at = ?, updated_by = ? WHERE id = ?').bind(email, now, email, m.person_id).run(); },
    async updateProfile(id, name, organisation, now) { const m = await person(id); if (m) await idb.prepare('UPDATE people SET name = ?, organisation = ?, updated_at = ?, updated_by = email WHERE id = ?').bind(name, organisation, now, m.person_id).run(); },
    async updatePrefs(id, dateFormat, timeZone, notify) { const m = await person(id); if (m) await idb.prepare('UPDATE people SET date_format = ?, time_zone = ?, notify_email = ? WHERE id = ?').bind(dateFormat, timeZone, notify ? 1 : 0, m.person_id).run(); },
    async touchUser(id, now) { await idb.prepare('UPDATE memberships SET last_seen_at = ? WHERE app = ? AND local_id = ?').bind(now, app, id).run(); },
    /** Each listed user's memberships of the other apps: { [localId]: [{ app, name, roles, isAdmin, active }] }, for Admin. */
    async otherApps(ids) {
      const out = {}; if (!ids || !ids.length) return out;
      const { results } = await idb.prepare(`SELECT here.local_id AS id, o.app, o.roles, o.is_admin, o.active FROM memberships here
        JOIN memberships o ON o.person_id = here.person_id AND o.app <> here.app WHERE here.app = ?`).bind(app).all();
      const want = new Set(ids);
      for (const r of results) if (want.has(r.id)) { const a = SUITE_APPS.find(x => x.id === r.app) || { name: r.app, roles: {} }, roles = rolesList(r.roles); (out[r.id] = out[r.id] || []).push({ app: r.app, name: a.name, roles, roleNames: roles.map(x => a.roles[x] || x), isAdmin: !!r.is_admin, active: !!r.active }); }
      return out;
    },
  };
}

/** Wraps an app's store so its user methods come from the shared database. The store's own init runs first. */
export function withIdentity(store, ids) {
  if (!ids) return store;
  const init = store.init.bind(store);
  return Object.assign(store, ids, { async init() { await init(); await ids.initIdentity(); } });
}
