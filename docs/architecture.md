# Architecture and the path to an enterprise deployment

The app is built so that one organisation runs one engagement in its own deployment. Today it runs on
Cloudflare. It is structured so the same code can later run on AWS or Azure for a single organisation.

## Layers

| Layer | Today (Cloudflare) | File(s) | Cloud-specific? |
| --- | --- | --- | --- |
| Browser app | Static files | `public/` (app), `public/admin/` (admin) | No |
| API and rules | Cloudflare Worker | `lib/core/api.js`, `lib/core/rbac.js`, `lib/core/roles.js` | **No** – plain JavaScript |
| Identity (who is signed in) | Cloudflare Access (email one-time PIN) | `lib/identity/cloudflare-access.js` | Yes – swap per cloud |
| Storage | Cloudflare D1 (SQLite) | `lib/store/d1.js`, `schema.sql` | Yes – swap per cloud |
| Wiring | Worker entry point | `src/worker.js`, `wrangler.jsonc` | Yes – swap per cloud |

`lib/core/api.js` exposes one function, `handle({ method, path, email, text }, store)`, which returns
`{ status, body }`. A new cloud only needs: an entry point that calls `handle`, an identity adapter that
returns the signed-in email, and a storage adapter with the same methods as `lib/store/d1.js`.

## Access control

- **Authentication** (proving who someone is) is done by the identity provider: Cloudflare Access today.
- **Authorisation** (what they may do) is done by the app, from the `users` table managed in `/admin`:
  - Only active users can use the app at all. Others are refused and listed under "Waiting for access".
  - **Administrator** is a separate flag. Admins manage users and do the engagement set-up (in `/admin`).
    Being an admin does not by itself allow changing decisions; that needs an engagement role.
  - **Engagement role** (Counsel, Triodian, CRO, Insurer risk, Independent reviewer, Board record) decides
    what can be changed. Rules are in `lib/core/roles.js` and match the build specification.
- Every save is checked on the server (`lib/core/rbac.js`): the stored engagement is compared with the one
  sent, and any change outside the user's role is refused. History is append-only and new entries are signed
  by the server with the user's name and role. Refusals are written to the audit log.
- At least one active administrator must always exist; admins cannot remove their own admin access.
- People change their own name, organisation and email on `/profile`. A new email only takes effect when the
  person signs in with it (so the identity provider has verified it); until then the old address keeps working.

## Moving to AWS or Azure (one organisation)

| Concern | AWS | Azure |
| --- | --- | --- |
| Static app | S3 + CloudFront | Static Web Apps or App Service |
| API | Lambda behind API Gateway, or a container on ECS/Fargate | Azure Functions, or App Service / Container Apps |
| Identity | The organisation's IdP via Cognito, or ALB OIDC authentication | Microsoft Entra ID (App Service authentication or MSAL) |
| Database | RDS / Aurora PostgreSQL | Azure Database for PostgreSQL, or Azure SQL |
| Audit and logs | CloudWatch, forwarded to the organisation's SIEM | Azure Monitor / Log Analytics, Sentinel |
| Secrets and keys | KMS, Secrets Manager | Key Vault |

The SQL in `lib/store/d1.js` is plain and ports to PostgreSQL with small changes (`INSERT OR IGNORE` →
`ON CONFLICT DO NOTHING`, `AUTOINCREMENT` → identity column, `COLLATE NOCASE` → `lower()`).

## Before an enterprise go-live (not yet done)

- Single sign-on with the organisation's identity provider; store the IdP's subject id as well as email.
- Optional: map IdP groups to engagement roles, and SCIM provisioning so users are managed in one place.
- Backups and point-in-time restore, retention policy, and data residency confirmed for the organisation.
- Security headers (Content-Security-Policy), rate limiting, and an independent penetration test.
- Self-host the web fonts (they are loaded from Google Fonts today).
- Export of the audit log to the organisation's monitoring.
