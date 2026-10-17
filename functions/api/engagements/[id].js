import { json, readEngagement, IDRE } from '../../../lib/db.js';

const meta = id => `SELECT revision, updated_at AS updatedAt, updated_by AS updatedBy FROM engagements WHERE id = ? AND deleted_at IS NULL`;

// Open one engagement.
export async function onRequestGet({ params, env }) {
  if (!IDRE.test(params.id)) return json({ error: 'Not found.' }, 404);
  const row = await env.DB.prepare(
    `SELECT data, revision, updated_at AS updatedAt, updated_by AS updatedBy FROM engagements WHERE id = ? AND deleted_at IS NULL`
  ).bind(params.id).first();
  if (!row) return json({ error: 'Not found.' }, 404);
  return json({ id: params.id, revision: row.revision, updatedAt: row.updatedAt, updatedBy: row.updatedBy, data: JSON.parse(row.data) });
}

// Save changes. The app sends the revision it last loaded; if someone else saved since, the save is refused (409).
export async function onRequestPut({ request, params, env, data: ctx }) {
  if (!IDRE.test(params.id)) return json({ error: 'Not found.' }, 404);
  const r = await readEngagement(request, params.id);
  if (r.error) return json({ error: r.error }, 400);
  const base = r.body.revision;
  if (!Number.isInteger(base)) return json({ error: 'Missing revision.' }, 400);
  const s = r.summary, now = new Date().toISOString();
  const res = await env.DB.prepare(
    `UPDATE engagements SET insurer = ?, reference = ?, cal_status = ?, cal_version = ?, data = ?, revision = revision + 1, updated_at = ?, updated_by = ?
     WHERE id = ? AND revision = ? AND deleted_at IS NULL`
  ).bind(s.insurer, s.reference, s.cal_status, s.cal_version, r.dataText, now, ctx.email, params.id, base).run();
  if (res.meta.changes === 1) return json({ id: params.id, revision: base + 1, updatedAt: now, updatedBy: ctx.email });
  const cur = await env.DB.prepare(meta()).bind(params.id).first();
  if (!cur) return json({ error: 'Not found.' }, 404);
  return json({ error: 'Someone else saved this engagement since you opened it.', revision: cur.revision, updatedAt: cur.updatedAt, updatedBy: cur.updatedBy }, 409);
}
