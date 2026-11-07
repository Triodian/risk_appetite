// Identity adapter: Cloudflare Access. The same file is in the four engagement apps (tools/sync-identity.mjs).
// Verifies the Access sign-in token (RS256 JWT) and returns the signed-in email.
// Fails closed: if Access is not configured or the token is missing or invalid, there is no identity.
// For AWS or Azure, replace this file with an OIDC adapter (Cognito, Entra ID) that returns the same shape.
import { ACCESS } from '../config.js';

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

/** Returns { email } for a signed-in person, { service } (the Client ID) for a service token, or { error, status }. */
export async function identify(request, env) {
  const url = new URL(request.url);

  // Local development only (never in production): a fixed user, or the X-Dev-User header, on localhost.
  if (env.LOCAL_DEV_NO_SIGNIN_EMAIL && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
    return { email: (request.headers.get('X-Dev-User') || env.LOCAL_DEV_NO_SIGNIN_EMAIL).toLowerCase() };
  }

  const team = (env.ACCESS_TEAM_DOMAIN || ACCESS.teamDomain || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  // ACCESS_AUD may hold one tag or several separated by commas (for example the live and test applications).
  // Spaces and line breaks pasted with a secret are ignored.
  const auds = String(env.ACCESS_AUD || ACCESS.aud || '').split(',').map(x => x.trim()).filter(Boolean);
  const aud = auds[0];
  if (!team || !aud || /REPLACE-WITH/.test(aud)) return { status: 503, error: 'Sign-in is not configured on the server yet: the Access AUD tag is not set (lib/config.js or the ACCESS_AUD variable).' };

  const token = tokenFrom(request);
  if (!token) return { status: 401, error: 'No Cloudflare Access sign-in reached the app. Check that an Access application covers ' + url.hostname + '.' };

  try {
    const [h, p, s] = token.split('.');
    const header = JSON.parse(new TextDecoder().decode(b64url(h)));
    const payload = JSON.parse(new TextDecoder().decode(b64url(p)));
    let jwk = (await getKeys(team)).find(k => k.kid === header.kid);
    if (!jwk) { certCache.at = 0; jwk = (await getKeys(team)).find(k => k.kid === header.kid); }
    if (!jwk || header.alg !== 'RS256') return { status: 401, error: 'Sign-in token not recognised.' };
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(h + '.' + p));
    if (!ok) return { status: 401, error: 'Sign-in token is not valid.' };
    const tokenAuds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!tokenAuds.some(x => auds.includes(x))) return { status: 401, error: 'Sign-in token is for a different Access application. Check that ACCESS_AUD (or lib/config.js) holds the AUD tag of the application covering ' + url.hostname + '.' };
    if (payload.iss !== `https://${team}`) return { status: 401, error: 'Sign-in token has the wrong issuer.' };
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return { status: 401, error: 'Sign-in has expired.' };
    // A service token (a machine sign-in) has no email; its Client ID is in common_name.
    if (!payload.email && payload.common_name) return { service: String(payload.common_name) };
    if (!payload.email) return { status: 401, error: 'Sign-in token has no email.' };
    return { email: String(payload.email).toLowerCase() };
  } catch (e) {
    return { status: 401, error: 'Sign-in token could not be read.' };
  }
}
