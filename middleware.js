import { getSessionFromRequest, sanitizeNextPath } from './api/_lib/auth.js';

const PUBLIC_PREFIXES = ['/auth/', '/api/auth/', '/icons/'];
const PUBLIC_EXACT = ['/auth', '/manifest.webmanifest', '/service-worker.js'];

export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!.*\\.).*)', '/manifest.webmanifest', '/service-worker.js', '/icons/:path*', '/api/:path*']
};

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (PUBLIC_EXACT.includes(pathname) || PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return;
  }

  const session = getSessionFromRequest(request);
  if (session) {
    return;
  }

  if (pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ ok: false, error: 'Authentification requise.' }), {
      status: 401,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  }

  const nextPath = sanitizeNextPath(`${pathname}${url.search}`);
  const redirectUrl = new URL('/auth/', url.origin);
  redirectUrl.searchParams.set('next', nextPath);

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl.toString(),
      'cache-control': 'no-store'
    }
  });
}
