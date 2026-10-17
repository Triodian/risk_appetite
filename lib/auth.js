// Verifies the Cloudflare Access sign-in token on each API request.
// Fails closed: if Access is not configured or the token is missing or invalid, the request is refused.
import { ACCESS } from './config.js';

let certCache = { keys: null, at: 0 };

const b64url = s => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

async function getKeys(team) {
  if (certCache.keys && Date.now() - certCache.at < 60 * 60 * 1000) return certCache.keys;
  const r = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error('could not fetch Access certificates');
  const j = await r.json();
  certCache = { keys: j.keys || [], at: Date.now() };
  return certCache.keys;
}

function tokenFrom(request) {
  const h = request.headers.get('Cf-Access-Jwt-Assertion');
  if (h) return h;
  const m = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return m ? m[1] : null;
}

/** Returns { email } for a signed-in user, or { error, status }. */
export async function authenticate(request, env) {
  const url = new URL(request.url);

  // Local development only: allow a fixed user when running on this machine.
  if (env.LOCAL_DEV_NO_SIGNIN_EMAIL && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
    return { email: env.LOCAL_DEV_NO_SIGNIN_EMAIL };
  }

  const team = (env.ACCESS_TEAM_DOMAIN || ACCESS.teamDomain || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const aud = env.ACCESS_AUD || ACCESS.aud;
  if (!team || !aud) return { status: 503, error: 'Sign-in is not configured on the server yet.' };

  const token = tokenFrom(request);
  if (!token) return { status: 401, error: 'Not signed in.' };

  try {
    const [h, p, s] = token.split('.');
    const header = JSON.parse(new TextDecoder().decode(b64url(h)));
    const payload = JSON.parse(new TextDecoder().decode(b64url(p)));
    const keys = await getKeys(team);
    let jwk = keys.find(k => k.kid === header.kid);
    if (!jwk) { certCache.at = 0; jwk = (await getKeys(team)).find(k => k.kid === header.kid); }
    if (!jwk || header.alg !== 'RS256') return { status: 401, error: 'Sign-in token not recognised.' };
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(h + '.' + p));
    if (!ok) return { status: 401, error: 'Sign-in token is not valid.' };
    const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!auds.includes(aud)) return { status: 401, error: 'Sign-in token is for a different application.' };
    if (payload.iss !== `https://${team}`) return { status: 401, error: 'Sign-in token has the wrong issuer.' };
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return { status: 401, error: 'Sign-in has expired.' };
    if (!payload.email) return { status: 401, error: 'Sign-in token has no email.' };
    return { email: String(payload.email).toLowerCase() };
  } catch (e) {
    return { status: 401, error: 'Sign-in token could not be read.' };
  }
}
