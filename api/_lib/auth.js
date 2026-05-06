import crypto from 'node:crypto';

export const ALLOWED_EMAIL_DOMAIN = '@communaute-paysbasque.fr';
export const OTP_COOKIE_NAME = 'capb_pending_otp';
export const SESSION_COOKIE_NAME = 'capb_session';
export const OTP_TTL_SECONDS = 10 * 60;
export const SESSION_TTL_SECONDS = 60 * 60;

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

export function generateOtpCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
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

export function createOtpToken(email, code, secret) {
  const now = Math.floor(Date.now() / 1000);
  return signToken({
    type: 'otp',
    email,
    code,
    iat: now,
    exp: now + OTP_TTL_SECONDS,
    nonce: crypto.randomBytes(8).toString('hex')
  }, secret);
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
  const secret = getAuthSecret();
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const token = cookies[SESSION_COOKIE_NAME];
  const payload = verifyToken(token, secret);

  if (!payload || payload.type !== 'session' || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
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
