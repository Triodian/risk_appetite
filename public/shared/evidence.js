// The APRA letter evidence index (development plan task R.2). Each output of the three engagement apps is tagged with
// the bullet of APRA's 30 April 2026 letter on AI it serves (B1 to A4), the CPS 230 paragraph where one applies (the
// numbering amended from 1 July 2026), and the ISO/IEC 42001 clause or Annex A control it can stand as evidence for.
// AI Board Direction, in connected mode, gathers the artefacts from AI Risk Appetite and AI Use Assessment over the
// service bindings and lists them by letter bullet or by ISO/IEC 42001 control, each showing its evidence or "none yet".
// Plain functions, no page code: the same file is in all three apps, and the server and the tests run it in Node.
//
// The letter has no paragraph numbers, names no prudential standard and does not mention FAR, so the links to CPS 230
// and ISO/IEC 42001 are Triodian's reading. Counsel confirms them before they go into a response to APRA.

export const FORMAT = 'triodian.evidence.v1';
export const LETTER_NAME = 'APRA letter to industry on artificial intelligence, 30 April 2026';
export const NOTE = 'The letter has no paragraph numbers, names no prudential standard and does not mention FAR. The links to CPS 230 (amended numbering) and to ISO/IEC 42001 are Triodian’s reading, for counsel to confirm.';

/** The letter's expectations, by section and bullet. cps: CPS 230 paragraphs, amended numbering. iso: clauses and Annex A controls. */
export const LETTER = [
  { id: 'B1', section: 'Board', text: 'Board AI literacy sufficient to set direction and challenge', cps: [], iso: ['5.1', '7.2'] },
  { id: 'B2', section: 'Board', text: 'AI strategy consistent with risk appetite and tolerances, with monitoring, including of third-party dependencies, and clearly defined triggers', cps: [], iso: ['6.1.2', '6.2', '9.1'] },
  { id: 'S1', section: 'Security and resilience', text: 'Reliance on AI assessed for resilience, with credible fallback where AI supports critical operations', cps: ['critical operations'], iso: ['6.1.3', 'A.6'] },
  { id: 'S2', section: 'Security and resilience', text: 'Security controls for AI threats, including controls over agentic and autonomous workflows', cps: [], iso: ['A.6', 'A.9'] },
  { id: 'S3', section: 'Security and resilience', text: 'Security testing of AI-generated code, components and libraries', cps: [], iso: ['A.6'] },
  { id: 'S4', section: 'Security and resilience', text: 'Third-party and concentration implications of common platforms and providers', cps: ['52(b)', '60(b)'], iso: ['A.10'] },
  { id: 'G1', section: 'Governance', text: 'AI policy, standards, guidance and reporting lines', cps: [], iso: ['5.2', 'A.2'] },
  { id: 'G2', section: 'Governance', text: 'Ownership and accountability across the lifecycle, design to decommissioning', cps: [], iso: ['5.3', 'A.3'] },
  { id: 'G3', section: 'Governance', text: 'An inventory of AI tooling and use cases', cps: [], iso: ['4.3', 'A.4'] },
  { id: 'G4', section: 'Governance', text: 'Human involvement for high-risk decisions', cps: [], iso: ['A.9'] },
  { id: 'G5', section: 'Governance', text: 'Staff training on AI use, misuse, limits and secure practice', cps: [], iso: ['7.2', '7.3'] },
  { id: 'P1', section: 'Providers', text: 'The full AI supply chain mapped, including material, third-party and fourth-party dependencies', cps: ['47(c)', '52(b)', '53(d)–(e)'], iso: ['A.10'] },
  { id: 'P2', section: 'Providers', text: 'Contracts giving transparency, auditability and assurance over AI services', cps: ['53', '53(b)', '54'], iso: ['A.10'] },
  { id: 'P3', section: 'Providers', text: 'Model behaviour, material changes, performance and outcomes understood across the lifecycle', cps: [], iso: ['A.6', '9.1'] },
  { id: 'P4', section: 'Providers', text: 'Concentration risk, failure scenarios, and credible substitution, portability or exit', cps: ['55(d)'], iso: ['A.10', '6.1.3'] },
  { id: 'A1', section: 'Assurance', text: 'Recognised control frameworks, control libraries and change control', cps: [], iso: ['6.1.3', '6.3'] },
  { id: 'A2', section: 'Assurance', text: 'Integrated assurance across cyber, data, model performance, resilience, privacy and conduct', cps: [], iso: ['9.1', 'A.7'] },
  { id: 'A3', section: 'Assurance', text: 'Second line and internal audit able to assess AI independently, including probabilistic and agentic systems', cps: [], iso: ['9.2'] },
  { id: 'A4', section: 'Assurance', text: 'Assessment before deployment and through the lifecycle; continuous, proportionate monitoring', cps: [], iso: ['6.1.4', 'A.5', '9.1'] },
];

/** The ISO/IEC 42001 clauses and Annex A control objectives the tags use, in the standard's order. */
export const ISO = [
  ['4.3', 'Scope of the AI management system'], ['5.1', 'Leadership and commitment'], ['5.2', 'AI policy'], ['5.3', 'Roles, responsibilities and authorities'],
  ['6.1.2', 'AI risk assessment'], ['6.1.3', 'AI risk treatment'], ['6.1.4', 'AI system impact assessment'], ['6.2', 'AI objectives'], ['6.3', 'Planning of changes'],
  ['7.2', 'Competence'], ['7.3', 'Awareness'], ['9.1', 'Monitoring, measurement, analysis and evaluation'], ['9.2', 'Internal audit'], ['9.3', 'Management review'],
  ['A.2', 'Policies related to AI'], ['A.3', 'Internal organisation'], ['A.4', 'Resources for AI systems'], ['A.5', 'Assessing impacts of AI systems'], ['A.6', 'AI system life cycle'],
  ['A.7', 'Data for AI systems'], ['A.9', 'Use of AI systems'], ['A.10', 'Third-party and customer relationships'],
];
const isoOrder = id => { const i = ISO.findIndex(x => x[0] === id); return i < 0 ? 999 : i; };
export const isoName = id => (ISO.find(x => x[0] === id) || [id, ''])[1];

/** Each output's tags: letter bullets, CPS 230 paragraphs and ISO/IEC 42001 references. */
export const TAGS = {
  RA: {
    pack: { letter: ['B2', 'G1'], cps: [], iso: ['6.2', '5.2'] },
    paper: { letter: ['B1', 'B2'], cps: [], iso: ['5.1', '6.2'] },
    statement: { letter: ['B2', 'G1'], cps: [], iso: ['6.2', 'A.2'] },
    schedule: { letter: ['B2', 'A4'], cps: [], iso: ['6.2', '9.1'] },
    session: { letter: ['B1'], cps: [], iso: ['7.2'] },
    calibration: { letter: ['B2', 'G4', 'A4'], cps: [], iso: ['6.1.2', 'A.5'] },
    checks: { letter: ['A1'], cps: [], iso: ['6.1.3'] },
    plan: { letter: ['G2'], cps: [], iso: ['5.3'] },
    inUse: { letter: ['B2', 'A4'], cps: [], iso: ['9.1'] },
    limits: { letter: ['A1', 'B2'], cps: [], iso: ['6.1.3', '6.2'] },
  },
  UA: {
    DL1: { letter: ['G3', 'P1', 'S4'], cps: ['47(c)', '52(b)'], iso: ['6.1.4', 'A.5', 'A.10'] },
    DL2: { letter: ['P2', 'P3', 'A4'], cps: ['53', '54'], iso: ['A.10', '9.1'] },
    DL3: { letter: ['A1'], cps: [], iso: ['6.1.3'] },
    DL4: { letter: ['B2', 'A4'], cps: [], iso: ['6.2', '9.1'] },
    DL5: { letter: ['P2', 'A1'], cps: ['53'], iso: ['A.10', '6.1.3'] },
    DL6: { letter: ['G3'], cps: [], iso: ['A.4'] },
    QS: { letter: ['P2'], cps: ['53'], iso: ['A.10'] },
    RP: { letter: ['A3'], cps: [], iso: ['9.2'] },
    CM: { letter: ['A4', 'B2'], cps: [], iso: ['9.1'] },
    DR: { letter: ['A1'], cps: [], iso: ['6.3'] },
    EP: { letter: ['G2'], cps: [], iso: ['5.3'] },
    FN: { letter: ['P2', 'P4', 'S4'], cps: ['53', '55(d)'], iso: ['A.10'] },
  },
  BD: {
    inventory: { letter: ['G3'], cps: [], iso: ['4.3', 'A.4'] },
    statement: { letter: ['B2', 'G1'], cps: [], iso: ['A.2', '5.2'] },
    directions: { letter: ['B2', 'G1', 'G4'], cps: [], iso: ['A.2', '5.2'] },
    aupOutline: { letter: ['G1', 'G5'], cps: [], iso: ['A.2', 'A.9'] },
    minute: { letter: ['B2', 'G2'], cps: [], iso: ['5.1', '9.3'] },
    actionList: { letter: ['G2'], cps: [], iso: ['6.2'] },
    worklist: { letter: ['G4'], cps: [], iso: ['A.9'] },
    plan: { letter: ['G2'], cps: [], iso: ['5.3'] },
    education: { letter: ['B1', 'G5'], cps: [], iso: ['7.2'] },
    confidentiality: { letter: ['A2'], cps: [], iso: ['A.7'] },
    boardViews: { letter: ['B2'], cps: [], iso: ['9.1', '9.3'] },
    evidence: { letter: ['A2'], cps: [], iso: ['9.3'] },
  },
};
export const APPS = { RA: 'AI Risk Appetite', UA: 'AI Use Assessment', BD: 'AI Board Direction' };

/** The tags of one output, or null. */
export const tagsFor = (app, id) => (TAGS[app] || {})[id] || null;
/** One line for the screen: "APRA letter G3, P1 · CPS 230 47(c) · ISO/IEC 42001 6.1.4, A.5". Empty when untagged. */
export function tagLine(app, id) {
  const t = tagsFor(app, id); if (!t) return '';
  return ['APRA letter ' + t.letter.join(', '), t.cps.length ? 'CPS 230 ' + t.cps.join(', ') : '', 'ISO/IEC 42001 ' + t.iso.join(', ')].filter(Boolean).join(' · ');
}

const ymd = s => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
const art = (app, id, name, status, asOf, note) => ({ app, id, name, status, asOf: ymd(asOf), note: note || '', ...tagsFor(app, id) });

/** AI Use Assessment's artefacts, from the stored assessment. status: recorded (signed off), draft or none. */
export function assessmentArtefacts(d, updatedAt) {
  d = d || {};
  const ents = d.entries || [], vs = d.versions || [], v = label => vs.filter(x => x && x.label === label).pop();
  const by = (label, has) => { const x = v(label); return x ? ['recorded', x.at, 'Signed off: ' + label] : has ? ['draft', updatedAt, 'Not yet signed off: ' + label] : ['none', null, '']; };
  const q = d.questions || [], f = d.feedback;
  const rows = [
    ['DL1', 'AI dependency register', by('Counsel review recorded (R6)', ents.length)],
    ['DL2', 'Evidence obtainable at each boundary', by('Independent check complete (R7)', ents.length)],
    ['DL3', 'Control-library shape for the entity’s own AI boundary', by('Independent check complete (R7)', ents.some(e => ((e.fields || {})[3] || {}).value === 'B3'))],
    ['DL4', 'Technical schedule, tolerance and trigger design', by('Independent check complete (R7)', ents.length)],
    ['DL5', 'Technical annex', by('Technical annex signed', ents.length)],
    ['DL6', 'Hand-back list', by('Hand-back list accepted', ents.length)],
    ['QS', 'Question set to counsel', q.length ? (q.every(x => x.status === 'answered') ? ['recorded', q.map(x => x.respondedOn).filter(Boolean).sort().pop() || updatedAt, `${q.length} question${q.length === 1 ? '' : 's'}, all answered`] : ['draft', updatedAt, `${q.filter(x => x.status !== 'answered').length} of ${q.length} open`]) : ['none', null, '']],
    ['RP', 'Review pack for the independent reviewer', by('Independent check complete (R7)', ents.length)],
    ['CM', 'Closing measures', by('Independent check complete (R7)', ents.length)],
    ['DR', 'Difference report', (d.diffReports || []).length ? ['recorded', (d.diffReports[d.diffReports.length - 1] || {}).at, `${d.diffReports.length} recalculation${d.diffReports.length === 1 ? '' : 's'}`] : ['none', null, '']],
    ['EP', 'Engagement plan', by('Set agreed (R1)', !!d.engagement)],
    ['FN', 'Findings F1 to F4, as issued in the in-use feed', f ? ['recorded', f.generated || f.on, 'Issued to AI Risk Appetite'] : ['none', null, '']],
  ];
  return rows.map(([id, name, [s, at, note]]) => art('UA', id, name, s, at, note));
}

/** AI Risk Appetite's artefacts, from the stored engagement. The outputs share the calibration set's approval. */
export function appetiteArtefacts(d, updatedAt) {
  d = d || {};
  const c = d.calibration || {}, approved = c.status === 'approved', started = approved || c.status === 'working' || c.status === 'agreed' || !!c.agreedOn || (c.version || 0) > 0;
  const withCal = has => approved ? ['recorded', c.approvedOn, 'Approved by the board' + (c.minuteRef ? ', minute ' + c.minuteRef : '')] : (has || started) ? ['draft', c.agreedOn || updatedAt, c.agreedOn ? 'Agreed by the CRO; not yet approved by the board' : 'Not yet approved by the board'] : ['none', null, ''];
  const lim = ((d.aims || {}).limits || []), inUse = d.inUse;
  const rows = [
    ['pack', 'Board pack', withCal()], ['paper', 'Board paper (plain words)', withCal()], ['statement', 'AI risk appetite statement', withCal()],
    ['schedule', 'Tolerance and trigger schedule', withCal()], ['calibration', 'Calibration set', withCal()],
    ['session', 'Session record', (d.challenge || []).length ? ['recorded', updatedAt, `${d.challenge.length} challenge${d.challenge.length === 1 ? '' : 's'} recorded`] : started ? ['draft', updatedAt, ''] : ['none', null, '']],
    ['checks', 'Check report (K1 to K11)', withCal(true)], ['plan', 'Engagement plan', withCal(true)],
    ['inUse', 'In-use measures against the appetite (decision 8)', inUse ? ['recorded', inUse.on || inUse.generated, 'From the AI Use Assessment in-use feed'] : ['none', null, '']],
    ['limits', 'The client’s AI limits tested against the appetite (K11)', lim.length ? [approved ? 'recorded' : 'draft', approved ? c.approvedOn : updatedAt, `${lim.length} limit${lim.length === 1 ? '' : 's'} from the client’s ISO/IEC 42001 limits register`] : ['none', null, '']],
  ];
  return rows.map(([id, name, [s, at, note]]) => art('RA', id, name, s, at, note));
}

/** AI Board Direction's own artefacts, from the engagement as it stands. */
export function boardArtefacts(d) {
  d = d || {};
  const e = d.engagement || {}, mode = e.mode || 'standalone', res = d.resolution || {}, resolved = !!res.by, dir = d.directions || {}, inv = d.inventory || [];
  const draftOr = (has, at) => resolved ? ['recorded', res.on, 'Resolved by the board' + (res.minuteRef ? ', minute ' + res.minuteRef : '')] : has ? ['draft', at || null, 'Draft until the board resolves'] : ['none', null, ''];
  const edu = Object.values(d.education || {}), done = edu.filter(x => x && x.completedOn), bv = d.boardViews || [];
  const rows = [
    ['inventory', 'AI inventory (B1)', inv.length], ['statement', 'AI risk appetite statement', true], ['directions', 'Board directions paper', true],
    ['aupOutline', 'Acceptable-use policy outline', true], ['minute', 'Board minute', true], ['actionList', '90-day action list', true],
    ['worklist', 'Automated-decision worklist', inv.length], ['plan', 'Engagement plan', true],
  ].filter(([id]) => !((mode === 'connected' && (id === 'statement' || id === 'aupOutline')) || (mode !== 'connected' && id === 'directions')))
    .map(([id, name, has]) => {
      if (id === 'directions' && dir.by) return art('BD', id, name, 'recorded', dir.on, 'Recorded by the chair');
      const [s, at, note] = draftOr(!!has); return art('BD', id, name, s, at, id === 'inventory' && has ? `${inv.length} line${inv.length === 1 ? '' : 's'}; ${note}` : note);
    });
  rows.push(art('BD', 'education', 'Director education record', done.length ? 'recorded' : edu.length ? 'draft' : 'none', done.map(x => x.completedOn).sort().pop() || null, edu.length ? `${done.length} of ${edu.length} directors completed the briefing` : ''));
  if (mode === 'connected') rows.push(art('BD', 'boardViews', 'Board views taken from AI Risk Appetite', bv.length ? 'recorded' : 'none', bv.length ? bv[bv.length - 1].takenOn : null, bv.length ? `${bv.length} meeting${bv.length === 1 ? '' : 's'}` : ''));
  return rows;
}

const STATUS = { recorded: 'Recorded', draft: 'Draft', none: 'None yet' };
const cell = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (h, rows) => `| ${h.join(' | ')} |\n| ${h.map(() => '---').join(' | ')} |\n` + rows.map(r => `| ${r.map(cell).join(' | ')} |`).join('\n') + '\n\n';

/**
 * The index, in Markdown. o: { artefacts, by: 'letter' | 'iso', review, company, gatheredOn, notes }.
 * review is the date of the client's next AI management review (ISO/IEC 42001 clause 9.3), when set: every artefact
 * is then due for review at it. notes: lines saying what could not be gathered.
 */
export function indexMarkdown(o) {
  const A = (o.artefacts || []).filter(a => a.status !== 'none'), by = o.by === 'iso' ? 'iso' : 'letter';
  const rev = ymd(o.review), row = a => [APPS[a.app], a.name, STATUS[a.status] || a.status, a.asOf || '—', rev || '—', a.note || ''];
  const H = ['App', 'Artefact', 'Status', 'As of', 'Review by', 'Note'];
  let m = `${o.company ? o.company + ': ' : ''}the artefacts the three engagements hold, ${by === 'iso' ? 'by ISO/IEC 42001 clause and Annex A control' : 'by bullet of the ' + LETTER_NAME}. Gathered ${o.gatheredOn || ''}.\n\n`;
  m += rev ? `Review dates are set to the client’s next AI management review (ISO/IEC 42001 clause 9.3), ${rev}.\n\n` : 'No AI management review date is set, so no review dates are shown. Set it on the set-up screen to align them with ISO/IEC 42001 clause 9.3.\n\n';
  (o.notes || []).forEach(n => { m += `**Not gathered.** ${n}\n\n`; });
  if (by === 'letter') {
    LETTER.forEach(b => {
      const hits = A.filter(a => (a.letter || []).includes(b.id));
      m += `## ${b.id} · ${b.text}\n\n${b.section}. CPS 230: ${b.cps.length ? b.cps.join(', ') : '—'}. ISO/IEC 42001: ${b.iso.join(', ')}.\n\n` + (hits.length ? table(H, hits.map(row)) : 'None yet.\n\n');
    });
  } else {
    ISO.forEach(([id, name]) => {
      const hits = A.filter(a => (a.iso || []).includes(id));
      const bullets = LETTER.filter(b => b.iso.includes(id)).map(b => b.id);
      m += `## ${id} · ${name}\n\nLetter bullets: ${bullets.join(', ') || '—'}.\n\n` + (hits.length ? table(H, hits.map(row)) : 'None yet.\n\n');
    });
  }
  const gap = LETTER.filter(b => !A.some(a => (a.letter || []).includes(b.id))).map(b => b.id);
  m += `## Bullets with no evidence yet\n\n${gap.length ? gap.join(', ') + '. These are for other controls or tools the entity holds; the three engagements do not produce evidence for them.' : 'None.'}\n\n${NOTE}\n`;
  return m;
}

/** Counts for the screen: bullets with evidence, and artefacts recorded or in draft. */
export function coverage(artefacts) {
  const A = (artefacts || []).filter(a => a.status !== 'none');
  return { bullets: LETTER.filter(b => A.some(a => (a.letter || []).includes(b.id))).length, of: LETTER.length, recorded: A.filter(a => a.status === 'recorded').length, draft: A.filter(a => a.status === 'draft').length };
}
