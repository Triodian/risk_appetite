// Server-side permission check for engagement saves.
// Compares the stored engagement with the one being saved and refuses changes the user's role may not make.
// Cloud-neutral: no Cloudflare, AWS or Azure code here.
import { can, rolesOf, ROLE_SHORT, TARGET_NAME, DECISIONS } from './roles.js';

const IDRE = /^[A-Za-z0-9_.:-]{1,64}$/;

/** Order-independent JSON for comparing values. */
export function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
const same = (a, b) => stable(a) === stable(b);
const keysOf = (a, b) => [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])];
const isPrefix = (oldArr, newArr, ignore = []) => {
  if (!Array.isArray(newArr) || newArr.length < oldArr.length) return false;
  const strip = x => { if (!x || typeof x !== 'object') return x; const c = { ...x }; ignore.forEach(k => delete c[k]); return c; };
  return oldArr.every((x, i) => same(strip(x), strip(newArr[i])));
};

/** The engagement's people list comes from the user list. Only the accountability areas are engagement data. */
export function buildPeople(users, fromData) {
  const areas = {};
  (fromData || []).forEach(p => { if (p && typeof p.id === 'string') areas[p.id] = Array.isArray(p.areas) ? p.areas.filter(a => typeof a === 'string' && IDRE.test(a)) : []; });
  // roles: every role the person holds (task 0.6); role: the first, kept for older screens and exports.
  return users.filter(u => rolesOf(u).length).map(u => ({
    id: u.id, name: u.name || u.email, organisation: u.organisation || '', roles: rolesOf(u), role: rolesOf(u)[0],
    active: !!u.active, areas: areas[u.id] || [],
  }));
}

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
/** Practitioner branding (development plan task 0.4): a firm, a line under it and a PNG logo of 100 KB at most.
 *  The browser applies the same rule in public/brand.js. Returns a message, or '' when it is sound. */
function practitionerError(p) {
  if (p == null) return '';
  if (typeof p !== 'object' || Array.isArray(p)) return 'The practitioner details are not valid.';
  if (p.firm != null && (typeof p.firm !== 'string' || p.firm.length > 200)) return 'The practitioner firm must be text of 200 characters or less.';
  if (p.line != null && (typeof p.line !== 'string' || p.line.length > 300)) return 'The line under the firm must be text of 300 characters or less.';
  if (p.logo != null && p.logo !== '') {
    const m = typeof p.logo === 'string' && /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(p.logo);
    if (!m || !m[1].startsWith('iVBORw0KGgo')) return 'The logo must be a PNG image.';
    if (Math.floor(m[1].length * 3 / 4) > 100 * 1024 + 2) return 'The logo must be 100 KB or less.';
  }
  return '';
}

/** The sector pack (development plan task 3.2) is fixed once any position is recorded or a version agreed. */
export const DEFAULT_PACK = 'generalInsurer';
export const packOf = d => ((d && d.engagement && d.engagement.sectorPack) || DEFAULT_PACK);
export function packLocked(d) {
  if (!d) return false;
  if (d.calibration && Number.isInteger(d.calibration.version) && d.calibration.version > 0) return true;
  return Object.values(d.decisions || {}).some(x => isObj(x) && isObj(x.cells) && Object.keys(x.cells).length > 0);
}

/** A save whose lists are not lists of records with a valid, unique key would slip past the comparisons below. */
export function structureError(d) {
  { const pe = practitionerError((d.engagement || {}).practitioner); if (pe) return pe; }
  { const sp = (d.engagement || {}).sectorPack; if (sp != null && sp !== '' && (typeof sp !== 'string' || !/^[A-Za-z][A-Za-z0-9]{0,40}$/.test(sp))) return 'The sector pack is not a valid pack id.'; }
  const list = (arr, key, what) => {
    if (arr == null) return '';
    if (!Array.isArray(arr)) return `The ${what} must be a list.`;
    const seen = new Set();
    for (const x of arr) {
      if (!isObj(x)) return `Each item in the ${what} must be a record.`;
      if (key) {
        if (typeof x[key] !== 'string' || !IDRE.test(x[key])) return `An item in the ${what} has no valid ${key}.`;
        if (seen.has(x[key])) return `Two items in the ${what} share the ${key} ${x[key]}.`;
        seen.add(x[key]);
      }
    }
    return '';
  };
  const e = list(d.challenge, 'ref', 'challenge points') || list(d.questionsForCounsel, 'ref', 'questions for counsel') || list(d.history, '', 'change history') || list(d.people, 'id', 'people');
  if (e) return e;
  if (d.decisions != null && !isObj(d.decisions)) return 'The decisions must be a record.';
  for (const [k, v] of Object.entries(d.decisions || {})) {
    if (!isObj(v)) return `Decision ${k} must be a record.`;
    if (v.cells != null && (!isObj(v.cells) || Object.values(v.cells).some(c => !isObj(c)))) return `The positions in decision ${k} must be records.`;
  }
  if (d.calibration != null) {
    if (!isObj(d.calibration)) return 'The calibration status must be a record.';
    const i = list(d.calibration.issued, '', 'issued versions'); if (i) return i;
    if (d.calibration.version != null && !Number.isInteger(d.calibration.version)) return 'The version must be a whole number.';
  }
  if (d.current != null && !isObj(d.current)) return 'The starting data must be a record.';
  return '';
}

/**
 * Checks a save. oldData is the stored engagement (null if none yet). newData is what the browser sent.
 * user: { id, email, name, roles[] } (or an older { role }). users: every user (for the people list).
 * Returns { error, status } or { data } with the engagement to store.
 */
export function checkSave(oldData, newData, user, users) {
  const roles = rolesOf(user), role = roles[0] || 'none';
  const roleText = roles.length ? roles.map(r => ROLE_SHORT[r] || r).join(', ') : ROLE_SHORT.none;
  if (!newData || typeof newData !== 'object' || newData.schema !== 'triodian.raf.v1') return { status: 400, error: 'Not a Risk Appetite engagement.' };
  if (!newData.engagement || typeof newData.engagement !== 'object') return { status: 400, error: 'The engagement details are missing.' };

  const shape = structureError(newData);
  if (shape) return { status: 400, error: shape + ' Nothing was saved.' };
  const data = JSON.parse(JSON.stringify(newData));
  data.engagement.example = false;
  data.engagement.autosave = false;
  if (oldData) data.engagement.id = oldData.engagement.id;
  else if (typeof data.engagement.id !== 'string' || !IDRE.test(data.engagement.id)) return { status: 400, error: 'The engagement id is not valid.' };
  data.people = buildPeople(users, newData.people);

  const denied = new Set(), fixed = new Set();
  // Set-up is done by administrators in /admin. Everything else follows the engagement role.
  const need = t => { if (t === 'setup' ? !user.isAdmin : !can(t, roles)) denied.add(t); };
  const editor = user.isAdmin || roles.some(r => r !== 'board');

  if (!oldData) {
    need('setup');
  } else {
    const o = oldData;
    if (packOf(o) !== packOf(data) && packLocked(o)) return { status: 409, error: 'The sector pack is fixed once a position is recorded. Nothing was saved.' };
    // engagement details
    keysOf(o.engagement, data.engagement).forEach(k => {
      if (['id', 'example', 'autosave'].includes(k) || same(o.engagement[k], data.engagement[k])) return;
      need(['overallPosition', 'boardMemo'].includes(k) ? 'overall' : 'setup');
    });
    // accountability areas
    const oldAreas = Object.fromEntries((o.people || []).map(p => [p.id, p.areas || []]));
    data.people.forEach(p => { if (!same(oldAreas[p.id] || [], p.areas)) need('setup'); });
    // starting data
    keysOf(o.current, data.current).forEach(k => {
      if (same((o.current || {})[k], (data.current || {})[k])) return;
      need(/^d\d$/.test(k) ? k : ({ offshoring: 'd6', commonPair: 'd3', register: 'd3' }[k] || 'setup'));
    });
    // decisions
    keysOf(o.decisions, data.decisions).forEach(d => {
      const a = (o.decisions || {})[d] || {}, b = (data.decisions || {})[d] || {};
      if (same(a, b)) return;
      if (!DECISIONS.includes(d)) { denied.add('setup'); return; }
      keysOf(a, b).forEach(k => {
        if (same(a[k], b[k])) return;
        // Anyone with a role may record that the reference table was shown (append only).
        if (d === 'd3' && k === 'referenceShown' && roles.length && isPrefix(a[k] || [], b[k])) return;
        need(d);
      });
    });
    if (!same(o.measureOwners || {}, data.measureOwners || {})) need('measures');
    // challenge points and questions for counsel
    const items = (oldArr, newArr, respTarget) => {
      const om = new Map((oldArr || []).map(x => [x.ref, x])), nm = new Map((newArr || []).map(x => [x.ref, x]));
      nm.forEach((x, ref) => {
        const was = om.get(ref);
        if (!was) return need(x.decision || 'setup');
        keysOf(was, x).forEach(k => {
          if (same(was[k], x[k])) return;
          if (['decision', 'raisedBy', 'cell'].includes(k)) { if (!user.isAdmin) fixed.add(ref); return; }
          if (['response', 'status'].includes(k)) need(respTarget);
          else { need(was.decision || 'setup'); need(x.decision || 'setup'); }
        });
      });
      om.forEach((x, ref) => { if (!nm.has(ref)) need(x.decision || 'setup'); });
    };
    items(o.challenge, data.challenge, 'challengeResponse');
    items(o.questionsForCounsel, data.questionsForCounsel, 'qcResponse');
    // calibration status, version, agreement and approval
    const oc = o.calibration || {}, nc = data.calibration || {};
    // A new version is raised by the app when a change alters the calibration set. It must come with such a change
    // (which the role checks above have already allowed or refused), go up by exactly one, and leave the new
    // version waiting for the CRO's agreement.
    const content = ['decisions', 'current', 'functions', 'criticalOperations'].some(k => !same(o[k], data[k]));
    const raised = (nc.version || 0) > (oc.version || 0);
    if (raised) {
      const was = oc.status || 'default';
      if (was === 'default') { if (nc.version !== 1 || nc.status !== 'working') denied.add('agree'); }
      else if (!editor || !content || nc.version !== (oc.version || 0) + 1 || nc.status !== 'working') denied.add('setup');
      else { nc.agreedBy = ''; nc.agreedById = ''; nc.agreedOn = ''; }
    }
    const reopen = raised && (oc.status || 'default') !== 'default';
    keysOf(oc, nc).forEach(k => {
      if (same(oc[k], nc[k])) return;
      if (k === 'version') { if (!raised) denied.add('setup'); return; }
      if (k === 'status') {
        const t = oc.status + '>' + nc.status;
        if (t === 'default>working') need('agree');
        else if (t === 'working>approved') { need('approval'); if (!nc.agreedById) denied.add('approval'); }
        else if (t === 'approved>working' && reopen) return;
        else denied.add('agree');
        return;
      }
      if (['agreedBy', 'agreedById', 'agreedOn'].includes(k)) { if (reopen && !nc[k]) return; need('agree'); return; }
      if (['approvedOn', 'minuteRef', 'approvedBy'].includes(k)) { need('approval'); return; }
      if (k === 'issued') {
        if (!isPrefix(oc.issued || [], nc.issued)) { denied.add('agree'); return; }
        // Each new issued version is recorded in the signed-in user's name.
        (nc.issued || []).slice((oc.issued || []).length).forEach(x => {
          need(x.status === 'approved' ? 'approval' : 'agree');
          if (x.status === 'approved') { x.recordedBy = user.name || user.email; x.by = nc.approvedBy || x.recordedBy; }
          else x.by = user.name || user.email;
          if (x.version !== nc.version) denied.add('agree');
        });
        return;
      }
      need('setup');
    });
    if (nc.agreedById && nc.agreedById !== oc.agreedById && nc.agreedById !== user.id) denied.add('agree');
    if (nc.agreedById && nc.agreedById !== oc.agreedById) nc.agreedBy = user.name || user.email;
    // everything else at the top level is set-up
    keysOf(o, data).forEach(k => {
      if (['schema', 'engagement', 'people', 'current', 'decisions', 'measureOwners', 'challenge', 'questionsForCounsel', 'calibration', 'history'].includes(k)) return;
      if (!same(o[k], data[k])) need('setup');
    });
    // history is append only; new entries are signed by the server
    if (!isPrefix(o.history || [], data.history, ['by'])) return { status: 409, error: 'The change history does not match the saved engagement. Reload to get the latest version.' };
    data.history = (o.history || []).concat((data.history || []).slice((o.history || []).length));
  }

  if (fixed.size) return { status: 403, error: `Who raised a challenge point, its decision and its position cannot be changed (${[...fixed].join(', ')}). Raise a new point instead. Nothing was saved.` };
  if (denied.size) {
    const names = [...denied].map(t => TARGET_NAME[t] || t).join(', ');
    return { status: 403, error: denied.has('setup') && denied.size === 1 ? `Only administrators can change set-up. Nothing was saved.` : `${roles.length > 1 ? 'Your roles' : 'Your role'} (${roleText}) cannot change ${names}. Nothing was saved.` };
  }
  const by = `${user.name || user.email} (${roleText})`;
  const start = oldData ? (oldData.history || []).length : 0;
  data.history = (data.history || []).map((h, i) => (i >= start && h && typeof h === 'object' ? { ...h, by } : h));
  return { data };
}
