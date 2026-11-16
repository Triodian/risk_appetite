// Links between the apps, behind one interface (development plan ID.3). The same file is in the four engagement apps
// and Start (tools/sync-platform.mjs).
//
// On Cloudflare each app binds to another's WorkerEntrypoint (src/service.js) with a service binding: no URL, no
// secret, nothing public. On a platform without bindings the same methods are called over HTTPS at
// /api/link/<method> on the other app, with one shared secret for the deployment (LINK_SECRET) sent as a bearer
// token; the other app's URL is in <BINDING>_LINK_URL (for example APPETITE_LINK_URL). Either way a method answers
// { status, body }, as the entrypoints do, so the core never knows which carried the call.
//
// A link is server to server and reaches only the methods the app lists in LINK_METHODS; it carries no person's
// identity and grants no role. Without LINK_SECRET the HTTPS route does not exist (404), so a Cloudflare deployment
// that uses bindings exposes nothing.
const enc = new TextEncoder();
function sameBytes(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

/**
 * The link to another app: the service binding when the platform has one, else an HTTPS client to <binding>_LINK_URL
 * with LINK_SECRET, else null (the link is not set up; the app then offers the file instead).
 * @param {object} env  the deployment's bindings and variables
 * @param {string} binding  the binding's name, for example 'APPETITE'
 * @param {string[]} methods  the methods the other app offers, for example ['calibrationSet']
 */
export function serviceLink(env, binding, methods) {
  if (env[binding] && typeof env[binding] === 'object') return env[binding];
  const url = String(env[binding + '_LINK_URL'] || '').trim().replace(/\/$/, '');
  const secret = String(env.LINK_SECRET || '').trim();
  if (!url || !secret || !/^https?:\/\//.test(url)) return null;
  const out = {};
  for (const m of methods) {
    out[m] = async () => {
      const r = await fetch(`${url}/api/link/${m}`, { headers: { Authorization: 'Bearer ' + secret, Accept: 'application/json' }, redirect: 'manual' });
      let body = null; try { body = await r.json(); } catch (e) { /* not JSON */ }
      return { status: r.status, body: body || { error: `The linked app at ${url} answered ${r.status}.` } };
    };
  }
  return out;
}

/**
 * Serves this app's link methods at /api/link/<method> for the other apps on a platform without bindings.
 * Returns a Response, or null when the path is not a link path. `methods` maps a name to (env) => { status, body }.
 */
export async function handleLink(request, env, methods) {
  const url = new URL(request.url);
  const m = url.pathname.match(/^\/api\/link\/([A-Za-z][A-Za-z0-9]*)$/);
  if (!m) return null;
  const secret = String(env.LINK_SECRET || '').trim();
  if (!secret) return json({ error: 'Not found.' }, 404);
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ') || !sameBytes(enc.encode(auth.slice(7).trim()), enc.encode(secret))) return json({ error: 'Not allowed.' }, 401);
  const fn = methods && Object.prototype.hasOwnProperty.call(methods, m[1]) ? methods[m[1]] : null;
  if (!fn || request.method !== 'GET') return json({ error: 'No such link method.' }, 404);
  let r;
  try { r = await fn(env); } catch (e) { console.error(e); return json({ error: 'The linked method hit an error.' }, 500); }
  return json(r.body, r.status);
}
