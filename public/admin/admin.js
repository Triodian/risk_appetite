/* Admin · AI Risk Appetite · Triodian
   Manage who can use the app and what role they hold. Talks to /api/admin/*; the server enforces every rule. */
(function () {
'use strict';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? s : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const $ = id => document.getElementById(id);

const A = { me: null, users: [], roles: [], perms: [], requests: [], audit: [], editing: null, adding: false, prefill: null, err: '', mark: '' };
const roleName = id => (A.roles.find(r => r.id === id) || {}).name || (id ? id : 'None');

async function api(method, path, body) {
  let r;
  try { r = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin', redirect: 'manual', cache: 'no-store' }); }
  catch (e) { return { ok: false, status: 0, error: 'The server could not be reached.' }; }
  if (r.type === 'opaqueredirect' || r.status === 401) return { ok: false, status: 401, error: 'Your sign-in has expired. Reload the page to sign in again.' };
  let j = null; try { j = await r.json(); } catch (e) {}
  return r.ok ? { ok: true, body: j } : { ok: false, status: r.status, error: (j && j.error) || 'Error ' + r.status, code: j && j.code };
}
function toast(msg) { const t = $('toast'); t.textContent = msg; t.className = 'toast'; clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = 'hidden'; }, 3200); }

function header() {
  return `<header class="hdr"><div class="hdr-in">
    <a class="brand" href="/" aria-label="Triodian · back to the app">${A.mark}<span class="wordmark">Triodian</span></a>
    <span class="vrule" aria-hidden="true"></span><span class="apptitle">AI Risk Appetite · Admin</span>
    <div class="hdr-r"><span class="mono soft adm-hide-sm">${esc(A.me ? A.me.email : '')}</span><a href="/">Back to the app</a><a href="/cdn-cgi/access/logout">Sign out</a></div>
  </div></header>`;
}
function message(title, text) {
  $('app').innerHTML = header() + `<div class="adm-msg"><h1 class="h1" style="font-size:30px">${esc(title)}</h1><p class="soft">${esc(text)}</p><p style="margin-top:18px"><a class="btn" href="/">Back to the app</a></p></div>`;
}

function roleOptions(cur) {
  return `<option value="" ${!cur ? 'selected' : ''}>None (no engagement role)</option>` + A.roles.map(r => `<option value="${esc(r.id)}" ${cur === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('');
}
function userForm(u, isNew) {
  const p = 'f-';
  return `<form class="adm-form" id="userForm" data-id="${esc(u.id || '')}" novalidate>
    <label class="f">Email<input class="in" id="${p}email" type="email" autocomplete="off" value="${esc(u.email || '')}" required></label>
    <label class="f">Name<input class="in" id="${p}name" value="${esc(u.name || '')}" required></label>
    <label class="f">Organisation<input class="in" id="${p}org" value="${esc(u.organisation || '')}"></label>
    <label class="f">Engagement role<select class="in" id="${p}role">${roleOptions(u.role)}</select></label>
    <div class="acts">
      <label class="cb"><input type="checkbox" id="${p}admin" ${u.isAdmin ? 'checked' : ''}> Administrator (can manage users)</label>
      ${isNew ? '' : `<label class="cb"><input type="checkbox" id="${p}active" ${u.active !== false ? 'checked' : ''}> Active (can sign in)</label>`}
    </div>
    ${A.err ? `<p class="err" role="alert">${esc(A.err)}</p>` : ''}
    <div class="acts"><button class="btn primary sm" type="submit">${isNew ? 'Add user' : 'Save changes'}</button><button class="btn sm" type="button" data-act="cancel">Cancel</button></div>
  </form>`;
}

function usersSection() {
  const active = A.users.filter(u => u.active).length;
  const rows = A.users.map(u => {
    if (A.editing === u.id) return `<tr class="adm-edit"><td colspan="7">${userForm(u, false)}</td></tr>`;
    const you = A.me && u.id === A.me.id;
    return `<tr class="${u.active ? '' : 'off'}">
      <td><strong>${esc(u.name || '—')}</strong>${you ? ' <span class="badge b-aub">you</span>' : ''}<div class="em">${esc(u.email)}</div></td>
      <td class="adm-hide-sm">${esc(u.organisation)}</td>
      <td>${u.role ? esc(roleName(u.role)) : '<span class="soft">None</span>'}</td>
      <td>${u.isAdmin ? '<span class="badge b-aub">Admin</span>' : ''}</td>
      <td>${u.active ? '<span class="badge b-green">Active</span>' : '<span class="badge b-grey">Inactive</span>'}</td>
      <td class="adm-hide-sm small soft">${u.lastSeenAt ? fmt(u.lastSeenAt) : 'Never'}</td>
      <td style="text-align:right"><button class="btn sm" data-act="edit" data-id="${esc(u.id)}">Edit</button></td></tr>`;
  }).join('');
  return `<section class="adm-sec">
    <div class="row between"><div><h2>Users</h2><p class="small soft" style="margin-top:4px">${active} active of ${A.users.length}. Only people listed here as active can open the app. Their engagement role decides what they can change.</p></div>
    ${A.adding ? '' : '<button class="btn primary" data-act="add">Add user</button>'}</div>
    ${A.adding ? `<div class="card" style="margin-bottom:14px"><h3 class="sh">New user</h3>${userForm(A.prefill || { isAdmin: false }, true)}</div>` : ''}
    <div class="tw"><table class="lg adm-users"><thead><tr><th>Name and email</th><th class="adm-hide-sm">Organisation</th><th>Engagement role</th><th>Admin</th><th>Status</th><th class="adm-hide-sm">Last seen</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div>
    <p class="small soft" style="margin-top:10px">Users are deactivated rather than deleted, so their names stay on the decisions they made.</p>
  </section>`;
}

function requestsSection() {
  if (!A.requests.length) return '';
  return `<section class="adm-sec"><h2>Waiting for access</h2>
    <p class="small soft" style="margin:4px 0 12px">These people signed in but are not users, so the app turned them away.</p>
    <div class="tw"><table class="lg"><thead><tr><th>Email</th><th>Last tried</th><th class="adm-hide-sm">Attempts</th><th></th></tr></thead><tbody>
    ${A.requests.map(r => `<tr><td class="em" style="font-family:var(--mono);font-size:12.5px">${esc(r.email)}</td><td class="small">${fmt(r.last_at)}</td><td class="adm-hide-sm small">${esc(r.attempts)}</td>
      <td style="text-align:right;white-space:nowrap"><button class="btn sm primary" data-act="grant" data-email="${esc(r.email)}">Add as user</button> <button class="btn sm" data-act="dismiss" data-email="${esc(r.email)}">Dismiss</button></td></tr>`).join('')}
    </tbody></table></div></section>`;
}

function permsSection() {
  return `<section class="adm-sec"><h2>Roles and permissions</h2>
    <p class="small soft" style="margin:4px 0 12px">What each engagement role can change. The server checks every save against these rules. Administrators manage users; that does not by itself let them change the engagement.</p>
    <div class="tw"><table class="lg perm"><thead><tr><th>Can change</th>${A.roles.map(r => `<th class="r">${esc(r.name)}</th>`).join('')}</tr></thead><tbody>
    ${A.perms.map(p => `<tr><td>${esc(p.what)}</td>${A.roles.map(r => p.roles.includes(r.id) ? '<td class="y" aria-label="yes">✓</td>' : '<td class="n" aria-label="no">·</td>').join('')}</tr>`).join('')}
    <tr><td>Use the app at all</td>${A.roles.map(() => '<td class="y">✓</td>').join('')}</tr>
    </tbody></table></div>
    <p class="small soft" style="margin-top:10px">A user with no engagement role can open the engagement and read it, but cannot change anything.</p></section>`;
}

const ACTION = {
  'user.create': 'Added user', 'user.update': 'Changed user', 'engagement.create': 'Started the engagement',
  'engagement.save': 'Saved the engagement', 'engagement.refused': 'Save refused',
};
function detailText(e) {
  const d = e.detail || {};
  if (e.action === 'user.create') return `${d.email || ''}${d.role ? ' · ' + roleName(d.role) : ''}${d.isAdmin ? ' · admin' : ''}${d.reason ? ' · ' + d.reason : ''}`;
  if (e.action === 'user.update') return `${d.email || ''}: ` + Object.entries(d.changed || {}).map(([k, v]) => `${k} ${v.from === null || v.from === '' ? '—' : k === 'role' ? roleName(v.from) : v.from} → ${v.to === null || v.to === '' ? '—' : k === 'role' ? roleName(v.to) : v.to}`).join('; ');
  if (e.action === 'engagement.save' || e.action === 'engagement.create') return `revision ${d.revision}${d.changes ? ' · ' + d.changes + ' change' + (d.changes === 1 ? '' : 's') : ''}`;
  if (e.action === 'engagement.refused') return d.reason || '';
  return '';
}
function auditSection() {
  return `<section class="adm-sec"><h2>Activity</h2>
    <p class="small soft" style="margin:4px 0 12px">User changes and engagement saves, newest first. Detailed edits are in the engagement's own history.</p>
    ${A.audit.length ? `<div class="tw" style="max-height:480px;overflow-y:auto"><table class="lg adm-log"><thead><tr><th>When</th><th>Who</th><th>What</th><th class="adm-hide-sm">Details</th></tr></thead><tbody>
    ${A.audit.map(e => `<tr><td class="when">${fmt(e.at)}</td><td>${esc(e.actor)}</td><td>${esc(ACTION[e.action] || e.action)}</td><td class="adm-hide-sm">${esc(detailText(e))}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="soft small">Nothing yet.</p>'}</section>`;
}

function render() {
  const focus = document.activeElement && document.activeElement.id;
  $('app').innerHTML = header() + `<main class="wrap adm-main">
    <div class="opening" style="margin-bottom:10px"><div class="eyebrow">Administration</div><h1 class="h1">Users and access</h1></div>
    ${requestsSection()}${usersSection()}${permsSection()}${auditSection()}</main>`;
  if (focus && $(focus)) $(focus).focus();
  else if (A.adding || A.editing) { const f = $('f-email'); if (f) f.focus(); }
}

async function load() {
  const [u, a] = await Promise.all([api('GET', '/api/admin/users'), api('GET', '/api/admin/audit')]);
  if (!u.ok) {
    if (u.code === 'no_access') return message('No access', u.error);
    if (u.code === 'not_admin') return message('Administrators only', 'This page is for administrators. Ask an administrator if you need a user added or changed.');
    return message('Could not load', u.error);
  }
  A.users = u.body.users; A.roles = u.body.roles; A.perms = u.body.permissions; A.requests = u.body.accessRequests || [];
  A.me = A.users.find(x => x.id === u.body.me) || null;
  A.audit = a.ok ? a.body.entries : [];
  render();
}

function readForm() {
  const v = id => ($(id) || {}).value || '';
  return { email: v('f-email').trim(), name: v('f-name').trim(), organisation: v('f-org').trim(), role: v('f-role') || null, isAdmin: !!($('f-admin') || {}).checked, active: $('f-active') ? $('f-active').checked : true };
}

document.addEventListener('submit', async e => {
  if (e.target.id !== 'userForm') return;
  e.preventDefault();
  const id = e.target.dataset.id, v = readForm();
  if (!v.email || !v.name) { A.err = 'Enter an email address and a name.'; return render(); }
  if (id && A.me && id === A.me.id && (!v.isAdmin || !v.active)) { A.err = 'You cannot remove your own administrator access or deactivate yourself.'; return render(); }
  const r = id ? await api('PUT', '/api/admin/users/' + encodeURIComponent(id), v) : await api('POST', '/api/admin/users', v);
  if (!r.ok) { A.err = r.error; return render(); }
  A.err = ''; A.adding = false; A.editing = null; A.prefill = null;
  toast(id ? 'Saved ' + v.email : 'Added ' + v.email);
  load();
});
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'add') { A.adding = true; A.editing = null; A.err = ''; A.prefill = null; render(); }
  if (a === 'grant') { A.adding = true; A.editing = null; A.err = ''; A.prefill = { email: el.dataset.email, isAdmin: false }; render(); window.scrollTo({ top: 0 }); }
  if (a === 'edit') { A.editing = el.dataset.id; A.adding = false; A.err = ''; render(); }
  if (a === 'cancel') { A.editing = null; A.adding = false; A.err = ''; A.prefill = null; render(); }
  if (a === 'dismiss') { await api('POST', '/api/admin/access-requests/dismiss', { email: el.dataset.email }); load(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && (A.adding || A.editing)) { A.editing = null; A.adding = false; A.err = ''; render(); } });

(async function boot() {
  try { const t = await (await fetch('../triodian-mark.svg')).text(); A.mark = t.replace('<svg', '<svg aria-hidden="true" focusable="false"'); } catch (e) {}
  const me = await api('GET', '/api/me');
  if (!me.ok) return message(me.code === 'no_access' ? 'No access' : 'Could not load', me.error);
  A.me = me.body.user;
  if (!A.me.isAdmin) return message('Administrators only', 'This page is for administrators. Ask an administrator if you need a user added or changed.');
  load();
})();
})();
