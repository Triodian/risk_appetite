// The shared identity (development plan tasks 1B.2, 1B.3 and 1B.5): people added once, roles per app, one sign-in.
// The same file is in the four engagement apps. Uses SQLite through a small D1 shim.  Run: node tests/identity.test.mjs
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { copyLegacyUsers, identityUsers, withIdentity, SUITE_APPS } from '../lib/identity/people.js';
import { sessionEmail, handleAuth, safeNext } from '../lib/identity/session.js';

let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
function d1(sql) {
  const stmt = (q, args = []) => ({
    bind: (...a) => stmt(q, a),
    async run() { const r = sql.prepare(q).run(...args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; },
    async first() { return sql.prepare(q).get(...args) || null; },
    async all() { return { results: sql.prepare(q).all(...args) }; },
  });
  return { prepare: q => stmt(q), async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; } };
}
const usersTable = (withRole) => `CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL DEFAULT '', organisation TEXT NOT NULL DEFAULT '',
  ${withRole ? 'role TEXT, ' : ''}roles TEXT, is_admin INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL, updated_by TEXT NOT NULL, last_seen_at TEXT, pending_email TEXT, date_format TEXT, time_zone TEXT, notify_email INTEGER NOT NULL DEFAULT 1)`;

// two apps' own users tables, as they stand before the identity database
const ra = new DatabaseSync(':memory:'), bd = new DatabaseSync(':memory:'), id = new DatabaseSync(':memory:');
ra.exec(usersTable(true)); bd.exec(usersTable(false));
const add = (db, row) => { const k = Object.keys(row); db.prepare(`INSERT INTO users (${k.join(',')}, created_at, created_by, updated_at, updated_by) VALUES (${k.map(() => '?').join(',')}, 'x', 'x', 'x', 'x')`).run(...Object.values(row)); };
add(ra, { id: 'u-ra-1', email: 'cro@acme.test', name: 'Chris', role: 'cro', roles: null, is_admin: 0 });
add(ra, { id: 'u-ra-2', email: 'admin@acme.test', name: 'Ada', role: null, roles: null, is_admin: 1, date_format: 'dmy' });
add(ra, { id: 'u-ra-3', email: 'gone@acme.test', name: 'Gone', role: 'risk', roles: 'risk', is_admin: 0, active: 0 });
add(bd, { id: 'u-bd-1', email: 'CRO@acme.test', name: 'Christopher', roles: 'cro,director', is_admin: 0 });
add(bd, { id: 'u-bd-2', email: 'chair@acme.test', name: 'Cass', roles: 'chair', is_admin: 1 });
const I = d1(id);

// 1B.5: copying each app's users in, once
let r = await copyLegacyUsers(I, d1(ra), 'risk-appetite');
ok('Risk Appetite: three people, three memberships', r.people === 3 && r.memberships === 3, JSON.stringify(r));
r = await copyLegacyUsers(I, d1(bd), 'board-direction');
ok('Board Direction: the CRO is joined by email, not duplicated', r.people === 1 && r.memberships === 2, JSON.stringify(r));
r = await copyLegacyUsers(I, d1(ra), 'risk-appetite');
ok('copying again adds nothing', r.people === 0 && r.memberships === 0);
const RA = identityUsers(I, 'risk-appetite'), BD = identityUsers(I, 'board-direction');
let u = await RA.getUser('u-ra-1');
ok('each app keeps its own ids', u && u.email === 'cro@acme.test' && (await BD.getUser('u-bd-1')).email === 'cro@acme.test');
ok('a single older role becomes the roles list', u.roles.join() === 'cro' && u.role === 'cro');
ok('roles stay per app', (await BD.getUser('u-bd-1')).roles.join() === 'cro,director');
ok('the first app’s name is kept for the person', (await BD.getUser('u-bd-1')).name === 'Chris');
ok('administrator stays per app', (await RA.getUser('u-ra-2')).isAdmin && !(await BD.getUserByEmail('admin@acme.test')));
ok('an inactive user stays inactive', (await RA.getUser('u-ra-3')).active === false);
ok('preferences come across', (await RA.getUser('u-ra-2')).dateFormat === 'dmy');
ok('lookup by email ignores case', (await BD.getUserByEmail('CHAIR@acme.test')).id === 'u-bd-2');
ok('each app lists only its members', (await RA.listUsers()).length === 3 && (await BD.listUsers()).length === 2);
ok('admins are counted per app', (await RA.countActiveAdmins()) === 1 && (await BD.countActiveAdmins()) === 1);

// people added once
const nu = { id: 'u-new', email: 'chair@acme.test', name: '', organisation: '', roles: ['board'], isAdmin: false };
await RA.insertUser(nu, 'admin@acme.test', 'now');
u = await RA.getUserByEmail('chair@acme.test');
ok('adding a known person to another app joins their record and id', u && u.id === 'u-bd-2' && nu.id === 'u-bd-2' && u.name === 'Cass' && u.roles.join() === 'board');
ok('their roles in the first app are untouched', (await BD.getUser('u-bd-2')).roles.join() === 'chair');
await RA.updateUser('u-bd-2', { ...u, name: 'Cassandra', organisation: 'Acme', roles: ['board'], isAdmin: false, active: true }, 'admin@acme.test', 'now');
ok('a name changed in one app shows in every app', (await BD.getUser('u-bd-2')).name === 'Cassandra');
// Security review 15 Nov 2026, S.3: an app's Admin cannot move a person to another email (and so another sign-in).
await RA.updateUser('u-bd-2', { ...u, email: 'someone-else@acme.test', name: 'Cassandra', organisation: 'Acme', roles: ['board'], isAdmin: false, active: true }, 'admin@acme.test', 'now');
ok('updateUser never changes the email', (await BD.getUser('u-bd-2')).email === 'chair@acme.test' && !(await RA.getUserByEmail('someone-else@acme.test')));
await RA.setPendingEmail('u-bd-2', 'chair2@acme.test', 'now'); await RA.confirmEmail('u-bd-2', 'chair2@acme.test', 'now');
ok('the person’s own confirmed change moves every app and keeps every role', (await BD.getUser('u-bd-2')).email === 'chair2@acme.test' && (await BD.getUser('u-bd-2')).roles.join() === 'chair' && (await RA.getUserByEmail('chair2@acme.test')).roles.join() === 'board');
// Security review 15 Nov 2026, S.4: bootstrap closes once per app and stays closed.
ok('bootstrap is open on a fresh app', (await RA.bootstrapClosed()) === false);
await RA.closeBootstrap('admin@acme.test', 'now');
ok('closing it is per app and sticks', (await RA.bootstrapClosed()) === true && (await BD.bootstrapClosed()) === false);
await RA.updatePrefs('u-bd-2', 'iso', 'Australia/Brisbane', false);
ok('preferences are the person’s, across the suite', (await BD.getUser('u-bd-2')).timeZone === 'Australia/Brisbane' && (await BD.getUser('u-bd-2')).notify === false);
const fresh = { id: 'u-n2', email: 'new@acme.test', name: 'Nia', organisation: '', roles: ['risk'], isAdmin: false };
await RA.insertUser(fresh, 'admin@acme.test', 'now');
ok('a new person keeps the id given', (await RA.getUserByEmail('new@acme.test')).id === 'u-n2');
const others = await RA.otherApps(['u-ra-1', 'u-bd-2', 'u-n2']);
ok('Admin can see each person’s roles in the other apps', others['u-ra-1'][0].app === 'board-direction' && others['u-ra-1'][0].roles.join() === 'cro,director' && !others['u-n2']);
ok('the suite apps are named', SUITE_APPS.length === 4 && SUITE_APPS.every(a => a.id && a.name && Object.keys(a.roles).length));
ok('Admin gets role names for the other apps', others['u-ra-1'][0].roleNames.join() === 'CRO (company, connected mode),Director (board)');
// this app's roles match the suite list, so Admin names them the same everywhere
const appId = (readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8').match(/const APP_ID = '([^']+)'/) || [])[1];
const mine = await import('../lib/core/roles.js').then(m => m.ROLES).catch(() => null) || await import('../public/shared/rules.js').then(m => m.ROLES);
const entry = SUITE_APPS.find(a => a.id === appId);
ok(`this app (${appId}) is in the suite list with the same roles`, entry && JSON.stringify(Object.fromEntries(mine.map(r => [r.id, r.name]))) === JSON.stringify(entry.roles));

// withIdentity: the app's store keeps its own methods and takes the user methods from the shared database
let initCalls = 0;
const store = withIdentity({ async init() { initCalls++; }, async getEngagement() { return 'mine'; }, async getUser() { return 'old'; } }, identityUsers(I, 'board-direction', d1(bd)));
await store.init();
ok('the wrapped store runs its own init and keeps its other methods', initCalls === 1 && (await store.getEngagement()) === 'mine');
ok('the wrapped store reads users from the shared database', (await store.getUser('u-bd-1')).email === 'cro@acme.test');

// 1B.3: one sign-in. Sessions in the shared database; the cookie is shared across the parent domain.
const hash = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
id.exec(`INSERT INTO sessions VALUES ('${await hash('tok1')}', 'cro@acme.test', 'x', '2999-01-01T00:00:00Z')`);
const envSuite = { IDENTITY: I, DB: d1(bd), SUITE_COOKIE_DOMAIN: 'acme.example', SUITE_SESSION_COOKIE: 'tri_suite' };
const req = (host, cookie, path = '/') => new Request(`https://${host}${path}`, { headers: { Cookie: cookie } });
ok('a suite session is read in any app', (await sessionEmail(req('appetite.acme.example', 'tri_suite=tok1'), envSuite)) === 'cro@acme.test'
  && (await sessionEmail(req('board.acme.example', 'tri_suite=tok1'), { ...envSuite, DB: d1(ra) })) === 'cro@acme.test');
ok('another cookie name is not read (live and test kept apart)', (await sessionEmail(req('appetite.acme.example', 'tri_suite=tok1'), { ...envSuite, SUITE_SESSION_COOKIE: 'tri_suite_test' })) === null);
ok('without the binding the suite cookie means nothing', (await sessionEmail(req('appetite.acme.example', 'tri_suite=tok1'), { DB: d1(bd) })) === null);
bd.exec(`CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)`);
bd.exec(`INSERT INTO sessions VALUES ('${await hash('old1')}', 'chair@acme.test', 'x', '2999-01-01T00:00:00Z')`);
ok('an app’s own session from before the binding still works', (await sessionEmail(req('board.acme.example', 'tri_session=old1'), envSuite)) === 'chair@acme.test');
const out = await handleAuth(req('board.acme.example', 'tri_suite=tok1', '/auth/logout'), envSuite);
const set = out.headers.getSetCookie ? out.headers.getSetCookie() : [out.headers.get('Set-Cookie')];
ok('signing out ends the suite session', (await sessionEmail(req('appetite.acme.example', 'tri_suite=tok1'), envSuite)) === null);
ok('and clears the shared cookie on the parent domain', set.some(c => /^tri_suite=;/.test(c) && /Domain=acme\.example/.test(c)), set.join(' | '));

// PT-03 (penetration test 16 Nov 2026): the way back after sign-in can only be a page on this site. The old check
// accepted "/\attacker.example/landing", which browsers resolve to https://attacker.example/landing.
const ORIGIN = 'https://board.acme.example';
for (const bad of ['/\\attacker.example/landing', '//attacker.example', '/\\/attacker.example', '/%5Cattacker.example', '/%5cattacker.example/x', '/%2F%2Fattacker.example',
  'https://attacker.example/', 'http://board.acme.example/x', 'javascript:alert(1)', '/x\u0000y', '/x\ny', '/login', '/login?next=/', '/auth/email', '/auth/logout', '', null, undefined, 42]) {
  ok(`next=${JSON.stringify(bad)} is refused and lands on /`, safeNext(bad, ORIGIN) === '/', safeNext(bad, ORIGIN));
}
for (const [good, want] of [['/engagements/1?tab=2#x', '/engagements/1?tab=2#x'], ['/admin/', '/admin/'], ['/', '/'], ['/a b', '/a%20b'], ['/x?next=//attacker.example', '/x?next=//attacker.example']]) {
  ok(`next=${JSON.stringify(good)} still lands on ${want}`, safeNext(good, ORIGIN) === want, safeNext(good, ORIGIN));
}
ok('what comes back is always a path on this origin', ['/\\\\attacker.example', '/a/../../b', '/./x'].every(v => new URL(safeNext(v, ORIGIN), ORIGIN).origin === ORIGIN));
// through the real email sign-in: Access proves the email, the session is started, and the redirect stays on this site
const accessEnv = { ...envSuite, ACCESS_TEAM_DOMAIN: '', LOCAL_DEV_NO_SIGNIN_EMAIL: 'cro@acme.test' };
for (const [next, want] of [['/\\attacker.example/landing', '/'], ['//attacker.example', '/'], ['/engagements/1?tab=2', '/engagements/1?tab=2']]) {
  const res = await handleAuth(new Request(`http://localhost:8788/auth/email?next=${encodeURIComponent(next)}`), accessEnv);
  const loc = res.headers.get('Location') || '';
  ok(`/auth/email?next=${next} → ${want}`, res.status === 303 && loc === want && new URL(loc, 'http://localhost:8788').origin === 'http://localhost:8788', `${res.status} ${loc}`);
}

// Time claims on an Access token (penetration test 16 Nov 2026, hardening item): a correctly signed token with a future
// nbf was accepted. Signs tokens with a local key and stubs the Access certificate endpoint.
{
  const { identify } = await import('../lib/identity/cloudflare-access.js');
  const TEAM = 'acme.cloudflareaccess.com', AUD = 'aud-test';
  const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k-nbf' };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u, o) => String(u).includes('/cdn-cgi/access/certs') ? new Response(JSON.stringify({ keys: [jwk] })) : realFetch(u, o);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const token = async claims => { const h = b64({ alg: 'RS256', kid: 'k-nbf' }), p = b64({ aud: [AUD], iss: 'https://' + TEAM, exp: now + 600, email: 'cro@acme.test', ...claims });
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p)); return h + '.' + p + '.' + Buffer.from(sig).toString('base64url'); };
  const who = async claims => identify(new Request('https://appetite.acme.example/auth/email', { headers: { 'Cf-Access-Jwt-Assertion': await token(claims) } }), { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD });
  ok('a valid signed token is accepted (control)', (await who({})).email === 'cro@acme.test');
  ok('a token with nbf in the past is accepted', (await who({ nbf: now - 30 })).email === 'cro@acme.test');
  ok('a token with nbf a few seconds ahead is accepted (clock tolerance)', (await who({ nbf: now + 30 })).email === 'cro@acme.test');
  ok('a correctly signed token with nbf in the future is refused', (await who({ nbf: now + 3600 })).status === 401);
  ok('a token issued in the future is refused', (await who({ iat: now + 3600 })).status === 401);
  ok('a token with a non-numeric nbf is refused', (await who({ nbf: 'soon' })).status === 401);
  ok('an expired token is still refused', (await who({ exp: now - 10 })).status === 401);
  globalThis.fetch = realFetch;
}


// OIDC relying party (development plan ID.1): a deployment that is not behind Access signs in through the organisation's
// own OpenID Connect provider. A fake provider (discovery, keys, token endpoint) is stubbed into fetch; tokens are signed
// with a local key. The provider supplies the email and nothing else: no role is read from it.
{
  const { providerKind } = await import('../lib/identity/provider.js');
  const { verifyIdToken, oidcConfig } = await import('../lib/identity/oidc.js');
  const ISSUER = 'https://login.acme-idp.example/tenant', CLIENT = 'client-abc';
  const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k-oidc', use: 'sig' };
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = () => Math.floor(Date.now() / 1000);
  const mint = async (claims, kid = 'k-oidc', key = kp.privateKey) => {
    const h = b64({ alg: 'RS256', kid }), p = b64({ iss: ISSUER, aud: CLIENT, exp: now() + 600, iat: now(), email: 'cro@acme.test', email_verified: true, ...claims });
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(h + '.' + p)); return h + '.' + p + '.' + Buffer.from(sig).toString('base64url');
  };
  const doc = { issuer: ISSUER, authorization_endpoint: ISSUER + '/authorize', token_endpoint: ISSUER + '/token', jwks_uri: ISSUER + '/keys' };
  let nextToken = null, lastTokenRequest = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u, o) => {
    u = String(u);
    if (u === ISSUER + '/.well-known/openid-configuration') return new Response(JSON.stringify(doc));
    if (u === ISSUER + '/keys') return new Response(JSON.stringify({ keys: [jwk] }));
    if (u === ISSUER + '/token') { lastTokenRequest = new URLSearchParams(o.body); return new Response(JSON.stringify({ id_token: await nextToken(lastTokenRequest), token_type: 'Bearer' })); }
    return realFetch(u, o);
  };
  const oidcDb = new DatabaseSync(':memory:');
  const oidcEnv = { IDENTITY: d1(oidcDb), DB: d1(oidcDb), SUITE_COOKIE_DOMAIN: 'acme.example', SUITE_SESSION_COOKIE: 'tri_suite', IDENTITY_PROVIDER: 'oidc', OIDC_ISSUER: ISSUER + '/', OIDC_CLIENT_ID: CLIENT };
  const HOST = 'https://use.acme.example';
  ok('the provider is chosen by IDENTITY_PROVIDER, Access by default', providerKind(oidcEnv) === 'oidc' && providerKind({}) === 'access' && providerKind({ IDENTITY_PROVIDER: 'other' }) === 'access');
  ok('the issuer is read without its trailing slash', oidcConfig(oidcEnv).issuer === ISSUER);
  ok('an OIDC deployment carries no identity on a plain request', (await (await import('../lib/identity/oidc.js')).identify(new Request(HOST + '/'), oidcEnv)).status === 401);
  ok('an Access deployment has no OIDC callback', (await handleAuth(new Request(HOST + '/auth/oidc/callback?code=x&state=y'), { ...oidcEnv, IDENTITY_PROVIDER: 'access' })).status === 404);

  // the full flow: /auth/email sends the browser to the provider; the callback exchanges the code and starts a session
  const begin = async (next = '/engagements/1?tab=2') => {
    const res = await handleAuth(new Request(HOST + '/auth/email?next=' + encodeURIComponent(next)), oidcEnv);
    const to = new URL(res.headers.get('Location'));
    return { res, to, state: to.searchParams.get('state'), nonce: to.searchParams.get('nonce'), challenge: to.searchParams.get('code_challenge') };
  };
  const finish = (state, code = 'code-1') => handleAuth(new Request(`${HOST}/auth/oidc/callback?code=${code}&state=${state}`), oidcEnv);
  let b = await begin();
  ok('/auth/email sends the browser to the provider’s authorization endpoint', b.res.status === 303 && b.to.origin + b.to.pathname === ISSUER + '/authorize', String(b.to));
  ok('with the code flow, PKCE (S256), state, nonce, the client id and this site’s callback', b.to.searchParams.get('response_type') === 'code' && b.to.searchParams.get('code_challenge_method') === 'S256' && b.challenge && b.state && b.nonce
    && b.to.searchParams.get('client_id') === CLIENT && b.to.searchParams.get('redirect_uri') === HOST + '/auth/oidc/callback' && /\bopenid\b/.test(b.to.searchParams.get('scope')));
  ok('state and nonce are fresh each time', (await begin()).state !== b.state);
  nextToken = async form => mint({ nonce: b.nonce });
  let res = await finish(b.state);
  const setc = (res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('Set-Cookie')]).join(' | ');
  ok('the callback exchanges the code with the PKCE verifier and no client secret', lastTokenRequest.get('grant_type') === 'authorization_code' && lastTokenRequest.get('code') === 'code-1' && lastTokenRequest.get('code_verifier') && !lastTokenRequest.has('client_secret')
    && lastTokenRequest.get('redirect_uri') === HOST + '/auth/oidc/callback');
  ok('the verifier sent is the one the challenge was made from', Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(lastTokenRequest.get('code_verifier')))).toString('base64url') === b.challenge);
  ok('a valid identity token starts a suite session and lands on the page asked for (control)', res.status === 303 && res.headers.get('Location') === '/engagements/1?tab=2' && /tri_suite=[^;]+; Path=\/; HttpOnly/.test(setc) && /Domain=acme\.example/.test(setc), `${res.status} ${res.headers.get('Location')} ${setc}`);
  const tok = (setc.match(/tri_suite=([^;]+)/) || [])[1];
  ok('the session is the person the provider named', (await sessionEmail(new Request(HOST + '/', { headers: { Cookie: 'tri_suite=' + tok } }), oidcEnv)) === 'cro@acme.test');
  ok('a state is used once: the same callback again is refused', (await finish(b.state)).headers.get('Location') === '/login?email=0');
  ok('a state this app never issued is refused', (await finish('not-ours')).headers.get('Location') === '/login?email=0');
  const withSecret = { ...oidcEnv, OIDC_CLIENT_SECRET: 's3cret' };
  b = await begin(); nextToken = async () => mint({ nonce: b.nonce });
  res = await handleAuth(new Request(`${HOST}/auth/oidc/callback?code=c&state=${b.state}`), withSecret);
  ok('with OIDC_CLIENT_SECRET set it is sent to the token endpoint (confidential client)', res.status === 303 && lastTokenRequest.get('client_secret') === 's3cret');
  // the way back after sign-in goes through the same check as every other sign-in (PT-03)
  b = await begin('/\\attacker.example/landing'); nextToken = async () => mint({ nonce: b.nonce });
  res = await finish(b.state);
  ok('next=/\\attacker.example/landing through the provider still lands on /', res.status === 303 && res.headers.get('Location') === '/', res.headers.get('Location'));

  // what the callback refuses, each against a sign-in it did start
  const refused = async (label, claims, kid, key) => {
    const bb = await begin(); nextToken = async () => mint({ nonce: bb.nonce, ...claims }, kid, key);
    const r = await finish(bb.state);
    ok(label, r.status === 303 && r.headers.get('Location') === '/login?email=0', `${r.status} ${r.headers.get('Location')}`);
  };
  await refused('a token from another issuer is refused', { iss: 'https://login.other-idp.example' });
  await refused('a token for another application is refused', { aud: 'someone-else' });
  await refused('a token for several applications must name this one as the authorised party', { aud: [CLIENT, 'other'], azp: 'other' });
  await refused('an expired token is refused', { exp: now() - 10 });
  await refused('a token with nbf in the future is refused', { nbf: now() + 3600 });
  await refused('a token issued in the future is refused', { iat: now() + 3600 });
  await refused('a token answering a different sign-in (nonce) is refused', { nonce: 'another-nonce' });
  await refused('a token with no email is refused', { email: undefined });
  await refused('a token whose email the provider has not verified is refused', { email_verified: false });
  const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  await refused('a token signed with a key the provider does not publish is refused', {}, 'k-unknown', other.privateKey);
  await refused('a token signed with another key under the published kid is refused', {}, 'k-oidc', other.privateKey);
  {
    const bb = await begin(); nextToken = async () => mint({ nonce: bb.nonce, aud: [CLIENT, 'other'], azp: CLIENT });
    const r = await finish(bb.state);
    ok('a token for several applications that names this one as the authorised party is accepted', r.status === 303 && r.headers.get('Location') === '/engagements/1?tab=2');
  }
  {
    const bb = await begin(); nextToken = async () => mint({ nonce: bb.nonce, nbf: now() + 30 });
    ok('a token with nbf a few seconds ahead is accepted (clock tolerance)', (await finish(bb.state)).headers.get('Location') === '/engagements/1?tab=2');
  }
  // roles never come from the provider
  {
    const bb = await begin(); nextToken = async () => mint({ nonce: bb.nonce, groups: ['admins'], roles: ['administrator'], email: 'newcomer@acme.test' });
    const r = await finish(bb.state);
    const t = ((r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('Set-Cookie')]).join(' ').match(/tri_suite=([^;]+)/) || [])[1];
    ok('a provider’s groups or roles claims change nothing: the session carries the email only', r.status === 303 && (await sessionEmail(new Request(HOST + '/', { headers: { Cookie: 'tri_suite=' + t } }), oidcEnv)) === 'newcomer@acme.test'
      && oidcDb.prepare("SELECT count(*) AS n FROM sessions").get().n >= 1 && !oidcDb.prepare("SELECT sql FROM sqlite_master WHERE name='sessions'").get().sql.includes('role'));
  }
  ok('a direct check of verifyIdToken with the wrong nonce is refused', (await verifyIdToken(await mint({ nonce: 'a' }), oidcConfig(oidcEnv), doc, 'b')).status === 401);
  ok('a provider whose discovery document names another issuer is not used', (await (async () => { const envX = { ...oidcEnv, OIDC_ISSUER: 'https://login.acme-idp.example/other' };
    globalThis.fetch = async (u, o) => String(u).endsWith('/openid-configuration') ? new Response(JSON.stringify(doc)) : realFetch(u, o);
    const r = await handleAuth(new Request(HOST + '/auth/email'), envX); return r.status; })()) === 502);
  globalThis.fetch = realFetch;
}

console.log(fails ? `\n${fails} failed` : '\nAll passed'); process.exit(fails ? 1 : 0);
