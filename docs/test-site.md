# Test site: risk-appetite-test.triodian.com

A separate copy of the app for trying changes before they reach the live engagement.
It has its own Worker (`risk-appetite-test`) and its own database (`risk-appetite-test-db`),
so nothing done there touches the live engagement. A striped banner across the top of every
page says "Test site · not the live engagement".

## One-time set-up (about 15 minutes)

1. **Create the test database.**
   Cloudflare dashboard → Storage & databases → D1 → Create database → name it `risk-appetite-test-db`.
   Copy its database ID and replace `REPLACE_WITH_TEST_DATABASE_ID` in `wrangler.jsonc`
   (or send the ID to whoever maintains the app). The tables are created automatically on first use.

2. **Protect the address with the same sign-in.**
   Zero Trust → Access controls → Applications → the Risk Appetite application → Configure →
   add a public hostname `risk-appetite-test.triodian.com`.
   Adding it to the same application keeps the same sign-in, the same MFA and the same AUD tag,
   so the app needs no other settings. Do this before the first deploy, so the address is never open.

3. **Connect the test Worker to GitHub.**
   Workers & Pages → Create → Import a repository → `Triodian/risk_appetite`.
   - Worker name: `risk-appetite-test`
   - Production branch: `test`
   - Deploy command: `npx wrangler deploy --env test`
   The `risk-appetite-test.triodian.com` sub-domain and its DNS record are created by Cloudflare
   on the first deploy, because the route is a custom domain. Nothing needs adding in DNS by hand.

4. **Create the `test` branch** in GitHub from `main`.

## Day to day

- Changes go to the `test` branch first; Cloudflare deploys them to the test site.
- When they have been checked there, merge `test` into `main`; Cloudflare deploys the live site.
- The first person to sign in to the test site who is listed in `BOOTSTRAP_ADMINS` (lib/config.js)
  becomes its administrator. Add test users in its Admin, separately from the live site.
- To start the test site again from empty, delete and re-create the test database.
