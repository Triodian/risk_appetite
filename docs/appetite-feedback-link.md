# The in-use feed: AI Use Assessment to AI Risk Appetite

Development plan task 3.7. The in-use feed is the assessment register extract v2 (`triodian.aua.extract.v2`). It keeps the v1 extract's entries, and adds:

- the measures M1 to M10 that the register can count;
- the gaps by priority;
- the overdue items.

A measure the register cannot count has no value and says why. That covers M2, M3, M5 and M8, and M1, M4 and M7 before a calibration set is loaded. Nothing is estimated.

Risk Appetite reads the feed in three places:

- **Decision 3**, as the current state for check K10. A v1 extract still works there.
- **Decision 8**, which shows the measures beside the limits the schedule sets.
- **The board view**, which AI Board Direction takes for each board meeting (see `docs/board-link.md`).

The link is a Cloudflare **service binding**: a direct call from one Worker to another inside the same Cloudflare account. There is no public URL, no service token and no secret. The same note is in both apps' `docs/` folders.

## What Use Assessment offers

`AssessmentService` (`src/service.js`) has one method, `feedback()`. It returns the feed as Triodian last issued it, the same answer as `GET /api/appetite-feedback`. Use Assessment runs `src/index.js`, which exports the app and the entrypoint.

## How it is set up

Nothing to do by hand. Risk Appetite's `wrangler.jsonc` binds each environment:

| Risk Appetite Worker | Binding | Binds to | Entrypoint |
| --- | --- | --- | --- |
| `risk-appetite` | `ASSESSMENT` | `use-assessment` | `AssessmentService` |
| `risk-appetite-test` | `ASSESSMENT` | `use-assessment-test` | `AssessmentService` |
| `risk-appetite-client` | `ASSESSMENT` | `use-assessment-client` | `AssessmentService` |

Use Assessment already binds the other way (`APPETITE`, for the calibration set; see `docs/calibration-link.md` in Use Assessment). On a new account, deploy one app, then the other, then the first again, so each finds the other's entrypoint. Both Workers must be in the same Cloudflare account.

## Using it

1. **In Use Assessment**, someone with a Triodian role opens **Outputs → AI dependency register** and chooses **Issue the in-use feed to Risk Appetite**. The time it was last issued shows beside the button. **In-use feed (.json, v2)** downloads the same file.
2. **In Risk Appetite**, on decision 3, choose **Load from AI Use Assessment**, or **Load assessment register extract** for a file (v1 or v2). K10 uses the entries. With a v2 feed, decision 8 shows the measures, the gaps by priority and the overdue items.
3. Issue the feed again when the register changes, and load it again in Risk Appetite before a board meeting, so the board view is current.

## Checking it works

- In Use Assessment, signed in, `GET /api/appetite-feedback` answers 404 until the feed is issued, then the feed.
- In Risk Appetite, signed in, `GET /api/feedback-from-assessment` answers the same feed, read over the binding.

## If it fails

| Message | Cause |
| --- | --- |
| "could not be reached through the ASSESSMENT service binding" | The Use Assessment Worker named in the binding is not deployed in this account, or was deployed before `AssessmentService` existed. Deploy it again. |
| "No in-use feed has been issued yet" | Use Assessment is linked, but nobody has issued the feed. Issue it from the AI dependency register output. |
| "The link to the Use Assessment app is not set up on this site yet" | The Risk Appetite Worker has no `ASSESSMENT` binding. Check `wrangler.jsonc`, or load the extract from a file. |
| "not a register extract" | The file is not `triodian.aua.extract.v1` or `v2`. |
