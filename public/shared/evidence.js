// The evidence index (development plan task R.2; jurisdiction regimes added for the United States, US.6). Each output
// of the three engagement apps is tagged with the bullet of APRA's 30 April 2026 letter on AI it serves (B1 to A4), the
// CPS 230 paragraph where one applies (the numbering amended from 1 July 2026), and the ISO/IEC 42001:2023 clause or
// Annex A control it can stand as evidence for. AI Board Direction, in connected mode, gathers the artefacts from
// AI Risk Appetite and AI Use Assessment over the service bindings and lists them by the jurisdiction's regime or by
// ISO/IEC 42001 control, each showing its evidence or "none yet".
//
// Regimes (US.6). The letter's bullets are the suite's own vocabulary for what a supervisor expects of a board and its
// AI; the tags on the outputs are written in it. Another jurisdiction's regime (REGIMES) lists that jurisdiction's
// expectations per main sector, each naming the instrument and paragraph it comes from and the letter bullets it
// covers, so an output tagged to a bullet is evidence for the regime items that cover the bullet. The mapping, like the
// CPS 230 links, is Triodian's reading of each instrument, for counsel admitted in the jurisdiction to confirm.
// Plain functions, no page code: the same file is in all three apps, and the server and the tests run it in Node.
//
// The letter has no paragraph numbers, names no prudential standard and does not mention FAR, so the links to CPS 230
// and ISO/IEC 42001 are Triodian's reading. Counsel confirms the CPS 230 links before they go into a response to APRA.
// The ISO/IEC 42001 links are checked by the engagement's independent reviewer, or another person with ISO/IEC 42001
// competence (development plan task ISO.2): which control an output evidences is not a legal question.
//
// What the tags do not claim (ISO.2). No output is tagged to A.5 or clause 6.1.4: nothing the suite produces is an AI
// system impact assessment. AI Use Assessment's outputs are tagged to the supplier, operation, event-log and incident
// controls (A.10.3, A.6.2.6, A.6.2.8, A.8.4). The board's harm thresholds (B6) are listed as an input to A.5.2 only.
// Every Annex A control is listed in the ISO view, and one the suite does not evidence says so (ISO.5).

export const FORMAT = 'triodian.evidence.v1';
export const LETTER_NAME = 'APRA letter to industry on artificial intelligence, 30 April 2026';
export const NOTE = 'The letter has no paragraph numbers, names no prudential standard and does not mention FAR. The links to CPS 230 (amended numbering) are Triodian’s reading, for counsel to confirm. The links to ISO/IEC 42001:2023 are Triodian’s reading, for the engagement’s independent reviewer or another person with ISO/IEC 42001 competence to check.';
export const NOT_EVIDENCED = 'Not evidenced by this suite';

/** The letter's expectations, by section and bullet. cps: CPS 230 paragraphs, amended numbering. iso: clauses and Annex A controls. */
export const LETTER = [
  { id: 'B1', section: 'Board', text: 'Board AI literacy sufficient to set direction and challenge', cps: [], iso: ['5.1', '7.2'] },
  { id: 'B2', section: 'Board', text: 'AI strategy consistent with risk appetite and tolerances, with monitoring, including of third-party dependencies, and clearly defined triggers', cps: [], iso: ['6.1.2', '6.2', '9.1'] },
  { id: 'S1', section: 'Security and resilience', text: 'Reliance on AI assessed for resilience, with credible fallback where AI supports critical operations', cps: ['critical operations'], iso: ['6.1.3', 'A.6'] },
  { id: 'S2', section: 'Security and resilience', text: 'Security controls for AI threats, including controls over agentic and autonomous workflows', cps: [], iso: ['A.6', 'A.9'] },
  { id: 'S3', section: 'Security and resilience', text: 'Security testing of AI-generated code, components and libraries', cps: [], iso: ['A.6'] },
  { id: 'S4', section: 'Security and resilience', text: 'Third-party and concentration implications of common platforms and providers', cps: ['52(b)', '60(b)'], iso: ['A.10'] },
  { id: 'G1', section: 'Governance', text: 'AI policy, standards, guidance and reporting lines', cps: [], iso: ['5.2', 'A.2'] },
  { id: 'G2', section: 'Governance', text: 'Ownership and accountability across the lifecycle, design to decommissioning', cps: [], iso: ['5.3', 'A.3'] },
  { id: 'G3', section: 'Governance', text: 'An inventory of AI tooling and use cases', cps: [], iso: ['4.3', 'A.4'] },
  { id: 'G4', section: 'Governance', text: 'Human involvement for high-risk decisions', cps: [], iso: ['A.9'] },
  { id: 'G5', section: 'Governance', text: 'Staff training on AI use, misuse, limits and secure practice', cps: [], iso: ['7.2', '7.3'] },
  { id: 'P1', section: 'Providers', text: 'The full AI supply chain mapped, including material, third-party and fourth-party dependencies', cps: ['47(c)', '52(b)', '53(d)–(e)'], iso: ['A.10'] },
  { id: 'P2', section: 'Providers', text: 'Contracts giving transparency, auditability and assurance over AI services', cps: ['53', '53(b)', '54'], iso: ['A.10'] },
  { id: 'P3', section: 'Providers', text: 'Model behaviour, material changes, performance and outcomes understood across the lifecycle', cps: [], iso: ['A.6', '9.1'] },
  { id: 'P4', section: 'Providers', text: 'Concentration risk, failure scenarios, and credible substitution, portability or exit', cps: ['55(d)'], iso: ['A.10', '6.1.3'] },
  { id: 'A1', section: 'Assurance', text: 'Recognised control frameworks, control libraries and change control', cps: [], iso: ['6.1.3', '6.3'] },
  { id: 'A2', section: 'Assurance', text: 'Integrated assurance across cyber, data, model performance, resilience, privacy and conduct', cps: [], iso: ['9.1', 'A.7'] },
  { id: 'A3', section: 'Assurance', text: 'Second line and internal audit able to assess AI independently, including probabilistic and agentic systems', cps: [], iso: ['9.2'] },
  { id: 'A4', section: 'Assurance', text: 'Assessment before deployment and through the lifecycle; continuous, proportionate monitoring', cps: [], iso: ['6.1.4', 'A.5', '9.1'] },
];

/* ---------- Regimes outside Australia (US.6) ----------
   One regime per jurisdiction and main sector, keyed 'US:US-BANKING' and so on, with 'US' as the regime for any other
   US sector (NIST AI RMF, which the NAIC bulletin and the federal banking agencies both point to as a framework an
   organisation may adopt). Each item: id, section, text (the expectation in plain words), ref (the instrument and
   where in it), covers (the letter bullets whose evidence serves it), iso. Nothing here says an instrument applies to
   any organisation: the matter brief lists the records and counsel decides. Checked against the US scoping note of
   14 November 2026; re-check each quarter with it. */
const NIST = { id: 'US', short: 'NIST AI RMF', name: 'NIST AI Risk Management Framework 1.0 (NIST AI 100-1) and Generative AI Profile (NIST AI 600-1)', refLabel: 'NIST AI RMF',
  note: 'The NIST AI Risk Management Framework is voluntary. Supervisors in several US sectors name it as a framework an organisation may adopt; it binds no one. The links from the suite’s outputs to its functions are Triodian’s reading.',
  items: [
    { id: 'GV', section: 'Govern', text: 'Policies, accountability, culture, workforce competence and the inventory decisions that give the board and management oversight of AI risk', ref: 'NIST AI 100-1, Govern 1 to 6', covers: ['B1', 'B2', 'G1', 'G2', 'G5'], iso: ['5.1', '5.2', '5.3', '7.2'] },
    { id: 'MP', section: 'Map', text: 'Context, intended uses, the AI in use and the third-party components and dependencies, mapped so risk can be measured', ref: 'NIST AI 100-1, Map 1 to 5', covers: ['G3', 'P1', 'S4'], iso: ['4.3', 'A.4', 'A.10'] },
    { id: 'MS', section: 'Measure', text: 'Testing, evaluation, verification and validation, and monitoring, before deployment and through the lifecycle', ref: 'NIST AI 100-1, Measure 1 to 4', covers: ['A1', 'A2', 'A4', 'P3'], iso: ['6.1.3', '9.1', 'A.6'] },
    { id: 'MG', section: 'Manage', text: 'Risk treatment, human oversight of high-consequence decisions, incident response, resilience and third-party risk managed, contracts included', ref: 'NIST AI 100-1, Manage 1 to 4', covers: ['G4', 'S1', 'S2', 'P2', 'P4', 'A3'], iso: ['6.1.3', 'A.9', 'A.10'] },
  ] };
export const REGIMES = {
  'US': NIST,
  'US:US-BANKING': { id: 'US:US-BANKING', short: 'US banking', refLabel: 'Instrument', name: 'SR 26-2 / OCC Bulletin 2026-13 (model risk management, 17 April 2026) and the Interagency Guidance on Third-Party Relationships (June 2023)',
    note: 'SR 26-2 says it is not enforceable and that generative and agentic AI are outside its scope; the 2023 third-party guidance remains in effect until the September 2026 proposal replaces it. State law (NYDFS 23 NYCRR 500 in New York) is not mapped here. The links are Triodian’s reading, for counsel to confirm.',
    items: [
      { id: 'MR1', section: 'Model risk management', text: 'An inventory of models in use, including vendor models and AI-based models, with owners', ref: 'SR 26-2 / OCC 2026-13, model inventory', covers: ['G3'], iso: ['4.3', 'A.4.2'] },
      { id: 'MR2', section: 'Model risk management', text: 'Validation and ongoing monitoring of models in proportion to their risk, vendor models included', ref: 'SR 26-2 / OCC 2026-13, model validation and ongoing monitoring', covers: ['A4', 'P3', 'A1'], iso: ['A.6.2.4', 'A.6.2.6', '9.1'] },
      { id: 'MR3', section: 'Model risk management', text: 'Board and senior management oversight of model risk: policies, roles, reporting of material model risk', ref: 'SR 26-2 / OCC 2026-13, governance, policies and controls', covers: ['B2', 'G1', 'G2'], iso: ['5.1', '5.2', '5.3'] },
      { id: 'MR4', section: 'Model risk management', text: 'Generative and agentic AI, outside SR 26-2, governed under the bank’s own framework: human involvement, controls over autonomous workflows', ref: 'SR 26-2 / OCC 2026-13, scope statement; the bank’s own AI framework', covers: ['G4', 'S2'], iso: ['A.9', 'A.6'] },
      { id: 'MR5', section: 'Model risk management', text: 'Board understanding of model and third-party risk, and staff with the competence and training to run both frameworks', ref: 'SR 26-2 / OCC 2026-13, roles and resources; Interagency Guidance 2023, governance: staffing and training', covers: ['B1', 'G5'], iso: ['7.2', '7.3'] },
      { id: 'TP1', section: 'Third-party relationships', text: 'Planning and due diligence before a third-party relationship, including AI providers and the platforms behind them', ref: 'Interagency Guidance 2023, planning; due diligence and third-party selection', covers: ['P1', 'S4'], iso: ['A.10.3'] },
      { id: 'TP2', section: 'Third-party relationships', text: 'Contracts that give performance measures, information and audit rights, subcontracting terms and notice of incidents', ref: 'Interagency Guidance 2023, contract negotiation', covers: ['P2'], iso: ['A.10.3'] },
      { id: 'TP3', section: 'Third-party relationships', text: 'Ongoing monitoring of the relationship and the model behind it; termination and exit', ref: 'Interagency Guidance 2023, ongoing monitoring; termination', covers: ['P3', 'P4'], iso: ['A.10.3', '6.1.3'] },
      { id: 'TP4', section: 'Third-party relationships', text: 'Board oversight of third-party risk management and independent review of it', ref: 'Interagency Guidance 2023, governance: board oversight, independent reviews, documentation and reporting', covers: ['B2', 'A2', 'A3'], iso: ['5.1', '9.2'] },
    ] },
  'US:US-INSURANCE': { id: 'US:US-INSURANCE', short: 'US insurance', refLabel: 'Instrument', name: 'NAIC Model Bulletin on the Use of Artificial Intelligence Systems by Insurers (December 2023), as adopted by the states',
    note: 'The bulletin binds in a state only where that state has adopted it; adoption is recorded as a setting of the engagement. New York’s Insurance Circular Letter No. 7 (2024) and Colorado’s regulations are not mapped here. The links are Triodian’s reading, for counsel to confirm.',
    items: [
      { id: 'AI1', section: 'AIS program', text: 'A written AI systems program, proportionate to the insurer’s use of AI, with an accountable owner', ref: 'NAIC Model Bulletin, section 3, AIS Program', covers: ['G1', 'B2'], iso: ['5.2', 'A.2.2', '6.2'] },
      { id: 'AI2', section: 'Governance', text: 'Governance: board or senior management oversight, policies, roles and reporting lines for AI', ref: 'NAIC Model Bulletin, section 3.1, governance', covers: ['B1', 'G2'], iso: ['5.1', '5.3', 'A.3.2'] },
      { id: 'AI3', section: 'Risk management and internal controls', text: 'An inventory of AI systems, risk assessment, testing for unfair discrimination, and human review where decisions affect consumers', ref: 'NAIC Model Bulletin, section 3.2, risk management and internal controls', covers: ['G3', 'A1', 'A2', 'G4'], iso: ['A.4.2', '6.1.2', '6.1.3', 'A.9'] },
      { id: 'AI4', section: 'Third-party AI', text: 'Due diligence on third-party AI systems and data, contract terms, and oversight of the vendors behind them', ref: 'NAIC Model Bulletin, section 4, third-party AI systems and data', covers: ['P1', 'P2', 'S4'], iso: ['A.10.3'] },
      { id: 'AI5', section: 'Documentation and examination', text: 'Documentation of the program and its controls, available to the regulator on request or in a market conduct examination', ref: 'NAIC Model Bulletin, section 5, regulatory oversight and examination', covers: ['A2', 'A3'], iso: ['9.2', 'A.8.3'] },
      { id: 'AI6', section: 'Lifecycle', text: 'Monitoring and validation of AI systems across their lifecycle, including after deployment', ref: 'NAIC Model Bulletin, section 3.2, lifecycle controls', covers: ['A4', 'P3'], iso: ['A.6.2.6', '9.1'] },
    ] },
  'US:US-SECURITIES': { id: 'US:US-SECURITIES', short: 'US securities', refLabel: 'Instrument', name: 'FINRA Rule 3110 (supervision) with the 2026 Regulatory Oversight Report on generative AI and AI agents, and Regulation S-P as amended in 2024',
    note: 'Rule 3110 binds member firms; the oversight report states FINRA’s expectations and is not a rule. Reg S-P’s compliance dates were 3 December 2025 for larger entities and 3 June 2026 for smaller. State securities regulators are not mapped here. The links are Triodian’s reading, for counsel to confirm.',
    items: [
      { id: 'SV1', section: 'Supervision', text: 'Written supervisory procedures that cover generative AI and AI agents: their scope, autonomy, data and auditability', ref: 'FINRA Rule 3110(b); 2026 Regulatory Oversight Report, GenAI and AI agents', covers: ['G1', 'G4', 'S2'], iso: ['A.2.2', 'A.9.2', 'A.6'] },
      { id: 'SV2', section: 'Supervision', text: 'An inventory of the AI tools in use and the data they reach, kept current', ref: '2026 Regulatory Oversight Report, GenAI and AI agents', covers: ['G3'], iso: ['4.3', 'A.4.2'] },
      { id: 'SV3', section: 'Supervision', text: 'Testing and monitoring of AI tools before and after deployment, including outputs that reach customers', ref: 'FINRA Rule 3110(c); 2026 Regulatory Oversight Report', covers: ['A4', 'P3', 'A1'], iso: ['A.6.2.4', 'A.6.2.6', '9.1'] },
      { id: 'SV4', section: 'Supervision', text: 'Training of associated persons on the permitted use of AI tools', ref: 'FINRA Rule 3110(a); Rule 1240 continuing education', covers: ['G5'], iso: ['7.2', '7.3'] },
      { id: 'SP1', section: 'Safeguarding (Reg S-P)', text: 'An incident response program for unauthorised access to customer information, with customer notification', ref: 'Regulation S-P, Rule 248.30(a) as amended 2024', covers: ['S2', 'A2'], iso: ['A.8.4', 'A.6'] },
      { id: 'SP2', section: 'Safeguarding (Reg S-P)', text: 'Oversight of service providers, including AI providers, with 72-hour notice of a breach written into the arrangement', ref: 'Regulation S-P, Rule 248.30(a)(5) service provider oversight', covers: ['P1', 'P2'], iso: ['A.10.3'] },
      { id: 'SV5', section: 'Supervision', text: 'Designated principals and senior management responsible for AI supervision; the CEO’s annual certification of supervisory controls; reporting to the board', ref: 'FINRA Rule 3110(a)(2); Rule 3120; Rule 3130', covers: ['B1', 'B2', 'G2', 'A3'], iso: ['5.1', '5.3', '9.2', '9.3'] },
    ] },
  'US:US-HEALTH': { id: 'US:US-HEALTH', short: 'US health care', refLabel: 'Instrument', name: '45 CFR 92.210 (Section 1557, patient care decision support tools), the HIPAA Privacy and Security Rules, and the HTI-5 final rule (October 2026)',
    note: '92.210 binds covered entities from May 2025. HTI-5 removes the model-card and risk-management criteria for certified health IT from 28 December 2026, so vendor information that certification no longer obliges is asked for by contract. FDA device rules and state medical-board rules are not mapped here. The links are Triodian’s reading, for counsel to confirm.',
    items: [
      { id: 'HC1', section: 'Nondiscrimination', text: 'The patient care decision support tools in use identified, with those that use protected characteristics as input variables', ref: '45 CFR 92.210(b)', covers: ['G3'], iso: ['4.3', 'A.4.2'] },
      { id: 'HC2', section: 'Nondiscrimination', text: 'Reasonable efforts to mitigate the risk of discrimination from those tools, with a person able to review their output', ref: '45 CFR 92.210(c)', covers: ['G4', 'A2', 'A4'], iso: ['A.9', 'A.5.4', '9.1'] },
      { id: 'HC3', section: 'Privacy and security', text: 'Business associate agreements and safeguards for AI providers that handle electronic protected health information', ref: 'HIPAA Privacy Rule 45 CFR 164.502(e), 164.504(e); Security Rule 164.308(b)', covers: ['P1', 'P2'], iso: ['A.10.3'] },
      { id: 'HC4', section: 'Privacy and security', text: 'A security risk analysis that covers AI tools and their access to ePHI', ref: 'HIPAA Security Rule 45 CFR 164.308(a)(1)', covers: ['S2', 'A1'], iso: ['6.1.2', 'A.6'] },
      { id: 'HC5', section: 'Vendor information', text: 'Model information and change notice obtained from vendors by contract, since HTI-5 no longer obliges certified health IT to supply it', ref: 'HTI-5 final rule (28 October 2026), in force 28 December 2026; the vendor agreement', covers: ['P2', 'P3'], iso: ['A.10.3', 'A.8.2'] },
      { id: 'HC6', section: 'Oversight', text: 'Governance of clinical AI: accountable owners, policy and board or executive oversight', ref: 'HHS-OIG General Compliance Program Guidance (November 2023), board oversight; no single federal instrument', covers: ['B1', 'B2', 'G1', 'G2'], iso: ['5.1', '5.2', '5.3'] },
      { id: 'HC7', section: 'Oversight', text: 'Workforce training on AI tools that touch ePHI or patient care decisions, and independent review of the compliance program', ref: 'HIPAA Security Rule 45 CFR 164.308(a)(5); HHS-OIG General Compliance Program Guidance, auditing and monitoring', covers: ['G5', 'A3'], iso: ['7.2', '7.3', '9.2'] },
    ] },
  'US:US-CRITICAL-INFRASTRUCTURE': { id: 'US:US-CRITICAL-INFRASTRUCTURE', short: 'US critical infrastructure', refLabel: 'Instrument', name: 'NERC CIP reliability standards (bulk electric system), TSA security directives, the CIRCIA reporting rule (pending) and CISA and NIST guidance on AI in operational technology',
    note: 'NERC CIP binds registered entities of the bulk electric system; TSA directives bind the pipeline and rail operators they name; CIRCIA’s final rule was sent for review in October 2026 and its 72-hour and 24-hour reports apply once in force. Other sectors’ risk management agencies are not mapped here. The links are Triodian’s reading, for counsel to confirm.',
    items: [
      { id: 'CI1', section: 'Supply chain', text: 'A supply chain cyber security risk management plan that reaches AI vendors and the software they supply into CIP environments', ref: 'NERC CIP-013-2 R1, R2', covers: ['P1', 'P2', 'S4'], iso: ['A.10.3'] },
      { id: 'CI2', section: 'Change and access', text: 'Change management, configuration monitoring and access control for AI tools inside regulated OT environments', ref: 'NERC CIP-010-4; CIP-005-7; CIP-007-6', covers: ['A1', 'S2', 'G4'], iso: ['6.3', 'A.6', 'A.9'] },
      { id: 'CI3', section: 'Inventory', text: 'AI tools inside regulated environments authorised and inventoried, with owners', ref: 'NERC CIP-002-5.1a; TSA security directives, cybersecurity implementation plan', covers: ['G3', 'G2'], iso: ['4.3', 'A.4.2', '5.3'] },
      { id: 'CI4', section: 'Resilience', text: 'Reliance on AI assessed for operations the system depends on, with fallback and recovery', ref: 'NERC CIP-009-6; TSA security directives, assessment and resilience', covers: ['S1', 'P4'], iso: ['6.1.3', 'A.6'] },
      { id: 'CI5', section: 'Incident reporting', text: 'Readiness to report a covered cyber incident within 72 hours and a ransom payment within 24 hours', ref: 'CIRCIA, 6 USC 681b; final rule pending', covers: ['S2', 'A2'], iso: ['A.8.4'] },
      { id: 'CI6', section: 'Oversight', text: 'Board or executive oversight of AI in operational technology, with CISA and NIST guidance adopted as the control framework', ref: 'CISA and NIST AI and OT security guidance; NIST AI RMF', covers: ['B1', 'B2', 'G1', 'A3'], iso: ['5.1', '5.2', '9.2'] },
      { id: 'CI7', section: 'People', text: 'Cyber security training and awareness for personnel with access to regulated environments, AI tools included', ref: 'NERC CIP-004-7 R2', covers: ['G5'], iso: ['7.2', '7.3'] },
    ] },
};
/** The Australian regime, in the same shape: the letter's bullets, each covering itself. */
const AU_REGIME = { id: 'AU', short: 'APRA letter', name: LETTER_NAME, refLabel: 'CPS 230', note: NOTE, items: LETTER.map(b => ({ ...b, ref: b.cps.length ? 'CPS 230 ' + b.cps.join(', ') : '', covers: [b.id] })) };
const PACK_SECTOR = { usBanking: 'US-BANKING', usInsurance: 'US-INSURANCE', usSecurities: 'US-SECURITIES', usHealth: 'US-HEALTH', usCriticalInfrastructure: 'US-CRITICAL-INFRASTRUCTURE' };
/** The regime for an engagement: its jurisdiction and sector (a sector id such as US-BANKING, or a pack id such as
 *  usBanking). Australia (or no jurisdiction) is the letter; a US sector with its own regime gets it, any other US
 *  sector NIST AI RMF; a jurisdiction with no regime yet gets null, and the index is by ISO/IEC 42001 alone. */
export function regimeFor(jurisdiction, sector) {
  const j = jurisdiction || 'AU';
  if (j === 'AU') return AU_REGIME;
  const sec = PACK_SECTOR[sector] || sector || '';
  return REGIMES[`${j}:${sec}`] || REGIMES[j] || null;
}
/** The regime items an artefact (its letter tags) is evidence for. */
export const regimeItemsFor = (regime, a) => regime ? regime.items.filter(i => i.covers.some(c => (a.letter || []).includes(c))) : [];

/** The ISO/IEC 42001:2023 clauses the tags use, in the standard's order. */
export const CLAUSES = [
  ['4.3', 'Scope of the AI management system'], ['5.1', 'Leadership and commitment'], ['5.2', 'AI policy'], ['5.3', 'Roles, responsibilities and authorities'],
  ['6.1.2', 'AI risk assessment'], ['6.1.3', 'AI risk treatment'], ['6.1.4', 'AI system impact assessment'], ['6.2', 'AI objectives'], ['6.3', 'Planning of changes'],
  ['7.2', 'Competence'], ['7.3', 'Awareness'], ['9.1', 'Monitoring, measurement, analysis and evaluation'], ['9.2', 'Internal audit'], ['9.3', 'Management review'], ['10.2', 'Nonconformity and corrective action'],
];
/** The control objectives of Annex A, for the letter's bullets, which are mapped at this level. */
export const OBJECTIVES = [
  ['A.2', 'Policies related to AI'], ['A.3', 'Internal organization'], ['A.4', 'Resources for AI systems'], ['A.5', 'Assessing impacts of AI systems'], ['A.6', 'AI system life cycle'],
  ['A.7', 'Data for AI systems'], ['A.8', 'Information for interested parties of AI systems'], ['A.9', 'Use of AI systems'], ['A.10', 'Third-party and customer relationships'],
];
/** Every control in Annex A of ISO/IEC 42001:2023 (38), by number and short title. A Statement of Applicability lists these. */
export const ANNEX_A = [
  ['A.2.2', 'AI policy'], ['A.2.3', 'Alignment with other organizational policies'], ['A.2.4', 'Review of the AI policy'],
  ['A.3.2', 'AI roles and responsibilities'], ['A.3.3', 'Reporting of concerns'],
  ['A.4.2', 'Resource documentation'], ['A.4.3', 'Data resources'], ['A.4.4', 'Tooling resources'], ['A.4.5', 'System and computing resources'], ['A.4.6', 'Human resources'],
  ['A.5.2', 'AI system impact assessment process'], ['A.5.3', 'Documentation of AI system impact assessments'], ['A.5.4', 'Assessing AI system impact on individuals or groups of individuals'], ['A.5.5', 'Assessing societal impacts of AI systems'],
  ['A.6.1.2', 'Objectives for responsible development of AI system'], ['A.6.1.3', 'Processes for responsible AI system design and development'],
  ['A.6.2.2', 'AI system requirements and specification'], ['A.6.2.3', 'Documentation of AI system design and development'], ['A.6.2.4', 'AI system verification and validation'], ['A.6.2.5', 'AI system deployment'],
  ['A.6.2.6', 'AI system operation and monitoring'], ['A.6.2.7', 'AI system technical documentation'], ['A.6.2.8', 'AI system recording of event logs'],
  ['A.7.2', 'Data for development and enhancement of AI system'], ['A.7.3', 'Acquisition of data'], ['A.7.4', 'Quality of data for AI systems'], ['A.7.5', 'Data provenance'], ['A.7.6', 'Data preparation'],
  ['A.8.2', 'System documentation and information for users'], ['A.8.3', 'External reporting'], ['A.8.4', 'Communication of incidents'], ['A.8.5', 'Information for interested parties'],
  ['A.9.2', 'Processes for responsible use of AI systems'], ['A.9.3', 'Objectives for responsible use of AI system'], ['A.9.4', 'Intended use of the AI system'],
  ['A.10.2', 'Allocating responsibilities'], ['A.10.3', 'Suppliers'], ['A.10.4', 'Customers'],
];
/** The clauses, then every Annex A control: the rows of the ISO view. */
export const ISO = CLAUSES.concat(ANNEX_A);
/** True when a reference at the level of an objective (A.6) or a control (A.6.2.6) covers this clause or control. */
export const covers = (ref, id) => ref === id || String(id).startsWith(ref + '.');
const isoOrder = id => { const i = ISO.findIndex(x => x[0] === id); return i < 0 ? 999 : i; };
export const isoName = id => (ISO.concat(OBJECTIVES).find(x => x[0] === id) || [id, ''])[1];

/** Each output's tags: letter bullets, CPS 230 paragraphs and ISO/IEC 42001:2023 clauses or Annex A controls.
 *  inputTo: controls the output is an input to without being evidence that the control is met. */
export const TAGS = {
  RA: {
    pack: { letter: ['B2', 'G1'], cps: [], iso: ['6.2', '5.2'] },
    paper: { letter: ['B1', 'B2'], cps: [], iso: ['5.1', '6.2'] },
    statement: { letter: ['B2', 'G1'], cps: [], iso: ['6.2', 'A.2.2'] },
    schedule: { letter: ['B2', 'A4'], cps: [], iso: ['6.2', '9.1'] },
    session: { letter: ['B1'], cps: [], iso: ['7.2'] },
    calibration: { letter: ['B2', 'G4', 'A4'], cps: [], iso: ['6.1.2'] },
    checks: { letter: ['A1'], cps: [], iso: ['6.1.3'] },
    plan: { letter: ['G2'], cps: [], iso: ['5.3'] },
    inUse: { letter: ['B2', 'A4'], cps: [], iso: ['9.1'] },
    limits: { letter: ['A1', 'B2'], cps: [], iso: ['6.1.3', '6.2'] },
    mgmtReview: { letter: ['B2', 'A4'], cps: [], iso: ['9.3'] },
  },
  UA: {
    DL1: { letter: ['G3', 'P1', 'S4'], cps: ['47(c)', '52(b)'], iso: ['A.10.3'] },
    DL2: { letter: ['P2', 'P3', 'A4'], cps: ['53', '54'], iso: ['A.10.3', 'A.6.2.6', 'A.6.2.8', 'A.8.4', '9.1'] },
    DL3: { letter: ['A1'], cps: [], iso: ['6.1.3'] },
    DL4: { letter: ['B2', 'A4'], cps: [], iso: ['6.2', '9.1', 'A.6.2.6', 'A.8.4'] },
    DL5: { letter: ['P2', 'A1'], cps: ['53'], iso: ['A.10.3', '6.1.3'] },
    DL6: { letter: ['G3'], cps: [], iso: ['A.4.2'] },
    QS: { letter: ['P2'], cps: ['53'], iso: ['A.10.3'] },
    RP: { letter: ['A3'], cps: [], iso: [] },
    CM: { letter: ['A4', 'B2'], cps: [], iso: ['9.1'] },
    DR: { letter: ['A1'], cps: [], iso: ['6.3'] },
    EP: { letter: ['G2'], cps: [], iso: ['5.3'] },
    FN: { letter: ['P2', 'P4', 'S4'], cps: ['53', '55(d)'], iso: ['A.10.3'] },
    NC: { letter: ['A1'], cps: [], iso: ['10.2'] },
  },
  BD: {
    inventory: { letter: ['G3'], cps: [], iso: ['4.3', 'A.4.2'] },
    statement: { letter: ['B2', 'G1'], cps: [], iso: ['5.2', 'A.2.2', '6.2', 'A.3.2', 'A.9.3'], inputTo: ['A.5.2'] },
    directions: { letter: ['B2', 'G1', 'G4'], cps: [], iso: ['5.2', 'A.2.2', '6.2', 'A.3.2', 'A.9.3'], inputTo: ['A.5.2'] },
    aupOutline: { letter: ['G1', 'G5'], cps: [], iso: ['A.2.2', 'A.9.2', 'A.3.3'] },
    minute: { letter: ['B2', 'G2'], cps: [], iso: ['5.1', '9.3'] },
    actionList: { letter: ['G2'], cps: [], iso: ['6.2'] },
    worklist: { letter: ['G4'], cps: [], iso: ['A.9.2'] },
    plan: { letter: ['G2'], cps: [], iso: ['5.3'] },
    education: { letter: ['B1', 'G5'], cps: [], iso: ['7.2'] },
    confidentiality: { letter: ['A2'], cps: [], iso: ['A.9.2'] },
    boardViews: { letter: ['B2'], cps: [], iso: ['9.1', '9.3'] },
    evidence: { letter: ['A2'], cps: [], iso: ['9.3'] },
  },
};
/** What an input is, in words, for the ISO view. */
export const INPUT_NOTE = { 'A.5.2': 'Input only: the board’s harm thresholds (B6) say what harm the board will not tolerate. They are not an AI system impact assessment (ISO/IEC 42005:2025).' };
export const APPS = { RA: 'AI Risk Appetite', UA: 'AI Use Assessment', BD: 'AI Board Direction' };

/** The tags of one output, or null. */
export const tagsFor = (app, id) => (TAGS[app] || {})[id] || null;
/** One line for the screen: "APRA letter G3, P1 · CPS 230 47(c) · ISO/IEC 42001 6.1.4, A.5". Empty when untagged. */
/** The tag line printed on an output. The APRA letter and CPS 230 apply only to Australian engagements: give the
 *  engagement's jurisdiction (its pack's, such as 'US') and its sector or pack id, and the line carries that
 *  jurisdiction's regime items (US.6) with ISO/IEC 42001; a jurisdiction with no regime yet carries ISO/IEC 42001
 *  alone. With no jurisdiction (the Australian packs, before packs carried one) the line is as it was. */
export function tagLine(app, id, jurisdiction, sector) {
  const t = tagsFor(app, id); if (!t) return '';
  const au = !jurisdiction || jurisdiction === 'AU', R = au ? null : regimeFor(jurisdiction, sector);
  const items = R ? regimeItemsFor(R, t).map(i => i.id) : [];
  return [au ? 'APRA letter ' + t.letter.join(', ') : '', au && t.cps.length ? 'CPS 230 ' + t.cps.join(', ') : '', R && items.length ? R.short + ' ' + items.join(', ') : '', t.iso.length ? 'ISO/IEC 42001 ' + t.iso.join(', ') : ''].filter(Boolean).join(' · ');
}

/** ", minute 2026/12-04", or the reference as written when it already says what it is ("Board minute 2026/12-04"). */
const minuteText = ref => (!ref ? '' : /\bminute\b/i.test(ref) ? ', ' + ref : ', minute ' + ref);
const ymd = s => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
const art = (app, id, name, status, asOf, note) => ({ app, id, name, status, asOf: ymd(asOf), note: note || '', ...tagsFor(app, id) });

/** In Lite scope (task R.3) the assessment covers only the arrangements behind critical operations, so its artefacts
 *  say so: the same rule as the app, an arrangement is in scope when one of its entries names a critical operation in
 *  field 5. Empty in full scope. */
function liteNote(d) {
  if (((d.engagement || {}).scope) !== 'lite') return '';
  const f5 = e => { const f = (e.fields || {})[5]; return f && !f.notKnown ? String(f.value || '') : ''; };
  const opOf = e => { const v = f5(e), m = v.match(/critical operation:\s*(.+)$/i), op = m ? m[1] : (v.includes('·') ? v.split('·').pop() : ''); return /^\s*(none)?\s*$/i.test(op) ? '' : op.trim(); };
  const arrs = d.arrangements || [], inIds = new Set((d.entries || []).filter(opOf).map(e => e.arrangementId)), n = arrs.filter(a => inIds.has(a.id)).length, left = arrs.length - n;
  return `Lite scope: ${n} of ${arrs.length} arrangement${arrs.length === 1 ? '' : 's'}, those behind critical operations${left ? `; ${left} left out for later triage` : ''}`;
}

/** AI Use Assessment's artefacts, from the stored assessment. status: recorded (signed off), draft or none. */
export function assessmentArtefacts(d, updatedAt) {
  d = d || {};
  // R7 was labelled "Independent check" before task ISO.6; a version signed off under either label counts.
  const alias = l => String(l || '').replace('Independent check complete (R7)', 'Independent review complete (R7)');
  const ents = d.entries || [], vs = d.versions || [], v = label => vs.filter(x => x && alias(x.label) === label).pop();
  const by = (label, has) => { const x = v(label); return x ? ['recorded', x.at, 'Signed off: ' + label] : has ? ['draft', updatedAt, 'Not yet signed off: ' + label] : ['none', null, '']; };
  const q = d.questions || [], f = d.feedback;
  const rows = [
    ['DL1', 'AI dependency register', by('Counsel review recorded (R6)', ents.length)],
    ['DL2', 'Evidence obtainable at each boundary', by('Independent review complete (R7)', ents.length)],
    ['DL3', 'Control-library shape for the entity’s own AI boundary', by('Independent review complete (R7)', ents.some(e => ((e.fields || {})[3] || {}).value === 'B3'))],
    ['DL4', 'Technical schedule, tolerance and trigger design', by('Independent review complete (R7)', ents.length)],
    ['DL5', 'Technical annex', by('Technical annex signed', ents.length)],
    ['DL6', 'Hand-back list', by('Hand-back list accepted', ents.length)],
    ['QS', 'Question set to counsel', q.length ? (q.every(x => x.status === 'answered') ? ['recorded', q.map(x => x.respondedOn).filter(Boolean).sort().pop() || updatedAt, `${q.length} question${q.length === 1 ? '' : 's'}, all answered`] : ['draft', updatedAt, `${q.filter(x => x.status !== 'answered').length} of ${q.length} open`]) : ['none', null, '']],
    ['RP', 'Review pack for the independent reviewer', by('Independent review complete (R7)', ents.length)],
    ['CM', 'Closing measures', by('Independent review complete (R7)', ents.length)],
    ['DR', 'Difference report', (d.diffReports || []).length ? ['recorded', (d.diffReports[d.diffReports.length - 1] || {}).at, `${d.diffReports.length} recalculation${d.diffReports.length === 1 ? '' : 's'}`] : ['none', null, '']],
    ['EP', 'Engagement plan', by('Set agreed (R1)', !!d.engagement)],
    ['NC', 'Nonconformity and corrective action register', by('Independent review complete (R7)', (d.exceptions || []).length + (d.arrangements || []).filter(x => x && x.corrective && (x.corrective.rootCause || x.corrective.action)).length)],
    ['FN', 'Findings F1 to F4, as issued in the in-use feed', f ? ['recorded', f.generated || f.on, 'Issued to AI Risk Appetite'] : ['none', null, '']],
  ];
  const lite = liteNote(d), scoped = id => lite && id !== 'EP'; // the engagement plan covers the engagement, not the register
  return rows.map(([id, name, [s, at, note]]) => art('UA', id, name, s, at, scoped(id) && s !== 'none' ? [note, lite].filter(Boolean).join(' · ') : note));
}

/** AI Risk Appetite's artefacts, from the stored engagement. The outputs share the calibration set's approval. */
export function appetiteArtefacts(d, updatedAt) {
  d = d || {};
  const c = d.calibration || {}, approved = c.status === 'approved', started = approved || c.status === 'working' || c.status === 'agreed' || !!c.agreedOn || (c.version || 0) > 0;
  const withCal = has => approved ? ['recorded', c.approvedOn, 'Approved by the board' + minuteText(c.minuteRef)] : (has || started) ? ['draft', c.agreedOn || updatedAt, c.agreedOn ? 'Agreed by the CRO; not yet approved by the board' : 'Not yet approved by the board'] : ['none', null, ''];
  const L = (d.aims || {}).limits, lim = Array.isArray(L) ? L : (L && Array.isArray(L.rows) ? L.rows : []), inUse = d.inUse;   // the app keeps { rows, file, loadedOn }
  const rows = [
    ['pack', 'Board pack', withCal()], ['paper', 'Board paper (plain words)', withCal()], ['statement', 'AI risk appetite statement', withCal()],
    ['schedule', 'Tolerance and trigger schedule', withCal()], ['calibration', 'Calibration set', withCal()],
    ['session', 'Session record', (d.challenge || []).length ? ['recorded', updatedAt, `${d.challenge.length} challenge${d.challenge.length === 1 ? '' : 's'} recorded`] : started ? ['draft', updatedAt, ''] : ['none', null, '']],
    ['checks', 'Check report (K1 to K11)', withCal(true)], ['plan', 'Engagement plan', withCal(true)],
    ['inUse', 'In-use measures against the appetite (decision 8)', inUse ? ['recorded', inUse.on || inUse.generated, 'From the AI Use Assessment in-use feed'] : ['none', null, '']],
    ['mgmtReview', 'Input to the AI management review (ISO/IEC 42001:2023, 9.3)', approved && inUse ? ['recorded', inUse.on || inUse.generated, 'From the approved appetite, the board’s directions and the in-use feed'] : started ? ['draft', updatedAt, approved ? 'No in-use feed loaded yet' : 'Not yet approved by the board'] : ['none', null, '']],
    ['limits', 'The client’s AI limits tested against the appetite (K11)', lim.length ? [approved ? 'recorded' : 'draft', approved ? c.approvedOn : updatedAt, `${lim.length} limit${lim.length === 1 ? '' : 's'} from the limits register (a Triodian input, separate from the Statement of Applicability)`] : ['none', null, '']],
  ];
  return rows.map(([id, name, [s, at, note]]) => art('RA', id, name, s, at, note));
}

/** AI Board Direction's own artefacts, from the engagement as it stands. */
export function boardArtefacts(d) {
  d = d || {};
  const e = d.engagement || {}, mode = e.mode || 'standalone', res = d.resolution || {}, resolved = !!res.by, dir = d.directions || {}, inv = d.inventory || [];
  const draftOr = (has, at) => resolved ? ['recorded', res.on, 'Resolved by the board' + minuteText(res.minuteRef)] : has ? ['draft', at || null, 'Draft until the board resolves'] : ['none', null, ''];
  const edu = Object.values(d.education || {}), done = edu.filter(x => x && x.completedOn), bv = d.boardViews || [];
  const rows = [
    ['inventory', 'AI inventory (B1)', inv.length], ['statement', 'AI risk appetite statement', true], ['directions', 'Board directions paper', true],
    ['aupOutline', 'Acceptable-use policy outline', true], ['minute', 'Board minute', true], ['actionList', '90-day action list', true],
    ['worklist', 'Automated-decision worklist', inv.length], ['plan', 'Engagement plan', true],
  ].filter(([id]) => !((mode === 'connected' && (id === 'statement' || id === 'aupOutline')) || (mode !== 'connected' && id === 'directions')))
    .map(([id, name, has]) => {
      if (id === 'directions' && dir.by) return art('BD', id, name, 'recorded', dir.on, 'Recorded by the chair');
      const [s, at, note] = draftOr(!!has); return art('BD', id, name, s, at, id === 'inventory' && has ? `${inv.length} line${inv.length === 1 ? '' : 's'}; ${note}` : note);
    });
  rows.push(art('BD', 'education', 'Director education record', done.length ? 'recorded' : edu.length ? 'draft' : 'none', done.map(x => x.completedOn).sort().pop() || null, edu.length ? `${done.length} of ${edu.length} directors completed the briefing` : ''));
  if (mode === 'connected') rows.push(art('BD', 'boardViews', 'Board views taken from AI Risk Appetite', bv.length ? 'recorded' : 'none', bv.length ? bv[bv.length - 1].takenOn : null, bv.length ? `${bv.length} meeting${bv.length === 1 ? '' : 's'}` : ''));
  return rows;
}

const STATUS = { recorded: 'Recorded', draft: 'Draft', none: 'None yet' };
const cell = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (h, rows) => `| ${h.join(' | ')} |\n| ${h.map(() => '---').join(' | ')} |\n` + rows.map(r => `| ${r.map(cell).join(' | ')} |`).join('\n') + '\n\n';

/**
 * The index, in Markdown. o: { artefacts, by: 'letter' | 'iso', review, company, gatheredOn, notes, soa }.
 * soa: the rows of the client's Statement of Applicability, when one is loaded in AI Risk Appetite: the ISO view then
 * shows, for each Annex A control, whether it applies, its justification and its implementation status.
 * review is the date of the client's next AI management review (ISO/IEC 42001 clause 9.3), when set: every artefact
 * is then due for review at it. notes: lines saying what could not be gathered.
 */
/** o.jurisdiction and o.sector: outside Australia the index is by the jurisdiction's regime for the sector (US.6), or
 *  by ISO/IEC 42001 only where no regime is mapped yet. o.by: 'regime' (or 'letter', its older name) or 'iso'. */
export function indexMarkdown(o) {
  const au = !o.jurisdiction || o.jurisdiction === 'AU', R = regimeFor(o.jurisdiction, o.sector);
  const A = (o.artefacts || []).filter(a => a.status !== 'none'), by = o.by === 'iso' || !R ? 'iso' : 'regime';
  const rev = ymd(o.review), row = a => [APPS[a.app], a.name, STATUS[a.status] || a.status, a.asOf || '—', rev || '—', a.note || ''];
  const H = ['App', 'Artefact', 'Status', 'As of', 'Review by', 'Note'];
  let m = `${o.company ? o.company + ': ' : ''}the artefacts the three engagements hold, ${by === 'iso' ? 'by ISO/IEC 42001:2023 clause and Annex A control' : au ? 'by bullet of the ' + LETTER_NAME : 'by expectation of ' + R.name}. Gathered ${o.gatheredOn || ''}.\n\n`;
  m += rev ? `Review dates are set to the client’s next AI management review (ISO/IEC 42001 clause 9.3), ${rev}.\n\n` : 'No AI management review date is set, so no review dates are shown. Set it on the set-up screen to align them with ISO/IEC 42001 clause 9.3.\n\n';
  (o.notes || []).forEach(n => { m += `**Not gathered.** ${n}\n\n`; });
  if (by === 'regime' && au) {
    LETTER.forEach(b => {
      const hits = A.filter(a => (a.letter || []).includes(b.id));
      m += `## ${b.id} · ${b.text}\n\n${b.section}. CPS 230: ${b.cps.length ? b.cps.join(', ') : '—'}. ISO/IEC 42001:2023: ${b.iso.join(', ')}.\n\n` + (hits.length ? table(H, hits.map(row)) : 'None yet.\n\n');
    });
  } else if (by === 'regime') {
    R.items.forEach(i => {
      const hits = A.filter(a => regimeItemsFor(R, a).some(x => x.id === i.id));
      m += `## ${i.id} · ${i.text}\n\n${i.section}. ${i.ref}. ISO/IEC 42001:2023: ${i.iso.join(', ')}.\n\n` + (hits.length ? table(H, hits.map(row)) : 'None yet.\n\n');
    });
  } else {
    const soa = soaIndex(o.soa), S = isoSummary(A, o.soa);
    m += soa ? `The client’s Statement of Applicability is loaded: ${S.applicable} of ${S.listed} controls listed apply. Of those, the suite’s outputs evidence ${S.evidenced} and do not evidence ${S.applicable - S.evidenced}.\n\n`
      : 'No Statement of Applicability is loaded. Load it in AI Risk Appetite’s set-up to see, for each Annex A control, whether it applies and its implementation status.\n\n';
    m += `${NOT_EVIDENCED} means the three engagements produce nothing for that clause or control. The evidence for it is in the client’s own AI management system: for example its development, testing and data processes (A.6.1 to A.6.2.5, A.7) and its impact assessments (A.5).\n\n`;
    ISO.forEach(([id, name]) => {
      const hits = A.filter(a => (a.iso || []).includes(id)), inputs = A.filter(a => (a.inputTo || []).includes(id));
      const bullets = LETTER.filter(b => b.iso.some(x => covers(x, id))).map(b => b.id), sr = soa && soa[id];
      const regimeIds = R && !au ? R.items.filter(i => i.iso.some(x => covers(x, id))).map(i => i.id) : [];
      m += `## ${id} · ${name}\n\n` + [au ? `Letter bullets: ${bullets.join(', ') || '—'}.` : R ? `${R.short}: ${regimeIds.join(', ') || '—'}.` : '', soa && /^A\./.test(id) ? `Statement of Applicability: ${soaLine(sr)}.` : ''].filter(Boolean).join(' ') + '\n\n'
        + (hits.length ? table(H, hits.map(row)) : `${NOT_EVIDENCED}.\n\n`)
        + (inputs.length ? `${INPUT_NOTE[id] || 'Input only.'} From: ${inputs.map(a => a.name).join('; ')}.\n\n` : '');
    });
  }
  if (!R) return m;
  const gap = R.items.filter(i => !A.some(a => regimeItemsFor(R, a).some(x => x.id === i.id))).map(i => i.id);
  m += `## ${au ? 'Bullets' : 'Expectations'} with no evidence yet\n\n${gap.length ? gap.join(', ') + '. These are for other controls or tools the entity holds; the three engagements do not produce evidence for them.' : 'None.'}\n\n${R.note}\n`;
  return m;
}

/* ---------- the Statement of Applicability (task ISO.5) ----------
   A Statement of Applicability lists the Annex A controls, whether each applies, the justification, and how far it is
   implemented. It holds no limits: the limits register is a separate Triodian input, tested by check K11. */
const soaIndex = rows => (Array.isArray(rows) && rows.length ? Object.fromEntries(rows.map(r => [r.control, r])) : null);
/** "applies · implemented in part · Material service providers", or "not listed". */
export function soaLine(r) {
  if (!r) return 'not listed';
  const impl = r.implemented === 'yes' ? 'implemented' : r.implemented === 'partly' ? 'implemented in part' : r.implemented === 'no' ? 'not implemented' : 'implementation not stated';
  return [r.applicable ? 'applies' : 'does not apply', r.applicable ? impl : '', r.justification || ''].filter(Boolean).join(' · ');
}
/** For each Annex A control: its SoA row, the outputs that evidence it, and those that are an input only. */
export function soaReport(artefacts, soa) {
  const A = (artefacts || []).filter(a => a.status !== 'none'), ix = soaIndex(soa) || {};
  return ANNEX_A.map(([id, name]) => ({ id, name, soa: ix[id] || null, evidence: A.filter(a => (a.iso || []).includes(id)), inputs: A.filter(a => (a.inputTo || []).includes(id)) }));
}
/** Counts for the ISO view: controls the SoA lists, those that apply, and those of them the suite evidences. */
export function isoSummary(artefacts, soa) {
  const R = soaReport(artefacts, soa), listed = R.filter(r => r.soa), applicable = listed.filter(r => r.soa.applicable);
  return { controls: ANNEX_A.length, evidencedAll: R.filter(r => r.evidence.length).length, listed: listed.length, applicable: applicable.length, evidenced: applicable.filter(r => r.evidence.length).length };
}
/** The report as a table, for a screen or a document: one row for each Annex A control. */
export function soaMarkdown(artefacts, soa) {
  const R = soaReport(artefacts, soa), has = !!soaIndex(soa);
  return table(['Control', 'Name'].concat(has ? ['Statement of Applicability'] : [], ['Evidenced by']), R.map(r => [r.id, r.name].concat(has ? [soaLine(r.soa)] : [], [r.evidence.length ? r.evidence.map(a => `${APPS[a.app]}: ${a.name}${a.status === 'draft' ? ' (draft)' : ''}`).join('; ') : NOT_EVIDENCED + (r.inputs.length ? '. Input only: ' + r.inputs.map(a => a.name).join('; ') : '')])));
}

/** Counts for the screen: regime items (letter bullets in Australia) with evidence, and artefacts recorded or in draft.
 *  With no regime (a jurisdiction not yet mapped) bullets and of are 0. */
export function coverage(artefacts, jurisdiction, sector) {
  const A = (artefacts || []).filter(a => a.status !== 'none'), R = regimeFor(jurisdiction, sector);
  return { bullets: R ? R.items.filter(i => A.some(a => regimeItemsFor(R, a).some(x => x.id === i.id))).length : 0, of: R ? R.items.length : 0, recorded: A.filter(a => a.status === 'recorded').length, draft: A.filter(a => a.status === 'draft').length };
}
