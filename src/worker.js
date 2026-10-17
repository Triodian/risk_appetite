// Cloudflare Worker for the AI Risk Appetite app.
// Static files in /public are served directly by Cloudflare. Requests to /api/* come here.
// Every /api request must carry a valid Cloudflare Access sign-in (see lib/auth.js).
import { authenticate } from '../lib/auth.js';
import { ensureSchema, json, readEngagement, IDRE } from '../lib/db.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    const who = await authenticate(request, env);
    if (!who.email) return json({ error: who.error }, who.status || 401);
    if (!env.DB) return json({ error: 'The database is not connected to this site yet.' }, 503);
    await ensureSchema(env.DB);

    const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
    const m = request.method;
    try {
      if (parts[1] === 'me' && parts.length === 2 && m === 'GET') return json({ email: who.email });
      if (parts[1] === 'engagements' && parts.length === 2) {
        if (m === 'GET') return listEngagements(env);
        if (m === 'POST') return createEngagement(request, env, who.email);
      }
      if (parts[1] === 'engagements' && parts.length === 3) {
        const id = decodeURIComponent(parts[2]);
        if (!IDRE.test(id)) return json({ error: 'Not found.' }, 404);
        if (m === 'GET') return getEngagement(env, id);
        if (m === 'PUT') return saveEngagement(request, env, id, who.email);
      }
      return json({ error: 'Not found.' }, 404);
    } catch (e) {
      return json({ error: 'The server hit an error. Try again.' }, 500);
    }
  },
};

// List engagements (without their full contents).
async function listEngagements(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, insurer, reference, cal_status, cal_version, revision, created_at, created_by, updated_at, updated_by
     FROM engagements WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 500`
  ).all();
  return json({ engagements: results });
}

// Create a new engagement.
async function createEngagement(request, env, email) {
  const r = await readEngagement(request);
  if (r.error) return json({ error: r.error }, 400);
  const s = r.summary, now = new Date().toISOString();
  const exists = await env.DB.prepare('SELECT 1 FROM engagements WHERE id = ?').bind(s.id).first();
  if (exists) return json({ error: 'An engagement with this id already exists.' }, 409);
  await env.DB.prepare(
    `INSERT INTO engagements (id, insurer, reference, cal_status, cal_version, data, revision, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
  ).bind(s.id, s.insurer, s.reference, s.cal_status, s.cal_version, r.dataText, now, email, now, email).run();
  return json({ id: s.id, revision: 1, updatedAt: now, updatedBy: email }, 201);
}

// Open one engagement.
async function getEngagement(env, id) {
  const row = await env.DB.prepare(
    `SELECT data, revision, updated_at AS updatedAt, updated_by AS updatedBy FROM engagements WHERE id = ? AND deleted_at IS NULL`
  ).bind(id).first();
  if (!row) return json({ error: 'Not found.' }, 404);
  return json({ id, revision: row.revision, updatedAt: row.updatedAt, updatedBy: row.updatedBy, data: JSON.parse(row.data) });
}

// Save changes. The app sends the revision it last loaded; if someone else saved since, the save is refused (409).
async function saveEngagement(request, env, id, email) {
  const r = await readEngagement(request, id);
  if (r.error) return json({ error: r.error }, 400);
  const base = r.body.revision;
  if (!Number.isInteger(base)) return json({ error: 'Missing revision.' }, 400);
  const s = r.summary, now = new Date().toISOString();
  const res = await env.DB.prepare(
    `UPDATE engagements SET insurer = ?, reference = ?, cal_status = ?, cal_version = ?, data = ?, revision = revision + 1, updated_at = ?, updated_by = ?
     WHERE id = ? AND revision = ? AND deleted_at IS NULL`
  ).bind(s.insurer, s.reference, s.cal_status, s.cal_version, r.dataText, now, email, id, base).run();
  if (res.meta.changes === 1) return json({ id, revision: base + 1, updatedAt: now, updatedBy: email });
  const cur = await env.DB.prepare(
    `SELECT revision, updated_at AS updatedAt, updated_by AS updatedBy FROM engagements WHERE id = ? AND deleted_at IS NULL`
  ).bind(id).first();
  if (!cur) return json({ error: 'Not found.' }, 404);
  return json({ error: 'Someone else saved this engagement since you opened it.', revision: cur.revision, updatedAt: cur.updatedAt, updatedBy: cur.updatedBy }, 409);
}
