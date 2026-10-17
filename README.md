# AI Risk Appetite (Triodian)

Single-tenant web app. The site lives in `public/` and is served by Cloudflare Pages.

- `public/index.html` – page shell
- `public/app.js` – the app
- `public/content.js` / `content.json` – framework content (scales, decisions, worked example)
- `public/app.css` – styles
- `docs/` – framework and fix specification

## Roadmap
1. Hosting: GitHub → Cloudflare Pages, protected by Cloudflare Access (sign-in)  ← current
2. UI: people as a list/table instead of cards
3. Database: Cloudflare D1 replaces browser storage
4. Admin user: an admin who manages who can sign in and their roles
