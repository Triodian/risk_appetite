// Identity adapter: OpenID Connect relying party. The same file is in the four engagement apps and Start
// (tools/sync-identity.mjs). Used when IDENTITY_PROVIDER is "oidc": a deployment that is not behind Cloudflare Access
// (development plan ID.1), signing in through the organisation's own provider (Entra ID, Google Workspace, Okta or any
// OpenID Connect provider with a discovery document).
//
// What it does: the authorization-code flow with PKCE, state and nonce; the ID token is checked against the provider's
// published keys (JWKS) for signature, issuer, audience, expiry and time claims, and against the nonce this app issued.
// What it does not do: roles. The provider supplies identity (a verified email) and nothing else; roles stay in the
// app's own store, set by the deployment's administrators, with separation of duties enforced in-app. No group or claim
// from the provider is ever read as a role.
//
// Variables: OIDC_ISSUER (the issuer URL exactly as the provider's discovery document states it), OIDC_CLIENT_ID,
// OIDC_CLIENT_SECRET (a secret; omit for a public client that uses PKCE alone), OIDC_SCOPES (default "openid email profile").
// The redirect URI to register with the provider is https://<this host>/auth/oidc/callback.
//
// In-flight sign-ins (state, nonce, PKCE verifier, where to go afterwards) are kept in the session database for ten
// minutes and used once. Nothing about the sign-in is kept in a cookie.
//
// Fails closed: when the provider is not configured, or anything in the token or the exchange is not as expected, there is no identity.

/** Seconds of clock drift allowed on a token's nbf and iat (the provider signs with its own clock). */
const CLOCK_TOLERANCE = 60;
const STATE_MINUTES = 10;
const CALLBACK_PATH = '/auth/oidc/callback';

const enc = new TextEncoder();
const b64u = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const json = bytes => JSON.parse(new TextDecoder().decode(bytes));
const random = n => b64u(crypto.getRandomValues(new Uint8Array(n)));
function sameString(a, b) { a = enc.encode(String(a)); b = enc.encode(String(b)); if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }

/** The provider settings for this deployment, or null when OIDC is not configured. */
export function oidcConfig(env) {
  const issuer = String(env.OIDC_ISSUER || '').trim().replace(/\/$/, '');
  const clientId = String(env.OIDC_CLIENT_ID || '').trim();
  if (!issuer || !clientId || !/^https:\/\//.test(issuer)) return null;
  return { issuer, clientId, clientSecret: String(env.OIDC_CLIENT_SECRET || '').trim(), scopes: String(env.OIDC_SCOPES || 'openid email profile').trim() };
}

let discoveryCache = { issuer: '', doc: null, at: 0 };
async function discover(issuer) {
  if (discoveryCache.doc && discoveryCache.issuer === issuer && Date.now() - discoveryCache.at < 60 * 60 * 1000) return discoveryCache.doc;
  const r = await fetch(issuer + '/.well-known/openid-configuration');
  if (!r.ok) throw new Error('could not fetch the provider’s discovery document');
  const doc = await r.json();
  if (String(doc.issuer || '').replace(/\/$/, '') !== issuer) throw new Error('the discovery document names a different issuer');
  if (!doc.authorization_endpoint || !doc.token_endpoint || !doc.jwks_uri) throw new Error('the discovery document is incomplete');
  discoveryCache = { issuer, doc, at: Date.now() };
  return doc;
}

let keyCache = { uri: '', keys: null, at: 0 };
async function getKeys(uri) {
  if (keyCache.keys && keyCache.uri === uri && Date.now() - keyCache.at < 60 * 60 * 1000) return keyCache.keys;
  const r = await fetch(uri);
  if (!r.ok) throw new Error('could not fetch the provider’s keys');
  const j = await r.json();
  keyCache = { uri, keys: j.keys || [], at: Date.now() };
  return keyCache.keys;
}

const ready = new WeakSet();
async function states(db) {
  if (!ready.has(db)) {
    await db.prepare('CREATE TABLE IF NOT EXISTS oidc_states (state TEXT PRIMARY KEY, nonce TEXT NOT NULL, verifier TEXT NOT NULL, next TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)').run();
    ready.add(db);
  }
  return db;
}

const isLocal = url => url.hostname === 'localhost' || url.hostname === '127.0.0.1';

/**
 * Who is making this request, without a session. An OIDC deployment carries no identity on a plain request (there is
 * no header a proxy has verified, as there is behind Access), so this is the local-development path or nothing.
 * Returns { email } or { error, status }, the same shape as the Access adapter.
 */
export async function identify(request, env) {
  const url = new URL(request.url);
  if (env.LOCAL_DEV_NO_SIGNIN_EMAIL && isLocal(url)) {
    return { email: (request.headers.get('X-Dev-User') || env.LOCAL_DEV_NO_SIGNIN_EMAIL).toLowerCase() };
  }
  if (!oidcConfig(env)) return { status: 503, error: 'Sign-in is not configured on the server yet: OIDC_ISSUER and OIDC_CLIENT_ID are not set.' };
  return { status: 401, error: 'Not signed in.' };
}

/**
 * Begins a sign-in: records state, nonce and the PKCE verifier, then sends the browser to the provider.
 * `next` must already have been through safeNext. Returns a Response (a redirect, or an error page).
 */
export async function start(request, env, db, next) {
  const cfg = oidcConfig(env);
  if (!cfg) return new Response('Sign-in is not configured on the server yet: OIDC_ISSUER and OIDC_CLIENT_ID are not set.', { status: 503 });
  if (!db) return new Response('The database is not connected to this site yet.', { status: 503 });
  let doc;
  try { doc = await discover(cfg.issuer); } catch (e) { return new Response('The sign-in provider could not be reached: ' + e.message, { status: 502 }); }
  const url = new URL(request.url);
  const state = random(32), nonce = random(32), verifier = random(48);
  const challenge = b64u(await crypto.subtle.digest('SHA-256', enc.encode(verifier)));
  const now = new Date();
  const s = await states(db);
  await s.prepare('DELETE FROM oidc_states WHERE expires_at < ?').bind(now.toISOString()).run();
  await s.prepare('INSERT INTO oidc_states (state, nonce, verifier, next, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(state, nonce, verifier, String(next || '/'), now.toISOString(), new Date(now.getTime() + STATE_MINUTES * 60e3).toISOString()).run();
  const to = new URL(doc.authorization_endpoint);
  to.searchParams.set('response_type', 'code');
  to.searchParams.set('client_id', cfg.clientId);
  to.searchParams.set('redirect_uri', url.origin + CALLBACK_PATH);
  to.searchParams.set('scope', cfg.scopes);
  to.searchParams.set('state', state);
  to.searchParams.set('nonce', nonce);
  to.searchParams.set('code_challenge', challenge);
  to.searchParams.set('code_challenge_method', 'S256');
  return new Response(null, { status: 303, headers: { Location: to.toString(), 'Cache-Control': 'no-store' } });
}

/**
 * Finishes a sign-in at /auth/oidc/callback: checks the state (once), exchanges the code, verifies the ID token.
 * Returns { email, next } for a proven email, or { error, status }. Starting the session is the caller's job.
 */
export async function callback(request, env, db) {
  const cfg = oidcConfig(env);
  if (!cfg) return { status: 503, error: 'Sign-in is not configured on the server yet.' };
  if (!db) return { status: 503, error: 'The database is not connected to this site yet.' };
  const url = new URL(request.url);
  const code = url.searchParams.get('code'), state = url.searchParams.get('state');
  if (url.searchParams.get('error')) return { status: 401, error: 'The sign-in provider refused: ' + url.searchParams.get('error') };
  if (!code || !state) return { status: 400, error: 'The sign-in response is missing its code or state.' };

  // the in-flight sign-in this response answers; used once, whatever happens next
  const s = await states(db);
  const row = await s.prepare('SELECT nonce, verifier, next, expires_at FROM oidc_states WHERE state = ?').bind(state).first();
  await s.prepare('DELETE FROM oidc_states WHERE state = ?').bind(state).run();
  if (!row || row.expires_at < new Date().toISOString()) return { status: 401, error: 'This sign-in has expired or was not started here. Try again.' };

  let doc;
  try { doc = await discover(cfg.issuer); } catch (e) { return { status: 502, error: 'The sign-in provider could not be reached: ' + e.message }; }

  // exchange the code for tokens; the PKCE verifier proves this is the app that started the sign-in
  const form = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: url.origin + CALLBACK_PATH, client_id: cfg.clientId, code_verifier: row.verifier });
  if (cfg.clientSecret) form.set('client_secret', cfg.clientSecret);
  let tokens;
  try {
    const r = await fetch(doc.token_endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: form.toString() });
    tokens = await r.json().catch(() => ({}));
    if (!r.ok || !tokens.id_token) return { status: 401, error: 'The sign-in provider did not issue an identity token' + (tokens.error ? ' (' + tokens.error + ')' : '') + '.' };
  } catch (e) { return { status: 502, error: 'The sign-in provider could not be reached for the token exchange.' }; }

  const who = await verifyIdToken(tokens.id_token, cfg, doc, row.nonce);
  if (!who.email) return who;
  return { email: who.email, next: row.next };
}

/** Checks an ID token and returns { email } or { error, status }. Exported for tests. */
export async function verifyIdToken(token, cfg, doc, nonce) {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 3) return { status: 401, error: 'Identity token could not be read.' };
    const [h, p, sig] = parts;
    const header = json(unb64u(h)), payload = json(unb64u(p));
    if (header.alg !== 'RS256') return { status: 401, error: 'Identity token uses an algorithm this app does not accept.' };
    let jwk = (await getKeys(doc.jwks_uri)).find(k => k.kid === header.kid);
    if (!jwk) { keyCache.at = 0; jwk = (await getKeys(doc.jwks_uri)).find(k => k.kid === header.kid); }
    if (!jwk) return { status: 401, error: 'Identity token was signed with a key the provider does not publish.' };
    const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unb64u(sig), enc.encode(h + '.' + p)))) return { status: 401, error: 'Identity token is not valid.' };
    if (String(payload.iss || '').replace(/\/$/, '') !== cfg.issuer) return { status: 401, error: 'Identity token has the wrong issuer.' };
    const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!auds.includes(cfg.clientId)) return { status: 401, error: 'Identity token is for a different application.' };
    if (auds.length > 1 && payload.azp !== cfg.clientId) return { status: 401, error: 'Identity token names another authorised party.' };
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(payload.exp) || payload.exp < now) return { status: 401, error: 'Sign-in has expired.' };
    if (payload.nbf !== undefined && !(Number.isFinite(payload.nbf) && payload.nbf <= now + CLOCK_TOLERANCE)) return { status: 401, error: 'Identity token is not valid yet.' };
    if (payload.iat !== undefined && !(Number.isFinite(payload.iat) && payload.iat <= now + CLOCK_TOLERANCE)) return { status: 401, error: 'Identity token is dated in the future.' };
    if (!payload.nonce || !sameString(payload.nonce, nonce)) return { status: 401, error: 'Identity token does not answer this sign-in.' };
    const email = String(payload.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return { status: 401, error: 'The provider did not supply an email address. Ask its administrator to release the email claim.' };
    if (payload.email_verified === false) return { status: 401, error: 'The provider has not verified this email address.' };
    return { email };
  } catch (e) {
    return { status: 401, error: 'Identity token could not be read.' };
  }
}

export { CALLBACK_PATH };
