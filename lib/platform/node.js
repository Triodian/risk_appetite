// The Node platform (development plan ID.3): the same handler as the Cloudflare Worker (src/worker.js), run by
// node:http. The same file is in the four engagement apps and Start (tools/sync-platform.mjs).
//
// The handler takes an `env` whose members are the platform: a D1-shaped database (DB), the suite's identity database
// (IDENTITY), static files (ASSETS.fetch), an email sender (EMAIL.send), the links to the other apps (service bindings
// on Cloudflare; HTTPS with LINK_SECRET elsewhere, lib/platform/links.js), and the deployment's variables. This file
// builds that env for Node: SQLite for the databases (lib/store/sqlite.js), public/ served from disk, email to a
// webhook or the log, and a daily tick for the reminders the Worker's cron runs. Nothing in lib/core or lib/identity
// changes between the two.
//
// Sign-in on Node: there is no Cloudflare Access, so IDENTITY_PROVIDER=oidc with the organisation's provider
// (lib/identity/oidc.js), or LOCAL_DEV_NO_SIGNIN_EMAIL on localhost for development and tests.
//
// Variables beyond the Worker's: PORT (8787), HOST (127.0.0.1), DATA_DIR (.data; the SQLite files), IDENTITY_DB_PATH
// (one identity database shared by every app of the deployment; default <DATA_DIR>/identity.sqlite), PUBLIC_DIR
// (public), SITE_URL (the public origin, needed behind a TLS proxy so cookies and redirects are built for https),
// EMAIL_WEBHOOK_URL and EMAIL_WEBHOOK_SECRET (where messages are posted as JSON when NOTIFY_SENDING is on; without a
// webhook they are logged), REMINDER_HOUR (the local hour of the daily tick, 7).
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { sqliteDatabase } from '../store/sqlite.js';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8', '.pdf': 'application/pdf', '.vtt': 'text/vtt', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json' };

/** Static files from a directory, with the ASSETS.fetch shape: /dir/ serves index.html; a path with no extension tries .html. */
export function staticAssets(dir) {
  const root = resolve(dir);
  const file = async p => { try { const s = await stat(p); return s.isFile() ? p : null; } catch (e) { return null; } };
  return {
    async fetch(request) {
      const url = new URL(request.url);
      let p = decodeURIComponent(url.pathname);
      if (p.includes('\0')) return new Response('Not found', { status: 404 });
      const full = resolve(root, '.' + p);
      if (full !== root && !full.startsWith(root + sep)) return new Response('Not found', { status: 404 });
      let found = null;
      if (p.endsWith('/')) found = await file(join(full, 'index.html'));
      else found = (await file(full)) || (!extname(full) && (await file(full + '.html'))) || null;
      if (!found && !p.endsWith('/') && !extname(full) && (await file(join(full, 'index.html')))) {
        return new Response(null, { status: 301, headers: { Location: p + '/' + url.search } });
      }
      if (!found) return new Response('Not found', { status: 404 });
      const body = await readFile(found);
      const type = TYPES[extname(found).toLowerCase()] || 'application/octet-stream';
      const cache = /\.(html)$/.test(found) ? 'no-cache' : 'public, max-age=3600';
      return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers: { 'Content-Type': type, 'Cache-Control': cache, 'Content-Length': String(body.length) } });
    },
  };
}

/** An EMAIL.send(): posts the message to a webhook as JSON, or logs it. */
export function mailer(vars) {
  const webhook = String(vars.EMAIL_WEBHOOK_URL || '').trim();
  return {
    async send(m) {
      if (!webhook) { console.log(`[email] to ${typeof m.to === 'string' ? m.to : JSON.stringify(m.to)}: ${m.subject}`); return; }
      const headers = { 'Content-Type': 'application/json' };
      if (vars.EMAIL_WEBHOOK_SECRET) headers.Authorization = 'Bearer ' + vars.EMAIL_WEBHOOK_SECRET;
      const r = await fetch(webhook, { method: 'POST', headers, body: JSON.stringify(m) });
      if (!r.ok) throw new Error('the email webhook answered ' + r.status);
    },
  };
}

/** The handler's env for Node: the variables as given, plus the databases, static files and email. */
export async function nodeEnv(vars = process.env, { appId, dataDir, publicDir } = {}) {
  const env = {};
  for (const [k, v] of Object.entries(vars)) if (typeof v === 'string') env[k] = v;
  const dir = resolve(vars.DATA_DIR || dataDir || '.data');
  await mkdir(dir, { recursive: true });
  env.DB = sqliteDatabase(join(dir, (appId || 'app') + '.sqlite'));
  env.IDENTITY = sqliteDatabase(vars.IDENTITY_DB_PATH ? resolve(vars.IDENTITY_DB_PATH) : join(dir, 'identity.sqlite'));
  env.ASSETS = staticAssets(vars.PUBLIC_DIR || publicDir || 'public');
  env.EMAIL = mailer(vars);
  return env;
}

function toRequest(req, origin) {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) { if (Array.isArray(v)) for (const x of v) headers.append(k, x); else if (v !== undefined) headers.set(k, v); }
  const init = { method: req.method, headers, redirect: 'manual' };
  if (req.method !== 'GET' && req.method !== 'HEAD') { init.body = Readable.toWeb(req); init.duplex = 'half'; }
  return new Request(origin + req.url, init);
}

/** Runs the handler on node:http. Resolves with the server once it is listening. */
export function serve(worker, env, { port = Number(env.PORT || 8787), host = env.HOST || '127.0.0.1' } = {}) {
  const site = String(env.SITE_URL || '').trim();
  const server = createServer(async (req, res) => {
    const pending = [];
    const ctx = { waitUntil: p => pending.push(Promise.resolve(p).catch(e => console.error(e))), passThroughOnException() {} };
    try {
      const origin = site ? new URL(site).origin : `http://${req.headers.host || host + ':' + port}`;
      const r = await worker.fetch(toRequest(req, origin), env, ctx);
      const headers = [];
      for (const [k, v] of r.headers) if (k.toLowerCase() !== 'set-cookie') headers.push([k, v]);
      for (const c of (r.headers.getSetCookie ? r.headers.getSetCookie() : [])) headers.push(['set-cookie', c]);
      res.writeHead(r.status, headers);
      if (r.body && req.method !== 'HEAD') { for await (const chunk of r.body) res.write(chunk); }
      res.end();
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('The server hit an error.');
    }
    await Promise.all(pending);
  });
  return new Promise(resolvePromise => server.listen(port, host, () => resolvePromise(server)));
}

/** Runs the Worker's scheduled() once a day at REMINDER_HOUR local time (the cron on Cloudflare). Returns the timer. */
export function daily(worker, env, { hour = Number(env.REMINDER_HOUR || 7) } = {}) {
  if (typeof worker.scheduled !== 'function') return null;
  let last = '';
  const tick = async () => {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    if (now.getHours() !== hour || last === day) return;
    last = day;
    const pending = [];
    try { await worker.scheduled({ cron: 'daily' }, env, { waitUntil: p => pending.push(Promise.resolve(p).catch(e => console.error(e))) }); await Promise.all(pending); }
    catch (e) { console.error(e); }
  };
  const t = setInterval(tick, 60 * 1000);
  t.unref();
  return t;
}
