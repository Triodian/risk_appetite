// Copies the regulated sectors from the Triodian Metamodel (reference-data/regulated-sectors.json) into
// content/regulated-sectors.json, so a deployment set to a sector at install (DEFAULT_SECTOR) starts new engagements on
// that sector's pack (TriodianPacks.startPack). The same list AI Board Direction and the installer use.
// Run: node tools/sync-sectors.mjs ../triodian_metamodel && node tools/build-content.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const mm = process.argv[2];
if (!mm) { console.error('Usage: node tools/sync-sectors.mjs <path to triodian_metamodel>'); process.exit(1); }
const ref = JSON.parse(readFileSync(join(mm, 'reference-data/regulated-sectors.json'), 'utf8'));
const version = readFileSync(join(mm, 'VERSION'), 'utf8').trim();
const items = Array.isArray(ref) ? ref : Object.values(ref).find(Array.isArray);
const out = {
  source: `Triodian Metamodel ${version}, reference-data/regulated-sectors.json`,
  sectors: items.map(d => ({ id: d.regulatedSectorID, jurisdiction: d.jurisdiction, name: d.name, entityTypes: d.entityTypes || [], ...(d.baselineProfiles ? { baselineProfiles: d.baselineProfiles } : {}) })),
};
writeFileSync(new URL('../content/regulated-sectors.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`${out.sectors.length} regulated sectors from Metamodel ${version}`);
