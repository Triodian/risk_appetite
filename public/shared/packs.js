/* Sector packs (development plan tasks 3.1 and 3.2). The content's fixed wording names no sector: words in braces,
   such as {entity} or {customer}, are filled from the pack chosen in set-up, and the pack replaces whole the parts
   that differ by sector (in Risk Appetite the functions and inputs I1 to I11; in Use Assessment the documents).
   Packs live in content/packs/*.json; tools/build-content.mjs merges them into the content script.
   The same file is in AI Risk Appetite and AI Use Assessment. Used by the page (window.TriodianPacks) and the tests. */
(function (root) {
  'use strict';
  const DEFAULT = 'generalInsurer';
  // The nouns every pack names.
  const NOUNS = ['entity', 'Entity', 'entities', 'Entities', 'anEntity', 'AnEntity', 'customer', 'Customer', 'customers', 'Customers', 'aCustomer', 'ACustomer', 'customerHarm', 'regulator'];

  function fill(s, nouns) { return s.replace(/\{([A-Za-z]+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(nouns, k) ? nouns[k] : m)); }
  function walk(o, nouns) {
    if (typeof o === 'string') return fill(o, nouns);
    if (Array.isArray(o)) return o.map(v => walk(v, nouns));
    if (o && typeof o === 'object') { const r = {}; for (const k of Object.keys(o)) r[k] = walk(o[k], nouns); return r; }
    return o;
  }
  // replace: { functions: [...] } replaces a top-level part whole.
  // override: { "decisions.6.purpose": "…" } replaces one string at that path. All three apply before the nouns are filled.
  function getPath(o, path) { return path.split('.').reduce((t, k) => (t == null ? t : t[k]), o); }
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
    for (const [k, v] of Object.entries(pack.replace || {})) c[k] = JSON.parse(JSON.stringify(v));
    for (const [path, v] of Object.entries(pack.override || {})) setPath(c, path, v);
    // edits: [{ at: "frameworkMarkdown", find: "…", replace: "…" }] changes words inside one string; find must be there.
    for (const e of pack.edits || []) {
      const cur = getPath(c, e.at);
      if (typeof cur !== 'string' || !cur.includes(e.find)) throw new Error('Pack edit not found in ' + e.at + ': ' + e.find.slice(0, 60));
      setPath(c, e.at, cur.split(e.find).join(e.replace));
    }
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

  const api = { DEFAULT, NOUNS, resolve, unfilled, list, forEntityType, fill };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TriodianPacks = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
