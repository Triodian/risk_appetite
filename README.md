# AI Risk Appetite (Triodian)

Single-tenant web app. It runs as a Cloudflare Worker: the files in `public/` are served as static assets, and `src/worker.js` handles `/api/*`.

- `public/index.html` – page shell
- `public/app.js` – the app
- `public/content.js` / `content.json` – framework content (scales, decisions, worked example)
- `public/app.css` – styles
- `src/worker.js` – server: sign-in check and the `/api` endpoints
- `lib/` – shared server code; `lib/config.js` holds the Cloudflare Access team domain and AUD tag
- `wrangler.jsonc` – Worker configuration (name, custom domain, database binding)
- `schema.sql` – reference copy of the database table (created automatically on first use)
- `docs/` – framework and fix specification

## Cloudflare set-up
- Worker `risk-appetite`, deployed from GitHub (Workers Builds) with `npx wrangler deploy`.
- Custom domain `risk-appetite.triodian.com`, protected by a Cloudflare Access application.
  workers.dev and preview addresses are off (see `wrangler.jsonc`).
- D1 database `risk-appetite-db`, bound as `DB` in `wrangler.jsonc`.
- Access team domain and AUD tag in `lib/config.js`. The API refuses every request until these are set.

## Running locally
```
npx wrangler dev --local-upstream localhost --var LOCAL_DEV_NO_SIGNIN_EMAIL:you@example.com
```
`LOCAL_DEV_NO_SIGNIN_EMAIL` only works on localhost.

## Roadmap
1. Hosting: GitHub → Cloudflare Worker, protected by Cloudflare Access (sign-in) ✓
2. Database: Cloudflare D1 replaces browser storage ✓
3. UI: people as a list/table instead of cards
4. Admin user: an admin who manages who can sign in and their roles
