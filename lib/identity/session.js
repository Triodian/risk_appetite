// Sign-in page and sessions. The same file is in the AI Risk Appetite and AI Use Assessment repos.
//
// Two ways in, both ending in a signed-in email that the rest of the app treats like any other:
//  1. Demo login (DEMO ADDITION): a username and password from DEMO_LOGIN, for the shared demo account
//     (trio_demo). The password is held only as a PBKDF2 hash. A successful login sets a cookie for the
//     whole triodian.com domain, so one login covers every Triodian app. That cookie is signed with
//     DEMO_SESSION_KEY and is only ever accepted for the demo account's own email, so it cannot be used to
//     act as anyone else.
//  2. Sign in with email: /auth/email is protected by Cloudflare Access (an Access application scoped to that
//     path). Access proves the email; this file then starts a session for it, kept in the database (D1).
//
// The page at /login is public/login/index.html. Every other page of the app needs a session (see gate()).

import { identify } from './cloudflare-access.js';

const DEMO_COOKIE = 'tri_demo';           // domain-wide, HMAC-signed, demo account only
const SESSION_COOKIE = 'tri_session';     // this site only, a random token looked up in D1
const DEMO_HOURS = 12, SESSION_HOURS = 12;
const enc = new TextEncoder();

const b64u = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
function sameBytes(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }

function cookies(request) {
  const out = {};
  for (const part of (request.headers.get('Cookie') || '').split(/;\s*/)) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i)] = part.slice(i + 1); }
  return out;
}
const isLocal = url => url.hostname === 'localhost' || url.hostname === '127.0.0.1';
/** The parent domain the demo cookie is shared across (triodian.com), or none on localhost. */
function sharedDomain(url, env) {
  if (isLocal(url)) return '';
  if (env.DEMO_COOKIE_DOMAIN) return env.DEMO_COOKIE_DOMAIN;
  const parts = url.hostname.split('.');
  return parts.length > 2 ? parts.slice(-2).join('.') : url.hostname;
}

/**
 * DEMO_LOGIN: JSON [{ "username", "email", "hash", "anyCharAt"? }], hash = "pbkdf2-sha256$<iterations>$<salt b64url>$<key b64url>".
 * anyCharAt: positions (0 = first character) where any one character is accepted. The hash is then made over the
 * password with those characters replaced by maskPassword(). Used for trio_demo, whose password has a £ that isn't on
 * every keyboard.
 */
/**
 * DEMO ADDITION (development plan tasks 0.2 and 0.3): what this deployment shows of the demonstration.
 * suiteDemo: the demo band and app switcher (public/suite.js), only when SUITE_DEMO is "on". A deployment that does
 * not set it, such as the client profile in wrangler.jsonc, shows none.
 * demoLogin: the username sign-in on /login, only when DEMO_LOGIN holds an account.
 */
export function demoFlags(env) {
  return { suiteDemo: String((env && env.SUITE_DEMO) || '').trim().toLowerCase() === 'on', demoLogin: demoAccounts(env || {}).length > 0 };
}

/** Marks an HTML page with the demo flags (<html data-suite-demo data-demo-login>), so the page can show or hide the demo parts. */
export function markDemo(res, env) {
  const type = (res && res.headers && res.headers.get('content-type')) || '';
  if (!type.includes('text/html') || typeof HTMLRewriter === 'undefined') return res;
  const f = demoFlags(env);
  return new HTMLRewriter().on('html', { element(e) { e.setAttribute('data-suite-demo', f.suiteDemo ? 'on' : 'off'); e.setAttribute('data-demo-login', f.demoLogin ? 'on' : 'off'); } }).transform(res);
}

export function demoAccounts(env) {
  try { const a = JSON.parse(env.DEMO_LOGIN || '[]'); return Array.isArray(a) ? a.filter(x => x && x.username && x.email && x.hash) : []; } catch (e) { return []; }
}
export async function hashPassword(password, iterations = 100000, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return `pbkdf2-sha256$${iterations}$${b64u(salt)}$${b64u(bits)}`;
}
export function maskPassword(password, positions = []) {
  const chars = Array.from(String(password).normalize('NFC'));
  for (const i of positions) if (i >= 0 && i < chars.length) chars[i] = '\u0000';
  return chars.join('');
}
async function checkPassword(password, stored) {
  const [alg, it, salt, want] = String(stored).split('$');
  if (alg !== 'pbkdf2-sha256') return false;
  const got = (await hashPassword(password, Number(it), unb64u(salt))).split('$')[3];
  return sameBytes(unb64u(got), unb64u(want));
}

async function hmacKey(env) {
  if (!env.DEMO_SESSION_KEY) return null;
  return crypto.subtle.importKey('raw', enc.encode(env.DEMO_SESSION_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function demoToken(env, email, exp) {
  const body = b64u(enc.encode(JSON.stringify({ e: email, x: exp })));
  return body + '.' + b64u(await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(body)));
}
async function readDemoToken(env, token) {
  const key = await hmacKey(env); if (!key || !token) return null;
  const [body, sig] = token.split('.'); if (!body || !sig) return null;
  try {
    if (!(await crypto.subtle.verify('HMAC', key, unb64u(sig), enc.encode(body)))) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64u(body)));
    if (!p.x || p.x < Date.now() / 1000) return null;
    // Only the demo accounts' own emails, so a leaked key can never act as a real person.
    const email = String(p.e || '').toLowerCase();
    return demoAccounts(env).some(a => a.email.toLowerCase() === email) ? email : null;
  } catch (e) { return null; }
}

let tableReady = false;
async function sessions(db) {
  if (!tableReady) {
    await db.prepare('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)').run();
    tableReady = true;
  }
  return db;
}

/** The signed-in email from this app's own cookies, or null. */
export async function sessionEmail(request, env) {
  const c = cookies(request);
  const demo = await readDemoToken(env, c[DEMO_COOKIE]);
  if (demo) return demo;
  if (c[SESSION_COOKIE] && env.DB) {
    const db = await sessions(env.DB);
    const row = await db.prepare('SELECT email, expires_at FROM sessions WHERE token_hash = ?').bind(await sha256(c[SESSION_COOKIE])).first();
    if (row && row.expires_at > new Date().toISOString()) return row.email;
  }
  return null;
}

/** Who is making this request: a session first, then a Cloudflare Access token (people on /auth/email, and service tokens). */
export async function whoIs(request, env) {
  const email = await sessionEmail(request, env);
  if (email) return { email };
  return identify(request, env);
}

const redirect = (to, headers = {}) => new Response(null, { status: 303, headers: { Location: to, 'Cache-Control': 'no-store', ...headers } });
/** Only same-site paths, so the login page can't be used to send people elsewhere. */
function safeNext(v) { v = String(v || '/'); return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/auth/') && !v.startsWith('/login') ? v : '/'; }

/** /auth/login, /auth/email and /auth/logout. Returns a Response, or null for any other path. */
export async function handleAuth(request, env) {
  const url = new URL(request.url);
  const secure = isLocal(url) ? '' : '; Secure';

  if (url.pathname === '/auth/login' && request.method === 'POST') {
    const form = await request.formData().catch(() => null);
    const username = String(form?.get('username') || '').trim().toLowerCase();
    const password = String(form?.get('password') || '');
    const next = safeNext(form?.get('next'));
    const acct = demoAccounts(env).find(a => a.username.toLowerCase() === username);
    const ok = acct && env.DEMO_SESSION_KEY && (await checkPassword(maskPassword(password, acct.anyCharAt || []), acct.hash));
    if (!ok) {
      await new Promise(r => setTimeout(r, 400)); // slow down guessing
      return redirect('/login?failed=1&next=' + encodeURIComponent(next));
    }
    const exp = Math.floor(Date.now() / 1000) + DEMO_HOURS * 3600;
    const dom = sharedDomain(url, env);
    return redirect(next, { 'Set-Cookie': `${DEMO_COOKIE}=${await demoToken(env, acct.email.toLowerCase(), exp)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DEMO_HOURS * 3600}${secure}${dom ? '; Domain=' + dom : ''}` });
  }

  if (url.pathname === '/auth/email') {
    // Cloudflare Access sits in front of this one path. Reaching here with its token means the email is proven.
    const who = await identify(request, env);
    if (!who.email) return redirect('/login?email=0');
    if (!env.DB) return new Response('The database is not connected to this site yet.', { status: 503 });
    const token = b64u(crypto.getRandomValues(new Uint8Array(32)));
    const now = new Date();
    const db = await sessions(env.DB);
    await db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now.toISOString()).run();
    await db.prepare('INSERT INTO sessions (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .bind(await sha256(token), who.email, now.toISOString(), new Date(now.getTime() + SESSION_HOURS * 3600e3).toISOString()).run();
    return redirect(safeNext(url.searchParams.get('next')), { 'Set-Cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}${secure}` });
  }

  if (url.pathname === '/auth/logout') {
    const c = cookies(request);
    if (c[SESSION_COOKIE] && env.DB) await (await sessions(env.DB)).prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(c[SESSION_COOKIE])).run();
    const dom = sharedDomain(url, env);
    const h = new Headers({ Location: '/login?out=1', 'Cache-Control': 'no-store' });
    h.append('Set-Cookie', `${DEMO_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}${dom ? '; Domain=' + dom : ''}`);
    h.append('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
    h.append('Set-Cookie', `CF_Authorization=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
    return new Response(null, { status: 303, headers: h });
  }
  return null;
}

/**
 * Pages need a session; everything else in public/ (scripts, styles, fonts, images, the login page) does not.
 * Returns a redirect to /login for a signed-out visitor to a page, or null to carry on.
 */
export async function gate(request, env) {
  const url = new URL(request.url);
  const p = url.pathname;
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  if (p === '/login' || p.startsWith('/login/') || p.startsWith('/auth/') || p.startsWith('/api/')) return null;
  const isPage = p.endsWith('/') || p.endsWith('.html');
  if (!isPage) return null;
  const who = await whoIs(request, env);
  if (who.email) return null;
  return redirect('/login?next=' + encodeURIComponent(p + url.search));
}
