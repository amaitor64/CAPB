import {
  createOAuthStateToken,
  getAuthSecret,
  getOAuthConfig,
  sanitizeNextPath
} from '../_lib/auth.js';

export function GET(request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const nextPath = sanitizeNextPath(url.searchParams.get('next'));

  let secret;
  try {
    secret = getAuthSecret();
  } catch {
    return redirectToAuth(origin, nextPath, 'Configuration OAuth2 indisponible.');
  }

  const oauth = getOAuthConfig(origin);
  if (!oauth) {
    return redirectToAuth(origin, nextPath, 'OAuth2 n’est pas configuré sur Vercel.');
  }

  const state = createOAuthStateToken(nextPath, secret);
  const authorizeUrl = new URL(oauth.authorizeUrl);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', oauth.clientId);
  authorizeUrl.searchParams.set('redirect_uri', oauth.redirectUri);
  authorizeUrl.searchParams.set('scope', oauth.scope);
  authorizeUrl.searchParams.set('state', state);

  return Response.redirect(authorizeUrl, 302);
}

function redirectToAuth(origin, nextPath, errorMessage) {
  const redirectUrl = new URL('/auth/', origin);
  redirectUrl.searchParams.set('next', nextPath);
  redirectUrl.searchParams.set('error', errorMessage);
  return Response.redirect(redirectUrl, 302);
}
