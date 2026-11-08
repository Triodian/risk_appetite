/* AI Risk Appetite · Triodian
   Single-page app. No libraries. One engagement per deployment, saved to the server.
   The signed-in user's engagement role (managed in /admin) decides what they can change; the server enforces it.
   The worked example is a practice mode: never saved, and the role can be switched to see what each role can do. */
(function () {
'use strict';
let C = null;            // content.json with the engagement's sector pack applied (public/packs.js)
let BASE = null;         // content.js as built: the wording with {tokens}, and every pack
let N = {};              // the pack's nouns: N.entity is "insurer" in the general insurer pack
let S = null;            // engagement
const UI = { screen: 'entry', role: 'triodian', personId: '', sel: null, open: null, drawer: false, pop: null, sheet: null, outTab: 'statement', chTab: 'challenge', chFilter: '', refQ: '', present: false, showRef: false, dirty: false, err: {}, focusVal: null };
const AT = ['A1','A2','A3','A4','A5','A6'], CO = ['C1','C2','C3','C4','C5'], EV = ['E0','E1','E2','E3','E4','E5','E6'], PRI = ['Low','Medium','High'], CONF = ['Low','Medium','High'], MARK = ['Accepted','Escalate','Not accepted'];
const ROLE_NAME = { counsel: 'Counsel', gc: 'GC', triodian: 'Triodian', cro: 'CRO', risk: 'Risk function', independent: 'Independent reviewer', board: 'Board record', none: 'No engagement role' };
/* Three areas share this script: the app (/), Admin (/admin/: set-up, users, activity) and the profile page (/profile/). */
const AREA = /^\/admin(\/|$)/.test(location.pathname) ? 'admin' : /^\/profile(\/|$)/.test(location.pathname) ? 'profile' : 'app';
const ADMIN_SCREENS = ['setup', 'users', 'activity', 'notifications'];
const SEQ = ['overview','d1','d2','d3','d4','d5','d6','d7','d8','checks','challenge','outputs'];
/* Readable URL fragments: #decision-2 instead of #d2. Old fragments (#d2, #overview, #setup) still open the right screen. */
const SLUG = { overview: 'decisions', setup: 'set-up', actions: 'my-actions' }; for (let i = 1; i <= 8; i++) SLUG['d' + i] = 'decision-' + i;
const toSlug = id => SLUG[id] || id;
const fromSlug = h => { h = decodeURIComponent(h || '').toLowerCase(); const hit = Object.keys(SLUG).find(k => SLUG[k] === h); return hit || h; };

/* ---------- helpers ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const nowISO = () => new Date().toISOString();
/* Dates. Data is stored as ISO dates and UTC timestamps. Screens follow the user's Profile choice of
   date format and time zone; output documents always use the long form ("18 October 2026"). */
const prefDF = () => (typeof SRV !== 'undefined' && SRV.user && SRV.user.dateFormat) || 'long';
const prefTZ = () => (typeof SRV !== 'undefined' && SRV.user && SRV.user.timeZone) || undefined;
const DF_OPTS = { long: { day: 'numeric', month: 'long', year: 'numeric' }, short: { day: 'numeric', month: 'short', year: 'numeric' }, numeric: { day: '2-digit', month: '2-digit', year: 'numeric' } };
const ymdIn = (d, tz) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; };
const today = () => { try { return ymdIn(new Date(), prefTZ()); } catch (e) { return ymdIn(new Date()); } };
const fmtYMD = (s, df) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s)); if (!m) return String(s); if (df === 'iso') return s; return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)).toLocaleDateString('en-AU', Object.assign({ timeZone: 'UTC' }, DF_OPTS[df] || DF_OPTS.long)); };
const dAU = s => s ? fmtYMD(s, prefDF()) : '';
const dDoc = s => s ? fmtYMD(s, 'long') : '';
// Only free-standing dates: a date inside a reference such as BRC-2026-11-12 is left as written.
const datesAU = str => String(str).replace(/(?<![\w-])(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?Z?)?)?(?![\w-])/g, (m, d, t) => dDoc(d) + (t ? ', ' + t : ''));
const fmtAt = s => s ? fmtLocal(s) : '';
const fmtLocal = s => { if (!s) return ''; const d = new Date(s); if (isNaN(d)) return s; const tz = prefTZ(), df = prefDF();
  try { const time = d.toLocaleTimeString('en-AU', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }); return fmtYMD(ymdIn(d, tz), df === 'long' ? 'short' : df) + ', ' + time; } catch (e) { return d.toLocaleString('en-AU'); } };
const rk = (arr, v) => arr.indexOf(v);
const D = id => C.decisions.find(d => d.id === id) || { id: String(id), n: '?', name: 'Unknown decision', session: '', param: '', question: '', prompts: [], startingInputs: [], levels: [], gaps: [], bands: [], priorities: [], events: [], triggers: [], markings: [] };
const sid = s => String(s).replace(/[^a-zA-Z0-9_-]/g, '_');
const scaleDef = code => { const s = [].concat(C.scales.authority, C.scales.consequence, C.scales.evidence).find(x => x.code === code); return s ? s.def : ''; };
const me = () => UI.personId && S ? person(UI.personId) : null;
const actor = () => { const p = me(); return p ? p.name + ' (' + rolesText(p) + ')' : ROLE_NAME[UI.role]; };
const bp = () => innerWidth >= 1024 ? 'desk' : innerWidth >= 640 ? 'tab' : 'phone';
const person = id => S.people.find(p => p.id === id);
const pname = id => { const p = person(id); return p ? p.name : ''; };
const domId = id => 'c_' + id.replace(/[^a-zA-Z0-9]/g, '_');
const scaleName = (code) => { const all = [].concat(C.scales.authority, C.scales.consequence, C.scales.evidence); const s = all.find(x => x.code === code); return s ? s.name : ''; };
const scaleLabel = code => { const s = [].concat(C.scales.authority, C.scales.consequence, C.scales.evidence).find(x => x.code === code); return s ? (s.label || s.name) : ''; };
const scaleOpt = code => scaleLabel(code) ? code + ' ' + scaleLabel(code) : code;
/* Put the short label after a bare code: "C1 or C2" -> "C1 Immaterial or C2 Contract breach". Leaves a code alone when its
   label or framework name already follows ("C4 Customer harm", "C1 immaterial", "C5 disruption of ..."), and turns
   "C2, contract breach" into "C2 Contract breach". */
const withLabels = (str, letters = 'ACE') => { str = String(str); let out = '', last = 0; const re = new RegExp(`\\b([${letters}][0-6])\\b`, 'g'); let m;
  while ((m = re.exec(str))) {
    const c = m[1], lab = scaleLabel(c), nm = scaleName(c); if (!lab) continue;
    const after = str.slice(re.lastIndex), comma = /^, /.test(after), rest = comma ? after.slice(2) : after.startsWith(' ') ? after.slice(1) : null;
    let skip = 0, keep = false;
    if (rest !== null) { const lr = rest.toLowerCase(), full = [lab, nm].find(x => lr.startsWith(x.toLowerCase()) && !/[a-z]/i.test(rest[x.length] || ''));
      if (full) skip = (comma ? 2 : 1) + full.length; else if (!comma && (lr.startsWith(nm.split(/[ -]/)[0].toLowerCase() + ' ') || (c === 'C5' && lr.startsWith('disruption')))) keep = true; }
    out += str.slice(last, m.index) + (keep ? c : c + ' ' + lab); last = re.lastIndex + skip; re.lastIndex = last;
  }
  return out + str.slice(last); };
const scaleTip = code => scaleName(code) ? `${scaleOpt(code)}: ${scaleDef(code)}` : '';
const scaleOption = (o, sel) => `<option value="${esc(o)}" ${sel ? 'selected' : ''} title="${esc(scaleTip(o))}">${esc(scaleOpt(o))}</option>`;
const T = (id, text) => C.glossary[id] ? `<button type="button" class="term" data-term="${id}" aria-expanded="false" aria-controls="poproot">${text || esc(C.glossary[id].term)}</button>` : (text || '');
const linkify = s => esc(s).replace(/\[\[(\w+)(?:\|([^\]]+))?\]\]/g, (m, id, t) => T(id, t ? esc(t) : esc(C.glossary[id] ? C.glossary[id].term.toLowerCase() : id)));
const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

/* ---------- engagement ---------- */
/* ---------- board directions (task 3.5) ----------
   The directions AI Board Direction issues (public/shared/directions.js), read over the BOARD service binding or from a
   file in set-up. Each decision shows the directions read on it; K11 holds back a decision 1 ceiling above BD1. */
const DIRX = () => window.RAFDirections || null;
const KB = () => (DIRS() ? 'K1 to K9 and K11' : 'K1 to K9'); // the checks that must pass before the appetite is agreed
const DIRS = () => (S && S.boardDirections && S.boardDirections.file && DIRX()) ? S.boardDirections.file : null;
const fnName = row => ((S.functions || []).find(f => f.id === row) || {}).name || row;
function beyond(cellId, tier) { const d = DIRS(); if (!d) return ''; const [did, row] = cellId.split('.'); return did === 'd1' ? DIRX().beyondDirection(d, fnName(row), tier) : ''; }
function useDirections(o, source) {
  const why = DIRX() ? DIRX().directionsError(o) : 'The directions module did not load. Reload the page.';
  if (why) { toast(why); return false; }
  if (!can('setup')) { toast(blockReason('setup')); return false; }
  const from = S.boardDirections ? S.boardDirections.file.version : null;
  S.boardDirections = { source, loadedOn: today(), file: o };
  log('boardDirections', 'setup', from, `${o.version || 'loaded'} · ${o.status || ''}`.trim()); return true;
}
function directionsPanel(did) {
  const d = DIRS(); if (!d) return '';
  const list = DIRX().readOn(d, did); if (!list.length) return '';
  const row = (x) => {
    if (x.id === 'BD1') return x.areas.map(a => `<li><strong>${esc(a.name)}</strong>: ${esc(a.postureLabel)}${a.maxTier ? ' · up to ' + esc(a.maxTier) : ''}${a.condition ? ' · ' + esc(a.condition) : ''}</li>`).join('');
    if (x.id === 'BD2') return (x.lines || []).map(l => `<li>${esc(l.use)} <span class="soft">(${esc(l.scope)})</span></li>`).join('') || '<li class="soft">No red lines were set.</li>';
    if (x.id === 'BD3') return (x.events || []).map(e => `<li>${esc(e.event)} <span class="soft">· ${esc(e.timing)}${e.by ? ', brought by ' + esc(e.by) : ''}</span></li>`).join('');
    if (x.id === 'BD5') return (x.harms || []).filter(h => h.notTolerated).map(h => `<li><strong>${esc(h.harmTo)}</strong>: ${esc(h.notTolerated)}${h.threshold ? ' · ' + esc(h.threshold) : ''}</li>`).join('') || '<li class="soft">Existing thresholds.</li>';
    if (x.id === 'BD6') return [...(x.measures || []).map(m => `<li>${esc(m.measure)}${m.limit ? ' · limit ' + esc(m.limit) : ''}</li>`), ...(x.events || []).map(e => `<li>${esc(e.event)} · to ${esc(e.to)} within ${esc(e.within)}</li>`)].join('');
    return '';
  };
  return `<details class="pr about" open><summary>The board’s direction${list.length > 1 ? 's' : ''} for this decision · ${list.map(x => esc(x.id)).join(', ')}</summary><div class="about-in measure">
    <p class="small soft" style="margin:0 0 8px">From AI Board Direction, ${esc(d.company || '')} · version ${esc(d.version || '')}, ${esc(d.status === 'confirmed' ? 'confirmed by the board' : 'recorded by the chair')}${d.beingRevised ? ' · the board is revising them' : ''}. A position that goes past a direction cannot form part of the working appetite until a reason and a board revisit are recorded (check K11).</p>
    ${list.map(x => `<p class="small" style="margin:8px 0 2px"><strong>${esc(x.id)} ${esc(x.name || '')}</strong></p><ul class="small" style="margin:0 0 0 18px">${row(x)}</ul>`).join('')}</div></details>`;
}

/* ---------- the assessment register extract, v1 or v2 (tasks 3.7) ----------
   Read on decision 3 (the current state for K10) and, for v2, on decision 8 and in the board view (the measures, gaps
   by priority and overdue items). Loaded from AI Use Assessment over the ASSESSMENT service binding, or from a file. */
const EXTRACTS = ['triodian.aua.extract.v1', 'triodian.aua.extract.v2'];
function useExtract(o, source) {
  if (!o || !EXTRACTS.includes(o.schema) || !Array.isArray(o.entries)) { toast('Rejected: not a register extract (schema triodian.aua.extract.v1 or v2).'); return false; }
  if (!canEdit('d3')) { toast(blockReason('d3')); return false; }
  const cnt = {}; let max = null; o.entries.forEach(x => { if (x && x.tier && x.consequence) { const k = x.tier + '.' + x.consequence; cnt[k] = (cnt[k] || 0) + 1; } if (x && x.received && /^E\d$/.test(x.received) && (!max || x.received > max)) max = x.received; });
  const top = Object.entries(cnt).sort((p, q) => q[1] - p[1])[0]; if (top) { const [ti, co] = top[0].split('.'); S.current.commonPair = { tier: ti, consequence: co }; }
  const reg = { on: today(), entries: o.entries.length, pair: top ? top[0].replace('.', ' × ') : '', maxReceived: max };
  if (o.schema === 'triodian.aua.extract.v2') {
    const txt = (v, n) => String(v == null ? '' : v).slice(0, n);
    Object.assign(reg, { schema: o.schema, source, generated: txt(o.generated, 40),
      measures: (Array.isArray(o.measures) ? o.measures : []).slice(0, 20).filter(m => m && /^M\d{1,2}$/.test(m.ref)).map(m => { const c = C.measures.find(x => x.ref === m.ref) || {}; return { ref: m.ref, measure: c.measure || '', limit: c.limit || '', value: typeof m.value === 'number' && isFinite(m.value) ? m.value : null, basis: txt(m.basis, 400) }; }),
      gapsByPriority: Object.fromEntries(['High', 'Medium', 'Low'].map(k => [k, Math.max(0, parseInt((o.gapsByPriority || {})[k], 10) || 0)])),
      overdue: (Array.isArray(o.overdue) ? o.overdue : []).slice(0, 100).map(x => ({ entry: txt(x && x.entry, 64), item: txt(x && x.item, 200) })) });
  }
  S.current.register = reg;
  log('registerExtract', 'd3', null, o.entries.length + ' entries' + (reg.schema ? ', in-use feed v2' : ''));
  toast(reg.schema ? 'In-use feed loaded: K10 uses it, and decision 8 shows the measures.' : 'Register extract loaded. K10 uses it.');
  return true;
}
/* The measures in use now, beside the limits the schedule sets (decision 8, the board view). */
function inUseRows() {
  const r = S.current.register; if (!r || !r.measures) return [];
  return C.measures.map(m => { const x = r.measures.find(y => y.ref === m.ref); return { ref: m.ref, measure: m.measure, limit: m.limit, value: x ? x.value : null, basis: x ? x.basis : 'Not in the in-use feed' }; });
}
function inUsePanel(did) {
  const r = S.current.register; if (did !== 'd8' || !r || !r.measures) return '';
  const rows = inUseRows(), g = r.gapsByPriority || {};
  return `<details class="pr about" open><summary>In use now · from the AI Use Assessment in-use feed, ${esc(dAU(r.on))}</summary><div class="about-in measure">
    <p class="small soft" style="margin:0 0 8px">Counted from the assessment register when the feed was issued. A measure with no value cannot be counted from the register; the reason is shown. Gaps by priority: ${['High', 'Medium', 'Low'].map(k => `${k} ${g[k] || 0}`).join(' · ')}.${(r.overdue || []).length ? ` Overdue: ${r.overdue.length}.` : ''}</p>
    <div class="tw"><table class="lg"><thead><tr><th>Ref</th><th>Measure</th><th>Limit</th><th>In use now</th></tr></thead><tbody>${rows.map(x => `<tr><td class="code">${esc(x.ref)}</td><td>${esc(withLabels(x.measure, 'C'))}</td><td>${esc(x.limit || '—')}</td><td>${x.value == null ? `<span class="soft">Not counted · ${esc(x.basis)}</span>` : `<strong>${esc(String(x.value))}${x.ref === 'M6' ? '%' : ''}</strong> <span class="mini">${esc(x.basis)}</span>`}</td></tr>`).join('')}</tbody></table></div></div></details>`;
}

function blankPos() { return { value: null, condition: '', testable: false, reason: '', boardRevisit: '', proposedBy: '', recordedBy: '', owner: '', dissent: '', status: 'unset', notSetOwner: '', notSetDue: '', source: '' }; }
function newEngagement() {
  return {
    schema: 'triodian.raf.v1',
    engagement: { id: uid(), insurer: '', sectorPack: C.pack, reference: '', counselFirm: '', privilegeMarking: '', sessionDates: ['', ''], example: false, overallPosition: '', notificationHours: '', autosave: false },
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
      if (l.code === 'C5' && S.criticalOperations.length) S.criticalOperations.forEach(o => add(`d2.op.${o.id}`, { row: 'C5.' + o.id, col: 'setting', rowLabel: scaleOpt('C5') + ' · ' + (o.name || 'critical operation'), colLabel: N.Entity + '\u2019s setting', kind: 'text' }));
      else add(`d2.${l.code}`, { row: l.code, col: 'setting', rowLabel: scaleOpt(l.code), colLabel: N.Entity + '\u2019s setting', kind: 'text' });
    });
  }
  if (did === 'd3') AT.forEach(a => CO.forEach(c => add(`d3.${a}.${c}`, { row: a, col: c, rowLabel: scaleOpt(a), colLabel: scaleOpt(c), kind: 'select', options: EV })));
  if (did === 'd4') {
    D('d4').gaps.forEach(g => D('d4').bands.forEach(b => add(`d4.${g.id}.${b.id}`, { row: g.id, col: b.id, rowLabel: g.name, colLabel: withLabels(b.name), kind: 'select', options: PRI, group: 'matrix' })));
    D('d4').priorities.forEach(p => { add(`d4.time.${p.id}`, { row: p.id, col: 'time', rowLabel: p.id, colLabel: 'Time limit', kind: 'text', group: 'time' }); add(`d4.interim.${p.id}`, { row: p.id, col: 'interim', rowLabel: p.id, colLabel: 'Interim position', kind: 'text', group: 'time' }); });
  }
  if (did === 'd5') D('d5').bands.forEach(b => {
    add(`d5.${b.id}.notKnown`, { row: b.id, col: 'notKnown', rowLabel: withLabels(b.name), colLabel: 'Not-known facts allowed per entry', kind: 'text', group: 'p6' });
    add(`d5.${b.id}.f4`, { row: b.id, col: 'f4', rowLabel: withLabels(b.name), colLabel: 'F4 finding allowed to stand', kind: 'text', group: 'p6' });
    add(`d5.${b.id}.conf`, { row: b.id, col: 'conf', rowLabel: withLabels(b.name), colLabel: 'Minimum confidence', kind: 'select', options: CONF, group: 'p7' });
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
function cellLabel(id) { if (/^M\d+$/.test(id)) { const m = C.measures.find(x => x.ref === id); return 'Schedule · ' + id + (m ? ' ' + withLabels(m.measure, 'C') : ''); } const c = cellById(id); if (!c) return id; const d = D(c.did); return `Decision ${d.n} · ${c.rowLabel}${c.colLabel && c.kind !== 'number' || c.did === 'd7' ? ' · ' + c.colLabel : ''}`; }
const P = id => { const d = S.decisions[String(id).split('.')[0]]; return (d && d.cells && d.cells[id]) || null; };
function getPos(id) { const did = id.split('.')[0]; const cells = S.decisions[did].cells; if (!cells[id]) cells[id] = blankPos(); return cells[id]; }
const val = id => { const p = P(id); return p && p.status === 'set' ? p.value : null; };

/* ---------- starting positions ---------- */
function startingValue(id) {
  const parts = id.split('.'), did = parts[0];
  const prev = S.previous && S.previous.cells && S.previous.cells[id]; if (prev && prev[0] && prev[0] !== 'not set') return prev[0];
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
/* Several roles per person (development plan task 0.6). A person record holds roles (a list); older records hold one role. */
const rolesOf = p => !p ? [] : Array.isArray(p.roles) && p.roles.length ? p.roles : p.role && p.role !== 'none' ? [p.role] : [];
const rolesText = p => rolesOf(p).map(r => ROLE_NAME[r] || r).join(', ') || ROLE_NAME.none;
/* The roles the screen acts with: the signed-in person's, or in practice the chosen person's, or the chosen role. */
function actingRoles() {
  if (UI.forceRole) return [UI.role];   // the worked example is built and summarised under a fixed role
  const p = UI.personId ? person(UI.personId) : null; if (p) return rolesOf(p);
  if (!practice() && SRV.user) return rolesOf(SRV.user);
  return UI.role && UI.role !== 'none' ? [UI.role] : [];
}
const hasRole = r => actingRoles().includes(r);
const onlyRoles = list => { const rs = actingRoles(); return rs.length > 0 && rs.every(r => list.includes(r)); };
const proposerRoles = did => did === 'd2' ? ['cro','risk','independent'] : ['cro','risk'];
const roleCanPropose = did => proposerRoles(did).some(hasRole);
const activePeople = () => S.people.filter(p => p.active !== false);
const eligible = did => activePeople().filter(p => rolesOf(p).some(r => proposerRoles(did).includes(r)));
/* One gate for every editable control. target: a decision id, 'setup', 'measures', 'overall', 'challengeResponse', 'qcResponse' or 'approval'. */
/* What one role may change: the same rule as lib/core/roles.js (canRole). */
function canRole(target, role) {
  if (!role || role === 'none') return false;
  if (target === 'approval') return role === 'board';
  if (target === 'agree') return role === 'cro';
  if (role === 'board') return false;
  if (target === 'overall') return ['counsel', 'gc', 'cro'].includes(role);
  if (target === 'challengeResponse') return ['counsel', 'gc', 'cro', 'risk'].includes(role);
  if (target === 'qcResponse') return role === 'counsel' || role === 'gc';
  if (role === 'independent') return target === 'd2';
  return true;
}
/* One gate for every editable control. Any one of the acting roles that allows the change is enough. */
function can(target, role) {
  if (UI.archived) return false;
  if (target === 'setup' && SRV.user && !practice()) return !!SRV.user.isAdmin;
  return (role ? [role] : actingRoles()).some(r => canRole(target, r));
}
function blockReason(target) {
  if (target === 'setup' && SRV.user && !practice()) return 'Set-up is done by administrators.';
  if (!actingRoles().length) return 'You have no engagement role, so you can read the engagement but not change it. An administrator can give you a role.';
  if (target === 'approval') return 'Only the board record role records approval.';
  if (onlyRoles(['board'])) return 'The board record role records approval only. It does not edit anything else.';
  if (target === 'overall') return 'The overall position is written by counsel, the GC or the CRO.';
  if (target === 'challengeResponse') return 'Challenge responses and status are recorded by counsel, the GC, the CRO or the risk function.';
  if (target === 'qcResponse') return 'Responses to questions for counsel are recorded by counsel or the GC.';
  if (onlyRoles(['independent', 'board'])) return 'The independent reviewer advises on decision 2 only, including its starting data, questions and challenge.';
  return '';
}
const canEdit = did => can(did);
const editBlockReason = did => blockReason(did);
const whyLink = () => T('roleLimits', 'Why');
function pathTarget(path) {
  const k = path.split('.');
  if (k[0] === 'decisions') return k[1];
  if (k[0] === 'current') return k[1] === 'offshoring' ? 'd6' : k[1] === 'commonPair' ? 'd3' : k[1];
  if (path === 'engagement.overallPosition' || path.startsWith('engagement.boardMemo')) return 'overall';
  if (k[0] === 'challenge') return 'challengeResponse';
  if (k[0] === 'questionsForCounsel') return 'qcResponse';
  if (k[0] === 'measureOwners') return 'measures';
  return 'setup';
}
const proposerOk = (did, p) => { const x = p && p.proposedBy ? person(p.proposedBy) : null; return !!(x && rolesOf(x).some(r => proposerRoles(did).includes(r))); };
function defaultOwner(id) { /* used by the worked example only */
  const parts = id.split('.');
  if (parts[0] === 'd1') { const ap = S.people.find(p => (p.areas || []).includes(parts[1])); if (ap) return ap.id; }
  const cro = S.people.find(p => rolesOf(p).includes('cro')); return cro ? cro.id : '';
}

/* ---------- history, versioning ---------- */
function log(action, target, from, to) { S.history.push({ at: nowISO(), by: actor(), action, target, from: from === undefined ? null : from, to: to === undefined ? null : to, version: S.calibration.version }); UI.dirty = true; autosave(); }
/* The version follows the calibration set's content: compared before and after each action, raised once per action. */
let lastSig = null;
function calSig() { const cs = calibrationSet(); return JSON.stringify([cs.parameters, S.functions.map(f => [f.id, f.name]), C.locations.map(l => l.id), S.criticalOperations.map(o => [o.id, o.name]), S.decisions.d6.jurisdictions.map(j => [j.id, j.name])]); }
function versionCheck() {
  const s = calSig(), cal = S.calibration;
  if (lastSig !== null && s !== lastSig && (cal.status === 'working' || cal.status === 'approved')) {
    // The new version waits for the CRO's agreement before the board can approve it.
    const was = cal.status; cal.version += 1; cal.status = 'working'; cal.agreedBy = ''; cal.agreedById = ''; cal.agreedOn = '';
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
    if (p.condition.trim() && !p.testable) fail('K7', c.id, 'condition not marked as capable of being checked against documents');
  });
  cells.forEach(c => { const p = P(c.id); if (p && p.status === 'set') { if (!p.owner) fail('K8', c.id, 'no accountable person'); else if (!person(p.owner)) fail('K8', c.id, 'owner is no longer in the people list'); } });
  C.measures.forEach(m => { const o = (S.measureOwners || {})[m.ref]; if (!o) fail('K8', m.ref, 'measure has no accountable person'); else if (!person(o)) fail('K8', m.ref, 'measure owner is no longer in the people list'); });
  // K11 (task 3.5): a decision 1 ceiling above the board's direction for its function needs a reason and a board revisit.
  if (DIRS()) cellsFor('d1').forEach(c => { const p = P(c.id); if (!p || p.status !== 'set') return; const why = beyond(c.id, p.value); if (why && !(String(p.reason || '').trim() && String(p.boardRevisit || '').trim())) fail('K11', c.id, why + ', with no reason and board revisit recorded'); });
  else delete R.K11;
  const lim = parseFloat(S.engagement.notificationHours);
  S.decisions.d7.triggers.forEach(t => { const id = `d7.${t.ref}.time`, p = P(id); if (!p || p.status !== 'set') fail('K9', id, 'no time recorded'); else if (!isNaN(lim) && parseFloat(p.value) > lim) fail('K9', id, `${p.value} hours exceeds the ${lim}-hour notification procedure (I10)`); });
  const k10 = R.K10, pair = S.current.commonPair, curVals = Object.values(S.current.d3).filter(Boolean).concat(S.current.register && S.current.register.maxReceived ? [S.current.register.maxReceived] : []);
  if (!pair.tier || !pair.consequence || !curVals.length) { k10.state = 'cannot'; k10.result = 'Cannot run. Needs the current-state pre-fill for decision 3 and the most common pair, or an assessment register file.'; }
  else { const exp = val(`d3.${pair.tier}.${pair.consequence}`), max = curVals.reduce((m, v) => rk(EV, v) > rk(EV, m) ? v : m, 'E0');
    if (!exp) { k10.state = 'cannot'; k10.result = `Cannot run. No expectation recorded for the most common pair, ${pair.tier} × ${pair.consequence}.`; }
    else if (rk(EV, exp) > rk(EV, max)) { k10.state = 'warn'; k10.result = `The expectation for ${pair.tier} × ${pair.consequence} is ${exp}. The highest rung obtained today is ${max}. Most arrangements will show a gap from day one.`; k10.off.push({ id: `d3.${pair.tier}.${pair.consequence}`, why: 'above anything obtained today' }); }
    else { k10.result = `${exp} for ${pair.tier} × ${pair.consequence} is within what is obtained today (highest ${max}).`; } }
  k10.result = withLabels(k10.result);
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
  if (ns) return { label: 'Some not set', cls: 'b-ochre', set, ns, un, total: cells.length, qc, gate: true };
  const ids = new Set(cells.map(c => c.id)); const bad = ck.some(k => k.state === 'fail' && k.off.some(o => ids.has(o.id)));
  return bad ? { label: 'Fails checks', cls: 'b-red', set, ns, un, total: cells.length, qc, gate: true } : { label: 'Complete', cls: 'b-green', set, ns, un, total: cells.length, qc, gate: true };
}
function setupGate() {
  const hasCro = S.people.some(p => rolesOf(p).includes('cro')), hasCounsel = S.people.some(p => rolesOf(p).some(r => r === 'counsel' || r === 'gc'));
  const inp = r => { const i = S.inputs.find(x => x.ref === r); return i && (i.status === 'received' || i.status === 'notHeld'); };
  const items = [ ['At least one CRO recorded', hasCro], ['At least one counsel person recorded', hasCounsel], ['Function list confirmed', S.functionsConfirmed], ['I1 marked received or not held', inp('I1')], ['I4 marked received or not held', inp('I4')] ];
  return { ok: items.every(i => i[1]), items };
}

/* ---------- calibration ---------- */
function statusMark() { const c = S.calibration, f = c.status !== 'default' && blocking(runChecks()).length ? ' · checks failing' : '';
  if (c.status === 'approved') return `Approved appetite, version ${c.version}, ${dAU(c.approvedOn)} · minute ${c.minuteRef} · approved by ${c.approvedBy || '—'}${c.agreedBy ? ' · agreed by ' + c.agreedBy + ', ' + dAU(c.agreedOn) : ''}${f}`;
  if (c.status === 'working') return `Working appetite, version ${c.version}${c.agreedOn ? ', agreed ' + dAU(c.agreedOn) + ' by ' + c.agreedBy : ', changed since the last agreement and waiting for the CRO'}${f}`;
  return 'Uncalibrated'; }
/* Plain status for the working screens (outputs keep the framework's terms). */
function statusPlain() { const c = S.calibration;
  if (c.status === 'approved') return `Approved by ${c.approvedBy || 'the board'}, ${dAU(c.approvedOn)} · version ${c.version}`;
  if (c.status === 'working') return c.agreedById ? `Working appetite agreed${c.agreedOn ? ' ' + dAU(c.agreedOn) : ''} · version ${c.version}` : `Version ${c.version} changed since the last agreement · waiting for the CRO to agree it`;
  return 'Working appetite not yet agreed'; }
const exportBlocked = () => S.calibration.status !== 'default' && blocking(runChecks()).length > 0;
/* ---------- versions: what each agreed or approved version said, and what has changed since ---------- */
function posText(id) { const p = P(id); if (!p || p.status === 'unset') return ''; if (p.status === 'notSet') return 'not set'; return p.value == null ? '' : String(p.value); }
function snapshotNow() {
  const cells = {};
  C.decisions.forEach(d => cellsFor(d.id).forEach(c => { const p = P(c.id), t = posText(c.id); if (t || (p && p.condition)) cells[c.id] = [t, (p && p.condition) || '', (p && p.owner) || '', cellLabel(c.id)]; }));
  return { at: nowISO(), cells, overall: S.engagement.overallPosition || '' };
}
const issuedSnaps = () => (S.calibration.issued || []).map((x, i) => ({ i, x })).filter(o => o.x.snapshot);
const snapLabel = x => `Version ${x.version} · ${x.status === 'approved' ? 'approved' : 'agreed'} ${dDoc(x.on)}`;
/* Rows that differ between two snapshots: [label, before, after, id]. */
function snapDiff(a, b) {
  const ids = [...new Set([...Object.keys(a.cells || {}), ...Object.keys(b.cells || {})])], rows = [];
  const show = v => v ? (v[0] || '—') + (v[1] ? ` (${v[1]})` : '') : '—';
  ids.forEach(id => { const x = (a.cells || {})[id], y = (b.cells || {})[id]; if (show(x) !== show(y)) rows.push([(y || x)[3] || cellLabel(id), show(x), show(y), id]); });
  if ((a.overall || '') !== (b.overall || '')) rows.push(['Overall position', a.overall || '—', b.overall || '—', '']);
  const order = id => { const m = /^d(\d)/.exec(id || ''); return m ? +m[1] : 9; };
  return rows.sort((p, q) => order(p[3]) - order(q[3]));
}
/* The last version the board approved, and what has changed since (for the redline in the outputs). */
function sinceApproved() {
  const ap = issuedSnaps().filter(o => o.x.status === 'approved').pop();
  if (!ap || S.calibration.version <= ap.x.version && S.calibration.status === 'approved') return null;
  const rows = snapDiff(ap.x.snapshot, snapshotNow());
  return rows.length ? { from: ap.x, rows } : null;
}
function lastChange(id, sinceISO) { const h = S.history.filter(x => x.target === id && (!sinceISO || x.at > sinceISO)).pop(); return h ? `${h.by || ''}, ${fmtLocal(h.at)}` : ''; }
function compareCard() {
  const snaps = issuedSnaps();
  if (!snaps.length) return `<section class="card" style="margin-bottom:20px"><h2 class="sh">Compare versions</h2><p class="small soft" style="margin:6px 0 0">Each time the CRO agrees the working appetite or the board approves it, the positions are kept as that version. Once there is one, you can compare it with any later version or with the positions now.</p></section>`;
  const from = UI.cmpFrom != null && snaps.some(o => o.i === UI.cmpFrom) ? UI.cmpFrom : snaps[snaps.length - 1].i, to = UI.cmpTo == null ? 'now' : UI.cmpTo;
  const A = S.calibration.issued[from], B = to === 'now' ? { snapshot: snapshotNow() } : S.calibration.issued[to];
  const rows = snapDiff(A.snapshot, (B || {}).snapshot || snapshotNow());
  const opt = (sel, incNow) => snaps.map(o => `<option value="${o.i}" ${sel === o.i ? 'selected' : ''}>${esc(snapLabel(o.x))}</option>`).join('') + (incNow ? `<option value="now" ${sel === 'now' ? 'selected' : ''}>The positions now</option>` : '');
  return `<section class="card" style="margin-bottom:20px"><div class="row between"><h2 class="sh" style="margin:0">Compare versions</h2><span class="small soft">${rows.length ? rows.length + ' ' + (rows.length === 1 ? 'change' : 'changes') : 'No changes'}</span></div>
    <div class="row" style="margin:12px 0"><label class="f" style="flex-direction:row;align-items:center;gap:8px"><span>From</span><select class="in" style="width:auto" data-act="cmp" data-k="from">${opt(from, false)}</select></label><label class="f" style="flex-direction:row;align-items:center;gap:8px"><span>to</span><select class="in" style="width:auto" data-act="cmp" data-k="to">${opt(to, true)}</select></label></div>
    ${rows.length ? `<div class="tw"><table class="lg redline"><thead><tr><th>Position</th><th>Was</th><th>Now</th><th>Last changed</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r[3] ? `<button class="lnk" data-act="gotoCell" data-cell="${esc(r[3])}">${esc(withLabels(r[0], 'C'))}</button>` : esc(r[0])}</td><td><del>${esc(withLabels(r[1]))}</del></td><td><ins>${esc(withLabels(r[2]))}</ins></td><td class="small soft">${esc(r[3] ? lastChange(r[3], A.snapshot.at) : '')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small soft" style="margin:0">The two are the same.</p>'}
  </section>`;
}
function agreeWorking() {
  const who = me(); if (!who || !rolesOf(who).includes('cro')) return toast((practice() ? 'Choose the CRO under "Acting as" in the practice bar' : 'Only the CRO can agree the working appetite. Sign in as the CRO') + '.');
  if (blocking(runChecks()).length) return toast('Checks ' + KB() + ' must pass first.');
  if (S.calibration.status !== 'default' && S.calibration.agreedById) return toast('Version ' + S.calibration.version + ' is already agreed.');
  const c = S.calibration, from = c.status + ' v' + c.version; c.version = Math.max(1, c.version + (c.status === 'default' ? 1 : 0)); if (c.status !== 'default' && c.version === 0) c.version = 1;
  c.status = 'working'; c.agreedBy = who.name; c.agreedById = who.id; c.agreedOn = today();
  c.issued.push({ version: c.version, status: 'working', on: c.agreedOn, by: c.agreedBy, snapshot: snapshotNow() });
  c.issued[c.issued.length - 1].set = calibrationSet();
  log('agreeWorking', 'calibration', from, 'working v' + c.version); render(); toast('Working appetite agreed. Version ' + c.version + '.');
}
function recordApproval(date, minute, by) {
  if (!hasRole('board')) return toast('Only the board record role marks approval.');
  if (S.calibration.status !== 'working' || !S.calibration.agreedById) return toast('The CRO must agree this version first.');
  if (!date || !minute || !by) { UI.err.approval = 'Approval needs a date, a minute reference and who approved it.'; render(); return; }
  const c = S.calibration; c.status = 'approved'; c.approvedOn = date; c.minuteRef = minute; c.approvedBy = by; delete UI.err.approval;
  c.issued.push({ version: c.version, status: 'approved', on: date, minuteRef: minute, by, snapshot: snapshotNow() });
  c.issued[c.issued.length - 1].set = calibrationSet();
  log('approve', 'calibration', 'working v' + c.version, 'approved v' + c.version + ' · ' + minute); render(); toast('Board approval recorded.');
}

/* ---------- shell ---------- */
function badge(label, cls) { return `<span class="badge ${cls}">${esc(label)}</span>`; }
function gate(ok, text) { return `<span class="gate ${ok ? 'ok' : 'no'}" role="status"><i></i>${esc(text)}</span>`; }
function calBadge() { const s = S.calibration.status; if (s !== 'default' && blocking(runChecks()).length) return badge(`${s === 'approved' ? 'Approved' : 'Working'}, version ${S.calibration.version}, checks failing`, 'b-red'); return badge(s === 'default' ? 'Not yet agreed' : s === 'working' ? 'Working · version ' + S.calibration.version : 'Approved · version ' + S.calibration.version, s === 'approved' ? 'b-green' : s === 'working' ? 'b-ochre' : 'b-grey'); }
function roleSelect(id) { const cur = UI.personId ? 'p:' + UI.personId : 'r:' + UI.role;
  return `<select id="${id}" data-act="role" aria-label="Acting as">${S.people.length ? `<optgroup label="People">${S.people.map(p => `<option value="p:${esc(p.id)}" ${cur === 'p:' + p.id ? 'selected' : ''}>${esc(p.name || 'Unnamed')} · ${esc(rolesText(p))}</option>`).join('')}</optgroup>` : ''}<optgroup label="Role only">${C.roles.map(r => `<option value="r:${r.id}" ${cur === 'r:' + r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</optgroup></select>`; }
const stepOf = s => s === 'overview' || /^d\d$/.test(s) ? 'decisions' : s;
/* Privilege marking and the appetite's status, shown under the header on every engagement screen. */
function docband() {
  if (!S) return '';
  const e = S.engagement, admin = SRV.user && SRV.user.isAdmin && !practice();
  const priv = e.privilegeMarking ? `<span class="priv" title="Privilege marking · printed as the first line of every output">${esc(e.privilegeMarking)}</span>`
    : `<span class="priv none">No privilege marking set.${admin ? ' <a href="/admin/#set-up">Set it in Admin</a>' : ' Counsel directs the marking.'}</span>`;
  const right = UI.archived ? `<span class="stat pr-ctl"><span class="pr-tag">Earlier review · ${esc(UI.archived.label)} · read only</span><button class="lnk" data-act="leaveArchive">Back to the current review</button></span>` : e.example ? `<span class="stat pr-ctl"><span class="pr-tag">Worked example</span><label class="chip pchip"><span>Acting as</span>${roleSelect('role-hdr')}</label></span>`
    : `<span class="stat">${e.insurer ? `<strong>${esc(e.insurer)}</strong>${e.reference ? ' · ' + esc(e.reference) : ''}` : ''}</span>`;
  return `<div class="docband ${e.example || UI.archived ? 'practice' : ''}"><div class="docband-in"><span style="display:inline-flex;align-items:center;gap:14px;flex-wrap:wrap">${priv}${TriodianBrand.chip(e.practitioner)}</span>${right}</div></div>`;
}
function header(ck) {
  const b = bp(), fails = blocking(ck).length, cur = stepOf(UI.screen);
  const nAct = S && SRV.user || practice() ? myActions(ck).length : 0;
  const steps = [['actions', 'My actions' + (nAct ? ` <span class="navcount">${nAct}</span>` : '')],['decisions','Decisions'],['checks','Checks'],['challenge','Challenge'],['outputs','Outputs']];
  return `<header class="hdr"><div class="hdr-in">
    <button class="brand" data-act="go" data-to="overview" aria-label="Triodian · go to decisions overview"><img class="logo" src="/triodian-logo.svg" alt="Triodian" height="26" style="height:26px;width:auto;display:block"></button>
    ${b !== 'phone' ? '<span class="vrule" aria-hidden="true"></span>' : ''}
    <span class="apptitle">AI Risk Appetite</span>
    ${b === 'desk' ? `<nav class="steps" aria-label="Steps">${steps.map(s => `<button data-act="go" data-to="${s[0] === 'decisions' ? 'overview' : s[0]}" ${cur === s[0] ? 'aria-current="page"' : ''}>${s[1]}</button>`).join('')}</nav>` : ''}
    <div class="hdr-r">
      ${saveChip()}
      ${b !== 'phone' ? `<button class="checkcount ${fails ? 'b-red' : 'b-green'}" data-act="go" data-to="checks">${b === 'phone' ? (fails ? fails + ' failing' : 'K ✓') : (fails ? fails + (fails === 1 ? ' check failing' : ' checks failing') : 'checks pass')}</button>` : ''}
      ${avatar()}
      <button class="iconbtn" data-act="drawer" aria-label="Menu" aria-expanded="${UI.drawer}">☰</button>
    </div></div>${docband()}</header>
    ${S && S.engagement.example ? '<div class="examplebar">Worked example: a fictional general insurer, Corvane General, for practice only. Nothing is saved. <button class="lnk" data-act="leavePractice">Leave the worked example</button></div>' : ''}`;
}
function drawer() {
  if (!UI.drawer) return '';
  const it = (to, label, extra) => `<button class="item" data-act="go" data-to="${to}" ${UI.screen === to ? 'aria-current="page"' : ''}>${label}${extra || ''}</button>`;
  return `<div class="drawer-bg" data-act="drawer"></div><aside class="drawer" role="dialog" aria-label="Menu">
    <div class="row between"><strong>Menu</strong><button class="iconbtn" data-act="drawer" aria-label="Close menu">✕</button></div>
    <div class="grp">Steps</div>${it('overview','Decisions overview')}
    ${C.decisions.map(d => it(d.id, `<span class="mono soft" style="width:22px">${d.n}</span>${esc(d.name)}`)).join('')}
    ${it('checks','Checks')}${it('challenge','Challenge')}${it('outputs','Outputs')}
    ${practice() ? `<div class="grp">Acting as · practice</div><label class="chip" style="width:100%"><span aria-hidden="true">⌾</span>${roleSelect('role-drw')}</label>` : ''}
    ${(SRV.archives || []).length ? `<div class="grp">Earlier reviews</div>${SRV.archives.map(a => `<button class="item" data-act="openArchive" data-id="${esc(a.id)}">${esc(a.label)}<span class="small soft" style="margin-left:auto">read only</span></button>`).join('')}` : ''}
    <div class="grp">Engagement</div>
    <button class="item" data-act="guide" data-g="setup" data-explicit="1">How an engagement runs</button>
    <div class="grp">Practice</div>
    ${practice() ? '<button class="item" data-act="leavePractice">Leave the worked example</button>' : '<button class="item" data-act="example">Open the worked example</button>'}
    <p class="small soft" style="padding:0 10px">The worked example is fictional and runs in this browser only. Nothing in it is saved.</p>
    ${SRV.on ? '' : '<p class="small soft" style="padding:4px 10px">The server is not reachable.</p><button class="item" data-act="save">Download a copy to keep your work (.json)</button>'}
    <div class="grp">Apps</div>
    <a class="item" href="${SRV.site ? 'https://obligations-atlas-test.triodian.com/?suite=1' : 'https://obligations-atlas.triodian.com/?suite=1'}" style="text-decoration:none"><span class="appic" style="background:#E3E9EF;color:var(--navy)">OA</span><span>AI Obligations Atlas<br><span class="small soft">Obligations by jurisdiction, tier and use case</span></span></a>
    <a class="item" href="${SRV.site ? 'https://board-direction-test.triodian.com/?suite=1' : 'https://board-direction.triodian.com/?suite=1'}" style="text-decoration:none"><span class="appic" style="background:var(--green-bg);color:var(--green)">BD</span><span>AI Board Direction<br><span class="small soft">The board’s direction on AI: where to use it and what to rule out</span></span></a>
    <div class="item" aria-current="page"><span class="appic" style="background:var(--aubergine-bg);color:var(--aubergine)">RA</span><span>AI Risk Appetite<br><span class="small soft">Board positions and calibration set</span></span><span class="badge b-green" style="margin-left:auto">now</span></div>
    <a class="item" href="${SRV.site ? 'https://use-assessment-test.triodian.com/?suite=1' : 'https://use-assessment.triodian.com/?suite=1'}" style="text-decoration:none"><span class="appic" style="background:#E3E9EF;color:var(--navy)">UA</span><span>AI Use Assessment<br><span class="small soft">Register, tests and findings; reads the calibration set</span></span></a>
    <a class="item" href="${SRV.site ? 'https://confidentiality-test.triodian.com/' : 'https://confidentiality.triodian.com/'}" style="text-decoration:none"><span class="appic" style="background:#F1E6DD;color:#8A5A3B">CE</span><span>AI Confidentiality Exposure Assessment<br><span class="small soft">For unregulated entities: where deal information can reach an external AI model, for one transaction</span></span></a>
  </aside>`;
}
function footer() {
  return `<footer class="ft"><div class="wrap">
    <div class="ftrow"><span class="row" style="gap:8px;color:var(--aubergine)"><img class="logo" src="/triodian-logo.svg" alt="Triodian" height="20" style="height:20px;width:auto;display:block"><span class="mono soft">RAF-01 · framework ${esc(C.frameworkDate)}</span></span>
    <span class="row"><a class="lnk" href="/user-guide/">User guide</a><button class="lnk" data-act="go" data-to="reference">Reference</button><span class="mono">${esc(statusPlain())}</span></span></div>
  </div></footer>`;
}
/* "Don't show the introduction again" is a per-browser convenience. */
const INTRO_KEY = 'raf.hideIntro';
function introHidden() { try { return localStorage.getItem(INTRO_KEY) === '1'; } catch (e) { return false; } }
function setIntroHidden(v) { try { if (v) localStorage.setItem(INTRO_KEY, '1'); else localStorage.removeItem(INTRO_KEY); } catch (e) {} }
function entry() {
  if (UI.guide) return guideOverlay();
  const quick = introHidden();
  const u = SRV.user;
  let acts = '', note = '';
  const opt = (attrs, title, text) => `<${attrs.startsWith('href') ? 'a' : 'button'} class="act" ${attrs} ${attrs.startsWith('href') ? 'style="text-decoration:none"' : ''}><span><strong>${title}</strong><br><span class="small soft">${text}</span></span><span class="act-go" aria-hidden="true"></span></${attrs.startsWith('href') ? 'a' : 'button'}>`;
  const practice = opt('data-act="example"', 'Open the worked example', 'A fictional general insurer, part-way through the second session. Nothing you do there is saved.');
  if (!SRV.checked) note = 'Connecting…';
  else if (SRV.code === 'no_access') note = `${esc(SRV.reason)} <a href="/auth/logout">Sign out</a>`;
  else if (!SRV.on) { note = `The server could not be reached (${esc(SRV.reason)}). You can still use the worked example.`; acts = practice; }
  else if (!SRV.exists) {
    if (u && u.isAdmin) { note = 'No engagement has been set up yet.'; acts = opt(quick ? 'href="/admin/#set-up"' : 'data-act="guide" data-g="setup"', 'Set up the engagement', 'Record the engagement details, people, functions, critical operations and inputs.') + practice; }
    else { note = 'The engagement has not been set up yet. An administrator will set it up; you can then open it here.'; acts = practice + (quick ? '' : `<p class="small" style="margin:6px 0 0"><button class="lnk" data-act="guide" data-g="setup">How an engagement runs</button></p>`); }
  } else note = 'Opening the engagement…';
  const who = u ? `<div class="entry-foot"><span>Signed in as <strong>${esc(u.name || u.email)}</strong>${rolesOf(u).length ? ', ' + esc(rolesText(u)) : ''}</span><span class="row" style="gap:14px">${u.isAdmin ? '<a href="/admin/#set-up">Admin</a>' : ''}<a href="/user-guide/">User guide</a><a href="/profile/">Profile</a><a href="/auth/logout">Sign out</a></span></div>` : '';
  return `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="entry-h"><div class="entry">
    <div class="row" style="gap:10px;color:var(--aubergine);margin-bottom:26px"><img class="logo" src="/triodian-logo.svg" alt="Triodian" height="30" style="height:30px;width:auto;display:block"><span class="vrule"></span><span style="font-weight:600;color:var(--ink)">AI Risk Appetite</span></div>
    ${quick ? '<h1 id="entry-h" class="sr-only">AI Risk Appetite</h1>' : `<h1 id="entry-h" class="h1">The board’s AI risk appetite</h1>
    <p class="sub" style="font-size:18px">Record the ${N.entity}’s positions on how much authority AI may hold, what failures it will tolerate and what evidence it expects. Test them for consistency, and produce the appetite statement for board approval and the calibration set.</p>`}
    ${note ? `<p class="entry-note">${note}</p>` : ''}
    ${acts ? `<div class="acts">${acts}</div>` : ''}
    ${acts && !quick ? '<label class="entry-skip"><input type="checkbox" data-act="hideIntro"> Don’t show this introduction again</label>' : ''}
    ${who}
  </div></div>`;
}

/* ---------- guides shown after choosing set-up or practice ---------- */
const STAGES = [
  ['Session 1: decisions 1 to 3', 'External counsel leads the session and Triodian records it. The CRO, General Counsel, head of operational risk, AI governance lead and the owners of the functions in scope work through the first three decisions: the authority AI may hold in each function; the thresholds at which a failure counts as a financial loss, harm to ${N.customers} or disruption to a critical operation; and the evidence the ${N.entity} expects for each combination of authority and consequence. Each decision starts from the ${N.entity}’s current position. The independent reviewer attends for decision 2 only.'],
  ['Session 2: decisions 4 to 8', 'The same group, joined by procurement or vendor management, works through how long an evidence shortfall may continue, how much may remain unknown about AI in the supply chain, where AI may operate and how much may depend on one platform, the events that must be reported and how quickly, and what brings an arrangement back for approval. The session 1 positions are then reviewed in light of these decisions.'],
  ['Checks and challenge', 'Ten consistency checks run after every change. Failed checks go back to the CRO, and checks ' + KB() + ' must pass before the appetite can be agreed. The second line and each accountable person review the positions in their area. Questions about what the ${N.entity} is legally obliged to do are recorded for counsel rather than settled in the session, and counsel answers them.'],
  ['Agreement and approval', 'The CRO agrees the working appetite, which becomes version 1 of the calibration set the AI Use Assessment reads. Counsel drafts the AI risk appetite statement in a form the board can approve, and the CRO recommends it to the board or its risk committee. When the board approves it, the date, minute reference and approving body are recorded.'],
];
function exampleSummary() {
  const X = buildExample(), old = S, oldRole = UI.role, oldForce = UI.forceRole; S = X; UI.role = 'triodian'; UI.forceRole = true;
  try {
    const ck = runChecks(), failing = blocking(ck);
    const decs = C.decisions.map(d => ({ d, st: decisionStatus(d.id, ck) }));
    return { X, ck, failing, decs, people: X.people.length, inputs: X.inputs.filter(i => i.status === 'received').length,
      chOpen: X.challenge.filter(c => c.status === 'open').length, chAll: X.challenge.length,
      qcOpen: X.questionsForCounsel.filter(q => q.status !== 'answered').length, qcAll: X.questionsForCounsel.length };
  } finally { S = old; UI.role = oldRole; UI.forceRole = oldForce; }
}
function guideOverlay() {
  const g = UI.guide, close = `<span class="row" style="gap:16px"><button class="btn" data-act="guideBack">Back</button><a href="/user-guide/${g === 'setup' ? '#fit' : '#start'}">Read the full user guide</a></span>`;
  let body;
  if (g === 'setup') {
    const admin = SRV.user && SRV.user.isAdmin;
    body = `<h1 id="entry-h" class="h1">How an engagement runs</h1>
    <p class="sub" style="font-size:18px">External counsel leads the engagement and Triodian records it. The positions come from the ${N.entity}, and the board approves the result. After set-up, the engagement runs in four stages.</p>
    <ol class="stages">${STAGES.map(([t, x]) => `<li><strong>${t}</strong><p>${x}</p></li>`).join('')}</ol>
    <div class="guide-box"><h2 class="sh">Who proposes positions</h2><p style="margin:0">Positions come from the ${N.entity}. On decisions 1 and 3, only the CRO or the ${N.entity}’s risk function may propose a position; on decision 2, the independent reviewer may also propose. Counsel and Triodian explain, answer questions and record; neither proposes or recommends a position. Every position is recorded with who proposed it, an accountable owner and any dissent.</p></div>
    <div class="guide-box"><h2 class="sh">The AI Use Assessment</h2><p style="margin:0">Triodian’s AI Use Assessment runs alongside, from the same week. Its register extract is loaded on decision 3 as the evidence the ${N.entity} holds today, and its findings inform decisions 1, 4, 5 and 6. Once the CRO agrees the working appetite, the calibration set goes back to the assessment. <a href="/user-guide/#informs">How the assessment informs the appetite</a></p></div>
    <p class="small soft">Changes are saved as they are made. Each change is recorded in the engagement history with the name and role of the person who made it.</p>
    <div class="row between guide-acts">${close}${admin ? '<a class="btn primary" href="/admin/#set-up" style="text-decoration:none">Continue to set-up</a>' : ''}</div>`;
  } else {
    const x = exampleSummary(), e = x.X.engagement, done = x.decs.filter(o => o.st.gate), open = x.decs.filter(o => !o.st.gate);
    body = `<h1 id="entry-h" class="h1">The worked example</h1>
    <p class="sub" style="font-size:18px">${esc(e.insurer.replace(/\s*\(fictional\)/i, ''))} is a fictional general insurer. The example shows an engagement part-way through the second session, so you can see each screen with realistic content.</p>
    <h2 class="sh" style="margin-top:22px">What has been done</h2>
    <ul class="done">
      <li><strong>Set-up is complete.</strong> ${cap(numW(x.people))} people are recorded, including the CRO, three members of the ${N.entity} risk function, counsel from ${esc(e.counselFirm)}, the Triodian recorder and an independent reviewer. ${cap(numW(x.X.criticalOperations.length))} critical operations are recorded with their tolerance levels, and ${x.inputs === 11 ? 'all 11 inputs are' : x.inputs + ' of the 11 inputs are'} marked as received.</li>
      <li><strong>Session 1 is complete</strong> (dated ${esc(fmtDate(e.sessionDates[0]))}), and <strong>session 2 is under way</strong> (dated ${esc(fmtDate(e.sessionDates[1]))}).</li>
      <li><strong>Positions are recorded</strong> on all eight decisions. ${done.length ? `Decision${done.length === 1 ? '' : 's'} ${listN(done.map(o => o.d.n))} ${done.length === 1 ? 'is' : 'are'} complete.` : ''} ${open.length ? `Decision${open.length === 1 ? '' : 's'} ${listN(open.map(o => o.d.n))} still ${open.length === 1 ? 'has' : 'have'} gaps.` : ''}</li>
      <li><strong>Challenge has started.</strong> ${cap(numW(x.chAll))} challenge point${x.chAll === 1 ? ' has' : 's have'} been raised (${numW(x.chOpen)} still open), and ${numW(x.qcAll)} question${x.qcAll === 1 ? ' has' : 's have'} been recorded for counsel (${numW(x.qcOpen)} awaiting an answer).</li>
    </ul>
    <h2 class="sh" style="margin-top:18px">What is left to do</h2>
    <ul class="todo">
      ${x.failing.length ? `<li>${cap(numW(x.failing.length))} of the nine blocking checks fail: ${esc(listN(x.failing.map(k => k.id + ' (' + k.name + ')')))}. On the Checks page, each failure links to the position concerned.</li>` : '<li>All blocking checks pass.</li>'}
      <li>The CRO has not yet agreed the working appetite, so the calibration set is still uncalibrated.</li>
      <li>The board has not yet approved the appetite.</li>
    </ul>
    <div class="guide-box"><h2 class="sh">In practice mode</h2><ul>
      <li>You can act as any role, using “Acting as” in the yellow bar, to see what each role can and cannot change.</li>
      <li>Nothing you do is saved. You can leave practice mode at any time from the same bar.</li></ul></div>
    <div class="row between guide-acts">${close}<button class="btn primary" data-act="example">Open the worked example</button></div>`;
  }
  return `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="entry-h"><div class="entry guide">
    <div class="row" style="gap:10px;color:var(--aubergine);margin-bottom:22px"><img class="logo" src="/triodian-logo.svg" alt="Triodian" height="30" style="height:30px;width:auto;display:block"><span class="vrule"></span><span style="font-weight:600;color:var(--ink)">AI Risk Appetite</span></div>
    ${body}</div></div>`;
}
const numW = n => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n);
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
const listN = a => a.length < 2 ? String(a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const fmtDate = d => { if (!d) return 'a date not recorded'; const x = new Date(d + 'T00:00:00'); return isNaN(x) ? d : x.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }); };
function opening(eyebrow, h1, sub) { return `<div class="opening"><div class="eyebrow">${eyebrow}</div><h1 class="h1">${h1}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>`; }
function seqNav() {
  const i = SEQ.indexOf(UI.screen); if (i < 0) return { prev: null, next: null };
  return { prev: SEQ[i - 1] || null, next: SEQ[i + 1] || null };
}
const screenName = s => ({ actions: 'My actions', setup: 'Set-up', overview: 'Decisions', checks: 'Checks', challenge: 'Challenge', outputs: 'Outputs', reference: 'Reference' }[s] || (D(s) ? 'Decision ' + D(s).n : s));
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
  const people = S.people.length ? `<div class="tw"><table class="lg ppl"><thead><tr><th class="who">Person and role</th>${S.functions.map(f => `<th class="fn" scope="col">${esc(f.name)}</th>`).join('')}</tr></thead><tbody>
    ${S.people.map((p, i) => `<tr class="${p.active === false ? 'off' : ''}"><th scope="row" class="who"><strong>${esc(p.name || 'Unnamed')}</strong>${p.active === false ? ' <span class="badge b-grey">inactive</span>' : ''}<div class="small soft">${esc(rolesText(p))}${p.organisation ? ' · ' + esc(p.organisation) : ''}</div></th>
      ${S.functions.map(f => `<td class="tick"><input type="checkbox" id="area-${i}-${sid(f.id)}" data-area="${i}" value="${esc(f.id)}" ${(p.areas || []).includes(f.id) ? 'checked' : ''} aria-label="${esc(p.name)} accountable for ${esc(f.name)}"></td>`).join('')}</tr>`).join('')}
    </tbody></table></div><p class="mini" style="margin-top:8px">Tick the functions each person is ${T('ap', 'accountable')} for.</p>` : '';
  const inputs = S.inputs.map((x, i) => { const c = C.inputs[i]; return b === 'phone'
    ? `<div class="panel2" style="padding:12px 14px"><div class="row" style="gap:8px"><span class="mono">${esc(x.ref)}</span><strong class="small">${esc(c.name)}</strong></div><div class="mini" style="margin:4px 0 8px">Used in: ${esc(c.usedIn)}</div><div class="fgrid">${fld('Status', `inputs.${i}.status`, x.status, { select: [['','Not marked'],['received','Received'],['notHeld','Not held'],['notRequested','Not requested']] })}${fld('Date', `inputs.${i}.date`, x.date, { type: 'date' })}${fld('Note', `inputs.${i}.note`, x.note)}</div></div>`
    : `<tr><td class="code">${esc(x.ref)}</td><td>${esc(c.name)}<div class="mini">${esc(c.usedIn)}</div></td><td><select class="in" id="in-${i}-status" data-path="inputs.${i}.status" aria-label="${esc(x.ref)} status">${[['','—'],['received','Received'],['notHeld','Not held'],['notRequested','Not requested']].map(o => `<option value="${o[0]}" ${x.status === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></td><td><input class="in" type="date" id="in-${i}-date" data-path="inputs.${i}.date" value="${esc(x.date)}" aria-label="${esc(x.ref)} date"></td><td><input class="in" id="in-${i}-note" data-path="inputs.${i}.note" value="${esc(x.note)}" aria-label="${esc(x.ref)} note"></td></tr>`; }).join('');
  return `${opening('Admin · set-up', 'Set up the engagement', 'Who takes part, which functions are in scope, and what the ' + N.entity + ' has already decided.')}
  ${ro ? `<p class="err">${esc(blockReason('setup'))} ${whyLink()}</p>` : ''}
  <fieldset ${ro ? 'disabled' : ''} style="border:0;padding:0;margin:0" class="stack">
  <section class="card"><h2 class="sh">1 · Engagement details</h2><p class="small soft" style="margin:4px 0 14px">Who the engagement is for, when the two sessions are held, and the privilege marking counsel directs.</p><div class="fgrid">
    ${fld(N.Entity, 'engagement.insurer', e.insurer)}${fld('Sector pack', 'engagement.sectorPack', packId(), { select: TriodianPacks.list(BASE).map(p => [p.id, p.name]), disabled: !can('setup') || packLocked() })}${fld('Engagement reference', 'engagement.reference', e.reference)}${fld('Counsel firm', 'engagement.counselFirm', e.counselFirm)}
    ${fld('Session 1 date', 'engagement.sessionDates.0', e.sessionDates[0], { type: 'date' })}${fld('Session 2 date', 'engagement.sessionDates.1', e.sessionDates[1], { type: 'date' })}
  </div><p class="mini" style="margin-top:8px">The sector pack sets the words for the ${esc(N.entity)} and its ${esc(N.customers)}, the business functions and the inputs requested. ${packLocked() ? 'It is now fixed, because a position has been recorded.' : 'It is fixed once the first position is recorded.'}</p><div style="margin-top:14px">${fld('Privilege marking · as counsel directs', 'engagement.privilegeMarking', e.privilegeMarking, { ph: 'Printed as the first line of every output' })}</div></section>
  <section class="card"><h2 class="sh">Practitioner</h2><p class="small soft" style="margin:4px 0 14px">The GC’s or advisory firm’s name, a line under it and a logo. They appear in the header and above the privilege marking on every Word and PDF output.</p><div class="fgrid">
    ${fld('Firm', 'engagement.practitioner.firm', (e.practitioner || {}).firm || '')}${fld('Line under the name', 'engagement.practitioner.line', (e.practitioner || {}).line || '', { ph: 'Prepared by [firm] using the Triodian method' })}
  </div><div style="margin-top:14px">${TriodianBrand.logoControl(e.practitioner, can(pathTarget('engagement.practitioner.logo')) ? '' : 'disabled')}</div></section>
  <section class="card"><div class="row between"><h2 class="sh" style="margin:0">2 · People taking part</h2>${!practice() && SRV.user && SRV.user.isAdmin ? '<button class="btn sm" data-act="go" data-to="users">Manage users</button>' : ''}</div>
    <p class="small soft" style="margin:8px 0 14px">Every proposer, owner and approver is chosen from this list. On decisions 1 and 3, only the CRO or the ${N.entity} risk function can propose a position. ${practice() ? 'In practice mode the people are fictional.' : 'People and their roles are managed by administrators.'}</p>
    ${people || `<p class="soft small">No one with an engagement role yet.${!practice() && SRV.user && SRV.user.isAdmin ? ' Add users under <button class="lnk" data-act="go" data-to="users">Users</button>.' : ' An administrator adds people.'}</p>`}</section>
  <section class="card"><h2 class="sh">3 · Functions and ${T('critOp', 'critical operations')} in scope</h2><p class="small soft" style="margin:4px 0 14px">The business functions the appetite covers (decision 1 sets a ceiling for each), and the critical operations whose approved tolerance levels decision 2 uses.</p>
    <div class="grid2"><div><div class="mini" style="margin-bottom:6px">Functions (the framework’s starting list, which can be edited)</div>
      <div class="stack" style="gap:6px">${S.functions.map((f, i) => `<div class="row" style="flex-wrap:nowrap"><input class="in" id="fn-${i}" data-path="functions.${i}.name" value="${esc(f.name)}" aria-label="Function ${i + 1}"><button class="btn sm ghost" data-act="rmFn" data-i="${i}" aria-label="Remove ${esc(f.name)}">✕</button></div>`).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="btn sm" data-act="addFn">Add function</button><label class="cb"><input type="checkbox" data-path="functionsConfirmed" ${S.functionsConfirmed ? 'checked' : ''}> Function list confirmed</label></div></div>
    <div><div class="mini" style="margin-bottom:6px">Critical operations, from input I4, with their approved ${T('tolerance', 'tolerance levels')}</div>
      <div class="stack" style="gap:10px">${S.criticalOperations.map((o, i) => `<div class="panel2" style="padding:12px"><div class="fgrid">${fld('Operation', `criticalOperations.${i}.name`, o.name)}${fld('Tolerance', `criticalOperations.${i}.tolerance`, o.tolerance)}${fld('Source document', `criticalOperations.${i}.source`, o.source)}</div><div class="row" style="justify-content:flex-end"><button class="btn sm ghost" data-act="rmOp" data-i="${i}">Remove</button></div></div>`).join('') || '<p class="small soft">None recorded.</p>'}</div>
      <button class="btn sm" style="margin-top:10px" data-act="addOp">Add critical operation</button></div></div></section>
  <section class="card"><h2 class="sh">4 · Documents from the ${N.entity}</h2><p class="small soft">Inputs I1 to I11, requested through counsel before session 1. The starting positions on the decision screens use the documents marked as received.</p>
    ${b === 'phone' ? `<div class="stack" style="gap:10px">${inputs}</div>` : `<div class="tw"><table class="lg"><thead><tr><th>Ref</th><th>Input</th><th style="width:150px">Status</th><th style="width:160px">Date</th><th>Note</th></tr></thead><tbody>${inputs}</tbody></table></div>`}
    <div style="margin-top:14px;max-width:360px">${fld('Hours allowed by the ' + N.entity + '’s incident notification procedure (from I10)', 'engagement.notificationHours', e.notificationHours, { type: 'number', ph: 'Used by check K9 to test trigger time limits' })}</div></section>
  <section class="card"><h2 class="sh">5 · Board directions</h2><p class="small soft" style="margin:4px 0 12px">Where the board gave directions in AI Board Direction (connected mode), each decision shows the directions read on it, and check K11 holds back a decision 1 ceiling above the board’s posture for that function.</p>
    ${S.boardDirections ? `<p class="small" style="margin:0 0 10px">Loaded ${esc(dAU(S.boardDirections.loadedOn))} ${S.boardDirections.source === 'board' ? 'from AI Board Direction' : 'from a file'}: ${esc(S.boardDirections.file.company || '')}, version ${esc(S.boardDirections.file.version || '')}, ${esc(S.boardDirections.file.status === 'confirmed' ? 'confirmed by the board' : 'recorded by the chair')}. ${(() => { const d = S.boardDirections.file, miss = (S.functions || []).filter(f => !DIRX() || !DIRX().areaFor(d, f.name)).map(f => f.name); return miss.length ? `No BD1 area matches ${esc(miss.join(', '))}, so K11 does not test ${miss.length === 1 ? 'that function' : 'those functions'}.` : 'Every function matches a BD1 area.'; })()}</p>` : '<p class="small" style="margin:0 0 10px">None loaded.</p>'}
    <div class="row" style="gap:8px"><button class="btn sm" data-act="loadDirBoard">Load from AI Board Direction</button><button class="btn sm ghost" data-act="loadDirFile">Load from a file</button>${S.boardDirections ? '<button class="btn sm ghost" data-act="clearDir">Remove</button>' : ''}</div></section>
  </fieldset>
  ${practice() ? '' : `<section class="card" style="margin-top:18px"><h2 class="sh">Copy of the engagement</h2><p class="small soft" style="margin:4px 0 12px">The whole engagement as one file: every position, its history, the people and set-up. Keep it as a backup or to move the engagement elsewhere.</p><button class="btn sm" data-act="save">Download the engagement (.json)</button></section>
  <section class="card" style="margin-top:18px"><h2 class="sh">Next review</h2><p class="small soft" style="margin:4px 0 12px">When the board has approved the appetite and the review interval comes round, start the next review. The approved engagement is kept read-only under Earlier reviews (in the menu). The new review keeps the set-up and people, and starts each position from the approved one.</p>
    <button class="btn sm" data-act="nextReview" ${S.calibration.status === 'approved' ? '' : 'disabled'}>Start the next review</button>${S.calibration.status === 'approved' ? '' : '<p class="why small">Available once the board has approved the current appetite.</p>'}</section>`}
  <section class="card" style="margin-top:18px"><h2 class="sh">Set-up checklist</h2><p class="small soft" style="margin:4px 0 14px">Set-up is complete when each item below is done.</p><div class="stack" style="gap:6px">${g.items.map(i => gate(i[1], i[0])).join('')}</div></section>
  ${stepbar(gate(g.ok, g.ok ? 'Set-up complete' : 'Set-up incomplete'))}`;
}

/* ---------- S2 overview ---------- */
/* One line at the top of the overview: what has to happen next, and who does it. */
function nextStep(ck, sg) {
  const c = S.calibration, bl = blocking(ck), who = me(), role = who ? (rolesOf(who).includes('cro') ? 'cro' : rolesOf(who)[0] || 'none') : UI.role;
  const box = (tone, title, text, act) => `<section class="next ${tone}" aria-label="Next step"><div><div class="next-k">${esc(title)}</div><p>${text}</p></div>${act || ''}</section>`;
  const btn = (to, label, primary) => `<button class="btn sm ${primary ? 'primary' : ''}" data-act="go" data-to="${to}">${esc(label)} →</button>`;
  if (!sg.ok) return box('warn', 'Next: finish set-up', 'Still open: ' + esc(sg.items.filter(x => !x[1]).map(x => x[0]).join('; ')) + '. ' + (practice() ? '' : SRV.user && SRV.user.isAdmin ? 'Complete it in Admin.' : 'An administrator completes it.'), !practice() && SRV.user && SRV.user.isAdmin ? '<a class="btn sm primary" href="/admin/#set-up">Open set-up →</a>' : '');
  const open = C.decisions.map(d => ({ d, st: decisionStatus(d.id, ck) })).filter(x => x.st.un);
  if (open.length) { const x = open[0], more = open.length - 1;
    return box('', `Next: decision ${x.d.n} · ${x.d.name}`, `${x.st.un} of ${x.st.total} positions still to record${more ? `, and ${more} more ${more === 1 ? 'decision has' : 'decisions have'} blank positions` : ''}.`, btn(x.d.id, 'Open decision ' + x.d.n, true)); }
  if (bl.length) { const ds = [...new Set(bl.flatMap(k => k.off.map(o => D(o.id.split('.')[0]).n)).filter(n => n !== '?'))].sort();
    return box('bad', `${bl.length} ${bl.length === 1 ? 'check is' : 'checks are'} failing${ds.length ? ' in decision' + (ds.length > 1 ? 's ' : ' ') + ds.join(', ').replace(/, ([^,]*)$/, ' and $1') : ''}`, `The working appetite can’t be agreed until ${bl.map(k => k.id).join(', ').replace(/, ([^,]*)$/, ' and $1')} pass.`, btn('checks', 'Open checks', true)); }
  if (c.status === 'default') return box('ok', 'Ready for the CRO to agree', `Every position is recorded and checks ${KB()} pass. ${role === 'cro' ? 'You can now agree the working appetite.' : 'The CRO can now agree the working appetite.'}`, btn('outputs', 'Outputs', true));
  if (c.status === 'working') return box('ok', statusPlain(), `Counsel settles the statement for the board. ${role === 'board' ? 'Record the approval when the board approves it.' : 'Once the board approves it, the board record role records the approval.'}`, btn('outputs', 'Outputs', true));
  return box('ok', statusPlain(), 'The appetite is approved. A later change to any position raises the version number and needs approval again.', btn('outputs', 'Outputs'));
}
function screenOverview(ck) {
  const c = S.calibration;
  const cards = C.decisions.map(d => { const st = decisionStatus(d.id, ck); return `<button class="dcard" data-act="go" data-to="${d.id}">
    <div class="row between"><span class="dnum">${d.n}</span>${badge(st.label, st.cls)}</div>
    <div class="dname">${esc(d.name)}</div><div class="small soft" style="flex:1">${esc(d.question)}</div>
    <div class="dprog ${st.cls}" role="img" aria-label="${st.set + st.ns} of ${st.total} recorded"><i style="width:${st.total ? Math.round(100 * (st.set + st.ns) / st.total) : 0}%"></i></div>
    <div class="row between mini"><span>${st.set + st.ns} of ${st.total} recorded</span><span>${st.qc ? st.qc + ' open question' + (st.qc === 1 ? '' : 's') + ' for counsel' : ''}</span></div></button>`; }).join('');
  const sg = setupGate(), missing = sg.items.filter(x => !x[1]).map(x => x[0]);
  return `${opening('Decisions', 'Eight appetite decisions', 'Each decision is one question, answered on a fixed scale in a session led by counsel. Each answer is recorded with who proposed it and an accountable owner.')}
  ${nextStep(ck, sg)}
  <div class="sesshead"><h2 class="sh">Session 1 · decisions 1 to 3</h2><p class="small soft">CRO, General Counsel, operational risk, AI governance, function owners; independent reviewer for decision 2</p></div><div class="dgrid" style="margin-bottom:28px">${cards.split('</button>').slice(0, 3).join('</button>')}</button></div>
  <div class="sesshead"><h2 class="sh">Session 2 · decisions 4 to 8</h2><p class="small soft">The same group, plus procurement or vendor management; ends by reviewing the session 1 positions</p></div><div class="dgrid">${cards.split('</button>').slice(3, 8).join('</button>')}</button></div>
  ${stepbar()}`;
}

/* ---------- decision screens ---------- */
function cellCtl(c, off, nav, aria) {
  const p = P(c.id), st = p ? p.status : 'unset', v = p && st === 'set' ? p.value : '';
  const dis = canEdit(c.did) ? '' : 'disabled', cid = esc(c.id);
  const bad = (off[c.id] || []).some(x => /^K[23]:/.test(x)), fl = !bad && (off[c.id] || []).some(x => !/^K[23]:/.test(x)) ? 'fails' : '';
  const inv = bad || fl ? 'aria-invalid="true"' : '';
  const navA = nav ? `data-gr="${nav[0]}" data-r="${nav[1]}" data-c="${nav[2]}"` : '';
  if (c.kind === 'select') return `<select id="${domId(c.id)}" class="cellsel ${st === 'notSet' ? 'notset' : !v ? 'empty' : ''} ${bad ? 'bad' : fl}" data-cell="${cid}" ${navA} ${inv} ${dis} aria-label="${esc(aria)}" title="${esc(v ? scaleTip(v) : '')}">
    <option value="">${st === 'notSet' ? '—' : '—'}</option>${st === 'notSet' ? '<option value="__ns" selected>not set</option>' : ''}${c.options.map(o => scaleOption(o, v === o)).join('')}</select>`;
  if (c.kind !== 'number') return `<textarea id="${domId(c.id)}" class="in cellta ${bad ? 'bad' : fl}" rows="1" style="${st === 'notSet' ? 'background:var(--ochre-bg);border-color:#EBD7A8' : ''}" data-cell="${cid}" ${navA} ${inv} ${dis} placeholder="${st === 'notSet' ? 'not set' : esc(withLabels(c.hint || '', 'C'))}" aria-label="${esc(aria)}">${esc(v)}</textarea>`;
  return `<input id="${domId(c.id)}" class="in ${bad ? 'bad' : fl}" style="${st === 'notSet' ? 'background:var(--ochre-bg);border-color:#E4D6AE' : ''}" type="${c.kind === 'number' ? 'number' : 'text'}" ${c.kind === 'number' ? 'min="0" inputmode="decimal"' : ''} data-cell="${cid}" ${navA} ${inv} ${dis} value="${esc(v)}" placeholder="${st === 'notSet' ? 'not set' : esc(withLabels(c.hint || '', 'C'))}" aria-label="${esc(aria)}">`;
}
function cellMarks(c, off) {
  const p = P(c.id); let h = '';
  (off[c.id] || []).filter(x => /^K[23]:/.test(x)).forEach(x => h += `<span class="flag">${esc(x)}</span>`);
  if (p && p.status === 'set' && !proposerOk(c.did, p)) h += `<span class="mini" style="color:var(--red)">choose a proposer</span>`;
  if (p && p.status === 'notSet') h += `<span class="mini" style="color:var(--ochre)">not set · ${esc(pname(p.notSetOwner))} · ${esc(dAU(p.notSetDue))}</span>`;
  if (p && p.condition) h += `<span class="mini">Condition: ${esc(p.condition)}${p.testable ? ' ✓' : ''}</span>`;
  const ks = [...new Set((off[c.id] || []).filter(x => !/^K[23]:/.test(x)).map(x => x.split(':')[0]))];
  if (ks.length) h += `<span class="ckfails">${ks.map(k => { const ck = C.checks.find(x => x.id === k); return `<button type="button" class="ckchip" data-term="check:${k}" aria-expanded="false" aria-controls="poproot" title="${esc(ck ? k + ' ' + ck.name + ': ' + ck.fails : k)}" aria-label="Fails check ${esc(k)}${ck ? ', ' + esc(ck.name) : ''}. Show what it checks">${k}</button>`; }).join('')}</span>`;
  return h;
}
/* What a position carries beyond its value, worth flagging on the cell. */
function cellNotes(id) {
  const p = P(id), n = [];
  if (p && p.dissent && p.dissent.trim()) n.push('dissent recorded');
  if (p && p.reason && p.reason.trim()) n.push('reason recorded');
  const ch = S.challenge.filter(x => x.cell === id && x.status !== 'closed' && x.status !== 'resolved').length; if (ch) n.push(ch + ' challenge' + (ch > 1 ? 's' : ''));
  const qc = S.questionsForCounsel.filter(x => x.cell === id && x.status !== 'answered').length; if (qc) n.push(qc + ' question' + (qc > 1 ? 's' : '') + ' for counsel');
  return n;
}
/* Small details button beside each control: faint until the row is hovered or the cell is selected; marked when the position has notes. */
function detBtn(c) {
  if (bp() === 'phone') return `<button class="detic" data-act="details" data-cell="${esc(c.id)}" aria-label="Details">⋯</button>`;
  const o = UI.open === c.id, notes = cellNotes(c.id), lbl = o ? 'Close the details' : 'Details: proposer, owner, condition, dissent' + (notes.length ? ' · ' + notes.join(', ') : '');
  return `<button class="detic ${notes.length ? 'has' : ''}" data-act="toggleDet" data-cell="${esc(c.id)}" aria-expanded="${o}" ${o ? 'aria-controls="details"' : ''} title="${esc(lbl)}" aria-label="${esc(lbl)}">${o ? '✕' : '⋯'}</button>`;
}
const cellUnit = (c, off, nav, aria) => `<div class="ctlrow">${cellCtl(c, off, nav, aria)}${detBtn(c)}</div>${cellMarks(c, off)}`;
/* rows: [{head, sub, items:[cell | {html}]}]; cols: header html list (first = row header) */
function recArea(did, gr, cols, rows, off) {
  if (bp() === 'phone') return `<div class="stack" style="gap:12px">${rows.map(r => `<div class="card" style="padding:16px">
      <div style="font-weight:600;margin-bottom:${r.sub ? '2px' : '10px'}">${r.head}</div>${r.sub ? `<div class="small soft" style="margin-bottom:10px">${r.sub}</div>` : ''}
      <div class="stack" style="gap:10px">${r.items.map((it, i) => `<div><div class="mini" style="margin-bottom:4px">${cols[i + 1]}</div>${it.id ? `<div class="cellwrap" style="align-items:stretch">${cellUnit(it, off, null, r.label + ' · ' + strip(cols[i + 1]))}</div>` : `<div class="small">${it.html}</div>`}</div>`).join('')}</div></div>`).join('')}</div>`;
  return `<div class="tw"><table class="lg" data-grid="${gr}"><thead><tr>${cols.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>
    ${rows.map((r, ri) => `<tr class="${r.items.some(it => it && it.id && it.id === UI.open) ? 'detopen' : ''}"><th scope="row" style="background:none;text-transform:none;letter-spacing:0;font:400 14px/1.4 var(--sans);color:var(--ink);border-bottom:1px solid var(--rule-soft);vertical-align:top">${r.head}${r.sub ? `<div class="mini">${r.sub}</div>` : ''}</th>
      ${r.items.map((it, ci) => it.id ? `<td data-td="${esc(it.id)}" class="${UI.sel === it.id ? 'sel' : ''}"><div class="cellwrap">${cellUnit(it, off, [gr, ri, ci], r.label + ' · ' + strip(cols[ci + 1]))}</div></td>` : `<td class="small">${it.html}</td>`).join('')}</tr>${r.items.some(it => it && it.id && it.id === UI.open) ? `<tr class="detrow"><td colspan="${cols.length}"><div id="details">${detailsHtml(UI.open, true)}</div></td></tr>` : ''}`).join('')}
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
      if (l.code === 'C1') rows.push({ head: `<span class="mono">C1</span> ${esc(scaleLabel('C1'))}`, label: 'C1', items: [{ html: esc(sc.def) }, { html: esc(withLabels(l.sets)) }, { html: `<span class="soft">Whatever falls below ${esc(scaleOpt('C2'))}</span>` }, { html: 'n/a' }] });
      else if (l.code === 'C5' && S.criticalOperations.length) S.criticalOperations.forEach(o => rows.push({ head: `<span class="mono">C5</span> ${esc(scaleLabel('C5'))}: ${esc(o.name)}`, sub: 'Approved tolerance level: ' + esc(o.tolerance || '—'), label: scaleOpt('C5') + ': ' + o.name, items: [{ html: esc(sc.def) }, { html: esc(withLabels(l.sets)) }, by(`d2.op.${o.id}`), { html: esc(o.source || l.source) }] }));
      else rows.push({ head: `<span class="mono">${l.code}</span> ${esc(scaleLabel(l.code))}`, label: scaleOpt(l.code), sub: S.current.d2[l.code] ? N.Entity + '’s existing threshold: ' + esc(S.current.d2[l.code]) : '', items: [{ html: esc(sc.def) }, { html: esc(withLabels(l.sets)) }, by(`d2.${l.code}`), { html: esc(l.source) }] });
    });
    return recArea(did, 'g2', [T('consequence', 'Level'), 'Generic definition', 'What the ' + N.entity + ' sets', N.Entity + '\u2019s setting', 'Usual source'], rows, off);
  }
  if (did === 'd3') return recArea(did, 'g3', [T('tier', 'Authority'), ...CO.map(c => `<span title="${esc(scaleTip(c))}">${c}</span><div class="mini" style="text-transform:none;letter-spacing:0;font-weight:400">${esc(scaleLabel(c))}</div>`)],
    AT.map(a => ({ head: `<span class="mono" title="${esc(scaleTip(a))}">${a}</span> ${esc(scaleLabel(a))}`, label: a, items: CO.map(c => by(`d3.${a}.${c}`)) })), off);
  if (did === 'd4') {
    const d = D('d4');
    return `<h3 class="sh">${T('gapPriority', 'Priority')} for each shortfall, by size of shortfall and consequence</h3>${recArea(did, 'g4', [T('gap', 'Size of shortfall'), ...d.bands.map(b => esc(withLabels(b.name)))], d.gaps.map(g => ({ head: esc(g.name), label: g.name, items: d.bands.map(b => by(`d4.${g.id}.${b.id}`)) })), off)}
    <h3 class="sh" style="margin-top:22px">Time limit and ${T('interim', 'interim position')}</h3>${recArea(did, 'g4b', ['Priority', 'Time limit', 'Interim position while the gap stands'], d.priorities.map(p => ({ head: `<span class="mono">${p.id}</span>`, label: p.id, items: [by(`d4.time.${p.id}`), by(`d4.interim.${p.id}`)] })), off)}`;
  }
  if (did === 'd5') return recArea(did, 'g5', ['Consequence of the arrangement', T('notKnown', 'Not-known') + ' facts allowed per entry', T('f4', 'F4 finding') + ' allowed to stand', 'Minimum ' + T('confidence', 'confidence') + ' in the obtainable rung'],
    D('d5').bands.map(b => ({ head: esc(withLabels(b.name)), label: withLabels(b.name), items: ['notKnown', 'f4', 'conf'].map(f => { const c = by(`d5.${b.id}.${f}`); c.hint = D('d5').blankHints[b.id + '.' + f] || ''; return c; }) })), off);
  if (did === 'd6') {
    const js = S.decisions.d6.jurisdictions, ed = canEdit('d6');
    const rows = js.map((j, i) => ({ head: ed ? `<input class="in" id="jn-${i}" data-path="decisions.d6.jurisdictions.${i}.name" value="${esc(j.name)}" aria-label="Jurisdiction name" style="min-width:140px">` : esc(j.name), label: j.name, sub: (j.start ? 'Starting position: ' + esc(j.start) : '') + (ed ? ` · <button class="lnk mono" data-act="rmJur" data-i="${i}">remove</button>` : ''), items: [by(`d6.j.${j.id}.established`), by(`d6.j.${j.id}.runs`)] }));
    const conc = by('d6.concentration');
    return `${rows.length ? recArea(did, 'g6', ['Jurisdiction', 'Where the provider is established', 'Where the AI runs'], rows, off) : '<p class="soft">No jurisdictions yet. Add each one that appears in the register.</p>'}
    ${ed ? `<div class="row" style="margin-top:10px"><input class="in" id="newJur" placeholder="Jurisdiction" style="max-width:220px" aria-label="New jurisdiction"><select class="in" id="newJurStart" style="max-width:200px" aria-label="Starting marking from offshoring position"><option value="">No starting marking</option>${MARK.map(m => `<option>${m}</option>`).join('')}</select><button class="btn sm" data-act="addJur">Add jurisdiction</button></div>` : ''}
    <div class="card" style="margin-top:18px"><h3 class="sh">${T('concentration', 'Concentration')} limit</h3><p class="small soft measure">${esc(D('d6').concentrationNote)}</p>
      <div class="cellwrap" style="max-width:260px;align-items:stretch">${cellUnit(conc, off, null, 'Concentration limit, percent')}</div><div class="mini" style="margin-top:4px">Percent of critical operations</div>${UI.open === conc.id && bp() !== 'phone' ? `<div id="details" style="margin-top:14px">${detailsHtml(conc.id, true)}</div>` : ''}</div>`;
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
      <div class="card" style="margin-top:18px"><h3 class="sh">Review interval</h3><div class="cellwrap" style="max-width:360px;align-items:stretch">${cellUnit(iv, off, null, 'Review interval')}</div>${UI.open === iv.id && bp() !== 'phone' ? `<div id="details" style="margin-top:14px">${detailsHtml(iv.id, true)}</div>` : ''}</div>`;
  }
  return '';
}
function curGrid(did) {
  const ed = canEdit(did) && did !== 'd2';
  const cols = did === 'd1' ? C.locations : CO.map(c => ({ id: c, name: scaleOpt(c) }));
  const rows = did === 'd1' ? S.functions.map(f => ({ id: f.id, name: f.name })) : AT.map(a => ({ id: a, name: scaleOpt(a) }));
  const opts = did === 'd1' ? AT : EV;
  const sel = (id, lbl) => `<select class="cellsel ${S.current[did][id] ? '' : 'empty'}" id="cur-${sid(id)}" data-cur="${esc(id)}" ${ed ? '' : 'disabled'} aria-label="Current state ${esc(lbl)}"><option value="">—</option>${opts.map(o => scaleOption(o, S.current[did][id] === o)).join('')}</select>`;
  if (bp() === 'phone') return `<div class="stack" style="gap:8px">${rows.map(r => `<div><div class="mini">${esc(r.name)}</div><div class="row" style="gap:6px">${cols.map(c => `<label class="mini" style="display:flex;flex-direction:column;gap:2px">${esc(c.name)}${sel(`${did}.${r.id}.${c.id}`, r.name + ' ' + c.name)}</label>`).join('')}</div></div>`).join('')}</div>`;
  return `<div class="tw" style="background:#fff"><table class="lg"><thead><tr><th>${did === 'd1' ? 'Function' : 'Authority'}</th>${cols.map(c => `<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><td class="small">${esc(r.name)}</td>${cols.map(c => `<td>${sel(`${did}.${r.id}.${c.id}`, r.name + ' ' + c.name)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function startPanel(d) {
  const inputs = d.startingInputs.map(r => { const i = S.inputs.find(x => x.ref === r); return `<span class="badge ${i && i.status === 'received' ? 'b-green' : 'b-grey'}">${r} · ${i && i.status ? { received: 'received', notHeld: 'not held', notRequested: 'not requested' }[i.status] : 'not marked'}</span>`; }).join(' ');
  let extra = '';
  if (d.id === 'd1') extra = `<details class="pr" id="cur-d1" style="margin-top:12px;background:#fff" ${UI.openCur && UI.openCur.d1 ? 'open' : ''}><summary>${T('current', 'Current state')}: where a person signs off today</summary><div style="padding:0 16px 16px">${curGrid('d1')}</div></details>`;
  if (d.id === 'd3') {
    const pr = S.current.commonPair;
    extra = `<details class="pr" id="cur-d3" style="margin-top:12px;background:#fff" ${UI.openCur && UI.openCur.d3 ? 'open' : ''}><summary>${T('current', 'Current state')}: evidence the ${N.entity} holds today</summary><div style="padding:0 16px 16px">${curGrid('d3')}
      <div class="row" style="margin-top:12px"><span class="small">Most common combination of authority and consequence (used by check K10):</span>
      <select class="in" style="width:auto" id="cp-tier" data-path="current.commonPair.tier" aria-label="Most common tier" ${canEdit('d3') ? '' : 'disabled'}><option value="">—</option>${AT.map(a => scaleOption(a, pr.tier === a)).join('')}</select>
      <select class="in" style="width:auto" id="cp-cons" data-path="current.commonPair.consequence" aria-label="Most common consequence" ${canEdit('d3') ? '' : 'disabled'}><option value="">—</option>${CO.map(c => scaleOption(c, pr.consequence === c)).join('')}</select></div>
      <div class="row" style="margin-top:8px"><button class="btn sm" data-act="loadExtract" ${canEdit('d3') ? '' : 'disabled'}>Load assessment register extract</button><button class="btn sm ghost" data-act="loadFeed" ${canEdit('d3') ? '' : 'disabled'}>Load from AI Use Assessment</button><span class="mini">${S.current.register ? esc(withLabels('Loaded ' + dAU(S.current.register.on) + ': ' + S.current.register.entries + ' entries · most common pair ' + (S.current.register.pair || '—') + ' · highest rung received ' + (S.current.register.maxReceived || 'none'))) : 'From the AI Use Assessment app (triodian.aua.extract.v1)'} · <a href="/user-guide/#informs" target="_blank" rel="noopener">How the assessment informs the appetite</a></span></div></div></details>
      <div class="row" style="margin-top:12px"><button class="btn sm" data-act="showRef" aria-expanded="${UI.showRef}">${UI.showRef ? 'Hide reference table' : 'Show reference table'}</button><span class="mini">Shown only if the ${N.entity} asks for it. Each time it is shown is recorded in the session record.</span></div>
      ${UI.showRef ? `<div class="card" style="margin-top:10px"><h3 class="sh">Appendix A: reference table of expected evidence</h3><p class="small soft">${esc(C.appendixANote)}</p><div class="tw"><table class="lg"><thead><tr><th>Authority</th>${CO.map(c => `<th title="${esc(scaleTip(c))}">${c}<div class="mini" style="text-transform:none;letter-spacing:0;font-weight:400">${esc(scaleLabel(c))}</div></th>`).join('')}</tr></thead><tbody>${AT.map(a => `<tr><td class="small"><span class="mono">${a}</span> ${esc(scaleLabel(a))}</td>${C.appendixA[a].map(e => `<td class="code" title="${esc(scaleTip(e))}">${esc(scaleOpt(e))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>` : ''}`;
  }
  if (d.id === 'd2') extra = `<div class="fgrid" style="margin-top:12px">${['C2', 'C3', 'C4'].map(c => fld(`Existing ${scaleOpt(c)} threshold`, `current.d2.${c}`, S.current.d2[c] || '', { ph: 'From I2 / I3' })).join('')}</div>${S.criticalOperations.length ? '' : fld(`Existing ${scaleOpt('C5')} position (no critical operations recorded in set-up)`, 'current.d2.C5', S.current.d2.C5 || '')}`;
  if (d.id === 'd6') extra = `<div style="margin-top:12px">${fld('Existing offshoring position (I6)', 'current.offshoring', S.current.offshoring, { area: true })}</div>`;
  return `<section class="panel2"><div class="row between"><h2 class="sh" style="margin:0">${T('starting', 'Starting position')}</h2><div class="row">${inputs}</div></div>
    ${S.previous ? `<p class="small" style="margin-top:10px"><strong>This is a review.</strong> Starting positions are the positions the board approved last time (version ${esc(S.previous.version)}${S.previous.approvedOn ? ', approved ' + esc(dAU(S.previous.approvedOn)) : ''}). Where there was none, the usual starting position applies.</p>` : ''}
    <p class="small" style="margin-top:10px">${esc(withLabels(d.starting, 'C'))}</p>${extra}
    <div class="row" style="margin-top:12px"><button class="btn sm aub" data-act="useStart" data-d="${d.id}" ${canEdit(d.id) ? '' : 'disabled'}>Use starting position</button><span class="mini">Fills empty cells only. Nothing is filled in automatically.</span></div></section>`;
}
function detailsHtml(id, inline) {
  if (!id) return `<div class="card"><h2 class="sh">Position details</h2><p class="small soft">Select a cell to record its proposer, owner, condition or dissent, or to record it as not set.</p></div>`;
  const c = cellById(id); if (!c) return '';
  const did = c.did, p = getPosView(id), ed = canEdit(did), elig = eligible(did);
  const pOpt = (list, v) => `<option value="">—</option>` + list.map(x => `<option value="${esc(x.id)}" ${v === x.id ? 'selected' : ''}>${esc(x.name)} · ${esc(rolesText(x))}</option>`).join('');
  const eid = esc(id), fid = f => `id="pf-${sid(id)}-${f}"`;
  const ckOff = offenderMap(runChecks())[id] || [];
  const canProp = roleCanPropose(did);
  const propRoles = proposerRoles(did).map(r => ROLE_NAME[r]).join(' or ');
  const sv = startingValue(id);
  const status = badge(p.status === 'set' ? 'set' : p.status === 'notSet' ? 'not set' : 'blank', p.status === 'set' ? 'b-green' : p.status === 'notSet' ? 'b-ochre' : 'b-grey');
  const valueLine = `<div class="mini">value: ${esc(p.status === 'set' ? p.value + (scaleName(p.value) ? ' · ' + scaleName(p.value) : '') + (scaleDef(p.value) ? ' · ' + scaleDef(p.value) : '') : '—')} · starting: ${esc(sv || '—')}${p.source ? ' · source: ' + esc(p.source) : ''}</div>`;
  const alerts = `${ckOff.length ? `<div style="margin-top:8px">${ckOff.map(x => `<div class="err small">${esc(x)}</div>`).join('')}</div>` : ''}
    ${ed ? '' : `<p class="err small" style="margin-top:8px">${esc(editBlockReason(did))} ${whyLink()}</p>`}
    ${p.status === 'set' && !proposerOk(did, p) ? `<p class="err small" role="alert" style="margin-top:8px">Choose a ${T('proposer', 'proposer')}. The position is treated as incomplete until a proposer is recorded.</p>` : ''}`;
  const who = `${canProp
        ? `<label class="f"><span>${T('proposer', 'Proposer')}</span><select class="in" ${fid('proposedBy')} data-pf="proposedBy" data-cell="${eid}">${pOpt(elig, p.proposedBy)}</select></label>`
        : `<label class="f"><span>${T('proposer', 'Proposer')}</span><input class="in" disabled value="Not available to ${esc(ROLE_NAME[UI.role])}" aria-describedby="prop-why"></label>
           <div id="prop-why" class="small soft">Only the ${esc(propRoles)} may propose on decision ${D(did).n}. ${T('proposerRule', 'Why')}</div>
           <label class="f"><span>Recording on behalf of</span><select class="in" ${fid('proposedBy')} data-pf="proposedBy" data-cell="${eid}">${pOpt(elig, p.proposedBy)}</select></label>`}
      ${!elig.length ? `<div class="small" style="color:var(--ochre)">No one in set-up can propose on this decision. An administrator needs to add a person with the role ${esc(propRoles)}.</div>` : ''}
      <label class="f"><span>Owner · ${T('ap', 'accountable person')}</span><select class="in" ${fid('owner')} data-pf="owner" data-cell="${eid}">${pOpt(activePeople(), p.owner)}</select></label>`;
  const what = `${did === 'd1' ? `<label class="f"><span>${T('condition', 'Condition')}</span><textarea class="in" ${fid('condition')} data-pf="condition" data-cell="${eid}" placeholder="e.g. A4 Moves money, up to a stated amount per transaction">${esc(p.condition)}</textarea></label>
        <label class="cb"><input type="checkbox" ${fid('testable')} data-pf="testable" data-cell="${eid}" ${p.testable ? 'checked' : ''}> Can be checked against documents</label>` : ''}
      ${did === 'd1' && p.status === 'set' && beyond(id, p.value) ? `<div class="panel2 small" style="padding:10px 12px"><strong>Beyond the board’s direction.</strong> ${esc(beyond(id, p.value))}. Record a reason and when the board revisits it (check K11).</div>
        <label class="f"><span>Board revisit · meeting or minute where the board revisits this position</span><input class="in" ${fid('boardRevisit')} data-pf="boardRevisit" data-cell="${eid}" value="${esc(p.boardRevisit || '')}" placeholder="e.g. Board meeting 9 December 2026"></label>` : ''}
      ${(did === 'd1' && (c.col !== 'own' || beyond(id, p.value))) || did === 'd2' ? `<label class="f"><span>Reason recorded${did === 'd2' ? ' (if it differs from the existing threshold)' : beyond(id, p.value) ? ' (why the position goes past the board’s direction)' : ' (if higher than for own staff)'}</span><textarea class="in" ${fid('reason')} data-pf="reason" data-cell="${eid}">${esc(p.reason)}</textarea></label>` : ''}
      <label class="f"><span>Dissent</span><textarea class="in" ${fid('dissent')} data-pf="dissent" data-cell="${eid}" placeholder="Who disagreed, and why">${esc(p.dissent)}</textarea></label>`;
  const notSet = `<div class="panel2" style="padding:12px 14px"><div class="sh" style="margin-bottom:8px">Record as not set <span class="soft" style="font-weight:400">· needs an owner and a due date</span></div>
        <div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))"><label class="f"><span>Will set it</span><select class="in" id="ns-owner">${pOpt(activePeople(), p.notSetOwner)}</select></label><label class="f"><span>By</span><input class="in" type="date" id="ns-due" value="${esc(dAU(p.notSetDue))}"></label></div>
        ${UI.err[id] ? `<p class="err" role="alert" style="margin:8px 0 0">${esc(UI.err[id])}</p>` : ''}
        <div class="row" style="margin-top:10px"><button class="btn sm" data-act="notSet" data-cell="${eid}">Record not set</button>${p.status === 'notSet' ? `<button class="btn sm ghost" data-act="clearNotSet" data-cell="${eid}">Clear</button>` : ''}</div></div>`;
  const trail = `${p.recordedBy ? `<p class="mini" style="margin-top:10px">recorded by ${esc(ROLE_NAME[p.recordedBy] || p.recordedBy)}${p.proposedBy ? ' · proposed by ' + esc(pname(p.proposedBy)) : ''}</p>` : ''}
    ${(() => { const h = S.history.filter(x => x.target === id).slice(-3).reverse(); return h.length ? `<div class="mini" style="margin-top:8px">${h.map(x => `${esc(fmtAt(x.at))} · ${esc(x.by)} · ${esc(x.action)} ${esc(x.from == null ? '—' : x.from)} → ${esc(x.to == null ? '—' : x.to)}`).join('<br>')}</div>` : ''; })()}
    <div class="row" style="margin-top:12px"><button class="lnk" data-act="qcForCell" data-cell="${eid}">Log a question for counsel on this cell</button></div>`;
  if (inline) return `<div class="detpanel" role="region" aria-label="Position details · ${esc(cellLabel(id))}">
    <div class="dethead"><div><div class="row" style="gap:10px"><strong class="detlabel">${esc(cellLabel(id))}</strong>${status}</div>${valueLine}</div>
      <button class="btn sm" data-act="closeDet" data-cell="${eid}" aria-label="Close details">Close</button></div>
    ${alerts}
    <fieldset ${ed ? '' : 'disabled'} class="detgrid"><div class="stack" style="gap:12px">${who}</div><div class="stack" style="gap:12px">${what}</div><div>${notSet}</div></fieldset>
    <div class="dettrail">${trail}</div>
  </div>`;
  return `<div class="card" id="details-card"><div class="row between"><h2 class="sh" style="margin:0">Position details</h2>${status}</div>
    <div style="font-weight:600;margin:10px 0 2px">${esc(cellLabel(id))}</div>${valueLine}${alerts}
    <fieldset ${ed ? '' : 'disabled'} style="border:0;padding:0;margin:12px 0 0" class="stack">${who}${what}${notSet}</fieldset>${trail}
  </div>`;
}
function getPosView(id) { return P(id) || blankPos(); }
function screenDecision(did, ck) {
  const d = D(did), off = offenderMap(ck), st = decisionStatus(did, ck), b = bp();
  const purposeTerms = { d1: [['ceiling', 'highest level of authority']], d2: [['consequence', 'consequence definitions']], d3: [['expected', 'evidence the board expects']], d4: [['gap', 'shortfall']], d5: [['notKnown', 'not know']], d6: [['concentration', 'depend on a single platform']], d7: [['trigger', 'events']], d8: [['appetite', 'the appetite itself']] };
  let purpose = esc(withLabels(d.purpose, 'C')); (purposeTerms[did] || []).forEach(([id, txt]) => { purpose = purpose.replace(esc(txt), T(id, esc(txt))); });
  const qcs = S.questionsForCounsel.filter(q => q.decision === did);
  const body = decisionBody(did, off);
  const details = UI.sel && UI.sel.startsWith(did + '.') ? UI.sel : null;
  const gateTxt = st.gate ? 'Every cell set or recorded as not set' : `${st.un} of ${st.total} cells blank`;
  return `${opening(`Decision ${d.n} · session ${d.session}`, esc(d.name), esc(d.question))}
  <div class="row" style="margin:-14px 0 22px">${badge(st.label, st.cls)}<span class="mini">Answered as: ${esc(withLabels(d.answeredAs, 'C'))}</span></div>
  <div class="stack">
    <details class="pr about"><summary>Purpose of this decision</summary><div class="about-in measure"><p class="purpose">${purpose}</p>${d.recorded ? `<p class="small soft">${esc(withLabels(d.recorded, 'C'))}</p>` : ''}${d.note && did !== 'd7' ? `<p class="small soft">${esc(withLabels(d.note, 'C'))}</p>` : ''}</div></details>
    <section>${did === 'd6' ? `<div class="tw" style="margin-top:8px"><table class="lg"><thead><tr><th>Marking</th><th>Meaning in the assessment</th></tr></thead><tbody>${d.markings.map(m => `<tr><td class="code">${m.id}</td><td>${esc(m.meaning)}</td></tr>`).join('')}</tbody></table></div>` : ''}</section>
    ${directionsPanel(did)}${inUsePanel(did)}${startPanel(d)}
    <section><h2 class="sh">The ${N.entity}’s positions</h2><p class="small soft" style="margin:4px 0 14px">Record the position the ${N.entity} proposes in each cell. Select a cell, or use <span class="detic-k" aria-hidden="true">⋯</span> beside it, for the proposer, owner, condition and dissent, or to record a position as not set. A dot on <span class="detic-k" aria-hidden="true">⋯</span> means the position has a dissent, a reason, a challenge or a question for counsel.</p>${canEdit(did) ? '' : `<p class="err small">${esc(editBlockReason(did))} ${whyLink()}</p>`}
      ${body}
      ${canEdit(did) ? `<div class="row" style="margin-top:12px"><span class="small soft">Give every recorded position without an owner this owner:</span><select class="in" id="bulkOwner" style="width:auto"><option value="">—</option>${activePeople().map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select><button class="btn sm" data-act="bulkOwner" data-d="${did}">Apply</button></div>` : ''}
    </section>
    ${d.prompts.length ? `<details class="pr"><summary>Questions to open the discussion · ${d.prompts.length}</summary><ul>${d.prompts.map(p => `<li>${esc(withLabels(p, 'C'))}</li>`).join('')}</ul></details>` : ''}
    <section class="card"><div class="row between"><h2 class="sh" style="margin:0">Questions for ${T('counsel', 'counsel')}</h2><span class="mini">recorded for counsel, not decided in the session</span></div>
      ${qcs.length ? `<div class="stack" style="gap:8px;margin-top:12px">${qcs.map(q => `<div class="row" style="align-items:flex-start;flex-wrap:nowrap"><span class="mono">${esc(q.ref)}</span><span style="flex:1">${esc(q.question)}${q.cell ? `<br><button class="lnk mono" data-act="gotoCell" data-cell="${esc(q.cell)}">${esc(cellLabel(q.cell))}</button>` : ''}${q.response ? `<div class="small soft">Response: ${esc(q.response)}</div>` : ''}</span>${badge(q.status, q.status === 'answered' ? 'b-green' : 'b-ochre')}</div>`).join('')}</div>` : '<p class="small soft" style="margin-top:8px">None logged.</p>'}
      ${canEdit(did) ? `<div style="margin-top:12px"><label class="f" for="qc-new"><span>New question${details ? ' · on ' + esc(cellLabel(details)) : ''}</span><textarea class="in" id="qc-new" placeholder="Any question about what the ${N.entity} is legally obliged to do"></textarea></label><button class="btn sm" style="margin-top:8px" data-act="addQC" data-d="${did}">Log question</button></div>` : ''}
    </section>
  </div>
  ${stepbar(gate(st.gate, gateTxt))}`;
}

/* ---------- S11 checks ---------- */
function screenChecks(ck) {
  const bl = blocking(ck).length;
  return `${opening('Checks K1 to K10', 'Consistency checks', bl ? `${bl} of ${DIRS() ? 'ten' : 'nine'} blocking checks failing. The working appetite cannot be agreed until ${KB()} pass.` : '' + KB() + ' pass. The CRO may agree the working appetite.')}
  <p class="small soft measure">The checks run after every change. A failed ${T('check', 'check')} is referred to the CRO; Triodian does not resolve it.</p>
  ${(() => {
    const st = k => k.state === 'pass' ? ['passed', 'b-green'] : k.state === 'fail' ? ['failed', 'b-red'] : k.state === 'warn' ? ['warning', 'b-ochre'] : ['cannot run', 'b-grey'];
    const open = ck.filter(k => k.state !== 'pass'), ok = ck.filter(k => k.state === 'pass');
    const card = k => `<section class="card" id="ck-${k.id}" style="padding:18px 20px">
    <div class="row between"><div class="row"><span class="mono" style="font-size:14px;font-weight:600">${k.id}</span><strong>${esc(k.name)}</strong></div>${badge(...st(k))}</div>
    <p style="margin:8px 0 4px">${esc(withLabels(k.result, 'C'))}</p><p class="small soft" style="margin:0">Fails when: ${esc(withLabels(k.fails, 'C'))}</p>
    ${k.id === 'K10' ? `<p class="small soft" style="margin-top:6px">${esc(C.k10Note)}</p>` : ''}
    ${k.off.length ? `<ul class="cklist">${k.off.map(o => `<li class="small"><button class="lnk" data-act="gotoCell" data-cell="${esc(o.id)}">${esc(cellLabel(o.id))}</button> · ${esc(o.why)}</li>`).join('')}</ul>` : ''}
  </section>`;
    return `${open.length ? `<h2 class="sh">Needs attention · ${open.length}</h2><div class="stack" style="gap:12px;margin-bottom:22px">${open.map(card).join('')}</div>` : ''}
  ${ok.length ? `<details class="pr ckpass" ${open.length ? '' : 'open'}><summary><span class="badge b-green">passed</span> ${ok.length} ${ok.length === 1 ? 'check' : 'checks'} passed: ${ok.map(k => k.id).join(', ')}</summary>
    <table class="lg" style="margin:0"><tbody>${ok.map(k => `<tr id="ck-${k.id}"><td class="mono" style="width:56px;font-weight:600">${k.id}</td><td style="width:260px"><strong>${esc(k.name)}</strong></td><td class="small soft">Fails when: ${esc(withLabels(k.fails, 'C'))}${k.id === 'K10' ? ' ' + esc(withLabels(k.result, 'C')) : ''}</td></tr>`).join('')}</tbody></table></details>` : ''}`;
  })()}${stepbar()}`;
}

/* ---------- S12 challenge ---------- */
/* ---------- My actions: what is waiting for the signed-in person (or the person being practised as) ---------- */
function myActions(ck) {
  if (!S || UI.archived) return [];
  const p = me(), pid = p ? p.id : null, t = today(), out = [];
  const soon = d => { if (!d) return ''; const days = Math.round((Date.parse(d) - Date.parse(t)) / 864e5); return days < 0 ? 'overdue' : days <= 7 ? 'due' : ''; };
  const add = (key, title, detail, act, tone) => out.push({ key, title, detail, act, tone: tone || '' });
  const cells = C.decisions.flatMap(d => cellsFor(d.id));
  // positions recorded as not set, owned by me
  if (pid) cells.forEach(c => { const x = P(c.id); if (x && x.status === 'notSet' && x.notSetOwner === pid) add('ns' + c.id, 'Set the position: ' + cellLabel(c.id), x.notSetDue ? (soon(x.notSetDue) === 'overdue' ? 'Overdue · was due ' : 'Due ') + dAU(x.notSetDue) : 'No due date', { cell: c.id }, soon(x.notSetDue)); });
  // challenges
  const canRespond = can('challengeResponse');
  S.challenge.filter(c => c.status === 'open').forEach(c => {
    const own = pid && c.cell && P(c.cell) && P(c.cell).owner === pid;
    if (pid && c.raisedBy === pid && !own) return; // the person who raised it waits for the response
    if (own || canRespond) add('ch' + c.ref, `${own ? 'Challenge on your position' : 'Respond to challenge'} ${c.ref}`, (c.cell ? cellLabel(c.cell) + ' · ' : '') + c.point, { to: 'challenge' });
  });
  // questions for counsel
  if (hasRole('counsel') || hasRole('gc')) S.questionsForCounsel.filter(q => q.status !== 'answered').forEach(q => add('qc' + q.ref, 'Answer question ' + q.ref, (q.cell ? cellLabel(q.cell) + ' · ' : D(q.decision).name + ' · ') + q.question, { to: 'challenge', tab: 'qc' }));
  // positions I own that fail a check
  if (pid) { const off = offenderMap(ck); Object.keys(off).forEach(id => { const x = P(id); if (x && x.owner === pid) { const ks = [...new Set(off[id].map(v => v.split(':')[0]))]; add('ck' + id, 'Your position fails ' + ks.join(', '), cellLabel(id), { cell: id }, 'fail'); } }); }
  // recording: blank positions and missing proposers (recorder and counsel)
  if (hasRole('triodian') || hasRole('counsel')) C.decisions.forEach(d => { const st = decisionStatus(d.id, ck); if (st.un) add('rec' + d.id, `Record ${st.un} ${st.un === 1 ? 'position' : 'positions'} in decision ${d.n}`, d.name, { to: d.id }); });
  // statement and schedule
  if ((hasRole('counsel') || hasRole('gc') || hasRole('cro')) && !(S.engagement.overallPosition || '').trim()) add('overall', 'Write the overall position for the statement', 'In the board’s words, on the Outputs screen', { to: 'outputs' });
  if (hasRole('cro')) { const missing = C.measures.filter(m => !(S.measureOwners || {})[m.ref]).length; if (missing) add('measures', `Name owners for ${missing} ${missing === 1 ? 'measure' : 'measures'}`, 'Outputs → Schedule (check K8)', { to: 'outputs', tab: 'schedule' }); }
  // agreement and approval
  const bl = blocking(ck), blank = C.decisions.some(d => decisionStatus(d.id, ck).un);
  if (hasRole('cro') && S.calibration.status === 'default') { if (!bl.length && !blank) add('agree', 'Agree the working appetite', 'Every position is recorded and checks ' + KB() + ' pass', { to: 'outputs' }, 'due'); else if (bl.length) add('checks', `${bl.length} ${bl.length === 1 ? 'check is' : 'checks are'} failing`, 'The working appetite can’t be agreed until they pass', { to: 'checks' }); }
  if (hasRole('board') && S.calibration.status === 'working') add('approve', 'Record the board’s approval', 'When the board or its committee approves the working appetite', { to: 'outputs' }, 'due');
  const rank = { overdue: 0, fail: 1, due: 2, '': 3 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}
function screenActions(ck) {
  const list = myActions(ck), p = me();
  const who = p ? `${esc(p.name)} · ${esc(rolesText(p))}` : esc(ROLE_NAME[UI.role] || '');
  return `${opening('My actions', 'What is waiting for you', who)}
  ${list.length ? `<div class="stack actlist" style="gap:10px">${list.map(a => `<button class="actitem ${a.tone}" ${a.act.cell ? `data-act="gotoCell" data-cell="${esc(a.act.cell)}"` : `data-act="goTab" data-to="${a.act.to}" data-tab="${a.act.tab || ''}"`}>
      <span class="actdot" aria-hidden="true"></span><span class="acttext"><strong>${esc(a.title)}</strong><span class="small soft">${esc(withLabels(a.detail, 'C'))}</span></span>${a.tone === 'overdue' ? badge('Overdue', 'b-red') : a.tone === 'fail' ? badge('Fails a check', 'b-red') : a.tone === 'due' ? badge('Now', 'b-ochre') : ''}<span class="actgo" aria-hidden="true">→</span></button>`).join('')}</div>`
    : `<div class="card"><p style="margin:0"><strong>Nothing is waiting for you.</strong></p><p class="small soft" style="margin:6px 0 0">Items appear here when a position you own is challenged or fails a check, when a “not set” item you own falls due, or when the engagement needs you to act.</p></div>`}
  ${stepbar()}`;
}
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
      : `<div class="tw"><table class="lg"><thead><tr><th>Ref</th><th>Raised by</th><th>Decision and cell</th><th>Point</th><th>Response</th><th style="width:130px">Status</th></tr></thead><tbody>${list.map(({ c, i }) => `<tr><td class="code">${esc(c.ref)}</td><td class="small">${esc(pname(c.raisedBy))}</td><td class="small">${c.cell ? `<button class="lnk mono" data-act="gotoCell" data-cell="${esc(c.cell)}">${esc(cellLabel(c.cell))}</button>` : c.decision ? 'Decision ' + esc(D(c.decision).n) : ''}${c.status === 'accepted' && c.cell ? '<div class="mini">changed this position</div>' : ''}</td><td class="small">${esc(c.point)}</td><td><input class="in" id="chr-${i}" data-path="challenge.${i}.response" value="${esc(c.response)}" aria-label="Response ${esc(c.ref)}" ${rdis}></td><td>${st(`challenge.${i}.status`, c.status, ['open', 'accepted', 'answered'], rdis)}</td></tr>`).join('')}</tbody></table></div>`) : '<p class="soft">No challenge points have been recorded.</p>'}
    ${allowed.length ? `<section class="card" style="margin-top:18px"><h2 class="sh">Record a challenge point</h2>${hasRole('independent') ? `<p class="small soft">${esc(blockReason('d1'))} ${whyLink()}</p>` : ''}<div class="fgrid">
      <label class="f"><span>Raised by</span><select class="in" id="ch-by"><option value="">—</option>${activePeople().map(p => `<option value="${esc(p.id)}" ${UI.personId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
      <label class="f"><span>Decision</span><select class="in" id="ch-dec" data-act="chDec">${decOpts}</select></label>
      <label class="f"><span>Cell</span><select class="in" id="ch-cell"><option value="">Whole decision</option>${cellsFor(chDec).map(c => `<option value="${esc(c.id)}">${esc(cellLabel(c.id))}</option>`).join('')}</select></label></div>
      <label class="f" style="margin-top:12px"><span>Point</span><textarea class="in" id="ch-point"></textarea></label><button class="btn sm" style="margin-top:10px" data-act="addCH">Add to log</button></section>` : ''}`;
  } else {
    const ed = hasRole('counsel') || hasRole('gc');
    body = S.questionsForCounsel.length ? `<div class="tw"><table class="lg"><thead><tr><th>Ref</th><th>Decision and cell</th><th>Question</th><th>Response · counsel</th><th style="width:130px">Status</th></tr></thead><tbody>${S.questionsForCounsel.map((q, i) => `<tr><td class="code">${esc(q.ref)}</td><td class="small">${q.cell ? `<button class="lnk mono" data-act="gotoCell" data-cell="${esc(q.cell)}">${esc(cellLabel(q.cell))}</button>` : 'Decision ' + esc(D(q.decision).n)}</td><td class="small">${esc(q.question)}</td><td><input class="in" id="qcr-${i}" data-path="questionsForCounsel.${i}.response" value="${esc(q.response)}" ${ed ? '' : 'disabled'} aria-label="Response ${esc(q.ref)}"></td><td>${ed ? st(`questionsForCounsel.${i}.status`, q.status, ['open', 'answered']) : badge(q.status, q.status === 'answered' ? 'b-green' : 'b-ochre')}</td></tr>`).join('')}</tbody></table></div>${ed ? '' : '<p class="small soft" style="margin-top:8px">Responses are recorded by counsel.</p>'}` : '<p class="soft">No questions recorded. Questions are added from each decision screen.</p>';
  }
  return `${opening('Challenge', 'Challenge round', 'The second line and each accountable person review the positions in their area. Each point raised is either accepted or answered.')}
  <div class="tabs" role="tablist"><button role="tab" aria-selected="${tab === 'challenge'}" data-act="chTab" data-t="challenge">Challenge log · ${S.challenge.length}</button><button role="tab" aria-selected="${tab === 'qc'}" data-act="chTab" data-t="qc">Questions for counsel · ${S.questionsForCounsel.length}</button></div>
  ${body}${stepbar()}`;
}

/* ---------- outputs ---------- */
const tbl = (h, rows) => '| ' + h.join(' | ') + ' |\n| ' + h.map(() => '---').join(' | ') + ' |\n' + rows.map(r => '| ' + r.map(x => String(x == null ? '' : x).replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ') + ' |').join('\n') + '\n\n';
const pv = id => { const p = P(id); if (!p || p.status === 'unset') return '[ ]'; if (p.status === 'notSet') return `not set (${pname(p.notSetOwner)}, by ${dAU(p.notSetDue)})`; return String(p.value); };
function mdHead(title) { const e = S.engagement; return `${e.privilegeMarking || '[Privilege marking not recorded in set-up]'}\n\n# ${title}\n\n**${statusMark()}**${e.example ? ' · WORKED EXAMPLE, FICTIONAL INSURER' : ''}\n\n${e.insurer || '[' + N.Entity + ']'} · ${e.reference || '[reference]'} · generated ${today()}\n\n`; }
function mdStatement() {
  const e = S.engagement, ins = e.insurer || '[' + N.entity + ']'; let m = mdHead('AI risk appetite statement');
  m += `## 1. Purpose and scope\n\nThis statement covers AI used by ${ins}, by its material service providers, and by the platforms behind them. It sits within ${ins}'s board-approved risk appetite statement, and uses the loss thresholds and critical operation tolerance levels the board has already approved.\n\n`;
  m += `## 2. Overall position\n\n${e.overallPosition || '[For counsel to write, in the board\u2019s words. For example: ' + C.overallExample + ']'}\n\n`;
  m += `## 3. Authority\n\nThe ceiling is the highest level of authority the board accepts for AI in each function and location.\n\n` + tbl(['Function', 'Own staff', 'Inside a provider', 'Platform behind a provider'], S.functions.map(f => [f.name, ...C.locations.map(l => { const id = `d1.${f.id}.${l.id}`, p = P(id); return pv(id) + (p && p.condition ? ` (${p.condition})` : ''); })]));
  m += `Exceptions: a use above the ceiling must be approved by the person named in decision 1, for a limited period, and is reported under measure M1.\n\n`;
  m += `## 4. Consequence thresholds\n\n` + tbl(['Level', 'Threshold', 'Source'], [['C1, immaterial', 'Whatever falls below C2', 'n/a'], ...cellsFor('d2').map(c => { const o = c.id.startsWith('d2.op.') ? S.criticalOperations.find(x => x.id === c.id.split('.')[2]) : null; return [c.rowLabel, pv(c.id), o ? o.source : (D('d2').levels.find(l => l.code === c.row) || {}).source]; })]);
  m += `## 5. Evidence expected\n\n` + tbl(['Authority', ...CO.map(c => c + ', ' + scaleName(c))], AT.map(a => [a + ', ' + scaleName(a), ...CO.map(c => pv(`d3.${a}.${c}`))]));
  m += `## 6. Tolerances\n\n### Shortfall\n\n` + tbl(['Gap', ...D('d4').bands.map(b => b.name)], D('d4').gaps.map(g => [g.name, ...D('d4').bands.map(b => pv(`d4.${g.id}.${b.id}`))])) + tbl(['Priority', 'Time limit', 'Interim position'], D('d4').priorities.map(p => [p.id, pv(`d4.time.${p.id}`), pv(`d4.interim.${p.id}`)]));
  m += `### Unknowns\n\n` + tbl(['Consequence', 'Not-known facts allowed per entry', 'F4 allowed to stand', 'Minimum confidence'], D('d5').bands.map(b => [b.name, pv(`d5.${b.id}.notKnown`), pv(`d5.${b.id}.f4`), pv(`d5.${b.id}.conf`)]));
  m += `### Location and concentration\n\n` + (S.decisions.d6.jurisdictions.length ? tbl(['Jurisdiction', 'Provider established', 'AI runs'], S.decisions.d6.jurisdictions.map(j => [j.name, pv(`d6.j.${j.id}.established`), pv(`d6.j.${j.id}.runs`)])) : 'No jurisdictions recorded.\n\n') + `Concentration limit: ${pv('d6.concentration')}${val('d6.concentration') ? '%' : ''} of critical operations on a single platform or model provider.\n\n`;
  m += `## 7. Triggers and escalation\n\n` + tbl(['Ref', 'Trigger', 'Measure', 'Threshold', 'Notify within', 'Notified to'], S.decisions.d7.triggers.map(t => [t.ref, t.name, t.measure, pv(`d7.${t.ref}.threshold`), val(`d7.${t.ref}.time`) ? val(`d7.${t.ref}.time`) + ' hours' : pv(`d7.${t.ref}.time`), pv(`d7.${t.ref}.to`)]));
  m += `## 8. Accountability\n\n` + tbl(['Function', 'Accountable person'], S.functions.map(f => [f.name, S.people.filter(p => (p.areas || []).includes(f.id)).map(p => p.name).join(', ') || '[ ]']));
  if (irContributed()) { const ir = S.people.filter(p => rolesOf(p).includes('independent')).map(p => p.id), np = cellsFor('d2').filter(c => { const p = P(c.id); return p && p.status === 'set' && ir.includes(p.proposedBy); }).length, nc = S.challenge.filter(c => c.decision === 'd2' && ir.includes(c.raisedBy)).length;
    m += `The independent reviewer ${[np ? `proposed ${np} of the consequence thresholds in decision 2` : '', nc ? `raised ${nc} challenge point${nc === 1 ? '' : 's'} on decision 2` : ''].filter(Boolean).join(' and ')}. If the same reviewer reviews the AI Use Assessment for the CRO, they will review findings measured against thresholds they helped set.\n\n`; }
  m += `## 9. Review\n\nReview interval: ${pv('d8.interval')}.\n\n` + tbl(['Event', 'What is revisited'], S.decisions.d8.events.map(e => [e.event, pv(`d8.ev.${e.id}`)]));
  const sa = sinceApproved();
  if (sa) m += `## Changes since the approved version\n\nThe board approved version ${sa.from.version} on ${sa.from.on}${sa.from.minuteRef ? ' (minute ' + sa.from.minuteRef + ')' : ''}. These positions have changed since then.\n\n` + tbl(['Position', 'Approved', 'Proposed now'], sa.rows.map(r => [r[0], r[1], r[2]]));
  m += `## Appendix. Definitions\n\n${C.scales.note}\n\n` + tbl(['Code', 'Authority tier', 'Definition'], C.scales.authority.map(s => [s.code, s.name, s.def])) + tbl(['Code', 'Consequence level', 'Generic definition'], C.scales.consequence.map(s => [s.code, s.name, s.def])) + tbl(['Code', 'Evidence rung', 'Definition'], C.scales.evidence.map(s => [s.code, s.name, s.def]));
  return m;
}
function irContributed() { const ir = S.people.filter(p => rolesOf(p).includes('independent')).map(p => p.id); if (!ir.length) return false; return cellsFor('d2').some(c => { const p = P(c.id); return p && ir.includes(p.proposedBy); }) || S.challenge.some(c => c.decision === 'd2' && ir.includes(c.raisedBy)); }
/* One board paper: cover memo, statement, schedule, check summary and glossary. */
const bodyOf = md => { const i = md.indexOf('\n## '); return i < 0 ? '' : md.slice(i + 1); };
function mdPack() {
  const e = S.engagement, c = S.calibration, bm = e.boardMemo || {}, ck = runChecks(), bl = blocking(ck);
  const cro = S.people.find(p => rolesOf(p).includes('cro')), ins = e.insurer || '[' + N.entity + ']', v = c.version || 1;
  let m = mdHead('Board paper: AI risk appetite');
  m += `- **To:** ${bm.to || 'The Board'}\n- **From:** ${bm.from || (cro ? cro.name + ', Chief Risk Officer' : 'Chief Risk Officer')}\n- **Meeting:** ${bm.meeting || '[meeting and date]'}\n- **Subject:** AI risk appetite statement, version ${v}\n\n`;
  m += `## Decision sought\n\n${bm.decision || `That the ${bm.to || 'Board'} approve the AI risk appetite statement (version ${v}) and the tolerance and trigger schedule in this paper.`}\n\n`;
  m += `## Recommendation and summary\n\n${bm.summary || '[For counsel or the CRO to write: what the appetite allows and does not allow, in a few sentences, and any matters the board should note.]'}\n\n`;
  m += `## How the positions were reached\n\nThe positions were proposed by ${ins}'s CRO and risk function in sessions facilitated by ${e.counselFirm || 'external counsel'}${S.people.some(p => rolesOf(p).includes('independent')) ? ', with the independent reviewer advising on the consequence thresholds' : ''}. Each position is recorded with who proposed it and an accountable owner. The app's consistency checks ${bl.length ? `show ${bl.length} ${bl.length === 1 ? 'check' : 'checks'} failing (${bl.map(k => k.id).join(', ')}); these must be resolved before approval` : '' + KB() + ' pass'}. ${c.status === 'working' ? `The CRO agreed this working appetite${c.agreedOn ? ' on ' + c.agreedOn : ''}.` : c.status === 'approved' ? `It was approved${c.approvedOn ? ' on ' + c.approvedOn : ''}${c.minuteRef ? ' (minute ' + c.minuteRef + ')' : ''}.` : 'The CRO has not yet agreed the working appetite.'}\n\n`;
  const sa = sinceApproved();
  if (sa) m += `## Changes since the approved version\n\nThe board approved version ${sa.from.version} on ${sa.from.on}. ${sa.rows.length} ${sa.rows.length === 1 ? 'position has' : 'positions have'} changed:\n\n` + tbl(['Position', 'Approved', 'Proposed now'], sa.rows.map(r => [r[0], r[1], r[2]]));
  m += `---\n\n# Attachment A. AI risk appetite statement\n\n` + bodyOf(mdStatement()).replace(/## Changes since the approved version[\s\S]*?(?=## Appendix)/, '');
  m += `---\n\n# Attachment B. Tolerance and trigger schedule\n\n` + bodyOf(mdSchedule());
  m += `---\n\n# Attachment C. Consistency checks\n\n` + tbl(['Check', 'Name', 'Result'], ck.map(k => [k.id, k.name, k.state === 'pass' ? 'passed' : k.state === 'fail' ? 'failed' : k.state === 'warn' ? 'warning' : 'cannot run']));
  const gl = Object.values(C.glossary).sort((a, b) => a.term.localeCompare(b.term)).map(g => [g.term, String(g.def).replace(/\[\[(\w+)(?:\|([^\]]+))?\]\]/g, (x, id, t) => t || (C.glossary[id] ? C.glossary[id].term.toLowerCase() : id))]);
  m += `# Attachment D. Glossary\n\n` + tbl(['Term', 'Meaning'], gl);
  return m;
}
function mdSchedule() {
  let m = mdHead('Tolerance and trigger schedule');
  m += `The measurable parts of the statement, kept in a separate schedule so that they can be updated without the board re-approving the whole statement.\n\n## Measures\n\n` + tbl(['Ref', 'Measure', 'Limit', 'Owner', 'Counted from', 'Reported'], C.measures.map(x => [x.ref, x.measure, x.ref === 'M6' ? (val('d6.concentration') ? val('d6.concentration') + '%' : pv('d6.concentration')) : (x.limit ? (x.limit.startsWith('[') ? x.limit : `[${x.limit}]`) : '[ ]'), pname((S.measureOwners || {})[x.ref]) || `[${x.owner}]`, x.from, x.reported]));
  m += `## Triggers\n\n` + tbl(['Ref', 'Trigger', 'Measure', 'Threshold', 'Notify within', 'Notified to'], S.decisions.d7.triggers.map(t => [t.ref, t.name, t.measure, pv(`d7.${t.ref}.threshold`), val(`d7.${t.ref}.time`) ? val(`d7.${t.ref}.time`) + ' hours' : pv(`d7.${t.ref}.time`), pv(`d7.${t.ref}.to`)]));
  return m;
}
function mdSession() {
  let m = mdHead('Session record') + 'A working paper, not a board paper. To be handled as counsel directs.\n\n';
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
  m += `Status: ${cs.status} · version ${cs.version}${cs.date ? ' · ' + cs.date : ''}${cs.agreedBy ? ' · agreed by ' + cs.agreedBy + (cs.agreedOn ? ', ' + cs.agreedOn : '') : ''}${cs.approvedBy ? ' · approved by ' + cs.approvedBy : ''}${cs.minuteRef ? ' · minute ' + cs.minuteRef : ''}\n\nThe calibration set contains no client facts. It holds only positions and thresholds. Values marked ${d} were not set, and the framework default applies.\n\n`;
  m += hd('P1') + tbl(['Function', ...C.locations.map(l => l.name)], S.functions.map(f => [f.name, ...C.locations.map(l => { const id = `d1.${f.id}.${l.id}`, p = P(id); return val(id) ? val(id) + (p.condition ? ' (' + p.condition + ')' : '') : 'none ' + d; })]));
  m += hd('P2') + cellsFor('d2').map(c => `- ${c.rowLabel}: ${vd(c.id, Q.P2[c.rowLabel])}`).join('\n') + '\n\n';
  m += hd('P3') + tbl(['Authority', ...CO.map(c => c + ', ' + scaleName(c))], AT.map(a2 => [a2 + ', ' + scaleName(a2), ...CO.map(c => vd(`d3.${a2}.${c}`, Q.P3[a2][c]))]));
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
/* ---------- engagement plan (development plan task 0.7) ----------
   The steps come from the framework's own process (section 7.2), so the plan says what the method says. Sessions are the
   two decision sessions with the dates set-up records, then the challenge and the approval; attendees by role come from
   the people list; inputs are I1 to I11 with their status; sign-off points are the CRO's agreement and the board's. */
function fwTable(heading) {
  const m = C.frameworkMarkdown || '', i = m.indexOf(heading); if (i < 0) return [];
  const rows = []; for (const l of m.slice(i).split('\n').slice(1)) { if (!l.startsWith('|')) { if (rows.length) break; continue; } rows.push(l.replace(/^\|\s*|\s*\|$/g, '').split(/\s*\|\s*/)); }
  return rows.filter(r => !r.every(c => /^-+$/.test(c))).slice(1);
}
function mdPlan() {
  const e = S.engagement, c = S.calibration, ck = runChecks(), pass = ck.filter(k => k.state === 'pass').length, sd = e.sessionDates || [];
  const holds = (p, r) => (Array.isArray(p.roles) && p.roles.length ? p.roles : [p.role]).includes(r);
  const named = r => activePeople().filter(p => holds(p, r)).map(p => p.name + (p.organisation ? ' (' + p.organisation + ')' : '')).join('; ');
  const recv = S.inputs.filter(i => i.status === 'received' || i.status === 'notHeld').length;
  const stands = [`${recv} of ${S.inputs.length} inputs received or recorded as not held`, sd[0] ? 'Dated ' + dAU(sd[0]) : 'Date to be set', sd[1] ? 'Dated ' + dAU(sd[1]) : 'Date to be set',
    `${pass} of ${ck.length} checks pass`, c.agreedById ? 'Agreed ' + dAU(c.agreedOn) + (c.agreedBy ? ' by ' + c.agreedBy : '') : 'Not yet', '', '', c.status === 'approved' ? 'Approved ' + dAU(c.approvedOn) + (c.minuteRef ? ', ' + c.minuteRef : '') : 'Not yet'];
  let m = mdHead('Engagement plan');
  m += `This plan follows the framework’s process. It is for everyone taking part: what happens when, who attends, what the ${N.entity} is asked to provide, and where each sign-off stands.\n\n`;
  m += `## Steps\n\n` + tbl(['Step', 'When', 'Activity', 'Output', 'Where it stands'], fwTable('### 7.2 Steps').map((r, i) => [r[0], r[1], r[2], r[3], stands[i] || ''])) + '\n';
  const dec = s => C.decisions.filter(d => d.session === s).map(d => d.n + ' ' + d.name).join(', ');
  m += `## Sessions and who attends\n\n` + tbl(['Session', 'When', 'Covers', 'Attends'], [
    ['Session 1', sd[0] ? dAU(sd[0]) + ', two hours' : 'Week 1, day 4 or 5, two hours', 'Decisions ' + dec(1), 'The CRO and the ' + N.entity + ' risk function, who propose positions; counsel, who facilitates; Triodian, who records'],
    ['Session 2', sd[1] ? dAU(sd[1]) + ', two hours' : 'Week 2, two hours', 'Decisions ' + dec(2) + '; session 1 positions reviewed in their light', 'As session 1'],
    ['Challenge', 'Week 3', 'Each area’s positions', 'Second line and each accountable person, with the CRO'],
    ['Approval', 'Next risk committee or board meeting', 'The statement and schedule', 'The board; the CRO presents, counsel settles the wording'],
  ]) + '\n';
  m += `## Attendees by role\n\n` + tbl(['Role', 'Named'], C.roles.map(r => [r.name, named(r.id) || 'Not yet named'])) + '\n';
  const st = { received: 'Received', requested: 'Requested', notHeld: 'Not held' };
  m += `## Inputs needed from the ${N.entity}\n\nRequested through external counsel before session 1.\n\n` + tbl(['Ref', 'Input', 'Used in', 'Status'], C.inputs.map((x, i) => { const s = S.inputs[i] || {}; return [x.ref, x.name, x.usedIn, (st[s.status] || 'Not yet requested') + (s.date ? ' ' + dAU(s.date) : '')]; })) + '\n';
  m += `## Sign-off points\n\n` + tbl(['Sign-off', 'By', 'Where it stands'], [
    ['Working appetite agreed (the calibration set issued to the assessment, marked working)', 'The CRO, once checks ' + KB() + ' pass', c.agreedById ? `Agreed ${dAU(c.agreedOn)}, version ${c.version}` : 'Not yet'],
    ['Statement and schedule settled for the board', 'External counsel', c.status === 'approved' ? 'Done' : 'Before approval'],
    ['Board approval (the calibration set re-issued, marked approved)', 'The board, recorded with the minute reference', c.status === 'approved' ? `Approved ${dAU(c.approvedOn)}${c.minuteRef ? ', ' + c.minuteRef : ''}` : 'Not yet'],
  ]);
  return m;
}
function mdChecks() { const ck = runChecks(); let m = mdHead('Check report'); m += tbl(['Check', 'Name', 'Result', 'Detail'], ck.map(k => [k.id, k.name, k.state === 'pass' ? 'passed' : k.state === 'fail' ? 'failed' : k.state === 'warn' ? 'warning' : 'cannot run', k.off.length ? k.off.map(o => cellLabel(o.id) + ': ' + o.why).join('; ') : k.result])); return m + C.k10Note + '\n'; }
function outputFor(tab) { const L = fn => () => datesAU(withLabels(fn())); return { pack: [L(mdPack), 'board-pack'], statement: [L(mdStatement), 'statement'], schedule: [L(mdSchedule), 'schedule'], session: [L(mdSession), 'session-record'], calibration: [L(mdCalibration), 'calibration-set'], checks: [L(mdChecks), 'check-report'], plan: [L(mdPlan), 'engagement-plan'] }[tab]; }
function screenOutputs(ck) {
  const c = S.calibration, bl = blocking(ck).length, tab = UI.outTab, [fn, slug] = outputFor(tab), md = fn();
  const tabs = [['pack', 'Board pack'], ['statement', 'Statement'], ['schedule', 'Schedule'], ['session', 'Session record'], ['calibration', 'Calibration set'], ['checks', 'Check report'], ['plan', 'Engagement plan']];
  const who = me(), listIds = a => a.join(', ').replace(/, ([^,]*)$/, ' and $1'), blIds = listIds(blocking(ck).map(k => k.id));
  const whyAgree = [!who || !rolesOf(who).includes('cro') ? (practice() ? 'Only the CRO can agree: choose the CRO under “Acting as” above.' : 'Only the CRO can agree the working appetite.') : '', bl ? `Checks ${blIds} must pass first.` : ''].filter(Boolean);
  const agreeWhy = whyAgree.join(' '), needsAgree = c.status === 'default' || (c.status === 'working' && !c.agreedById);
  const whyApprove = [!hasRole('board') ? (practice() ? 'Only the board record role can record approval: choose it under “Acting as” above.' : 'Only the board record role can record approval.') : '', c.status === 'default' ? 'The CRO must agree the working appetite first.' : c.status === 'working' && !c.agreedById ? 'The CRO must agree version ' + c.version + ' first.' : ''].filter(Boolean).join(' '), xb = tab === 'calibration' && exportBlocked();
  return `${opening('Outputs', 'Statement, schedule and calibration set', 'The statement for board approval, the schedule, the session record and the calibration set.')}
  <section class="card" style="margin-bottom:20px"><div class="row between"><div class="row"><h2 class="sh" style="margin:0">${T('calibration', 'Calibration status')}</h2>${calBadge()}${S.calibration.status === 'default' ? '' : `<span class="soft small">${esc(statusPlain())}</span>`}</div>${c.minuteRef ? `<span class="mono soft">minute ${esc(c.minuteRef)}</span>` : ''}</div>
    <div class="grid2" style="margin-top:14px"><div class="panel2"><div style="font-weight:600">Agree ${T('working', 'working appetite')}</div><p class="small soft" style="margin:4px 0 10px">${c.status === 'default' ? 'This becomes version 1.' : 'Any later change to a position raises the version number.'}</p>
      <button class="btn primary sm" data-act="agree" ${agreeWhy || !needsAgree ? 'disabled' : ''}>Agree ${c.status === 'default' ? 'working appetite' : 'version ' + esc(c.version)}</button> ${agreeWhy && needsAgree ? `<p class="why small">${esc(agreeWhy)}${bl ? ' <button class="lnk" data-act="go" data-to="checks">Open checks</button>' : ''}</p>` : !needsAgree ? `<span class="small soft">Version ${esc(c.version)} agreed ${esc(dAU(c.agreedOn))} by ${esc(c.agreedBy)}</span>` : ''}</div>
    <div class="panel2"><div style="font-weight:600">Record board approval</div><p class="small soft" style="margin:4px 0 10px">Records the board’s approval. The version number does not change.</p>
      <div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))"><label class="f"><span>Date</span><input class="in" type="date" id="ap-date" value="${esc(c.approvedOn || today())}" ${hasRole('board') ? '' : 'disabled'}></label><label class="f"><span>Minute reference</span><input class="in" id="ap-min" value="${esc(c.minuteRef)}" ${hasRole('board') ? '' : 'disabled'}></label><label class="f"><span>Approved by (board or committee)</span><input class="in" id="ap-by" value="${esc(c.approvedBy)}" ${hasRole('board') ? '' : 'disabled'}></label></div>
      ${UI.err.approval ? `<p class="err" role="alert">${esc(UI.err.approval)}</p>` : ''}
      <button class="btn sm" style="margin-top:10px" data-act="approve" ${hasRole('board') && c.status === 'working' && c.agreedById ? '' : 'disabled'}>Record approval</button> ${whyApprove ? `<p class="why small">${esc(whyApprove)}</p>` : ''}</div></div>
    ${c.issued.length ? `<div class="mini" style="margin-top:12px">Issued: ${c.issued.map(x => `v${esc(x.version)} ${esc(x.status)} ${esc(dAU(x.on))}${x.by ? ' · ' + esc(x.by) : ''}${x.minuteRef ? ' · ' + esc(x.minuteRef) : ''}`).join(' · ')}</div>` : ''}
    ${exportBlocked() ? `<p class="err" role="alert" style="margin-top:12px">${esc(statusMark())}. The calibration set cannot be exported until checks ${KB()} pass. <button class="lnk" data-act="go" data-to="checks">Open checks</button></p>` : ''}</section>
  ${compareCard()}
  <div class="tabs" role="tablist">${tabs.map(t => `<button role="tab" id="tab-${t[0]}" aria-selected="${tab === t[0]}" data-act="outTab" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>
  ${tab === 'pack' ? `<div class="card" style="margin-bottom:16px"><h3 class="sh">Cover memo</h3><p class="small soft" style="margin:4px 0 12px">Written by counsel or the CRO. Empty fields use the wording shown in the preview.</p><div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${fld('To', 'engagement.boardMemo.to', (S.engagement.boardMemo || {}).to || '', { ph: 'The Board' })}${fld('From', 'engagement.boardMemo.from', (S.engagement.boardMemo || {}).from || '', { ph: 'Chief Risk Officer' })}${fld('Meeting', 'engagement.boardMemo.meeting', (S.engagement.boardMemo || {}).meeting || '', { ph: 'Board Risk Committee, 12 November 2026' })}</div>${fld('Decision sought', 'engagement.boardMemo.decision', (S.engagement.boardMemo || {}).decision || '', { area: true, ph: 'That the Board approve the AI risk appetite statement and the tolerance and trigger schedule in this paper.' })}${fld('Recommendation and summary', 'engagement.boardMemo.summary', (S.engagement.boardMemo || {}).summary || '', { area: true, ph: 'What the appetite allows and does not allow, and any matters the board should note.' })}${can('overall') ? '' : `<p class="small soft" style="margin:6px 0 0">${esc(blockReason('overall'))} ${whyLink()}</p>`}</div>` : ''}
  ${tab === 'statement' ? `<div class="card" style="margin-bottom:16px">${fld('Overall position · in the board\u2019s words, written by counsel', 'engagement.overallPosition', S.engagement.overallPosition, { area: true, ph: C.overallExample })}${can('overall') ? '' : `<p class="small soft" style="margin:6px 0 0">${esc(blockReason('overall'))} ${whyLink()}</p>`}</div>` : ''}
  ${tab === 'schedule' ? `<div class="card" style="margin-bottom:16px"><h3 class="sh">Measure owners · check K8</h3><div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${C.measures.map(x => `<label class="f" for="mo-${x.ref}"><span>${x.ref} · ${esc(withLabels(x.measure, 'C'))}</span><select class="in" id="mo-${x.ref}" data-path="measureOwners.${x.ref}" ${can('measures') ? '' : 'disabled'}><option value="">— ${esc(x.owner)}</option>${activePeople().map(p => `<option value="${esc(p.id)}" ${(S.measureOwners || {})[x.ref] === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>`).join('')}</div></div>` : ''}
  <div class="row" style="margin-bottom:12px">${inFrame ? '' : `<button class="btn sm primary" id="out-docx" data-act="downloadDocx" data-t="${tab}" ${xb ? 'disabled' : ''}>Download Word</button><button class="btn sm" id="out-pdf" data-act="printPdf" data-t="${tab}" ${xb ? 'disabled' : ''} title="Opens the print dialog. Choose Save as PDF.">Download PDF</button>`}<button class="btn sm ghost" id="out-copy" data-act="copy" data-t="${tab}" ${xb ? 'disabled' : ''}>Copy markdown</button>${inFrame ? '' : `<button class="btn sm ghost" id="out-dl" data-act="download" data-t="${tab}" ${xb ? 'disabled' : ''}>Download .md</button>`}${tab === 'calibration' ? `${inFrame ? '' : `<button class="btn sm" id="out-dlj" data-act="downloadJson" ${xb ? 'disabled' : ''}>Download .json</button>`}<button class="btn sm ghost" id="out-cpj" data-act="copyJson" ${xb ? 'disabled' : ''}>Copy JSON</button>` : ''}${inFrame ? '<span class="small soft">Downloads are not available in this viewer. Use Copy, or open the file directly in a browser.</span>' : ''}${xb ? '<span class="small" style="color:var(--red)">Blocked: checks failing</span>' : ''}</div>
  <div class="card md" aria-label="Preview">${mdToHtml(md)}</div>
  ${stepbar()}`;
}

/* ---------- S14 reference ---------- */
function screenReference() {
  const q = UI.refQ.trim().toLowerCase();
  const gl = Object.entries(C.glossary).filter(([id, g]) => !q || (g.term + ' ' + g.def).toLowerCase().includes(q)).sort((a, b) => a[1].term.localeCompare(b[1].term));
  const scale = (title, list, term) => `<section class="card"><h2 class="sh">${T(term, title)}</h2><div class="stack" style="gap:8px">${list.map(s => `<div class="row" style="align-items:flex-start;flex-wrap:nowrap"><span class="mono" style="min-width:28px;font-weight:600">${s.code}</span><span><strong>${esc(s.label || s.name)}</strong><br><span class="small soft">${s.label ? 'Framework name: ' + esc(s.name) + '. ' : ''}${esc(s.def)}</span></span></div>`).join('')}</div></section>`;
  return `${opening('Reference', 'Scales, glossary and framework', 'The AI Risk Appetite Framework, ' + esc(C.frameworkDate) + '. Read-only. For what each role does, see the <a href="/user-guide/">user guide</a>.')}
  <p class="small soft measure">${esc(C.scales.note)}</p>
  <div class="dgrid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-bottom:28px">${scale('Authority tiers', C.scales.authority, 'tier')}${scale('Consequence levels', C.scales.consequence, 'consequence')}${scale('Evidence rungs', C.scales.evidence, 'ladder')}</div>
  <section style="margin-bottom:28px"><div class="row between"><h2 class="sh" style="margin:0">Glossary</h2><input class="in" id="refq" data-act="refq" type="search" value="${esc(UI.refQ)}" placeholder="Search terms" style="max-width:280px" aria-label="Search glossary"></div>
    <div class="tw" style="margin-top:12px"><table class="lg"><tbody>${gl.map(([id, g]) => `<tr id="g-${id}" class="fwsec"><td style="width:220px;font-weight:600">${esc(g.term)}</td><td class="small">${linkify(withLabels(g.def, 'C'))}</td><td class="small soft" style="width:200px">${esc(g.where)}</td></tr>`).join('') || '<tr><td>No match.</td></tr>'}</tbody></table></div></section>
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
  const id = UI.pop.stack[UI.pop.stack.length - 1], back = UI.pop.stack.length > 1;
  const ck = id.startsWith('check:') ? C.checks.find(x => x.id === id.slice(6)) : null;
  const g = ck ? { term: `Check ${ck.id} · ${ck.name}`, def: ck.fails, where: '' } : C.glossary[id];
  const inner = ck ? `<div class="ptop"><span class="mini">FAILED CHECK</span><button class="iconbtn" data-pact="close" aria-label="Close">✕</button></div>
    <h4 id="pop-h">${esc(g.term)}</h4><p class="small" style="margin:0"><strong>Fails when:</strong> ${esc(withLabels(ck.fails, 'C'))}.</p>${(popAnchor && popAnchor.closest('[data-td]')) ? (() => { const cid = popAnchor.closest('[data-td]').dataset.td, why = (offenderMap(runChecks())[cid] || []).filter(x => x.startsWith(ck.id + ':')).map(x => x.slice(ck.id.length + 2)); return why.length ? `<div class="where"><strong>This cell:</strong> ${esc(why.join('; '))}</div>` : ''; })() : '<div style="height:8px"></div>'}<button class="lnk small" data-pact="more" data-id="${id}">All checks</button>` : `<div class="ptop">${back ? '<button class="lnk mono" data-pact="back">← back</button>' : '<span class="mini">TERM</span>'}<button class="iconbtn" data-pact="close" aria-label="Close">✕</button></div>
    <h4 id="pop-h">${esc(g.term)}</h4><p class="small" style="margin:0">${linkify(withLabels(g.def, 'C'))}</p><div class="where"><strong>Where it is used:</strong> ${esc(g.where)}</div><button class="lnk small" data-pact="more" data-id="${id}">Read more</button>`;
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
// The sector pack follows the engagement: set-up picks it, and it locks once a decision or entry is recorded.
function packId() { return (S && S.engagement && S.engagement.sectorPack) || TriodianPacks.DEFAULT; }
// Mirrors packLocked in lib/core/rbac.js, which refuses the change on the server.
function packLocked() { if (!S) return false; if ((S.calibration || {}).version > 0) return true; return Object.values(S.decisions || {}).some(d => d && d.cells && Object.keys(d.cells).length > 0); }
// A new pack on an engagement with nothing recorded: the functions, inputs, triggers and events follow the pack.
function switchPack(from) {
  applyPack();
  const keep = Object.fromEntries((S.inputs || []).map(x => [x.ref, x]));
  S.functions = C.functions.map(f => ({ ...f })); S.functionsConfirmed = false;
  const ids = new Set(S.functions.map(f => f.id));
  (S.people || []).forEach(p => { if (p.areas) p.areas = p.areas.filter(a => ids.has(a)); });
  S.inputs = C.inputs.map(i => keep[i.ref] ? { ...keep[i.ref] } : { ref: i.ref, status: '', date: '', note: '' });
  S.decisions.d7.triggers = D('d7').triggers.map(t => ({ ...t, custom: false })).concat(S.decisions.d7.triggers.filter(t => t.custom));
  S.decisions.d8.events = D('d8').events.map(e => ({ ...e, custom: false })).concat(S.decisions.d8.events.filter(e => e.custom));
  toast('Sector pack: ' + BASE.packs[C.pack].name + '. Functions and inputs now follow it.');
}
function applyPack() { const id = packId(); if (C && C.pack === id) return; C = TriodianPacks.resolve(BASE, id); N = BASE.packs[C.pack].nouns; ROLE_NAME.risk = N.Entity + ' risk'; }
function doRender() {
  applyPack();
  const app = document.getElementById('app'); lastBp = bp();
  if (AREA !== 'app') return renderArea(app);
  // Until start-up has finished, show a quiet line rather than the welcome screen, so it doesn't flash before the engagement opens.
  if (!S) { app.innerHTML = (UI.guide || SRV.started || (SRV.checked && !SRV.on)) ? entry() : `<p class="small soft" role="status" style="text-align:center;padding:30vh 16px 0">Opening AI Risk Appetite…</p>`; return; }
  applyIdentity();
  if (UI.personId) { const p = person(UI.personId); if (p) UI.role = rolesOf(p)[0] || 'none'; else UI.personId = ''; }
  versionCheck();
  const ck = runChecks(), ae = document.activeElement, fid = ae && ae.id, fkey = !fid ? dsKey(ae) : null; let sel = null;
  try { if (ae && ae.selectionStart != null) sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) {}
  let main = '', g = '';
  const s = UI.screen;
  if (s === 'setup') { main = screenSetup(); const sg = setupGate(); g = gate(sg.ok, sg.ok ? 'Set-up done' : 'Set-up open'); }
  else if (s === 'overview') main = screenOverview(ck);
  else if (/^d\d$/.test(s)) { main = screenDecision(s, ck); const st = decisionStatus(s, ck); g = gate(st.gate, st.gate ? 'All recorded' : st.un + ' blank'); }
  else if (s === 'checks') main = screenChecks(ck);
  else if (s === 'actions') main = screenActions(ck);
  else if (s === 'challenge') main = screenChallenge();
  else if (s === 'outputs') main = screenOutputs(ck);
  else if (s === 'reference') main = screenReference();
  else main = screenOverview(ck);
  app.innerHTML = header(ck) + `<main id="main" tabindex="-1"><div class="wrap">${main}</div></main>` + footer() + bottombar(g) + drawer() + (s === 'entry' ? entry() : UI.guide ? guideOverlay() : '');
  renderSheet();
  if (!fid && fkey) { const m = [...document.querySelectorAll('#app [data-act],#app [data-cell],#app [data-path]')].find(x => dsKey(x) === fkey); if (m) m.focus({ preventScroll: true }); }
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange && /text|search|textarea/.test(el.type || el.tagName.toLowerCase())) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
  document.documentElement.classList.toggle('present', UI.present && bp() === 'desk');
  fitCells();
}
/* Details open in a row under the position's row; one at a time. */
function openDet(id) {
  UI.open = id; UI.sel = id; render();
  const box = document.getElementById('details'); if (!box) return;
  /* Keep the position's own row in view just below the sticky header, with as much of the panel as fits. */
  const hdr = document.querySelector('.hdr'), top = (hdr ? hdr.getBoundingClientRect().bottom : 0) + 12;
  const cell = document.getElementById(domId(id)), anchor = (cell && cell.closest('td,.cellwrap')) || box;
  const a = anchor.getBoundingClientRect(), r = box.getBoundingClientRect();
  if (a.top < top || r.bottom > innerHeight) window.scrollTo(0, Math.max(0, scrollY + Math.min(a.top - top, r.bottom - innerHeight + 16)));
  const f = box.querySelector('select:not([disabled]),textarea:not([disabled]),input:not([disabled])'); if (f) f.focus({ preventScroll: true });
}
function closeDet(id) {
  UI.open = null; render();
  const el = id && document.getElementById(domId(id)); if (el) el.focus({ preventScroll: true });
}
/* Text cells grow with their content (where the browser cannot size them itself). */
function fitCells(root) { (root || document).querySelectorAll('textarea.cellta').forEach(t => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; }); }
function refreshDetails() {
  const box = document.getElementById('details'); if (box && UI.open) box.innerHTML = detailsHtml(UI.open, true);
  document.querySelectorAll('td[data-td]').forEach(td => td.classList.toggle('sel', td.getAttribute('data-td') === UI.sel));
}
function toast(msg) { if (!msg) return; let t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast'; t.setAttribute('role', 'status'); clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = 'hidden'; }, 3200); }
function go(to) {
  if (AREA === 'app' && ADMIN_SCREENS.includes(to)) { if (SRV.user && SRV.user.isAdmin) location.href = '/admin/#' + toSlug(to); else toast('Set-up is done by administrators in Admin.'); return; }
  if (AREA === 'admin' && !ADMIN_SCREENS.includes(to)) { location.href = '/#' + toSlug(to); return; }
  if (AREA === 'admin' && to !== 'setup' && !ADM.loaded) loadAdmin();
  if (UI.open && !UI.open.startsWith(to + '.')) UI.open = null;
  UI.screen = to; UI.drawer = false; UI.acct = false; UI.sheet = null; closePop(true); popAnchor = null; UI.showRef = false;
  try { history.replaceState(null, '', '#' + toSlug(to)); } catch (e) {}
  render(); window.scrollTo(0, 0);
}
function gotoCell(id) {
  if (/^M\d+$/.test(id)) { UI.outTab = 'schedule'; go('outputs'); const el = document.getElementById('mo-' + id); if (el) { window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 140); el.focus({ preventScroll: true }); } return; }
  const did = id.split('.')[0]; UI.sel = id; if (bp() !== 'phone' && cellById(id)) UI.open = id; go(did);
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
  (o.people || []).forEach(p => { id(p.id, 'a person id'); if (!rolesOf(p).every(r => roles.includes(r))) E('a person has an unknown role'); (p.areas || []).forEach(x => id(x, 'an area')); });
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
    if (SRV.exists) return toast('The engagement has already been started, so a file cannot replace it.');
    st.engagement.id = uid(); startEngagement(st); go('setup');
    UI.dirty = true; autosave(); saveNow(); toast('Started the engagement from ' + file.name + '. People are taken from the user list, so check owners, proposers and accountability areas.'); };
  fr.readAsText(file);
}
/* ---------- profile icon ---------- */
const initials = s => { const w = String(s || '').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); };
function avatarBadge() { const u = SRV.user; return u ? `<span class="avatar" aria-hidden="true">${esc(initials(u.name || u.email))}</span>` : ''; }
function avatar() {
  const u = SRV.user; if (!u) return '';
  return `<span class="acct"><button class="avatar-link" data-act="acct" aria-haspopup="menu" aria-expanded="${!!UI.acct}" title="${esc(u.name || u.email)}" aria-label="Account: ${esc(u.name || u.email)}">${avatarBadge()}</button>${UI.acct ? `<div class="acct-menu" role="menu">
    <div class="acct-who">${avatarBadge()}<div><strong>${esc(u.name || u.email)}</strong>${u.name ? `<div class="small soft">${esc(u.email)}</div>` : ''}<div class="small soft">${esc(rolesOf(u).length ? rolesText(u) : 'No engagement role')}${u.isAdmin ? ' · administrator' : ''}</div></div></div>
    <a role="menuitem" class="item" href="/profile/">Your profile</a>
    ${u.isAdmin ? `<a role="menuitem" class="item" href="/admin/#set-up">Admin · set-up and users</a>` : ''}
    <a role="menuitem" class="item" href="/user-guide/">User guide</a>
    ${AREA === 'app' && S ? `<button role="menuitem" class="item" data-act="go" data-to="reference">Reference · scales and glossary</button>` : `<a role="menuitem" class="item" href="/#reference">Reference · scales and glossary</a>`}
    <a role="menuitem" class="item signout" href="/auth/logout">Sign out</a></div>` : ''}</span>`;
}

/* ---------- Admin and profile areas ---------- */
const ADM = { loaded: false, users: [], roles: [], perms: [], requests: [], audit: [], editing: null, adding: false, draft: null, err: '' };
const PRF = { err: '', msg: '', emailErr: '' };
async function loadAdmin() {
  const [u, a, n] = await Promise.all([api('GET', '/api/admin/users'), api('GET', '/api/admin/audit'), api('GET', '/api/admin/notifications')]);
  ADM.notes = n.ok ? n.body.entries : []; ADM.sending = n.ok && n.body.sending;
  if (u.ok) { ADM.users = u.body.users; ADM.roles = u.body.roles; ADM.perms = u.body.permissions; ADM.requests = u.body.accessRequests || []; ADM.others = u.body.otherApps || {}; }
  else ADM.err = u.error;
  ADM.audit = a.ok ? a.body.entries : []; ADM.loaded = true; render();
}
const roleLong = id => (ADM.roles.find(r => r.id === id) || (C.roles || []).find(r => r.id === id) || {}).name || (id || 'None');
function areaHeader() {
  const tabs = AREA === 'admin' && SRV.user && SRV.user.isAdmin ? [['setup', 'Set-up'], ['users', 'Users'], ['activity', 'Activity'], ['notifications', 'Notifications']] : [];
  return `<header class="hdr"><div class="hdr-in">
    <a class="brand" href="/" aria-label="Triodian · back to the app" style="text-decoration:none"><img class="logo" src="/triodian-logo.svg" alt="Triodian" height="26" style="height:26px;width:auto;display:block"></a>
    <span class="vrule" aria-hidden="true"></span><span class="apptitle">${AREA === 'admin' ? 'Admin' : 'Profile'}</span>
    ${tabs.length ? `<nav class="steps area-tabs" aria-label="Admin">${tabs.map(t => `<button data-act="go" data-to="${t[0]}" ${UI.screen === t[0] ? 'aria-current="page"' : ''}>${t[1]}</button>`).join('')}</nav>` : ''}
    <div class="hdr-r">${AREA === 'admin' && UI.screen === 'setup' && S ? saveChip() : ''}<a class="lnk hdr-back hdr-app" href="/">${backLabel()}</a>${avatar()}</div>
  </div>${AREA === 'admin' && UI.screen === 'setup' ? docband() : ''}</header>`;
}
const backLabel = () => (SRV.exists ? 'Open the engagement' : 'Back to the app');
const areaMsg = (title, text) => `<div class="adm-msg"><h1 class="h1" style="font-size:30px">${esc(title)}</h1><p class="soft">${text}</p><p style="margin-top:18px"><a class="btn" href="/">Back to the app</a></p></div>`;
function renderArea(app) {
  const ae = document.activeElement, fid = ae && ae.id; let sel = null;
  try { if (ae && ae.selectionStart != null) sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) {}
  let main;
  if (!SRV.checked) main = '<p class="soft" style="padding:40px 0">Loading…</p>';
  else if (!SRV.on) main = areaMsg(SRV.code === 'no_access' ? 'No access' : 'Could not connect', esc(SRV.reason) + (SRV.code === 'no_access' ? ' <a href="/auth/logout">Sign out</a>' : ''));
  else if (AREA === 'profile') main = screenProfile();
  else if (!SRV.user.isAdmin) main = areaMsg('Administrators only', 'Admin is for administrators. Ask an administrator if you need something set up or a user added.');
  else if (UI.screen === 'users') main = screenUsers();
  else if (UI.screen === 'activity') main = screenActivity();
  else if (UI.screen === 'notifications') main = screenNotifications();
  else if (!S) main = screenStart();
  else { applyIdentity(); versionCheck(); main = screenSetup(); }
  app.innerHTML = areaHeader() + `<main id="main" tabindex="-1" class="area-main"><div class="wrap">${main}</div></main>`;
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange && /text|search|email|textarea/.test(el.type || el.tagName.toLowerCase())) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
  else if (ADM.adding || ADM.editing) { const f = document.getElementById('f-email'); if (f) f.focus(); }
}
function screenStart() {
  return `${opening('Admin · set-up', 'Set up the engagement', 'Start the engagement here. Everyone taking part then works on it in the app.')}
  <div class="acts" style="max-width:640px">
    <button class="act" data-act="new"><span class="mono" style="color:var(--aubergine)">01</span><span><strong>Start the engagement</strong><br><span class="small soft">Begin with the framework's function list.</span></span></button>
    <button class="act" data-act="open"><span class="mono" style="color:var(--aubergine)">02</span><span><strong>Start from an engagement file</strong><br><span class="small soft">A .json file saved from this app. People are taken from the user list, so check owners and proposers afterwards.</span></span></button>
  </div>`;
}
/* Several roles per person (task 0.6): one checkbox per role, as in AI Use Assessment's Admin. None ticked = no engagement role. */
/* With the shared identity (plan task 1B.2): the person's roles in the other Triodian apps, shown under this app's. */
const otherApps = u => ((ADM.others || {})[u.id] || []).map(o => `<div class="small soft" style="margin-top:4px">${esc(o.name)}: ${o.roleNames.length ? o.roleNames.map(esc).join(', ') : 'no role'}${o.isAdmin ? ' · admin' : ''}${o.active ? '' : ' · inactive'}</div>`).join('');
function roleChecks(u) { const cur = rolesOf(u); return `<fieldset class="acts2" style="border:0;padding:0;margin:0"><legend class="small" style="font-weight:600;margin-bottom:4px">Engagement roles <span class="soft" style="font-weight:400">· one person may hold more than one</span></legend><div class="row" style="gap:4px 16px;flex-wrap:wrap">${ADM.roles.map(r => `<label class="cb small"><input type="checkbox" name="f-roles" value="${esc(r.id)}" ${cur.includes(r.id) ? 'checked' : ''}> ${esc(r.name)}</label>`).join('')}</div></fieldset>`; }
function userForm(u, isNew) {
  return `<form class="adm-form" id="userForm" data-id="${esc(u.id || '')}" novalidate>
    <label class="f">Email<input class="in" id="f-email" type="email" autocomplete="off" value="${esc(u.email || '')}"></label>
    <label class="f">Name<input class="in" id="f-name" value="${esc(u.name || '')}"></label>
    <label class="f">Organisation<input class="in" id="f-org" value="${esc(u.organisation || '')}"></label>
    ${roleChecks(u)}
    <div class="acts2"><label class="cb"><input type="checkbox" id="f-admin" ${u.isAdmin ? 'checked' : ''}> Administrator (set-up and users)</label>
      ${isNew ? '' : `<label class="cb"><input type="checkbox" id="f-active" ${u.active !== false ? 'checked' : ''}> Active (can sign in)</label>`}</div>
    ${u.pendingEmail ? `<p class="small soft acts2">Has asked to change their email to ${esc(u.pendingEmail)} (not yet confirmed).</p>` : ''}
    ${ADM.err ? `<p class="err acts2" role="alert">${esc(ADM.err)}</p>` : ''}
    <div class="acts2"><button class="btn primary sm" type="submit">${isNew ? 'Add user' : 'Save changes'}</button><button class="btn sm" type="button" data-act="admCancel">Cancel</button></div>
  </form>`;
}
function screenUsers() {
  if (!ADM.loaded) return '<p class="soft" style="padding:40px 0">Loading…</p>';
  const me = SRV.user, active = ADM.users.filter(u => u.active).length;
  const rows = ADM.users.map(u => {
    if (ADM.editing === u.id) return `<tr class="adm-edit"><td colspan="7">${userForm(ADM.draft || u, false)}</td></tr>`;
    return `<tr class="${u.active ? '' : 'off'}">
      <td><strong>${esc(u.name || '—')}</strong>${u.id === me.id ? ' <span class="badge b-aub">you</span>' : ''}<div class="em">${esc(u.email)}</div></td>
      <td class="adm-hide-sm">${esc(u.organisation)}</td>
      <td>${rolesOf(u).length ? rolesOf(u).map(r => esc(roleLong(r))).join('<br>') : '<span class="soft">None</span>'}${otherApps(u)}</td>
      <td>${u.isAdmin ? '<span class="badge b-aub">Admin</span>' : ''}</td>
      <td>${u.active ? '<span class="badge b-green">Active</span>' : '<span class="badge b-grey">Inactive</span>'}</td>
      <td class="adm-hide-sm small soft">${u.lastSeenAt ? fmtLocal(u.lastSeenAt) : 'Never'}</td>
      <td style="text-align:right"><button class="btn sm" data-act="admEdit" data-id="${esc(u.id)}">Edit</button></td></tr>`;
  }).join('');
  const reqs = ADM.requests.length ? `<section class="adm-sec"><h2>Waiting for access</h2>
    <p class="small soft" style="margin:4px 0 12px">These people signed in but are not users, so they could not open the app.</p>
    <div class="tw"><table class="lg"><thead><tr><th>Email</th><th>Last tried</th><th class="adm-hide-sm">Attempts</th><th></th></tr></thead><tbody>
    ${ADM.requests.map(r => `<tr><td class="em">${esc(r.email)}</td><td class="small">${fmtLocal(r.last_at)}</td><td class="adm-hide-sm small">${esc(r.attempts)}</td>
      <td style="text-align:right;white-space:nowrap"><button class="btn sm primary" data-act="admGrant" data-email="${esc(r.email)}">Add as user</button> <button class="btn sm" data-act="admDismiss" data-email="${esc(r.email)}">Dismiss</button></td></tr>`).join('')}
    </tbody></table></div></section>` : '';
  const perms = `<section class="adm-sec"><h2>Roles and permissions</h2>
    <p class="small soft" style="margin:4px 0 12px">What each engagement role can change. The server checks every save against these rules.</p>
    <div class="tw"><table class="lg perm"><thead><tr><th>Can change</th>${ADM.roles.map(r => `<th class="r">${esc(r.name)}</th>`).join('')}</tr></thead><tbody>
    ${ADM.perms.map(p => p.adminOnly ? `<tr><td>${esc(p.what)}</td><td colspan="${ADM.roles.length}" class="adminonly">Administrators only</td></tr>` : `<tr><td>${esc(p.what)}</td>${ADM.roles.map(r => p.roles.includes(r.id) ? '<td class="y" aria-label="yes">✓</td>' : '<td class="n" aria-label="no">·</td>').join('')}</tr>`).join('')}
    </tbody></table></div>
    <p class="small soft" style="margin-top:10px">A user with no engagement role can read the engagement but not change it.</p></section>`;
  return `${opening('Admin · users', 'Users and access', '')}
  ${reqs}
  <section class="adm-sec">
    <div class="row between"><p class="small soft" style="margin:0">${active} active of ${ADM.users.length}. Only active users can open the app. Their engagement role decides what they can change.</p>
    ${ADM.adding ? '' : '<button class="btn primary" data-act="admAdd">Add user</button>'}</div>
    ${ADM.adding ? `<div class="card" style="margin:14px 0"><h3 class="sh">New user</h3>${userForm(ADM.draft || { isAdmin: false }, true)}</div>` : ''}
    <div class="tw" style="margin-top:12px"><table class="lg adm-users"><thead><tr><th>Name and email</th><th class="adm-hide-sm">Organisation</th><th>Engagement role</th><th>Admin</th><th>Status</th><th class="adm-hide-sm">Last seen</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div>
    <p class="small soft" style="margin-top:10px">Users are deactivated rather than deleted, so their names stay on the decisions they made.</p>
  </section>${perms}`;
}
const AUDIT_NAME = { 'user.create': 'Added user', 'user.update': 'Changed user', 'user.profile': 'Updated own profile', 'user.email_requested': 'Asked to change email', 'user.email': 'Confirmed new email', 'engagement.create': 'Started the engagement', 'engagement.save': 'Saved the engagement', 'engagement.refused': 'Save refused', 'engagement.next_review': 'Started the next review' };
function auditDetail(e) {
  const d = e.detail || {}, v = (k, x) => x === null || x === '' || x === undefined || (Array.isArray(x) && !x.length) ? '—' : k === 'role' ? roleLong(x) : k === 'roles' ? x.map(roleLong).join(', ') : x;
  if (e.action === 'user.create') return `${d.email || ''}${(d.roles || (d.role ? [d.role] : [])).length ? ' · ' + (d.roles || [d.role]).map(roleLong).join(', ') : ''}${d.isAdmin ? ' · admin' : ''}${d.reason ? ' · ' + d.reason : ''}`;
  if (e.action === 'user.update' || e.action === 'user.profile') return `${d.email || ''}: ` + Object.entries(d.changed || {}).map(([k, c]) => `${k} ${v(k, c.from)} → ${v(k, c.to)}`).join('; ');
  if (e.action === 'user.email_requested' || e.action === 'user.email') return `${d.from} → ${d.to}`;
  if (e.action === 'engagement.save' || e.action === 'engagement.create') return `revision ${d.revision}${d.changes ? ' · ' + d.changes + ' change' + (d.changes === 1 ? '' : 's') : ''}${d.mergedWith ? ' · merged with changes by ' + d.mergedWith : ''}`;
  if (e.action === 'engagement.next_review') return `${d.label || ''} kept as an earlier review; next review started`;
  if (e.action === 'engagement.refused') return d.reason || '';
  return '';
}
function screenNotifications() {
  if (!ADM.loaded) return '<p class="soft" style="padding:40px 0">Loading…</p>';
  const st = { held: ['Held', 'b-grey'], sending: ['Sending', 'b-ochre'], sent: ['Sent', 'b-green'], failed: ['Failed', 'b-red'] };
  return `${opening('Admin · notifications', 'Notifications', 'Emails the app sends when something needs someone: a question for counsel, a challenge on their position, a position for them to set, the appetite agreed or approved, and a daily reminder of positions due soon.')}
    <div class="next ${ADM.sending ? 'ok' : 'warn'}" style="margin-bottom:20px"><div><div class="next-k">${ADM.sending ? 'Sending is on' : 'Sending is off'}</div><p>${ADM.sending ? 'Messages are emailed as they are created.' : 'Messages are created and listed here, but not emailed. Sending is switched on in the site’s Cloudflare settings once an email service is chosen (see wrangler.jsonc).'} People can turn emails off in their profile.</p></div></div>
    ${(ADM.notes || []).length ? `<div class="tw"><table class="lg adm-log"><thead><tr><th>When</th><th>To</th><th>Subject</th><th>Status</th></tr></thead><tbody>
    ${ADM.notes.map(x => `<tr><td class="when">${fmtLocal(x.created_at)}</td><td>${esc(x.to_email)}</td><td><details><summary>${esc(x.subject)}</summary><pre class="notebody">${esc(x.body)}</pre></details></td><td>${badge(...(st[x.status] || [x.status, 'b-grey']))}${x.error ? `<div class="mini" style="color:var(--red)">${esc(x.error)}</div>` : ''}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="soft small">None yet.</p>'}`;
}
function screenActivity() {
  if (!ADM.loaded) return '<p class="soft" style="padding:40px 0">Loading…</p>';
  return `${opening('Admin · activity', 'Activity', 'User changes and engagement saves, newest first. Detailed edits are in the engagement’s own history.')}
    ${ADM.audit.length ? `<div class="tw"><table class="lg adm-log"><thead><tr><th>When</th><th>Who</th><th>What</th><th class="adm-hide-sm">Details</th></tr></thead><tbody>
    ${ADM.audit.map(e => `<tr><td class="when">${fmtLocal(e.at)}</td><td>${esc(e.actor)}</td><td>${esc(AUDIT_NAME[e.action] || e.action)}</td><td class="adm-hide-sm">${esc(auditDetail(e))}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="soft small">Nothing yet.</p>'}`;
}
const tzList = () => { try { return Intl.supportedValuesOf('timeZone'); } catch (e) { return ['Australia/Brisbane', 'Australia/Sydney', 'Australia/Melbourne', 'Australia/Adelaide', 'Australia/Perth', 'Australia/Hobart', 'Australia/Darwin', 'Pacific/Auckland', 'Asia/Singapore', 'Asia/Hong_Kong', 'Europe/London', 'America/New_York', 'UTC']; } };
function screenProfile() {
  const u = SRV.user;
  return `${opening('Your profile', esc(u.name || u.email), '')}
  <div class="stack" style="max-width:720px">
  <section class="card"><h2 class="sh">Your details</h2>
    <form id="profileForm" class="adm-form" novalidate>
      <label class="f">Name<input class="in" id="p-name" value="${esc(u.name)}" autocomplete="name"></label>
      <label class="f">Organisation<input class="in" id="p-org" value="${esc(u.organisation)}" autocomplete="organization"></label>
      ${PRF.err ? `<p class="err acts2" role="alert">${esc(PRF.err)}</p>` : ''}${PRF.msg ? `<p class="small acts2" style="color:var(--green)" role="status">${esc(PRF.msg)}</p>` : ''}
      <div class="acts2"><button class="btn primary sm" type="submit">Save</button></div>
    </form></section>
  <section class="card"><h2 class="sh">Email address</h2>
    <p>You sign in as <strong>${esc(u.email)}</strong>.</p>
    ${u.pendingEmail ? `<div class="scope" style="margin-top:12px"><span aria-hidden="true">✉</span><span>You asked to change your email to <strong>${esc(u.pendingEmail)}</strong>. To confirm, <a href="/auth/logout">sign out</a> and sign in again with the new address; a code is sent there. Until then, keep using ${esc(u.email)}. <button class="lnk" data-act="cancelEmail">Cancel the change</button></span></div>`
    : `<form id="emailForm" class="adm-form" novalidate style="margin-top:12px">
      <label class="f">New email address<input class="in" id="p-email" type="email" autocomplete="email"></label>
      ${PRF.emailErr ? `<p class="err acts2" role="alert">${esc(PRF.emailErr)}</p>` : ''}
      <div class="acts2"><button class="btn sm" type="submit">Change email</button><span class="small soft">You confirm it by signing in with the new address.</span></div></form>`}
  </section>
  <section class="card"><h2 class="sh">Dates and times</h2>
    <div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
      <label class="f" for="p-df"><span>Date format</span><select class="in" id="p-df" data-act="pref">${[['long', '18 October 2026'], ['short', '18 Oct 2026'], ['numeric', '18/10/2026'], ['iso', '2026-10-18']].map(o => `<option value="${o[0]}" ${(u.dateFormat || 'long') === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></label>
      <label class="f" for="p-tz"><span>Time zone</span><select class="in" id="p-tz" data-act="pref"><option value="">Automatic · this device (${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)})</option>${tzList().map(z => `<option value="${esc(z)}" ${u.timeZone === z ? 'selected' : ''}>${esc(z.replace(/_/g, ' '))}</option>`).join('')}</select></label>
    </div>
    <p class="small soft" style="margin-top:8px">Used on screens wherever a date or time is shown, for example: last saved ${esc(fmtLocal(nowISO()))}. Documents for the board always use the full form, such as ${esc(dDoc(today()))}.</p>
    ${PRF.prefMsg ? `<p class="small" style="color:var(--green)" role="status">${esc(PRF.prefMsg)}</p>` : ''}</section>
  <section class="card"><h2 class="sh">Email notifications</h2>
    <label class="entry-skip" style="margin:0"><input type="checkbox" id="p-notify" data-act="pref" ${u.notify !== false ? 'checked' : ''}> Email me when something needs me: a question for counsel, a challenge on my position, a position for me to set, or the appetite agreed or approved</label>
    <p class="small soft" style="margin-top:8px">The same items are always listed under My actions.</p></section>
  <section class="card"><h2 class="sh">Introduction</h2>
    <label class="entry-skip" style="margin:0"><input type="checkbox" data-act="showIntro" ${introHidden() ? '' : 'checked'}> Show the introduction when the app opens, and the explanation before set-up and the worked example</label>
    <p class="small soft" style="margin-top:8px">This setting applies in this browser only.</p></section>
  <section class="card"><h2 class="sh">Access</h2>
    <dl class="kv"><dt>Engagement ${rolesOf(u).length > 1 ? 'roles' : 'role'}</dt><dd>${esc(rolesOf(u).length ? rolesOf(u).map(roleLong).join(', ') : 'None. You can read the engagement but not change it.')}</dd>
    <dt>Administrator</dt><dd>${u.isAdmin ? 'Yes · <a href="/admin/#set-up">open Admin</a>' : 'No'}</dd></dl>
    <p class="small soft" style="margin-top:10px">Roles are set by an administrator.</p></section>
  </div>`;
}
document.addEventListener('submit', async e => {
  const f = e.target; if (!['userForm', 'profileForm', 'emailForm'].includes(f.id)) return;
  e.preventDefault();
  const val = id => ((document.getElementById(id) || {}).value || '').trim();
  if (f.id === 'profileForm') {
    PRF.err = PRF.msg = '';
    const r = await api('PUT', '/api/me', { name: val('p-name'), organisation: val('p-org') });
    if (r.ok) { SRV.user = r.body.user; PRF.msg = 'Saved.'; } else PRF.err = r.error;
    return render();
  }
  if (f.id === 'emailForm') {
    PRF.emailErr = '';
    const r = await api('POST', '/api/me/email', { email: val('p-email') });
    if (r.ok) SRV.user = r.body.user; else PRF.emailErr = r.error;
    return render();
  }
  const id = f.dataset.id;
  const v = { email: val('f-email'), name: val('f-name'), organisation: val('f-org'), roles: [...document.querySelectorAll('input[name="f-roles"]:checked')].map(x => x.value), isAdmin: !!(document.getElementById('f-admin') || {}).checked, active: document.getElementById('f-active') ? document.getElementById('f-active').checked : true };
  ADM.draft = Object.assign({ id }, v);
  if (!v.email || !v.name) { ADM.err = 'Enter an email address and a name.'; return render(); }
  const r = id ? await api('PUT', '/api/admin/users/' + encodeURIComponent(id), v) : await api('POST', '/api/admin/users', v);
  if (!r.ok) { ADM.err = r.error; return render(); }
  ADM.err = ''; ADM.adding = false; ADM.editing = null; ADM.draft = null;
  if (id === SRV.user.id) { const me = await api('GET', '/api/me'); if (me.ok) SRV.user = me.body.user; }
  toast(id ? 'Saved ' + v.email : 'Added ' + v.email);
  await loadAdmin();
  if (AREA === 'admin') { const e2 = await api('GET', '/api/engagement'); if (e2.ok) SRV.people = e2.body.people || (e2.body.data && e2.body.data.people) || SRV.people; }
});

/* ---------- server storage ---------- */
/* One engagement per deployment. SRV.rev: the revision this browser last loaded or saved (0 = not started).
   SRV.state: 'saved' | 'pending' | 'saving' | 'error' | 'conflict'. Practice mode (the worked example) is never saved. */
const SRV = { checked: false, on: false, user: null, reason: '', code: '', exists: false, people: [], rev: 0, state: 'saved', err: '', timer: null, inflight: null, again: false, conflict: null, lastAt: '', lastBy: '' };
async function api(method, path, body) {
  let r;
  try { r = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin', redirect: 'manual', cache: 'no-store' }); }
  catch (e) { return { ok: false, status: 0, error: 'The server could not be reached. Check your connection.' }; }
  if (r.type === 'opaqueredirect' || r.status === 401) return { ok: false, status: 401, error: 'Your sign-in has expired. Reload the page to sign in again.' };
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok) return { ok: false, status: r.status, error: (j && j.error) || ('The server returned an error (' + r.status + ').'), code: j && j.code, body: j };
  return { ok: true, status: r.status, body: j };
}
const practice = () => !!(S && S.engagement.example);
const savesHere = () => SRV.on && S && !practice() && !UI.archived;
const myRole = () => (SRV.user && rolesOf(SRV.user)[0]) || 'none';
/* In the real engagement the signed-in user is the actor; only practice mode lets the role be switched. */
function applyIdentity() { if (!SRV.user || practice()) return; UI.personId = SRV.user.id; UI.role = myRole(); }
function autosave() {
  if (!savesHere() || SRV.state === 'conflict') return;
  SRV.state = 'pending'; clearTimeout(SRV.timer); SRV.timer = setTimeout(saveNow, 1200); paintSave();
}
/* Plain names for the items two people changed at once (paths from the server's merge). */
function conflictNames(paths) {
  if (!Array.isArray(paths) || !paths.length) return '';
  const name = p => p[0] === 'decisions' && p[2] === 'cells' && p[3] ? cellLabel(p[3]) : p[0] === 'challenge' ? 'a challenge point' : p[0] === 'questionsForCounsel' ? 'a question for counsel' : p[0] === 'engagement' ? 'engagement details (' + p[1] + ')' : p[0] === 'calibration' ? 'the calibration status' : p.slice(0, 2).join(' · ');
  return [...new Set(paths.map(name))].slice(0, 4).join('; ');
}
async function loadArchives() { const r = await api('GET', '/api/archive'); SRV.archives = r.ok ? r.body.entries : []; }
async function openArchive(id) {
  if (savesHere() && !(await flushSave())) return toast('Your changes are not saved yet. Try again in a moment.');
  const r = await api('GET', '/api/archive/' + encodeURIComponent(id));
  if (!r.ok) return toast(r.error);
  try { S = hydrate(r.body.data); } catch (e) { return toast('That earlier review could not be read: ' + e.message); }
  UI.archived = { id: r.body.id, label: r.body.label }; UI.drawer = false; UI.role = myRole(); go('overview');
}
async function saveNow() {
  clearTimeout(SRV.timer); SRV.timer = null;
  if (!savesHere() || SRV.state === 'conflict') return;
  if (SRV.inflight) { SRV.again = true; return SRV.inflight; }
  const snap = S, text = JSON.parse(JSON.stringify(S));
  SRV.state = 'saving'; paintSave();
  SRV.inflight = (async () => {
    const r = await api('PUT', '/api/engagement', { revision: SRV.rev, data: text });
    SRV.inflight = null;
    if (S !== snap) return;
    if (r.ok && r.body.merged && r.body.data) {
      // Someone else saved meanwhile; the server merged both sets of changes. Take the merged version,
      // keeping anything typed here while the save was on its way.
      let next = r.body.data;
      if (window.RAFMerge && JSON.stringify(S) !== JSON.stringify(text)) next = RAFMerge.merge3(text, JSON.parse(JSON.stringify(S)), next).data;
      try { const keep = { screen: UI.screen, open: UI.open, sel: UI.sel }; S = hydrate(next); Object.assign(UI, keep); applyIdentity(); } catch (e) { toast('Merged, but the result could not be shown. Reload the page.'); }
      toast('Saved, together with changes by ' + (r.body.mergedWith || 'someone else') + '.');
      render();
    }
    if (r.ok) { SRV.rev = r.body.revision; SRV.exists = true; document.querySelectorAll('.hdr-app').forEach(a => { a.textContent = backLabel(); }); SRV.lastAt = r.body.updatedAt; SRV.lastBy = r.body.updatedBy; SRV.err = ''; if (SRV.again) { SRV.again = false; SRV.state = 'pending'; return saveNow(); } SRV.state = 'saved'; UI.dirty = false; }
    else if (r.status === 409) { SRV.state = 'conflict'; SRV.conflict = r.body || {}; const items = conflictNames(SRV.conflict.conflicts); SRV.err = r.error + (items ? ' Item: ' + items + '.' : ''); toast(SRV.err); }
    else { SRV.state = 'error'; SRV.err = r.error; toast('Not saved: ' + r.error); }
    SRV.again = false; paintSave();
  })();
  return SRV.inflight;
}
async function flushSave() { if (!savesHere()) return true; if (SRV.state === 'pending' || SRV.timer) await saveNow(); else if (SRV.inflight) await SRV.inflight; return SRV.state === 'saved'; }
function saveLabel() {
  if (!S) return '';
  if (UI.archived) return ['b-grey', 'Read only', 'An earlier review, kept as it was. Nothing can be changed.'];
  if (practice()) return ['b-ochre', 'Practice · not saved', 'The worked example is for practice. Nothing here is saved.'];
  if (!SRV.on) return ['b-ochre', 'Not saved', 'The server is not reachable. Download a copy from the menu to keep your work.'];
  return { saved: ['b-green', 'Saved', SRV.lastAt ? 'Saved ' + fmtLocal(SRV.lastAt) + ' by ' + SRV.lastBy : 'Saved'], pending: ['b-grey', 'Saving…', 'Changes will be saved in a moment'], saving: ['b-grey', 'Saving…', 'Saving'], error: ['b-red', 'Not saved', SRV.err], conflict: ['b-red', 'Changed elsewhere', SRV.err] }[SRV.state] || ['b-grey', '', ''];
}
function saveChip() { const l = saveLabel(); if (!l || !l[1]) return ''; return `<button class="badge ${l[0]}" id="savechip" data-act="saveChip" title="${esc(l[2])}" aria-label="${esc(l[1])}" style="cursor:pointer"><span class="sdot" aria-hidden="true"></span><span class="st">${esc(l[1])}</span></button>`; }
function paintSave() { const el = document.getElementById('savechip'); if (el) el.outerHTML = saveChip(); }
/* Loads the saved engagement (or the start screen if none). */
async function loadReal(quiet) {
  const r = await api('GET', '/api/engagement');
  if (!r.ok) { if (!quiet) toast('Could not load the engagement: ' + r.error); return false; }
  SRV.people = r.body.people || (r.body.data && r.body.data.people) || [];
  SRV.exists = !!r.body.exists; SRV.rev = r.body.revision || 0; SRV.state = 'saved'; SRV.err = ''; SRV.conflict = null;
  SRV.lastAt = r.body.updatedAt || ''; SRV.lastBy = r.body.updatedBy || '';
  UI.dirty = false; UI.sel = null; lastSig = null;
  if (r.body.exists) { try { S = hydrate(r.body.data); } catch (e) { S = null; toast('The saved engagement could not be read: ' + e.message); return false; } applyIdentity(); if (!SRV.started && AREA === 'app') go(UI.screen && UI.screen !== 'entry' ? UI.screen : 'overview'); else render(); }
  else { S = null; if (AREA === 'app') UI.screen = 'entry'; render(); }
  SRV.started = true;
  return true;
}
/* When the tab comes back into view, pick up anyone else's saves (only if nothing is unsaved here). */
async function refreshIfQuiet() {
  if (!savesHere() || SRV.state !== 'saved' || SRV.inflight || UI.pop || UI.sheet) return;
  const ae = document.activeElement; if (ae && (/TEXTAREA|SELECT/.test(ae.tagName) || (ae.tagName === 'INPUT' && !/checkbox|radio|button|submit/.test(ae.type)))) return;
  const r = await api('GET', '/api/engagement');
  if (!r.ok || !r.body.exists || r.body.revision === SRV.rev || SRV.state !== 'saved' || !savesHere()) return;
  const screen = UI.screen; await loadReal(true); if (S) { UI.screen = screen; render(); } toast('Updated with the latest saved changes from ' + (r.body.updatedBy || 'another user') + '.');
}
/* Before leaving the current view of the engagement: wait for saving to finish; if it cannot be saved, ask. */
async function leave(what) {
  if (!S || practice()) return true;
  if (savesHere()) { if (await flushSave()) return true; return confirm('The latest changes could not be saved (' + (SRV.err || 'unknown error') + '). Discard them and ' + what + '?'); }
  if (UI.dirty) return confirm('Your changes are not saved anywhere. Discard them and ' + what + '?');
  return true;
}
/* The worked example opens by default. Leaving it is remembered for this browser session, so a reload stays out.
   A link to My actions (from an email) opens the real engagement. Same in all Triodian apps. */
const EX_LEFT = 'triodian.example.left';
const exampleLeft = () => { try { return sessionStorage.getItem(EX_LEFT) === '1'; } catch (e) { return false; } };
const markExampleLeft = left => { try { if (left) sessionStorage.setItem(EX_LEFT, '1'); else sessionStorage.removeItem(EX_LEFT); } catch (e) {} };
const openExampleByDefault = () => !exampleLeft() && location.hash !== '#actions';
function startPractice() { S = buildExample(); UI.personId = ''; UI.role = 'triodian'; UI.dirty = false; UI.sel = null; lastSig = null; go('overview'); }
function startEngagement(state) {
  S = state; S.engagement.example = false; S.engagement.autosave = false; S.people = SRV.people.map(p => ({ ...p, areas: [] }));
  SRV.rev = 0; SRV.state = 'saved'; SRV.err = ''; SRV.conflict = null; UI.sel = null; lastSig = null; applyIdentity();
}

/* ---------- worked example (fictional) ---------- */
function buildExample() {
  const X = newEngagement();
  Object.assign(X.engagement, { insurer: 'Corvane General Insurance (fictional)', reference: 'RAF-CGI-2026-01', counselFirm: 'Askew Lane Partners (fictional)', practitioner: { firm: 'Askew Lane Partners (fictional)', line: 'Prepared by Askew Lane Partners using the Triodian method', logo: TriodianBrand.EXAMPLE_LOGO }, privilegeMarking: 'Privileged and confidential · prepared at the direction of counsel · worked example', sessionDates: ['2026-10-15', '2026-10-22'], example: true, notificationHours: '72' });
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
  const old = S; S = X; const role = UI.role, force = UI.forceRole; UI.role = 'cro'; UI.forceRole = true;
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
    { ref: 'CH-02', raisedBy: 'p2', decision: 'd2', cell: 'd2.C4', point: 'The hardship part of C4 Policyholder harm has no definition. Two people assessing the same case could reach different levels.', response: '', status: 'open' }
  ];
  X.measureOwners = { M1: 'p3', M2: 'p1', M3: 'p2', M4: 'p1', M5: 'p2', M6: 'p1', M7: 'p4', M8: 'p2', M9: 'p1' };
  X.history = [{ at: '2026-10-15T10:05:00.000Z', by: 'Triodian', action: 'session', target: 'session 1', from: null, to: 'opened', version: 0 }, { at: '2026-10-22T09:30:00.000Z', by: 'Triodian', action: 'session', target: 'session 2', from: null, to: 'opened', version: 0 }];
  S = old; UI.role = role; UI.forceRole = force; return X;
}

/* ---------- events ---------- */
function onClick(e) {
  if (UI.acct && !e.target.closest('.acct')) { UI.acct = false; render(); }
  const ac = e.target.closest('[data-act="acct"]'); if (ac) { UI.acct = !UI.acct; render(); if (UI.acct) { const f = document.querySelector('.acct-menu [role=menuitem]'); if (f) f.focus(); } return; }
  const pt = e.target.closest('[data-pact]');
  if (pt) { const a = pt.dataset.pact;
    if (a === 'close') closePop(); else if (a === 'back') { UI.pop.stack.pop(); renderPop(); }
    else if (a === 'more' && pt.dataset.id.startsWith('check:')) { const k = pt.dataset.id.slice(6); closePop(true); popAnchor = null; go('checks'); const el = document.getElementById('ck-' + k); if (el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 90); }
    else if (a === 'more') { const id = pt.dataset.id; closePop(true); popAnchor = null; go('reference'); const el = document.getElementById('g-' + id); if (el) { window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 90); el.style.background = 'var(--aubergine-bg)'; } }
    return; }
  const term = e.target.closest('.term, .ckchip');
  if (term) { e.preventDefault(); const id = term.dataset.term; if (term.closest('#poproot') && UI.pop) { UI.pop.stack.push(id); renderPop(); } else if (UI.pop && popAnchor === term) closePop(); else openPop(id, term); return; }
  if (UI.pop && !e.target.closest('#poproot')) closePop(true);
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, d = el.dataset;
  if (el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type !== 'button')) return;
  const gateOf = { addPerson: 'setup', rmPerson: 'setup', addFn: 'setup', rmFn: 'setup', addOp: 'setup', rmOp: 'setup', useStart: d.d, bulkOwner: d.d, addQC: d.d, addJur: 'd6', rmJur: 'd6', addTrig: 'd7', rmTrig: 'd7', addEvent: 'd8', rmEvent: 'd8', loadExtract: 'd3', notSet: (d.cell || '').split('.')[0], clearNotSet: (d.cell || '').split('.')[0] }[a];
  if (gateOf && !can(gateOf)) return toast(blockReason(gateOf));
  const A = {
    go: () => go(d.to), drawer: () => { UI.drawer = !UI.drawer; render(); },
    save: () => saveEngagement(),
    open: () => { if (SRV.exists) return toast('The engagement has already been started.'); if (AREA !== 'admin') return; document.getElementById('fileIn').click(); },
    admAdd: () => { ADM.adding = true; ADM.editing = null; ADM.err = ''; ADM.draft = null; render(); },
    admGrant: () => { ADM.adding = true; ADM.editing = null; ADM.err = ''; ADM.draft = { email: d.email, isAdmin: false }; render(); window.scrollTo({ top: 0 }); },
    admEdit: () => { ADM.editing = d.id; ADM.adding = false; ADM.err = ''; ADM.draft = null; render(); },
    admCancel: () => { ADM.editing = null; ADM.adding = false; ADM.err = ''; ADM.draft = null; render(); },
    admDismiss: async () => { await api('POST', '/api/admin/access-requests/dismiss', { email: d.email }); loadAdmin(); },
    cancelEmail: async () => { const r = await api('DELETE', '/api/me/email'); if (r.ok) { SRV.user = r.body.user; PRF.msg = 'Email change cancelled.'; } else PRF.err = r.error; render(); },
    new: () => { if (SRV.exists || AREA !== 'admin') return; startEngagement(newEngagement()); go('setup'); },
    example: () => leave('open the worked example').then(ok => { if (ok) { UI.guide = null; markExampleLeft(false); startPractice(); } }),
    guide: () => {
      if (introHidden() && !d.explicit) { if (d.g === 'practice') return A.example(); if (d.g === 'setup' && SRV.user && SRV.user.isAdmin) { location.href = '/admin/#set-up'; return; } }
      UI.guide = d.g; UI.drawer = false; render(); const o = document.querySelector('.overlay'); if (o) o.scrollTop = 0; },
    guideBack: () => { UI.guide = null; render(); },
    openArchive: () => openArchive(d.id),
    leaveArchive: () => { UI.archived = null; UI.drawer = false; S = null; loadReal(); },
    nextReview: async () => {
      if (!confirm('Start the next review?\n\nThe current engagement (approved version ' + S.calibration.version + ') is kept as a read-only earlier review. A new review starts with the same set-up and people, and with the approved positions as starting positions. Challenge points, questions and approvals start empty.')) return;
      const r = await api('POST', '/api/admin/next-review', { revision: SRV.rev });
      if (!r.ok) return toast(r.error);
      toast('Next review started. ' + r.body.label + ' is kept under Earlier reviews.'); await loadArchives(); await loadReal();
    },
    leavePractice: () => { UI.drawer = false; S = null; markExampleLeft(true); if (SRV.on) loadReal(); else render(); },
    saveChip: () => {
      if (SRV.state === 'error') { if (SRV.err && /cannot change|history/.test(SRV.err)) { if (confirm(SRV.err + '\n\nReload the saved engagement? Your unsaved changes here will be lost.')) loadReal(); } else saveNow(); return; }
      if (SRV.state === 'conflict') {
        const c = SRV.conflict || {};
        const items = conflictNames(c.conflicts);
        if (!confirm((items ? 'You and ' + (c.updatedBy || 'someone else') + ' changed the same item at the same time: ' + items + '.' : 'Someone else' + (c.updatedBy ? ' (' + c.updatedBy + ')' : '') + ' saved the engagement' + (c.updatedAt ? ' at ' + fmtLocal(c.updatedAt) : '') + ' after you opened it.') + ' Your latest changes were not saved.\n\nOK: download your version as a file, then load the saved one and redo your change.\nCancel: stay here without saving.')) return;
        saveEngagement(); loadReal(); return;
      }
      toast(saveLabel()[2]);
    },
    addFn: () => { S.functions.push({ id: 'f' + uid(), name: 'New function' }); S.functionsConfirmed = false; log('addFunction', 'functions'); render(); },
    rmFn: () => { const f = S.functions[+d.i]; if (confirm('Remove ' + f.name + '?')) { S.functions.splice(+d.i, 1); S.functionsConfirmed = false; log('removeFunction', 'functions', f.name, null); render(); } },
    addOp: () => { S.criticalOperations.push({ id: 'o' + uid(), name: '', tolerance: '', source: '' }); log('addCriticalOperation', 'criticalOperations'); render(); },
    rmOp: () => { const o = S.criticalOperations.splice(+d.i, 1)[0]; log('removeCriticalOperation', 'criticalOperations', o.name, null); render(); },
    useStart: () => { const ids = []; cellsFor(d.d).forEach(c => { const sv = startingValue(c.id), p = P(c.id); if (sv && (!p || p.status === 'unset')) { setValue(c.id, sv, 'startingPosition', true); ids.push(c.id); } }); if (ids.length) log('useStartingPosition', d.d, null, ids.join(', ')); render(); toast(ids.length ? `Starting position copied into ${ids.length} ${ids.length === 1 ? 'cell' : 'cells'}. Each needs a proposer.` : 'No empty cells with a starting value.'); },
    showRef: () => { UI.showRef = !UI.showRef; if (UI.showRef) { S.decisions.d3.referenceShown.push({ at: nowISO(), by: ROLE_NAME[UI.role] }); log('referenceShown', 'd3', null, 'Appendix A shown'); } render(); },
    details: () => { UI.sel = d.cell; if (bp() === 'phone') { UI.sheet = d.cell; renderSheet(); } else openDet(d.cell); },
    toggleDet: () => { if (UI.open === d.cell) closeDet(d.cell); else openDet(d.cell); },
    closeDet: () => closeDet(d.cell),
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
    loadDirFile: () => document.getElementById('dirIn').click(),
    loadFeed: async () => { if (practice()) return toast('In the worked example, load a file instead.'); toast('Reading the in-use feed from AI Use Assessment…'); const r = await api('GET', '/api/feedback-from-assessment'); if (!r.ok) return toast(r.code === 'not_linked' ? r.error : 'Could not load: ' + r.error); if (useExtract(r.body, 'assessment')) render(); },
    loadDirBoard: async () => { if (practice()) return toast('The worked example has no board directions to load.'); toast('Reading the board directions from AI Board Direction…'); const r = await api('GET', '/api/directions-from-board'); if (!r.ok) return toast(r.code === 'not_linked' ? r.error : 'Could not load: ' + r.error); if (useDirections(r.body, 'board')) { render(); toast('Board directions loaded: version ' + (r.body.version || '')); } },
    clearDir: () => { if (!can('setup')) return toast(blockReason('setup')); const from = S.boardDirections ? S.boardDirections.file.version : null; delete S.boardDirections; log('boardDirections', 'setup', from, 'removed'); render(); },
    agree: () => agreeWorking(), approve: () => recordApproval(document.getElementById('ap-date').value, document.getElementById('ap-min').value.trim(), document.getElementById('ap-by').value.trim()),
    goTab: () => { if (d.tab) { if (d.to === 'challenge') UI.chTab = d.tab; if (d.to === 'outputs') UI.outTab = d.tab; } go(d.to); },
    outTab: () => { UI.outTab = d.t; render(); }, chTab: () => { UI.chTab = d.t; render(); },
    copy: () => { if (d.t === 'calibration' && exportBlocked()) return toast('Export blocked: checks failing.'); copyText(outputFor(d.t)[0]()); }, download: () => { if (d.t === 'calibration' && exportBlocked()) return toast('Export blocked: checks failing.'); const [fn, sl] = outputFor(d.t); download(`RAF-${slug(S.engagement.insurer)}-${sl}-v${S.calibration.version}.md`, fn(), 'text/markdown'); },
    downloadDocx: () => { if (d.t === 'calibration' && exportBlocked()) return toast('Export blocked: checks failing.'); if (!window.RAFExport) return toast('Word export did not load. Reload the page.'); const [fn, sl] = outputFor(d.t), name = `RAF-${slug(S.engagement.insurer)}-${sl}-v${S.calibration.version}`;
      toast('Preparing the Word document…'); RAFExport.toDocx(fn(), { insurer: S.engagement.insurer, reference: S.engagement.reference, creator: 'Triodian AI Risk Appetite', brand: S.engagement.practitioner }).then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.docx'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); toast('Word document downloaded'); }, () => toast('The Word document could not be made. Try again, or use Download PDF.')); },
    printPdf: () => { if (d.t === 'calibration' && exportBlocked()) return toast('Export blocked: checks failing.'); if (!window.RAFExport) return toast('PDF export did not load. Reload the page.'); const [fn, sl] = outputFor(d.t); RAFExport.printPdf(fn(), { insurer: S.engagement.insurer, reference: S.engagement.reference, brand: S.engagement.practitioner, fileBase: `RAF-${slug(S.engagement.insurer)}-${sl}-v${S.calibration.version}` }, mdToHtml); toast('In the print dialog, choose Save as PDF'); },
    downloadJson: () => exportBlocked() ? toast('Export blocked: checks failing.') : download(`RAF-${slug(S.engagement.insurer)}-calibration-v${S.calibration.version}.json`, JSON.stringify(calibrationSet(), null, 2), 'application/json'),
    copyJson: () => exportBlocked() ? toast('Export blocked: checks failing.') : copyText(JSON.stringify(calibrationSet(), null, 2)),
    addCH: () => { const by = document.getElementById('ch-by').value, pt = document.getElementById('ch-point').value.trim(), dc = document.getElementById('ch-dec').value; if (!can(dc)) return toast(blockReason(dc)); if (!by || !pt) return toast('Choose who raised it and write the point.'); const ref = 'CH-' + String(S.challenge.length + 1).padStart(2, '0'); S.challenge.push({ ref, raisedBy: by, decision: dc, cell: document.getElementById('ch-cell').value, point: pt, response: '', status: 'open' }); log('challenge', ref, null, 'raised'); render(); }
  };
  if (A[a]) A[a]();
}
function onChange(e) { inChange = true; try { changeHandler(e); } finally { inChange = false; } }
function changeHandler(e) {
  const t = e.target, d = t.dataset;
  if (d.act === 'role') { if (!practice() && SRV.user) { render(); return; } const [k, v] = t.value.split(':'); if (k === 'p') { const p = person(v); if (p) { UI.personId = p.id; UI.role = rolesOf(p)[0] || 'none'; } } else { UI.personId = ''; UI.role = v; } UI.err = {}; render(); toast('Acting as ' + actor()); return; }
  if (d.act === 'hideIntro') { setIntroHidden(t.checked); return; }
  if (d.act === 'showIntro') { setIntroHidden(!t.checked); PRF.msg = ''; return; }
  if (d.act === 'cmp') { const v = t.value === 'now' ? 'now' : +t.value; if (d.k === 'from') UI.cmpFrom = v; else UI.cmpTo = v; render(); return; }
  if (d.act === 'pref') { const df = (document.getElementById('p-df') || {}).value || 'long', tz = (document.getElementById('p-tz') || {}).value || '';
    api('PUT', '/api/me/prefs', { dateFormat: df, timeZone: tz, notify: (document.getElementById('p-notify') || {}).checked !== false }).then(r => { if (r.ok) { SRV.user = r.body.user; PRF.prefMsg = 'Saved.'; } else PRF.prefMsg = r.error || 'Could not save.'; render(); }); return; }
  if (d.act === 'chFilter') { UI.chFilter = t.value; render(); return; }
  if (d.act === 'chDec') { UI.chDec = t.value; render(); return; }
  if (t.id === 'fileIn') { if (t.files[0]) openFile(t.files[0]); t.value = ''; return; }
  if (t.id === 'dirIn') { const f = t.files[0]; t.value = ''; if (!f) return; const fr = new FileReader(); fr.onload = () => { let o; try { o = JSON.parse(fr.result); } catch (e) { return toast('That file is not JSON.'); } if (useDirections(o, 'file')) { render(); toast('Board directions loaded: version ' + (o.version || '')); } }; fr.readAsText(f); return; }
  if (t.id === 'extractIn') { const f = t.files[0]; t.value = ''; if (!f) return; const fr = new FileReader(); fr.onload = () => { let o; try { o = JSON.parse(fr.result); } catch (er) { return toast('Rejected: the file is not JSON.'); } if (useExtract(o, 'file')) render(); }; fr.readAsText(f); return; }
  if (d.cell && !d.pf) { if (t.value === '__ns') return; setValue(d.cell, t.value.trim ? t.value.trim() : t.value); UI.sel = d.cell; render(); return; }
  if (d.pf) { const v = t.type === 'checkbox' ? t.checked : t.value; const p = getPos(d.cell); const from = p[d.pf]; if (from === v) return; setField(d.cell, d.pf, v, from); render(); return; }
  if (d.cur) { const did = d.cur.split('.')[0]; if (!canEdit(did) || did === 'd2') { toast(blockReason(did)); render(); return; } if (t.value) S.current[did][d.cur] = t.value; else delete S.current[did][d.cur]; log('currentState', d.cur, null, t.value || null); render(); return; }
  if (d.area != null) { if (!can('setup')) { toast(blockReason('setup')); render(); return; } const p = S.people[+d.area]; p.areas = p.areas || []; if (t.checked) p.areas.push(t.value); else p.areas = p.areas.filter(x => x !== t.value); log('areas', 'people.' + d.area, null, p.areas.join(',')); render(); return; }
  if (d.path === 'engagement.sectorPack') { if (packLocked()) { toast('The sector pack is fixed once a position is recorded.'); render(); return; } const from = packId(); setPath(d.path, t.value); if (packId() !== from) switchPack(from); render(); return; }
  if (d.path) { setPath(d.path, t.type === 'checkbox' ? t.checked : t.value); render(); return; }
}
function onInput(e) {
  const t = e.target;
  if (t.classList && t.classList.contains('cellta')) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; }
  if (t.dataset.act === 'refq') { UI.refQ = t.value; render(); return; }
  if (t.dataset.path && t.type !== 'checkbox' && t.tagName !== 'SELECT') UI.dirty = true; /* state is written on change, so history keeps the true "from" */
}
function onFocusIn(e) {
  const t = e.target;
  if (t.dataset && t.dataset.cell && !t.dataset.pf && bp() !== 'phone' && UI.sel !== t.dataset.cell) { UI.sel = t.dataset.cell; refreshDetails(); }
}
function onKey(e) {
  const t = e.target, typing = /INPUT|TEXTAREA|SELECT/.test(t.tagName);
  if (e.key === 'Escape' && UI.acct) { UI.acct = false; render(); const b = document.querySelector('[data-act="acct"]'); if (b) b.focus(); return; }
  if (e.key === 'Escape') { if (UI.guide) { UI.guide = null; render(); return; } if (UI.pop) { closePop(); return; } if (UI.sheet) { UI.sheet = null; renderSheet(); return; } if (UI.open && bp() !== 'phone') { closeDet(UI.open); return; } if (UI.drawer) { UI.drawer = false; render(); return; } }
  if (t.dataset && t.dataset.gr) {
    const isSel = t.tagName === 'SELECT', k = e.key;
    const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
    if (t.tagName === 'TEXTAREA' && k === 'Enter' && !e.shiftKey) { e.preventDefault(); t.blur(); return; }
    if (!mv || (!isSel && mv[1] !== 0) || e.altKey) return;
    if (t.tagName === 'TEXTAREA' && ((mv[0] < 0 && t.selectionStart > 0) || (mv[0] > 0 && t.selectionEnd < t.value.length))) return;
    e.preventDefault();
    const r = +t.dataset.r + mv[0], c = +t.dataset.c + mv[1];
    const nx = document.querySelector(`[data-gr="${t.dataset.gr}"][data-r="${r}"][data-c="${c}"]`); if (nx) nx.focus();
  }
}

/* ---------- boot ---------- */
async function boot() {
  BASE = window.RAF_CONTENT || null;
  if (!BASE || !BASE.packs || !window.TriodianPacks) { document.getElementById('app').innerHTML = '<p style="padding:40px;font-family:sans-serif">content.js or packs.js could not be loaded. Keep both beside index.html.</p>'; return; }
  applyPack();

  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  TriodianBrand.bind(v => { setPath('engagement.practitioner.logo', v); render(); }, toast);
  document.addEventListener('input', onInput);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('keydown', onKey);
  // Keep the Current state panels open across re-renders.
  document.addEventListener('toggle', ev => { const t = ev.target; if (t && /^cur-d\d$/.test(t.id || '')) { UI.openCur = UI.openCur || {}; UI.openCur[t.id.slice(4)] = t.open; } }, true);
  let sy0 = null; document.addEventListener('touchstart', e => { if (e.target.closest('.handle')) sy0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchmove', e => { if (sy0 != null && e.touches[0].clientY - sy0 > 60) { sy0 = null; if (UI.pop) closePop(); else if (UI.sheet) { UI.sheet = null; renderSheet(); } } }, { passive: true });
  document.addEventListener('touchend', () => { sy0 = null; });
  window.addEventListener('hashchange', () => { const h = fromSlug(location.hash.slice(1)); if (!S || h === UI.screen) return; if ((AREA === 'admin' && ADMIN_SCREENS.includes(h)) || (AREA === 'app' && (SEQ.includes(h) || h === 'reference' || h === 'actions'))) go(h); });
  window.addEventListener('resize', () => { if (bp() !== lastBp) { closePop(true); popAnchor = null; render(); } });
  window.addEventListener('beforeunload', e => { const unsaved = savesHere() ? SRV.state !== 'saved' : (UI.dirty && S && !S.engagement.example); if (unsaved) { if (savesHere()) saveNow(); e.preventDefault(); e.returnValue = ''; } });
  const h = fromSlug((location.hash || '').slice(1));
  if (AREA === 'admin') UI.screen = ADMIN_SCREENS.includes(h) ? h : 'setup';
  else if (AREA === 'profile') UI.screen = 'profile';
  else if (SEQ.includes(h) || h === 'reference' || h === 'actions') UI.screen = h;
  else if (h === 'worked-example') { UI.guide = 'practice'; history.replaceState(null, '', location.pathname); }
  if (location.hash && UI.screen && location.hash.slice(1) !== toSlug(UI.screen)) try { history.replaceState(null, '', '#' + toSlug(UI.screen)); } catch (e) {}
  render();
  const r = location.protocol.startsWith('http') ? await api('GET', '/api/me') : { ok: false, error: 'opened as a local file' };
  SRV.checked = true;
  if (r.ok) { SRV.on = true; SRV.user = r.body.user; SRV.site = r.body.site || ''; document.documentElement.classList.toggle('testsite', !!SRV.site); document.title = (SRV.site ? '[' + SRV.site + '] ' : '') + document.title.replace(/^\[[^\]]*\] /, ''); if (AREA === 'admin' && SRV.user.isAdmin && UI.screen !== 'setup') loadAdmin(); if (AREA === 'profile') { render(); const e = await api('GET', '/api/engagement'); if (e.ok) { SRV.exists = !!e.body.exists; render(); } } else { await loadArchives(); await loadReal(); if (AREA === 'app' && openExampleByDefault()) startPractice(); SRV.started = true; render(); } } else { SRV.on = false; SRV.reason = r.error; SRV.code = r.code || ''; if (AREA === 'app' && SRV.code !== 'no_access' && openExampleByDefault()) startPractice(); render(); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshIfQuiet(); });
}
window.RAF = { get state() { return S; }, snapshot: () => snapshotNow(), render: () => render(), validate: o => validateFile(migrate(o)), checks: () => runChecks(), calibrationSet: () => calibrationSet(), go, save: () => saveNow(), datesAU, output: (tab) => outputFor(tab)[0](), content: () => C };
boot();
})();
