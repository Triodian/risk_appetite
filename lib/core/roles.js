// Roles and permissions. This file is the single statement of who may change what.
// The browser applies the same rules to grey out controls; the server enforces them on every save.
// Cloud-neutral: no Cloudflare, AWS or Azure code here.

export const ROLES = [
  { id: 'counsel', name: 'Counsel (facilitator)' },
  { id: 'triodian', name: 'Triodian (recorder)' },
  { id: 'cro', name: 'CRO' },
  { id: 'risk', name: 'Insurer risk function' },
  { id: 'independent', name: 'Independent reviewer' },
  { id: 'board', name: 'Board record' },
];
export const ROLE_IDS = ROLES.map(r => r.id);
export const ROLE_SHORT = { counsel: 'Counsel', triodian: 'Triodian', cro: 'CRO', risk: 'Insurer risk', independent: 'Independent reviewer', board: 'Board record', none: 'No engagement role' };
export const DECISIONS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'];

/** Same rule as the app's can(). target: a decision id, 'setup', 'measures', 'overall', 'challengeResponse', 'qcResponse', 'approval', 'agree'. */
export function can(target, role) {
  if (!role || role === 'none') return false;
  if (target === 'approval') return role === 'board';
  if (target === 'agree') return role === 'cro';
  if (role === 'board') return false;
  if (target === 'overall') return role === 'counsel' || role === 'cro';
  if (target === 'challengeResponse') return ['counsel', 'cro', 'risk'].includes(role);
  if (target === 'qcResponse') return role === 'counsel';
  if (role === 'independent') return target === 'd2';
  return true;
}

export const TARGET_NAME = {
  setup: 'set-up', measures: 'measure owners', overall: 'the overall position', challengeResponse: 'challenge responses',
  qcResponse: 'responses to questions for counsel', approval: 'board approval', agree: 'agreeing the working appetite',
  d1: 'decision 1', d2: 'decision 2', d3: 'decision 3', d4: 'decision 4', d5: 'decision 5', d6: 'decision 6', d7: 'decision 7', d8: 'decision 8',
};

/** Permission summary for the admin page's roles table. */
export const PERMISSIONS = [
  { what: 'Set-up (engagement details, functions, inputs, accountability areas)', target: 'setup' },
  { what: 'Decisions 1, 3 to 8', target: 'd1' },
  { what: 'Decision 2', target: 'd2' },
  { what: 'Measure owners', target: 'measures' },
  { what: 'Overall position paragraph', target: 'overall' },
  { what: 'Challenge responses and status', target: 'challengeResponse' },
  { what: 'Responses to questions for counsel', target: 'qcResponse' },
  { what: 'Agree working appetite', target: 'agree' },
  { what: 'Record board approval', target: 'approval' },
];
