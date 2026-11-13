/* The governing body's name (best-practice baselines, development plan task BP.4). A baseline for a public body
   (government, or critical infrastructure run by government) is directed by its accountable authority, not a board.
   The apps are written with "board"; when the chosen pack's governing body is the accountable authority, the words
   on screen and in the outputs are relabelled. What a person types is left as they wrote it, except where it is
   printed inside an output. The product name "AI Board Direction" is never changed.
   The same file is in AI Board Direction, AI Risk Appetite and AI Use Assessment. Used by the page
   (window.TriodianTerms) and the tests. */
(function (root) {
  'use strict';
  const AA = 'accountableAuthority';
  const KEEP = /\b(?:AI Board Direction|Board Direction)\b/g;
  const RULES = [
    [/\b([Aa]) board\b/g, (m, a) => a + 'n accountable authority'],
    [/\bboards\b/g, 'accountable authorities'],
    [/\bBoards\b/g, 'Accountable authorities'],
    [/\bBOARD\b/g, 'ACCOUNTABLE AUTHORITY'],
    [/\bboard\b/g, 'accountable authority'],
    [/\bBoard\b/g, 'Accountable authority'],
  ];

  /** The text with "board" relabelled for an accountable authority; unchanged for a board. */
  function relabel(s, body) {
    if (body !== AA || typeof s !== 'string' || !/board/i.test(s)) return s;
    const kept = [];
    let t = s.replace(KEEP, m => { kept.push(m); return '\u0000' + (kept.length - 1) + '\u0000'; });
    for (const [re, to] of RULES) t = t.replace(re, to);
    return t.replace(/\u0000(\d+)\u0000/g, (m, i) => kept[+i]);
  }
  /** The governing body's name, for headings that name it directly. */
  function bodyName(body, capital) { return body === AA ? (capital ? 'Accountable authority' : 'accountable authority') : (capital ? 'Board' : 'board'); }

  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE']);
  /** Relabels the text on screen under node. Form fields keep what the person typed. */
  function relabelDom(node, body) {
    if (body !== AA || !node || typeof document === 'undefined') return;
    const w = document.createTreeWalker(node, 4 /* NodeFilter.SHOW_TEXT */, {
      acceptNode: n => { for (let p = n.parentNode; p && p !== node.parentNode; p = p.parentNode) { if (SKIP.has(p.nodeName) || (p.isContentEditable && p !== node)) return 2; } return 1; },
    });
    const list = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) list.push(n);
    for (const n of list) { const v = relabel(n.nodeValue, body); if (v !== n.nodeValue) n.nodeValue = v; }
    for (const el of node.querySelectorAll ? node.querySelectorAll('[title],[aria-label],[placeholder]') : []) {
      for (const a of ['title', 'aria-label', 'placeholder']) { const v = el.getAttribute(a); if (v) { const r = relabel(v, body); if (r !== v) el.setAttribute(a, r); } }
    }
  }
  /** Keeps the screen relabelled as it re-renders. getBody() gives the current governing body. */
  function watch(target, getBody) {
    if (typeof MutationObserver === 'undefined' || !target) return null;
    let busy = false;
    const run = () => { if (busy) return; busy = true; try { relabelDom(target, getBody()); } finally { busy = false; } };
    const mo = new MutationObserver(run);
    mo.observe(target, { childList: true, subtree: true, characterData: true });
    run();
    return mo;
  }

  /** Relabels the Markdown handed to the Word and PDF exports (window.RAFExport), so downloads match the screen. */
  function wrapExport(ex, getBody) {
    if (!ex || ex.__terms) return ex;
    for (const k of ['toDocx', 'printPdf', 'toPrintHtml']) {
      const f = ex[k];
      if (typeof f === 'function') ex[k] = function (md, ...rest) { return f.call(this, relabel(md, getBody()), ...rest); };
    }
    ex.__terms = true;
    return ex;
  }

  const api = { AA, relabel, bodyName, relabelDom, watch, wrapExport };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TriodianTerms = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
