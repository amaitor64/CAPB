import { getSessionFromRequest, jsonResponse } from '../_lib/auth.js';

export function GET(request) {
  try {
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
  } catch {
    return jsonResponse(
      {
        authenticated: false,
        email: null
      },
      {
        headers: {
          'cache-control': 'no-store'
        }
      }
    );
  }
}
