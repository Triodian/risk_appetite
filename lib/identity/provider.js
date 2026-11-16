// Which identity provider this deployment signs people in with (development plan ID.1). The same file is in the four
// engagement apps and Start (tools/sync-identity.mjs).
//
//   access (the default)  Cloudflare Access in front of /auth/email proves the email; lib/identity/cloudflare-access.js.
//                         The Cloudflare deployment, with or without the organisation's own provider federated in Access.
//   oidc                  The app is its own OpenID Connect relying party; lib/identity/oidc.js. For a deployment that is
//                         not behind Access (another cloud, or a host Access does not cover).
//
// One deployment has one provider, chosen by the IDENTITY_PROVIDER variable: behind Access, Access; not behind Access,
// OIDC. Both adapters return the same shape from identify(): { email } or { error, status }. Roles are never read from
// a provider; they stay in the app's store.
import * as access from './cloudflare-access.js';
import * as oidc from './oidc.js';

const KINDS = { access, oidc };

export function providerKind(env) {
  const k = String((env && env.IDENTITY_PROVIDER) || '').trim().toLowerCase();
  return KINDS[k] ? k : 'access';
}

export function provider(env) { return KINDS[providerKind(env)]; }
