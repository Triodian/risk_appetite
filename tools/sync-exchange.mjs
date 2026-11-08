// Copies the published exchange schemas from a Triodian_Metamodel checkout into vendor/exchange/, pinned by commit in
// VENDORED.json (development plan task R.4). The app's tests check the files it writes and reads against them
// (tests/e2e/specs/exchange.spec.js). The same script is in each of the four engagement apps.
//   node tools/sync-exchange.mjs ../triodian_metamodel
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const src = path.resolve(process.argv[2] || '../triodian_metamodel'), from = path.join(src, 'exchange');
const dest = path.resolve('vendor/exchange');
if (!fs.existsSync(path.join(from, 'README.md'))) { console.error(`Not a Triodian_Metamodel checkout with exchange/: ${src}`); process.exit(1); }
fs.rmSync(dest, { recursive: true, force: true }); fs.mkdirSync(dest, { recursive: true });
const files = fs.readdirSync(from).filter(f => f.endsWith('.schema.json')).sort();
for (const f of files) fs.copyFileSync(path.join(from, f), path.join(dest, f));
let commit = 'unknown'; try { commit = execSync('git rev-parse HEAD', { cwd: src }).toString().trim(); } catch (e) {}
const metamodelVersion = fs.readFileSync(path.join(src, 'VERSION'), 'utf8').trim();
fs.writeFileSync(path.join(dest, 'VENDORED.json'), JSON.stringify({ source: 'https://github.com/Triodian/Triodian_Metamodel/tree/main/exchange', commit, metamodelVersion, files }, null, 2) + '\n');
console.log(`Vendored ${files.length} exchange schemas from Triodian Metamodel ${metamodelVersion} (${commit.slice(0, 7)})`);
