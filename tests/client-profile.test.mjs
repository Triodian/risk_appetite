// The client deployment profile (development plan tasks 0.2 and 0.3): a client deployment shows no demo sign-in, no
// demo administrators and no demo band; the demo and test sites keep them. Run: node tests/client-profile.test.mjs
import { readFileSync } from 'node:fs';
import { demoFlags, handleAuth } from '../lib/identity/session.js';

let fails = 0; const t = (label, ok, extra) => { if (!ok) fails++; console.log((ok ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };

// wrangler.jsonc: drop whole-line comments and trailing commas, then read it as JSON
const raw = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const cfg = JSON.parse(raw.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/,(\s*[}\]])/g, '$1'));
const top = cfg.vars || {}, test = ((cfg.env || {}).test || {}).vars || {}, client = (cfg.env || {}).client;

t('there is a client profile', !!client && /-client$/.test(client.name), client && client.name);
const cv = (client && client.vars) || {};
t('client: the demo band and app switcher are off', cv.SUITE_DEMO === 'off');
t('client: no demo sign-in account', cv.DEMO_LOGIN === '');
t('client: no demo administrators', !cv.DEMO_ADMINS);
t('client: email is held until the client’s sender is set up', cv.NOTIFY_SENDING === 'off');
t('client: its own database, still to be created', client && client.d1_databases[0].database_id === 'REPLACE-WITH-THE-CLIENT-DATABASE-ID');
t('no demo session key is written in wrangler.jsonc (it is a Worker secret)', ![top, test, cv].some(v => 'DEMO_SESSION_KEY' in v) && !/"DEMO_SESSION_KEY"\s*:/.test(raw));
const f = demoFlags(cv);
t('client: the page is marked with no demo band', f.suiteDemo === false);
t('client: the page is marked with no demo sign-in', f.demoLogin === false);
t('client: no demo administrators come from its settings', String(cv.DEMO_ADMINS || '').split(',').map(e => e.trim()).filter(Boolean).length === 0);
t('demo site: the demo band and the demo sign-in are on', demoFlags(top).suiteDemo && demoFlags(top).demoLogin);
t('test site: the demo band and the demo sign-in are on', demoFlags(test).suiteDemo && demoFlags(test).demoLogin);
t('a deployment that sets nothing shows no demo band', demoFlags({}).suiteDemo === false);

// the demo username sign-in is refused on the client profile
const r = await handleAuth(new Request('https://client.example/auth/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'username=trio_demo&password=anything&next=%2F' }), { ...cv, DEMO_SESSION_KEY: 'k'.repeat(32) });
const loc = r && r.headers && r.headers.get('Location') || '';
t('client: the demo username sign-in is refused', !!r && /failed=1/.test(loc) && !/set-cookie/i.test([...r.headers.keys()].join()), r && (r.status + ' ' + loc));

console.log(fails ? `\n${fails} failed` : '\nAll passed');
process.exit(fails ? 1 : 0);
