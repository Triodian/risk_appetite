// Cloudflare Access settings for this app. These are not secrets.
// Find them in Cloudflare Zero Trust:
//   teamDomain: Settings → Custom pages → Team domain, e.g. "triodian.cloudflareaccess.com"
//   aud:        Access → Applications → Risk Appetite → Overview → "Application Audience (AUD) Tag"
// They can also be set as variables ACCESS_TEAM_DOMAIN and ACCESS_AUD on the Worker.
export const ACCESS = {
  teamDomain: '',
  aud: '',
};
