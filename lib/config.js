// Settings for this deployment. None of these are secrets.

// Cloudflare Access (sign-in). Found in Cloudflare Zero Trust:
//   teamDomain: Settings → Custom pages → Team domain
//   aud:        Access → Applications → Risk Appetite → "Application Audience (AUD) Tag"
// Can be overridden by Worker variables ACCESS_TEAM_DOMAIN and ACCESS_AUD.
export const ACCESS = {
  teamDomain: 'damian-hickey-30c.cloudflareaccess.com',
  aud: 'f484580a85a85e130bf5055f8d39a0e065f852368de9932ccd4e1d40e8903fd2',
};

// First administrator(s): the Worker variable FIRST_ADMINS (comma-separated), set for each deployment by the installer or
// the provisioning script. Nothing is compiled in (security review 15 Nov 2026, S.4). While the deployment has never had an
// administrator, a listed person becomes one on first sign-in; after that the path is closed and admins are managed in /admin.
