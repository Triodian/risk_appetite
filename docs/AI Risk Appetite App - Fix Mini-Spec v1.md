# AI Risk Appetite App: Fix Mini-Spec v1

*Triodian · 12 October 2026 · Applies to the build reviewed on 12 October 2026 (`AI_Risk_Appetite (2).html`)*

This mini-spec lists the changes needed before the app is used with a client. It covers six must-fix items (M1 to M6) and nine should-fix items (S1 to S9). Each item gives the problem, where it is in the code, the change required, and how it is tested.

The **AI Risk Appetite App: Build Specification** remains the requirement. Where this document and the build specification differ, this document wins for the items listed. Line numbers refer to the unbundled `app.js`; treat them as approximate.

Do the must-fix items first, in order. M1 changes content that M5 and the exports depend on.

---

## Must fix

### M1. Use the framework's authority and evidence definitions

**Problem.** `content.json` → `scales` defines evidence rungs E1 to E5 differently from the AI Use Assessment Framework. The two apps exchange rung codes, so the board would be setting expectations on a different ladder from the one the assessment tests. The A3 and A6 summaries also contradict the framework.

**Change.** Replace `scales.authority` and `scales.evidence` with the text below, taken from the AI Use Assessment Framework, sections 8.1 and 8.3. Remove "Draft summary" from every definition, and change `scales.note` to: "Definitions from the AI Use Assessment Framework, sections 8.1 to 8.3."

| Code | Name | Definition |
| --- | --- | --- |
| A1 | productivity | Drafts, summarises, searches. A person still acts. |
| A2 | analytical | Scores, ranks, recommends. A person decides. |
| A3 | decision | Approves, declines, triages. The output is the decision; no person reviews before it takes effect. |
| A4 | transactional | Prices, allocates, pays. Money or positions move. |
| A5 | agentic | Plans and acts across steps and tools, unattended. |
| A6 | actuation | Holds credentials that change systems, assets or infrastructure. |

| Code | Name | Definition |
| --- | --- | --- |
| E0 | none | Nothing is held. |
| E1 | disclosure | A statement of what AI is used, where and for what. |
| E2 | attestation | A signed statement that the AI operated within stated limits over a period. |
| E3 | event notification | Notice when a defined trigger is crossed. Also called trigger reporting. |
| E4 | audit | A right to examine the aggregate record, exercised by the insurer or its verifier. |
| E5 | continuous telemetry | A stream of aggregate measures against the declared appetite. Also called continuous evidence. |
| E6 | deterministic actuation control | A control at the point of action, independent of the AI's reasoning, with a signed record of what was requested, what applied and what was allowed. |

Check that the consequence scale C1 to C5 matches framework section 8.2 in the same way, and correct it if not.

Then search the worked example and every output template for the old names ("contractual statement", "periodic attestation", "independent assurance", "right to examine") and remove them. Review the worked example's current-state values for decision 3 so they still make sense under the corrected rung meanings.

**Test.**
- No old rung name appears anywhere in the app or its outputs.
- Each D3 cell title, popover and the statement appendix shows the definitions above, word for word.

### M2. Rename the independent reviewer's role id

**Problem.** The role id is `finity` (lines 9, 109, 112–113, 815; `content.json` roles). The firm name is written into every saved file.

**Change.**
- Rename the id to `independent` everywhere. The display label stays "Independent reviewer".
- On loading a file, map any `finity` role to `independent`, then save it as `independent`.
- Search all code and content for the firm name and remove every occurrence.

**Test.**
- A saved file contains no "finity" in any case.
- An older file with `finity` loads, and that person can still propose on decision 2.

### M3. Escape every value read from a file

**Problem.** Several values are inserted into the page as HTML without escaping. Engagement files pass between parties, so a crafted file could run script in another user's browser.

**Known sites** (lines 321–322, 428, 474, 527, 556–557, 565, 657, plus jurisdiction ids in `data-cell`):
- `${x.ref}`, `${q.ref}`, `${c.ref}`, `${t.ref}`
- `data-cell="${q.cell}"` and `data-cell="${c.cell}"`
- `value="${x.id}"` in `pOpt`, and the bulk-owner and area values
- the `issued` entries

**Change.**
- Pass every interpolated value through `esc()`, including ids, refs and attribute values. Make `esc()` escape `&`, `<`, `>`, `"` and `'`.
- On load, validate the file before hydrating:
  - ids and refs match `^[A-Za-z0-9_.:-]{1,64}$`
  - roles, statuses and decision ids are from their known lists
  - strings are capped at 10,000 characters
  - a file that fails is rejected, and the reason is shown
- Guard `D(id)` so an unknown decision id cannot throw (lines 557, 565).

**Test.**
- A file with `<img src=x onerror=alert(1)>` in a ref, a cell id, a person id and a trigger ref is rejected, or loads with the text shown literally. No script runs.
- A file with an unknown decision id does not break the challenge screen.

### M4. Enforce role limits on every field

**Problem.** Some fields have no role check:
- the most-common-pair selects (lines 458–459)
- the existing decision 2 thresholds (line 464)
- the offshoring field (line 465)
- the overall-position statement field (line 659)
- the challenge response and status (lines 556–557)

As a result a board-record user can edit decision 3 starting data, which turns an approved set back to working and raises the version. The independent reviewer can edit decisions 3 and 6 data and raise questions and challenge on any decision.

**Change.** Route every editable control through one `canEdit(role, target)` function. Disable the control and show the reason in a popover when the role is not allowed. Apply these rules:

| Role | May edit |
| --- | --- |
| Counsel, Triodian, CRO, risk function | Set-up, starting data and positions, as the build specification section 2 allows |
| Independent reviewer | Decision 2 only, including its starting data, questions and challenge |
| Board record | The approval fields only |
| Overall-position paragraph | Counsel and CRO only, as the field's own hint says |
| Challenge response and status | Counsel, CRO and risk function |

**Test.**
- As board record, no field outside approval can be changed, and an approved set stays approved.
- As independent reviewer, no control outside decision 2 is enabled.

### M5. Make versioning follow the rules

**Problem.**
- Changes to starting data (`current.*`) and to jurisdiction or trigger names raise the version, though they are not positions (line 771).
- "Use starting position" raises the version once per cell (line 891).
- Adding, removing or renaming a function or critical operation does not raise it (lines 887–890), although these change P1 and P2.

**Change.**
- Raise the version only when the calibration set's content would change: any position value, condition, threshold, trigger, event or interval, and any change to functions, locations, critical operations or jurisdictions.
- Do not raise it for starting data, notes, questions, challenge text or people's names.
- Group each user action into one change. "Use starting position", "Apply owner to all" and similar bulk actions raise the version once and add one history entry listing the cells.
- Compute "would change" by comparing the calibration set before and after the action, not by which path was edited.

**Test.**
- After agreement, "Use starting position" on ten cells raises the version by one.
- Editing starting data raises nothing.
- Renaming a function raises the version by one.

### M6. Complete the calibration set and approval record

**Problem.**
- The calibration-set markdown shows only which parameters are set (lines 636–642), not their values.
- The JSON has no privilege marking.
- Nothing records who agreed or who approved. `agreedBy` is the first CRO in the list, not the person who acted.
- The minute reference appears only in the calibration markdown.

**Change.**
- Calibration markdown lists P1 to P11 with their values, in the forms of framework section 9.1. Write tables for P1, P3 and P4, and lists for the others. Mark each value that fell back to default.
- Calibration JSON gains `privilegeMarking` as its first property, and keeps schema `triodian.raf.calibration.v1`.
- **Agree working appetite** records the person currently selected in the header as `agreedBy`. That person must have the CRO role; otherwise the button is disabled with the reason.
- **Record board approval** requires date, minute reference and `approvedBy` (the board or committee name, typed in), and stores all three.
- Every output header shows status, version and date. When approved, it also shows the minute reference and approver.

**Test.**
- Exported JSON and markdown both carry all eleven parameter values and the privilege marking.
- The approval details appear in every output header.

---

## Should fix

### S1. Require a proposer

**Change.** A position cannot be saved as **set** without a proposer, chosen under the rules in build specification section 7.1. "Not set" entries still need only an owner and a due date. Add a check to K1: a set cell with no proposer fails it.

**Test.** Setting a value with no proposer shows an inline prompt to choose one, and the cell counts as incomplete.

### S2. Tighten the checks

**Change.**

| Check | Change |
| --- | --- |
| K2 | Compare each set cell with every set cell above it and to its left, not only the adjacent cell. E3, then a blank, then E1 along a row fails |
| K3 | Same rule for the priority matrix |
| K6 | Compare the provider column with own staff only. Do not test the platform column |
| K8 | Fail when an owner is blank or names a person who is no longer in the people list. Apply to schedule measures M1 to M9 as well as positions. Do not fill an owner by default when a value is set |

**Test.** Each case in the table fails its check and links to the cell.

### S3. Re-check after agreement

**Change.** When a change is made to a working or approved set, run K1 to K9 at once. If any fail:
- the header badge turns red
- the calibration strip reads "Working, version *n*, checks failing"
- **Export calibration set** is blocked until they pass

**Test.** Breaking K2 after agreement blocks the export and shows the failing check.

### S4. Report partial fallback

**Change.**
- A parameter appears in the "fell back to default" list whenever any of its cells used a default. Report it with the count, for example "P3: 4 of 30 cells default".
- Partly set P2 cells export the generic definition, not `null`.
- Unset P11 events export the framework's default text, not `null`.
- Key P8 by jurisdiction id, not name.

**Test.** Exporting with one blank D3 cell lists "P3: 1 of 30 cells default" and gives that cell the Appendix A value.

### S5. Correct the change history

**Problem.** `onInput` writes each keystroke into state (line 930), so when `setPath` runs on change, "from" is already the new value.

**Change.** Hold the edit in a draft value while typing. Read "from" from state when focus enters the field, and write to state on change.

**Test.** Changing a threshold from "100" to "250" records from "100" to "250".

### S6. Keep keyboard focus after edits

**Problem.** `render()` rebuilds the page and restores focus only by element id. Many fields have none, including position details (`data-pf`), the inputs table, function names and challenge responses.

**Change.**
- Give every focusable control a stable id derived from its path, for example `pf-d3-A4-C4-owner`.
- Restore focus and cursor position after every render.
- Keep arrow-key movement between grid cells, but let Enter, Space and Alt+Down open the select natively. Don't depend on `showPicker()`.

**Test.** Acceptance test 11: tab through decision 1, change three cells and their details, and focus never returns to the top of the page.

### S7. Finish the outputs screen

**Change.**
- Show the markdown source beside the preview on desktop, and stacked below it on tablet and phone. The CSS classes `.outgrid` and `.mdsrc` already exist.
- In a sandboxed viewer, replace the download button with a note to use Copy, rather than showing both.
- **Open engagement file** and **Resume** ask for confirmation when there are unsaved changes, as **New** and **Open worked example** already do.
- **Save** keeps the unsaved flag if the download could not start.

**Test.**
- Each tab shows preview and markdown.
- Opening a file with unsaved changes asks first.

### S8. Add the independent reviewer disclosure to the statement

**Change.** When the people list includes an independent reviewer who has proposed or commented on decision 2, add this paragraph to statement section 8, Accountability:

> "The independent reviewer advised on the consequence thresholds in decision 2 and separately reviews the AI Use Assessment on behalf of the CRO. The board is aware that the reviewer will review findings measured against thresholds it advised on."

**Test.** With the worked example, the statement contains the paragraph. With no reviewer contribution, it does not.

### S9. Remove custom rows cleanly

**Change.** Add remove controls for custom triggers (added beyond TR1 to TR8) and custom change events. Each removal is one versioned change with a history entry.

**Test.** A custom trigger can be added and removed, and the calibration set reflects both.

---

## Regression checks after the fixes

Run the build specification's acceptance tests AT1 to AT13 again, at 1280px, 800px and 390px. Also confirm that:

- the app still loads with no console errors and no sideways scrolling at any width
- a file saved before these fixes opens and converts as M2 describes
- the calibration set exported here loads in the AI Use Assessment app once built, and its rung codes mean the same thing in both apps

---

## Not in scope

These are left for a later pass:
- the minor items from the review: RAF-01 in the header, mark size, 44px tap targets, tap-to-open details on phone, and the worked-example message overlapping the grid
- the data-model shape differences from build specification section 6, which do not affect behaviour
