// The AI Use Assessment app's service token may read the issued calibration set, and nothing else.
// Signs Access-style tokens with a local key and stubs the Access certificate endpoint.  node tests/service-token.test.mjs
import worker from '../src/worker.js';
let fails = 0; const check = (n, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + n); if (!ok) fails++; };
const TEAM = 'triodian.cloudflareaccess.com', AUD = 'aud-ra', CID = 'abc123.access';
const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => String(u).includes('/cdn-cgi/access/certs') ? new Response(JSON.stringify({ keys: [jwk] })) : realFetch(u, o);
const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
async function token(claims) {
  const h = b64({ alg: 'RS256', kid: 'k1' }), p = b64({ aud: [AUD], iss: 'https://' + TEAM, exp: Math.floor(Date.now() / 1000) + 600, ...claims });
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p));
  return h + '.' + p + '.' + Buffer.from(sig).toString('base64url');
}
const issued = [{ version: 2, status: 'approved', on: '2026-10-17', by: 'Board', set: { schema: 'triodian.calibration.v1', P1: {} } }];
const eng = { revision: 3, data: { calibration: { issued } } };
// A D1 stand-in: every query answers with the stored engagement row, which is all this path reads.
const stmt = () => ({ bind() { return this; }, first: async () => ({ revision: eng.revision, data: JSON.stringify(eng.data), updated_at: 'x', updated_by: 'y', name: 'x' }), all: async () => ({ results: [] }), run: async () => ({ meta: {} }) });
const DB = { prepare: stmt, batch: async () => [], exec: async () => ({}) };
const env = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, CALIBRATION_CLIENT_ID: CID, DB, ASSETS: { fetch: () => new Response('asset') } };
const call = async (path, claims, method = 'GET', e = env) => {
  const r = await worker.fetch(new Request('https://risk-appetite.triodian.com' + path, { method, headers: { 'Cf-Access-Jwt-Assertion': await token(claims) } }), e, { waitUntil() {} });
  let body = {}; try { body = await r.json(); } catch (x) {}
  return { status: r.status, body };
};

let r = await call('/api/calibration-set', { common_name: CID, sub: '', type: 'app' });
check('the Use Assessment token reads the set: ' + r.status + ' ' + (r.body.error || ''), r.status === 200 && r.body.version === 2 && r.body.status === 'approved' && r.body.calibrationSet.schema === 'triodian.calibration.v1');
r = await call('/api/engagement', { common_name: CID, sub: '' });
check('the same token cannot read the engagement', r.status === 403);
r = await call('/api/calibration-set', { common_name: CID }, 'PUT');
check('the token cannot write', r.status === 403);
r = await call('/api/calibration-set', { common_name: 'other.access', sub: '' });
check('another service token is refused', r.status === 403);
r = await call('/api/calibration-set', { common_name: CID }, 'GET', { ...env, CALIBRATION_CLIENT_ID: '' });
check('refused until CALIBRATION_CLIENT_ID is set, with the fix in the message', r.status === 403 && /CALIBRATION_CLIENT_ID/.test(r.body.error || ''));
r = await call('/api/calibration-set', {});
check('a token with neither email nor Client ID is refused', r.status === 401);
// the board directions (task 3.5): read over the BOARD binding for people signed in, never for the service token
r = await call('/api/directions-from-board', { common_name: CID, sub: '' });
check('the Use Assessment token cannot read the board directions', r.status === 403);
console.log(fails ? fails + ' failed' : 'all passed'); if (fails) process.exit(1);
