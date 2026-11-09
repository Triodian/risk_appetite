// Where the engagement stands, for the practitioner's practice hub (development plan task 4.1). Cloud-neutral.
// The hub reads it over a service binding (src/status-service.js) and shows it beside the practitioner's other clients.
// It says where the work is and who it waits on, by role and count: no names, no positions, no questions' or
// challenges' wording. Format triodian.status.v1 (see Triodian/practice-hub README).

export const STATUS_FORMAT = 'triodian.status.v1';
const DECISIONS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'];
const ymd = v => (/^\d{4}-\d{2}-\d{2}/.test(String(v || '')) ? String(v).slice(0, 10) : null);
const STEPS = 4; // set-up, the eight decisions, the board's approval of the working appetite, approved

/** e: the stored engagement ({ data, updatedAt }) or null. today: 'YYYY-MM-DD'. now: an ISO timestamp. */
export function engagementStatus(e, { today, now } = {}) {
  today = today || new Date().toISOString().slice(0, 10);
  const base = { format: STATUS_FORMAT, app: 'risk-appetite', generated: now || new Date().toISOString() };
  if (!e || !e.data) return { ...base, stage: { label: 'Not started', step: 0, steps: STEPS }, openActions: 0, waitingOn: [], nextSignOff: null, nextBoardDate: null, lastActivity: null };
  const d = e.data, cal = (d.calibration || {}).status || 'default', decisions = d.decisions || {};
  const cells = id => Object.values((decisions[id] || {}).cells || {}).filter(p => p && typeof p === 'object');
  const started = DECISIONS.filter(id => cells(id).some(p => p.status === 'set' || p.status === 'notSet')).length;

  const stage = cal === 'approved' ? { label: 'Approved by the board', step: 4, steps: STEPS }
    : cal === 'working' ? { label: 'Working appetite agreed: board approval next', step: 3, steps: STEPS }
    : started ? { label: `Decisions: positions recorded in ${started} of 8`, step: 2, steps: STEPS }
    : { label: 'Set-up', step: 1, steps: STEPS };

  // Who it waits on, by role.
  const wait = new Map(), add = (role, n = 1) => { if (n > 0) wait.set(role, (wait.get(role) || 0) + n); };
  add('Counsel', (d.questionsForCounsel || []).filter(q => q.status !== 'answered').length);
  add('CRO or counsel', (d.challenge || []).filter(c => c.status === 'open').length);              // challenge responses
  add('Position owners', DECISIONS.flatMap(cells).filter(p => p.status === 'notSet').length);     // positions recorded as not set yet
  if (cal === 'working') add('Board');
  const waitingOn = [...wait].map(([role, actions]) => ({ role, actions }));

  const nextSignOff = cal === 'approved' ? null
    : cal === 'working' ? { label: 'The board approves the working appetite', due: null }
    : { label: 'The CRO agrees the working appetite', due: null };
  return { ...base, stage, openActions: waitingOn.reduce((n, w) => n + w.actions, 0), waitingOn, nextSignOff,
    nextBoardDate: null, lastActivity: ymd(e.updatedAt) };
}
