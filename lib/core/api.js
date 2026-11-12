// The app's API, independent of any cloud provider.
// handle() takes a plain request description and a storage adapter, and returns { status, body }.
// Cloudflare wiring lives in src/worker.js; an AWS Lambda or Azure Functions entry point would call handle() the same way.
import { appetiteArtefacts, FORMAT as EVIDENCE_FORMAT } from '../../public/shared/evidence.js';
import { merge3 } from './merge.js';
import { eventsFromSave, deliver } from './notify.js';
import { nextReview, archiveLabel } from './review.js';
import { ROLES, ROLE_IDS, PERMISSIONS, can, rolesOf, independenceError } from './roles.js';
import { checkSave, buildPeople } from './rbac.js';
import { BOOTSTRAP_ADMINS } from '../config.js';

const MAX_BYTES = 5 * 1024 * 1024;
const EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[^\s@<>"']{2,}$/;
const ok = (body, status = 200) => ({ status, body });
const fail = (status, error, extra) => ({ status, body: { error, ...(extra || {}) } });
const newId = () => 'u' + crypto.getRandomValues(new Uint32Array(2)).reduce((s, n) => s + n.toString(36), '').slice(0, 10);
const publicUser = u => ({ id: u.id, email: u.email, name: u.name, organisation: u.organisation, roles: rolesOf(u), role: rolesOf(u)[0] || null, isAdmin: u.isAdmin, active: u.active, pendingEmail: u.pendingEmail || null, dateFormat: u.dateFormat || null, timeZone: u.timeZone || null, notify: u.notify !== false });

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
  // FIRST_ADMINS (set by the installer, plan task 1B.6) names a client deployment's first administrators the same way.
  if (!me && BOOTSTRAP_ADMINS.concat(req.firstAdmins || []).map(e => e.toLowerCase()).includes(req.email) && (await store.countActiveAdmins()) === 0) {
    me = { id: newId(), email: req.email, name: '', organisation: '', roles: [], role: null, isAdmin: true, active: true };
    await store.insertUser(me, 'bootstrap', now);
    await store.audit(req.email, 'user.create', me.id, { email: req.email, isAdmin: true, reason: 'first administrator' }, now);
    me = await store.getUserByEmail(req.email);
  }
  // Demo administrators (DEMO ADDITION): emails in the Worker variable DEMO_ADMINS are made active administrators
  // whenever they sign in, so a shared demo account always has full access. Leave DEMO_ADMINS empty on a client site.
  if ((req.demoAdmins || []).includes(req.email) && (!me || !me.isAdmin || !me.active)) {
    if (!me) {
      me = { id: newId(), email: req.email, name: 'Demo user', organisation: 'Triodian demo', roles: [], role: null, isAdmin: true, active: true };
      await store.insertUser(me, 'demo', now);
      await store.audit(req.email, 'user.create', me.id, { email: req.email, isAdmin: true, reason: 'demo administrator (DEMO_ADMINS)' }, now);
    } else {
      await store.updateUser(me.id, { ...me, isAdmin: true, active: true }, 'demo', now);
      await store.audit(req.email, 'user.update', me.id, { email: req.email, changed: { isAdmin: { from: me.isAdmin, to: true }, active: { from: me.active, to: true } }, reason: 'demo administrator (DEMO_ADMINS)' }, now);
    }
    me = await store.getUserByEmail(req.email);
  }
  // Confirming an email change: the person signed in with the new address they asked for.
  if (!me) {
    const pend = await store.getUserByPendingEmail(req.email);
    if (pend) {
      await store.confirmEmail(pend.id, req.email, now);
      await store.audit(req.email, 'user.email', pend.id, { from: pend.email, to: req.email }, now);
      me = await store.getUserByEmail(req.email);
    }
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
    if (route === 'GET /me') return ok({ user: publicUser(me), roles: ROLES, site: req.site || '' });

    // ---- your own profile ----
    if (route === 'PUT /me') {
      const b = await readJson();
      const name = (typeof b.name === 'string' ? b.name.trim() : '').slice(0, 120), organisation = (typeof b.organisation === 'string' ? b.organisation.trim() : '').slice(0, 120);
      if (!name) return fail(400, 'Enter your name.');
      await store.updateProfile(me.id, name, organisation, now);
      const changed = {}; if (name !== me.name) changed.name = { from: me.name, to: name }; if (organisation !== me.organisation) changed.organisation = { from: me.organisation, to: organisation };
      if (Object.keys(changed).length) await store.audit(actor, 'user.profile', me.id, { email: me.email, changed }, now);
      return ok({ user: publicUser(await store.getUser(me.id)) });
    }
    if (route === 'PUT /me/prefs') {
      const b = await readJson();
      const df = ['long', 'short', 'numeric', 'iso'].includes(b.dateFormat) ? b.dateFormat : null;
      let tz = typeof b.timeZone === 'string' && b.timeZone ? b.timeZone.slice(0, 64) : null;
      if (tz) { try { new Intl.DateTimeFormat('en-AU', { timeZone: tz }); } catch (e) { return fail(400, 'That time zone is not recognised.'); } }
      await store.updatePrefs(me.id, df, tz, b.notify === undefined ? me.notify !== false : !!b.notify);
      return ok({ user: publicUser(await store.getUser(me.id)) });
    }
    if (route === 'POST /me/email') {
      const b = await readJson();
      const email = (typeof b.email === 'string' ? b.email.trim().toLowerCase() : '').slice(0, 254);
      if (!EMAIL.test(email)) return fail(400, 'Enter a valid email address.');
      if (email === me.email) return fail(400, 'That is already your email address.');
      if (await store.getUserByEmail(email) || await store.getUserByPendingEmail(email)) return fail(409, 'That email address is already in use.');
      await store.setPendingEmail(me.id, email, now);
      await store.audit(actor, 'user.email_requested', me.id, { from: me.email, to: email }, now);
      return ok({ user: publicUser(await store.getUser(me.id)) });
    }
    if (route === 'DELETE /me/email') {
      await store.setPendingEmail(me.id, null, now);
      return ok({ user: publicUser(await store.getUser(me.id)) });
    }

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
      let incoming = body.data, mergedWith = null;
      if ((cur ? cur.revision : 0) !== base) {
        // Someone else saved since this person opened it. Merge the two sets of changes if they don't overlap.
        const was = base > 0 && cur ? await store.getRevision(base) : null;
        const info = cur ? { revision: cur.revision, updatedAt: cur.updatedAt, updatedBy: cur.updatedBy } : {};
        if (!was || !body.data || typeof body.data !== 'object') return fail(409, 'Someone else saved the engagement since you opened it.', info);
        const m = merge3(was, body.data, cur.data);
        if (m.conflicts.length) return fail(409, 'You and ' + (cur.updatedBy || 'someone else') + ' changed the same item at the same time. Nothing of yours was saved.', Object.assign(info, { conflicts: m.conflicts.slice(0, 20) }));
        incoming = m.data; mergedWith = cur.updatedBy;
      }
      const r = checkSave(cur ? cur.data : null, incoming, me, await store.listUsers());
      if (r.error) {
        if (r.status === 403) await store.audit(actor, 'engagement.refused', 'engagement', { roles: rolesOf(me), reason: r.error }, now);
        return fail(r.status, r.error);
      }
      const from = cur ? cur.revision : 0;
      const saved = await store.putEngagement(JSON.stringify(r.data), from, actor, now);
      if (!saved) return fail(409, 'Someone else saved the engagement at the same moment. Try again.');
      const added = (r.data.history || []).length - (cur ? (cur.data.history || []).length : 0);
      await store.audit(actor, from === 0 ? 'engagement.create' : 'engagement.save', 'engagement', { revision: from + 1, roles: rolesOf(me), changes: added, ...(mergedWith ? { mergedWith } : {}) }, now);
      if (cur) { const users = await store.listUsers(); const job = deliver(eventsFromSave(cur.data, r.data, users, me, req.origin || ''), store, req.sender || null, now); if (req.defer) req.defer(job); else await job; }
      if (mergedWith) { r.data.people = buildPeople(await store.listUsers(), r.data.people); return ok({ revision: from + 1, updatedAt: now, updatedBy: actor, merged: true, mergedWith, data: r.data }); }
      return ok({ revision: from + 1, updatedAt: now, updatedBy: actor, history: r.data.history.slice(-Math.max(added, 0)) });
    }

    // ---- the calibration set, for the AI Use Assessment app ----
    // The latest version the board approved (or, before any approval, the latest the CRO agreed),
    // exactly as it was issued. Never the positions as they are being edited.
    if (route === 'GET /calibration-set') return issuedCalibration(store);
    // ---- the board view, for the AI Board Direction app (task 3.6) ----
    if (route === 'GET /board-view') return boardView(store);

    // ---- the in-use feed from the AI Use Assessment app (task 3.7) ----
    if (route === 'GET /feedback-from-assessment') {
      if (!req.readFeedback) return fail(503, 'The link to the Use Assessment app is not set up on this site yet: this Worker has no ASSESSMENT service binding. Load the register extract from a file instead.', { code: 'not_linked' });
      const d = await req.readFeedback();
      if (d.error) return fail(d.status === 404 ? 404 : 502, d.error);
      return ok(d);
    }

    // ---- the board directions from the AI Board Direction app (task 3.5) ----
    if (route === 'GET /directions-from-board') {
      if (!req.readDirections) return fail(503, 'The link to the Board Direction app is not set up on this site yet: this Worker has no BOARD service binding. Load the board directions from a file instead.', { code: 'not_linked' });
      const d = await req.readDirections();
      if (d.error) return fail(d.status === 404 ? 404 : 502, d.error);
      return ok(d);
    }

    // ---- earlier reviews (read-only, any active user) ----
    if (route === 'GET /archive') return ok({ entries: await store.listArchive() });
    if (req.method === 'GET' && parts[1] === 'archive' && parts.length === 3) {
      const a = await store.getArchive(Number(parts[2])); if (!a) return fail(404, 'That earlier review was not found.');
      a.data.people = buildPeople(await store.listUsers(), a.data.people);
      return ok({ id: a.id, label: a.label, archivedAt: a.archived_at, archivedBy: a.archived_by, data: a.data });
    }

    // ---- administration ----
    if (parts[1] === 'admin') {
      if (!me.isAdmin) return fail(403, 'Only administrators can do this.', { code: 'not_admin' });

      if (route === 'GET /admin/users') {
        return ok({
          users: (await store.listUsers()), me: me.id, roles: ROLES,
          // With the shared identity (plan task 1B.2): each person's memberships of the other apps, shown in Admin.
          otherApps: store.otherApps ? await store.otherApps((await store.listUsers()).map(u => u.id)) : {},
          permissions: PERMISSIONS.map(p => ({ what: p.what, adminOnly: !!p.adminOnly, roles: p.adminOnly ? [] : ROLE_IDS.filter(r => can(p.target, r)) })),
          accessRequests: await store.listAccessRequests(),
        });
      }
      if (route === 'GET /admin/audit') return ok({ entries: await store.listAudit(300) });
      if (route === 'POST /admin/next-review') {
        const b = await readJson(); const cur = await store.getEngagement();
        if (!cur) return fail(409, 'There is no engagement to review yet.');
        if (b.revision !== cur.revision) return fail(409, 'The engagement has changed since you opened it. Reload and try again.');
        if ((cur.data.calibration || {}).status !== 'approved') return fail(409, 'The current appetite must be approved by the board before the next review starts.');
        const label = archiveLabel(cur.data), text = JSON.stringify(cur.data);
        const aid = await store.archiveEngagement(label, text, cur.revision, actor, now);
        const n = nextReview(cur.data, newId(), actor, now);
        if (!await store.putEngagement(JSON.stringify(n), cur.revision, actor, now)) return fail(409, 'Someone saved at the same moment. Reload and try again.');
        await store.audit(actor, 'engagement.next_review', 'engagement', { archived: aid, label }, now);
        return ok({ archived: aid, label, revision: cur.revision + 1 });
      }
      if (route === 'GET /admin/notifications') return ok({ sending: !!req.sender, entries: await store.listNotifications(200) });

      if (route === 'POST /admin/users') {
        const v = cleanUser(await readJson());
        if (v.error) return fail(400, v.error);
        if (await store.getUserByEmail(v.email)) return fail(409, 'A user with this email already exists.');
        const u = { id: newId(), ...v };
        await store.insertUser(u, actor, now);
        await store.clearAccessRequest(v.email);
        await store.audit(actor, 'user.create', u.id, { email: u.email, name: u.name, roles: rolesOf(u), isAdmin: u.isAdmin }, now);
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
        ['email', 'name', 'organisation', 'isAdmin', 'active'].forEach(k => { if ((target[k] ?? null) !== (v[k] ?? null)) changed[k] = { from: target[k] ?? null, to: v[k] ?? null }; });
        if (rolesOf(target).join() !== rolesOf(v).join()) changed.roles = { from: rolesOf(target), to: rolesOf(v) };
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
  // Several roles per person (task 0.6): roles is a list. An older client may still send one role.
  const raw = Array.isArray(b.roles) ? b.roles : b.role ? [b.role] : [];
  if (raw.some(r => typeof r !== 'string' || !ROLE_IDS.includes(r))) return { error: 'Unknown engagement role.' };
  const roles = ROLE_IDS.filter(r => raw.includes(r));   // in the standard order, without repeats
  { const why = independenceError(roles); if (why) return { error: why }; }
  const out = { email, name: s(b.name, 120), organisation: s(b.organisation, 120), roles, role: roles[0] || null, isAdmin: !!b.isAdmin, active: true };
  if (!out.name) return { error: 'Enter a name.' };
  if (withActive) out.active = b.active !== false;
  return out;
}

/** The calibration set as issued: the latest version the board approved, or before any approval the latest
 *  the CRO agreed. Read by people signed in to this app, and by the AI Use Assessment app's service token. */
export async function issuedCalibration(store) {
  await store.init();
  const e = await store.getEngagement(); const issued = e ? ((e.data.calibration || {}).issued || []).filter(x => x && x.set) : [];
  const pick = issued.filter(x => x.status === 'approved').pop() || issued.filter(x => x.status === 'working').pop();
  if (!pick) return { status: 404, body: { error: 'No calibration set has been issued yet. It is issued when the CRO agrees the working appetite.' } };
  // A later version the CRO has agreed but the board has not yet approved is named, not served.
  const later = issued.filter(x => x.version > pick.version).pop();
  return { status: 200, body: { version: pick.version, status: pick.status, issuedOn: pick.on, issuedBy: pick.by, minuteRef: pick.minuteRef || null, calibrationSet: pick.set,
    ...(later ? { laterVersion: { version: later.version, status: later.status, on: later.on } } : {}) } };
}

/** The board view (task 3.6), triodian.raf.boardview.v1: the positions the board approved (the calibration set as
 *  issued, exactly as GET /calibration-set serves it), where the appetite stands now, and the latest in-use measures
 *  from the AI Use Assessment feed. Read by the AI Board Direction app over its service binding, for each board meeting. */
/**
 * The artefacts for the APRA letter evidence index (task R.2): this engagement's, and the AI Use Assessment's when
 * readAssessment (the ASSESSMENT service binding) is given. { status, body }. A missing link is a note, not an error.
 */
export async function appetiteEvidence(store, readAssessment) {
  if (store.init) await store.init();
  const e = await store.getEngagement();
  const d = (e && e.data) || null, eng = (d && d.engagement) || {};
  const out = { format: EVIDENCE_FORMAT, app: 'RA', company: eng.insurer || '', updatedAt: (e && e.updatedAt) || null,
    artefacts: d ? appetiteArtefacts(d, e.updatedAt) : [], notes: d ? [] : ['There is no AI risk appetite engagement yet.'] };
  if (!readAssessment) out.notes.push('AI Use Assessment: this Risk Appetite site has no ASSESSMENT service binding.');
  else {
    const u = await readAssessment();
    if (u && u.error) out.notes.push('AI Use Assessment: ' + u.error);
    else if (u && Array.isArray(u.artefacts)) { out.artefacts = out.artefacts.concat(u.artefacts); if (!out.company) out.company = u.company || ''; }
  }
  return { status: 200, body: out };
}
export async function boardView(store) {
  const cal = await issuedCalibration(store);
  const e = await store.getEngagement(); if (!e) return { status: 404, body: { error: 'There is no AI risk appetite engagement yet.' } };
  const d = e.data || {}, c = d.calibration || {}, reg = d.inUse || (((d.current || {}).register || {}).measures ? d.current.register : null);
  return { status: 200, body: {
    format: 'triodian.raf.boardview.v1',
    company: (d.engagement || {}).insurer || '', sectorPack: (d.engagement || {}).sectorPack || 'generalInsurer',
    appetite: { status: c.status || 'default', version: c.version || 0, agreedOn: c.agreedOn || null, approvedOn: c.approvedOn || null, minuteRef: c.minuteRef || null },
    approved: cal.status === 200 ? cal.body : null,
    approvedNote: cal.status === 200 ? '' : cal.body.error,
    inUse: reg && reg.measures ? { on: reg.on, generated: reg.generated || null, measures: reg.measures, gapsByPriority: reg.gapsByPriority || null, overdue: reg.overdue || [] } : null,
    inUseNote: reg && reg.measures ? 'Counted from the AI Use Assessment register when its in-use feed was issued.' : 'No in-use feed has been loaded on decision 3 yet.',
  } };
}
