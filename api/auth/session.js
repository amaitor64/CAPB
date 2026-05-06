import { getSessionFromRequest, jsonResponse } from '../_lib/auth.js';

export function GET(request) {
  const session = getSessionFromRequest(request);
  return jsonResponse(
    {
      authenticated: Boolean(session),
      email: session?.email || null
    },
    {
      headers: {
        'cache-control': 'no-store'
      }
    }
  );
}

export default function handler(request) {
  if (request.method !== 'GET') {
    return jsonResponse({ authenticated: false, error: 'Méthode non autorisée.' }, { status: 405 });
  }

  return GET(request);
}
