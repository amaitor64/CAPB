import crypto from 'node:crypto';

export const ALLOWED_EMAIL_DOMAIN = '@communaute-paysbasque.fr';
export const SESSION_COOKIE_NAME = 'capb_session';
export const SESSION_TTL_SECONDS = 60 * 60;
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not configured');
  }
  return secret;
}

export function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

export function isAllowedEmail(email) {
  return normalizeEmail(email).endsWith(ALLOWED_EMAIL_DOMAIN);
}

export function signToken(payload, secret) {
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = createSignature(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyToken(token, secret) {
  if (!token || !token.includes('.')) {
    return null;
  }

  const [encodedPayload, suppliedSignature] = token.split('.');
  if (!encodedPayload || !suppliedSignature) {
    return null;
  }

  const expectedSignature = createSignature(encodedPayload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

export function createSessionToken(email, secret) {
  const now = Math.floor(Date.now() / 1000);
  return signToken({
    type: 'session',
    email,
    iat: now,
    exp: now + SESSION_TTL_SECONDS
  }, secret);
}

export function createOAuthStateToken(nextPath, secret) {
  const now = Math.floor(Date.now() / 1000);
  return signToken({
    type: 'oauth_state',
    next: sanitizeNextPath(nextPath),
    iat: now,
    exp: now + OAUTH_STATE_TTL_SECONDS,
    nonce: crypto.randomBytes(8).toString('hex')
  }, secret);
}

export function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((accumulator, chunk) => {
    const trimmed = chunk.trim();
    if (!trimmed) {
      return accumulator;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      return accumulator;
    }

    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    accumulator[key] = decodeURIComponent(value);
    return accumulator;
  }, {});
}

export function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  parts.push(`Path=${options.path || '/'}`);

  if (options.httpOnly !== false) {
    parts.push('HttpOnly');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure !== false) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function clearCookie(name) {
  return serializeCookie(name, '', { maxAge: 0, sameSite: 'Strict' });
}

export function getSessionFromRequest(request) {
  let secret;
  try {
    secret = getAuthSecret();
  } catch {
    return null;
  }

  try {
    const cookies = parseCookies(request.headers.get('cookie') || '');
    const token = cookies[SESSION_COOKIE_NAME];
    const payload = verifyToken(token, secret);

    if (!payload || payload.type !== 'session' || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function sanitizeNextPath(nextValue) {
  if (!nextValue || typeof nextValue !== 'string') {
    return '/';
  }

  if (!nextValue.startsWith('/') || nextValue.startsWith('//')) {
    return '/';
  }

  return nextValue;
}

export function getOAuthConfig(origin = '') {
  if (process.env.OAUTH2_ENABLED !== 'true') {
    return null;
  }

  const clientId = String(process.env.OAUTH2_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.OAUTH2_CLIENT_SECRET || '').trim();
  const authorizeUrl = String(process.env.OAUTH2_AUTHORIZE_URL || '').trim();
  const tokenUrl = String(process.env.OAUTH2_TOKEN_URL || '').trim();
  const userInfoUrl = String(process.env.OAUTH2_USERINFO_URL || '').trim();
  const redirectUri = String(process.env.OAUTH2_REDIRECT_URI || '').trim() || (origin ? `${origin}/api/auth/oauth-callback` : '');
  const scope = String(process.env.OAUTH2_SCOPE || 'openid profile email').trim();
  const providerName = String(process.env.OAUTH2_PROVIDER_NAME || 'SSO CAPB').trim();

  if (!clientId || !clientSecret || !authorizeUrl || !tokenUrl || !redirectUri) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    authorizeUrl,
    tokenUrl,
    userInfoUrl,
    redirectUri,
    scope,
    providerName
  };
}

export function extractEmailFromClaims(claims) {
  if (!claims || typeof claims !== 'object') {
    return '';
  }

  const candidates = [
    claims.email,
    claims.preferred_username,
    claims.upn,
    claims.unique_name
  ];

  for (const value of candidates) {
    const email = normalizeEmail(value);
    if (email) {
      return email;
    }
  }

  return '';
}

export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

export function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { ...init, headers });
}

function createSignature(encodedPayload, secret) {
  return crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function base64url(value) {
  return Buffer.from(value, 'utf-8').toString('base64url');
}
