-- Reference copy of the database structure. The server creates these tables automatically (lib/store/d1.js).
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  organisation TEXT NOT NULL DEFAULT '',
  role TEXT,                         -- the first of roles; kept for one release (task 0.6) so the previous version still runs
  roles TEXT,                        -- comma-separated: counsel, gc, triodian, cro, risk, independent, board; NULL = none
  is_admin INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL, updated_by TEXT NOT NULL,
  last_seen_at TEXT,
  pending_email TEXT,                -- new address awaiting confirmation by signing in with it
  date_format TEXT,                  -- long | short | numeric | iso (NULL = long)
  time_zone TEXT,                    -- IANA time zone (NULL = the browser's)
  notify_email INTEGER NOT NULL DEFAULT 1  -- 0 = no notification emails
);
CREATE TABLE IF NOT EXISTS engagement (       -- exactly one row: this deployment's engagement
  id TEXT PRIMARY KEY CHECK (id = 'main'),
  data TEXT NOT NULL,                         -- the engagement as JSON (schema triodian.raf.v1)
  revision INTEGER NOT NULL,
  updated_at TEXT NOT NULL, updated_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS engagement_revisions (  -- the last 200 saved versions, used to merge two people's saves
  revision INTEGER PRIMARY KEY, data TEXT NOT NULL, saved_at TEXT NOT NULL, saved_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (   -- outbox: every email the app would send; status held | sending | sent | failed
  id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, key TEXT, to_email TEXT NOT NULL,
  subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, error TEXT NOT NULL DEFAULT '', sent_at TEXT
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS access_requests (  -- people who signed in but are not users yet
  email TEXT PRIMARY KEY, first_at TEXT NOT NULL, last_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 1
);
