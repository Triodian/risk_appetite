// Copies the shared platform files from another app's checkout into this one, so the five apps keep identical copies
// (development plan ID.3), as tools/sync-identity.mjs does for lib/identity. Run: node tools/sync-platform.mjs ../board-direction
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
const FILES = ['lib/store/sqlite.js', 'lib/platform/links.js', 'lib/platform/node.js', 'tests/platform.test.mjs'];
const from = process.argv[2];
if (!from) { console.error('Usage: node tools/sync-platform.mjs <path to another app checkout>'); process.exit(1); }
for (const f of FILES) {
  const src = readFileSync(resolve(from, f), 'utf8'), dst = resolve(f);
  let cur = ''; try { cur = readFileSync(dst, 'utf8'); } catch (e) {}
  if (cur === src) { console.log('same     ' + f); continue; }
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, src); console.log('copied   ' + f);
}
