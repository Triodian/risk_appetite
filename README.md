# AI Risk Appetite (Triodian)

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

## Cloudflare set-up
- Worker `risk-appetite`, deployed from GitHub (Workers Builds) with `npx wrangler deploy`.
- Custom domain `risk-appetite.triodian.com`, protected by a Cloudflare Access application.
  workers.dev and preview addresses are off (see `wrangler.jsonc`).
- D1 database `risk-appetite-db`, bound as `DB` in `wrangler.jsonc`.
- Cloudflare Access policy lets any verified email through; the app's user list (managed in `/admin`) decides who gets in.
- Access team domain, AUD tag and the first administrator are in `lib/config.js`.

## Running locally
```
npx wrangler dev --local-upstream localhost --var LOCAL_DEV_NO_SIGNIN_EMAIL:you@example.com
```
`LOCAL_DEV_NO_SIGNIN_EMAIL` only works on localhost. Locally, an `X-Dev-User` header picks a different user for testing.

## Roadmap
1. Hosting: GitHub → Cloudflare Worker, protected by Cloudflare Access ✓
2. Database: Cloudflare D1 ✓
3. Single engagement, admin at /admin with users and role-based access, enforced on the server ✓
4. Set-up moved to Admin; profile page with self-service email change ✓
5. Next: UI refinements; enterprise items in `docs/architecture.md`
