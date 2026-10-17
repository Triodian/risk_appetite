/* AI Risk Appetite · Triodian
   Single-page app. No libraries. Engagements are saved to the server database (Cloudflare D1) behind
   Cloudflare Access sign-in. Engagement files (.json) can still be downloaded and imported. */
(function () {
'use strict';
let C = null;            // content.json
let S = null;            // engagement
const UI = { screen: 'entry', role: 'triodian', personId: '', sel: null, drawer: false, pop: null, sheet: null, outTab: 'statement', chTab: 'challenge', chFilter: '', refQ: '', present: false, showRef: false, dirty: false, err: {}, focusVal: null };
const AT = ['A1','A2','A3','A4','A5','A6'], CO = ['C1','C2','C3','C4','C5'], EV = ['E0','E1','E2','E3','E4','E5','E6'], PRI = ['Low','Medium','High'], CONF = ['Low','Medium','High'], MARK = ['Accepted','Escalate','Not accepted'];
const ROLE_NAME = { counsel: 'Counsel', triodian: 'Triodian', cro: 'CRO', risk: 'Insurer risk', independent: 'Independent reviewer', board: 'Board record' };
const SEQ = ['setup','overview','d1','d2','d3','d4','d5','d6','d7','d8','checks','challenge','outputs'];

/* ---------- helpers ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const nowISO = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const fmtAt = s => s ? s.replace('T', ' ').slice(0, 16) : '';
const fmtLocal = s => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? s : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const rk = (arr, v) => arr.indexOf(v);
const D = id => C.decisions.find(d => d.id === id) || { id: String(id), n: '?', name: 'Unknown decision', session: '', param: '', question: '', prompts: [], startingInputs: [], levels: [], gaps: [], bands: [], priorities: [], events: [], triggers: [], markings: [] };
const sid = s => String(s).replace(/[^a-zA-Z0-9_-]/g, '_');
const scaleDef = code => { const s = [].concat(C.scales.authority, C.scales.consequence, C.scales.evidence).find(x => x.code === code); return s ? s.def : ''; };
const me = () => UI.personId && S ? person(UI.personId) : null;
const actor = () => { const p = me(); return p ? p.name + ' (' + ROLE_NAME[p.role] + ')' : ROLE_NAME[UI.role]; };
const bp = () => innerWidth >= 1024 ? 'desk' : innerWidth >= 640 ? 'tab' : 'phone';
const person = id => S.people.find(p => p.id === id);
const pname = id => { const p = person(id); return p ? p.name : ''; };
const domId = id => 'c_' + id.replace(/[^a-zA-Z0-9]/g, '_');
const scaleName = (code) => { const all = [].concat(C.scales.authority, C.scales.consequence, C.scales.evidence); const s = all.find(x => x.code === code); return s ? s.name : ''; };
const T = (id, text) => C.glossary[id] ? `<button type="button" class="term" data-term="${id}" aria-expanded="false" aria-controls="poproot">${text || esc(C.glossary[id].term)}</button>` : (text || '');
const linkify = s => esc(s).replace(/\[\[(\w+)(?:\|([^\]]+))?\]\]/g, (m, id, t) => T(id, t ? esc(t) : esc(C.glossary[id] ? C.glossary[id].term.toLowerCase() : id)));
const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

/* ---------- engagement ---------- */
function blankPos() { return { value: null, condition: '', testable: false, reason: '', proposedBy: '', recordedBy: '', owner: '', dissent: '', status: 'unset', notSetOwner: '', notSetDue: '', source: '' }; }
function newEngagement() {
  return {
    schema: 'triodian.raf.v1',
    engagement: { id: uid(), insurer: '', reference: '', counselFirm: '', privilegeMarking: '', sessionDates: ['', ''], example: false, overallPosition: '', notificationHours: '', autosave: false },
    people: [], functions: C.functions.map(f => ({ ...f })), functionsConfirmed: false, criticalOperations: [],
    inputs: C.inputs.map(i => ({ ref: i.ref, status: '', date: '', note: '' })),
    current: { d1: {}, d2: {}, d3: {}, offshoring: '', commonPair: { tier: '', consequence: '' } },
    decisions: {
      d1: { cells: {} }, d2: { cells: {} }, d3: { cells: {}, referenceShown: [] }, d4: { cells: {} }, d5: { cells: {} },
      d6: { cells: {}, jurisdictions: [] },
      d7: { cells: {}, triggers: D('d7').triggers.map(t => ({ ...t, custom: false })) },
      d8: { cells: {}, events: D('d8').events.map(e => ({ ...e, custom: false })) }
    },
    questionsForCounsel: [], challenge: [],
    calibration: { status: 'default', version: 0, agreedBy: '', agreedById: '', agreedOn: '', approvedOn: '', minuteRef: '', approvedBy: '', issued: [] },
    measureOwners: {},
    history: []
  };
}

/* ---------- cell schema ---------- */
function cellsFor(did) {
  const out = [];
  const add = (id, o) => out.push(Object.assign({ id, did }, o));
  if (did === 'd1') S.functions.forEach(f => C.locations.forEach(l => add(`d1.${f.id}.${l.id}`, { row: f.id, col: l.id, rowLabel: f.name, colLabel: l.name, kind: 'select', options: AT })));
  if (did === 'd2') {
    D('d2').levels.forEach(l => {
      if (l.code === 'C1') return;
      if (l.code === 'C5' && S.criticalOperations.length) S.criticalOperations.forEach(o => add(`d2.op.${o.id}`, { row: 'C5.' + o.id, col: 'setting', rowLabel: 'C5 · ' + (o.name || 'critical operation'), colLabel: 'Insurer\u2019s setting', kind: 'text' }));
      else add(`d2.${l.code}`, { row: l.code, col: 'setting', rowLabel: l.code + ', ' + scaleName(l.code), colLabel: 'Insurer\u2019s setting', kind: 'text' });
    });
  }
  if (did === 'd3') AT.forEach(a => CO.forEach(c => add(`d3.${a}.${c}`, { row: a, col: c, rowLabel: a + ', ' + scaleName(a), colLabel: c, kind: 'select', options: EV })));
  if (did === 'd4') {
    D('d4').gaps.forEach(g => D('d4').bands.forEach(b => add(`d4.${g.id}.${b.id}`, { row: g.id, col: b.id, rowLabel: g.name, colLabel: b.name, kind: 'select', options: PRI, group: 'matrix' })));
    D('d4').priorities.forEach(p => { add(`d4.time.${p.id}`, { row: p.id, col: 'time', rowLabel: p.id, colLabel: 'Time limit', kind: 'text', group: 'time' }); add(`d4.interim.${p.id}`, { row: p.id, col: 'interim', rowLabel: p.id, colLabel: 'Interim position', kind: 'text', group: 'time' }); });
  }
  if (did === 'd5') D('d5').bands.forEach(b => {
    add(`d5.${b.id}.notKnown`, { row: b.id, col: 'notKnown', rowLabel: b.name, colLabel: 'Not-known facts allowed per entry', kind: 'text', group: 'p6' });
    add(`d5.${b.id}.f4`, { row: b.id, col: 'f4', rowLabel: b.name, colLabel: 'F4 finding allowed to stand', kind: 'text', group: 'p6' });
    add(`d5.${b.id}.conf`, { row: b.id, col: 'conf', rowLabel: b.name, colLabel: 'Minimum confidence', kind: 'select', options: CONF, group: 'p7' });
  });
  if (did === 'd6') {
    S.decisions.d6.jurisdictions.forEach(j => { add(`d6.j.${j.id}.established`, { row: j.id, col: 'established', rowLabel: j.name || 'Jurisdiction', colLabel: 'Provider established', kind: 'select', options: MARK, group: 'p8' }); add(`d6.j.${j.id}.runs`, { row: j.id, col: 'runs', rowLabel: j.name || 'Jurisdiction', colLabel: 'AI runs', kind: 'select', options: MARK, group: 'p8' }); });
    add('d6.concentration', { row: 'conc', col: 'limit', rowLabel: 'Concentration limit', colLabel: 'Largest share (%)', kind: 'number', group: 'p9' });
  }
  if (did === 'd7') S.decisions.d7.triggers.forEach(t => {
    add(`d7.${t.ref}.threshold`, { row: t.ref, col: 'threshold', rowLabel: t.ref + ' ' + t.name, colLabel: 'Threshold', kind: 'text' });
    add(`d7.${t.ref}.time`, { row: t.ref, col: 'time', rowLabel: t.ref + ' ' + t.name, colLabel: 'Notify within (hours)', kind: 'number' });
    add(`d7.${t.ref}.to`, { row: t.ref, col: 'to', rowLabel: t.ref + ' ' + t.name, colLabel: 'Notified to', kind: 'text' });
  });
  if (did === 'd8') {
    S.decisions.d8.events.forEach(e => add(`d8.ev.${e.id}`, { row: e.id, col: 'revisit', rowLabel: e.event || 'Event', colLabel: 'What is revisited', kind: 'text' }));
    add('d8.interval', { row: 'interval', col: 'interval', rowLabel: 'Review interval', colLabel: 'Interval', kind: 'text' });
  }
  return out;
}
const allCells = () => ['d1','d2','d3','d4','d5','d6','d7','d8'].reduce((a, d) => a.concat(cellsFor(d)), []);
function cellById(id) { return cellsFor(id.split('.')[0]).find(c => c.id === id); }
function cellLabel(id) { if (/^M\d+$/.test(id)) { const m = C.measures.find(x => x.ref === id); return 'Schedule · ' + id + (m ? ' ' + m.measure : ''); } const c = cellById(id); if (!c) return id; const d = D(c.did); return `D${d.n} · ${c.rowLabel}${c.colLabel && c.kind !== 'number' || c.did === 'd7' ? ' · ' + c.colLabel : ''}`; }
const P = id => S.decisions[id.split('.')[0]].cells[id] || null;
function getPos(id) { const did = id.split('.')[0]; const cells = S.decisions[did].cells; if (!cells[id]) cells[id] = blankPos(); return cells[id]; }
const val = id => { const p = P(id); return p && p.status === 'set' ? p.value : null; };

/* ---------- starting positions ---------- */
function startingValue(id) {
  const parts = id.split('.'), did = parts[0];
  if (did === 'd1' || did === 'd3') return S.current[did][id] || '';
  if (did === 'd2') { if (parts[1] === 'op') { const o = S.criticalOperations.find(x => x.id === parts[2]); return o ? o.tolerance : ''; } return S.current.d2[parts[1]] || ''; }
  if (did === 'd4') { const d = D('d4'); if (parts[1] === 'time') return d.priorities.find(p => p.id === parts[2]).limit; if (parts[1] === 'interim') return d.priorities.find(p => p.id === parts[2]).interim; return d.matrix[parts[1]][parts[2]]; }
  if (did === 'd5') { const b = D('d5').bands.find(x => x.id === parts[1]); return b ? b[parts[2]] : ''; }
  if (did === 'd6') { if (parts[1] === 'j') { const j = S.decisions.d6.jurisdictions.find(x => x.id === parts[2]); return j ? j.start || '' : ''; } return ''; }
  if (did === 'd7') { if (parts[2] === 'threshold') { const t = S.decisions.d7.triggers.find(x => x.ref === parts[1]); return t ? t.threshold : ''; } return ''; }
  if (did === 'd8') { if (parts[1] === 'interval') return D('d8').interval; const e = S.decisions.d8.events.find(x => x.id === parts[2]); return e && !e.custom ? e.revisit : ''; }
  return '';
}
const existingValue = id => id.startsWith('d2.') ? startingValue(id) : '';

/* ---------- permissions ---------- */
const proposerRoles = did => did === 'd2' ? ['cro','risk','independent'] : ['cro','risk'];
const roleCanPropose = did => proposerRoles(did).includes(UI.role);
const eligible = did => S.people.filter(p => proposerRoles(did).includes(p.role));
/* One gate for every editable control. target: a decision id, 'setup', 'measures', 'overall', 'challengeResponse', 'qcResponse' or 'approval'. */
function can(target, role) {
  role = role || UI.role;
  if (target === 'approval') return role === 'board';
  if (role === 'board') return false;
  if (target === 'overall') return role === 'counsel' || role === 'cro';
  if (target === 'challengeResponse') return ['counsel', 'cro', 'risk'].includes(role);
  if (target === 'qcResponse') return role === 'counsel';
  if (role === 'independent') return target === 'd2';
  return true;
}
function blockReason(target) {
  if (target === 'approval') return 'Only the board record role records approval.';
  if (UI.role === 'board') return 'The board record role records approval only. It does not edit anything else.';
  if (target === 'overall') return 'The overall position is written by counsel or the CRO.';
  if (target === 'challengeResponse') return 'Challenge responses and status are recorded by counsel, the CRO or the risk function.';
  if (target === 'qcResponse') return 'Responses to questions for counsel are recorded by counsel.';
  if (UI.role === 'independent') return 'The independent reviewer advises on decision 2 only, including its starting data, questions and challenge.';
  return '';
}
const canEdit = did => can(did);
const editBlockReason = did => blockReason(did);
const whyLink = () => T('roleLimits', 'Why');
function pathTarget(path) {
  const k = path.split('.');
  if (k[0] === 'decisions') return k[1];
  if (k[0] === 'current') return k[1] === 'offshoring' ? 'd6' : k[1] === 'commonPair' ? 'd3' : k[1];
  if (path === 'engagement.overallPosition') return 'overall';
  if (k[0] === 'challenge') return 'challengeResponse';
  if (k[0] === 'questionsForCounsel') return 'qcResponse';
  if (k[0] === 'measureOwners') return 'measures';
  return 'setup';
}
const proposerOk = (did, p) => { const x = p && p.proposedBy ? person(p.proposedBy) : null; return !!(x && proposerRoles(did).includes(x.role)); };
function defaultOwner(id) { /* used by the worked example only */
  const parts = id.split('.');
  if (parts[0] === 'd1') { const ap = S.people.find(p => (p.areas || []).includes(parts[1])); if (ap) return ap.id; }
  const cro = S.people.find(p => p.role === 'cro'); return cro ? cro.id : '';
}

/* ---------- history, versioning ---------- */
function log(action, target, from, to) { S.history.push({ at: nowISO(), by: actor(), action, target, from: from === undefined ? null : from, to: to === undefined ? null : to, version: S.calibration.version }); UI.dirty = true; autosave(); }
/* The version follows the calibration set's content: compared before and after each action, raised once per action. */
let lastSig = null;
function calSig() { const cs = calibrationSet(); return JSON.stringify([cs.parameters, S.functions.map(f => [f.id, f.name]), C.locations.map(l => l.id), S.criticalOperations.map(o => [o.id, o.name]), S.decisions.d6.jurisdictions.map(j => [j.id, j.name])]); }
function versionCheck() {
  const s = calSig(), cal = S.calibration;
  if (lastSig !== null && s !== lastSig && (cal.status === 'working' || cal.status === 'approved')) {
    const was = cal.status; cal.version += 1; cal.status = 'working';
    const recent = S.history.slice().reverse().find(h => h.action !== 'version');
    S.history.push({ at: nowISO(), by: actor(), action: 'version', target: 'calibration', from: was + ' v' + (cal.version - 1), to: 'working v' + cal.version, version: cal.version, cause: recent ? recent.action + ' ' + recent.target : '' });
    UI.dirty = true; autosave();
  }
  lastSig = s;
}
function setValue(id, v, source, quiet) {
  const did = id.split('.')[0]; if (!canEdit(did)) { toast(editBlockReason(did)); return; }
  const p = getPos(id), from = p.status === 'notSet' ? 'not set' : p.value;
  v = (v === '' || v == null) ? null : v;
  if (v === p.value && p.status === 'set') return;
  if (v === null) { p.value = null; p.status = 'unset'; } else { p.value = v; p.status = 'set'; p.notSetOwner = ''; p.notSetDue = ''; }
  p.source = source || 'session'; p.recordedBy = UI.role;
  if (!quiet) log('position', id, from, v);
}
function setField(id, field, v, from) {
  const did = id.split('.')[0]; if (!canEdit(did)) return;
  const p = getPos(id); p[field] = v;
  log(field, id, from === undefined ? null : from, v);
}
function recordNotSet(id, owner, due) {
  if (!owner || !due) { UI.err[id] = 'A "not set" entry needs an owner and a due date.'; render(); return false; }
  const p = getPos(id), from = p.value; p.status = 'notSet'; p.value = null; p.notSetOwner = owner; p.notSetDue = due; p.recordedBy = UI.role; delete UI.err[id];
  log('notSet', id, from, 'not set · ' + pname(owner) + ' · ' + due); return true;
}

/* ---------- checks ---------- */
function runChecks() {
  const R = {}; C.checks.forEach(k => R[k.id] = { id: k.id, name: k.name, fails: k.fails, state: 'pass', result: '', off: [] });
  const fail = (k, id, why) => { R[k].state = 'fail'; R[k].off.push({ id, why }); };
  const cells = allCells();
  cells.forEach(c => { const p = P(c.id); if (!p || p.status === 'unset' || (p.status === 'set' && (p.value === null || p.value === ''))) fail('K1', c.id, 'blank'); else if (p.status === 'notSet' && (!p.notSetOwner || !p.notSetDue)) fail('K1', c.id, 'not set without owner and date'); else if (p.status === 'set' && !proposerOk(c.did, p)) fail('K1', c.id, 'set with no eligible proposer'); });
  const mono = (k, rows, cols, idf, scale, what) => rows.forEach((r, i) => cols.forEach((c, j) => { const id = idf(r, c), v = val(id); if (!v) return;
    for (let jj = 0; jj < j; jj++) { const l = val(idf(r, cols[jj])); if (l && rk(scale, v) < rk(scale, l)) { fail(k, id, `${v} is lower than ${l} at ${idf(r, cols[jj]).split('.').slice(1).join(' × ')}, ${what[0]}`); return; } }
    for (let ii = 0; ii < i; ii++) { const u = val(idf(rows[ii], c)); if (u && rk(scale, v) < rk(scale, u)) { fail(k, id, `${v} is lower than ${u} at ${idf(rows[ii], c).split('.').slice(1).join(' × ')}, ${what[1]}`); return; } } }));
  mono('K2', AT, CO, (r, c) => `d3.${r}.${c}`, EV, ['a lower consequence', 'a lower authority']);
  const G = D('d4').gaps.map(g => g.id), B = D('d4').bands.map(b => b.id);
  mono('K3', G, B, (r, c) => `d4.${r}.${c}`, PRI, ['a smaller consequence', 'a smaller gap']);
  cellsFor('d2').forEach(c => { const p = P(c.id), ex = (existingValue(c.id) || '').trim(); if (p && p.status === 'set' && ex && String(p.value).trim() !== ex && !p.reason.trim()) fail('K4', c.id, 'differs from the existing threshold with no reason recorded'); });
  cellsFor('d1').forEach(c => {
    const p = P(c.id); if (!p || p.status !== 'set') return;
    const cur = S.current.d1[c.id]; if (cur && rk(AT, p.value) > rk(AT, cur)) fail('K5', c.id, `${p.value} is above what is allowed today (${cur})`);
    if (c.col === 'provider') { const own = val(`d1.${c.row}.own`); if (own && rk(AT, p.value) > rk(AT, own) && !p.reason.trim()) fail('K6', c.id, `${p.value} is above own staff (${own}) with no reason recorded`); }
    if (p.condition.trim() && !p.testable) fail('K7', c.id, 'condition not marked testable from documents');
  });
  cells.forEach(c => { const p = P(c.id); if (p && p.status === 'set') { if (!p.owner) fail('K8', c.id, 'no accountable person'); else if (!person(p.owner)) fail('K8', c.id, 'owner is no longer in the people list'); } });
  C.measures.forEach(m => { const o = (S.measureOwners || {})[m.ref]; if (!o) fail('K8', m.ref, 'measure has no accountable person'); else if (!person(o)) fail('K8', m.ref, 'measure owner is no longer in the people list'); });
  const lim = parseFloat(S.engagement.notificationHours);
  S.decisions.d7.triggers.forEach(t => { const id = `d7.${t.ref}.time`, p = P(id); if (!p || p.status !== 'set') fail('K9', id, 'no time recorded'); else if (!isNaN(lim) && parseFloat(p.value) > lim) fail('K9', id, `${p.value} hours exceeds the ${lim}-hour notification procedure (I10)`); });
  const k10 = R.K10, pair = S.current.commonPair, curVals = Object.values(S.current.d3).filter(Boolean).concat(S.current.register && S.current.register.maxReceived ? [S.current.register.maxReceived] : []);
  if (!pair.tier || !pair.consequence || !curVals.length) { k10.state = 'cannot'; k10.result = 'Cannot run. Needs the current-state pre-fill for decision 3 and the most common pair, or an assessment register file.'; }
  else { const exp = val(`d3.${pair.tier}.${pair.consequence}`), max = curVals.reduce((m, v) => rk(EV, v) > rk(EV, m) ? v : m, 'E0');
    if (!exp) { k10.state = 'cannot'; k10.result = `Cannot run. No expectation recorded for the most common pair, ${pair.tier} × ${pair.consequence}.`; }
    else if (rk(EV, exp) > rk(EV, max)) { k10.state = 'warn'; k10.result = `The expectation for ${pair.tier} × ${pair.consequence} is ${exp}. The highest rung obtained today is ${max}. Most arrangements will show a gap from day one.`; k10.off.push({ id: `d3.${pair.tier}.${pair.consequence}`, why: 'above anything obtained today' }); }
    else { k10.result = `${exp} for ${pair.tier} × ${pair.consequence} is within what is obtained today (highest ${max}).`; } }
  Object.values(R).forEach(r => { if (r.id !== 'K10') r.result = r.state === 'pass' ? 'Passed.' : `${r.off.length} ${r.off.length === 1 ? 'item' : 'items'} failing.`; });
  return Object.values(R);
}
const blocking = ck => ck.filter(k => k.id !== 'K10' && k.state === 'fail');
function offenderMap(ck) { const m = {}; ck.forEach(k => k.off.forEach(o => { (m[o.id] = m[o.id] || []).push(k.id + ': ' + o.why); })); return m; }

/* ---------- decision status ---------- */
function decisionStatus(did, ck) {
  const cells = cellsFor(did); let set = 0, ns = 0, un = 0;
  cells.forEach(c => { const p = P(c.id); if (p && p.status === 'set' && proposerOk(did, p)) set++; else if (p && p.status === 'notSet') ns++; else un++; });
  const qc = S.questionsForCounsel.filter(q => q.decision === did && q.status !== 'answered').length;
  if (!set && !ns) return { label: 'Not started', cls: 'b-grey', set, ns, un, total: cells.length, qc, gate: false };
  if (un) return { label: 'In progress', cls: 'b-ochre', set, ns, un, total: cells.length, qc, gate: false };
  if (ns) return { label: 'Not set items', cls: 'b-ochre', set, ns, un, total: cells.length, qc, gate: true };
  const ids = new Set(cells.map(c => c.id)); const bad = ck.some(k => k.state === 'fail' && k.off.some(o => ids.has(o.id)));
  return bad ? { label: 'Recorded', cls: 'b-aub', set, ns, un, total: cells.length, qc, gate: true } : { label: 'Checked', cls: 'b-green', set, ns, un, total: cells.length, qc, gate: true };
}
function setupGate() {
  const hasCro = S.people.some(p => p.role === 'cro'), hasCounsel = S.people.some(p => p.role === 'counsel');
  const inp = r => { const i = S.inputs.find(x => x.ref === r); return i && (i.status === 'received' || i.status === 'notHeld'); };
  const items = [ ['At least one CRO recorded', hasCro], ['At least one counsel person recorded', hasCounsel], ['Function list confirmed', S.functionsConfirmed], ['I1 marked received or not held', inp('I1')], ['I4 marked received or not held', inp('I4')] ];
  return { ok: items.every(i => i[1]), items };
}

/* ---------- calibration ---------- */
function statusMark() { const c = S.calibration, f = c.status !== 'default' && blocking(runChecks()).length ? ' · checks failing' : '';
  if (c.status === 'approved') return `Approved appetite, version ${c.version}, ${c.approvedOn} · minute ${c.minuteRef} · approved by ${c.approvedBy || '—'}${c.agreedBy ? ' · agreed by ' + c.agreedBy + ', ' + c.agreedOn : ''}${f}`;
  if (c.status === 'working') return `Working appetite, version ${c.version}${c.agreedOn ? ', agreed ' + c.agreedOn + ' by ' + c.agreedBy : ''}${f}`;
  return 'Uncalibrated'; }
const exportBlocked = () => S.calibration.status !== 'default' && blocking(runChecks()).length > 0;
function agreeWorking() {
  const who = me(); if (!who || who.role !== 'cro') return toast('Choose a CRO person under "Acting as" in the header.');
  if (blocking(runChecks()).length) return toast('Checks K1 to K9 must pass first.');
  const c = S.calibration, from = c.status + ' v' + c.version; c.version = Math.max(1, c.version + (c.status === 'default' ? 1 : 0)); if (c.status !== 'default' && c.version === 0) c.version = 1;
  c.status = 'working'; c.agreedBy = who.name; c.agreedById = who.id; c.agreedOn = today();
  c.issued.push({ version: c.version, status: 'working', on: c.agreedOn, by: c.agreedBy });
  log('agreeWorking', 'calibration', from, 'working v' + c.version); render(); toast('Working appetite agreed. Version ' + c.version + '.');
}
function recordApproval(date, minute, by) {
  if (UI.role !== 'board') return toast('Only the board record role marks approval.');
  if (S.calibration.status !== 'working') return toast('A working appetite must be agreed first.');
  if (!date || !minute || !by) { UI.err.approval = 'Approval needs a date, a minute reference and who approved it.'; render(); return; }
  const c = S.calibration; c.status = 'approved'; c.approvedOn = date; c.minuteRef = minute; c.approvedBy = by; delete UI.err.approval;
  c.issued.push({ version: c.version, status: 'approved', on: date, minuteRef: minute, by });
  log('approve', 'calibration', 'working v' + c.version, 'approved v' + c.version + ' · ' + minute); render(); toast('Board approval recorded.');
}

/* ---------- shell ---------- */
const MARKSVG = () => (C.markSvg || '').replace('<svg', '<svg aria-hidden="true" focusable="false"');
function badge(label, cls) { return `<span class="badge ${cls}">${esc(label)}</span>`; }
function gate(ok, text) { return `<span class="gate ${ok ? 'ok' : 'no'}" role="status"><i></i>${esc(text)}</span>`; }
function calBadge() { const s = S.calibration.status; if (s !== 'default' && blocking(runChecks()).length) return badge(`${s === 'approved' ? 'Approved' : 'Working'}, version ${S.calibration.version}, checks failing`, 'b-red'); return badge(s === 'default' ? 'Default · uncalibrated' : s === 'working' ? 'Working · v' + S.calibration.version : 'Approved · v' + S.calibration.version, s === 'approved' ? 'b-green' : s === 'working' ? 'b-ochre' : 'b-grey'); }
function roleSelect(id) { const cur = UI.personId ? 'p:' + UI.personId : 'r:' + UI.role;
  return `<select id="${id}" data-act="role" aria-label="Acting as">${S.people.length ? `<optgroup label="People">${S.people.map(p => `<option value="p:${esc(p.id)}" ${cur === 'p:' + p.id ? 'selected' : ''}>${esc(p.name || 'Unnamed')} · ${esc(ROLE_NAME[p.role] || p.role)}</option>`).join('')}</optgroup>` : ''}<optgroup label="Role only">${C.roles.map(r => `<option value="r:${r.id}" ${cur === 'r:' + r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</optgroup></select>`; }
const stepOf = s => s === 'overview' || /^d\d$/.test(s) ? 'decisions' : s;
function header(ck) {
  const b = bp(), fails = blocking(ck).length, cur = stepOf(UI.screen);
  const steps = [['setup','Set-up'],['decisions','Decisions'],['checks','Checks'],['challenge','Challenge'],['outputs','Outputs']];
  return `<header class="hdr"><div class="hdr-in">
    <button class="brand" data-act="go" data-to="overview" aria-label="Triodian · go to decisions overview">${MARKSVG()}${b !== 'phone' ? '<span class="wordmark">Triodian</span>' : ''}</button>
    ${b !== 'phone' ? '<span class="vrule" aria-hidden="true"></span>' : ''}
    <span class="apptitle">AI Risk Appetite</span>
    ${b === 'desk' ? `<span class="dot" aria-hidden="true"></span>
    <nav class="steps" aria-label="Steps">${steps.map(s => `<button data-act="go" data-to="${s[0] === 'decisions' ? 'overview' : s[0]}" ${cur === s[0] ? 'aria-current="page"' : ''}>${s[1]}</button>`).join('')}</nav>` : ''}
    <div class="hdr-r">
      ${saveChip()}
      ${b !== 'phone' ? `<button class="checkcount ${fails ? 'b-red' : 'b-green'}" data-act="go" data-to="checks">${b === 'phone' ? (fails ? fails + ' failing' : 'K ✓') : (fails ? fails + (fails === 1 ? ' check failing' : ' checks failing') : 'checks pass')}</button>` : ''}
      ${b === 'desk' ? `<button class="iconbtn" data-act="present" aria-pressed="${UI.present}" title="Present mode (P)" aria-label="Present mode">⊡</button>` : ''}
      ${b !== 'phone' ? `<label class="chip"><span aria-hidden="true">⌾</span>${roleSelect('role-hdr')}</label>` : ''}
      <button class="iconbtn" data-act="drawer" aria-label="Menu" aria-expanded="${UI.drawer}">☰</button>
    </div></div></header>
    ${S.engagement.example ? '<div class="examplebar">Worked example · fictional insurer · not client data</div>' : ''}`;
}
function drawer() {
  if (!UI.drawer) return '';
  const it = (to, label, extra) => `<button class="item" data-act="go" data-to="${to}" ${UI.screen === to ? 'aria-current="page"' : ''}>${label}${extra || ''}</button>`;
  return `<div class="drawer-bg" data-act="drawer"></div><aside class="drawer" role="dialog" aria-label="Menu">
    <div class="row between"><strong>Menu</strong><button class="iconbtn" data-act="drawer" aria-label="Close menu">✕</button></div>
    <div class="grp">Steps</div>${it('setup','Set-up')}${it('overview','Decisions overview')}
    ${C.decisions.map(d => it(d.id, `<span class="mono soft" style="width:22px">${d.n}</span>${esc(d.name)}`)).join('')}
    ${it('checks','Checks')}${it('challenge','Challenge')}${it('outputs','Outputs')}${it('reference','Reference')}
    <div class="grp">Acting as</div><label class="chip" style="width:100%"><span aria-hidden="true">⌾</span>${roleSelect('role-drw')}</label>
    <div class="grp">Engagement</div>
    <button class="item" data-act="home">All engagements</button>
    <button class="item" data-act="new">New engagement</button>
    <button class="item" data-act="save">Download a copy (.json)</button>
    <button class="item" data-act="open">Import engagement file</button>
    <button class="item" data-act="example">Open worked example</button>
    ${SRV.on ? `<p class="small soft" style="padding:4px 10px">Signed in as ${esc(SRV.email)}. Changes save automatically.</p>` : '<p class="small soft" style="padding:4px 10px">The database is not reachable. Download a copy to keep your work.</p>'}
    ${bp() === 'desk' ? `<button class="item" data-act="present">Present mode ${UI.present ? '· on' : ''} <span class="mono soft" style="margin-left:auto">P</span></button>` : ''}
    <div class="grp">Apps</div>
    <div class="item" aria-current="page"><span class="appic" style="background:var(--aubergine-bg);color:var(--aubergine)">RA</span><span>AI Risk Appetite<br><span class="small soft">Board positions and calibration set</span></span><span class="badge b-green" style="margin-left:auto">now</span></div>
    <a class="item" href="AI Use Assessment.html" style="text-decoration:none"><span class="appic" style="background:#E3E9EF;color:var(--navy)">UA</span><span>AI Use Assessment<br><span class="small soft">Reads the calibration set</span></span></a>
  </aside>`;
}
function footer() {
  return `<footer class="ft"><div class="wrap">
    <div class="scope" role="note"><span aria-hidden="true">⚠</span><span><strong>Scope.</strong> ${esc(C.banner)}</span></div>
    <div class="ftrow"><span class="row" style="gap:8px;color:var(--aubergine)">${MARKSVG().replace('<svg', '<svg width="20" height="19"')}<span style="color:var(--ink);font-weight:600">Triodian</span><span class="mono soft">RAF-01 · framework ${esc(C.frameworkDate)}</span></span>
    <span class="row"><button class="lnk" data-act="go" data-to="reference">Reference</button><span class="mono">${esc(statusMark())}</span></span></div>
  </div></footer>`;
}
function entry() {
  let saved = []; try { saved = Object.keys(localStorage).filter(k => k.startsWith('raf.autosave.')); } catch (e) {}
  const n = i => `<span class="mono" style="color:var(--aubergine)">${String(i).padStart(2, '0')}</span>`;
  let list = '';
  if (SRV.on) {
    const rows = SRV.list;
    list = `<div class="eyebrow" style="margin-top:22px">Engagements</div>` + (rows == null ? '<p class="small soft">Loading…</p>'
      : SRV.listErr ? `<p class="small" style="color:var(--red)">${esc(SRV.listErr)}</p>`
      : !rows.length ? '<p class="small soft">None yet. Start a new engagement or import a file.</p>'
      : `<div class="englist" role="list">${rows.map(e => `<button class="engrow" role="listitem" data-act="openEng" data-id="${esc(e.id)}">
          <span class="engname"><strong>${esc(e.insurer || 'Untitled engagement')}</strong>${e.reference ? `<span class="small soft"> · ${esc(e.reference)}</span>` : ''}</span>
          <span class="mono small soft">${esc(e.cal_status || 'default')} v${esc(e.cal_version)}</span>
          <span class="small soft">${esc(fmtLocal(e.updated_at))} · ${esc(e.updated_by)}</span></button>`).join('')}</div>`);
  }
  let i = 0;
  const note = !SRV.checked ? 'Connecting to the database…'
    : SRV.on ? `Engagements are saved automatically to Triodian's private database. Signed in as ${esc(SRV.email)}.`
    : `The database could not be reached (${esc(SRV.reason)}). Work here is not saved; download a copy from the menu.`;
  return `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="entry-h"><div class="entry">
    <div class="row" style="gap:10px;color:var(--aubergine);margin-bottom:22px">${MARKSVG().replace('<svg', '<svg width="30" height="28"')}<span class="wordmark">Triodian</span><span class="vrule"></span><span style="font-weight:600">AI Risk Appetite</span></div>
    <div class="eyebrow">From general appetite to AI appetite</div>
    <h1 id="entry-h" class="h1" style="font-size:32px">The board decides. This records what it decides.</h1>
    <p class="soft">Eight decisions, two sessions, ten checks. The result is an AI risk appetite statement, a tolerance and trigger schedule, and the calibration set the AI Use Assessment reads.</p>
    ${list}
    <div class="acts" style="margin-top:${SRV.on ? '18px' : '0'}">
      <button class="act" data-act="new">${n(++i)}<span><strong>New engagement</strong><br><span class="small soft">Start from set-up with the framework's function list.</span></span></button>
      <button class="act" data-act="open">${n(++i)}<span><strong>Import engagement file</strong><br><span class="small soft">A .json file saved from this app${SRV.on ? '. It is added as a new engagement' : ''}.</span></span></button>
      <button class="act" data-act="example">${n(++i)}<span><strong>Open worked example</strong><br><span class="small soft">Corvane General, a fictional insurer, part-way through session 2. Never saved.</span></span></button>
      ${saved.length ? `<button class="act" data-act="resume" data-key="${esc(saved[0])}">${n(++i)}<span><strong>${SRV.on ? 'Move autosaved engagement to the database' : 'Resume autosaved engagement'}</strong><br><span class="small soft">Held in this browser from the earlier version of the app.</span></span></button>` : ''}
    </div>
    <div class="scope" style="margin-top:22px"><span aria-hidden="true">⚠</span><span>${esc(C.banner)} ${note}</span></div>
  </div></div>`;
}
function opening(eyebrow, h1, sub) { return `<div class="opening"><div class="eyebrow">${eyebrow}</div><h1 class="h1">${h1}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>`; }
function seqNav() {
  const i = SEQ.indexOf(UI.screen); if (i < 0) return { prev: null, next: null };
  return { prev: SEQ[i - 1] || null, next: SEQ[i + 1] || null };
}
const screenName = s => ({ setup: 'Set-up', overview: 'Decisions', checks: 'Checks', challenge: 'Challenge', outputs: 'Outputs', reference: 'Reference' }[s] || (D(s) ? 'Decision ' + D(s).n : s));
function stepbar(g) {
  const n = seqNav();
  return `<div class="stepbar">${n.prev ? `<button class="btn" data-act="go" data-to="${n.prev}">← ${esc(screenName(n.prev))}</button>` : '<span></span>'}${g || ''}${n.next ? `<button class="btn primary" data-act="go" data-to="${n.next}">${esc(screenName(n.next))} →</button>` : '<span></span>'}</div>`;
}
function bottombar(g) {
  if (bp() !== 'phone' || SEQ.indexOf(UI.screen) < 0) return '';
  const n = seqNav();
  return `<nav class="bottombar" aria-label="Step">${n.prev ? `<button class="btn" data-act="go" data-to="${n.prev}" aria-label="Previous: ${esc(screenName(n.prev))}">←</button>` : '<span style="width:44px"></span>'}${g || ''}${n.next ? `<button class="btn primary" data-act="go" data-to="${n.next}" aria-label="Next: ${esc(screenName(n.next))}">→</button>` : '<span style="width:44px"></span>'}</nav>`;
}

/* ---------- S1 set-up ---------- */
function fld(label, path, value, opts) {
  opts = opts || {};
  const id = 'f_' + path.replace(/[^a-zA-Z0-9]/g, '_'), dis = (opts.disabled != null ? opts.disabled : !can(pathTarget(path))) ? 'disabled' : '';
  const ctl = opts.select ? `<select class="in" id="${id}" data-path="${path}" ${dis}>${opts.select.map(o => `<option value="${esc(o[0])}" ${String(value) === String(o[0]) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`
    : opts.area ? `<textarea class="in" id="${id}" data-path="${path}" placeholder="${esc(opts.ph || '')}" ${dis}>${esc(value)}</textarea>`
    : `<input class="in" id="${id}" data-path="${path}" type="${opts.type || 'text'}" value="${esc(value)}" placeholder="${esc(opts.ph || '')}" ${dis}>`;
  return `<label class="f" for="${id}"><span>${label}</span>${ctl}</label>`;
}
function screenSetup() {
  const e = S.engagement, g = setupGate(), b = bp(), ro = !can('setup');
  const roleOpts = C.roles.map(r => [r.id, r.name]);
  const people = S.people.map((p, i) => `<div class="panel2" style="padding:14px 16px">
      <div class="fgrid">${fld('Name', `people.${i}.name`, p.name)}${fld('Organisation', `people.${i}.organisation`, p.organisation)}${fld('Role', `people.${i}.role`, p.role, { select: roleOpts })}</div>
      <div style="margin-top:10px"><div class="mini" style="margin-bottom:4px">${T('ap', 'ACCOUNTABLE-PERSON AREAS')}</div><div class="row" style="gap:4px 14px">${S.functions.map(f => `<label class="cb small"><input type="checkbox" id="area-${i}-${sid(f.id)}" data-area="${i}" value="${esc(f.id)}" ${(p.areas || []).includes(f.id) ? 'checked' : ''}>${esc(f.name)}</label>`).join('')}</div></div>
      <div class="row" style="justify-content:flex-end;margin-top:6px"><button class="btn sm ghost" data-act="rmPerson" data-i="${i}">Remove</button></div></div>`).join('');
  const inputs = S.inputs.map((x, i) => { const c = C.inputs[i]; return b === 'phone'
    ? `<div class="panel2" style="padding:12px 14px"><div class="row" style="gap:8px"><span class="mono">${esc(x.ref)}</span><strong class="small">${esc(c.name)}</strong></div><div class="mini" style="margin:4px 0 8px">Used in: ${esc(c.usedIn)}</div><div class="fgrid">${fld('Status', `inputs.${i}.status`, x.status, { select: [['','Not marked'],['received','Received'],['notHeld','Not held'],['notRequested','Not requested']] })}${fld('Date', `inputs.${i}.date`, x.date, { type: 'date' })}${fld('Note', `inputs.${i}.note`, x.note)}</div></div>`
    : `<tr><td class="code">${esc(x.ref)}</td><td>${esc(c.name)}<div class="mini">${esc(c.usedIn)}</div></td><td><select class="in" id="in-${i}-status" data-path="inputs.${i}.status" aria-label="${esc(x.ref)} status">${[['','—'],['received','Received'],['notHeld','Not held'],['notRequested','Not requested']].map(o => `<option value="${o[0]}" ${x.status === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></td><td><input class="in" type="date" id="in-${i}-date" data-path="inputs.${i}.date" value="${esc(x.date)}" aria-label="${esc(x.ref)} date"></td><td><input class="in" id="in-${i}-note" data-path="inputs.${i}.note" value="${esc(x.note)}" aria-label="${esc(x.ref)} note"></td></tr>`; }).join('');
  return `${opening('Step 1 · set-up', 'Set up the engagement', 'Who is in the room, which functions are in scope, and what the insurer has already decided.')}
  ${ro ? `<p class="err">${esc(blockReason('setup'))} ${whyLink()}</p>` : ''}
  <fieldset ${ro ? 'disabled' : ''} style="border:0;padding:0;margin:0" class="stack">
  <section class="card"><h2 class="sh">1 · Engagement</h2><div class="fgrid">
    ${fld('Insurer', 'engagement.insurer', e.insurer)}${fld('Engagement reference', 'engagement.reference', e.reference)}${fld('Counsel firm', 'engagement.counselFirm', e.counselFirm)}
    ${fld('Session 1 date', 'engagement.sessionDates.0', e.sessionDates[0], { type: 'date' })}${fld('Session 2 date', 'engagement.sessionDates.1', e.sessionDates[1], { type: 'date' })}
  </div><div style="margin-top:14px">${fld('Privilege marking · as counsel directs', 'engagement.privilegeMarking', e.privilegeMarking, { ph: 'Printed as the first line of every output' })}</div></section>
  <section class="card"><div class="row between"><h2 class="sh" style="margin:0">2 · People</h2><button class="btn sm" data-act="addPerson">Add person</button></div>
    <p class="small soft" style="margin:8px 0 14px">Every proposer, owner and approver is chosen from this list. Only people with the role CRO or insurer risk function can propose on decisions 1 and 3.</p>
    <div class="stack" style="gap:10px">${people || '<p class="soft small">No one recorded yet.</p>'}</div></section>
  <section class="card"><h2 class="sh">3 · Functions and ${T('critOp', 'critical operations')}</h2>
    <div class="grid2"><div><div class="mini" style="margin-bottom:6px">FUNCTIONS · framework starting list, editable</div>
      <div class="stack" style="gap:6px">${S.functions.map((f, i) => `<div class="row" style="flex-wrap:nowrap"><input class="in" id="fn-${i}" data-path="functions.${i}.name" value="${esc(f.name)}" aria-label="Function ${i + 1}"><button class="btn sm ghost" data-act="rmFn" data-i="${i}" aria-label="Remove ${esc(f.name)}">✕</button></div>`).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="btn sm" data-act="addFn">Add function</button><label class="cb"><input type="checkbox" data-path="functionsConfirmed" ${S.functionsConfirmed ? 'checked' : ''}> Function list confirmed</label></div></div>
    <div><div class="mini" style="margin-bottom:6px">CRITICAL OPERATIONS · from I4, with approved ${T('tolerance', 'tolerance')}</div>
      <div class="stack" style="gap:10px">${S.criticalOperations.map((o, i) => `<div class="panel2" style="padding:12px"><div class="fgrid">${fld('Operation', `criticalOperations.${i}.name`, o.name)}${fld('Tolerance', `criticalOperations.${i}.tolerance`, o.tolerance)}${fld('Source document', `criticalOperations.${i}.source`, o.source)}</div><div class="row" style="justify-content:flex-end"><button class="btn sm ghost" data-act="rmOp" data-i="${i}">Remove</button></div></div>`).join('') || '<p class="small soft">None recorded.</p>'}</div>
      <button class="btn sm" style="margin-top:10px" data-act="addOp">Add critical operation</button></div></div></section>
  <section class="card"><h2 class="sh">4 · Inputs I1 to I11</h2><p class="small soft">Requested through counsel before session 1. Starting positions on later screens draw on what is marked received.</p>
    ${b === 'phone' ? `<div class="stack" style="gap:10px">${inputs}</div>` : `<div class="tw"><table class="lg"><thead><tr><th>Ref</th><th>Input</th><th style="width:150px">Status</th><th style="width:160px">Date</th><th>Note</th></tr></thead><tbody>${inputs}</tbody></table></div>`}
    <div style="margin-top:14px;max-width:360px">${fld('I10 · notification procedure, hours the insurer can absorb', 'engagement.notificationHours', e.notificationHours, { type: 'number', ph: 'Used by check K9' })}</div></section>
  </fieldset>
  <section class="card" style="margin-top:18px"><h2 class="sh">Exit gate</h2><div class="stack" style="gap:6px">${g.items.map(i => gate(i[1], i[0])).join('')}</div></section>
  ${stepbar(gate(g.ok, g.ok ? 'Set-up complete' : 'Set-up incomplete'))}`;
}

/* ---------- S2 overview ---------- */
function screenOverview(ck) {
  const c = S.calibration;
  const cards = C.decisions.map(d => { const st = decisionStatus(d.id, ck); return `<button class="dcard" data-act="go" data-to="${d.id}">
    <div class="row between"><span class="dnum">${d.n}</span>${badge(st.label, st.cls)}</div>
    <div class="dname">${esc(d.name)}</div><div class="small soft" style="flex:1">${esc(d.question)}</div>
    <div class="row between mini"><span>Session ${d.session} · ${d.param}</span><span>${st.set + st.ns}/${st.total}${st.qc ? ' · ' + st.qc + ' QC open' : ''}</span></div></button>`; }).join('');
  return `${opening('Step 2 · decisions', 'Eight appetite decisions', 'Each is one question to the board, answered on a fixed scale and recorded with an owner.')}
  <div class="calstrip"><div class="row"><span class="sh" style="margin:0">${T('calibration', 'Calibration set')}</span>${calBadge()}<span class="mono soft">${esc(statusMark())}</span></div>
    <div class="row">${c.agreedOn ? `<span class="mono soft">agreed ${esc(c.agreedOn)} · ${esc(c.agreedBy)}</span>` : ''}<button class="btn sm" data-act="go" data-to="outputs">Outputs →</button></div></div>
  <h2 class="sh">Session 1 · decisions 1 to 3</h2><div class="dgrid" style="margin-bottom:24px">${cards.split('</button>').slice(0, 3).join('</button>')}</button></div>
  <h2 class="sh">Session 2 · decisions 4 to 8</h2><div class="dgrid">${cards.split('</button>').slice(3, 8).join('</button>')}</button></div>
  ${stepbar()}`;
}

/* ---------- decision screens ---------- */
function cellCtl(c, off, nav, aria) {
  const p = P(c.id), st = p ? p.status : 'unset', v = p && st === 'set' ? p.value : '';
  const dis = canEdit(c.did) ? '' : 'disabled', cid = esc(c.id);
  const bad = (off[c.id] || []).some(x => /^K[23]:/.test(x));
  const navA = nav ? `data-gr="${nav[0]}" data-r="${nav[1]}" data-c="${nav[2]}"` : '';
  const ph = bp() === 'phone';
  if (c.kind === 'select') return `<select id="${domId(c.id)}" class="cellsel ${st === 'notSet' ? 'notset' : !v ? 'empty' : ''} ${bad ? 'bad' : ''}" data-cell="${cid}" ${navA} ${dis} aria-label="${esc(aria)}" title="${esc(v ? v + ' ' + scaleName(v) + (scaleDef(v) ? ': ' + scaleDef(v) : '') : '')}">
    <option value="">${st === 'notSet' ? '—' : '—'}</option>${st === 'notSet' ? '<option value="__ns" selected>not set</option>' : ''}${c.options.map(o => `<option value="${o}" ${v === o ? 'selected' : ''}>${o}${ph && scaleName(o) ? ' · ' + esc(scaleName(o)) : ''}</option>`).join('')}</select>`;
  return `<input id="${domId(c.id)}" class="in ${bad ? 'bad' : ''}" style="${st === 'notSet' ? 'background:var(--ochre-bg);border-color:#E4D6AE' : ''}" type="${c.kind === 'number' ? 'number' : 'text'}" ${c.kind === 'number' ? 'min="0" inputmode="decimal"' : ''} data-cell="${cid}" ${navA} ${dis} value="${esc(v)}" placeholder="${st === 'notSet' ? 'not set' : esc(c.hint || '')}" aria-label="${esc(aria)}">`;
}
function cellMarks(c, off) {
  const p = P(c.id); let h = '';
  (off[c.id] || []).filter(x => /^K[23]:/.test(x)).forEach(x => h += `<span class="flag">${esc(x)}</span>`);
  if (p && p.status === 'set' && !proposerOk(c.did, p)) h += `<span class="mini" style="color:var(--red)">choose a proposer</span>`;
  if (p && p.status === 'notSet') h += `<span class="mini" style="color:var(--ochre)">not set · ${esc(pname(p.notSetOwner))} · ${esc(p.notSetDue)}</span>`;
  if (p && p.condition) h += `<span class="mini">cond: ${esc(p.condition)}${p.testable ? ' ✓' : ''}</span>`;
  if ((off[c.id] || []).some(x => !/^K[23]:/.test(x))) h += `<span class="mini" style="color:var(--red)">${esc((off[c.id] || []).filter(x => !/^K[23]:/.test(x)).map(x => x.split(':')[0]).join(' · '))}</span>`;
  if (bp() !== 'desk') h += `<button class="lnk mono" data-act="details" data-cell="${esc(c.id)}" style="min-height:28px">details</button>`;
  return h;
}
/* rows: [{head, sub, items:[cell | {html}]}]; cols: header html list (first = row header) */
function recArea(did, gr, cols, rows, off) {
  if (bp() === 'phone') return `<div class="stack" style="gap:12px">${rows.map(r => `<div class="card" style="padding:16px">
      <div style="font-weight:600;margin-bottom:${r.sub ? '2px' : '10px'}">${r.head}</div>${r.sub ? `<div class="small soft" style="margin-bottom:10px">${r.sub}</div>` : ''}
      <div class="stack" style="gap:10px">${r.items.map((it, i) => `<div><div class="mini" style="margin-bottom:4px">${cols[i + 1]}</div>${it.id ? `<div class="cellwrap" style="align-items:stretch">${cellCtl(it, off, null, r.label + ' · ' + strip(cols[i + 1]))}${cellMarks(it, off)}</div>` : `<div class="small">${it.html}</div>`}</div>`).join('')}</div></div>`).join('')}</div>`;
  return `<div class="tw"><table class="lg" data-grid="${gr}"><thead><tr>${cols.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>
    ${rows.map((r, ri) => `<tr><th scope="row" style="background:none;text-transform:none;letter-spacing:0;font:400 14px/1.4 var(--sans);color:var(--ink);border-bottom:1px solid var(--rule-soft);vertical-align:top">${r.head}${r.sub ? `<div class="mini">${r.sub}</div>` : ''}</th>
      ${r.items.map((it, ci) => it.id ? `<td data-td="${esc(it.id)}" class="${UI.sel === it.id ? 'sel' : ''}"><div class="cellwrap">${cellCtl(it, off, [gr, ri, ci], r.label + ' · ' + strip(cols[ci + 1]))}${cellMarks(it, off)}</div></td>` : `<td class="small">${it.html}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div>`;
}
const strip = h => String(h).replace(/<[^>]+>/g, '');
function decisionBody(did, off) {
  const cells = cellsFor(did), by = id => cells.find(c => c.id === id);
  if (did === 'd1') return recArea(did, 'g1', ['Function', 'Own staff', 'Inside a provider', T('platform', 'Platform behind a provider')],
    S.functions.map(f => ({ head: esc(f.name), label: f.name, items: C.locations.map(l => by(`d1.${f.id}.${l.id}`)) })), off);
  if (did === 'd2') {
    const d = D('d2'), rows = [];
    d.levels.forEach(l => {
      const sc = C.scales.consequence.find(x => x.code === l.code);
      if (l.code === 'C1') rows.push({ head: `<span class="mono">C1</span> immaterial`, label: 'C1', items: [{ html: esc(sc.def) }, { html: esc(l.sets) }, { html: '<span class="soft">Whatever falls below C2</span>' }, { html: 'n/a' }] });
      else if (l.code === 'C5' && S.criticalOperations.length) S.criticalOperations.forEach(o => rows.push({ head: `<span class="mono">C5</span> ${esc(o.name)}`, sub: 'approved tolerance: ' + esc(o.tolerance || '—'), label: 'C5 ' + o.name, items: [{ html: esc(sc.def) }, { html: esc(l.sets) }, by(`d2.op.${o.id}`), { html: esc(o.source || l.source) }] }));
      else rows.push({ head: `<span class="mono">${l.code}</span> ${esc(sc.name)}`, label: l.code, sub: S.current.d2[l.code] ? 'existing: ' + esc(S.current.d2[l.code]) : '', items: [{ html: esc(sc.def) }, { html: esc(l.sets) }, by(`d2.${l.code}`), { html: esc(l.source) }] });
    });
    return recArea(did, 'g2', [T('consequence', 'Level'), 'Generic definition', 'What the insurer sets', 'Insurer\u2019s setting', 'Usual source'], rows, off);
  }
  if (did === 'd3') return recArea(did, 'g3', [T('tier', 'Authority'), ...CO.map(c => `<span title="${esc(scaleName(c))}">${c}</span><div class="mini" style="text-transform:none;letter-spacing:0;font-weight:400">${esc(scaleName(c))}</div>`)],
    AT.map(a => ({ head: `<span class="mono">${a}</span> ${esc(scaleName(a))}`, label: a, items: CO.map(c => by(`d3.${a}.${c}`)) })), off);
  if (did === 'd4') {
    const d = D('d4');
    return `<h3 class="sh">${T('gapPriority', 'Gap priority')} · gap size × consequence</h3>${recArea(did, 'g4', [T('gap', 'Gap'), ...d.bands.map(b => esc(b.name))], d.gaps.map(g => ({ head: esc(g.name), label: g.name, items: d.bands.map(b => by(`d4.${g.id}.${b.id}`)) })), off)}
    <h3 class="sh" style="margin-top:22px">Time limit and ${T('interim', 'interim position')}</h3>${recArea(did, 'g4b', ['Priority', 'Time limit', 'Interim position while the gap stands'], d.priorities.map(p => ({ head: `<span class="mono">${p.id}</span>`, label: p.id, items: [by(`d4.time.${p.id}`), by(`d4.interim.${p.id}`)] })), off)}`;
  }
  if (did === 'd5') return recArea(did, 'g5', ['Consequence of the arrangement', T('notKnown', 'Not-known') + ' facts allowed per entry', T('f4', 'F4 finding') + ' allowed to stand', 'Minimum ' + T('confidence', 'confidence') + ' in the obtainable rung'],
    D('d5').bands.map(b => ({ head: esc(b.name), label: b.name, items: ['notKnown', 'f4', 'conf'].map(f => { const c = by(`d5.${b.id}.${f}`); c.hint = D('d5').blankHints[b.id + '.' + f] || ''; return c; }) })), off);
  if (did === 'd6') {
    const js = S.decisions.d6.jurisdictions, ed = canEdit('d6');
    const rows = js.map((j, i) => ({ head: ed ? `<input class="in" id="jn-${i}" data-path="decisions.d6.jurisdictions.${i}.name" value="${esc(j.name)}" aria-label="Jurisdiction name" style="min-width:140px">` : esc(j.name), label: j.name, sub: (j.start ? 'starting: ' + esc(j.start) : '') + (ed ? ` · <button class="lnk mono" data-act="rmJur" data-i="${i}">remove</button>` : ''), items: [by(`d6.j.${j.id}.established`), by(`d6.j.${j.id}.runs`)] }));
    const conc = by('d6.concentration');
    return `${rows.length ? recArea(did, 'g6', ['Jurisdiction', 'Where the provider is established', 'Where the AI runs'], rows, off) : '<p class="soft">No jurisdictions yet. Add each one that appears in the register.</p>'}
    ${ed ? `<div class="row" style="margin-top:10px"><input class="in" id="newJur" placeholder="Jurisdiction" style="max-width:220px" aria-label="New jurisdiction"><select class="in" id="newJurStart" style="max-width:200px" aria-label="Starting marking from offshoring position"><option value="">No starting marking</option>${MARK.map(m => `<option>${m}</option>`).join('')}</select><button class="btn sm" data-act="addJur">Add jurisdiction</button></div>` : ''}
    <div class="card" style="margin-top:18px"><h3 class="sh">${T('concentration', 'Concentration')} limit</h3><p class="small soft measure">${esc(D('d6').concentrationNote)}</p>
      <div class="cellwrap" style="max-width:260px;align-items:stretch">${cellCtl(conc, off, null, 'Concentration limit, percent')}${cellMarks(conc, off)}</div><div class="mini" style="margin-top:4px">Percent of critical operations</div></div>`;
  }
  if (did === 'd7') {
    const ed = canEdit('d7');
    const rows = S.decisions.d7.triggers.map((t, i) => ({ head: `<span class="mono">${esc(t.ref)}</span> ${t.custom && ed ? `<input class="in" id="trn-${i}" data-path="decisions.d7.triggers.${i}.name" value="${esc(t.name)}" aria-label="${esc(t.ref)} name" style="margin-top:4px">` : esc(t.name)}`, label: t.ref, sub: (t.custom && ed ? `<input class="in" id="trm-${i}" data-path="decisions.d7.triggers.${i}.measure" value="${esc(t.measure)}" placeholder="Measure" aria-label="${esc(t.ref)} measure" style="margin-top:4px">` : esc(t.measure)) + (t.custom && ed ? ` <button class="lnk mono" data-act="rmTrig" data-i="${i}">remove</button>` : ''), items: ['threshold', 'time', 'to'].map(f => by(`d7.${t.ref}.${f}`)) }));
    return `${recArea(did, 'g7', [T('trigger', 'Trigger') + ' · measure', 'Threshold', 'Notify within (hours)', 'Notified to'], rows, off)}
      ${ed ? '<div class="row" style="margin-top:10px"><button class="btn sm" data-act="addTrig">Add trigger</button></div>' : ''}
      <p class="small soft measure" style="margin-top:12px">${esc(D('d7').note)} ${S.engagement.notificationHours ? `<span class="mono">I10: ${esc(S.engagement.notificationHours)} hours.</span>` : '<span class="mono">I10 hours not recorded in set-up.</span>'}</p>`;
  }
  if (did === 'd8') {
    const ed = canEdit('d8'), iv = by('d8.interval');
    const rows = S.decisions.d8.events.map((e, i) => ({ head: e.custom && ed ? `<input class="in" id="ev-${i}" data-path="decisions.d8.events.${i}.event" value="${esc(e.event)}" aria-label="Event">` : esc(e.event), label: e.event, sub: e.custom && ed ? `<button class="lnk mono" data-act="rmEvent" data-i="${i}">remove</button>` : '', items: [by(`d8.ev.${e.id}`)] }));
    return `${recArea(did, 'g8', ['Event', 'What is revisited'], rows, off)}${ed ? '<div class="row" style="margin-top:10px"><button class="btn sm" data-act="addEvent">Add event</button></div>' : ''}
      <div class="card" style="margin-top:18px"><h3 class="sh">Review interval</h3><div class="cellwrap" style="max-width:360px;align-items:stretch">${cellCtl(iv, off, null, 'Review interval')}${cellMarks(iv, off)}</div></div>`;
  }
  return '';
}
function curGrid(did) {
  const ed = canEdit(did) && did !== 'd2';
  const cols = did === 'd1' ? C.locations : CO.map(c => ({ id: c, name: c }));
  const rows = did === 'd1' ? S.functions.map(f => ({ id: f.id, name: f.name })) : AT.map(a => ({ id: a, name: a + ' ' + scaleName(a) }));
  const opts = did === 'd1' ? AT : EV;
  const sel = (id, lbl) => `<select class="cellsel ${S.current[did][id] ? '' : 'empty'}" id="cur-${sid(id)}" data-cur="${esc(id)}" ${ed ? '' : 'disabled'} aria-label="Current state ${esc(lbl)}"><option value="">—</option>${opts.map(o => `<option ${S.current[did][id] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  if (bp() === 'phone') return `<div class="stack" style="gap:8px">${rows.map(r => `<div><div class="mini">${esc(r.name)}</div><div class="row" style="gap:6px">${cols.map(c => `<label class="mini" style="display:flex;flex-direction:column;gap:2px">${esc(c.name)}${sel(`${did}.${r.id}.${c.id}`, r.name + ' ' + c.name)}</label>`).join('')}</div></div>`).join('')}</div>`;
  return `<div class="tw" style="background:#fff"><table class="lg"><thead><tr><th>${did === 'd1' ? 'Function' : 'Authority'}</th>${cols.map(c => `<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><td class="small">${esc(r.name)}</td>${cols.map(c => `<td>${sel(`${did}.${r.id}.${c.id}`, r.name + ' ' + c.name)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function startPanel(d) {
  const inputs = d.startingInputs.map(r => { const i = S.inputs.find(x => x.ref === r); return `<span class="badge ${i && i.status === 'received' ? 'b-green' : 'b-grey'}">${r} · ${i && i.status ? { received: 'received', notHeld: 'not held', notRequested: 'not requested' }[i.status] : 'not marked'}</span>`; }).join(' ');
  let extra = '';
  if (d.id === 'd1') extra = `<details class="pr" style="margin-top:12px;background:#fff"><summary>${T('current', 'Current state')} · where a person signs off today</summary><div style="padding:0 16px 16px">${curGrid('d1')}</div></details>`;
  if (d.id === 'd3') {
    const pr = S.current.commonPair;
    extra = `<details class="pr" style="margin-top:12px;background:#fff"><summary>${T('current', 'Current state')} · evidence held today</summary><div style="padding:0 16px 16px">${curGrid('d3')}
      <div class="row" style="margin-top:12px"><span class="small">Most common authority and consequence pair in the set (for K10):</span>
      <select class="in" style="width:auto" id="cp-tier" data-path="current.commonPair.tier" aria-label="Most common tier" ${canEdit('d3') ? '' : 'disabled'}><option value="">—</option>${AT.map(a => `<option ${pr.tier === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
      <select class="in" style="width:auto" id="cp-cons" data-path="current.commonPair.consequence" aria-label="Most common consequence" ${canEdit('d3') ? '' : 'disabled'}><option value="">—</option>${CO.map(c => `<option ${pr.consequence === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="row" style="margin-top:8px"><button class="btn sm" data-act="loadExtract" ${canEdit('d3') ? '' : 'disabled'}>Load assessment register extract</button><span class="mini">${S.current.register ? 'Loaded ' + esc(S.current.register.on) + ': ' + esc(S.current.register.entries) + ' entries · most common pair ' + esc(S.current.register.pair || '—') + ' · highest rung received ' + esc(S.current.register.maxReceived || 'none') : 'From the AI Use Assessment app (triodian.aua.extract.v1)'}</span></div></div></details>
      <div class="row" style="margin-top:12px"><button class="btn sm" data-act="showRef" aria-expanded="${UI.showRef}">${UI.showRef ? 'Hide reference table' : 'Show reference table'}</button><span class="mini">Shown only if the insurer asks for it. Each showing is logged in the session record.</span></div>
      ${UI.showRef ? `<div class="card" style="margin-top:10px"><h3 class="sh">Appendix A · reference expectation table</h3><p class="small soft">${esc(C.appendixANote)}</p><div class="tw"><table class="lg"><thead><tr><th>Authority</th>${CO.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${AT.map(a => `<tr><td class="small"><span class="mono">${a}</span> ${esc(scaleName(a))}</td>${C.appendixA[a].map(e => `<td class="code">${e}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>` : ''}`;
  }
  if (d.id === 'd2') extra = `<div class="fgrid" style="margin-top:12px">${['C2', 'C3', 'C4'].map(c => fld(`Existing ${c} threshold`, `current.d2.${c}`, S.current.d2[c] || '', { ph: 'From I2 / I3' })).join('')}</div>${S.criticalOperations.length ? '' : fld('Existing C5 position (no critical operations recorded in set-up)', 'current.d2.C5', S.current.d2.C5 || '')}`;
  if (d.id === 'd6') extra = `<div style="margin-top:12px">${fld('Existing offshoring position (I6)', 'current.offshoring', S.current.offshoring, { area: true })}</div>`;
  return `<section class="panel2"><div class="row between"><h2 class="sh" style="margin:0">${T('starting', 'Starting position')}</h2><div class="row">${inputs}</div></div>
    <p class="small" style="margin-top:10px">${esc(d.starting)}</p>${extra}
    <div class="row" style="margin-top:12px"><button class="btn sm aub" data-act="useStart" data-d="${d.id}" ${canEdit(d.id) ? '' : 'disabled'}>Use starting position</button><span class="mini">Copies into empty cells only. Nothing is copied automatically.</span></div></section>`;
}
function detailsHtml(id) {
  if (!id) return `<div class="card"><h2 class="sh">Position details</h2><p class="small soft">Select a cell to record its proposer, owner, condition, dissent or a "not set" entry.</p></div>`;
  const c = cellById(id); if (!c) return '';
  const did = c.did, p = getPosView(id), ed = canEdit(did), elig = eligible(did);
  const pOpt = (list, v) => `<option value="">—</option>` + list.map(x => `<option value="${esc(x.id)}" ${v === x.id ? 'selected' : ''}>${esc(x.name)} · ${esc(ROLE_NAME[x.role])}</option>`).join('');
  const eid = esc(id), fid = f => `id="pf-${sid(id)}-${f}"`;
  const ckOff = offenderMap(runChecks())[id] || [];
  const canProp = roleCanPropose(did);
  const propRoles = proposerRoles(did).map(r => ROLE_NAME[r]).join(' or ');
  const sv = startingValue(id);
  return `<div class="card" id="details-card"><div class="row between"><h2 class="sh" style="margin:0">Position details</h2>${badge(p.status === 'set' ? 'set' : p.status === 'notSet' ? 'not set' : 'blank', p.status === 'set' ? 'b-green' : p.status === 'notSet' ? 'b-ochre' : 'b-grey')}</div>
    <div style="font-weight:600;margin:10px 0 2px">${esc(cellLabel(id))}</div>
    <div class="mini">value: ${esc(p.status === 'set' ? p.value + (scaleName(p.value) ? ' · ' + scaleName(p.value) : '') + (scaleDef(p.value) ? ' · ' + scaleDef(p.value) : '') : '—')} · starting: ${esc(sv || '—')}${p.source ? ' · source: ' + esc(p.source) : ''}</div>
    ${ckOff.length ? `<div style="margin-top:8px">${ckOff.map(x => `<div class="err small">${esc(x)}</div>`).join('')}</div>` : ''}
    ${ed ? '' : `<p class="err small" style="margin-top:8px">${esc(editBlockReason(did))} ${whyLink()}</p>`}
    ${p.status === 'set' && !proposerOk(did, p) ? `<p class="err small" role="alert" style="margin-top:8px">Choose a ${T('proposer', 'proposer')}. This position counts as incomplete until one is recorded.</p>` : ''}
    <fieldset ${ed ? '' : 'disabled'} style="border:0;padding:0;margin:12px 0 0" class="stack">
      ${canProp
        ? `<label class="f"><span>${T('proposer', 'Proposer')}</span><select class="in" ${fid('proposedBy')} data-pf="proposedBy" data-cell="${eid}">${pOpt(elig, p.proposedBy)}</select></label>`
        : `<label class="f"><span>${T('proposer', 'Proposer')}</span><input class="in" disabled value="Not available to ${esc(ROLE_NAME[UI.role])}" aria-describedby="prop-why"></label>
           <div id="prop-why" class="small soft">Only the ${esc(propRoles)} may propose on decision ${D(did).n}. ${T('proposerRule', 'Why')}</div>
           <label class="f"><span>Recording on behalf of</span><select class="in" ${fid('proposedBy')} data-pf="proposedBy" data-cell="${eid}">${pOpt(elig, p.proposedBy)}</select></label>`}
      ${!elig.length ? `<div class="small" style="color:var(--ochre)">No eligible proposer in set-up. Add a ${esc(propRoles)} person.</div>` : ''}
      <label class="f"><span>Owner · ${T('ap', 'accountable person')}</span><select class="in" ${fid('owner')} data-pf="owner" data-cell="${eid}">${pOpt(S.people, p.owner)}</select></label>
      ${did === 'd1' ? `<label class="f"><span>${T('condition', 'Condition')}</span><textarea class="in" ${fid('condition')} data-pf="condition" data-cell="${eid}" placeholder="e.g. A4 up to a stated amount per transaction">${esc(p.condition)}</textarea></label>
        <label class="cb"><input type="checkbox" ${fid('testable')} data-pf="testable" data-cell="${eid}" ${p.testable ? 'checked' : ''}> Testable from documents</label>` : ''}
      ${(did === 'd1' && c.col !== 'own') || did === 'd2' ? `<label class="f"><span>Reason recorded${did === 'd2' ? ' (where it differs from the existing threshold)' : ' (where above own staff)'}</span><textarea class="in" ${fid('reason')} data-pf="reason" data-cell="${eid}">${esc(p.reason)}</textarea></label>` : ''}
      <label class="f"><span>Dissent</span><textarea class="in" ${fid('dissent')} data-pf="dissent" data-cell="${eid}" placeholder="Who disagreed, and why">${esc(p.dissent)}</textarea></label>
      <div class="panel2" style="padding:12px 14px"><div class="mini" style="margin-bottom:8px">RECORD AS NOT SET · needs an owner and a due date</div>
        <div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))"><label class="f"><span>Will set it</span><select class="in" id="ns-owner">${pOpt(S.people, p.notSetOwner)}</select></label><label class="f"><span>By</span><input class="in" type="date" id="ns-due" value="${esc(p.notSetDue)}"></label></div>
        ${UI.err[id] ? `<p class="err" role="alert" style="margin:8px 0 0">${esc(UI.err[id])}</p>` : ''}
        <div class="row" style="margin-top:10px"><button class="btn sm" data-act="notSet" data-cell="${eid}">Record not set</button>${p.status === 'notSet' ? `<button class="btn sm ghost" data-act="clearNotSet" data-cell="${eid}">Clear</button>` : ''}</div></div>
    </fieldset>
    ${p.recordedBy ? `<p class="mini" style="margin-top:10px">recorded by ${esc(ROLE_NAME[p.recordedBy] || p.recordedBy)}${p.proposedBy ? ' · proposed by ' + esc(pname(p.proposedBy)) : ''}</p>` : ''}
    ${(() => { const h = S.history.filter(x => x.target === id).slice(-3).reverse(); return h.length ? `<div class="mini" style="margin-top:8px">${h.map(x => `${esc(fmtAt(x.at))} · ${esc(x.by)} · ${esc(x.action)} ${esc(x.from == null ? '—' : x.from)} → ${esc(x.to == null ? '—' : x.to)}`).join('<br>')}</div>` : ''; })()}
    <div class="row" style="margin-top:12px"><button class="lnk mono" data-act="qcForCell" data-cell="${eid}">Log a question for counsel on this cell</button></div>
  </div>`;
}
function getPosView(id) { return P(id) || blankPos(); }
function screenDecision(did, ck) {
  const d = D(did), off = offenderMap(ck), st = decisionStatus(did, ck), b = bp();
  const purposeTerms = { d1: [['ceiling', 'most authority']], d2: [['consequence', 'consequence definitions']], d3: [['expected', 'evidence the board expects']], d4: [['gap', 'shortfall']], d5: [['notKnown', 'not know']], d6: [['concentration', 'rest on one platform']], d7: [['trigger', 'events']], d8: [['appetite', 'the appetite itself']] };
  let purpose = esc(d.purpose); (purposeTerms[did] || []).forEach(([id, txt]) => { purpose = purpose.replace(esc(txt), T(id, esc(txt))); });
  const qcs = S.questionsForCounsel.filter(q => q.decision === did);
  const body = decisionBody(did, off);
  const details = UI.sel && UI.sel.startsWith(did + '.') ? UI.sel : null;
  const gateTxt = st.gate ? 'Every cell set or recorded as not set' : `${st.un} of ${st.total} cells blank`;
  return `${opening(`Decision ${d.n} · session ${d.session} · ${d.param}`, esc(d.name), esc(d.question))}
  <div class="row" style="margin:-14px 0 22px">${badge(st.label, st.cls)}<span class="mini">Answered as: ${esc(d.answeredAs)}</span></div>
  <div class="stack">
    <section class="measure"><h2 class="sh">Purpose</h2><p>${purpose}</p>${d.recorded ? `<p class="small soft">${esc(d.recorded)}</p>` : ''}${d.note && did !== 'd7' ? `<p class="small soft">${esc(d.note)}</p>` : ''}
      ${did === 'd6' ? `<div class="tw" style="margin-top:8px"><table class="lg"><thead><tr><th>Marking</th><th>Meaning in the assessment</th></tr></thead><tbody>${d.markings.map(m => `<tr><td class="code">${m.id}</td><td>${esc(m.meaning)}</td></tr>`).join('')}</tbody></table></div>` : ''}</section>
    ${startPanel(d)}
    <section><h2 class="sh">Recording area</h2>${canEdit(did) ? '' : `<p class="err small">${esc(editBlockReason(did))} ${whyLink()}</p>`}
      ${b === 'desk' ? `<div class="split"><div style="min-width:0">${body}</div><div id="details" style="position:sticky;top:76px">${detailsHtml(details)}</div></div>` : `${body}${b === 'tab' ? `<div id="details" style="margin-top:18px">${detailsHtml(details)}</div>` : ''}`}
      ${canEdit(did) ? `<div class="row" style="margin-top:12px"><span class="small soft">Owner for every set cell without one:</span><select class="in" id="bulkOwner" style="width:auto"><option value="">—</option>${S.people.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select><button class="btn sm" data-act="bulkOwner" data-d="${did}">Apply</button></div>` : ''}
    </section>
    ${d.prompts.length ? `<details class="pr"><summary>Prompts for the session · ${d.prompts.length}</summary><ul>${d.prompts.map(p => `<li>${esc(p)}</li>`).join('')}</ul></details>` : ''}
    <section class="card"><div class="row between"><h2 class="sh" style="margin:0">Questions for ${T('counsel', 'counsel')}</h2><span class="mini">parked, not settled in the room</span></div>
      ${qcs.length ? `<div class="stack" style="gap:8px;margin-top:12px">${qcs.map(q => `<div class="row" style="align-items:flex-start;flex-wrap:nowrap"><span class="mono">${esc(q.ref)}</span><span style="flex:1">${esc(q.question)}${q.cell ? `<br><button class="lnk mono" data-act="gotoCell" data-cell="${esc(q.cell)}">${esc(cellLabel(q.cell))}</button>` : ''}${q.response ? `<div class="small soft">Response: ${esc(q.response)}</div>` : ''}</span>${badge(q.status, q.status === 'answered' ? 'b-green' : 'b-ochre')}</div>`).join('')}</div>` : '<p class="small soft" style="margin-top:8px">None logged.</p>'}
      ${canEdit(did) ? `<div style="margin-top:12px"><label class="f" for="qc-new"><span>New question${details ? ' · on ' + esc(cellLabel(details)) : ''}</span><textarea class="in" id="qc-new" placeholder="Anything that turns on what the insurer is obliged to do"></textarea></label><button class="btn sm" style="margin-top:8px" data-act="addQC" data-d="${did}">Log question</button></div>` : ''}
    </section>
  </div>
  ${stepbar(gate(st.gate, gateTxt))}`;
}

/* ---------- S11 checks ---------- */
function screenChecks(ck) {
  const bl = blocking(ck).length;
  return `${opening('Step 3 · consistency checks', 'Checks K1 to K10', bl ? `${bl} of nine blocking checks failing. The working appetite cannot be agreed until K1 to K9 pass.` : 'K1 to K9 pass. The CRO may agree the working appetite.')}
  <p class="small soft measure">Run on every change. A failed ${T('check', 'check')} goes back to the CRO; Triodian does not resolve it.</p>
  <div class="stack" style="gap:12px">${ck.map(k => `<section class="card" id="ck-${k.id}" style="padding:18px 20px">
    <div class="row between"><div class="row"><span class="mono" style="font-size:14px;font-weight:600">${k.id}</span><strong>${esc(k.name)}</strong></div>${badge(k.state === 'pass' ? 'passed' : k.state === 'fail' ? 'failed' : k.state === 'warn' ? 'warning' : 'cannot run', k.state === 'pass' ? 'b-green' : k.state === 'fail' ? 'b-red' : k.state === 'warn' ? 'b-ochre' : 'b-grey')}</div>
    <p style="margin:8px 0 4px">${esc(k.result)}</p><p class="small soft" style="margin:0">Fails when: ${esc(k.fails)}</p>
    ${k.id === 'K10' ? `<p class="small soft" style="margin-top:6px">${esc(C.k10Note)}</p>` : ''}
    ${k.off.length ? `<ul style="margin:10px 0 0;padding-left:18px">${k.off.map(o => `<li class="small"><button class="lnk mono" data-act="gotoCell" data-cell="${esc(o.id)}">${esc(cellLabel(o.id))}</button> · ${esc(o.why)}</li>`).join('')}</ul>` : ''}
  </section>`).join('')}</div>${stepbar()}`;
}

/* ---------- S12 challenge ---------- */
function screenChallenge() {
  const tab = UI.chTab, f = UI.chFilter, b = bp();
  const allowed = C.decisions.filter(d => can(d.id)), chDec = allowed.some(d => d.id === UI.chDec) ? UI.chDec : (allowed[0] || {}).id;
  const decOpts = allowed.map(d => `<option value="${d.id}" ${d.id === chDec ? 'selected' : ''}>${d.n} · ${esc(d.name)}</option>`).join('');
  const rdis = can('challengeResponse') ? '' : 'disabled';
  const st = (path, v, opts, dis) => `<select class="in" id="s-${sid(path)}" data-path="${path}" aria-label="Status" ${dis || ''}>${opts.map(o => `<option ${v === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  let body = '';
  if (tab === 'challenge') {
    const list = S.challenge.map((c, i) => ({ c, i })).filter(x => !f || x.c.raisedBy === f);
    body = `<div class="row" style="margin-bottom:12px"><label class="f" style="flex-direction:row;align-items:center;gap:8px"><span>Filter by ${T('ap', 'accountable person')}</span><select class="in" style="width:auto" id="chFilter" data-act="chFilter"><option value="">Everyone</option>${S.people.map(p => `<option value="${esc(p.id)}" ${f === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label></div>
    ${list.length ? (b === 'phone' ? `<div class="stack" style="gap:10px">${list.map(({ c, i }) => `<div class="card" style="padding:14px"><div class="row between"><span class="mono">${esc(c.ref)}</span>${badge(c.status, c.status === 'open' ? 'b-ochre' : 'b-green')}</div><div class="small soft">${esc(pname(c.raisedBy))}${c.cell ? ` · <button class="lnk mono" data-act="gotoCell" data-cell="${esc(c.cell)}">${esc(cellLabel(c.cell))}</button>` : ''}</div><p style="margin:8px 0">${esc(c.point)}</p><label class="f"><span>Response</span><input class="in" id="chr-${i}" data-path="challenge.${i}.response" value="${esc(c.response)}" ${rdis}></label><div style="margin-top:8px">${st(`challenge.${i}.status`, c.status, ['open', 'accepted', 'answered'], rdis)}</div></div>`).join('')}</div>`
      : `<div class="tw"><table class="lg"><thead><tr><th>Ref</th><th>Raised by</th><th>Decision and cell</th><th>Point</th><th>Response</th><th style="width:130px">Status</th></tr></thead><tbody>${list.map(({ c, i }) => `<tr><td class="code">${esc(c.ref)}</td><td class="small">${esc(pname(c.raisedBy))}</td><td class="small">${c.cell ? `<button class="lnk mono" data-act="gotoCell" data-cell="${esc(c.cell)}">${esc(cellLabel(c.cell))}</button>` : c.decision ? 'Decision ' + esc(D(c.decision).n) : ''}${c.status === 'accepted' && c.cell ? '<div class="mini">changed this position</div>' : ''}</td><td class="small">${esc(c.point)}</td><td><input class="in" id="chr-${i}" data-path="challenge.${i}.response" value="${esc(c.response)}" aria-label="Response ${esc(c.ref)}" ${rdis}></td><td>${st(`challenge.${i}.status`, c.status, ['open', 'accepted', 'answered'], rdis)}</td></tr>`).join('')}</tbody></table></div>`) : '<p class="soft">No challenge points recorded.</p>'}
    ${allowed.length ? `<section class="card" style="margin-top:18px"><h2 class="sh">Record a challenge point</h2>${UI.role === 'independent' ? `<p class="small soft">${esc(blockReason('d1'))} ${whyLink()}</p>` : ''}<div class="fgrid">
      <label class="f"><span>Raised by</span><select class="in" id="ch-by"><option value="">—</option>${S.people.map(p => `<option value="${esc(p.id)}" ${UI.personId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
      <label class="f"><span>Decision</span><select class="in" id="ch-dec" data-act="chDec">${decOpts}</select></label>
      <label class="f"><span>Cell</span><select class="in" id="ch-cell"><option value="">Whole decision</option>${cellsFor(chDec).map(c => `<option value="${esc(c.id)}">${esc(cellLabel(c.id))}</option>`).join('')}</select></label></div>
      <label class="f" style="margin-top:12px"><span>Point</span><textarea class="in" id="ch-point"></textarea></label><button class="btn sm" style="margin-top:10px" data-act="addCH">Add to log</button></section>` : ''}`;
  } else {
    const ed = UI.role === 'counsel';
    body = S.questionsForCounsel.length ? `<div class="tw"><table class="lg"><thead><tr><th>Ref</th><th>Decision and cell</th><th>Question</th><th>Response · counsel</th><th style="width:130px">Status</th></tr></thead><tbody>${S.questionsForCounsel.map((q, i) => `<tr><td class="code">${esc(q.ref)}</td><td class="small">${q.cell ? `<button class="lnk mono" data-act="gotoCell" data-cell="${esc(q.cell)}">${esc(cellLabel(q.cell))}</button>` : 'Decision ' + esc(D(q.decision).n)}</td><td class="small">${esc(q.question)}</td><td><input class="in" id="qcr-${i}" data-path="questionsForCounsel.${i}.response" value="${esc(q.response)}" ${ed ? '' : 'disabled'} aria-label="Response ${esc(q.ref)}"></td><td>${ed ? st(`questionsForCounsel.${i}.status`, q.status, ['open', 'answered']) : badge(q.status, q.status === 'answered' ? 'b-green' : 'b-ochre')}</td></tr>`).join('')}</tbody></table></div>${ed ? '' : '<p class="small soft" style="margin-top:8px">Responses are recorded by counsel.</p>'}` : '<p class="soft">No questions logged. Add them from each decision screen.</p>';
  }
  return `${opening('Step 4 · challenge', 'Challenge round', 'Second line and each accountable person review the positions in their area. Each point is accepted or answered.')}
  <div class="tabs" role="tablist"><button role="tab" aria-selected="${tab === 'challenge'}" data-act="chTab" data-t="challenge">Challenge log · ${S.challenge.length}</button><button role="tab" aria-selected="${tab === 'qc'}" data-act="chTab" data-t="qc">Questions for counsel · ${S.questionsForCounsel.length}</button></div>
  ${body}${stepbar()}`;
}

/* ---------- outputs ---------- */
const tbl = (h, rows) => '| ' + h.join(' | ') + ' |\n| ' + h.map(() => '---').join(' | ') + ' |\n' + rows.map(r => '| ' + r.map(x => String(x == null ? '' : x).replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ') + ' |').join('\n') + '\n\n';
const pv = id => { const p = P(id); if (!p || p.status === 'unset') return '[ ]'; if (p.status === 'notSet') return `not set (${pname(p.notSetOwner)}, by ${p.notSetDue})`; return String(p.value); };
function mdHead(title) { const e = S.engagement; return `${e.privilegeMarking || '[Privilege marking not recorded in set-up]'}\n\n# ${title}\n\n**${statusMark()}**${e.example ? ' · WORKED EXAMPLE, FICTIONAL INSURER' : ''}\n\n${e.insurer || '[Insurer]'} · ${e.reference || '[reference]'} · generated ${today()}\n\n`; }
function mdStatement() {
  const e = S.engagement, ins = e.insurer || '[insurer]'; let m = mdHead('AI risk appetite statement');
  m += `## 1. Purpose and scope\n\nThis statement covers AI used by ${ins}, by its material service providers, and by the platforms behind them. It sits under ${ins}'s board risk appetite statement and takes its loss thresholds and critical-operation tolerances from what the board has already approved.\n\n`;
  m += `## 2. Overall position\n\n${e.overallPosition || '[For counsel to write, in the board\u2019s words. For example: ' + C.overallExample + ']'}\n\n`;
  m += `## 3. Authority\n\nThe ceiling is the highest authority tier the board accepts for each function and location.\n\n` + tbl(['Function', 'Own staff', 'Inside a provider', 'Platform behind a provider'], S.functions.map(f => [f.name, ...C.locations.map(l => { const id = `d1.${f.id}.${l.id}`, p = P(id); return pv(id) + (p && p.condition ? ` (${p.condition})` : ''); })]));
  m += `Exception route: a use above the ceiling is approved by the person named in decision 1, time-limited, and reported as M1.\n\n`;
  m += `## 4. Consequence thresholds\n\n` + tbl(['Level', 'Threshold', 'Source'], [['C1, immaterial', 'Whatever falls below C2', 'n/a'], ...cellsFor('d2').map(c => { const o = c.id.startsWith('d2.op.') ? S.criticalOperations.find(x => x.id === c.id.split('.')[2]) : null; return [c.rowLabel, pv(c.id), o ? o.source : (D('d2').levels.find(l => l.code === c.row) || {}).source]; })]);
  m += `## 5. Evidence expected\n\n` + tbl(['Authority', ...CO], AT.map(a => [a + ', ' + scaleName(a), ...CO.map(c => pv(`d3.${a}.${c}`))]));
  m += `## 6. Tolerances\n\n### Shortfall\n\n` + tbl(['Gap', ...D('d4').bands.map(b => b.name)], D('d4').gaps.map(g => [g.name, ...D('d4').bands.map(b => pv(`d4.${g.id}.${b.id}`))])) + tbl(['Priority', 'Time limit', 'Interim position'], D('d4').priorities.map(p => [p.id, pv(`d4.time.${p.id}`), pv(`d4.interim.${p.id}`)]));
  m += `### Unknowns\n\n` + tbl(['Consequence', 'Not-known facts allowed per entry', 'F4 allowed to stand', 'Minimum confidence'], D('d5').bands.map(b => [b.name, pv(`d5.${b.id}.notKnown`), pv(`d5.${b.id}.f4`), pv(`d5.${b.id}.conf`)]));
  m += `### Location and concentration\n\n` + (S.decisions.d6.jurisdictions.length ? tbl(['Jurisdiction', 'Provider established', 'AI runs'], S.decisions.d6.jurisdictions.map(j => [j.name, pv(`d6.j.${j.id}.established`), pv(`d6.j.${j.id}.runs`)])) : 'No jurisdictions recorded.\n\n') + `Concentration limit: ${pv('d6.concentration')}${val('d6.concentration') ? '%' : ''} of critical operations on a single platform or model provider.\n\n`;
  m += `## 7. Triggers and escalation\n\n` + tbl(['Ref', 'Trigger', 'Measure', 'Threshold', 'Notify within', 'Notified to'], S.decisions.d7.triggers.map(t => [t.ref, t.name, t.measure, pv(`d7.${t.ref}.threshold`), val(`d7.${t.ref}.time`) ? val(`d7.${t.ref}.time`) + ' hours' : pv(`d7.${t.ref}.time`), pv(`d7.${t.ref}.to`)]));
  m += `## 8. Accountability\n\n` + tbl(['Function', 'Accountable person'], S.functions.map(f => [f.name, S.people.filter(p => (p.areas || []).includes(f.id)).map(p => p.name).join(', ') || '[ ]']));
  if (irContributed()) m += `The independent reviewer advised on the consequence thresholds in decision 2 and separately reviews the AI Use Assessment on behalf of the CRO. The board is aware that the reviewer will review findings measured against thresholds it advised on.\n\n`;
  m += `## 9. Review\n\nReview interval: ${pv('d8.interval')}.\n\n` + tbl(['Event', 'What is revisited'], S.decisions.d8.events.map(e => [e.event, pv(`d8.ev.${e.id}`)]));
  m += `## Appendix. Definitions\n\n${C.scales.note}\n\n` + tbl(['Code', 'Authority tier', 'Definition'], C.scales.authority.map(s => [s.code, s.name, s.def])) + tbl(['Code', 'Consequence level', 'Generic definition'], C.scales.consequence.map(s => [s.code, s.name, s.def])) + tbl(['Code', 'Evidence rung', 'Definition'], C.scales.evidence.map(s => [s.code, s.name, s.def]));
  return m;
}
function irContributed() { const ir = S.people.filter(p => p.role === 'independent').map(p => p.id); if (!ir.length) return false; return cellsFor('d2').some(c => { const p = P(c.id); return p && ir.includes(p.proposedBy); }) || S.challenge.some(c => c.decision === 'd2' && ir.includes(c.raisedBy)); }
function mdSchedule() {
  let m = mdHead('Tolerance and trigger schedule');
  m += `The measurable part of the statement, kept as a schedule so it can change without re-approving the whole document.\n\n## Measures\n\n` + tbl(['Ref', 'Measure', 'Limit', 'Owner', 'Counted from', 'Reported'], C.measures.map(x => [x.ref, x.measure, x.ref === 'M6' ? (val('d6.concentration') ? val('d6.concentration') + '%' : pv('d6.concentration')) : (x.limit ? (x.limit.startsWith('[') ? x.limit : `[${x.limit}]`) : '[ ]'), pname((S.measureOwners || {})[x.ref]) || `[${x.owner}]`, x.from, x.reported]));
  m += `## Triggers\n\n` + tbl(['Ref', 'Trigger', 'Measure', 'Threshold', 'Notify within', 'Notified to'], S.decisions.d7.triggers.map(t => [t.ref, t.name, t.measure, pv(`d7.${t.ref}.threshold`), val(`d7.${t.ref}.time`) ? val(`d7.${t.ref}.time`) + ' hours' : pv(`d7.${t.ref}.time`), pv(`d7.${t.ref}.to`)]));
  return m;
}
function mdSession() {
  let m = mdHead('Session record') + 'A working paper, not a board document. Handled as counsel directs.\n\n';
  C.decisions.forEach(d => {
    m += `## Decision ${d.n}: ${d.name} (session ${d.session})\n\n**Starting position.** ${d.starting}\n\n`;
    const rows = cellsFor(d.id).filter(c => P(c.id)).map(c => { const p = P(c.id); return [cellLabel(c.id).replace(/^D\d · /, ''), startingValue(c.id) || '—', p.status === 'set' ? p.value : p.status === 'notSet' ? 'not set' : '—', pname(p.proposedBy) || '—', ROLE_NAME[p.recordedBy] || '—', pname(p.owner) || '—', p.condition || '', p.dissent || '']; });
    m += rows.length ? tbl(['Cell', 'Starting', 'Recorded', 'Proposed by', 'Recorded by', 'Owner', 'Condition', 'Dissent'], rows) : 'No positions recorded.\n\n';
    const ns = cellsFor(d.id).filter(c => P(c.id) && P(c.id).status === 'notSet');
    m += `**Not set.** ${ns.length ? ns.map(c => `${cellLabel(c.id)}: ${pname(P(c.id).notSetOwner)}, by ${P(c.id).notSetDue}`).join('; ') : 'None.'}\n\n`;
    const q = S.questionsForCounsel.filter(x => x.decision === d.id);
    m += `**Questions for counsel.** ${q.length ? '' : 'None.'}\n\n` + (q.length ? q.map(x => `- ${x.ref} (${x.status}): ${x.question}${x.response ? ' Response: ' + x.response : ''}`).join('\n') + '\n\n' : '');
    if (d.id === 'd3') { const r = S.decisions.d3.referenceShown; m += `**Reference table (Appendix A).** ${r.length ? 'Shown: ' + r.map(x => `${fmtAt(x.at)} by ${x.by}`).join('; ') + '.' : 'Not shown.'}\n\n`; }
  });
  return m;
}
function paramGroups() {
  const pick = (did, f) => cellsFor(did).filter(f || (() => true)).map(c => c.id);
  return { P1: pick('d1'), P2: pick('d2'), P3: pick('d3'), P4: pick('d4', c => c.group === 'matrix'), P5: pick('d4', c => c.group === 'time'), P6: pick('d5', c => c.group === 'p6'), P7: pick('d5', c => c.group === 'p7'), P8: pick('d6', c => c.group === 'p8'), P9: ['d6.concentration'], P10: pick('d7'), P11: pick('d8') };
}
function calibrationSet() {
  const G = paramGroups(), fell = [], fellIds = [], params = {};
  Object.keys(G).forEach(k => { const n = G[k].filter(id => val(id) === null).length; if (n || !G[k].length) { fellIds.push(k); fell.push(`${k}: ${n} of ${G[k].length} cells default`); } });
  const fb = () => false;
  const genericFor = c => (C.scales.consequence.find(x => x.code === (c.id.startsWith('d2.op.') ? 'C5' : c.row)) || {}).def || null;
  params.P1 = Object.fromEntries(S.functions.map(f => [f.name, Object.fromEntries(C.locations.map(l => { const id = `d1.${f.id}.${l.id}`; return [l.id, val(id) ? { tier: val(id), condition: P(id).condition || null } : null]; }))]));
  params.P2 = Object.fromEntries(cellsFor('d2').map(c => [c.rowLabel, val(c.id) || genericFor(c)]));
  params.P3 = Object.fromEntries(AT.map(a => [a, Object.fromEntries(CO.map((c, j) => [c, val(`d3.${a}.${c}`) || C.appendixA[a][j]]))]));
  params.P4 = Object.fromEntries(D('d4').gaps.map(g => [g.id, Object.fromEntries(D('d4').bands.map(b => [b.id, val(`d4.${g.id}.${b.id}`) || D('d4').matrix[g.id][b.id]]))]));
  params.P5 = Object.fromEntries(D('d4').priorities.map(p => [p.id, { timeLimit: val(`d4.time.${p.id}`), interim: val(`d4.interim.${p.id}`) }]));
  params.P6 = Object.fromEntries(D('d5').bands.map(b => [b.id, { notKnown: val(`d5.${b.id}.notKnown`), f4: val(`d5.${b.id}.f4`) }]));
  params.P7 = Object.fromEntries(D('d5').bands.map(b => [b.id, val(`d5.${b.id}.conf`)]));
  params.P8 = Object.fromEntries(S.decisions.d6.jurisdictions.map(j => [j.id, { name: j.name, established: val(`d6.j.${j.id}.established`) || 'Escalate', runs: val(`d6.j.${j.id}.runs`) || 'Escalate' }]));
  params.P9 = val('d6.concentration') ? parseFloat(val('d6.concentration')) : null;
  params.P10 = S.decisions.d7.triggers.map(t => ({ ref: t.ref, trigger: t.name, measure: t.measure, threshold: fb('P10') ? null : val(`d7.${t.ref}.threshold`), hours: fb('P10') ? null : (val(`d7.${t.ref}.time`) ? parseFloat(val(`d7.${t.ref}.time`)) : null), recipient: fb('P10') ? null : val(`d7.${t.ref}.to`) }));
  const evDefault = e => { const d = D('d8').events.find(x => x.id === e.id); return !e.custom && d ? d.revisit : (e.revisit || null); };
  params.P11 = { events: S.decisions.d8.events.map(e => ({ event: e.event, revisit: val(`d8.ev.${e.id}`) || evDefault(e) })), interval: val('d8.interval') || 'Annual' };
  const c = S.calibration;
  return { privilegeMarking: S.engagement.privilegeMarking || null, schema: 'triodian.raf.calibration.v1', status: c.status, version: c.version, statusMark: statusMark(), date: c.status === 'approved' ? c.approvedOn : c.agreedOn || null, agreedBy: c.agreedBy || null, agreedOn: c.agreedOn || null, approvedBy: c.approvedBy || null, approvedOn: c.approvedOn || null, minuteRef: c.minuteRef || null, engagementRef: S.engagement.reference || null, generated: nowISO(), parameters: params, fellBackToDefault: fell, fellBackIds: fellIds, defaults: Object.fromEntries(C.parameters.filter(p => fellIds.includes(p.id)).map(p => [p.id, p.default])) };
}
function mdCalibration() {
  const cs = calibrationSet(), Q = cs.parameters, d = '*(default)*', vd = (id, v) => val(id) === null ? (v == null || v === '' ? '— ' + d : v + ' ' + d) : v;
  const pn = id => (C.parameters.find(p => p.id === id) || {}).name || '';
  const hd = id => `### ${id} · ${pn(id)}${cs.fellBackIds.includes(id) ? ' · ' + cs.fellBackToDefault.find(x => x.startsWith(id + ':')).slice(id.length + 2) : ''}\n\n`;
  let m = mdHead('Calibration set');
  m += `Status: ${cs.status} · version ${cs.version}${cs.date ? ' · ' + cs.date : ''}${cs.agreedBy ? ' · agreed by ' + cs.agreedBy + (cs.agreedOn ? ', ' + cs.agreedOn : '') : ''}${cs.approvedBy ? ' · approved by ' + cs.approvedBy : ''}${cs.minuteRef ? ' · minute ' + cs.minuteRef : ''}\n\nThe set carries no client facts. It holds positions and thresholds only. Values marked ${d} were not set and take the framework default.\n\n`;
  m += hd('P1') + tbl(['Function', ...C.locations.map(l => l.name)], S.functions.map(f => [f.name, ...C.locations.map(l => { const id = `d1.${f.id}.${l.id}`, p = P(id); return val(id) ? val(id) + (p.condition ? ' (' + p.condition + ')' : '') : 'none ' + d; })]));
  m += hd('P2') + cellsFor('d2').map(c => `- ${c.rowLabel}: ${vd(c.id, Q.P2[c.rowLabel])}`).join('\n') + '\n\n';
  m += hd('P3') + tbl(['Authority', ...CO], AT.map(a2 => [a2 + ', ' + scaleName(a2), ...CO.map(c => vd(`d3.${a2}.${c}`, Q.P3[a2][c]))]));
  m += hd('P4') + tbl(['Gap', ...D('d4').bands.map(b => b.name)], D('d4').gaps.map(g => [g.name, ...D('d4').bands.map(b => vd(`d4.${g.id}.${b.id}`, Q.P4[g.id][b.id]))]));
  m += hd('P5') + D('d4').priorities.map(p => `- ${p.id}: time limit ${vd(`d4.time.${p.id}`, null)}; interim position ${vd(`d4.interim.${p.id}`, null)}`).join('\n') + '\n\n';
  m += hd('P6') + D('d5').bands.map(b => `- ${b.name}: not-known facts allowed ${vd(`d5.${b.id}.notKnown`, null)}; F4 allowed to stand ${vd(`d5.${b.id}.f4`, null)}`).join('\n') + '\n\n';
  m += hd('P7') + D('d5').bands.map(b => `- ${b.name}: ${vd(`d5.${b.id}.conf`, null)}`).join('\n') + '\n\n';
  m += hd('P8') + (S.decisions.d6.jurisdictions.length ? S.decisions.d6.jurisdictions.map(j => `- ${j.name}: provider established ${vd(`d6.j.${j.id}.established`, 'Escalate')}; AI runs ${vd(`d6.j.${j.id}.runs`, 'Escalate')}`).join('\n') : '- No jurisdictions recorded. All locations treated as escalate ' + d) + '\n\n';
  m += hd('P9') + `- Largest share on one platform or model provider: ${Q.P9 != null ? Q.P9 + '%' : 'none ' + d}\n\n`;
  m += hd('P10') + tbl(['Ref', 'Trigger', 'Threshold', 'Hours', 'Recipient'], S.decisions.d7.triggers.map(t => [t.ref, t.name, vd(`d7.${t.ref}.threshold`, null), vd(`d7.${t.ref}.time`, null), vd(`d7.${t.ref}.to`, null)]));
  m += hd('P11') + Q.P11.events.map((e, i) => `- ${e.event}: ${val(`d8.ev.${S.decisions.d8.events[i].id}`) ? e.revisit : (e.revisit || '—') + ' ' + d}`).join('\n') + `\n- Review interval: ${val('d8.interval') ? Q.P11.interval : Q.P11.interval + ' ' + d}\n\n`;
  m += `**Parameters with default values:** ${cs.fellBackToDefault.length ? cs.fellBackToDefault.join('; ') : 'none'}.\n\n`;
  return m;
}
function mdChecks() { const ck = runChecks(); let m = mdHead('Check report'); m += tbl(['Check', 'Name', 'Result', 'Detail'], ck.map(k => [k.id, k.name, k.state === 'pass' ? 'passed' : k.state === 'fail' ? 'failed' : k.state === 'warn' ? 'warning' : 'cannot run', k.off.length ? k.off.map(o => cellLabel(o.id) + ': ' + o.why).join('; ') : k.result])); return m + C.k10Note + '\n'; }
function outputFor(tab) { return { statement: [mdStatement, 'statement'], schedule: [mdSchedule, 'schedule'], session: [mdSession, 'session-record'], calibration: [mdCalibration, 'calibration-set'], checks: [mdChecks, 'check-report'] }[tab]; }
function screenOutputs(ck) {
  const c = S.calibration, bl = blocking(ck).length, tab = UI.outTab, [fn, slug] = outputFor(tab), md = fn();
  const tabs = [['statement', 'Statement'], ['schedule', 'Schedule'], ['session', 'Session record'], ['calibration', 'Calibration set'], ['checks', 'Check report']];
  const who = me(), agreeWhy = !who || who.role !== 'cro' ? 'Choose a CRO person under "Acting as" in the header' : bl ? `${bl} blocking ${bl === 1 ? 'check' : 'checks'} failing` : '', xb = tab === 'calibration' && exportBlocked();
  return `${opening('Step 5 · outputs', 'Outputs', 'The statement for board approval, the schedule, the session record and the calibration set.')}
  <section class="card" style="margin-bottom:20px"><div class="row between"><div class="row"><h2 class="sh" style="margin:0">${T('calibration', 'Calibration status')}</h2>${calBadge()}<span class="mono soft">${esc(statusMark())}</span></div>${c.minuteRef ? `<span class="mono soft">minute ${esc(c.minuteRef)}</span>` : ''}</div>
    <div class="grid2" style="margin-top:14px"><div class="panel2"><div style="font-weight:600">Agree ${T('working', 'working appetite')}</div><p class="small soft" style="margin:4px 0 10px">CRO only. Requires K1 to K9 passed. ${c.status === 'default' ? 'Version becomes 1.' : 'Any later change to a position increments the version.'}</p>
      <button class="btn primary sm" data-act="agree" ${agreeWhy || c.status !== 'default' ? 'disabled' : ''}>Agree working appetite</button> ${agreeWhy && c.status === 'default' ? `<span class="small" style="color:var(--red)">${esc(agreeWhy)}</span>` : c.status !== 'default' ? `<span class="small soft">Agreed ${esc(c.agreedOn)} by ${esc(c.agreedBy)}</span>` : ''}</div>
    <div class="panel2"><div style="font-weight:600">Record board approval</div><p class="small soft" style="margin:4px 0 10px">Board record role only. Version unchanged.</p>
      <div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))"><label class="f"><span>Date</span><input class="in" type="date" id="ap-date" value="${esc(c.approvedOn || today())}" ${UI.role === 'board' ? '' : 'disabled'}></label><label class="f"><span>Minute reference</span><input class="in" id="ap-min" value="${esc(c.minuteRef)}" ${UI.role === 'board' ? '' : 'disabled'}></label><label class="f"><span>Approved by (board or committee)</span><input class="in" id="ap-by" value="${esc(c.approvedBy)}" ${UI.role === 'board' ? '' : 'disabled'}></label></div>
      ${UI.err.approval ? `<p class="err" role="alert">${esc(UI.err.approval)}</p>` : ''}
      <button class="btn sm" style="margin-top:10px" data-act="approve" ${UI.role === 'board' && c.status === 'working' ? '' : 'disabled'}>Record approval</button> ${UI.role !== 'board' ? '<span class="small soft">Board record role only</span>' : c.status !== 'working' ? '<span class="small soft">Needs a working appetite</span>' : ''}</div></div>
    ${c.issued.length ? `<div class="mini" style="margin-top:12px">Issued: ${c.issued.map(x => `v${esc(x.version)} ${esc(x.status)} ${esc(x.on)}${x.by ? ' · ' + esc(x.by) : ''}${x.minuteRef ? ' · ' + esc(x.minuteRef) : ''}`).join(' · ')}</div>` : ''}
    ${exportBlocked() ? `<p class="err" role="alert" style="margin-top:12px">${esc(statusMark())}. Export of the calibration set is blocked until K1 to K9 pass. <button class="lnk" data-act="go" data-to="checks">Open checks</button></p>` : ''}</section>
  <div class="tabs" role="tablist">${tabs.map(t => `<button role="tab" id="tab-${t[0]}" aria-selected="${tab === t[0]}" data-act="outTab" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>
  ${tab === 'statement' ? `<div class="card" style="margin-bottom:16px">${fld('Overall position · in the board\u2019s words, written by counsel', 'engagement.overallPosition', S.engagement.overallPosition, { area: true, ph: C.overallExample })}${can('overall') ? '' : `<p class="small soft" style="margin:6px 0 0">${esc(blockReason('overall'))} ${whyLink()}</p>`}</div>` : ''}
  ${tab === 'schedule' ? `<div class="card" style="margin-bottom:16px"><h3 class="sh">Measure owners · check K8</h3><div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${C.measures.map(x => `<label class="f" for="mo-${x.ref}"><span>${x.ref} · ${esc(x.measure)}</span><select class="in" id="mo-${x.ref}" data-path="measureOwners.${x.ref}" ${can('measures') ? '' : 'disabled'}><option value="">— ${esc(x.owner)}</option>${S.people.map(p => `<option value="${esc(p.id)}" ${(S.measureOwners || {})[x.ref] === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>`).join('')}</div></div>` : ''}
  <div class="row" style="margin-bottom:12px"><button class="btn sm" id="out-copy" data-act="copy" data-t="${tab}" ${xb ? 'disabled' : ''}>Copy markdown</button>${inFrame ? '' : `<button class="btn sm" id="out-dl" data-act="download" data-t="${tab}" ${xb ? 'disabled' : ''}>Download .md</button>`}${tab === 'calibration' ? `${inFrame ? '' : `<button class="btn sm" id="out-dlj" data-act="downloadJson" ${xb ? 'disabled' : ''}>Download .json</button>`}<button class="btn sm ghost" id="out-cpj" data-act="copyJson" ${xb ? 'disabled' : ''}>Copy JSON</button>` : ''}${inFrame ? '<span class="small soft">Downloads are not available in this viewer. Use Copy, or open the file directly in a browser.</span>' : ''}${xb ? '<span class="small" style="color:var(--red)">Blocked: checks failing</span>' : ''}</div>
  <div class="card md" aria-label="Preview">${mdToHtml(md)}</div>
  ${stepbar()}`;
}

/* ---------- S14 reference ---------- */
function screenReference() {
  const q = UI.refQ.trim().toLowerCase();
  const gl = Object.entries(C.glossary).filter(([id, g]) => !q || (g.term + ' ' + g.def).toLowerCase().includes(q)).sort((a, b) => a[1].term.localeCompare(b[1].term));
  const scale = (title, list, term) => `<section class="card"><h2 class="sh">${T(term, title)}</h2><div class="stack" style="gap:8px">${list.map(s => `<div class="row" style="align-items:flex-start;flex-wrap:nowrap"><span class="mono" style="min-width:28px;font-weight:600">${s.code}</span><span><strong>${esc(s.name)}</strong><br><span class="small soft">${esc(s.def)}</span></span></div>`).join('')}</div></section>`;
  return `${opening('Reference', 'Scales, glossary and framework', 'The AI Risk Appetite Framework, ' + esc(C.frameworkDate) + '. Read-only.')}
  <p class="small soft measure">${esc(C.scales.note)}</p>
  <div class="dgrid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-bottom:28px">${scale('Authority tiers', C.scales.authority, 'tier')}${scale('Consequence levels', C.scales.consequence, 'consequence')}${scale('Evidence rungs', C.scales.evidence, 'ladder')}</div>
  <section style="margin-bottom:28px"><div class="row between"><h2 class="sh" style="margin:0">Glossary</h2><input class="in" id="refq" data-act="refq" type="search" value="${esc(UI.refQ)}" placeholder="Search terms" style="max-width:280px" aria-label="Search glossary"></div>
    <div class="tw" style="margin-top:12px"><table class="lg"><tbody>${gl.map(([id, g]) => `<tr id="g-${id}" class="fwsec"><td style="width:220px;font-weight:600">${esc(g.term)}</td><td class="small">${linkify(g.def)}</td><td class="small soft" style="width:200px">${esc(g.where)}</td></tr>`).join('') || '<tr><td>No match.</td></tr>'}</tbody></table></div></section>
  <section><h2 class="sh">Framework text</h2><div class="card md" id="fw">${mdToHtml(C.frameworkMarkdown || '', true)}</div></section>`;
}

/* ---------- markdown ---------- */
function mdToHtml(md, anchors) {
  const L = md.split('\n'); let h = '', i = 0;
  const inl = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)/g, '$1<em>$2</em>').replace(/\\([\[\]|])/g, '$1');
  const isBlock = l => /^(#{1,4} |\s*\||\s*([-*]|\d+\.) |---\s*$)/.test(l);
  const split = r => { const out = []; let cur = ''; const s = r.trim().replace(/^\|/, '').replace(/\|$/, ''); for (let k = 0; k < s.length; k++) { if (s[k] === '\\' && s[k + 1] === '|') { cur += '|'; k++; } else if (s[k] === '|') { out.push(cur.trim()); cur = ''; } else cur += s[k]; } out.push(cur.trim()); return out; };
  while (i < L.length) {
    const l = L[i];
    if (/^#{1,4} /.test(l)) { const n = l.match(/^#+/)[0].length, t = l.slice(n + 1); const id = anchors ? ` id="fw-${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}" class="fwsec"` : ''; h += `<h${n}${id}>${inl(t)}</h${n}>`; i++; continue; }
    if (/^\s*\|/.test(l)) { const rows = []; while (i < L.length && /^\s*\|/.test(L[i])) rows.push(L[i++]); const head = split(rows[0]); h += '<table><thead><tr>' + head.map(c => `<th>${inl(c)}</th>`).join('') + '</tr></thead><tbody>' + rows.slice(2).map(r => '<tr>' + split(r).map(c => `<td>${inl(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>'; continue; }
    if (/^\s*([-*]|\d+\.) /.test(l)) { const ol = /^\s*\d+\./.test(l), items = []; while (i < L.length && /^\s*([-*]|\d+\.) /.test(L[i])) items.push(L[i++].replace(/^\s*([-*]|\d+\.) /, '').replace(/^\[( |x)\] /, (m, x) => x === 'x' ? '☑ ' : '☐ ')); h += (ol ? '<ol>' : '<ul>') + items.map(t => `<li>${inl(t)}</li>`).join('') + (ol ? '</ol>' : '</ul>'); continue; }
    if (/^---\s*$/.test(l)) { h += '<hr>'; i++; continue; }
    if (!l.trim()) { i++; continue; }
    const para = []; while (i < L.length && L[i].trim() && !isBlock(L[i])) para.push(L[i++]); h += `<p>${inl(para.join(' '))}</p>`;
  }
  return h;
}

/* ---------- popovers and sheets ---------- */
let popAnchor = null;
function openPop(id, anchor) { closePop(true); popAnchor = anchor; UI.pop = { stack: [id] }; anchor.setAttribute('aria-expanded', 'true'); renderPop(); }
function closePop(silent) {
  const r = document.getElementById('poproot'); if (r) r.innerHTML = '';
  if (popAnchor) { popAnchor.setAttribute('aria-expanded', 'false'); if (!silent && document.body.contains(popAnchor)) popAnchor.focus(); }
  UI.pop = null; if (!silent) popAnchor = null;
}
function renderPop() {
  const root = document.getElementById('poproot'); if (!UI.pop) { root.innerHTML = ''; return; }
  const id = UI.pop.stack[UI.pop.stack.length - 1], g = C.glossary[id], back = UI.pop.stack.length > 1;
  const inner = `<div class="ptop">${back ? '<button class="lnk mono" data-pact="back">← back</button>' : '<span class="mini">TERM</span>'}<button class="iconbtn" data-pact="close" aria-label="Close">✕</button></div>
    <h4 id="pop-h">${esc(g.term)}</h4><p class="small" style="margin:0">${linkify(g.def)}</p><div class="where"><strong>Where it is used:</strong> ${esc(g.where)}</div><button class="lnk small" data-pact="more" data-id="${id}">Read more</button>`;
  if (bp() === 'phone') {
    root.innerHTML = `<div class="sheet-bg" data-pact="close"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="pop-h"><div class="handle" data-pact="drag" aria-hidden="true"></div>${inner}</div>`;
  } else {
    root.innerHTML = `<div class="pop" id="popcard" role="dialog" aria-labelledby="pop-h"><span class="ptr"></span>${inner}</div>`;
    const pop = root.firstChild, r = popAnchor.getBoundingClientRect(), z = UI.present && bp() === 'desk' ? 1.2 : 1;
    const ph = pop.offsetHeight, w = 320, sx = scrollX / z, sy = scrollY / z, vw = innerWidth / z, vh = innerHeight / z;
    const rl = r.left / z, rt = r.top / z, rb = r.bottom / z, rw = r.width / z;
    let left = Math.min(Math.max(rl + rw / 2 - w / 2, 8), vw - w - 8) + sx, above = rb + ph + 20 > vh && rt > ph + 20;
    pop.style.left = left + 'px'; pop.style.top = (above ? rt - ph - 10 : rb + 10) + sy + 'px';
    const ptr = pop.querySelector('.ptr'); ptr.style.left = (rl + rw / 2 + sx - left - 6) + 'px';
    if (above) { ptr.style.bottom = '-7px'; ptr.style.transform = 'rotate(225deg)'; } else ptr.style.top = '-7px';
  }
  const cl = root.querySelector('[data-pact="close"].iconbtn'); if (cl) cl.focus({ preventScroll: true });
}
function renderSheet() {
  const root = document.getElementById('sheetroot');
  if (!UI.sheet || bp() !== 'phone') { root.innerHTML = ''; return; }
  root.innerHTML = `<div class="sheet-bg" data-act="closeSheet"></div><div class="sheet tall" role="dialog" aria-modal="true" aria-label="Position details"><div class="row between"><div class="handle" style="margin:2px 0 10px" aria-hidden="true"></div><button class="iconbtn" data-act="closeSheet" aria-label="Close details">✕</button></div>${detailsHtml(UI.sheet)}</div>`;
}

/* ---------- render ---------- */
let lastBp = null, inChange = false, pendingRender = false;
function render() { if (inChange) { if (!pendingRender) { pendingRender = true; setTimeout(() => { pendingRender = false; doRender(); }, 0); } return; } doRender(); }
const dsKey = el => el && el !== document.body && el.dataset && Object.keys(el.dataset).length ? el.tagName + '|' + JSON.stringify(Object.assign({}, el.dataset)) : null;
function doRender() {
  const app = document.getElementById('app'); lastBp = bp();
  if (!S) { app.innerHTML = entry(); return; }
  if (UI.personId) { const p = person(UI.personId); if (p) UI.role = p.role; else UI.personId = ''; }
  versionCheck();
  const ck = runChecks(), ae = document.activeElement, fid = ae && ae.id, fkey = !fid ? dsKey(ae) : null; let sel = null;
  try { if (ae && ae.selectionStart != null) sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) {}
  let main = '', g = '';
  const s = UI.screen;
  if (s === 'setup') { main = screenSetup(); const sg = setupGate(); g = gate(sg.ok, sg.ok ? 'Set-up done' : 'Set-up open'); }
  else if (s === 'overview') main = screenOverview(ck);
  else if (/^d\d$/.test(s)) { main = screenDecision(s, ck); const st = decisionStatus(s, ck); g = gate(st.gate, st.gate ? 'All recorded' : st.un + ' blank'); }
  else if (s === 'checks') main = screenChecks(ck);
  else if (s === 'challenge') main = screenChallenge();
  else if (s === 'outputs') main = screenOutputs(ck);
  else if (s === 'reference') main = screenReference();
  else main = screenOverview(ck);
  app.innerHTML = header(ck) + `<main id="main" tabindex="-1"><div class="wrap">${main}</div></main>` + footer() + bottombar(g) + drawer() + (s === 'entry' ? entry() : '');
  renderSheet();
  if (!fid && fkey) { const m = [...document.querySelectorAll('#app [data-act],#app [data-cell],#app [data-path]')].find(x => dsKey(x) === fkey); if (m) m.focus({ preventScroll: true }); }
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange && /text|search|textarea/.test(el.type || el.tagName.toLowerCase())) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
  document.documentElement.classList.toggle('present', UI.present && bp() === 'desk');
}
function refreshDetails() {
  const box = document.getElementById('details'); if (box) box.innerHTML = detailsHtml(UI.sel);
  document.querySelectorAll('td[data-td]').forEach(td => td.classList.toggle('sel', td.getAttribute('data-td') === UI.sel));
}
function toast(msg) { if (!msg) return; let t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast'; t.setAttribute('role', 'status'); clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = 'hidden'; }, 3200); }
function go(to) {
  UI.screen = to; UI.drawer = false; UI.sheet = null; closePop(true); popAnchor = null; UI.showRef = false;
  try { history.replaceState(null, '', '#' + to); } catch (e) {}
  render(); window.scrollTo(0, 0);
}
function gotoCell(id) {
  if (/^M\d+$/.test(id)) { UI.outTab = 'schedule'; go('outputs'); const el = document.getElementById('mo-' + id); if (el) { window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 140); el.focus({ preventScroll: true }); } return; }
  const did = id.split('.')[0]; UI.sel = id; go(did);
  const el = document.getElementById(domId(id));
  if (el) { const y = el.getBoundingClientRect().top + scrollY - 140; window.scrollTo(0, Math.max(0, y)); el.focus({ preventScroll: true }); }
}

/* ---------- state paths ---------- */
function getPath(path) { return path.split('.').reduce((o, k) => o == null ? o : o[k], S); }
function setPath(path, v) {
  const tg = pathTarget(path); if (!can(tg)) { toast(blockReason(tg)); return; }
  const ks = path.split('.'), last = ks.pop(), o = ks.reduce((a, k) => { if (a[k] == null) a[k] = {}; return a[k]; }, S); const from = o[last]; if (from === v) return; o[last] = v;
  log('edit', path, typeof from === 'object' ? null : from, v);
}

/* ---------- files ---------- */
function download(name, text, mime) {
  try { const blob = new Blob([text], { type: mime || 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('Downloading ' + name); return true; }
  catch (e) { toast('Download blocked here. Use Copy instead.'); return false; }
}
function copyText(text) {
  const done = () => toast('Copied to clipboard');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  function fallback() { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed. Select the markdown and copy it manually.'); } ta.remove(); }
}
const slug = s => (s || 'engagement').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
function saveEngagement() { if (inFrame) return toast('Saving needs the file opened directly in a browser. This viewer blocks downloads.'); if (download(`RAF-${slug(S.engagement.insurer)}-${today()}-v${S.calibration.version}.json`, JSON.stringify(S, null, 2), 'application/json') && !savesHere()) UI.dirty = false; }
const IDRE = /^[A-Za-z0-9_.:-]{1,64}$/;
/* Older files used the reviewing firm's name as a role id. It is mapped to "independent" on load and never written back. */
const OLD_ROLE = ['f', 'i', 'n', 'i', 't', 'y'].join('');
function migrate(o) {
  const whole = new RegExp('^' + OLD_ROLE + '$', 'i'), word = new RegExp('\\b' + OLD_ROLE + '\\b', 'gi');
  const fix = v => typeof v === 'string' ? (whole.test(v) ? 'independent' : v.replace(word, 'independent reviewer')) : Array.isArray(v) ? v.map(fix) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fix(x)])) : v;
  return fix(o);
}
function validateFile(o) {
  const errs = [], E = m => errs.push(m), roles = C.roles.map(r => r.id), DEC = C.decisions.map(d => d.id);
  const walk = (v, p, depth) => { if (depth > 12) return E('the file is nested too deeply'); if (typeof v === 'string') { if (v.length > 10000) E(p + ' is longer than 10,000 characters'); } else if (v && typeof v === 'object') Object.keys(v).forEach(k => { if (k.length > 200) E('a key is longer than 200 characters'); walk(v[k], p + '.' + k, depth + 1); }); };
  walk(o, 'file', 0);
  const id = (v, what) => { if (v == null || v === '') return; if (typeof v !== 'string' || !IDRE.test(v)) E(what + ' is not a valid id'); };
  (o.people || []).forEach(p => { id(p.id, 'a person id'); if (!roles.includes(p.role)) E('a person has an unknown role'); (p.areas || []).forEach(x => id(x, 'an area')); });
  (o.functions || []).forEach(f => id(f.id, 'a function id'));
  (o.criticalOperations || []).forEach(x => id(x.id, 'a critical operation id'));
  (o.inputs || []).forEach(x => { if (!C.inputs.some(c => c.ref === x.ref)) E('an input ref is not one of I1 to I11'); if (x.status && !['received', 'notHeld', 'notRequested'].includes(x.status)) E('an input has an unknown status'); });
  const dec = o.decisions || {};
  Object.keys(dec).forEach(d => { if (!DEC.includes(d)) return E('an unknown decision id'); Object.entries((dec[d] || {}).cells || {}).forEach(([k, p]) => { id(k, 'a cell id'); if (k.split('.')[0] !== d) E('a cell sits under the wrong decision'); if (!p || !['unset', 'set', 'notSet'].includes(p.status)) E('a position has an unknown status'); ['proposedBy', 'owner', 'notSetOwner'].forEach(f => id(p && p[f], 'a person reference')); if (p && p.recordedBy && !roles.includes(p.recordedBy)) E('a position has an unknown recording role'); }); });
  ((dec.d6 || {}).jurisdictions || []).forEach(j => id(j.id, 'a jurisdiction id'));
  ((dec.d7 || {}).triggers || []).forEach(t => id(t.ref, 'a trigger ref'));
  ((dec.d8 || {}).events || []).forEach(e => id(e.id, 'an event id'));
  (o.questionsForCounsel || []).forEach(q => { id(q.ref, 'a question ref'); id(q.cell, 'a cell reference'); if (!DEC.includes(q.decision)) E('a question has an unknown decision id'); if (!['open', 'answered'].includes(q.status)) E('a question has an unknown status'); });
  (o.challenge || []).forEach(c => { id(c.ref, 'a challenge ref'); id(c.cell, 'a cell reference'); id(c.raisedBy, 'a person reference'); if (c.decision && !DEC.includes(c.decision)) E('a challenge point has an unknown decision id'); if (!['open', 'accepted', 'answered'].includes(c.status)) E('a challenge point has an unknown status'); });
  const cur = o.current || {}; ['d1', 'd3'].forEach(d => Object.entries(cur[d] || {}).forEach(([k, v]) => { id(k, 'a current-state id'); if (v && !(d === 'd1' ? AT : EV).includes(v)) E('a current-state value is not on the scale'); }));
  if (cur.commonPair) { if (cur.commonPair.tier && !AT.includes(cur.commonPair.tier)) E('the most common tier is not on the scale'); if (cur.commonPair.consequence && !CO.includes(cur.commonPair.consequence)) E('the most common consequence is not on the scale'); }
  Object.entries(o.measureOwners || {}).forEach(([k, v]) => { if (!C.measures.some(m => m.ref === k)) E('an unknown measure'); id(v, 'a person reference'); });
  const cal = o.calibration || {}; if (cal.status && !['default', 'working', 'approved'].includes(cal.status)) E('the calibration status is unknown'); if (cal.version != null && (typeof cal.version !== 'number' || cal.version < 0 || cal.version !== Math.floor(cal.version))) E('the calibration version is not a whole number');
  (cal.issued || []).forEach(x => { if (typeof x.version !== 'number') E('an issued version is not a number'); if (x.status && !['working', 'approved'].includes(x.status)) E('an issued entry has an unknown status'); });
  if (o.engagement) id(o.engagement.id, 'the engagement id');
  return errs.length ? errs[0].charAt(0).toUpperCase() + errs[0].slice(1) + '.' : '';
}
function hydrate(obj) {
  if (!obj || obj.schema !== 'triodian.raf.v1') throw new Error('Not a RAF engagement file');
  obj = migrate(obj); const why = validateFile(obj); if (why) throw new Error(why);
  const base = newEngagement();
  const merged = Object.assign(base, obj);
  merged.engagement = Object.assign(base.engagement, obj.engagement);
  merged.current = Object.assign(newEngagement().current, obj.current);
  merged.calibration = Object.assign(newEngagement().calibration, obj.calibration);
  merged.decisions = newEngagement().decisions;
  ['d1','d2','d3','d4','d5','d6','d7','d8'].forEach(d => { merged.decisions[d] = Object.assign(newEngagement().decisions[d], (obj.decisions || {})[d]); });
  merged.measureOwners = obj.measureOwners || {};
  return merged;
}
function openFile(file) {
  const fr = new FileReader();
  fr.onload = () => { let st; try { st = hydrate(JSON.parse(fr.result)); } catch (e) { return toast('Rejected: ' + e.message); }
    st.engagement.id = uid(); st.engagement.example = false; startLocal(st); go('overview');
    if (SRV.on) { UI.dirty = true; autosave(); saveNow(); toast('Imported ' + file.name + ' as a new engagement.'); } else toast('Opened ' + file.name + '. The database is not reachable, so it is not saved.'); };
  fr.readAsText(file);
}
/* ---------- server storage ---------- */
/* SRV.on: the database is reachable. SRV.rev: the revision this browser last loaded or saved (null = not yet created).
   SRV.state: 'saved' | 'pending' | 'saving' | 'error' | 'conflict' | 'local' (worked example, never saved). */
const SRV = { on: false, checked: false, email: '', reason: '', list: null, listErr: '', rev: null, state: 'saved', err: '', timer: null, inflight: null, again: false, conflict: null, lastAt: '', lastBy: '' };
async function api(method, path, body) {
  let r;
  try { r = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin', redirect: 'manual', cache: 'no-store' }); }
  catch (e) { return { ok: false, status: 0, error: 'The server could not be reached. Check your connection.' }; }
  if (r.type === 'opaqueredirect' || r.status === 401) return { ok: false, status: 401, error: 'Your sign-in has expired. Reload the page to sign in again.' };
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok) return { ok: false, status: r.status, error: (j && j.error) || ('The server returned an error (' + r.status + ').'), body: j };
  return { ok: true, status: r.status, body: j };
}
async function loadList() { const r = await api('GET', '/api/engagements'); if (r.ok) { SRV.list = r.body.engagements || []; SRV.listErr = ''; } else { SRV.list = []; SRV.listErr = r.error; } if (!S) render(); }
const savesHere = () => SRV.on && S && !S.engagement.example;
function autosave() {
  if (!savesHere()) return;
  if (SRV.state === 'conflict') return;
  SRV.state = 'pending'; clearTimeout(SRV.timer); SRV.timer = setTimeout(saveNow, 1200); paintSave();
}
async function saveNow() {
  clearTimeout(SRV.timer); SRV.timer = null;
  if (!savesHere() || SRV.state === 'conflict') return;
  if (SRV.inflight) { SRV.again = true; return SRV.inflight; }
  const snap = S, text = JSON.parse(JSON.stringify(S));
  SRV.state = 'saving'; paintSave();
  SRV.inflight = (async () => {
    const r = SRV.rev == null ? await api('POST', '/api/engagements', { data: text }) : await api('PUT', '/api/engagements/' + encodeURIComponent(snap.engagement.id), { revision: SRV.rev, data: text });
    SRV.inflight = null;
    if (S !== snap) return;            /* the user moved to another engagement meanwhile */
    if (r.ok) { SRV.rev = r.body.revision; SRV.lastAt = r.body.updatedAt; SRV.lastBy = r.body.updatedBy; SRV.err = ''; if (SRV.again) { SRV.again = false; SRV.state = 'pending'; return saveNow(); } SRV.state = 'saved'; UI.dirty = false; }
    else if (r.status === 409) { SRV.state = 'conflict'; SRV.conflict = r.body || {}; SRV.err = r.error; toast(r.error); }
    else { SRV.state = 'error'; SRV.err = r.error; toast('Not saved: ' + r.error); }
    SRV.again = false; paintSave();
  })();
  return SRV.inflight;
}
async function flushSave() { if (!savesHere()) return true; if (SRV.state === 'pending' || SRV.timer) await saveNow(); else if (SRV.inflight) await SRV.inflight; return SRV.state === 'saved'; }
function saveLabel() {
  if (!S) return '';
  if (S.engagement.example) return ['b-ochre', 'Example · not saved', 'The worked example is never saved to the database.'];
  if (!SRV.on) return ['b-ochre', 'Not saved', 'The database is not reachable. Download a copy from the menu to keep your work.'];
  return { saved: ['b-green', 'Saved', SRV.lastAt ? 'Saved ' + fmtLocal(SRV.lastAt) + ' by ' + SRV.lastBy : 'Saved'], pending: ['b-grey', 'Saving…', 'Changes will be saved in a moment'], saving: ['b-grey', 'Saving…', 'Saving to the database'], error: ['b-red', 'Not saved · retry', SRV.err], conflict: ['b-red', 'Changed elsewhere', SRV.err] }[SRV.state] || ['b-grey', '', ''];
}
function saveChip() { const l = saveLabel(); if (!l || !l[1]) return ''; return `<button class="badge ${l[0]}" id="savechip" data-act="saveChip" title="${esc(l[2])}" aria-label="${esc(l[1])}" style="cursor:pointer"><span class="sdot" aria-hidden="true"></span><span class="st">${esc(l[1])}</span></button>`; }
function paintSave() { const el = document.getElementById('savechip'); if (el) el.outerHTML = saveChip(); }
async function openFromServer(id) {
  const r = await api('GET', '/api/engagements/' + encodeURIComponent(id));
  if (!r.ok) return toast('Could not open: ' + r.error);
  try { S = hydrate(r.body.data); } catch (e) { return toast('Could not open: ' + e.message); }
  SRV.rev = r.body.revision; SRV.state = 'saved'; SRV.err = ''; SRV.conflict = null; SRV.lastAt = r.body.updatedAt; SRV.lastBy = r.body.updatedBy;
  UI.dirty = false; UI.sel = null; UI.personId = ''; lastSig = null; go('overview');
}
/* Before leaving the current engagement: wait for saving to finish; if it cannot be saved, ask. */
async function leave(what) {
  if (!S) return true;
  if (savesHere()) { if (await flushSave()) return true; return confirm('The latest changes could not be saved (' + (SRV.err || 'unknown error') + '). Discard them and ' + what + '?'); }
  if (UI.dirty && !S.engagement.example) return confirm('Your changes are not saved anywhere. Discard them and ' + what + '?');
  return true;
}
function startLocal(state) { S = state; SRV.rev = null; SRV.state = 'saved'; SRV.err = ''; SRV.conflict = null; SRV.lastAt = ''; SRV.lastBy = ''; UI.dirty = false; UI.sel = null; UI.personId = ''; lastSig = null; }

/* ---------- worked example (fictional) ---------- */
function buildExample() {
  const X = newEngagement();
  Object.assign(X.engagement, { insurer: 'Corvane General Insurance (fictional)', reference: 'RAF-CGI-2026-01', counselFirm: 'Askew Lane Partners (fictional)', privilegeMarking: 'Privileged and confidential · prepared at the direction of counsel · worked example', sessionDates: ['2026-10-15', '2026-10-22'], example: true, notificationHours: '72' });
  X.people = [
    { id: 'p1', name: 'Priya Natarajan', organisation: 'Corvane General', role: 'cro', areas: ['fi', 'lc'] },
    { id: 'p2', name: 'Tom Ellery', organisation: 'Corvane General · operational risk', role: 'risk', areas: ['fr', 'to'] },
    { id: 'p3', name: 'Ana Duarte', organisation: 'Corvane General · claims executive', role: 'risk', areas: ['cl', 'cd', 'cc'] },
    { id: 'p4', name: 'Marcus Lee', organisation: 'Corvane General · chief underwriting officer', role: 'risk', areas: ['uw', 'pa'] },
    { id: 'p5', name: 'Meredith Vance', organisation: 'Askew Lane Partners', role: 'counsel', areas: [] },
    { id: 'p6', name: 'Sam Okoro', organisation: 'Triodian', role: 'triodian', areas: [] },
    { id: 'p7', name: 'Lena Hartmann', organisation: 'Independent reviewer', role: 'independent', areas: [] },
    { id: 'p8', name: 'Board secretariat', organisation: 'Corvane General', role: 'board', areas: [] }
  ];
  X.functionsConfirmed = true;
  X.criticalOperations = [
    { id: 'o1', name: 'Claims payment', tolerance: 'No more than 2 business days without the ability to pay claims', source: 'Critical operations register v3' },
    { id: 'o2', name: 'Policy issuance and renewal', tolerance: 'No more than 3 business days', source: 'Critical operations register v3' },
    { id: 'o3', name: 'Premium collection', tolerance: 'No more than 5 business days', source: 'Critical operations register v3' }
  ];
  const rec = { I1: 'v2026.1, approved July 2026', I2: '', I3: '', I4: '', I5: '41 providers, 9 material', I6: 'Offshoring to approved jurisdictions only', I7: 'AI inventory of 23 uses', I8: '', I9: '', I10: 'Material incidents to the regulator within 72 hours', I11: 'Risk committee 18 Nov 2026' };
  X.inputs.forEach(i => { i.status = 'received'; i.date = '2026-10-09'; i.note = rec[i.ref] || ''; });
  const cur1 = { own: 'A2 A3 A2 A4 A2 A3 A2 A1 A4', provider: 'A3 A4 A3 A4 A2 A3 A2 A1 A4', platform: 'A2 A3 A2 A3 A1 A2 A1 A1 A3' };
  X.functions.forEach((f, i) => C.locations.forEach(l => { X.current.d1[`d1.${f.id}.${l.id}`] = cur1[l.id].split(' ')[i]; }));
  const cur3 = { A1: 'E0 E1 E1 E1 E1', A2: 'E1 E1 E2 E2 E2', A3: 'E2 E2 E2 E3 E3', A4: 'E2 E3 E3 E3 E4', A5: '', A6: '' };
  AT.forEach(a => { if (cur3[a]) cur3[a].split(' ').forEach((e, j) => X.current.d3[`d3.${a}.${CO[j]}`] = e); });
  X.current.commonPair = { tier: 'A3', consequence: 'C3' };
  X.current.d2 = { C2: 'Breach of a material outsourcing term', C3: '$250,000 single event; $1m in a quarter', C4: '10 or more policyholders affected, or any single case of serious financial hardship' };
  X.current.offshoring = 'Material outsourcing to Australia and New Zealand accepted. Any other jurisdiction needs CRO approval and a legal review of audit and data access rights.';
  X.decisions.d6.jurisdictions = [ { id: 'j1', name: 'Australia', start: 'Accepted' }, { id: 'j2', name: 'New Zealand', start: 'Accepted' }, { id: 'j3', name: 'United States', start: 'Escalate' }, { id: 'j4', name: 'India', start: 'Escalate' } ];
  const old = S; S = X; const role = UI.role; UI.role = 'cro';
  const put = (id, v, who, extra) => { const p = getPos(id); Object.assign(p, { value: v, status: 'set', proposedBy: who || 'p1', recordedBy: 'triodian', owner: defaultOwner(id), source: 'session' }, extra || {}); };
  Object.keys(X.current.d1).forEach(id => put(id, X.current.d1[id], id.includes('.cl.') || id.includes('.cd.') || id.includes('.cc.') ? 'p3' : 'p1'));
  Object.assign(getPos('d1.cl.provider'), { condition: 'Up to $5,000 per claim; above that a person approves', testable: true, reason: 'Matches the binder schedule for the claims TPA, clause 4.2' });
  Object.assign(getPos('d1.uw.provider'), { reason: 'Rating engine at the MGA already prices within approved bands' });
  Object.assign(getPos('d1.fr.provider'), { reason: 'Fraud screening vendor triages; decisions return to our investigators' });
  Object.assign(getPos('d1.cc.own'), { condition: 'Templates approved by Compliance', testable: false });
  ['C2', 'C3', 'C4'].forEach(c => put(`d2.${c}`, X.current.d2[c], c === 'C3' ? 'p1' : c === 'C4' ? 'p7' : 'p2'));
  X.criticalOperations.forEach(o => put(`d2.op.${o.id}`, o.tolerance, 'p1'));
  Object.assign(getPos('d2.C3'), { dissent: 'The independent reviewer noted the period figure was set before the 2025 portfolio growth.' });
  AT.forEach((a, i) => CO.forEach((c, j) => { const id = `d3.${a}.${c}`; if (a === 'A6' && c === 'C1') return; const cv = X.current.d3[id]; let v = cv || (a === 'A5' ? 'E5' : 'E6'); if ((a === 'A3' || a === 'A4') && j >= 3) v = EV[Math.min(6, rk(EV, cv) + 1)]; put(id, v, 'p1'); }));
  D('d4').gaps.forEach(g => D('d4').bands.forEach(b => put(`d4.${g.id}.${b.id}`, D('d4').matrix[g.id][b.id], 'p2')));
  D('d4').priorities.forEach(p => { put(`d4.time.${p.id}`, p.limit, 'p1'); put(`d4.interim.${p.id}`, p.interim, 'p1'); });
  D('d5').bands.forEach(b => { put(`d5.${b.id}.notKnown`, b.notKnown || (b.id === 'b3' ? '2' : ''), 'p1'); put(`d5.${b.id}.f4`, b.f4 || '30 June 2027; then the provider is asked', 'p1'); put(`d5.${b.id}.conf`, b.conf, 'p1'); });
  [['j1', 'Accepted', 'Accepted'], ['j2', 'Accepted', 'Accepted'], ['j3', 'Escalate', 'Accepted'], ['j4', 'Escalate', 'Escalate']].forEach(([j, a, b]) => { put(`d6.j.${j}.established`, a, 'p2'); put(`d6.j.${j}.runs`, b, 'p2'); });
  Object.assign(getPos('d6.concentration'), { status: 'notSet', notSetOwner: 'p2', notSetDue: '2026-11-30', recordedBy: 'triodian' });
  const hrs = { TR1: '48', TR2: '48', TR3: '48', TR4: '12', TR5: '48', TR6: '48', TR7: '96' };
  X.decisions.d7.triggers.forEach(t => { put(`d7.${t.ref}.threshold`, t.threshold, 'p2'); if (hrs[t.ref]) put(`d7.${t.ref}.time`, hrs[t.ref], 'p2'); put(`d7.${t.ref}.to`, t.ref === 'TR4' ? 'CRO and the accountable person for the function' : 'Arrangement owner', 'p2'); });
  X.decisions.d8.events.forEach(e => put(`d8.ev.${e.id}`, e.revisit, 'p1'));
  put('d8.interval', 'Annual, in the same cycle as the main risk appetite statement', 'p1');
  X.questionsForCounsel = [
    { ref: 'QC-01', decision: 'd3', cell: 'd3.A4.C4', question: 'Once the board records an expectation above what it holds today, is every shortfall measured against the board\u2019s own words? Advice needed before the statement goes to the board.', response: '', status: 'open' },
    { ref: 'QC-02', decision: 'd7', cell: 'd7.TR4.time', question: 'Does 12 hours for TR4 leave enough room to meet the insurer\u2019s own notification obligations?', response: 'Yes, on the current procedure. Confirm if I10 changes.', status: 'answered' }
  ];
  X.challenge = [
    { ref: 'CH-01', raisedBy: 'p3', decision: 'd1', cell: 'd1.cl.provider', point: 'The A4 ceiling inside the claims TPA is above our own staff. The reason should cite the binder schedule.', response: 'Reason updated to cite clause 4.2 of the binder schedule.', status: 'accepted' },
    { ref: 'CH-02', raisedBy: 'p2', decision: 'd2', cell: 'd2.C4', point: 'The hardship limb of C4 has no definition. Two classifiers could reach different levels.', response: '', status: 'open' }
  ];
  X.measureOwners = { M1: 'p3', M2: 'p1', M3: 'p2', M4: 'p1', M5: 'p2', M6: 'p1', M7: 'p4', M8: 'p2', M9: 'p1' };
  X.history = [{ at: '2026-10-15T10:05:00.000Z', by: 'Triodian', action: 'session', target: 'session 1', from: null, to: 'opened', version: 0 }, { at: '2026-10-22T09:30:00.000Z', by: 'Triodian', action: 'session', target: 'session 2', from: null, to: 'opened', version: 0 }];
  S = old; UI.role = role; return X;
}

/* ---------- events ---------- */
function onClick(e) {
  const pt = e.target.closest('[data-pact]');
  if (pt) { const a = pt.dataset.pact;
    if (a === 'close') closePop(); else if (a === 'back') { UI.pop.stack.pop(); renderPop(); }
    else if (a === 'more') { const id = pt.dataset.id; closePop(true); popAnchor = null; go('reference'); const el = document.getElementById('g-' + id); if (el) { window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 90); el.style.background = 'var(--aubergine-bg)'; } }
    return; }
  const term = e.target.closest('.term');
  if (term) { e.preventDefault(); const id = term.dataset.term; if (term.closest('#poproot') && UI.pop) { UI.pop.stack.push(id); renderPop(); } else if (UI.pop && popAnchor === term) closePop(); else openPop(id, term); return; }
  if (UI.pop && !e.target.closest('#poproot')) closePop(true);
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, d = el.dataset;
  if (el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type !== 'button')) return;
  const gateOf = { addPerson: 'setup', rmPerson: 'setup', addFn: 'setup', rmFn: 'setup', addOp: 'setup', rmOp: 'setup', useStart: d.d, bulkOwner: d.d, addQC: d.d, addJur: 'd6', rmJur: 'd6', addTrig: 'd7', rmTrig: 'd7', addEvent: 'd8', rmEvent: 'd8', loadExtract: 'd3', notSet: (d.cell || '').split('.')[0], clearNotSet: (d.cell || '').split('.')[0] }[a];
  if (gateOf && !can(gateOf)) return toast(blockReason(gateOf));
  const A = {
    go: () => go(d.to), drawer: () => { UI.drawer = !UI.drawer; render(); }, present: () => togglePresent(),
    save: () => saveEngagement(),
    open: () => leave('open another file').then(ok => { if (ok) document.getElementById('fileIn').click(); }),
    new: () => leave('start a new engagement').then(ok => { if (!ok) return; startLocal(newEngagement()); go('setup'); }),
    example: () => leave('open the worked example').then(ok => { if (!ok) return; startLocal(buildExample()); go('overview'); toast('Worked example open. Corvane General is fictional. It is never saved.'); }),
    home: () => leave('go to the list of engagements').then(ok => { if (!ok) return; S = null; UI.drawer = false; UI.screen = 'entry'; if (SRV.on) { SRV.list = null; loadList(); } render(); }),
    openEng: () => openFromServer(d.id),
    saveChip: () => {
      if (SRV.state === 'error') { saveNow(); return; }
      if (SRV.state === 'conflict') {
        const c = SRV.conflict || {};
        if (!confirm('Someone else' + (c.updatedBy ? ' (' + c.updatedBy + ')' : '') + ' saved this engagement' + (c.updatedAt ? ' at ' + fmtLocal(c.updatedAt) : '') + ' after you opened it, so your latest changes were not saved.\n\nOK: download your version as a file, then load theirs.\nCancel: stay here without saving.')) return;
        saveEngagement(); const id = S.engagement.id; S = null; openFromServer(id); return;
      }
      toast(saveLabel()[2]);
    },
    resume: () => leave('move the autosaved engagement').then(ok => { if (!ok) return; let st; try { st = hydrate(JSON.parse(localStorage.getItem(d.key))); } catch (er) { return toast('Autosaved copy could not be read: ' + er.message); }
      st.engagement.autosave = false; startLocal(st); go('overview');
      if (SRV.on) { UI.dirty = true; autosave(); saveNow().then(() => { if (SRV.state === 'saved') { try { localStorage.removeItem(d.key); } catch (er) {} toast('Moved to the database and removed from this browser.'); } }); } }),
    addPerson: () => { S.people.push({ id: 'p' + uid(), name: '', organisation: '', role: 'risk', areas: [] }); log('addPerson', 'people'); render(); },
    rmPerson: () => { const p = S.people[+d.i]; if (confirm('Remove ' + (p.name || 'this person') + '?')) { S.people.splice(+d.i, 1); log('removePerson', 'people', p.name, null); render(); } },
    addFn: () => { S.functions.push({ id: 'f' + uid(), name: 'New function' }); S.functionsConfirmed = false; log('addFunction', 'functions'); render(); },
    rmFn: () => { const f = S.functions[+d.i]; if (confirm('Remove ' + f.name + '?')) { S.functions.splice(+d.i, 1); S.functionsConfirmed = false; log('removeFunction', 'functions', f.name, null); render(); } },
    addOp: () => { S.criticalOperations.push({ id: 'o' + uid(), name: '', tolerance: '', source: '' }); log('addCriticalOperation', 'criticalOperations'); render(); },
    rmOp: () => { const o = S.criticalOperations.splice(+d.i, 1)[0]; log('removeCriticalOperation', 'criticalOperations', o.name, null); render(); },
    useStart: () => { const ids = []; cellsFor(d.d).forEach(c => { const sv = startingValue(c.id), p = P(c.id); if (sv && (!p || p.status === 'unset')) { setValue(c.id, sv, 'startingPosition', true); ids.push(c.id); } }); if (ids.length) log('useStartingPosition', d.d, null, ids.join(', ')); render(); toast(ids.length ? `Starting position copied into ${ids.length} ${ids.length === 1 ? 'cell' : 'cells'}. Each needs a proposer.` : 'No empty cells with a starting value.'); },
    showRef: () => { UI.showRef = !UI.showRef; if (UI.showRef) { S.decisions.d3.referenceShown.push({ at: nowISO(), by: ROLE_NAME[UI.role] }); log('referenceShown', 'd3', null, 'Appendix A shown'); } render(); },
    details: () => { UI.sel = d.cell; if (bp() === 'phone') { UI.sheet = d.cell; renderSheet(); } else { refreshDetails(); const b = document.getElementById('details'); if (b) window.scrollTo(0, b.getBoundingClientRect().top + scrollY - 80); } },
    closeSheet: () => { UI.sheet = null; renderSheet(); },
    notSet: () => { const o = document.getElementById('ns-owner'), du = document.getElementById('ns-due'); if (recordNotSet(d.cell, o && o.value, du && du.value)) { render(); toast('Recorded as not set.'); } },
    clearNotSet: () => { const p = getPos(d.cell); p.status = 'unset'; p.notSetOwner = ''; p.notSetDue = ''; log('clearNotSet', d.cell, 'not set', null); render(); },
    qcForCell: () => { UI.sel = d.cell; UI.sheet = null; renderSheet(); const t = document.getElementById('qc-new'); if (t) { window.scrollTo(0, t.getBoundingClientRect().top + scrollY - 140); t.focus(); } },
    addQC: () => { const t = document.getElementById('qc-new'); if (!t || !t.value.trim()) return toast('Write the question first.'); const ref = 'QC-' + String(S.questionsForCounsel.length + 1).padStart(2, '0'); S.questionsForCounsel.push({ ref, decision: d.d, cell: UI.sel && UI.sel.startsWith(d.d + '.') ? UI.sel : '', question: t.value.trim(), response: '', status: 'open' }); t.value = ''; log('question', ref, null, 'logged'); render(); toast(ref + ' logged for counsel.'); },
    bulkOwner: () => { const o = document.getElementById('bulkOwner').value; if (!o) return; let n = 0; cellsFor(d.d).forEach(c => { const p = P(c.id); if (p && p.status === 'set' && !p.owner) { p.owner = o; n++; } }); if (n) { log('bulkOwner', d.d, null, pname(o) + ' · ' + n); } render(); toast(n + ' cells given an owner.'); },
    addJur: () => { const n = document.getElementById('newJur'), s = document.getElementById('newJurStart'); if (!n.value.trim()) return toast('Name the jurisdiction.'); S.decisions.d6.jurisdictions.push({ id: 'j' + uid(), name: n.value.trim(), start: s.value }); log('addJurisdiction', 'd6', null, n.value.trim()); render(); },
    rmJur: () => { const j = S.decisions.d6.jurisdictions.splice(+d.i, 1)[0]; log('removeJurisdiction', 'd6', j.name, null); render(); },
    addTrig: () => { let n = S.decisions.d7.triggers.length + 1; while (S.decisions.d7.triggers.some(t => t.ref === 'TR' + n)) n++; S.decisions.d7.triggers.push({ ref: 'TR' + n, name: 'New trigger', measure: '', threshold: '', custom: true }); log('addTrigger', 'd7', null, 'TR' + n); render(); },
    rmTrig: () => { const t = S.decisions.d7.triggers[+d.i]; if (!t || !t.custom) return; if (!confirm('Remove ' + t.ref + ' ' + t.name + '?')) return; S.decisions.d7.triggers.splice(+d.i, 1); Object.keys(S.decisions.d7.cells).forEach(k => { if (k.startsWith('d7.' + t.ref + '.')) delete S.decisions.d7.cells[k]; }); log('removeTrigger', 'd7', t.ref + ' ' + t.name, null); render(); },
    rmEvent: () => { const e = S.decisions.d8.events[+d.i]; if (!e || !e.custom) return; if (!confirm('Remove the event "' + e.event + '"?')) return; S.decisions.d8.events.splice(+d.i, 1); delete S.decisions.d8.cells['d8.ev.' + e.id]; log('removeEvent', 'd8', e.event, null); render(); },
    addEvent: () => { S.decisions.d8.events.push({ id: 'e' + uid(), event: 'New event', revisit: '', custom: true }); log('addEvent', 'd8'); render(); },
    gotoCell: () => gotoCell(d.cell), loadExtract: () => document.getElementById('extractIn').click(),
    agree: () => agreeWorking(), approve: () => recordApproval(document.getElementById('ap-date').value, document.getElementById('ap-min').value.trim(), document.getElementById('ap-by').value.trim()),
    outTab: () => { UI.outTab = d.t; render(); }, chTab: () => { UI.chTab = d.t; render(); },
    copy: () => { if (d.t === 'calibration' && exportBlocked()) return toast('Export blocked: checks failing.'); copyText(outputFor(d.t)[0]()); }, download: () => { if (d.t === 'calibration' && exportBlocked()) return toast('Export blocked: checks failing.'); const [fn, sl] = outputFor(d.t); download(`RAF-${slug(S.engagement.insurer)}-${sl}-v${S.calibration.version}.md`, fn(), 'text/markdown'); },
    downloadJson: () => exportBlocked() ? toast('Export blocked: checks failing.') : download(`RAF-${slug(S.engagement.insurer)}-calibration-v${S.calibration.version}.json`, JSON.stringify(calibrationSet(), null, 2), 'application/json'),
    copyJson: () => exportBlocked() ? toast('Export blocked: checks failing.') : copyText(JSON.stringify(calibrationSet(), null, 2)),
    addCH: () => { const by = document.getElementById('ch-by').value, pt = document.getElementById('ch-point').value.trim(), dc = document.getElementById('ch-dec').value; if (!can(dc)) return toast(blockReason(dc)); if (!by || !pt) return toast('Choose who raised it and write the point.'); const ref = 'CH-' + String(S.challenge.length + 1).padStart(2, '0'); S.challenge.push({ ref, raisedBy: by, decision: dc, cell: document.getElementById('ch-cell').value, point: pt, response: '', status: 'open' }); log('challenge', ref, null, 'raised'); render(); }
  };
  if (A[a]) A[a]();
}
function onChange(e) { inChange = true; try { changeHandler(e); } finally { inChange = false; } }
function changeHandler(e) {
  const t = e.target, d = t.dataset;
  if (d.act === 'role') { const [k, v] = t.value.split(':'); if (k === 'p') { const p = person(v); if (p) { UI.personId = p.id; UI.role = p.role; } } else { UI.personId = ''; UI.role = v; } UI.err = {}; render(); toast('Acting as ' + actor()); return; }
  if (d.act === 'chFilter') { UI.chFilter = t.value; render(); return; }
  if (d.act === 'chDec') { UI.chDec = t.value; render(); return; }
  if (t.id === 'fileIn') { if (t.files[0]) openFile(t.files[0]); t.value = ''; return; }
  if (t.id === 'extractIn') { const f = t.files[0]; t.value = ''; if (!f) return; const fr = new FileReader(); fr.onload = () => { try { const o = JSON.parse(fr.result); if (!o || o.schema !== 'triodian.aua.extract.v1' || !Array.isArray(o.entries)) throw new Error('not a register extract (schema triodian.aua.extract.v1)');
    const cnt = {}; let max = null; o.entries.forEach(x => { if (x.tier && x.consequence) { const k = x.tier + '.' + x.consequence; cnt[k] = (cnt[k] || 0) + 1; } if (x.received && /^E\d$/.test(x.received) && (!max || x.received > max)) max = x.received; });
    const top = Object.entries(cnt).sort((p, q) => q[1] - p[1])[0]; if (top) { const [ti, co] = top[0].split('.'); S.current.commonPair = { tier: ti, consequence: co }; }
    S.current.register = { on: today(), entries: o.entries.length, pair: top ? top[0].replace('.', ' × ') : '', maxReceived: max }; log('registerExtract', 'd3', null, o.entries.length + ' entries'); render(); toast('Register extract loaded. K10 uses it.'); } catch (er) { toast('Rejected: ' + er.message); } }; fr.readAsText(f); return; }
  if (d.cell && !d.pf) { if (t.value === '__ns') return; setValue(d.cell, t.value.trim ? t.value.trim() : t.value); UI.sel = d.cell; render(); return; }
  if (d.pf) { const v = t.type === 'checkbox' ? t.checked : t.value; const p = getPos(d.cell); const from = p[d.pf]; if (from === v) return; setField(d.cell, d.pf, v, from); render(); return; }
  if (d.cur) { const did = d.cur.split('.')[0]; if (!canEdit(did) || did === 'd2') { toast(blockReason(did)); render(); return; } if (t.value) S.current[did][d.cur] = t.value; else delete S.current[did][d.cur]; log('currentState', d.cur, null, t.value || null); render(); return; }
  if (d.area != null) { if (!can('setup')) { toast(blockReason('setup')); render(); return; } const p = S.people[+d.area]; p.areas = p.areas || []; if (t.checked) p.areas.push(t.value); else p.areas = p.areas.filter(x => x !== t.value); log('areas', 'people.' + d.area, null, p.areas.join(',')); render(); return; }
  if (d.path) { setPath(d.path, t.type === 'checkbox' ? t.checked : t.value); render(); return; }
}
function onInput(e) {
  const t = e.target;
  if (t.dataset.act === 'refq') { UI.refQ = t.value; render(); return; }
  if (t.dataset.path && t.type !== 'checkbox' && t.tagName !== 'SELECT') UI.dirty = true; /* state is written on change, so history keeps the true "from" */
}
function onFocusIn(e) {
  const t = e.target;
  if (t.dataset && t.dataset.cell && !t.dataset.pf && bp() !== 'phone' && UI.sel !== t.dataset.cell) { UI.sel = t.dataset.cell; refreshDetails(); }
}
function onKey(e) {
  const t = e.target, typing = /INPUT|TEXTAREA|SELECT/.test(t.tagName);
  if (e.key === 'Escape') { if (UI.pop) { closePop(); return; } if (UI.sheet) { UI.sheet = null; renderSheet(); return; } if (UI.drawer) { UI.drawer = false; render(); return; } }
  if ((e.key === 'p' || e.key === 'P') && !typing && !e.metaKey && !e.ctrlKey && S && UI.screen !== 'entry') { togglePresent(); return; }
  if (t.dataset && t.dataset.gr) {
    const isSel = t.tagName === 'SELECT', k = e.key;
    const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
    if (!mv || (!isSel && mv[1] !== 0) || e.altKey) return;
    e.preventDefault();
    const r = +t.dataset.r + mv[0], c = +t.dataset.c + mv[1];
    const nx = document.querySelector(`[data-gr="${t.dataset.gr}"][data-r="${r}"][data-c="${c}"]`); if (nx) nx.focus();
  }
}
function togglePresent() { if (bp() !== 'desk') return toast('Present mode needs a screen 1024px or wider.'); UI.present = !UI.present; render(); }

/* ---------- boot ---------- */
async function boot() {
  C = window.RAF_CONTENT || null;
  if (!C) { try { C = await (await fetch('content.json')).json(); } catch (e) { document.getElementById('app').innerHTML = '<p style="padding:40px;font-family:sans-serif">content.json could not be loaded. Keep content.js beside index.html, or serve the folder from a web server.</p>'; return; } }
  if (!C.markSvg) { try { C.markSvg = await (await fetch('triodian-mark.svg')).text(); } catch (e) { C.markSvg = ''; } }
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('keydown', onKey);
  let sy0 = null; document.addEventListener('touchstart', e => { if (e.target.closest('.handle')) sy0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchmove', e => { if (sy0 != null && e.touches[0].clientY - sy0 > 60) { sy0 = null; if (UI.pop) closePop(); else if (UI.sheet) { UI.sheet = null; renderSheet(); } } }, { passive: true });
  document.addEventListener('touchend', () => { sy0 = null; });
  window.addEventListener('resize', () => { if (bp() !== lastBp) { closePop(true); popAnchor = null; render(); } });
  window.addEventListener('beforeunload', e => { const unsaved = savesHere() ? SRV.state !== 'saved' : (UI.dirty && S && !S.engagement.example); if (unsaved) { if (savesHere()) saveNow(); e.preventDefault(); e.returnValue = ''; } });
  render();
  const r = location.protocol.startsWith('http') ? await api('GET', '/api/me') : { ok: false, error: 'opened as a local file' };
  SRV.checked = true;
  if (r.ok) { SRV.on = true; SRV.email = r.body.email; loadList(); } else { SRV.on = false; SRV.reason = r.error; }
  render();
}
window.RAF = { get state() { return S; }, validate: o => validateFile(migrate(o)), checks: () => runChecks(), calibrationSet: () => calibrationSet(), go };
boot();
})();
