// Writes a sector pack for each best-practice baseline in the Triodian Metamodel (reference-data/baseline-profiles.json)
// to content/packs/bp*.json (development plan task BP.4; docs/baselines.md in the Metamodel). A baseline holds in any
// jurisdiction, so its pack starts from the jurisdiction-neutral financial-institution wording of the MAS pack, names
// no regulator, and takes its functions from the baseline's areas. The jurisdiction's own obligations come from the
// matter brief. Run: node tools/build-baseline-packs.mjs ../triodian_metamodel && node tools/build-content.mjs
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
const mm = process.argv[2];
if (!mm) { console.error('Usage: node tools/build-baseline-packs.mjs <path to triodian_metamodel>'); process.exit(1); }
const at = p => new URL('../' + p, import.meta.url);
const profiles = JSON.parse(readFileSync(join(mm, 'reference-data/baseline-profiles.json'), 'utf8')).items;
const version = readFileSync(join(mm, 'VERSION'), 'utf8').trim();
const masFi = JSON.parse(readFileSync(at('content/packs/masFi.json'), 'utf8'));

// The nouns each baseline names. The regulator is never named: a baseline holds in any jurisdiction.
const N = (entity, an, customer, aCustomer, customers, harm, regulator) => ({
  entity, Entity: cap(entity), entities: plural(entity), Entities: cap(plural(entity)), anEntity: an, AnEntity: cap(an),
  customer, Customer: cap(customer), customers, Customers: cap(customers), aCustomer, ACustomer: cap(aCustomer),
  customerHarm: harm, regulator,
});
function cap(s) { return s[0].toUpperCase() + s.slice(1); }
function plural(s) { return /y$/.test(s) ? s.slice(0, -1) + 'ies' : s + 's'; }
const NOUNS = {
  'BP-BANKING': N('bank', 'a bank', 'customer', 'a customer', 'customers', 'A customer is wrongly declined, delayed, charged or paid, or blocked from their money.', 'the banking supervisor'),
  'BP-INSURANCE': N('insurer', 'an insurer', 'policyholder', 'a policyholder', 'policyholders', 'A policyholder is wrongly declined, delayed, charged or paid.', 'the insurance supervisor'),
  'BP-SECURITIES': N('firm', 'a firm', 'client', 'a client', 'clients', 'A client is given unsuitable advice, or an order or a payment goes wrong.', 'the securities regulator'),
  'BP-HEALTH': N('health care organisation', 'a health care organisation', 'patient', 'a patient', 'patients', 'A patient is wrongly denied, delayed or given unsafe care.', 'the health regulator'),
  'BP-PAYMENTS': N('payment provider', 'a payment provider', 'customer', 'a customer', 'customers', 'A customer’s payment is wrongly stopped, delayed or sent, or their account is closed in error.', 'the payments supervisor'),
  'BP-CI-GOVERNMENT': N('operator', 'an operator', 'customer', 'a customer', 'customers and the community', 'Customers or the community lose an essential service, or are put at risk.', 'the infrastructure regulator'),
  'BP-CI-CORPORATE': N('operator', 'an operator', 'customer', 'a customer', 'customers and the community', 'Customers or the community lose an essential service, or are put at risk.', 'the infrastructure regulator'),
  'BP-GOVERNMENT': N('agency', 'an agency', 'member of the public', 'a member of the public', 'members of the public', 'A person is wrongly refused, delayed or charged, or a decision about them cannot be explained.', 'the oversight body'),
};
// Words in the MAS pack that name Singapore's rules, made neutral.
const NEUTRAL = [
  [/under the MAS Guidelines on Outsourcing/g, 'under the outsourcing or third-party rules that apply to it'],
  [/as mapped under the MAS Guidelines on Individual Accountability and Conduct/g, 'as mapped under the accountability rules that apply to it'],
  [/critical business services register, with the recovery time objective for each/gi, m => (m[0] === 'C' ? 'Critical' : 'critical') + ' operations register, with the tolerance for each'],
  [/Register of material outsourcing arrangements/g, 'Register of material service providers and outsourcing arrangements'],
];
const neutral = s => NEUTRAL.reduce((t, [re, to]) => t.replace(re, to), s);
const deep = o => (typeof o === 'string' ? neutral(o) : Array.isArray(o) ? o.map(deep) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, deep(v)])) : o);
// Prompts the MAS pack writes for applications, claims and payments, made to fit any sector.
const OVERRIDE = {
  'decisions.0.prompts.1': "Would we accept a provider's AI making a decision about one of our {customers}, or a service they rely on, without a person reviewing it? If so, within what limit?",
  'decisions.1.prompts.1': 'Does a single wrong decision about one of our {customers} count as harm, or only a pattern of them?',
  'decisions.2.prompts.0': "For a provider's AI that makes decisions about our {customers} or our services, is a signed quarterly statement enough, or do we expect to be told whenever a limit is crossed?",
  'decisions.4.prompts.0': 'If our documents do not show whether a provider uses AI to make decisions, how long are we prepared not to know?',
  'decisions.5.prompts.1': 'If one AI provider failed or changed its terms, how many critical operations would be affected? That count is measure M10.',
};
const slug = (s, used) => { let b = s.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).filter(w => !['and', 'the', 'of'].includes(w)).map(w => w[0]).join('').slice(0, 3) || 'f'; let id = b, i = 2; while (used.has(id)) id = b + i++; used.add(id); return id; };

for (const f of readdirSync(at('content/packs')).filter(f => /^bp[A-Z].*\.json$/.test(f))) unlinkSync(at('content/packs/' + f));
const written = [];
for (const p of profiles) {
  const id = 'bp' + p.baselineProfileID.replace(/^BP-/, '').toLowerCase().split('-').map(cap).join('');
  const used = new Set(), functions = p.areas.map(name => ({ id: slug(name, used), name }));
  const areasList = p.areas.map(a => a[0].toLowerCase() + a.slice(1)).join('; ');
  const edits = deep(masFi.edits).map((e, i) => {
    if (i === 0) return { at: e.at, find: e.find, replace: areasList };
    if (i === 1) return { at: e.at, find: e.find, replace: p.areas.map(a => `| ${a} |  |  |  |`).join('\n') };
    if (/declining an application, a claim or a payment/.test(e.replace)) return { ...e, replace: "Would we accept a provider's AI making a decision about one of our {customers} with no person involved?" };
    return e;
  });
  // Two framework prompts the MAS pack leaves about claims, made to fit any sector.
  edits.push(
    { at: 'frameworkMarkdown', find: '- Does one wrongly declined claim count as {customer} harm, or does it take a pattern?', replace: '- Does one wrong decision about one of our {customers} count as harm, or does it take a pattern?' },
    { at: 'frameworkMarkdown', find: "- For a provider's AI that decides claims, is a signed statement each quarter enough, or do we expect to be told when a limit is crossed?", replace: "- For a provider's AI that makes decisions about our {customers}, is a signed statement each quarter enough, or do we expect to be told when a limit is crossed?" },
  );
  const pack = {
    id, name: `${p.name} (best-practice baseline)`, jurisdiction: 'any', entityTypes: [], baseline: p.baselineProfileID, governingBody: p.governingBody,
    note: `Generated from Triodian Metamodel ${version} (reference-data/baseline-profiles.json) by tools/build-baseline-packs.mjs; do not edit by hand. A best-practice baseline for ${p.description.toLowerCase()} that holds in any jurisdiction; it names no regulator, and the jurisdiction's own obligations come from the matter brief.`,
    nouns: NOUNS[p.baselineProfileID],
    replace: { functions, inputs: deep(masFi.replace.inputs) },
    override: Object.assign(deep(masFi.override), OVERRIDE),
    insert: deep(masFi.insert),
    edits,
  };
  if (!pack.nouns) throw new Error('No nouns for ' + p.baselineProfileID);
  writeFileSync(at(`content/packs/${id}.json`), JSON.stringify(pack, null, 2) + '\n');
  written.push(id);
}
console.log(`${written.length} baseline packs from Metamodel ${version}: ${written.join(', ')}`);
