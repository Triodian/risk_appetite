// Send visitors from the default Cloudflare address to the real address,
// so the Cloudflare Access sign-in on risk-appetite.triodian.com always applies.
const CANONICAL = 'risk-appetite.triodian.com';

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === 'risk-appetite.pages.dev') {
    url.hostname = CANONICAL;
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
