-- Reference copy of the database structure. The app creates this table automatically on first use.
CREATE TABLE IF NOT EXISTS engagements (
  id TEXT PRIMARY KEY,
  insurer TEXT NOT NULL DEFAULT '',
  reference TEXT NOT NULL DEFAULT '',
  cal_status TEXT NOT NULL DEFAULT '',
  cal_version INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  deleted_at TEXT
);
