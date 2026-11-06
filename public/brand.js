/* Practitioner branding (development plan task 0.4): the firm's name, a line under it and a logo, recorded in set-up
   at engagement.practitioner = { firm, line, logo } and shown in the header and on the Word and PDF exports.
   This file is the same in all the Triodian apps. The server checks the same rule in lib/core/rbac.js (structureError).
   The logo is a PNG of 100 KB at most, held as a data URL in the engagement; it never leaves the client's own deployment. */
(function () {
  'use strict';
  const MAX_BYTES = 100 * 1024;
  const RE = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /** The recorded branding, or null when no firm or logo is set. */
  function of(p) { p = p || {}; const firm = String(p.firm || '').trim(), line = String(p.line || '').trim(), logo = RE.test(p.logo || '') ? p.logo : ''; return firm || logo ? { firm, line, logo } : null; }

  /** Width and height of a PNG data URL, read from its header (no image decoding needed). */
  function size(dataUrl) {
    const m = RE.exec(dataUrl || ''); if (!m) return null;
    const bin = atob(m[1].slice(0, 44)), b = i => bin.charCodeAt(i);
    if (bin.slice(1, 4) !== 'PNG') return null;
    return { w: (b(16) << 24 | b(17) << 16 | b(18) << 8 | b(19)) >>> 0, h: (b(20) << 24 | b(21) << 16 | b(22) << 8 | b(23)) >>> 0 };
  }

  /** Reads a chosen file as a logo. Resolves to a data URL; rejects with a plain reason. */
  function readLogo(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file was chosen.'));
      if (file.type !== 'image/png') return reject(new Error('The logo must be a PNG file.'));
      if (file.size > MAX_BYTES) return reject(new Error(`The logo is ${Math.ceil(file.size / 1024)} KB. It must be 100 KB or less.`));
      const r = new FileReader();
      r.onload = () => { const v = String(r.result || ''); if (!size(v)) return reject(new Error('That file is not a readable PNG.')); resolve(v); };
      r.onerror = () => reject(new Error('The file could not be read.'));
      r.readAsDataURL(file);
    });
  }

  /** The firm shown in the app header, beside the privilege marking. */
  function chip(p) {
    const b = of(p); if (!b) return '';
    return `<span class="brandchip" title="${esc(b.line || ('Prepared by ' + b.firm))}" style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ink-soft,#4F5966);white-space:nowrap">${b.logo ? `<img src="${b.logo}" alt="" style="height:18px;width:auto;display:block">` : ''}${b.firm ? `<span>${esc(b.firm)}</span>` : ''}</span>`;
  }

  /** The logo control for set-up: a preview, a file chooser and a remove button. `disabled` is '' or 'disabled'. */
  function logoControl(p, disabled) {
    const logo = (p && RE.test(p.logo || '')) ? p.logo : '';
    return `<div><label class="f" for="brand-logo" style="margin-bottom:6px"><span>Logo · PNG, 100 KB at most</span></label><div class="row" style="gap:12px;align-items:center;flex-wrap:wrap">
      ${logo ? `<img src="${logo}" alt="The firm's logo" style="height:36px;width:auto;border:1px solid var(--rule,#C9CFD6);padding:4px;background:#fff;border-radius:4px">` : '<span class="small soft">No logo</span>'}
      <input type="file" id="brand-logo" accept="image/png" aria-label="Choose the firm's logo" ${disabled}>
      ${logo ? `<button type="button" class="btn sm" data-brand-clear="1" ${disabled}>Remove the logo</button>` : ''}</div>
      <p class="small soft" style="margin:6px 0 0">Shown in the header and on every Word and PDF output, above the privilege marking.</p></div>`;
  }

  /** Wires the logo control to the app: set(value) records engagement.practitioner.logo; toast(text) tells the person. */
  function bind(set, toast) {
    document.addEventListener('change', ev => {
      const t = ev.target; if (!t || t.id !== 'brand-logo' || !t.files || !t.files[0]) return;
      readLogo(t.files[0]).then(v => { set(v); toast('Logo recorded'); }, err => { t.value = ''; toast(err.message); });
    });
    document.addEventListener('click', ev => {
      const t = ev.target && ev.target.closest && ev.target.closest('[data-brand-clear]'); if (!t || t.disabled) return;
      set(''); toast('Logo removed');
    });
  }

  /** An invented mark used only by the worked examples. */
  const EXAMPLE_LOGO = 'data:image/png;base64,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';

  window.TriodianBrand = { EXAMPLE_LOGO, MAX_BYTES, of, size, readLogo, chip, logoControl, bind };
})();
