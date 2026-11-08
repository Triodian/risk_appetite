// The board directions in AI Risk Appetite (development plan task 3.5): the file AI Board Direction issues
// (triodian.bd.directions.v1, board-direction lib/core/directions.js), read over the BOARD service binding or loaded
// as a file. Shared by the browser (window.RAFDirections) and the server, which checks a stored copy on every save.

export const FORMAT = 'triodian.bd.directions.v1';
const TIER = /^A[1-6]$/, isObj = v => v && typeof v === 'object' && !Array.isArray(v), str = (v, n) => typeof v === 'string' && v.length <= n;
export const tierRank = t => (TIER.test(t || '') ? +t.slice(1) : 0);

/** '' when o is a directions file this app can use, otherwise why not. */
export function directionsError(o) {
  if (!isObj(o) || o.format !== FORMAT) return `Not a board directions file (format ${FORMAT}).`;
  const D = o.directions;
  if (!isObj(D) || !isObj(D.BD1) || !Array.isArray(D.BD1.areas)) return 'The board directions file has no BD1 posture by area.';
  if (D.BD1.areas.length > 60) return 'The board directions file has too many areas.';
  for (const a of D.BD1.areas) {
    if (!isObj(a) || !str(a.name, 200)) return 'An area in BD1 has no name.';
    if (a.maxTier != null && !TIER.test(a.maxTier)) return `BD1 gives ${a.name} a tier that is not A1 to A6.`;
    if (a.condition != null && !str(a.condition, 2000)) return `BD1's condition for ${a.name} is too long.`;
  }
  if (D.BD3 && D.BD3.reservedFrom != null && !TIER.test(D.BD3.reservedFrom)) return 'BD3 gives a reserved tier that is not A1 to A6.';
  if (JSON.stringify(o).length > 200000) return 'The board directions file is too large.';
  return '';
}

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** The BD1 area for a Risk Appetite function, matched by name (the sector packs give both apps the same names). */
export function areaFor(o, functionName) {
  const areas = (o && o.directions && o.directions.BD1 && o.directions.BD1.areas) || [];
  return areas.find(a => norm(a.name) === norm(functionName)) || null;
}

/** The directions read on a decision, for the panel at the top of its screen. */
export function readOn(o, did) {
  const D = (o && o.directions) || {};
  return Object.entries(D).filter(([, v]) => v && Array.isArray(v.readOn) && v.readOn.includes(did)).map(([id, v]) => ({ id, ...v }));
}

/** Why a decision 1 ceiling goes past the board's direction for its function, or ''. A ceiling above the highest tier
 *  the area's posture accepts is beyond the direction: above that level the decision is reserved to the board. */
export function beyondDirection(o, functionName, tier) {
  const a = areaFor(o, functionName); if (!a || !a.maxTier || !tierRank(tier)) return '';
  return tierRank(tier) > tierRank(a.maxTier) ? `${tier} is above ${a.maxTier}, the highest tier the board’s ${a.postureLabel || 'posture'} posture for ${a.name} accepts (BD1)` : '';
}
