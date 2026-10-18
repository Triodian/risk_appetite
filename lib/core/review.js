// The annual review: keep the approved engagement as a read-only record and start the next review
// from it. Cloud-neutral.

/** The positions of the last approved version: from its snapshot, or read from the cells. */
export function approvedPositions(data) {
  const c = data.calibration || {};
  const ap = (c.issued || []).filter(x => x && x.status === 'approved' && x.snapshot).pop();
  if (ap) return ap.snapshot.cells || {};
  const cells = {};
  Object.values(data.decisions || {}).forEach(d => Object.entries((d && d.cells) || {}).forEach(([id, p]) => {
    if (p && p.status === 'set' && p.value != null && p.value !== '') cells[id] = [String(p.value), p.condition || '', p.owner || '', ''];
  }));
  return cells;
}

/** A new engagement for the next review. Structure, people's areas and set-up carry over; positions start
 *  from last year's approved values; challenge, questions, approvals and history start empty. */
export function nextReview(data, newId, actor, now) {
  const c = data.calibration || {};
  const n = JSON.parse(JSON.stringify(data));
  n.engagement = { ...n.engagement, id: newId, overallPosition: '', boardMemo: {}, sessionDates: ['', ''], example: false, autosave: false };
  Object.keys(n.decisions || {}).forEach(k => {
    const d = n.decisions[k] || {};
    d.cells = {};
    if (k === 'd3') d.referenceShown = [];
  });
  n.inputs = (n.inputs || []).map(i => ({ ...i, status: '', date: '', note: '' }));
  n.challenge = [];
  n.questionsForCounsel = [];
  n.calibration = { status: 'default', version: 0, agreedBy: '', agreedById: '', agreedOn: '', approvedOn: '', minuteRef: '', approvedBy: '', issued: [] };
  n.previous = { version: c.version, approvedOn: c.approvedOn || '', minuteRef: c.minuteRef || '', approvedBy: c.approvedBy || '', cells: approvedPositions(data) };
  n.history = [{ at: now, by: actor, action: 'nextReview', target: 'engagement', from: `version ${c.version} approved ${c.approvedOn || ''}`.trim(), to: 'new review', version: 0 }];
  return n;
}

export const archiveLabel = data => {
  const c = data.calibration || {}, e = data.engagement || {};
  return `${e.insurer || 'Engagement'} · version ${c.version || 0} ${c.status === 'approved' ? 'approved ' + (c.approvedOn || '') : c.status}`.trim();
};
