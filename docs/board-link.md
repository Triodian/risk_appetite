# The board link: AI Board Direction and AI Risk Appetite

Development plan tasks 3.4 to 3.6. The two apps are linked both ways:

- **Board directions, from Board Direction to Risk Appetite.** In connected mode, the chair records the board directions BD1 to BD7 at B9. Risk Appetite reads the recorded version. Each decision then shows the directions read on it, and check K11 holds back a decision 1 ceiling that goes past the board's posture.
- **Board view, from Risk Appetite to Board Direction.** For each board meeting, Board Direction takes the board view from Risk Appetite. It holds the positions the board approved, where the appetite stands now, and the latest in-use measures.

Both use Cloudflare **service bindings**: a direct call from one Worker to another inside the same Cloudflare account. There is no public URL, no service token and no secret to create or rotate. The same note is in both apps' `docs/` folders.

## What each app offers

| App | Entrypoint (`src/service.js`) | Method | What it returns |
| --- | --- | --- | --- |
| Board Direction | `BoardService` | `directions()` | `triodian.bd.directions.v1`, built from the version kept when the chair recorded the directions, never from a draft. The same answer as `GET /api/board-directions`. |
| Risk Appetite | `AppetiteService` | `boardView()` | `triodian.raf.boardview.v1`: the approved calibration set exactly as `GET /api/calibration-set` serves it, the appetite's status, and the in-use measures. The same answer as `GET /api/board-view`. |

Each entrypoint offers only these methods. `AppetiteService` also offers `calibrationSet()` to Use Assessment. Both apps run `src/index.js`, which exports the app and its entrypoint.

## How it is set up

Nothing to do by hand. `wrangler.jsonc` in each app binds each environment to the other app's Worker in the same environment:

| Worker | Binding | Binds to | Entrypoint |
| --- | --- | --- | --- |
| `risk-appetite` | `BOARD` | `board-direction` | `BoardService` |
| `risk-appetite-test` | `BOARD` | `board-direction-test` | `BoardService` |
| `risk-appetite-client` | `BOARD` | `board-direction-client` | `BoardService` |
| `board-direction` | `APPETITE` | `risk-appetite` | `AppetiteService` |
| `board-direction-test` | `APPETITE` | `risk-appetite-test` | `AppetiteService` |
| `board-direction-client` | `APPETITE` | `risk-appetite-client` | `AppetiteService` |

The bindings point both ways, which Cloudflare allows. On a new account, deploy one app, then the other, then the first again, so each finds the other's entrypoint. Both Workers must be in the same Cloudflare account. For a client deployment, replace `-client` with the client's Worker names in both files.

## Using it

1. **In Board Direction** (connected mode), settle B2 to B8. At B9 the chair chooses **Record the board directions**. If a position changes afterwards, the record is withdrawn. The chair records the directions again; until then Risk Appetite keeps reading the earlier version, marked as being revised.
2. **In Risk Appetite**, an administrator opens **Admin → Set-up → 5 · Board directions** and chooses **Load from AI Board Direction**. Set-up shows which functions match a BD1 area by name; a function with no match is not tested by K11. Choosing **Load from a file** takes the same JSON, for example from a site without the binding.
3. **For each board meeting**, Triodian, the chair or the CEO opens B9 in Board Direction, picks the meeting date, and chooses **Take the board view for this meeting**. Each view is kept as it was taken; it cannot be changed or removed.

## Checking it works

- In Board Direction, signed in, `GET /api/board-directions` answers 404 until the chair records the directions, then the file.
- In Risk Appetite, signed in, `GET /api/directions-from-board` answers the same file, read over the binding. `GET /api/board-view` answers the board view.
- In Board Direction, signed in, `GET /api/board-view-from-appetite` answers the board view, read over the binding.

## If it fails

| Message | Cause |
| --- | --- |
| "could not be reached through the BOARD service binding" (Risk Appetite) | The Board Direction Worker named in the binding is not deployed in this account, or was deployed before `BoardService` existed. Deploy it again. |
| "could not be reached through the APPETITE service binding" (Board Direction) | The same, for the Risk Appetite Worker and `AppetiteService`. |
| "The chair has not recorded the board directions yet" | Board Direction is linked, but no directions are recorded. Record them at B9 in connected mode. |
| "This board engagement is standalone" | Standalone engagements give no directions. A regulated company runs a connected engagement. |
| "The link to the … app is not set up on this site yet" | The Worker has no binding. Check `wrangler.jsonc`, or, in Risk Appetite, load the directions from a file. |
| "Not a board directions file" | The file loaded in Risk Appetite set-up is not `triodian.bd.directions.v1`. |
