// The calibration set served to the AI Use Assessment app over a service binding (development plan task 1B.4).
// src/service.js wraps calibrationForService in a Cloudflare entrypoint; this tests what it returns.
// Run: node tests/service-binding.test.mjs
import { calibrationForService } from '../src/worker.js';
import { readFileSync } from 'node:fs';
let fails = 0; const check = (n, ok, extra) => { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + n + (extra ? ' → ' + extra : '')); if (!ok) fails++; };
const dbWith = data => { const stmt = () => ({ bind() { return this; }, first: async () => data ? ({ revision: 2, data: JSON.stringify(data), updated_at: 'x', updated_by: 'y', name: 'x' }) : null, all: async () => ({ results: [] }), run: async () => ({ meta: {} }) }); return { prepare: stmt, batch: async () => [], exec: async () => ({}) }; };
const set = { schema: 'triodian.calibration.v1', P1: {} };

let r = await calibrationForService({ DB: dbWith({ calibration: { issued: [{ version: 1, status: 'working', on: '2026-10-10', by: 'CRO', set }, { version: 2, status: 'approved', on: '2026-10-17', by: 'Board', minuteRef: 'M1', set }] } }) });
check('the approved set is served', r.status === 200 && r.body.version === 2 && r.body.status === 'approved' && r.body.calibrationSet.schema === 'triodian.calibration.v1', JSON.stringify(r).slice(0, 120));
r = await calibrationForService({ DB: dbWith({ calibration: { issued: [{ version: 1, status: 'approved', on: '2026-10-10', by: 'Board', set }, { version: 2, status: 'working', on: '2026-10-20', by: 'CRO', set }] } }) });
check('a later working version is named, not served', r.status === 200 && r.body.version === 1 && r.body.laterVersion.version === 2);
r = await calibrationForService({ DB: dbWith({ calibration: { issued: [] } }) });
check('nothing issued: 404 with the reason', r.status === 404 && /No calibration set/.test(r.body.error));
r = await calibrationForService({});
check('no database: 503', r.status === 503);
// the entry point exports both the app and the service
const idx = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8'), svc = readFileSync(new URL('../src/service.js', import.meta.url), 'utf8');
check('src/index.js exports the app and AppetiteService', /export \{ default \} from '\.\/worker\.js'/.test(idx) && /AppetiteService/.test(idx));
check('the service offers the calibration set, the board view and the evidence list only (tasks 3.6 and R.2)', (svc.match(/async \w+\(/g) || []).join() === 'async calibrationSet(,async boardView(,async evidence(');
check('wrangler.jsonc runs src/index.js', /"main": "src\/index\.js"/.test(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8')));
console.log(fails ? `\n${fails} failed` : '\nAll passed'); process.exit(fails ? 1 : 0);
