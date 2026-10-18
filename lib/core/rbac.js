// Server-side permission check for engagement saves.
// Compares the stored engagement with the one being saved and refuses changes the user's role may not make.
// Cloud-neutral: no Cloudflare, AWS or Azure code here.
import { can, ROLE_SHORT, TARGET_NAME, DECISIONS } from './roles.js';

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
  return users.filter(u => u.role).map(u => ({
    id: u.id, name: u.name || u.email, organisation: u.organisation || '', role: u.role,
    active: !!u.active, areas: areas[u.id] || [],
  }));
}

/**
 * Checks a save. oldData is the stored engagement (null if none yet). newData is what the browser sent.
 * user: { id, email, name, role }. users: every user (for the people list).
 * Returns { error, status } or { data } with the engagement to store.
 */
export function checkSave(oldData, newData, user, users) {
  const role = user.role || 'none';
  if (!newData || typeof newData !== 'object' || newData.schema !== 'triodian.raf.v1') return { status: 400, error: 'Not a Risk Appetite engagement.' };
  if (!newData.engagement || typeof newData.engagement !== 'object') return { status: 400, error: 'The engagement details are missing.' };

  const data = JSON.parse(JSON.stringify(newData));
  data.engagement.example = false;
  data.engagement.autosave = false;
  if (oldData) data.engagement.id = oldData.engagement.id;
  else if (typeof data.engagement.id !== 'string' || !IDRE.test(data.engagement.id)) return { status: 400, error: 'The engagement id is not valid.' };
  data.people = buildPeople(users, newData.people);

  const denied = new Set();
  // Set-up is done by administrators in /admin. Everything else follows the engagement role.
  const need = t => { if (t === 'setup' ? !user.isAdmin : !can(t, role)) denied.add(t); };
  const editor = user.isAdmin || (role !== 'none' && role !== 'board');

  if (!oldData) {
    need('setup');
  } else {
    const o = oldData;
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
        if (d === 'd3' && k === 'referenceShown' && role !== 'none' && isPrefix(a[k] || [], b[k])) return;
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
        keysOf(was, x).forEach(k => { if (!same(was[k], x[k])) need(['response', 'status'].includes(k) ? respTarget : (x.decision || 'setup')); });
      });
      om.forEach((x, ref) => { if (!nm.has(ref)) need(x.decision || 'setup'); });
    };
    items(o.challenge, data.challenge, 'challengeResponse');
    items(o.questionsForCounsel, data.questionsForCounsel, 'qcResponse');
    // calibration status, version, agreement and approval
    const oc = o.calibration || {}, nc = data.calibration || {};
    keysOf(oc, nc).forEach(k => {
      if (same(oc[k], nc[k])) return;
      if (k === 'version') { if (!editor || !(nc.version >= oc.version)) denied.add('setup'); return; }
      if (k === 'status') {
        const t = oc.status + '>' + nc.status;
        if (t === 'default>working') need('agree');
        else if (t === 'working>approved') need('approval');
        else if (t === 'approved>working' && editor) return;
        else denied.add('agree');
        return;
      }
      if (['agreedBy', 'agreedById', 'agreedOn'].includes(k)) { need('agree'); return; }
      if (['approvedOn', 'minuteRef', 'approvedBy'].includes(k)) { need('approval'); return; }
      if (k === 'issued') {
        if (!isPrefix(oc.issued || [], nc.issued)) { denied.add('agree'); return; }
        (nc.issued || []).slice((oc.issued || []).length).forEach(x => need(x && x.status === 'approved' ? 'approval' : 'agree'));
        return;
      }
      need('setup');
    });
    if (nc.agreedById && nc.agreedById !== oc.agreedById && nc.agreedById !== user.id) denied.add('agree');
    // everything else at the top level is set-up
    keysOf(o, data).forEach(k => {
      if (['schema', 'engagement', 'people', 'current', 'decisions', 'measureOwners', 'challenge', 'questionsForCounsel', 'calibration', 'history'].includes(k)) return;
      if (!same(o[k], data[k])) need('setup');
    });
    // history is append only; new entries are signed by the server
    if (!isPrefix(o.history || [], data.history, ['by'])) return { status: 409, error: 'The change history does not match the saved engagement. Reload to get the latest version.' };
    data.history = (o.history || []).concat((data.history || []).slice((o.history || []).length));
  }

  if (denied.size) {
    const names = [...denied].map(t => TARGET_NAME[t] || t).join(', ');
    return { status: 403, error: denied.has('setup') && denied.size === 1 ? `Only administrators can change set-up. Nothing was saved.` : `Your role (${ROLE_SHORT[role]}) cannot change ${names}. Nothing was saved.` };
  }
  const by = `${user.name || user.email} (${ROLE_SHORT[role]})`;
  const start = oldData ? (oldData.history || []).length : 0;
  data.history = (data.history || []).map((h, i) => (i >= start && h && typeof h === 'object' ? { ...h, by } : h));
  return { data };
}
