// Sign-in page and sessions (lib/identity/session.js), using the settings committed in wrangler.jsonc.
//   node tests/login.test.mjs
import fs from 'node:fs';
import worker from '../src/worker.js';
import { whoIs } from '../lib/identity/session.js';
let fails = 0; const check = (n, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + n); if (!ok) fails++; };

const cfg = JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8').split('\n').filter(l => !l.trim().startsWith('//')).join('\n'));
const sessions = new Map();
const DB = { prepare(sql) { let args = []; return { bind(...a) { args = a; return this; },
  async run() { if (/^INSERT INTO sessions/.test(sql)) sessions.set(args[0], { email: args[1], expires_at: args[3] }); if (/^DELETE FROM sessions WHERE token_hash/.test(sql)) sessions.delete(args[0]); return {}; },
  async first() { return /FROM sessions/.test(sql) ? sessions.get(args[0]) || null : null; } }; } };
const env = { ...cfg.vars, DB, ACCESS_TEAM_DOMAIN: 'x.cloudflareaccess.com', ACCESS_AUD: 'aud', ASSETS: { fetch: r => new Response('asset ' + new URL(r.url).pathname) } };
const HOST = 'https://' + cfg.routes[0].pattern;
const go = (path, init = {}) => worker.fetch(new Request(HOST + path, { redirect: 'manual', ...init }), env, { waitUntil() {} });
const login = (u, p, next = '/') => go('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username: u, password: p, next }).toString() });

let r = await go('/');
check('a signed-out visitor to the app is sent to the sign-in page', r.status === 303 && r.headers.get('Location') === '/login?next=%2F');
r = await go('/admin/');
check('and from Admin, with the way back kept', r.headers.get('Location') === '/login?next=%2Fadmin%2F');
check('the sign-in page itself is open', (await (await go('/login/')).text()) === 'asset /login/');
check('scripts, styles and fonts are open', (await (await go('/app.css')).text()) === 'asset /app.css');
r = await go('/api/me');
check('the API refuses without a sign-in', r.status === 401);

r = await login('trio_demo', 'wrong');
check('a wrong password goes back to the sign-in page with a message', r.status === 303 && r.headers.get('Location').startsWith('/login?failed=1') && !r.headers.get('Set-Cookie'));
r = await login('nobody', 'C4b£1Jh*12');
check('an unknown username is refused', r.headers.get('Location').startsWith('/login?failed=1'));

r = await login(' TRIO_DEMO ', 'C4b£1Jh*12', '/admin/');
const sc = r.headers.get('Set-Cookie') || '';
check('trio_demo with the YC password signs in (username not case-sensitive) and returns to where they were', r.status === 303 && r.headers.get('Location') === '/admin/');
check('the sign-in cookie covers every triodian.com app, is HttpOnly and Secure', /^tri_demo=/.test(sc) && /Domain=triodian\.com/.test(sc) && /HttpOnly/.test(sc) && /Secure/.test(sc));
const cookie = sc.split(';')[0];
r = await go('/', { headers: { Cookie: cookie } });
check('with it, the app opens', (await r.text()) === 'asset /');
const who = await whoIs(new Request(HOST + '/api/me', { headers: { Cookie: cookie } }), env);
check('the API sees the demo email, which DEMO_ADMINS makes an administrator', who.email === 'demo@triodian.com' && env.DEMO_ADMINS.split(',').includes('demo@triodian.com'));

const [body, sig] = cookie.split('=')[1].split('.');
const forged = Buffer.from(JSON.stringify({ e: 'damian.hickey@triodian.com', x: 9e9 })).toString('base64url') + '.' + sig;
check('a tampered cookie naming someone else is refused', !(await whoIs(new Request(HOST + '/', { headers: { Cookie: 'tri_demo=' + forged } }), env)).email);
check('a cookie signed with another key is refused', !(await whoIs(new Request(HOST + '/', { headers: { Cookie: cookie } }), { ...env, DEMO_SESSION_KEY: 'other' })).email);

for (const c of ['#', 'L', '3', '$', 'e', '€', ' ']) {
  r = await login('trio_demo', 'C4b' + c + '1Jh*12');
  check(`any character in place of the £ works: "${c}"`, r.headers.get('Location') === '/' && /^tri_demo=/.test(r.headers.get('Set-Cookie') || ''));
}
for (const [pw, why] of [['C4b1Jh*12', 'the £ left out'], ['C4b££1Jh*12', 'two characters there'], ['C4b£1Jh*13', 'another character wrong'], ['c4b£1Jh*12', 'a letter in the wrong case']]) {
  r = await login('trio_demo', pw);
  check('still refused with ' + why, r.headers.get('Location').startsWith('/login?failed=1'));
}
r = await login('trio_demo', 'C4b£1Jh*12', 'https://evil.example/');
check('the way back can only be a page on this site', r.headers.get('Location') === '/');

r = await go('/auth/logout', { headers: { Cookie: cookie } });
const out = r.headers.get('Set-Cookie') || '';
check('Sign out clears the cookie across triodian.com', r.headers.get('Location') === '/login?out=1' && /tri_demo=;.*Max-Age=0.*Domain=triodian\.com/.test(out));
r = await go('/auth/email');
check('email sign-in without Access proof goes back to the sign-in page', r.status === 303 && r.headers.get('Location') === '/login?email=0');
console.log(fails ? fails + ' failed' : 'all passed'); if (fails) process.exit(1);
