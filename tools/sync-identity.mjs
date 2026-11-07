// Copies the shared identity files from another app's checkout into this one, so the four engagement apps keep
// identical copies (development plan task 1B.2). Run from this repo: node tools/sync-identity.mjs ../board-direction
// The files: lib/identity/session.js, lib/identity/cloudflare-access.js, lib/identity/people.js, tests/identity.test.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const FILES = ['lib/identity/session.js', 'lib/identity/cloudflare-access.js', 'lib/identity/people.js', 'tests/identity.test.mjs'];
const from = process.argv[2];
if (!from) { console.error('Usage: node tools/sync-identity.mjs <path to another app checkout>'); process.exit(1); }
for (const f of FILES) {
  const src = readFileSync(resolve(from, f), 'utf8'), dst = resolve(f);
  let cur = ''; try { cur = readFileSync(dst, 'utf8'); } catch (e) {}
  if (cur === src) { console.log('same     ' + f); continue; }
  writeFileSync(dst, src); console.log('copied   ' + f);
}
