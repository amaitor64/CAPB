import {
  clearCookie,
  createSessionToken,
  getAuthSecret,
  isAllowedEmail,
  jsonResponse,
  normalizeEmail,
  OTP_COOKIE_NAME,
  parseCookies,
  sanitizeNextPath,
  serializeCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  verifyToken
} from '../_lib/auth.js';

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Requête invalide.' }, { status: 400 });
  }

  const email = normalizeEmail(body?.email);
  const code = String(body?.code || '').trim();
  const nextPath = sanitizeNextPath(body?.next);

  if (!email || !isAllowedEmail(email) || !/^\d{6}$/.test(code)) {
    return jsonResponse({ ok: false, error: 'Code ou email invalide.' }, { status: 400 });
  }

  let secret;
  try {
    secret = getAuthSecret();
  } catch {
    return jsonResponse({ ok: false, error: 'Configuration d’authentification manquante.' }, { status: 500 });
  }

  const bypassAllowed = isEmergencyAccessAllowed(email, code);

  if (!bypassAllowed) {
    const cookies = parseCookies(request.headers.get('cookie') || '');
    const token = cookies[OTP_COOKIE_NAME];
    const payload = verifyToken(token, secret);
    const now = Math.floor(Date.now() / 1000);

    if (!payload || payload.type !== 'otp' || payload.exp <= now) {
      return jsonResponse({ ok: false, error: 'Code expiré ou introuvable.' }, { status: 400 });
    }

    if (payload.email !== email || payload.code !== code) {
      return jsonResponse({ ok: false, error: 'Code incorrect.' }, { status: 400 });
    }
  }

  const sessionToken = createSessionToken(email, secret);
  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.append('set-cookie', clearCookie(OTP_COOKIE_NAME));
  headers.append('set-cookie', serializeCookie(SESSION_COOKIE_NAME, sessionToken, {
    maxAge: SESSION_TTL_SECONDS,
    sameSite: 'Strict'
  }));

  return jsonResponse({ ok: true, redirectTo: nextPath }, { headers });
}

function isEmergencyAccessAllowed(email, code) {
  if (process.env.EMERGENCY_ACCESS_ENABLED !== 'true') {
    return false;
  }

  const allowedEmail = normalizeEmail(process.env.EMERGENCY_ACCESS_EMAIL || '');
  const allowedCode = String(process.env.EMERGENCY_ACCESS_CODE || '').trim();

  if (!allowedEmail || !/^\d{6}$/.test(allowedCode)) {
    return false;
  }

  return email === allowedEmail && code === allowedCode;
}
