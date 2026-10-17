// The app's API, independent of any cloud provider.
// handle() takes a plain request description and a storage adapter, and returns { status, body }.
// Cloudflare wiring lives in src/worker.js; an AWS Lambda or Azure Functions entry point would call handle() the same way.
import { ROLES, ROLE_IDS, PERMISSIONS, can } from './roles.js';
import { checkSave, buildPeople } from './rbac.js';
import { BOOTSTRAP_ADMINS } from '../config.js';

const MAX_BYTES = 5 * 1024 * 1024;
const EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[^\s@<>"']{2,}$/;
const ok = (body, status = 200) => ({ status, body });
const fail = (status, error, extra) => ({ status, body: { error, ...(extra || {}) } });
const newId = () => 'u' + crypto.getRandomValues(new Uint32Array(2)).reduce((s, n) => s + n.toString(36), '').slice(0, 10);
const publicUser = u => ({ id: u.id, email: u.email, name: u.name, organisation: u.organisation, role: u.role, isAdmin: u.isAdmin, active: u.active });

/**
 * req: { method, path, email, text: () => Promise<string> }   (email comes from the identity adapter)
 * store: storage adapter (see lib/store/d1.js)
 */
export async function handle(req, store) {
  const now = new Date().toISOString();
  await store.init();
  const parts = req.path.split('/').filter(Boolean); // ['api', ...]
  const route = req.method + ' /' + parts.slice(1).join('/');

  // Who is this? Signed in is not enough: the person must be an active user.
  let me = await store.getUserByEmail(req.email);
  if (!me && BOOTSTRAP_ADMINS.map(e => e.toLowerCase()).includes(req.email) && (await store.countActiveAdmins()) === 0) {
    me = { id: newId(), email: req.email, name: '', organisation: '', role: null, isAdmin: true, active: true };
    await store.insertUser(me, 'bootstrap', now);
    await store.audit(req.email, 'user.create', me.id, { email: req.email, isAdmin: true, reason: 'first administrator' }, now);
    me = await store.getUserByEmail(req.email);
  }
  if (!me || !me.active) {
    await store.noteAccessRequest(req.email, now);
    return fail(403, 'You are signed in as ' + req.email + ', but you have not been given access to this app. Ask an administrator to add you.', { code: 'no_access', email: req.email });
  }
  if (!me.lastSeenAt || now.slice(0, 13) !== me.lastSeenAt.slice(0, 13)) await store.touchUser(me.id, now);
  const actor = me.email;

  const readJson = async () => {
    const text = await req.text();
    if (text.length > MAX_BYTES) throw Object.assign(new Error('The request is too large (over 5 MB).'), { status: 413 });
    try { return JSON.parse(text); } catch (e) { throw Object.assign(new Error('The request was not valid JSON.'), { status: 400 }); }
  };

  try {
    if (route === 'GET /me') return ok({ user: publicUser(me), roles: ROLES });

    // ---- the engagement (one per deployment) ----
    if (route === 'GET /engagement') {
      const users = await store.listUsers();
      const e = await store.getEngagement();
      if (!e) return ok({ exists: false, revision: 0, people: buildPeople(users, []) });
      e.data.people = buildPeople(users, e.data.people);
      return ok({ exists: true, revision: e.revision, updatedAt: e.updatedAt, updatedBy: e.updatedBy, data: e.data });
    }
    if (route === 'PUT /engagement') {
      const body = await readJson();
      const base = body.revision;
      if (!Number.isInteger(base) || base < 0) return fail(400, 'Missing revision.');
      const cur = await store.getEngagement();
      if ((cur ? cur.revision : 0) !== base) {
        return fail(409, 'Someone else saved the engagement since you opened it.', cur ? { revision: cur.revision, updatedAt: cur.updatedAt, updatedBy: cur.updatedBy } : {});
      }
      const r = checkSave(cur ? cur.data : null, body.data, me, await store.listUsers());
      if (r.error) {
        if (r.status === 403) await store.audit(actor, 'engagement.refused', 'engagement', { role: me.role, reason: r.error }, now);
        return fail(r.status, r.error);
      }
      const saved = await store.putEngagement(JSON.stringify(r.data), base, actor, now);
      if (!saved) return fail(409, 'Someone else saved the engagement since you opened it.');
      const added = (r.data.history || []).length - (cur ? (cur.data.history || []).length : 0);
      await store.audit(actor, base === 0 ? 'engagement.create' : 'engagement.save', 'engagement', { revision: base + 1, role: me.role, changes: added }, now);
      return ok({ revision: base + 1, updatedAt: now, updatedBy: actor, history: r.data.history.slice(-Math.max(added, 0)) });
    }

    // ---- administration ----
    if (parts[1] === 'admin') {
      if (!me.isAdmin) return fail(403, 'Only administrators can do this.', { code: 'not_admin' });

      if (route === 'GET /admin/users') {
        return ok({
          users: (await store.listUsers()), me: me.id, roles: ROLES,
          permissions: PERMISSIONS.map(p => ({ what: p.what, roles: ROLE_IDS.filter(r => can(p.target, r)) })),
          accessRequests: await store.listAccessRequests(),
        });
      }
      if (route === 'GET /admin/audit') return ok({ entries: await store.listAudit(300) });

      if (route === 'POST /admin/users') {
        const v = cleanUser(await readJson());
        if (v.error) return fail(400, v.error);
        if (await store.getUserByEmail(v.email)) return fail(409, 'A user with this email already exists.');
        const u = { id: newId(), ...v };
        await store.insertUser(u, actor, now);
        await store.clearAccessRequest(v.email);
        await store.audit(actor, 'user.create', u.id, { email: u.email, name: u.name, role: u.role, isAdmin: u.isAdmin }, now);
        return ok({ user: await store.getUser(u.id) }, 201);
      }
      if (req.method === 'PUT' && parts[2] === 'users' && parts.length === 4) {
        const target = await store.getUser(decodeURIComponent(parts[3]));
        if (!target) return fail(404, 'User not found.');
        const v = cleanUser(await readJson(), true);
        if (v.error) return fail(400, v.error);
        if (v.email !== target.email) { const other = await store.getUserByEmail(v.email); if (other && other.id !== target.id) return fail(409, 'A user with this email already exists.'); }
        if (target.id === me.id && (!v.active || !v.isAdmin)) return fail(400, 'You cannot remove your own administrator access or deactivate yourself. Ask another administrator.');
        if (target.isAdmin && target.active && (!v.isAdmin || !v.active) && (await store.countActiveAdmins()) <= 1) return fail(400, 'There must always be at least one active administrator.');
        await store.updateUser(target.id, v, actor, now);
        const changed = {};
        ['email', 'name', 'organisation', 'role', 'isAdmin', 'active'].forEach(k => { if ((target[k] ?? null) !== (v[k] ?? null)) changed[k] = { from: target[k] ?? null, to: v[k] ?? null }; });
        if (Object.keys(changed).length) await store.audit(actor, 'user.update', target.id, { email: v.email, changed }, now);
        return ok({ user: await store.getUser(target.id) });
      }
      if (route === 'POST /admin/access-requests/dismiss') {
        const b = await readJson();
        if (typeof b.email === 'string') await store.clearAccessRequest(b.email.toLowerCase());
        return ok({ done: true });
      }
    }
    return fail(404, 'Not found.');
  } catch (e) {
    if (e.status) return fail(e.status, e.message);
    throw e;
  }
}

function cleanUser(b, withActive) {
  if (!b || typeof b !== 'object') return { error: 'Missing details.' };
  const s = (v, n) => (typeof v === 'string' ? v.trim() : '').slice(0, n);
  const email = s(b.email, 254).toLowerCase();
  if (!EMAIL.test(email)) return { error: 'Enter a valid email address.' };
  const role = b.role ? String(b.role) : null;
  if (role && !ROLE_IDS.includes(role)) return { error: 'Unknown engagement role.' };
  const out = { email, name: s(b.name, 120), organisation: s(b.organisation, 120), role, isAdmin: !!b.isAdmin, active: true };
  if (!out.name) return { error: 'Enter a name.' };
  if (withActive) out.active = b.active !== false;
  return out;
}
