// Cloudflare Worker entry point for the AI Risk Appetite app.
// Static files in /public (the app and /admin) are served by Cloudflare. Requests to /api/* come here.
// All the app logic is in lib/core (cloud-neutral); this file only connects it to Cloudflare:
//   identity  → lib/identity/cloudflare-access.js (Cloudflare Access sign-in)
//   storage   → lib/store/d1.js (Cloudflare D1); users from lib/identity/people.js when IDENTITY is bound
//   email     → Cloudflare Email Service binding EMAIL, only when NOTIFY_SENDING is "on" (off by default)
import { whoIs, handleAuth, gate, markDemo } from '../lib/identity/session.js';
import { d1Store } from '../lib/store/d1.js';
import { identityUsers, withIdentity } from '../lib/identity/people.js';
import { handle, issuedCalibration } from '../lib/core/api.js';
import { dueReminders, deliver } from '../lib/core/notify.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

/** Returns a function that emails one message, or null while sending is switched off. */
function emailSender(env) {
  if (env.NOTIFY_SENDING !== 'on' || !env.EMAIL || !env.NOTIFY_FROM) return null;
  return m => env.EMAIL.send({ to: m.to, from: { email: env.NOTIFY_FROM, name: 'AI Risk Appetite' }, subject: m.subject, text: m.text });
}
const siteUrl = (env, request) => env.SITE_URL || (request ? new URL(request.url).origin : 'https://risk-appetite.triodian.com');

/** The issued calibration set for another Triodian app over a service binding (src/service.js; plan task 1B.4). */
export async function calibrationForService(env) {
  if (!env.DB) return { status: 503, body: { error: 'The database is not connected to the Risk Appetite app yet.' } };
  try { return await issuedCalibration(d1Store(env.DB)); }
  catch (e) { console.error(e); return { status: 500, body: { error: 'The Risk Appetite app hit an error reading the calibration set.' } }; }
}

/** Reads the board directions from the AI Board Direction app (task 3.5), through the BOARD service binding to its
 *  BoardService entrypoint. Null when this site has no binding: set-up then offers the file instead. */
function directionsReader(env) {
  if (!env.BOARD || typeof env.BOARD.directions !== 'function') return null;
  return async () => {
    let r;
    try { r = await env.BOARD.directions(); }
    catch (e) { console.error(e); return { status: 503, error: 'The Board Direction app could not be reached through the BOARD service binding. Check that the binding names the Board Direction Worker deployed in this account.' }; }
    return r && r.status === 200 ? r.body : { status: (r && r.status) || 502, error: (r && r.body && r.body.error) || 'The Board Direction app gave no answer.' };
  };
}

/** DEMO ADDITION: emails in DEMO_ADMINS (comma-separated) are made administrators when they sign in. */
const demoAdmins = env => String(env.DEMO_ADMINS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

/** The app's store. With the IDENTITY binding (the suite's shared identity database, plan task 1B.2) its users and their
 *  roles come from there, so a person is added once for the suite; everything else stays in this app's own database. */
const APP_ID = 'risk-appetite';
const storeFor = env => withIdentity(d1Store(env.DB), env.IDENTITY ? identityUsers(env.IDENTITY, APP_ID, env.DB) : null);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Sign-in: /login (a static page), /auth/* (lib/identity/session.js). Pages need a session; assets do not.
    if (url.pathname.startsWith('/auth/')) return (await handleAuth(request, env)) || new Response('Not found', { status: 404 });
    if (!url.pathname.startsWith('/api/')) return (await gate(request, env)) || markDemo(await env.ASSETS.fetch(request), env);

    const who = await whoIs(request, env);
    if (!env.DB && (who.email || who.service)) return json({ error: 'The database is not connected to this site yet.' }, 503);
    // The AI Use Assessment app's service token may read the issued calibration set, and nothing else. Kept for one release
    // while the service binding (src/service.js) takes over; then this path and CALIBRATION_CLIENT_ID can go.
    // CALIBRATION_CLIENT_ID is that token's Client ID. Add it as a secret on this Worker (secrets survive deploys).
    if (who.service) {
      if (request.method !== 'GET' || url.pathname !== '/api/calibration-set') return json({ error: 'This service token may only read the calibration set.' }, 403);
      if (!env.CALIBRATION_CLIENT_ID || who.service !== env.CALIBRATION_CLIENT_ID) return json({ error: 'This service token is not allowed to read the calibration set. Set CALIBRATION_CLIENT_ID on the Risk Appetite Worker to its Client ID.' }, 403);
      const r = await issuedCalibration(d1Store(env.DB));
      return json(r.body, r.status);
    }
    if (!who.email) return json({ error: who.error }, who.status || 401);

    try {
      const r = await handle({
        method: request.method, path: url.pathname, email: who.email, text: () => request.text(),
        demoAdmins: demoAdmins(env),
        firstAdmins: String(env.FIRST_ADMINS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
        site: env.SITE_LABEL || '', origin: siteUrl(env, request), sender: emailSender(env), defer: p => ctx.waitUntil(p),
        readDirections: directionsReader(env),
      }, storeFor(env));
      return json(r.body, r.status);
    } catch (e) {
      console.error(e);
      return json({ error: 'The server hit an error. Try again.' }, 500);
    }
  },

  // Daily: remind people about "not set" positions that are due soon or overdue.
  async scheduled(event, env, ctx) {
    if (!env.DB) return;
    const store = storeFor(env);
    ctx.waitUntil((async () => {
      await store.init();
      const e = await store.getEngagement(); if (!e) return;
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: env.REMINDER_TZ || 'Australia/Brisbane' }).format(new Date());
      await deliver(dueReminders(e.data, await store.listUsers(), today, siteUrl(env)), store, emailSender(env), new Date().toISOString());
    })());
  },
};
