// Email notifications: who should hear about what. Cloud-neutral.
// Messages are always written to the notifications table. They are only emailed when a sender is
// configured (see src/worker.js); until then they are held, and administrators can see them in Admin.

const CELL_RE = /^d(\d)\./;
const dLong = ymd => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)).toLocaleDateString('en-AU', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }) : ymd; };
const short = (s, n = 160) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const decisionOf = id => { const m = CELL_RE.exec(id || ''); return m ? 'decision ' + m[1] : 'the engagement'; };
const cellOf = (data, id) => { const did = (id || '').split('.')[0]; return data && data.decisions && data.decisions[did] && data.decisions[did].cells ? data.decisions[did].cells[id] : null; };

function footer(origin) {
  return `\n\nOpen your actions: ${origin}/#my-actions\n\nYou get these emails because you take part in the AI risk appetite engagement. You can turn them off in your profile: ${origin}/profile/`;
}

/** Messages caused by one save. users: all users (with role, active, notify). actor: the user who saved. */
export function eventsFromSave(oldData, newData, users, actor, origin) {
  if (!oldData || !newData) return [];
  const msgs = [], active = users.filter(u => u.active && u.id !== actor.id);
  const byId = id => active.find(u => u.id === id);
  const withRole = r => active.filter(u => u.role === r);
  const who = actor.name || actor.email;
  const ins = (newData.engagement && newData.engagement.insurer) || 'the insurer';
  const send = (list, subject, text) => [...new Map(list.filter(Boolean).map(u => [u.id, u])).values()].forEach(u => msgs.push({ to: u, subject, text: text + footer(origin) }));

  // New questions for counsel → counsel
  const oldQ = new Set((oldData.questionsForCounsel || []).map(q => q.ref));
  (newData.questionsForCounsel || []).filter(q => !oldQ.has(q.ref)).forEach(q =>
    send(withRole('counsel'), `Question for counsel ${q.ref} · ${ins}`, `${who} logged a question for counsel on ${decisionOf(q.cell || q.decision + '.')}:\n\n"${short(q.question, 600)}"`));

  // New challenge points → the accountable owner of the position (or the CRO if it has none)
  const oldC = new Map((oldData.challenge || []).map(c => [c.ref, c]));
  (newData.challenge || []).forEach(c => {
    const was = oldC.get(c.ref);
    if (!was) {
      const pos = cellOf(newData, c.cell), owner = pos && pos.owner ? byId(pos.owner) : null;
      send(owner ? [owner] : withRole('cro'), `Challenge ${c.ref} on ${owner ? 'your position' : 'a position'} · ${ins}`, `${who} raised a challenge on ${decisionOf(c.cell)}:\n\n"${short(c.point, 600)}"`);
    } else if ((c.response || '') !== (was.response || '') && c.response) {
      send([byId(c.raisedBy)], `Response to your challenge ${c.ref} · ${ins}`, `${who} responded to your challenge:\n\n"${short(c.response, 600)}"`);
    }
  });

  // Positions newly recorded as "not set" → the person who will set them
  Object.keys(newData.decisions || {}).forEach(did => {
    const cells = (newData.decisions[did] || {}).cells || {}, before = ((oldData.decisions || {})[did] || {}).cells || {};
    Object.entries(cells).forEach(([id, p]) => {
      const was = before[id];
      if (p && p.status === 'notSet' && p.notSetOwner && !(was && was.status === 'notSet' && was.notSetOwner === p.notSetOwner))
        send([byId(p.notSetOwner)], `A position for you to set · ${ins}`, `${who} recorded a position on ${decisionOf(id)} as not set and named you to set it${p.notSetDue ? ' by ' + dLong(p.notSetDue) : ''}.`);
    });
  });

  // Working appetite agreed → board record and counsel; approved → CRO and counsel
  const os = (oldData.calibration || {}).status, ns = (newData.calibration || {}).status, v = (newData.calibration || {}).version;
  if (os !== 'working' && ns === 'working') send([...withRole('board'), ...withRole('counsel')], `Working appetite agreed (version ${v}) · ${ins}`, `${who} agreed the working appetite, version ${v}. Counsel settles the statement for the board; the board record role records the board's approval in the app.`);
  if (os !== 'approved' && ns === 'approved') send([...withRole('cro'), ...withRole('counsel')], `Appetite approved (version ${v}) · ${ins}`, `${who} recorded the board's approval of version ${v}.`);
  return msgs;
}

/** Daily: "not set" positions due within three days or overdue → their owners, one email each. */
export function dueReminders(data, users, today, origin) {
  if (!data) return [];
  const t = Date.parse(today), per = new Map();
  Object.values(data.decisions || {}).forEach(d => Object.entries((d && d.cells) || {}).forEach(([id, p]) => {
    if (!p || p.status !== 'notSet' || !p.notSetOwner || !p.notSetDue) return;
    const days = Math.round((Date.parse(p.notSetDue) - t) / 864e5);
    if (days > 3) return;
    if (!per.has(p.notSetOwner)) per.set(p.notSetOwner, []);
    per.get(p.notSetOwner).push(`- ${decisionOf(id)}: ${days < 0 ? 'overdue since ' + dLong(p.notSetDue) : days === 0 ? 'due today' : 'due ' + dLong(p.notSetDue)}`);
  }));
  const ins = (data.engagement && data.engagement.insurer) || 'the insurer', out = [];
  per.forEach((lines, uid) => { const u = users.find(x => x.id === uid && x.active); if (u) out.push({ to: u, subject: `Positions for you to set · ${ins}`, text: `These positions you own are due soon or overdue:\n\n${lines.join('\n')}` + footer(origin), key: `due:${uid}:${today}` }); });
  return out;
}

/** Writes messages to the outbox and sends them if a sender is configured. Never throws. */
export async function deliver(msgs, store, sender, now) {
  for (const m of msgs) {
    try {
      if (m.to.notify === false) continue;
      if (m.key && await store.hasNotification(m.key)) continue;
      const id = await store.addNotification({ key: m.key || null, to: m.to.email, subject: m.subject, body: m.text, status: sender ? 'sending' : 'held' }, now);
      if (!sender) continue;
      try { await sender({ to: m.to.email, subject: m.subject, text: m.text }); await store.markNotification(id, 'sent', '', now); }
      catch (e) { await store.markNotification(id, 'failed', String(e && (e.code || e.message) || e).slice(0, 200), now); }
    } catch (e) { /* a notification problem must never stop a save */ }
  }
}
