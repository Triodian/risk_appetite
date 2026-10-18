// Storage adapter: Cloudflare D1 (SQLite).
// Plain SQL so it ports to PostgreSQL (AWS RDS / Aurora) or Azure SQL with small changes.
// The rest of the server only calls the methods returned by d1Store().

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    organisation TEXT NOT NULL DEFAULT '',
    role TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    last_seen_at TEXT,
    pending_email TEXT,
    date_format TEXT,
    time_zone TEXT,
    notify_email INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS engagement (
    id TEXT PRIMARY KEY CHECK (id = 'main'),
    data TEXT NOT NULL,
    revision INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS engagement_revisions (  -- recent saved versions, so two people's edits can be merged
    revision INTEGER PRIMARY KEY,
    data TEXT NOT NULL,
    saved_at TEXT NOT NULL,
    saved_by TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS engagement_archive (  -- earlier reviews, kept read-only
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    data TEXT NOT NULL,
    revision INTEGER NOT NULL,
    archived_at TEXT NOT NULL,
    archived_by TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (  -- outbox: every email the app would send, sent or held
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    key TEXT,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT NOT NULL DEFAULT '',
    sent_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT '',
    detail TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS access_requests (
    email TEXT PRIMARY KEY,
    first_at TEXT NOT NULL,
    last_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 1
  )`,
];

const USER_COLS = 'id, email, name, organisation, role, is_admin, active, created_at, created_by, updated_at, updated_by, last_seen_at, pending_email, date_format, time_zone, notify_email';
const toUser = r => r && ({
  id: r.id, email: r.email, name: r.name, organisation: r.organisation, role: r.role || null,
  isAdmin: !!r.is_admin, active: !!r.active, createdAt: r.created_at, createdBy: r.created_by,
  updatedAt: r.updated_at, updatedBy: r.updated_by, lastSeenAt: r.last_seen_at || null, pendingEmail: r.pending_email || null, dateFormat: r.date_format || null, timeZone: r.time_zone || null, notify: r.notify_email !== 0,
});

let ready = false;

export function d1Store(db) {
  return {
    async init() {
      if (ready) return;
      await db.batch(SCHEMA.map(s => db.prepare(s)));
      // Columns added after the first release.
      const cols = (await db.prepare('PRAGMA table_info(users)').all()).results.map(c => c.name);
      if (!cols.includes('pending_email')) await db.prepare('ALTER TABLE users ADD COLUMN pending_email TEXT').run();
      if (!cols.includes('date_format')) await db.prepare('ALTER TABLE users ADD COLUMN date_format TEXT').run();
      if (!cols.includes('time_zone')) await db.prepare('ALTER TABLE users ADD COLUMN time_zone TEXT').run();
      if (!cols.includes('notify_email')) await db.prepare('ALTER TABLE users ADD COLUMN notify_email INTEGER NOT NULL DEFAULT 1').run();
      ready = true;
    },

    // users
    async getUserByEmail(email) { return toUser(await db.prepare(`SELECT ${USER_COLS} FROM users WHERE email = ?`).bind(email).first()); },
    async getUser(id) { return toUser(await db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).bind(id).first()); },
    async listUsers() { const { results } = await db.prepare(`SELECT ${USER_COLS} FROM users ORDER BY active DESC, name COLLATE NOCASE, email`).all(); return results.map(toUser); },
    async countActiveAdmins() { const r = await db.prepare('SELECT COUNT(*) AS n FROM users WHERE is_admin = 1 AND active = 1').first(); return r.n; },
    async insertUser(u, by, now) {
      await db.prepare(`INSERT INTO users (id, email, name, organisation, role, is_admin, active, created_at, created_by, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`).bind(u.id, u.email, u.name, u.organisation, u.role, u.isAdmin ? 1 : 0, now, by, now, by).run();
    },
    async updateUser(id, u, by, now) {
      await db.prepare(`UPDATE users SET email = ?, name = ?, organisation = ?, role = ?, is_admin = ?, active = ?, updated_at = ?, updated_by = ? WHERE id = ?`)
        .bind(u.email, u.name, u.organisation, u.role, u.isAdmin ? 1 : 0, u.active ? 1 : 0, now, by, id).run();
    },
    async getUserByPendingEmail(email) { return toUser(await db.prepare(`SELECT ${USER_COLS} FROM users WHERE pending_email = ? AND active = 1`).bind(email).first()); },
    async setPendingEmail(id, email, now) { await db.prepare('UPDATE users SET pending_email = ?, updated_at = ?, updated_by = email WHERE id = ?').bind(email, now, id).run(); },
    async confirmEmail(id, email, now) { await db.prepare('UPDATE users SET email = ?, pending_email = NULL, updated_at = ?, updated_by = ? WHERE id = ?').bind(email, now, email, id).run(); },
    async updateProfile(id, name, organisation, now) { await db.prepare('UPDATE users SET name = ?, organisation = ?, updated_at = ?, updated_by = email WHERE id = ?').bind(name, organisation, now, id).run(); },
    async updatePrefs(id, dateFormat, timeZone, notify) { await db.prepare('UPDATE users SET date_format = ?, time_zone = ?, notify_email = ? WHERE id = ?').bind(dateFormat, timeZone, notify ? 1 : 0, id).run(); },

    // notifications outbox
    async addNotification(n, now) {
      const r = await db.prepare('INSERT INTO notifications (created_at, key, to_email, subject, body, status) VALUES (?, ?, ?, ?, ?, ?)').bind(now, n.key, n.to, n.subject, n.body, n.status).run();
      return r.meta.last_row_id;
    },
    async hasNotification(key) { return !!(await db.prepare('SELECT 1 AS x FROM notifications WHERE key = ?').bind(key).first()); },
    async markNotification(id, status, error, now) { await db.prepare('UPDATE notifications SET status = ?, error = ?, sent_at = ? WHERE id = ?').bind(status, error || '', now, id).run(); },
    async listNotifications(limit) { const { results } = await db.prepare('SELECT id, created_at, to_email, subject, body, status, error, sent_at FROM notifications ORDER BY id DESC LIMIT ?').bind(limit).all(); return results; },
    async touchUser(id, now) { await db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').bind(now, id).run(); },

    // the single engagement
    async getEngagement() {
      const r = await db.prepare(`SELECT data, revision, updated_at, updated_by FROM engagement WHERE id = 'main'`).first();
      return r ? { data: JSON.parse(r.data), revision: r.revision, updatedAt: r.updated_at, updatedBy: r.updated_by } : null;
    },
    /** Saves only if the stored revision is still `base` (0 = nothing stored yet). */
    async putEngagement(dataText, base, by, now) {
      const res = base === 0
        ? await db.prepare(`INSERT OR IGNORE INTO engagement (id, data, revision, updated_at, updated_by) VALUES ('main', ?, 1, ?, ?)`).bind(dataText, now, by).run()
        : await db.prepare(`UPDATE engagement SET data = ?, revision = revision + 1, updated_at = ?, updated_by = ? WHERE id = 'main' AND revision = ?`).bind(dataText, now, by, base).run();
      if (res.meta.changes !== 1) return false;
      await db.batch([
        db.prepare('INSERT OR REPLACE INTO engagement_revisions (revision, data, saved_at, saved_by) VALUES (?, ?, ?, ?)').bind(base + 1, dataText, now, by),
        db.prepare('DELETE FROM engagement_revisions WHERE revision < ?').bind(base + 1 - 200),
      ]);
      return true;
    },
    async archiveEngagement(label, dataText, revision, by, now) { const r = await db.prepare('INSERT INTO engagement_archive (label, data, revision, archived_at, archived_by) VALUES (?, ?, ?, ?, ?)').bind(label, dataText, revision, now, by).run(); return r.meta.last_row_id; },
    async listArchive() { const { results } = await db.prepare('SELECT id, label, archived_at, archived_by FROM engagement_archive ORDER BY id DESC').all(); return results; },
    async getArchive(id) { const r = await db.prepare('SELECT id, label, data, archived_at, archived_by FROM engagement_archive WHERE id = ?').bind(id).first(); return r ? { ...r, data: JSON.parse(r.data) } : null; },
    async getRevision(revision) {
      const r = await db.prepare('SELECT data FROM engagement_revisions WHERE revision = ?').bind(revision).first();
      return r ? JSON.parse(r.data) : null;
    },

    // audit log and access requests
    async audit(actor, action, target, detail, now) {
      await db.prepare('INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?, ?, ?, ?, ?)').bind(now, actor, action, target || '', detail ? JSON.stringify(detail) : '').run();
    },
    async listAudit(limit) {
      const { results } = await db.prepare('SELECT at, actor, action, target, detail FROM audit_log ORDER BY id DESC LIMIT ?').bind(limit).all();
      return results.map(r => ({ ...r, detail: r.detail ? JSON.parse(r.detail) : null }));
    },
    async noteAccessRequest(email, now) {
      await db.prepare(`INSERT INTO access_requests (email, first_at, last_at, attempts) VALUES (?, ?, ?, 1)
        ON CONFLICT(email) DO UPDATE SET last_at = excluded.last_at, attempts = attempts + 1`).bind(email, now, now).run();
    },
    async listAccessRequests() {
      const { results } = await db.prepare(`SELECT a.email, a.first_at, a.last_at, a.attempts FROM access_requests a
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = a.email AND u.active = 1) ORDER BY a.last_at DESC LIMIT 100`).all();
      return results;
    },
    async clearAccessRequest(email) { await db.prepare('DELETE FROM access_requests WHERE email = ?').bind(email).run(); },
  };
}
