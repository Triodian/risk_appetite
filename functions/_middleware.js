// Runs before every request.
// 1. Sends visitors from the default pages.dev address to the real address (where sign-in applies).
// 2. Checks the Cloudflare Access sign-in for every /api request and sets up the database table.
import { CANONICAL_HOST, PAGES_DEV_HOST } from '../lib/config.js';
import { authenticate } from '../lib/auth.js';
import { ensureSchema, json } from '../lib/db.js';

export async function onRequest(ctx) {
  const { request, env, next, data } = ctx;
  const url = new URL(request.url);

  if (url.hostname === PAGES_DEV_HOST) {
    url.hostname = CANONICAL_HOST;
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  if (url.pathname.startsWith('/api/')) {
    const who = await authenticate(request, env);
    if (!who.email) return json({ error: who.error }, who.status || 401);
    if (!env.DB) return json({ error: 'The database is not connected to this site yet.' }, 503);
    await ensureSchema(env.DB);
    data.email = who.email;
  }
  return next();
}
