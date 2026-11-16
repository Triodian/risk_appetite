// A D1-shaped database over SQLite (node:sqlite), the second store implementation (development plan ID.3). The same
// file is in the four engagement apps and Start (tools/sync-platform.mjs).
//
// The store (lib/store/d1.js) is written against the D1 API: prepare(sql).bind(...).run() | first() | all(), and
// batch([...]) for several statements as one transaction. Anything that offers that shape can hold the app's data, so a
// platform's database adapter is a small object, not a rewrite of the store. This one backs the Node platform
// (lib/platform/node.js) and the tests; a managed database on another cloud implements the same five calls.
//
// batch() is one transaction, as D1's is: if any statement fails, none of them is kept.
import { DatabaseSync } from 'node:sqlite';

export function sqliteDatabase(file = ':memory:') {
  const sql = new DatabaseSync(file);
  if (file !== ':memory:') { try { sql.exec('PRAGMA journal_mode = WAL'); } catch (e) { /* read-only media: fine */ } }
  const bindable = v => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);
  const stmt = (q, args = []) => ({
    bind: (...a) => stmt(q, a.map(bindable)),
    async run() { const r = sql.prepare(q).run(...args); return { success: true, meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } }; },
    async first(column) { const row = sql.prepare(q).get(...args) || null; return column && row ? row[column] : row; },
    async all() { return { success: true, results: sql.prepare(q).all(...args) }; },
    async raw() { return sql.prepare(q).all(...args).map(r => Object.values(r)); },
  });
  return {
    prepare: q => stmt(q),
    async batch(list) {
      sql.exec('BEGIN');
      try { const out = []; for (const s of list) out.push(await s.run()); sql.exec('COMMIT'); return out; }
      catch (e) { try { sql.exec('ROLLBACK'); } catch (e2) { /* already rolled back */ } throw e; }
    },
    async exec(q) { sql.exec(q); return { count: 0, duration: 0 }; },
    close() { sql.close(); },
  };
}
