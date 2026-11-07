# AI Risk Appetite

[![Tests](https://github.com/Triodian/risk_appetite/actions/workflows/tests.yml/badge.svg)](https://github.com/Triodian/risk_appetite/actions/workflows/tests.yml) [![Licence: Apache 2.0](https://img.shields.io/badge/licence-Apache%202.0-blue.svg)](LICENSE)

AI Risk Appetite helps a regulated entity, starting with general insurers, settle its appetite for AI risk: how much
authority AI may have in each function, what consequence it will accept, what it may not know about AI in its supply
chain, where AI may run, and what must reach the board. The CRO, the risk function and counsel work through eight
decisions; the CRO agrees a working appetite and the board approves it. The agreed appetite is issued as a
calibration set that the [AI Use Assessment](https://github.com/Triodian/use-assessment) measures against.

> The app records facts and the positions people take. It is not legal advice and does not say what the law requires;
> counsel decides what applies.

**Try it.** The demo runs at [risk-appetite.triodian.com](https://risk-appetite.triodian.com), with a worked example you can open without changing
anything. Ask Triodian for the demo sign-in.

**Run it yourself.** It runs as a Cloudflare Worker with a D1 database. See [Running locally](#running-locally) and
[Tests](#tests) below, and the [installer](https://github.com/Triodian/triodian-install) to put it into your own
Cloudflare account.

## Part of the Triodian AI governance apps

| App | What it is for |
| --- | --- |
| [AI Obligations Atlas](https://github.com/Triodian/obligations-atlas) | The AI governance obligations that apply by jurisdiction and use case, tiered by source, with a matter brief for counsel |
| [AI Board Direction](https://github.com/Triodian/board-direction) | A board sets its direction on AI: where to use it, what to rule out, what comes back to the board |
| [AI Risk Appetite](https://github.com/Triodian/risk_appetite) | A regulated entity settles its appetite for AI risk, for the board to approve |
| [AI Use Assessment](https://github.com/Triodian/use-assessment) | The AI in a regulated entity's supply chain, measured against that appetite |
| [AI Confidentiality Exposure Assessment](https://github.com/Triodian/Confidentiality-Exposure-Assessment) | Where confidential information in one transaction can reach an external AI model |
| [Installer and suite test](https://github.com/Triodian/triodian-install) | Puts the apps a client needs into a Cloudflare account, and tests them together |

The engagement apps are separate, each with its own repo and database. Deployed together they share one sign-in and
reach each other through Cloudflare service bindings.

## How it is built

Single-engagement web app: each deployment holds one engagement for one organisation.
It runs as a Cloudflare Worker: the files in `public/` are served as static assets, and `src/worker.js` handles `/api/*`.
See `docs/architecture.md` for the layers and the path to AWS or Azure.

- `public/` – the app (`index.html`, `app.js`, `content.js`, `app.css`). One script serves three areas:
  - `/` – the engagement (decisions, checks, challenge, outputs) and practice mode
  - `/admin/` – set-up, users and roles, activity (administrators only)
  - `/profile/` – your name, organisation and email address
- `src/worker.js` – Cloudflare entry point
- `lib/core/` – cloud-neutral API (`api.js`), role rules (`roles.js`) and the server-side save check (`rbac.js`)
- `lib/identity/cloudflare-access.js` – verifies the Cloudflare Access sign-in
- `lib/store/d1.js` – database access (Cloudflare D1)
- `lib/config.js` – Access team domain and AUD tag, first administrator
- `wrangler.jsonc` – Worker configuration (name, custom domain, database binding)
- `schema.sql` – reference copy of the database tables (created automatically)
- `docs/` – framework, fix specification, architecture

## Test site

A separate copy at `risk-appetite-test.triodian.com` with its own database. Set-up and day-to-day use: `docs/test-site.md`.

## Cloudflare set-up
- Worker `risk-appetite`, deployed from GitHub (Workers Builds) with `npx wrangler deploy`.
- Custom domain `risk-appetite.triodian.com`, protected by a Cloudflare Access application.
  workers.dev and preview addresses are off (see `wrangler.jsonc`).
- D1 database `risk-appetite-db`, bound as `DB` in `wrangler.jsonc`.
- Cloudflare Access policy lets any verified email through; the app's user list (managed in `/admin`) decides who gets in.
- Access team domain, AUD tag and the first administrator are in `lib/config.js`.

## Tests
```
for f in tests/*.test.mjs; do node "$f"; done
cd tests/e2e && npm ci && npx playwright install chromium && npx playwright test
```

## Running locally
```
npx wrangler dev --local-upstream localhost --var LOCAL_DEV_NO_SIGNIN_EMAIL:you@example.com
```
`LOCAL_DEV_NO_SIGNIN_EMAIL` only works on localhost. Locally, an `X-Dev-User` header picks a different user for testing.


## Contributing

Contributions are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md).
Report security problems privately, as [SECURITY.md](SECURITY.md) describes, not as issues.

## Supporting the project

Use it, review it, tell us you use it, or fund its upkeep: see [SUPPORTING.md](SUPPORTING.md). Reviewers and organisations stay private unless they choose otherwise.

## Licence

AI Risk Appetite is open source under the [Apache License, Version 2.0](LICENSE). Copyright 2026 Triodian Pty Ltd.
Third-party components bundled with it keep their own licences; see [`NOTICE`](NOTICE).
