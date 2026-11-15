// Writes a sector pack for each jurisdiction overlay in content/overlays/*.json to content/packs/<id>.json
// (development plan task US.4; the Metamodel's docs/adding-a-jurisdiction.md, step J.4). Each starts from its
// best-practice baseline pack, so the functions, decisions and measures stay the baseline's; the overlay names the
// documents a US entity in the sector usually holds (inputs I1 to I11, in the list and in the framework's table) and,
// where the sector needs it, the consequence prompt at decision 2.
// Run after build-baseline-packs: node tools/build-overlay-packs.mjs && node tools/build-content.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const Packs = createRequire(import.meta.url)('../public/shared/packs.js');
const at = p => new URL('../' + p, import.meta.url);
const content = JSON.parse(readFileSync(at('public/content.json'), 'utf8'));
const deep = o => JSON.parse(JSON.stringify(o));
const built = [];
for (const f of readdirSync(at('content/overlays')).filter(f => f.endsWith('.json')).sort()) {
  const O = JSON.parse(readFileSync(at('content/overlays/' + f), 'utf8'));
  const where = O.jurisdiction === 'US' ? 'the United States' : O.jurisdiction;
  for (const o of O.packs) {
    const base = JSON.parse(readFileSync(at(`content/packs/${o.builtOn}.json`), 'utf8'));
    if (!base.baseline) throw new Error(`${o.id}: ${o.builtOn} is not a baseline pack`);
    const pack = deep(base);
    pack.id = o.id; pack.name = o.name; pack.jurisdiction = O.jurisdiction; pack.entityTypes = [];
    delete pack.baseline; pack.builtOn = base.baseline; pack.overlay = O.jurisdiction;
    pack.note = `Generated from content/overlays/${f} and the ${base.name} pack by tools/build-overlay-packs.mjs; do not edit by hand. The ${base.name.replace(/ \(best-practice baseline\)$/, '').toLowerCase()} baseline for ${where}: the inputs name documents drawn from ${o.instruments}. Whether any of them applies is counsel's question; the matter brief lists the records.`;
    // Rename each input in the list, and its row in the framework text's inputs table as the baseline leaves it.
    const md = Packs.resolve({ ...content, packs: { [base.id]: base } }, base.id).frameworkMarkdown.split('\n');
    for (const [ref, [name, short]] of Object.entries(o.inputs || {})) {
      const inp = pack.replace.inputs.find(i => i.ref === ref);
      if (!inp) throw new Error(`${o.id}: no input ${ref} in ${o.builtOn}`);
      inp.name = name;
      const row = md.find(l => l.startsWith(`| ${ref} | `));
      if (!row) throw new Error(`${o.id}: no ${ref} row in the framework text`);
      const cells = row.split(' | '); cells[1] = short;
      pack.edits.push({ at: 'frameworkMarkdown', find: row, replace: cells.join(' | ') });
    }
    if (o.consequencePrompt) pack.override['decisions.1.prompts.1'] = o.consequencePrompt;
    writeFileSync(at(`content/packs/${o.id}.json`), JSON.stringify(pack, null, 2) + '\n');
    built.push(o.id);
  }
}
console.log(`${built.length} overlay packs: ${built.join(', ')}`);
