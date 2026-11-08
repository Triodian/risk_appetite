// The board directions in AI Risk Appetite (development plan task 3.5): the file is checked, a decision 1 ceiling above
// BD1 is beyond the direction, and only an administrator loads or removes the directions.
// Run: node tests/directions.test.mjs   (the screens and check K11 are in tests/e2e/specs/directions.spec.js)
import { readFileSync } from 'node:fs';
import { directionsError, beyondDirection, areaFor, readOn } from '../public/shared/directions.js';
import { checkSave } from '../lib/core/rbac.js';
import { handle } from '../lib/core/api.js';

let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
const F = JSON.parse(readFileSync(new URL('./e2e/fixtures/board-directions.json', import.meta.url), 'utf8'));

ok('the fixture is a directions file this app can use', directionsError(F) === '', directionsError(F));
ok('a file of another format is refused', /Not a board directions file/.test(directionsError({ format: 'x' })));
ok('a tier outside A1 to A6 is refused', /not A1 to A6/.test(directionsError({ ...F, directions: { ...F.directions, BD1: { areas: [{ name: 'Claims', maxTier: 'A9' }] } } })));
ok('areas match functions by name, ignoring case and punctuation', areaFor(F, 'claims').name === 'Claims' && areaFor(F, 'Legal & compliance') === null && areaFor(F, 'legal and compliance').name === 'Legal and compliance');
ok('a ceiling above the posture is beyond the direction', /A3 is above A2/.test(beyondDirection(F, 'Claims', 'A3')));
ok('a ceiling at the posture is within it', beyondDirection(F, 'Claims', 'A2') === '' && beyondDirection(F, 'Technology operations', 'A4') === '');
ok('a function with no matching area is not tested', beyondDirection(F, 'Something else', 'A6') === '');
ok('decision 1 is shown BD1, BD2 and BD3; decision 7 BD6', readOn(F, 'd1').map(x => x.id).join() === 'BD1,BD2,BD3' && readOn(F, 'd7').map(x => x.id).join() === 'BD6');

// saves
const admin = { id: 'ad', name: 'Admin', roles: [], isAdmin: true, active: true }, cro = { id: 'cr', name: 'Chris', roles: ['cro'], active: true };
const eng = (extra = {}) => ({ schema: 'triodian.raf.v1', engagement: { id: 'e1', insurer: 'Acme' }, people: [], decisions: { d1: { cells: {} } }, current: {}, measureOwners: {}, challenge: [], questionsForCounsel: [], calibration: { status: 'default', version: 0, issued: [] }, history: [], ...extra });
const withDirs = (o, file) => { const n = JSON.parse(JSON.stringify(o)); n.boardDirections = { source: 'file', loadedOn: '2026-11-08', file }; return n; };
ok('an administrator loads the directions', !checkSave(eng(), withDirs(eng(), F), admin, [admin, cro]).error);
ok('the CRO cannot', !!checkSave(eng(), withDirs(eng(), F), cro, [admin, cro]).error);
ok('a stored copy that is not a directions file is refused', checkSave(eng(), withDirs(eng(), { format: 'x' }), admin, [admin]).status === 400);

// the link
// A store stand-in: the signed-in admin, and nothing else this route reads.
const store = new Proxy({ getUserByEmail: async () => admin, listUsers: async () => [admin], countUsers: async () => 1 }, { get: (t, k) => (k in t ? t[k] : async () => null) });
const via = async (readDirections) => handle({ method: 'GET', path: '/api/directions-from-board', email: 'a@x.test', readDirections }, store).catch(e => ({ status: 'threw', body: { error: String(e) } }));
let r = await via(null);
ok('with no BOARD binding the route says so, with a code the page reads', r.status === 503 && r.body.code === 'not_linked', JSON.stringify(r));
r = await via(async () => F);
ok('with the binding it answers with the directions', r.status === 200 && r.body.version === F.version, JSON.stringify(r).slice(0, 160));
r = await via(async () => ({ status: 404, error: 'The chair has not recorded the board directions yet.' }));
ok('before the chair records them it passes on the 404', r.status === 404 && /chair/.test(r.body.error));

console.log(fails ? `\n${fails} failed` : '\nall passed'); process.exit(fails ? 1 : 0);
