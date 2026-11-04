// Cloudflare Worker entry point for the AI Risk Appetite app.
// Static files in /public (the app and /admin) are served by Cloudflare. Requests to /api/* come here.
// All the app logic is in lib/core (cloud-neutral); this file only connects it to Cloudflare:
//   identity  → lib/identity/cloudflare-access.js (Cloudflare Access sign-in)
//   storage   → lib/store/d1.js (Cloudflare D1)
//   email     → Cloudflare Email Service binding EMAIL, only when NOTIFY_SENDING is "on" (off by default)
import { whoIs, handleAuth, gate } from '../lib/identity/session.js';
import { d1Store } from '../lib/store/d1.js';
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

/** DEMO ADDITION: emails in DEMO_ADMINS (comma-separated) are made administrators when they sign in. */
const demoAdmins = env => String(env.DEMO_ADMINS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Sign-in: /login (a static page), /auth/* (lib/identity/session.js). Pages need a session; assets do not.
    if (url.pathname.startsWith('/auth/')) return (await handleAuth(request, env)) || new Response('Not found', { status: 404 });
    if (!url.pathname.startsWith('/api/')) return (await gate(request, env)) || env.ASSETS.fetch(request);

    const who = await whoIs(request, env);
    if (!env.DB && (who.email || who.service)) return json({ error: 'The database is not connected to this site yet.' }, 503);
    // The AI Use Assessment app's service token may read the issued calibration set, and nothing else.
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
        site: env.SITE_LABEL || '', origin: siteUrl(env, request), sender: emailSender(env), defer: p => ctx.waitUntil(p),
      }, d1Store(env.DB));
      return json(r.body, r.status);
    } catch (e) {
      console.error(e);
      return json({ error: 'The server hit an error. Try again.' }, 500);
    }
  },

  // Daily: remind people about "not set" positions that are due soon or overdue.
  async scheduled(event, env, ctx) {
    if (!env.DB) return;
    const store = d1Store(env.DB);
    ctx.waitUntil((async () => {
      await store.init();
      const e = await store.getEngagement(); if (!e) return;
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: env.REMINDER_TZ || 'Australia/Brisbane' }).format(new Date());
      await deliver(dueReminders(e.data, await store.listUsers(), today, siteUrl(env)), store, emailSender(env), new Date().toISOString());
    })());
  },
};
