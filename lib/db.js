// Database helpers. The table is created automatically the first time the API is used.
export const IDRE = /^[A-Za-z0-9_.:-]{1,64}$/;
export const MAX_BYTES = 5 * 1024 * 1024;

let ready = false;
export async function ensureSchema(db) {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS engagements (
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
  )`).run();
  ready = true;
}

export const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

/** Reads and checks an engagement sent by the app. Returns { data, text, summary } or { error }. */
export async function readEngagement(request, expectId) {
  const text = await request.text();
  if (text.length > MAX_BYTES) return { error: 'The engagement is too large to save (over 5 MB).' };
  let body;
  try { body = JSON.parse(text); } catch (e) { return { error: 'The request was not valid JSON.' }; }
  const data = body && body.data;
  if (!data || typeof data !== 'object' || data.schema !== 'triodian.raf.v1') return { error: 'Not a Risk Appetite engagement.' };
  const id = data.engagement && data.engagement.id;
  if (typeof id !== 'string' || !IDRE.test(id)) return { error: 'The engagement id is not valid.' };
  if (expectId && id !== expectId) return { error: 'The engagement id does not match the address.' };
  const s = (v, n = 200) => (typeof v === 'string' ? v : '').slice(0, n);
  const cal = data.calibration || {};
  return {
    body, data, dataText: JSON.stringify(data),
    summary: {
      id,
      insurer: s(data.engagement.insurer),
      reference: s(data.engagement.reference),
      cal_status: s(cal.status, 20),
      cal_version: Number.isInteger(cal.version) ? cal.version : 0,
    },
  };
}
