# AI Use Assessment Framework

Oct 11, 2026 · @Damian Hickey

## 1. Summary

The AI use assessment establishes, for a representative set of an insurer's arrangements, where AI acts, what it is able to do, and what evidence of its behaviour can be produced at each boundary in the chain. It is the technical half of a joint engagement led by Norton Rose Fulbright (NRF). NRF answers what the insurer can require; this assessment answers what can actually be produced.

| Item | Position |
| --- | --- |
| Question answered | At each boundary in the chain, what evidence of AI behaviour can be produced, measured against the board's appetite? |
| Unit of assessment | One arrangement: a material service provider, the platform behind it, or an external AI service the insurer's own staff use |
| Instruments | The AI use register, the seven questions and the evidence ladder |
| Duration | Three to four weeks |
| Inputs | The insurer's AI inventory and the agreement for each arrangement in scope |
| Not required | Policyholder data, provider involvement, production access |
| Outputs | The register, one finding per arrangement, a technical schedule and a technical annex in Triodian's name |
| Independent check | The independent reviewer, on behalf of the CRO |
| Measure | APRA's standards and expectations. The assessment is solution-agnostic and presents no product |

**Status of this document.** The method, the seven questions, the ladder, the roles and the outputs come from the NRF planning deck (October 2026) and the AI Counsel Briefing (12 September 2026). The field-level detail, codes, rating rules, weekly plan and templates are drafted here to make the method executable. Section 12 lists each drafted element that needs confirmation.

**Standing rule.** Every legal determination is the insurer's and its counsel's. Triodian supplies the framework, the facts and the technical classification. Nothing in the assessment or its working papers states a legal conclusion.

## 2. Scope and boundaries

### 2.1 The chain and its boundaries

The assessment follows one chain and tests three kinds of boundary. Each register entry and each finding is tagged with one of them.

| Code | Boundary | Parties | What passes across it |
| --- | --- | --- | --- |
| B1 | Insurer to third party | The insurer and a material service provider: claims manager, underwriting agency or broker acting under delegated authority | Agreement terms outward; aggregate evidence back |
| B2 | Third party to fourth party | The provider and the platform behind it: the technology, pricing or AI model the provider relies on | Flow-down terms outward; what the provider can obtain back |
| B3 | Insurer's own use | The insurer's legal, claims and compliance staff and an external AI service | The insurer's own rules outward; a signed record back |

### 2.2 The representative set

The assessment covers a representative set of arrangements agreed with the General Counsel, not the whole estate. The default is four arrangements, the number used in the September counsel briefing.

Selection criteria, applied in this order:

1. **A live trigger.** A regulator request, a remediation or a major provider renewal that sets a date.
2. **AI inside a provider.** Business written through agencies or outside claims managers, where the agreement holds the audit rights.
3. **The insurer is itself asked for evidence.** For example a group life insurer answering to superannuation trustees.
4. **Coverage of boundary types.** At least one B1, one B2 reached through it, and one B3.
5. **Spread of authority.** At least one arrangement where AI decides or transacts, and one where it only assists.

### 2.3 In scope

- AI used in or supporting a service to the insurer, wherever in the chain it sits.
- AI used by the insurer's own staff through an external service.
- The agreement, and any schedule or side letter, for each arrangement in the set.
- The insurer's existing AI inventory, AI governance framework and material service provider register.

### 2.4 Out of scope

- **Legal advice.** Reach, applicability, grading and privilege are NRF's.
- **Policyholder or claims data.** The assessment works from documents and interviews.
- **Provider involvement.** No provider is approached. Obtainability is assessed from the insurer's side.
- **Production access.** No system is connected to, tested or monitored.
- **Model testing.** No model is evaluated for accuracy, bias or drift.
- **Products and gap filling.** Closing a gap is a separate decision for the insurer after the findings.
- **The whole estate.** Arrangements outside the set are not assessed. Uses found outside the inventory are handed to its owner.

## 3. Framework at a glance

Three instruments are applied in four steps, the same way to every arrangement at every client.

### 3.1 The three instruments

| Instrument | What it is | Section |
| --- | --- | --- |
| AI use register | One entry for each place AI acts in the chain, with a fixed set of fields | 6 |
| The seven questions | The ordered questions put to every arrangement. Two sit under all of them: what can the insurer require, and what can actually be produced | 7 |
| Evidence ladder | A scale of evidence types, matched to what the AI can do | 8 |

### 3.2 The four steps

1. **Confirm the set.** A representative set of arrangements, agreed with the GC.
2. **Map the AI.** Where AI acts, what authority it holds and who stands behind it. Each use becomes a register entry.
3. **Classify and test.** The consequence of each use, and the evidence obtainable at each boundary.
4. **Questions to counsel.** Legal questions go to NRF in writing. Counsel sees every draft first. Counsel's determinations are then recorded against each entry and the finding is set.

### 3.3 The logic of a finding

Each arrangement produces three positions on the ladder. The finding is the relationship between the last two.

| Position | Meaning | Set by |
| --- | --- | --- |
| Indicative rung | The evidence type that corresponds to what the AI can do | Triodian, by rule (section 8) |
| Required rung | The evidence the insurer can reasonably require, given reach and rights | The insurer and counsel |
| Obtainable rung | The highest evidence type that can in fact be produced and independently checked | Triodian, by test (section 8.4) |

### 3.4 Operating principles

- **Aggregate only.** No individual decisions, no policyholder data, no access to a provider's model.
- **Start from what exists.** The insurer's own inventory is the first input. Gaps go back to its owner to fix.
- **"No reasonable reach" is a conclusion.** It is documented as a finding, not treated as a gap.
- **Solution-agnostic.** The test is APRA's: can the evidence be produced, and can someone independent check it?
- **Every stage can stop.** The assessment leaves a usable register and findings whether or not anything follows.

## 4. Roles and governance

### 4.1 Parties

| Party | Role | Engaged by | Where it stops |
| --- | --- | --- | --- |
| The insurer | Client. The CRO raises the risk; the GC decides the brief and owns the outcome | n/a | n/a |
| Norton Rose Fulbright | Leads the engagement, holds the client, engages both firms, owns every legal call | The insurer | n/a |
| Triodian | Technical party. Does the assessment and the register. Responsible for the result | NRF | Gives no legal advice. Fills gaps only if the insurer asks, as a separate decision |
| Independent reviewer | Independent check of Triodian's assessment, on behalf of the CRO | Counsel or the CRO, separately from Triodian (to be confirmed) | Does not do the assessment or build any control. Gives no legal advice |
| KJR | Scaling partner for the register in later engagements | To be agreed | Not part of the first assessment |

### 4.2 Responsibility by activity

R = does the work. A = accountable for it. C = consulted. I = informed.

| Activity | GC | Insurer AI and risk teams | NRF | Triodian | Independent reviewer |
| --- | --- | --- | --- | --- | --- |
| Decide the brief and the set | A | C | R | C | I |
| Brief the AI, governance and safety teams | I | C | A | R | I |
| Supply inventory and agreements | A | R | C | I | I |
| Build and extend the register | I | C | I | A, R | I |
| Classify authority and failure consequence | I | C | C | A, R | I |
| Test evidence obtainability | I | C | C | A, R | I |
| Determine nexus, rights, reach and required evidence | A | I | R | C | I |
| Grade requirement, expectation or better view | A | I | R | I | I |
| Draft findings and technical annex | I | C | C | A, R | I |
| Check the assessment and its findings | I | I | A | C | R |
| Board paper and flow-down clause schedule | A | I | R | C | I |

### 4.3 Team

| Role | Person | Responsibility in the assessment |
| --- | --- | --- |
| Method owner | Damian Hickey | Scope, sequence and the evidence each stage has to produce. Signs the technical annex |
| Delivery manager | Leon Cosgrove | Plan, document requests, interview schedule, issue log |
| AI architect | Abhishek Gupta | Technical reading of each system: authority, credentials, where a record could be produced |
| Validation | Sam Ferraro PhD | Checks the measures without having written them, before anything goes to the independent reviewer |

### 4.4 Rules of engagement

- **Counsel first.** Every draft goes to NRF before anyone at the insurer sees it.
- **Legal questions in writing.** Any point needing a legal view is logged as a numbered question to counsel (template in section 9.5) and is not answered in a working paper.
- **Privilege.** The work is scoped through counsel, on the privilege position NRF determines. Document marking, storage and circulation follow NRF's instruction.
- **One technical party.** NRF deals with Triodian for all technical matters.
- **Independence of the check.** The independent reviewer receives the register, worksheets and annex from counsel or the CRO, not from Triodian, and reports on behalf of the CRO.

## 5. Workplan

The plan below fits the four steps into four weeks. Where the set is small and documents arrive on day one, weeks 2 and 3 compress into one.

### 5.1 Phases

| Phase | When | Activities | Output | Exit gate |
| --- | --- | --- | --- | --- |
| 0. Mobilise | Before week 1 | NRF convenes the legal and technical briefing. GC decides the brief. Privilege position and document handling set by NRF. Document request issued | Signed brief. Document request list. Agreed contacts | GC has confirmed the brief in writing |
| 1. Confirm the set | Week 1, days 1 to 2 | Apply the selection criteria in section 2.2. Agree the arrangements and their boundary types with the GC | Set register: arrangement ID, parties, boundary type, reason selected | GC and NRF agree the set |
| 2. Map the AI | Week 1, day 3, to end of week 2 | Brief the AI, governance and safety teams. Take the insurer's inventory as the first input. Read each agreement. Interview arrangement owners. Extend the register down the chain | Register with fields 1 to 14 complete (section 6). Interview notes. Source index | Every entry has a source and a date. Uses not on the inventory are logged for hand-back |
| 3. Classify and test | Weeks 2 to 3 | Classify authority and failure consequence. Set the indicative rung. Run the obtainability test at each boundary. Internal validation review | Register fields 15 to 22 complete. Classification rationale per entry. Draft worksheets | Validation review passed with no open exceptions |
| 4. Questions to counsel | Week 3 | Issue the numbered question set to NRF. Record counsel's determinations on nexus, rights, location and required evidence | Question log with responses. Register fields 23 to 25 complete | Every question answered, or recorded as open with an owner |
| 5. Findings and report | Weeks 3 to 4 | Set one finding per arrangement. Draft the technical schedule and annex. Draft to counsel first | Finding worksheets. Technical schedule. Technical annex, draft | NRF accepts the draft for independent check |
| 6. Independent check | Week 4 | The pack goes to the independent reviewer through the agreed reporting line. Triodian answers its queries through the same line. Corrections made and logged | The independent reviewer's check, reported on behalf of the CRO. Final annex | The check is confirmed complete through the agreed reporting line |
| 7. Close | End of week 4 | Hand uses not on the inventory back to its owner. Hand the register to NRF. Archive working papers as NRF directs | Hand-back list. Final register. Closure note | GC receives NRF's advice with the annex attached |

### 5.2 Document request list

Issued in phase 0 through NRF.

| Ref | Document | Used for |
| --- | --- | --- |
| D1 | Current AI inventory or register, with owner and date | First input to the register |
| D2 | AI governance framework and acceptable-use policy | Authority and the insurer's own rules at B3 |
| D3 | Material service provider register | Confirming the set and boundary types |
| D4 | Board risk appetite statement and tolerance levels for the critical operations in the set | The appetite the evidence is measured against |
| D5 | The agreement for each arrangement, with schedules, service descriptions and side letters | Rights, audit and information terms, sub-contracting terms |
| D6 | Delegated authority schedules for each binder or claims agreement | What authority the provider holds, and so what its AI can hold |
| D7 | Any provider disclosure about AI use already received: due diligence responses, attestations, notices | Evidence already obtainable |
| D8 | Licence terms and security documentation for each external AI service staff use | B3 entries |
| D9 | Existing assurance over the arrangements: audit reports, control reports, certifications | What existing assurance already covers |
| D10 | Incident and near-miss records involving AI in the set, last 24 months | Failure consequence |

### 5.3 Interviews

| Who | Purpose | Length |
| --- | --- | --- |
| Head of AI or AI governance | Agree the approach. Walk through the inventory and its known limits | 60 min |
| Owner of each arrangement in the set | What the provider does, where AI is known or suspected, what has been asked of the provider | 45 min each |
| Procurement or vendor management | How agreements are renewed and what evidence terms exist today | 45 min |
| Operational risk, second line | Critical operations, tolerances and how provider risk is monitored now | 45 min |
| Users of each external AI service at B3 | What the service is used for and what it is permitted to do | 30 min each |

## 6. AI use register

The register holds one entry for each place AI acts within an arrangement. An arrangement with AI at the provider and at the platform behind it has at least two entries.

### 6.1 How it is built

1. **Brief the AI teams first.** Agree the approach with the AI, governance and safety teams.
2. **Start from what exists.** The insurer's own AI inventory is the first input.
3. **Extend it down the chain.** Add the AI inside providers and the platforms behind them.
4. **Classify each entry.** Authority, consequence, rights and evidence.
5. **Hand the gaps back.** Uses not on the inventory go to its owner to add.

### 6.2 Fields

The deck names eight things each entry records. The 26 fields below break those eight into items a reviewer can test one at a time.

| # | Field | Allowed values or format | Completed by | Phase |
| --- | --- | --- | --- | --- |
| 1 | Entry ID | REG-001 onward | Triodian | 2 |
| 2 | Arrangement ID | ARR-01 onward, from the set register | Triodian | 2 |
| 3 | Boundary type | B1, B2, B3 | Triodian | 2 |
| 4 | Where the AI acts | Own staff · provider · platform behind a provider | Triodian | 2 |
| 5 | Business function and critical operation supported | Free text, plus the critical operation name from the insurer's CPS 230 list, or "none" | Triodian with arrangement owner | 2 |
| 6 | On the insurer's inventory | Yes · no · partly | Triodian | 2 |
| 7 | System name and purpose | Free text | Triodian | 2 |
| 8 | Supplier | Legal entity name | Triodian | 2 |
| 9 | Platform and model provider behind it | Legal entity names, or "not known" | Triodian | 2 |
| 10 | Location of each party, and any offshoring | Country per party | Triodian | 2 |
| 11 | What the AI does | Two sentences, plain words, verbs only from the source | Triodian | 2 |
| 12 | Human involvement | A person acts · a person decides · the output is the decision · unattended | Triodian | 2 |
| 13 | Credentials and systems the AI can change | List, or "none" | Triodian | 2 |
| 14 | Agreement terms on information, audit, sub-contracting and notification | Clause references with verbatim extracts | Triodian | 2 |
| 15 | Authority tier | A1 to A6 (section 8.1) | Triodian | 3 |
| 16 | Failure consequence | C1 to C5 (section 8.2) | Triodian | 3 |
| 17 | Indicative rung | E0 to E6 (section 8.3) | Triodian, by rule | 3 |
| 18 | Evidence currently received | Rung and description, or "none" | Triodian | 3 |
| 19 | Evidence the system could produce | Description of the record and where it would be generated | Triodian | 3 |
| 20 | Independently checkable | Yes · no · partly, with reason | Triodian | 3 |
| 21 | Obtainable rung | E0 to E6 (section 8.4) | Triodian, by test | 3 |
| 22 | Confidence in obtainability | High · medium · low | Triodian | 3 |
| 23 | Nexus, relationship and location determination | Counsel's wording, with question reference | NRF | 4 |
| 24 | Rights the insurer holds | Passive · significant influence · contractual · control or board seat | NRF | 4 |
| 25 | Required rung and grading | E0 to E6, graded requirement · expectation · better view | NRF | 4 |
| 26 | Finding and gap owner | F1 to F4 (section 9.1), with named owner | Triodian, after counsel | 5 |

### 6.3 Completion rules

- **Every value has a source.** Each field carries a source reference (document and page, or interview and date). A value without a source is recorded as "not known", never estimated.
- **Field 11 is descriptive, field 15 is the judgement.** The description is written before the tier is chosen, so a reviewer can re-derive the tier from it.
- **Fields 23 to 25 are never completed by Triodian.** They are transcribed from counsel's written response, with the question number.
- **"Not known" is a valid entry and is counted.** The annex reports how many fields are not known, by arrangement.
- **Confidence (field 22) is low by default at B2.** No provider is approached, so a fourth-party rung rests on documents alone unless field 14 or D7 supports it.
- **One classifier, one reviewer.** Fields 15 to 22 record who classified and who reviewed. They cannot be the same person.

## 7. The seven questions

The questions are worked in order for every arrangement. The determination at each step is the insurer's and its counsel's. Triodian supplies the framework and the facts each determination needs.

The paragraph references are those cited in the two decks. Counsel confirms them against the current instrument before they appear in any deliverable.

### 7.1 Question set

| # | Question | Answer scale | Determined by | Facts Triodian supplies | Register fields |
| --- | --- | --- | --- | --- | --- |
| 1 | Does a separate CPS 230 nexus exist? Is the party within the insurer's group (para 5)? | Yes · no | Counsel | Legal entity and ownership of each party | 8, 9, 23 |
| 2 | Is there a separate relationship that may engage CPS 230: a service to the insurer, or part of a chain supporting one (para 54)? | Yes · no | Counsel | The service provided, the critical operation it supports, and each link in the chain | 5, 8, 9, 23 |
| 3 | What rights does the insurer or its manager hold? | Passive · significant influence · contractual, including binder and claims agreements · control or board seat | Counsel | Verbatim information, audit, sub-contracting and notification terms | 14, 24 |
| 4 | Where is each party, and does location change what can be obtained? Enforceability, data access and audit rights; offshoring (paras 53(b) and 60(b)) | Per party: no effect · limits evidence · prevents evidence | Counsel | Country of each party and of where the AI runs | 10, 23 |
| 5 | What authority has been delegated to the AI, and what can its action produce? | Productivity · analytical · decision · transactional · agentic · actuating | Triodian classifies; counsel determines the authority delegated | Function, human involvement, credentials | 11, 12, 13, 15 |
| 6 | What could failure do? | Immaterial · contract breach · financial loss · policyholder harm · critical-operation disruption | Triodian classifies; insurer confirms | Critical operation link, tolerance, incident history | 5, 16 |
| 7 | What evidence can reasonably be required? | None · disclosure · attestation · event notification · audit · continuous telemetry · deterministic actuation control | Counsel determines; Triodian tests obtainability | Indicative rung, evidence received, evidence producible, checkability | 17 to 22, 25 |

### 7.2 Tests under each question

**Q1 and Q2, nexus and relationship.** Triodian does not answer these. It supplies an entity and service map for each arrangement: who contracts with whom, which entity operates the AI, and which critical operation the service supports. Two points from APRA's guidance, as cited in the counsel briefing, are flagged for counsel on each arrangement: a related party providing a service is assessed on the same footing as a third party, and providers relied on for the same critical operation may be assessed as a cohort.

**Q3, rights.** For each agreement Triodian extracts, without interpretation:

- any term giving the insurer information about how the service is performed
- any audit or access right, and what it reaches
- any term on sub-contractors and whether the insurer must be notified or consent
- any incident or event notification term and its timing
- any term that mentions AI, automation, models or automated decision-making
- the next contracting point: renewal, amendment or review date

**Q4, location.** Triodian records where each party is incorporated, where the service is performed and where the AI runs. Where any of these is not known from the documents, the entry says so.

**Q5, authority.** Three tests, each answered from the source documents:

1. Does a person act on the output, or does the output take effect without one?
2. Does the output move money, change a policy or claim record, or commit the insurer?
3. Does the AI hold credentials to act across steps or systems without a person starting each step?

The tier follows from the answers (section 8.1). Whether that authority was validly delegated under the agreement is counsel's question.

**Q6, failure.** The classification takes the most serious credible outcome if the AI acted wrongly and went undetected for one reporting period. It is anchored to the insurer's own tolerance for the critical operation in field 5 where one exists.

**Q7, evidence.** Split into its two halves and kept separate throughout:

- **What can be required** is counsel's determination and becomes the required rung.
- **What can be produced** is Triodian's test (section 8.4) and becomes the obtainable rung.

### 7.3 Stop rules

- **Q1 to Q3 all negative.** If counsel finds no nexus, no relationship and only passive rights, the arrangement is recorded as F3, no reasonable reach. Q5 and Q6 are still classified so the conclusion is documented against what the AI can do.
- **Q5 at productivity with Q6 immaterial.** Disclosure is the most the ladder indicates. The obtainability test is limited to whether disclosure exists.
- **Facts unavailable.** Where the documents do not show whether AI is used at a provider or platform, the entry is recorded as F4, not determinable on documents, with the specific question that would resolve it.

## 8. Classification and the evidence ladder

### 8.1 Authority tiers (question 5)

Tier definitions are from the counsel briefing. The insurance examples are illustrative and are replaced with the client's own in each engagement.

| Code | Tier | Definition | Deciding test | Illustrative insurance example |
| --- | --- | --- | --- | --- |
| A1 | Productivity | Drafts, summarises, searches. A person still acts | A person writes or sends the final output | A claims handler uses a copilot to summarise a file |
| A2 | Analytical | Scores, ranks, recommends. A person decides | The output is an input to a named person's decision | A fraud score shown to an assessor |
| A3 | Decision | Approves, declines, triages. The output is the decision | No person reviews before the outcome takes effect | Automatic triage of a claim to fast-track or investigation |
| A4 | Transactional | Prices, allocates, pays. Money or positions move | The output commits or moves money | Automated pricing under a binder, or straight-through claim payment |
| A5 | Agentic | Plans and acts across steps and tools, unattended | The AI starts its own next step | An agent that gathers documents, contacts a repairer and books an assessment |
| A6 | Actuation | Holds credentials that change systems, assets or infrastructure | The AI can write to systems of record under its own credentials | An agent with write access to the policy administration system |

Where a system fits two tiers, the higher one is recorded and the reason noted.

### 8.2 Failure consequence (question 6)

| Code | Consequence | Meaning for the assessment |
| --- | --- | --- |
| C1 | Immaterial | No effect outside the team using it |
| C2 | Contract breach | The provider or insurer would be in breach of an agreement term |
| C3 | Financial loss | Loss to the insurer above its reporting threshold for the operation |
| C4 | Policyholder harm | A policyholder is wrongly declined, delayed, charged or paid |
| C5 | Critical-operation disruption | A critical operation moves outside the tolerance the board has set |

### 8.3 The evidence ladder (question 7)

The two decks use slightly different names for three rungs. Both are shown; the first is used in this document.

| Code | Rung | Also called | What the insurer holds | Produced by | Frequency |
| --- | --- | --- | --- | --- | --- |
| E0 | None |  | Nothing | n/a | n/a |
| E1 | Disclosure |  | A statement of what AI is used, where and for what | The provider | On change, or annually |
| E2 | Attestation |  | A signed statement that the AI operated within stated limits over a period | The provider | Per reporting period |
| E3 | Event notification | Trigger reporting | Notice when a defined trigger is crossed | The provider | On event, within an agreed time |
| E4 | Audit |  | A right to examine the aggregate record, exercised by the insurer or its verifier | The insurer or an independent party | On demand or scheduled |
| E5 | Continuous telemetry | Continuous evidence | A stream of aggregate measures against the declared appetite | The system | Each window |
| E6 | Deterministic actuation control | Deterministic control | A control at the point of action, independent of the AI's reasoning, with a signed record of what was requested, what applied and what was allowed | The system | Each action, reported in aggregate |

**Indicative rung.** The base rule pairs each authority tier with one rung.

| Authority tier | A1 | A2 | A3 | A4 | A5 | A6 |
| --- | --- | --- | --- | --- | --- | --- |
| Indicative rung | E1 | E2 | E3 | E4 | E5 | E6 |

**Adjustment for failure consequence (proposed, for confirmation).** The decks set the base rule only. This document proposes two adjustments so that question 6 affects the result:

- C1 with A1 or A2: the indicative rung drops by one.
- C4 or C5 with A1 to A4: the indicative rung rises by one.

Every adjustment is recorded with its reason. The indicative rung is a technical starting point. Which rung applies is a determination for the insurer.

### 8.4 Obtainability test

The test starts at the indicative rung and steps down one rung at a time until all five conditions pass. That rung is the obtainable rung.

| # | Condition | Question | Source |
| --- | --- | --- | --- |
| T1 | Produced | Does a record of this type exist, or could the system generate it without redesign? | D7, D8, D9, supplier documentation, interviews |
| T2 | Aggregate | Can it be given without individual decisions, policyholder data or the model? | Nature of the record |
| T3 | Reachable | Is there a route for it to reach the insurer: a term in force, or a contracting point where one could be added? | Field 14, next renewal date |
| T4 | Checkable | Can someone independent of the party producing it verify it? | Field 20 |
| T5 | Timely | Can it arrive in time for the insurer to act and meet its own notification obligations? | Agreement timing terms, insurer's incident process |

T3 records whether a term exists and what it says. Whether the term is sufficient or enforceable is a question to counsel.

**Confidence.** High where the record has been seen. Medium where the agreement or supplier documentation describes it. Low where the rung is inferred from the type of system.

### 8.5 Worked illustration

Illustrative only, not drawn from any client.

| Field | Entry |
| --- | --- |
| Arrangement | Outside claims manager under a claims agreement (B1) |
| What the AI does | Triage model routes each new motor claim to fast-track payment or investigation. No person reviews the routing |
| Authority tier | A3, decision |
| Failure consequence | C4, policyholder harm |
| Indicative rung | E3 by base rule, raised to E4 by the proposed adjustment |
| Evidence received today | E1: a due diligence response naming the triage tool |
| Obtainability | E4 fails T3 (audit clause reaches financial records only). E3 fails T1 (no trigger defined). E2 passes all five |
| Obtainable rung | E2, medium confidence |
| Question to counsel | Does the audit clause reach an aggregate record of automated triage outcomes? What can the insurer require at renewal? |

## 9. Findings

### 9.1 Finding types

One finding is recorded per arrangement, after counsel has set the required rung. The deck names the first three outcomes. F4 is proposed here because no provider is approached.

| Code | Finding | Condition | What is recorded |
| --- | --- | --- | --- |
| F1 | Evidence obtainable | Obtainable rung is at or above the required rung | The evidence, who produces it, and how it is checked |
| F2 | Gap | Obtainable rung is below the required rung | The gap in rungs, which test failed, and the gap owner |
| F3 | No reasonable reach | Counsel determines the insurer cannot reasonably require evidence at this boundary | Counsel's determination and its basis, with the technical classification beside it |
| F4 | Not determinable on documents (proposed) | The documents do not show whether AI is used, or what it can do | The specific question that would resolve it, and who could answer it |

### 9.2 Gap rating (proposed, for confirmation)

Gap size is the required rung minus the obtainable rung. Priority combines gap size with failure consequence.

| Gap size | C1 or C2 | C3 | C4 or C5 |
| --- | --- | --- | --- |
| 1 rung | Low | Low | Medium |
| 2 rungs | Low | Medium | High |
| 3 or more rungs | Medium | High | High |

A gap at low confidence (field 22) is reported at its rated priority with the confidence shown beside it. It is not downgraded.

### 9.3 Gap owner and closing route

Each F2 names one owner. The assessment records the routes available; who closes a gap, and with what, is a separate decision for the insurer.

| Failed test | Usual owner | Routes available |
| --- | --- | --- |
| T1, produced | The provider, or the insurer's AI team at B3 | The provider's own solution · a tool the insurer already has · a boundary control and evidence design, if the insurer asks |
| T2, aggregate | The provider | Redesign of the record so it carries aggregates and references only |
| T3, reachable | The GC, through counsel | Evidence terms at the next contracting point, with a technical schedule beside the clauses |
| T4, checkable | The insurer's second or third line | Appointment of an independent verifier; verification terms in the agreement |
| T5, timely | The arrangement owner | Notification timing aligned to the insurer's own windows |

### 9.4 Finding worksheet

One worksheet per arrangement. It is the working paper the independent reviewer checks and the source for the annex.

| Part | Contents |
| --- | --- |
| A. Identification | Arrangement ID, parties, boundary types, reason selected, worksheet version, preparer, reviewer |
| B. Chain map | Each party, what it does, where it is, and each place AI acts, with register entry IDs |
| C. Facts | Register fields 4 to 14 for each entry, each with its source reference |
| D. Classification | Authority tier and failure consequence, each with a two-line rationale tied to the facts in part C |
| E. Ladder | Indicative rung, any adjustment and reason, evidence received today |
| F. Obtainability | Result of T1 to T5 at each rung tested, the obtainable rung and confidence |
| G. Questions to counsel | Each question, date sent, response, date received |
| H. Counsel's determinations | Fields 23 to 25, transcribed with question references |
| I. Finding | Finding type, gap size and priority, failed test, gap owner, routes available |
| J. Not known | Every field recorded as not known, and what would resolve it |

### 9.5 Question-to-counsel template

| Field | Contents |
| --- | --- |
| Reference | QC-01 onward |
| Arrangement and entry | ARR and REG IDs |
| Which of the seven questions | 1 to 4, or 7 |
| Facts | What the documents show, with source references. No characterisation |
| Question | One question, answerable with a determination |
| Why it matters to the assessment | Which register field and which test depend on it |
| Response | Counsel's wording, unedited |
| Status | Open · answered · open with owner |

## 10. Deliverables

### 10.1 What Triodian produces

| # | Deliverable | Contents | Accepted when |
| --- | --- | --- | --- |
| DL1 | AI dependency register, including AI inside providers | All 26 fields for every entry in the set. Source index. Count of not-known fields | Every entry has a finding or is recorded F4. No field is blank |
| DL2 | Evidence obtainable at each boundary | One finding worksheet per arrangement (section 9.4). A one-page summary table: arrangement, tier, consequence, indicative, required, obtainable, finding, priority | Each worksheet is reviewed, and each rung is traceable to a test result |
| DL3 | Control-library shape for the insurer's own AI boundary | For B3 entries only: the categories of rule the insurer would need to state for its own staff's use, and the record each would produce. Shape only, with no product specified | Reviewed by the insurer's AI governance lead for fit with the existing framework |
| DL4 | Technical schedule, tolerance and trigger design | For each F1 and F2: the evidence item, its contents, its frequency, the tolerance it is measured against, the triggers and their timing. Written to sit beside NRF's flow-down clauses | NRF confirms each item maps to a clause or to a stated reason for none |
| DL5 | Technical annex, in Triodian's name | Method, set, summary table, findings, limitations, not-known count, statement of what was not done | The independent reviewer's check is complete and its points are closed or disclosed |
| DL6 | Hand-back list | AI uses found that are not on the insurer's inventory | Accepted by the inventory owner |

### 10.2 What NRF produces

Listed so the interfaces are clear. These are not Triodian deliverables.

| Deliverable | Depends on from Triodian |
| --- | --- |
| Reach determination for each arrangement type | Entity and service maps, extracted agreement terms |
| Grading: requirement, expectation or better view | Indicative rungs and the facts behind them |
| FAR reasonable-steps note and privilege position | Findings summary |
| Flow-down clause schedule | Technical schedule (DL4) |
| Board paper, in the firm's name | Technical annex (DL5) |

### 10.3 Technical annex outline

1. Purpose, and the question the assessment answers
2. What was and was not done: no data, no provider involvement, no production access, no legal advice
3. The set, and why each arrangement was selected
4. Method: register, seven questions, ladder, obtainability test
5. Summary table of findings
6. Finding by arrangement
7. Patterns across the set: which test fails most often, and at which boundary
8. Routes available for each gap, without recommendation of any product
9. Limitations and confidence, including the not-known count
10. Appendices: register extract, question log, source index

### 10.4 Language rules for every deliverable

- State what the documents show and what the classification is. Do not state what the law requires.
- Use "indicative" for Triodian's rung and "required" only for counsel's.
- Use "gap" only where counsel has set a required rung above the obtainable one.
- Name no product, including Triodian's.
- Report aggregates and references only. No decision, policyholder detail or model content appears anywhere.

## 11. Quality control

### 11.1 Review points

| # | Review | When | Reviewer | Tests |
| --- | --- | --- | --- | --- |
| R1 | Set review | End of phase 1 | NRF and GC | Selection criteria applied; each boundary type represented |
| R2 | Register completeness | End of phase 2 | Delivery manager | Fields 1 to 14 complete or not known; every value sourced and dated |
| R3 | Classification review | During phase 3 | A second Triodian reviewer, not the classifier | Tier re-derived from fields 11 to 13 without sight of the original; differences resolved and logged |
| R4 | Validation | End of phase 3 | Sam Ferraro | Rules in sections 8.3 and 8.4 applied consistently across entries; every adjustment has a reason; every obtainable rung has five test results |
| R5 | Legal-line check | Before any draft leaves Triodian | Method owner | No sentence states what the law requires; "required" and "gap" used only as section 10.4 allows |
| R6 | Counsel review | Phase 5 | NRF | Draft seen by counsel first; determinations transcribed accurately |
| R7 | Independent check | Phase 6 | Independent reviewer | Is the assessment sound, and are its findings supported? |

### 11.2 Evidence standards

- **Traceable.** A reader can go from any finding to the test results, to the register fields, to the source document and page.
- **Reproducible.** A second classifier given the same part C facts reaches the same tier and rung. R3 tests this on every entry, since the set is small.
- **Dated.** Every source carries the date it was produced and the date it was read.
- **Verbatim where it matters.** Agreement terms and counsel's determinations are quoted, not paraphrased.
- **Disagreements kept.** Where classifier and reviewer differed, both positions and the resolution stay on the worksheet.

### 11.3 Working papers

- Marked, stored and circulated as NRF directs under the privilege position it determines.
- Versioned. Each worksheet shows preparer, reviewer and date for every version.
- No policyholder, claimant or staff personal data is collected. If a document supplied contains it, it is returned and a redacted copy requested.
- No provider confidential material is sought. Documents are supplied by the insurer from what it already holds.
- Retained or destroyed at close as NRF directs.

### 11.4 Exceptions log

Any departure from this framework is logged with the reason and who approved it: a substituted arrangement, an interview not held, a document not supplied, a review point skipped. The log is an appendix to the annex.

### 11.5 Measures reported at close

| Measure | Purpose |
| --- | --- |
| Entries by boundary type and authority tier | Shows what the set covered |
| Fields not known, by arrangement | Shows how much rests on missing facts |
| Findings by type and priority | The headline result |
| Obtainable rungs by confidence level | Shows how firm the result is |
| Failed tests by type and boundary | Shows where evidence breaks down in the chain |
| Classifier and reviewer differences | Shows how repeatable the classification was |
| Questions to counsel: sent, answered, open | Shows what remains undetermined |

## 12. Assumptions, dependencies and open items

### 12.1 Assumptions

- The set is four arrangements. A larger set extends phases 2 and 3 roughly in proportion.
- The insurer supplies documents D1 to D6 in week 1. Late documents move the plan day for day.
- NRF answers questions to counsel within five working days.
- The insurer has a current AI inventory. If it has none, phase 2 starts from the material service provider register and takes longer.
- The independent reviewer's check fits inside week 4. Its scope and criteria are not defined in either deck and are to be agreed with the CRO.

### 12.2 Dependencies

| Dependency | Owner | Needed by |
| --- | --- | --- |
| Signed brief and privilege position | GC and NRF | Before week 1 |
| Agreed set | GC | Week 1, day 2 |
| Documents D1 to D10 | Insurer, through NRF | Week 1 |
| Interview access | Insurer AI and risk teams | Weeks 1 to 2 |
| Board appetite and tolerances for the operations in the set | Insurer operational risk | Week 2 |
| Counsel's determinations | NRF | Week 3 |
| Independent check | Independent reviewer, on behalf of the CRO | Week 4 |

### 12.3 Drafted here, to be confirmed

These elements are not in either deck. Each was added to make the method executable and should be confirmed before first use.

- [ ] **The 26 register fields.** The deck names eight things an entry records. Confirm the breakdown against the register schema Triodian already holds.
- [ ] **The consequence adjustment to the indicative rung** (section 8.3).
- [ ] **The five-part obtainability test** (section 8.4). The deck states the test as two questions: can the evidence be produced, and can someone independent check it?
- [ ] **Finding type F4**, not determinable on documents (section 9.1).
- [ ] **The gap priority matrix** (section 9.2).
- [ ] **The week-by-week plan, document list and interview list** (section 5).
- [ ] **Rung definitions** (section 8.3). The decks name the rungs but do not define them.
- [ ] **The five-day turnaround for counsel** and the default set of four.

### 12.4 For counsel

- [ ] **CPS 230 paragraph references.** Paragraphs 5, 53(b), 54 and 60(b) are cited as they appear in the decks. Confirm each against the instrument in force.
- [ ] **Who determines authority under question 5.** The counsel briefing gives authority to counsel and consequence to Triodian. This document has Triodian classify the tier and counsel determine whether the authority was delegated. Confirm the split.
- [ ] **Whether T3 stays on the technical side of the line.** It records that a term exists and what it says. Confirm that this does not stray into interpretation.
- [ ] **Document marking and circulation** under the privilege position.

### 12.5 Other open items

- [ ] **Ladder naming.** The two decks differ on three rung names. Choose one set.
- [ ] **Insurer terms.** The counsel briefing was written for a superannuation trustee. "Mandate breach" and "member harm" have been changed to "contract breach" and "policyholder harm" to match the NRF deck.
- [ ] **Control-library shape (DL3).** The deck names it without describing its contents. The description in section 10.1 is a minimal reading.
- [ ] **Fee and effort.** Not covered here. The counsel briefing priced the equivalent assessment for a trustee at A$35k fixed for three to four weeks; no figure for insurers appears in the NRF deck.
- [ ] **KJR's role.** Described as a later scaling partner for the register. No task is assigned to it in this framework.

### Sources

- NRF planning deck: "What a CRO will ask, and how we answer it together", Damian Hickey, October 2026, 24 slides.
- "Triodian - AI Counsel Briefing", 12 September 2026, 29 slides.

No external source was consulted. Regulatory references are as stated in those two documents.
