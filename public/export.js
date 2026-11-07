/* Word and PDF export of the output documents.
   Both take the same Markdown the Outputs screen shows. The first line of every output is the
   privilege marking; it is moved into the page header so it appears on every page.
   meta.brand is the practitioner's branding from set-up ({ firm, line, logo }, read through brand.js). When set, the
   firm's logo, name and line sit above the marking in the header, and the firm is the document's creator.
   This file is the same in all the Triodian apps. */
(function () {
  'use strict';

  /* ---------- Markdown → blocks ---------- */
  function splitRow(r) {
    const out = []; let cur = ''; const s = r.trim().replace(/^\|/, '').replace(/\|$/, '');
    for (let k = 0; k < s.length; k++) { if (s[k] === '\\' && s[k + 1] === '|') { cur += '|'; k++; } else if (s[k] === '|') { out.push(cur.trim()); cur = ''; } else cur += s[k]; }
    out.push(cur.trim()); return out;
  }
  function blocks(md) {
    const L = md.split('\n'), out = []; let i = 0;
    const isBlock = l => /^(#{1,4} |\s*\||\s*([-*]|\d+\.) |---\s*$)/.test(l);
    while (i < L.length) {
      const l = L[i];
      if (/^#{1,4} /.test(l)) { const n = l.match(/^#+/)[0].length; out.push({ t: 'h', n, text: l.slice(n + 1) }); i++; continue; }
      if (/^\s*\|/.test(l)) { const rows = []; while (i < L.length && /^\s*\|/.test(L[i])) rows.push(L[i++]); out.push({ t: 'table', head: splitRow(rows[0]), rows: rows.slice(2).map(splitRow) }); continue; }
      if (/^\s*([-*]|\d+\.) /.test(l)) { const ol = /^\s*\d+\./.test(l), items = []; while (i < L.length && /^\s*([-*]|\d+\.) /.test(L[i])) items.push(L[i++].replace(/^\s*([-*]|\d+\.) /, '').replace(/^\[( |x)\] /, (m, x) => x === 'x' ? '☑ ' : '☐ ')); out.push({ t: 'list', ol, items }); continue; }
      if (/^---\s*$/.test(l)) { out.push({ t: 'hr' }); i++; continue; }
      if (!l.trim()) { i++; continue; }
      const para = []; while (i < L.length && L[i].trim() && !isBlock(L[i])) para.push(L[i++]); out.push({ t: 'p', text: para.join(' ') });
    }
    return out;
  }
  /* inline: **bold**, *italic*, `code`; returns [{text, b, i, code}] */
  function inlines(s) {
    s = s.replace(/\\([\[\]|])/g, '$1');
    const out = [], re = /\*\*([^*]+)\*\*|(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)|`([^`]+)`/g; let last = 0, m;
    while ((m = re.exec(s))) {
      const pre = m[2] || '', start = m.index + pre.length;
      if (start > last) out.push({ text: s.slice(last, start) });
      if (m[1] != null) out.push({ text: m[1], b: true }); else if (m[3] != null) out.push({ text: m[3], i: true }); else out.push({ text: m[4], code: true });
      last = re.lastIndex;
    }
    if (last < s.length) out.push({ text: s.slice(last) });
    return out.filter(x => x.text);
  }
  function split(md) {
    const lines = md.split('\n'), first = lines.findIndex(l => l.trim());
    const marking = first >= 0 && !/^#/.test(lines[first]) ? lines[first].trim() : '';
    const body = marking ? lines.slice(first + 1).join('\n') : md;
    const tm = /^# (.+)$/m.exec(body);
    return { marking, body, title: tm ? tm[1] : 'Document' };
  }

  /* ---------- Word ---------- */
  let docxLoading = null;
  function loadDocx() {
    if (window.docx) return Promise.resolve(window.docx);
    if (!docxLoading) docxLoading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/vendor/docx.min.js'; s.onload = () => window.docx ? res(window.docx) : rej(new Error('docx did not load')); s.onerror = () => rej(new Error('docx did not load')); document.head.appendChild(s); });
    return docxLoading;
  }
  const PRIV = '7D1D2C', INK = '17202B', SOFT = '4F5966', RULE = 'C9CFD6', HEAD_BG = 'EEF0F3';
  const brandOf = meta => (window.TriodianBrand && meta && meta.brand) ? window.TriodianBrand.of(meta.brand) : null;
  const pngBytes = url => { const bin = atob(url.slice(url.indexOf(',') + 1)), u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k); return u; };
  const BODY_FONT = 'Georgia', PAGE_W = 11906, PAGE_H = 16838, MARGIN = 1134, TEXT_W = PAGE_W - 2 * MARGIN, TEXT_WL = PAGE_H - 2 * MARGIN; // A4, 2 cm margins

  async function toDocx(md, meta) {
    const D = await loadDocx();
    const { marking, body, title } = split(md), brand = brandOf(meta);
    meta = Object.assign({}, meta, { wide: blocks(body).some(b => b.t === 'table' && b.head.length >= 7) }); // wide tables → landscape
    const runs = (s, o = {}) => inlines(s).map(x => new D.TextRun({ text: x.text, bold: x.b || o.bold, italics: x.i || o.italics, font: x.code ? 'Consolas' : undefined, size: o.size, color: o.color }));
    const children = []; let h1seen = false; // each later top-level heading (an attachment) starts a new page
    blocks(body).forEach(b => {
      if (b.t === 'h') {
        if (b.n === 1) { children.push(new D.Paragraph({ heading: D.HeadingLevel.TITLE, pageBreakBefore: h1seen, children: runs(b.text) })); h1seen = true; }
        else children.push(new D.Paragraph({ heading: [null, null, D.HeadingLevel.HEADING_1, D.HeadingLevel.HEADING_2, D.HeadingLevel.HEADING_3][b.n], keepNext: true, children: runs(b.text) }));
      } else if (b.t === 'p') children.push(new D.Paragraph({ children: runs(b.text) }));
      else if (b.t === 'hr') children.push(new D.Paragraph({ border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: RULE, space: 4 } }, children: [] }));
      else if (b.t === 'list') b.items.forEach(it => children.push(new D.Paragraph({ numbering: { reference: b.ol ? 'num' : 'bul', level: 0 }, children: runs(it) })));
      else if (b.t === 'table') {
        const n = b.head.length, plain = c => inlines(c).map(x => x.text).join('');
        const len = c => Math.min(60, Math.max(6, plain(c).length)), word = c => Math.max(0, ...plain(c).split(/\s+/).map(w => w.length));
        const weight = b.head.map((h, j) => Math.max(len(h), ...b.rows.map(r => len(r[j] || ''))));
        const minW = b.head.map((h, j) => Math.min(2400, Math.max(700, 105 * Math.max(word(h), ...b.rows.map(r => word(r[j] || ''))) + 200)));
        const textW = meta.wide ? TEXT_WL : TEXT_W;
        let widths = minW.slice(), spare = textW - widths.reduce((a, x) => a + x, 0);
        if (spare > 0) { const tot = weight.reduce((a, x) => a + x, 0); widths = widths.map((w, j) => w + Math.floor(spare * weight[j] / tot)); }
        else { const tot = widths.reduce((a, x) => a + x, 0); widths = widths.map(w => Math.floor(w * textW / tot)); }
        widths[widths.length - 1] += textW - widths.reduce((a, x) => a + x, 0);
        const border = { style: D.BorderStyle.SINGLE, size: 4, color: RULE };
        const cell = (txt, j, head) => new D.TableCell({ width: { size: widths[j], type: D.WidthType.DXA }, margins: { top: 60, bottom: 60, left: 90, right: 90 },
          shading: head ? { type: D.ShadingType.CLEAR, color: 'auto', fill: HEAD_BG } : undefined,
          children: [new D.Paragraph({ spacing: { after: 0, line: 260 }, children: runs(txt, { size: 18, bold: head || undefined }) })] });
        children.push(new D.Table({ width: { size: textW, type: D.WidthType.DXA }, columnWidths: widths,
          borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
          rows: [new D.TableRow({ tableHeader: true, children: b.head.map((h, j) => cell(h, j, true)) }), ...b.rows.map(r => new D.TableRow({ cantSplit: true, children: Array.from({ length: n }, (_, j) => cell(r[j] || '', j, false)) }))] }));
        children.push(new D.Paragraph({ spacing: { after: 120 }, children: [] }));
      }
    });
    const head = [];
    if (brand) {
      const r = [];
      if (brand.logo) {
        const sz = window.TriodianBrand.size(brand.logo) || { w: 1, h: 1 }, h0 = 30, w0 = h0 * sz.w / sz.h, k = Math.min(1, 200 / w0); // 30 px high, 200 px wide at most
        r.push(new D.ImageRun({ type: 'png', data: pngBytes(brand.logo), transformation: { width: Math.round(w0 * k), height: Math.round(h0 * k) } }));
        if (brand.firm || brand.line) r.push(new D.TextRun({ text: '   ' }));
      }
      if (brand.firm) r.push(new D.TextRun({ text: brand.firm, bold: true, color: INK, size: 18 }));
      if (brand.line) r.push(new D.TextRun({ text: (brand.firm ? '  ·  ' : '') + brand.line, color: SOFT, size: 16 }));
      head.push(new D.Paragraph({ spacing: { after: 80 }, children: r }));
    }
    head.push(new D.Paragraph({ border: { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } }, children: [new D.TextRun({ text: marking || 'Privilege marking not recorded', italics: true, color: PRIV, size: 17 })] }));
    const doc = new D.Document({
      creator: (brand && brand.firm) || meta.creator || 'Triodian', title, description: meta.reference || '',
      styles: {
        default: { document: { run: { font: BODY_FONT, size: 21, color: INK }, paragraph: { spacing: { after: 140, line: 300 } } } },
        paragraphStyles: [
          { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { font: BODY_FONT, size: 40, bold: true, color: INK }, paragraph: { spacing: { after: 200 } } },
          { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: BODY_FONT, size: 28, bold: true, color: INK }, paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 0 } },
          { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: BODY_FONT, size: 24, bold: true, color: INK }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
          { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: BODY_FONT, size: 22, bold: true, color: SOFT }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
        ],
      },
      numbering: { config: [
        { reference: 'bul', levels: [{ level: 0, format: D.LevelFormat.BULLET, text: '•', alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
        { reference: 'num', levels: [{ level: 0, format: D.LevelFormat.DECIMAL, text: '%1.', alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
      ] },
      sections: [{
        properties: { page: { size: { width: PAGE_W, height: PAGE_H, orientation: meta.wide ? D.PageOrientation.LANDSCAPE : D.PageOrientation.PORTRAIT }, margin: { top: 1300, bottom: 1200, left: MARGIN, right: MARGIN, header: 560, footer: 560 } } },
        headers: { default: new D.Header({ children: head }) },
        footers: { default: new D.Footer({ children: [new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: meta.wide ? TEXT_WL : TEXT_W }], children: [
          new D.TextRun({ text: [meta.insurer, meta.reference, title].filter(Boolean).join(' · '), color: SOFT, size: 16 }),
          new D.TextRun({ text: '\tPage ', color: SOFT, size: 16 }), new D.TextRun({ children: [D.PageNumber.CURRENT], color: SOFT, size: 16 }), new D.TextRun({ text: ' of ', color: SOFT, size: 16 }), new D.TextRun({ children: [D.PageNumber.TOTAL_PAGES], color: SOFT, size: 16 })] })] }) },
        children,
      }],
    });
    return D.Packer.toBlob(doc);
  }

  /* ---------- PDF (through the browser's print dialog) ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function toPrintHtml(md, meta, mdToHtml) {
    const { marking, body, title } = split(md), brand = brandOf(meta);
    const brandHtml = brand ? `<div class="brand">${brand.logo ? `<img src="${brand.logo}" alt="">` : ''}${brand.firm ? `<strong>${esc(brand.firm)}</strong>` : ''}${brand.line ? `<span>${brand.firm ? '· ' : ''}${esc(brand.line)}</span>` : ''}</div>` : '';
    const foot = [meta.insurer, meta.reference, title].filter(Boolean).join(' · '), wide = blocks(body).some(b => b.t === 'table' && b.head.length >= 7);
    return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><title>${esc(meta.fileBase || title)}</title><style>
@font-face{font-family:'Source Serif 4';font-style:normal;font-weight:200 900;src:url(/fonts/source-serif-4-latin-opsz-normal.woff2) format('woff2')}
@font-face{font-family:'Source Serif 4';font-style:italic;font-weight:200 900;src:url(/fonts/source-serif-4-latin-opsz-italic.woff2) format('woff2')}
@font-face{font-family:'IBM Plex Sans';font-weight:400;src:url(/fonts/ibm-plex-sans-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:'IBM Plex Sans';font-weight:600;src:url(/fonts/ibm-plex-sans-latin-600-normal.woff2) format('woff2')}
@page{size:A4 ${wide ? 'landscape' : 'portrait'};margin:16mm 18mm 18mm;@bottom-left{content:"${esc(foot).replace(/"/g, '\\"')}";font:8pt 'IBM Plex Sans',sans-serif;color:#4F5966}@bottom-right{content:"Page " counter(page) " of " counter(pages);font:8pt 'IBM Plex Sans',sans-serif;color:#4F5966}}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font:10.5pt/1.5 'Source Serif 4',Georgia,serif;color:#17202B}
table.frame{width:100%;border-collapse:collapse}table.frame>thead td{padding:0 0 4mm}
.brand{display:flex;align-items:center;gap:3mm;margin:0 0 2.5mm;font:9pt/1.3 'IBM Plex Sans',Arial,sans-serif;color:#4F5966}.brand img{height:8mm;width:auto;max-width:55mm}.brand strong{color:#17202B;font-weight:600}
.mark{font:italic 9pt/1.3 'Source Serif 4',Georgia,serif;color:#7D1D2C;border-bottom:0.5pt solid #C9CFD6;padding-bottom:2mm}
h1{font-size:20pt;line-height:1.2;margin:0 0 4mm}.doc h1~h1{break-before:page}h2{font-size:13.5pt;margin:7mm 0 2mm;break-after:avoid}h3{font-size:11.5pt;margin:5mm 0 2mm;color:#4F5966;break-after:avoid}h4{font-size:10.5pt;margin:4mm 0 1mm}
p{margin:0 0 2.5mm}hr{border:0;border-top:0.5pt solid #C9CFD6;margin:5mm 0}ul,ol{margin:0 0 3mm;padding-left:6mm}
.doc table{width:100%;border-collapse:collapse;margin:2mm 0 4mm;font:8.5pt/1.35 'IBM Plex Sans',Arial,sans-serif}
.doc th,.doc td{border:0.5pt solid #C9CFD6;padding:1.4mm 2mm;text-align:left;vertical-align:top}.doc th{background:#EEF0F3;font-weight:600}.doc tr{break-inside:avoid}.doc thead{display:table-header-group}
code{font:9pt Consolas,monospace}
</style></head><body><table class="frame"><thead><tr><td>${brandHtml}<div class="mark">${esc(marking || 'Privilege marking not recorded')}</div></td></tr></thead><tbody><tr><td><div class="doc">${mdToHtml(body)}</div></td></tr></tbody></table></body></html>`;
  }
  function printPdf(md, meta, mdToHtml) {
    let f = document.getElementById('printframe'); if (f) f.remove();
    f = document.createElement('iframe'); f.id = 'printframe'; f.setAttribute('aria-hidden', 'true'); f.title = 'Print';
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(f);
    const w = f.contentWindow; w.document.open(); w.document.write(toPrintHtml(md, meta, mdToHtml)); w.document.close();
    const go = () => { try { w.focus(); w.print(); } catch (e) { window.open('', '_blank'); } };
    (w.document.fonts && w.document.fonts.ready ? w.document.fonts.ready : Promise.resolve()).then(() => setTimeout(go, 150));
  }

  window.RAFExport = { toDocx, printPdf, toPrintHtml, blocks, inlines };
})();
