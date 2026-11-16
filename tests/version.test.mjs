// The deployed revision is attestable (development plan P.14): /api/version and the X-Triodian-Release header carry
// the commit the gated workflow deployed (APP_COMMIT). Run: node tests/version.test.mjs
import worker, { release } from '../src/worker.js';
let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
const SHA = '28730c26ecd67eeb90dca6a4ce7b19ea696f4c43';
ok('release() reads APP_COMMIT and says unknown when it is not set', release({ APP_COMMIT: SHA }) === SHA && release({}) === 'unknown');
const r = await worker.fetch(new Request('https://risk-appetite.test/api/version'), { APP_COMMIT: SHA, SITE_LABEL: 'Test site' }, { waitUntil() {} });
const body = await r.json();
ok('/api/version answers without a session, naming the app, the commit and the site', r.status === 200 && body.app === 'risk-appetite' && body.commit === SHA && body.site === 'Test site', JSON.stringify(body));
ok('the X-Triodian-Release header carries the commit', r.headers.get('X-Triodian-Release') === SHA, r.headers.get('X-Triodian-Release'));
const a = await worker.fetch(new Request('https://risk-appetite.test/api/engagement'), { APP_COMMIT: SHA }, { waitUntil() {} });
ok('any other API response (here refused: no session or database) still carries the header', a.status !== 200 && a.headers.get('X-Triodian-Release') === SHA, a.status + ' ' + a.headers.get('X-Triodian-Release'));
const v = await worker.fetch(new Request('https://risk-appetite.test/api/version', { method: 'POST' }), {}, { waitUntil() {} });
ok('only GET answers /api/version; a POST goes through the app like any other request', v.status !== 200, String(v.status));
console.log(fails ? `\n${fails} failed` : '\nAll passed'); process.exit(fails ? 1 : 0);
