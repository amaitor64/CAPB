import { clearCookie, jsonResponse, SESSION_COOKIE_NAME } from '../_lib/auth.js';

export function POST() {
  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.append('set-cookie', clearCookie(SESSION_COOKIE_NAME));
  return jsonResponse({ ok: true }, { headers });
}
