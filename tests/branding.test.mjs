// Practitioner branding (development plan task 0.4). The same test is in every Triodian app.
// 1. The server's shape check accepts a firm, a line and a PNG logo of 100 KB at most, and refuses anything else.
// 2. The Word export puts the firm, its line and the logo in the page header above the privilege marking,
//    and names the firm as the document's creator. Without branding the header is as before.
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import vm from 'node:vm';
import { structureError } from '../lib/core/rbac.js';

let failed = 0;
const ok = (cond, label, extra) => { console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (cond || !extra ? '' : ' → ' + extra)); if (!cond) failed++; };

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const big = 'data:image/png;base64,iVBORw0KGgo' + 'A'.repeat(140 * 1024);
const shape = p => structureError({ engagement: { id: 'e1', practitioner: p } });

ok(shape(undefined) === '', 'no practitioner recorded is fine');
ok(shape({ firm: 'Northgate Legal', line: 'Prepared by Northgate Legal using the Triodian method', logo: PNG }) === '', 'firm, line and a small PNG logo are accepted');
ok(shape({ firm: 'Northgate Legal', line: '', logo: '' }) === '', 'an empty logo is accepted');
ok(/practitioner/i.test(shape('Northgate')), 'a practitioner that is not a record is refused', shape('Northgate'));
ok(/logo/i.test(shape({ firm: 'X', logo: 'data:image/svg+xml;base64,PHN2Zz4=' })), 'a logo that is not a PNG is refused');
ok(/100 KB/.test(shape({ firm: 'X', logo: big })), 'a logo over 100 KB is refused', shape({ firm: 'X', logo: big }));
ok(/firm/i.test(shape({ firm: 'x'.repeat(201) })), 'a firm name over 200 characters is refused');

// ---- the Word export, run in Node with the same files the browser loads ----
globalThis.window = globalThis;
for (const f of ['public/vendor/docx.min.js', 'public/brand.js', 'public/export.js']) vm.runInThisContext(readFileSync(new URL('../' + f, import.meta.url), 'utf8'), { filename: f });
window.docx = globalThis.docx;
docx.Packer.toBlob = d => docx.Packer.toBuffer(d); // Node has no Blob support in the zip writer; the bytes are the same
/** Reads one file out of a zip (the .docx), through its central directory. */
function unzip(buf, name) {
  let e = buf.length - 22; while (e > 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  let p = buf.readUInt32LE(e + 16);
  for (let n = buf.readUInt16LE(e + 10); n > 0; n--) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const fname = buf.toString('utf8', p + 46, p + 46 + nl);
    if (fname === name) { const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28), raw = buf.subarray(start, start + size); return (method ? inflateRawSync(raw) : raw).toString('utf8'); }
    p += 46 + nl + xl + cl;
  }
  return '';
}
const md = 'Privileged and confidential · prepared at the request of counsel\n\n# Board paper\n\nText.';
const brand = { firm: 'Northgate Legal', line: 'Prepared by Northgate Legal using the Triodian method', logo: PNG };
const branded = Buffer.from(await window.RAFExport.toDocx(md, { insurer: 'Acme', reference: 'R-1', creator: 'Triodian app', brand }));
const head = unzip(branded, 'word/header1.xml'), core = unzip(branded, 'docProps/core.xml');
ok(head.includes('Northgate Legal') && head.includes('Prepared by Northgate Legal using the Triodian method'), 'the Word header carries the firm and its line');
ok(head.includes('<w:drawing>') || head.includes('<w:drawing '), 'the Word header carries the logo');
ok(head.indexOf('Northgate Legal') < head.indexOf('Privileged and confidential'), 'the firm sits above the privilege marking', head.slice(0, 300));
ok(core.includes('<dc:creator>Northgate Legal</dc:creator>'), 'the firm is the document creator', (core.match(/<dc:creator>[^<]*/) || [''])[0]);

const plain = Buffer.from(await window.RAFExport.toDocx(md, { insurer: 'Acme', reference: 'R-1', creator: 'Triodian app' }));
const head2 = unzip(plain, 'word/header1.xml');
ok(head2.includes('Privileged and confidential') && !head2.includes('w:drawing') && !head2.includes('Northgate'), 'without branding the header holds the marking only');
ok(unzip(plain, 'docProps/core.xml').includes('<dc:creator>Triodian app</dc:creator>'), 'without branding the app is the creator');

const html = window.RAFExport.toPrintHtml(md, { insurer: 'Acme', brand }, s => s);
ok(html.indexOf('Northgate Legal') > 0 && html.indexOf('Northgate Legal') < html.indexOf('class="mark"'), 'the PDF page header carries the firm above the marking');

if (failed) { console.log(failed + ' failed'); process.exit(1); }
console.log('all passed');
