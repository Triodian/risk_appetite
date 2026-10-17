// Cloudflare Access settings for this app. These are not secrets.
// Find them in Cloudflare Zero Trust:
//   teamDomain: Settings → Custom pages → Team domain, e.g. "triodian.cloudflareaccess.com"
//   aud:        Access → Applications → Risk Appetite → Overview → "Application Audience (AUD) Tag"
// They can also be set as environment variables ACCESS_TEAM_DOMAIN and ACCESS_AUD on the Pages project.
export const ACCESS = {
  teamDomain: '',
  aud: '',
};

// The address people use. Requests to the default pages.dev address are sent here.
export const CANONICAL_HOST = 'risk-appetite.triodian.com';
export const PAGES_DEV_HOST = 'risk-appetite.pages.dev';
