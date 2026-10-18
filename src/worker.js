// Cloudflare Worker entry point for the AI Risk Appetite app.
// Static files in /public (the app and /admin) are served by Cloudflare. Requests to /api/* come here.
// All the app logic is in lib/core (cloud-neutral); this file only connects it to Cloudflare:
//   identity  → lib/identity/cloudflare-access.js (Cloudflare Access sign-in)
//   storage   → lib/store/d1.js (Cloudflare D1)
import { identify } from '../lib/identity/cloudflare-access.js';
import { d1Store } from '../lib/store/d1.js';
import { handle } from '../lib/core/api.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    const who = await identify(request, env);
    if (!who.email) return json({ error: who.error }, who.status || 401);
    if (!env.DB) return json({ error: 'The database is not connected to this site yet.' }, 503);

    try {
      const r = await handle({ method: request.method, path: url.pathname, email: who.email, text: () => request.text(), site: env.SITE_LABEL || '' }, d1Store(env.DB));
      return json(r.body, r.status);
    } catch (e) {
      console.error(e);
      return json({ error: 'The server hit an error. Try again.' }, 500);
    }
  },
};
