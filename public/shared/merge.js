// Three-way merge of two edits made to the same saved engagement.
// Used by the server when two people save at nearly the same time, and by the browser to keep
// edits typed while a save was on its way. Plain JavaScript, no platform code.
//
// base:   the engagement both people started from
// mine:   the version being saved now
// theirs: the version someone else saved in the meantime
// Returns { data, conflicts } where conflicts lists the paths (arrays of keys) both people
// changed to different values. When there are conflicts, `data` must not be saved.

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
const same = (a, b) => stable(a) === stable(b);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const keyOf = x => (isObj(x) ? (typeof x.ref === 'string' ? 'ref:' + x.ref : typeof x.id === 'string' ? 'id:' + x.id : null) : null);
const keyed = a => Array.isArray(a) && a.every(x => keyOf(x) !== null);

function merge(b, x, y, path, conflicts) {
  if (same(x, y)) return x;
  if (same(b, x)) return y;   // only they changed it
  if (same(b, y)) return x;   // only I changed it
  // Both changed it, differently.
  if (isObj(x) && isObj(y)) {
    const bo = isObj(b) ? b : {}, out = {};
    [...new Set([...Object.keys(y), ...Object.keys(x)])].forEach(k => {
      const v = merge(bo[k], x[k], y[k], path.concat(k), conflicts);
      if (v !== undefined) out[k] = v;
    });
    return out;
  }
  if (keyed(x) && keyed(y) && (b === undefined || keyed(b))) {
    const bm = new Map((b || []).map(e => [keyOf(e), e])), xm = new Map(x.map(e => [keyOf(e), e])), ym = new Map(y.map(e => [keyOf(e), e]));
    const order = y.map(keyOf).concat(x.map(keyOf).filter(k => !ym.has(k)));
    const out = [];
    order.forEach(k => {
      const v = merge(bm.get(k), xm.get(k), ym.get(k), path.concat(k), conflicts);
      if (v !== undefined) out.push(v);
    });
    return out;
  }
  conflicts.push(path);
  return y;
}

export function merge3(base, mine, theirs) {
  const conflicts = [];
  const strip = d => { const c = Object.assign({}, d); delete c.history; return c; };
  const data = merge(strip(base), strip(mine), strip(theirs), [], conflicts);
  // History is append-only: their entries, then the entries I added since the base.
  const bl = (base.history || []).length;
  data.history = (theirs.history || []).concat((mine.history || []).slice(bl));
  return { data, conflicts };
}
