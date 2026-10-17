import { json, readEngagement } from '../../../lib/db.js';

// List engagements (without their full contents).
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, insurer, reference, cal_status, cal_version, revision, created_at, created_by, updated_at, updated_by
     FROM engagements WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 500`
  ).all();
  return json({ engagements: results });
}

// Create a new engagement.
export async function onRequestPost({ request, env, data: ctx }) {
  const r = await readEngagement(request);
  if (r.error) return json({ error: r.error }, 400);
  const s = r.summary, now = new Date().toISOString();
  const exists = await env.DB.prepare('SELECT 1 FROM engagements WHERE id = ?').bind(s.id).first();
  if (exists) return json({ error: 'An engagement with this id already exists.' }, 409);
  await env.DB.prepare(
    `INSERT INTO engagements (id, insurer, reference, cal_status, cal_version, data, revision, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
  ).bind(s.id, s.insurer, s.reference, s.cal_status, s.cal_version, r.dataText, now, ctx.email, now, ctx.email).run();
  return json({ id: s.id, revision: 1, updatedAt: now, updatedBy: ctx.email }, 201);
}
