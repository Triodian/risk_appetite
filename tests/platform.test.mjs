// The Node platform (development plan ID.3): the same handler as the Cloudflare Worker, run by node:http with SQLite,
// and the links between apps over HTTPS with LINK_SECRET where there are no service bindings. The same file is in the
// four engagement apps and Start (tools/sync-platform.mjs). Run: node tests/platform.test.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { sqliteDatabase } from '../lib/store/sqlite.js';
import { serviceLink, handleLink } from '../lib/platform/links.js';
import { staticAssets } from '../lib/platform/node.js';

let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
const freePort = () => new Promise(r => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const appId = (readFileSync(join(root, 'src/worker.js'), 'utf8').match(/const APP_ID = '([^']+)'/) || [, 'app'])[1];

// the SQLite adapter has D1's shape, and batch() is one transaction
{
  const db = sqliteDatabase(':memory:');
  await db.prepare('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT NOT NULL UNIQUE)').run();
  const r = await db.prepare('INSERT INTO t (v) VALUES (?)').bind('a').run();
  ok('run() answers with D1’s meta', r.success === true && r.meta.last_row_id === 1 && r.meta.changes === 1);
  ok('first() and all() answer as D1 does', (await db.prepare('SELECT v FROM t WHERE id = ?').bind(1).first()).v === 'a' && (await db.prepare('SELECT v FROM t').all()).results.length === 1 && (await db.prepare('SELECT v FROM t').first('v')) === 'a');
  ok('undefined and booleans bind as null and 0/1', (await db.prepare('SELECT ? AS a, ? AS b, ? AS c').bind(undefined, true, false).first()).a === null && (await db.prepare('SELECT ? AS b').bind(true).first()).b === 1);
  let threw = false;
  try { await db.batch([db.prepare('INSERT INTO t (v) VALUES (?)').bind('b'), db.prepare('INSERT INTO t (v) VALUES (?)').bind('a')]); } catch (e) { threw = true; }
  ok('a batch with a failing statement keeps none of it (one transaction)', threw && (await db.prepare('SELECT count(*) AS n FROM t').first()).n === 1);
  await db.batch([db.prepare('INSERT INTO t (v) VALUES (?)').bind('b'), db.prepare('INSERT INTO t (v) VALUES (?)').bind('c')]);
  ok('a good batch keeps all of it', (await db.prepare('SELECT count(*) AS n FROM t').first()).n === 3);
  db.close();
}

// static files with the ASSETS.fetch shape
{
  const assets = staticAssets(join(root, 'public'));
  const home = await assets.fetch(new Request('http://x/'));
  ok('/ serves public/index.html', home.status === 200 && /text\/html/.test(home.headers.get('Content-Type')) && /<html/i.test(await home.text()));
  ok('a path outside public/ is refused', (await assets.fetch(new Request('http://x/../package.json'))).status === 404 && (await assets.fetch(new Request('http://x/%2e%2e/%2e%2e/etc/passwd'))).status === 404);
  ok('a missing file is 404', (await assets.fetch(new Request('http://x/no-such-file.js'))).status === 404);
}

// the link route and client, without a server
{
  const methods = { status: async () => ({ status: 200, body: { app: appId, ok: true } }) };
  const req = (auth, path = '/api/link/status') => new Request('https://app.acme.example' + path, { headers: auth ? { Authorization: auth } : {} });
  ok('without LINK_SECRET the link route does not exist', (await handleLink(req('Bearer x'), {}, methods)).status === 404);
  ok('a link path that is not a link path is not handled', (await handleLink(new Request('https://app.acme.example/api/other'), { LINK_SECRET: 's' }, methods)) === null);
  ok('the wrong secret is refused', (await handleLink(req('Bearer wrong'), { LINK_SECRET: 's' }, methods)).status === 401 && (await handleLink(req(null), { LINK_SECRET: 's' }, methods)).status === 401);
  ok('an unknown method is refused with the right secret', (await handleLink(req('Bearer s', '/api/link/nope'), { LINK_SECRET: 's' }, methods)).status === 404 && (await handleLink(req('Bearer s', '/api/link/constructor'), { LINK_SECRET: 's' }, methods)).status === 404);
  const good = await handleLink(req('Bearer s'), { LINK_SECRET: 's' }, methods);
  ok('the right secret reaches the method and answers its body and status', good.status === 200 && (await good.json()).ok === true);
  const binding = { status: async () => ({ status: 200, body: 'from the binding' }) };
  ok('serviceLink prefers the service binding', serviceLink({ X: binding, X_LINK_URL: 'https://x', LINK_SECRET: 's' }, 'X', ['status']) === binding);
  ok('serviceLink is null with neither a binding nor a URL and secret', serviceLink({}, 'X', ['status']) === null && serviceLink({ X_LINK_URL: 'https://x' }, 'X', ['status']) === null && serviceLink({ X_LINK_URL: 'ftp://x', LINK_SECRET: 's' }, 'X', ['status']) === null);
}

// the whole app on Node: src/node.js on a free port, SQLite in a temporary directory, sign-in by the local-development path
{
  const port = await freePort(), dir = mkdtempSync(join(tmpdir(), 'triodian-platform-'));
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [join(root, 'src/node.js')], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, PORT: String(port), DATA_DIR: dir, SITE_URL: base, LOCAL_DEV_NO_SIGNIN_EMAIL: 'admin@acme.test', FIRST_ADMINS: 'admin@acme.test',
      NOTIFY_SENDING: 'off', SUITE_DEMO: 'off', LINK_SECRET: 'link-secret-1', SITE_LABEL: 'Node test', APP_COMMIT: 'test-commit' },
  });
  let log = ''; child.stdout.on('data', d => { log += d; }); child.stderr.on('data', d => { log += d; });
  const up = async () => { for (let i = 0; i < 100; i++) { try { const r = await fetch(base + '/api/version'); if (r.ok) return true; } catch (e) {} await new Promise(r => setTimeout(r, 100)); } return false; };
  try {
    ok('src/node.js starts and answers /api/version', await up(), log.slice(-400));
    const v = await (await fetch(base + '/api/version')).json();
    ok('with the app id and the commit it was started with', v.app === appId && v.commit === 'test-commit' && v.site === 'Node test', JSON.stringify(v));
    const home = await fetch(base + '/', { headers: { 'X-Dev-User': 'admin@acme.test' } });
    ok('the home page is served from public/', home.status === 200 && /text\/html/.test(home.headers.get('content-type')) && home.headers.get('x-triodian-release') === 'test-commit');
    const other = await fetch(base + '/api/admin/users', { headers: { 'X-Dev-User': 'nobody@acme.test' } });
    ok('the role rules run: someone who is not an administrator is refused', other.status === 403 || other.status === 401, String(other.status));
    const users = await fetch(base + '/api/admin/users', { headers: { 'X-Dev-User': 'admin@acme.test' } });
    ok('the first administrator signs in on the local-development path and reads the users (the SQLite store works end to end)', users.status === 200, String(users.status) + ' ' + (await users.text()).slice(0, 200));
    const r = await fetch(base + '/api/link/status', { headers: { Authorization: 'Bearer link-secret-1' } });
    const body = await r.json().catch(() => null);
    ok('another app reads this one’s status over the link with the deployment’s secret', r.status === 200 && body && typeof body === 'object', `${r.status} ${JSON.stringify(body).slice(0, 120)}`);
    ok('and is refused without it', (await fetch(base + '/api/link/status')).status === 401 && (await fetch(base + '/api/link/status', { headers: { Authorization: 'Bearer nope' } })).status === 401);
    const client = serviceLink({ OTHER_LINK_URL: base, LINK_SECRET: 'link-secret-1' }, 'OTHER', ['status']);
    const viaClient = await client.status();
    ok('serviceLink’s HTTPS client answers { status, body } as a binding would', viaClient.status === 200 && viaClient.body.format === body.format && viaClient.body.app === body.app);
    ok('the client with the wrong secret gets the refusal as a status, not an exception', (await serviceLink({ OTHER_LINK_URL: base, LINK_SECRET: 'nope' }, 'OTHER', ['status']).status()).status === 401);
    const lo = await fetch(base + '/auth/logout', { redirect: 'manual' });
    ok('the auth routes run (sign-out redirects to /login)', lo.status === 303 && /^\/login/.test(lo.headers.get('location') || ''), `${lo.status} ${lo.headers.get('location')}`);
  } finally {
    child.kill();
    await new Promise(r => child.once('exit', r));
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(fails ? `\n${fails} failed` : '\nAll passed'); process.exit(fails ? 1 : 0);
