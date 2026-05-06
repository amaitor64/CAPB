import {
  createSessionToken,
  getSessionFromRequest,
  getAuthSecret,
  jsonResponse,
  serializeCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS
} from '../_lib/auth.js';

export function POST(request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonResponse({ ok: false, error: 'Session absente.' }, { status: 401 });
  }

  let secret;
  try {
    secret = getAuthSecret();
  } catch {
    return jsonResponse({ ok: false, error: 'Configuration d’authentification manquante.' }, { status: 500 });
  }

  const refreshedToken = createSessionToken(session.email, secret);

  return jsonResponse(
    { ok: true },
    {
      headers: {
        'cache-control': 'no-store',
        'set-cookie': serializeCookie(SESSION_COOKIE_NAME, refreshedToken, {
          maxAge: SESSION_TTL_SECONDS,
          sameSite: 'Strict'
        })
      }
    }
  );
}
