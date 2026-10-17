// Settings for this deployment. None of these are secrets.

// Cloudflare Access (sign-in). Found in Cloudflare Zero Trust:
//   teamDomain: Settings → Custom pages → Team domain
//   aud:        Access → Applications → Risk Appetite → "Application Audience (AUD) Tag"
// Can be overridden by Worker variables ACCESS_TEAM_DOMAIN and ACCESS_AUD.
export const ACCESS = {
  teamDomain: 'damian-hickey-30c.cloudflareaccess.com',
  aud: 'f484580a85a85e130bf5055f8d39a0e065f852368de9932ccd4e1d40e8903fd2',
};

// First administrator(s). While the user list has no active administrator, these people are
// added as administrators the first time they sign in. After that, admins are managed in /admin.
export const BOOTSTRAP_ADMINS = ['damian.hickey@triodian.com'];
