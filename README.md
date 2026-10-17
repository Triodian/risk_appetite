# AI Risk Appetite (Triodian)

Single-tenant web app. The site lives in `public/` and is served by Cloudflare Pages.

- `public/index.html` – page shell
- `public/app.js` – the app
- `public/content.js` / `content.json` – framework content (scales, decisions, worked example)
- `public/app.css` – styles
- `docs/` – framework and fix specification

- `functions/` – server code (Cloudflare Pages Functions): sign-in check and the `/api` endpoints
- `lib/` – shared server code; `lib/config.js` holds the Cloudflare Access team domain and AUD tag
- `schema.sql` – reference copy of the database table (created automatically on first use)

## Cloudflare set-up
- Pages project `risk-appetite`, build output directory `public`, no build command.
- Custom domain `risk-appetite.triodian.com`, protected by a Cloudflare Access application.
- D1 database bound to the Pages project with the variable name `DB` (Settings → Bindings).
- Access team domain and AUD tag in `lib/config.js` (or env vars `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`).
  The API refuses every request until these are set.

## Running locally
```
npx wrangler pages dev public --d1 DB --binding LOCAL_DEV_NO_SIGNIN_EMAIL=you@example.com
```
`LOCAL_DEV_NO_SIGNIN_EMAIL` only works on localhost.

## Roadmap
1. Hosting: GitHub → Cloudflare Pages, protected by Cloudflare Access (sign-in) ✓
2. Database: Cloudflare D1 replaces browser storage ✓
3. UI: people as a list/table instead of cards
4. Admin user: an admin who manages who can sign in and their roles
