import {
  clearCookie,
  createSessionToken,
  decodeJwtPayload,
  extractEmailFromClaims,
  getAuthSecret,
  getOAuthConfig,
  isAllowedEmail,
  normalizeEmail,
  OTP_COOKIE_NAME,
  sanitizeNextPath,
  serializeCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  verifyToken
} from '../_lib/auth.js';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = String(requestUrl.searchParams.get('code') || '');
  const state = String(requestUrl.searchParams.get('state') || '');
  const providerError = String(requestUrl.searchParams.get('error') || '');
  const providerErrorDescription = String(requestUrl.searchParams.get('error_description') || '');

  let secret;
  try {
    secret = getAuthSecret();
  } catch {
    return redirectToAuth(origin, '/', 'Configuration d’authentification indisponible.');
  }

  const statePayload = verifyToken(state, secret);
  const nextPath = sanitizeNextPath(statePayload?.next);

  if (!statePayload || statePayload.type !== 'oauth_state' || statePayload.exp <= Math.floor(Date.now() / 1000)) {
    return redirectToAuth(origin, nextPath, 'Session OAuth2 expirée ou invalide.');
  }

  if (providerError) {
    return redirectToAuth(origin, nextPath, providerErrorDescription || `Accès refusé par le fournisseur OAuth2: ${providerError}.`);
  }

  if (!code) {
    return redirectToAuth(origin, nextPath, 'Code OAuth2 manquant.');
  }

  const oauth = getOAuthConfig(origin);
  if (!oauth) {
    return redirectToAuth(origin, nextPath, 'OAuth2 n’est pas configuré sur Vercel.');
  }

  let tokenSet;
  try {
    tokenSet = await exchangeAuthorizationCode(oauth, code);
  } catch (error) {
    return redirectToAuth(origin, nextPath, error.message || 'Échange OAuth2 impossible.');
  }

  let email = '';

  if (tokenSet.id_token) {
    const claims = decodeJwtPayload(tokenSet.id_token);
    email = extractEmailFromClaims(claims);
  }

  if (!email && oauth.userInfoUrl && tokenSet.access_token) {
    try {
      const userInfo = await fetchUserInfo(oauth.userInfoUrl, tokenSet.access_token);
      email = extractEmailFromClaims(userInfo);
    } catch (error) {
      return redirectToAuth(origin, nextPath, error.message || 'Lecture du profil OAuth2 impossible.');
    }
  }

  email = normalizeEmail(email);
  if (!email || !isAllowedEmail(email)) {
    return redirectToAuth(origin, nextPath, 'Compte OAuth2 non autorisé pour ce site.');
  }

  const sessionToken = createSessionToken(email, secret);
  const headers = new Headers({ location: nextPath, 'cache-control': 'no-store' });
  headers.append('set-cookie', clearCookie(OTP_COOKIE_NAME));
  headers.append('set-cookie', serializeCookie(SESSION_COOKIE_NAME, sessionToken, {
    maxAge: SESSION_TTL_SECONDS,
    sameSite: 'Strict'
  }));

  return new Response(null, { status: 302, headers });
}

async function exchangeAuthorizationCode(oauth, code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: oauth.redirectUri,
    client_id: oauth.clientId,
    client_secret: oauth.clientSecret
  });

  const response = await fetch(oauth.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
  }

  if (!response.ok) {
    const details = String(data?.error_description || data?.error || '').trim();
    throw new Error(details || 'Le fournisseur OAuth2 a refusé l’échange du code.');
  }

  if (!data?.access_token && !data?.id_token) {
    throw new Error('Réponse OAuth2 incomplète.');
  }

  return data;
}

async function fetchUserInfo(userInfoUrl, accessToken) {
  const response = await fetch(userInfoUrl, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
  }

  if (!response.ok) {
    throw new Error('Lecture du profil utilisateur refusée par le fournisseur OAuth2.');
  }

  return data;
}

function redirectToAuth(origin, nextPath, errorMessage) {
  const redirectUrl = new URL('/auth/', origin);
  redirectUrl.searchParams.set('next', nextPath);
  redirectUrl.searchParams.set('error', errorMessage);
  return Response.redirect(redirectUrl, 302);
}
