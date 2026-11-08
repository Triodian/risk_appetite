/* Sector packs (development plan tasks 3.1 and 3.2). The content's fixed wording names no sector: words in braces,
   such as {entity} or {customer}, are filled from the pack chosen in set-up, and the pack supplies the functions and
   inputs I1 to I11. Packs live in content/packs/*.json; tools/build-content.mjs merges them into content.js.
   Shared by the page (window.TriodianPacks) and the tests (require or import of this file's exports). */
(function (root) {
  'use strict';
  const DEFAULT = 'generalInsurer';
  // The parts of the content a pack replaces whole, and the nouns every pack names.
  const WHOLE = ['functions', 'inputs'];
  const NOUNS = ['entity', 'Entity', 'entities', 'Entities', 'anEntity', 'AnEntity', 'customer', 'Customer', 'customers', 'Customers', 'aCustomer', 'ACustomer', 'customerHarm', 'regulator'];

  function fill(s, nouns) { return s.replace(/\{([A-Za-z]+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(nouns, k) ? nouns[k] : m)); }
  function walk(o, nouns) {
    if (typeof o === 'string') return fill(o, nouns);
    if (Array.isArray(o)) return o.map(v => walk(v, nouns));
    if (o && typeof o === 'object') { const r = {}; for (const k of Object.keys(o)) r[k] = walk(o[k], nouns); return r; }
    return o;
  }
  // override: { "decisions.6.purpose": "…" } replaces one string at that path, before the nouns are filled.
  function setPath(o, path, v) {
    const ks = path.split('.'); let t = o;
    for (let i = 0; i < ks.length - 1; i++) { if (t == null || typeof t !== 'object' || !(ks[i] in t)) throw new Error('Pack override path not found: ' + path); t = t[ks[i]]; }
    if (t == null || typeof t[ks[ks.length - 1]] !== 'string') throw new Error('Pack override path is not a string: ' + path);
    t[ks[ks.length - 1]] = v;
  }

  function packOf(base, id) { const P = (base && base.packs) || {}; return P[id] || P[DEFAULT] || null; }
  /** The content with one pack applied: what the page works from. base.packs stays on the result, for set-up. */
  function resolve(base, id) {
    const pack = packOf(base, id);
    if (!pack) throw new Error('No sector packs in the content. Run node tools/build-content.mjs');
    const c = JSON.parse(JSON.stringify(Object.assign({}, base, { packs: undefined })));
    for (const k of WHOLE) if (pack[k]) c[k] = JSON.parse(JSON.stringify(pack[k]));
    for (const [path, v] of Object.entries(pack.override || {})) setPath(c, path, v);
    const out = walk(c, pack.nouns || {});
    out.packs = base.packs; out.pack = pack.id;
    return out;
  }
  /** Tokens left unfilled in resolved content (a pack missing a noun, or a typo in a token). */
  function unfilled(resolved) {
    const left = new Set();
    (function w(o) { if (typeof o === 'string') { for (const m of o.matchAll(/\{([A-Za-z]+)\}/g)) if (NOUNS.includes(m[1]) || /^[a-z]+[A-Z]/.test(m[1])) left.add(m[1]); } else if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => { if (k !== 'packs') w(v); }); })(resolved);
    return [...left];
  }
  function list(base) { return Object.values((base && base.packs) || {}).map(p => ({ id: p.id, name: p.name, jurisdiction: p.jurisdiction, entityTypes: p.entityTypes || [] })); }
  /** The pack that fits an entity type, if any. */
  function forEntityType(base, entityType) { return list(base).find(p => p.entityTypes.includes(entityType)) || null; }

  const api = { DEFAULT, WHOLE, NOUNS, resolve, unfilled, list, forEntityType, fill };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TriodianPacks = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
