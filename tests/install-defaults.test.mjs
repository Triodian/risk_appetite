// US.6: a deployment set to a jurisdiction and sector at install (DEFAULT_JURISDICTION, DEFAULT_SECTOR) starts each new
// engagement on that sector's pack. node tests/install-defaults.test.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { handle } from '../lib/core/api.js';
const require = createRequire(import.meta.url);
const P = require('../public/shared/packs.js');
globalThis.window = {}; require('../public/' + (readFileSync(new URL('../public/index.html', import.meta.url), 'utf8').match(/src="\/((?:content|aua-content)\.js)"/) || [, 'content.js'])[1]);
const B = window.RAF_CONTENT || window.AUA_CONTENT;
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'PASS' : 'FAIL') + ' · ' + n + (c || x === undefined ? '' : ' → ' + x)); if (!c) fails++; };

ok('the regulated sectors come from the Metamodel', B.regulatedSectors.length >= 28 && /Triodian Metamodel \d/.test(B.regulatedSectorsSource));
const want = { 'AU-SUPERANNUATION': 'superTrustee', 'AU-BANKING': 'adi', 'AU-INSURANCE': 'generalInsurer', 'SG-BANKING': 'masFi', 'SG-CAPITAL-MARKETS': 'masFi',
  'US-BANKING': 'usBanking', 'US-INSURANCE': 'usInsurance', 'US-SECURITIES': 'usSecurities', 'US-HEALTH': 'usHealth', 'US-CRITICAL-INFRASTRUCTURE': 'usCriticalInfrastructure',
  'US-PAYMENTS': 'bpPayments', 'AU-PAYMENTS': 'bpPayments', 'AU-HEALTH': 'bpHealth', 'AU-CRITICAL-INFRASTRUCTURE': 'bpCiCorporate' };
for (const [s, p] of Object.entries(want)) ok(`${s} starts on ${p}`, P.forSector(B, s) === p, P.forSector(B, s));
ok('every sector with a pack names a pack this app has', B.regulatedSectors.every(s => { const p = P.forSector(B, s.id); return !p || B.packs[p]; }));
ok('a US pack is never chosen for another jurisdiction’s sector', B.regulatedSectors.filter(s => s.jurisdiction !== 'US').every(s => !/^us/.test(P.forSector(B, s.id) || '')));
ok('a sector with no pack falls back to the jurisdiction (US listed companies: a US pack)', P.startPack(B, { jurisdiction: 'US', sector: 'US-LISTED' }).startsWith('us'));
ok('jurisdiction only: Australia keeps the default pack, the US starts on a US pack, Singapore on the MAS pack',
  P.startPack(B, { jurisdiction: 'AU' }) === P.DEFAULT && /^us/.test(P.startPack(B, { jurisdiction: 'US' })) && P.startPack(B, { jurisdiction: 'SG' }) === 'masFi');
ok('no defaults: the default pack, as before', P.startPack(B, null) === P.DEFAULT && P.startPack(B, {}) === P.DEFAULT);

// /api/me carries the deployment's defaults.
const store = new Proxy({ async getUserByEmail() { return { id: 'u1', email: 'a@x.com', name: 'A', organisation: '', role: null, roles: [], isAdmin: true, active: true }; }, async countActiveAdmins() { return 1; } }, { get: (t, k) => k in t ? t[k] : async () => null });
const me = async (defaults) => (await handle({ method: 'GET', path: '/api/me', email: 'a@x.com', text: async () => '', site: '', origin: 'https://x', sender: null, defer() {}, demoAdmins: [], ...(defaults ? { defaults } : {}) }, store)).body;
ok('/api/me returns the deployment’s jurisdiction and sector', JSON.stringify((await me({ jurisdiction: 'US', sector: 'US-BANKING' })).defaults) === '{"jurisdiction":"US","sector":"US-BANKING"}');
ok('/api/me without defaults says Australia, no sector', JSON.stringify((await me()).defaults) === '{"jurisdiction":"AU","sector":""}');

console.log(fails ? `\n${fails} failed` : '\nAll passed');
process.exit(fails ? 1 : 0);
