// Roles and permissions. This file is the single statement of who may change what.
// The browser applies the same rules to grey out controls; the server enforces them on every save.
// Cloud-neutral: no Cloudflare, AWS or Azure code here.

export const ROLES = [
  { id: 'counsel', name: 'Counsel (facilitator)' },
  // The client's general counsel, in-house or fractional (development plan task 0.6). Records and responds as counsel
  // does; like counsel, never proposes a position.
  { id: 'gc', name: 'General counsel (client)' },
  { id: 'triodian', name: 'Triodian (recorder)' },
  { id: 'cro', name: 'CRO' },
  { id: 'risk', name: 'Risk function' },
  { id: 'independent', name: 'Independent reviewer' },
  { id: 'board', name: 'Board record' },
];
export const ROLE_IDS = ROLES.map(r => r.id);
/** Who may propose a position (framework 7.3): on decisions 1 and 3 to 8 the CRO or the risk function; decision 2 also the independent reviewer. */
export const proposerRoles = did => did === 'd2' ? ['cro', 'risk', 'independent'] : ['cro', 'risk'];
export const ROLE_SHORT = { counsel: 'Counsel', gc: 'GC', triodian: 'Triodian', cro: 'CRO', risk: 'Risk function', independent: 'Independent reviewer', board: 'Board record', none: 'No engagement role' };
export const DECISIONS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'];

/** A person's roles as a list. A person may hold several (development plan task 0.6); older records hold one, in role. */
export function rolesOf(u) {
  if (!u) return [];
  if (Array.isArray(u.roles) && u.roles.length) return u.roles.filter(r => ROLE_IDS.includes(r));
  return u.role && ROLE_IDS.includes(u.role) ? [u.role] : [];
}

/** What one role may change. */
export function canRole(target, role) {
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

/** Same rule as the app's can(). Set-up is not decided here: it is for administrators (see rbac.js). target: a decision id,
 * 'setup', 'measures', 'overall', 'challengeResponse', 'qcResponse', 'approval', 'agree'. roles: a list of roles (any one
 * that allows the change is enough), or a single role. */
export function can(target, roles) {
  const list = Array.isArray(roles) ? roles : roles ? [roles] : [];
  return list.some(r => canRole(target, r));
}

export const TARGET_NAME = {
  setup: 'set-up', measures: 'measure owners', overall: 'the overall position', challengeResponse: 'challenge responses',
  qcResponse: 'responses to questions for counsel', approval: 'board approval', agree: 'agreeing the working appetite',
  d1: 'decision 1', d2: 'decision 2', d3: 'decision 3', d4: 'decision 4', d5: 'decision 5', d6: 'decision 6', d7: 'decision 7', d8: 'decision 8',
};

/** Permission summary for the admin page's roles table. */
export const PERMISSIONS = [
  { what: 'Set-up (engagement details, functions, inputs, accountability areas) · in Admin', target: 'setup', adminOnly: true },
  { what: 'Decisions 1, 3 to 8', target: 'd1' },
  { what: 'Decision 2', target: 'd2' },
  { what: 'Measure owners', target: 'measures' },
  { what: 'Overall position paragraph', target: 'overall' },
  { what: 'Challenge responses and status', target: 'challengeResponse' },
  { what: 'Responses to questions for counsel', target: 'qcResponse' },
  { what: 'Agree working appetite', target: 'agree' },
  { what: 'Record board approval', target: 'approval' },
];
