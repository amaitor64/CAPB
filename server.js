import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { next as vercelNext } from '@vercel/functions';

import { GET as getContacts } from './api/contacts.js';
import { GET as getSession } from './api/auth/session.js';
import { POST as postTouch } from './api/auth/touch.js';
import { POST as postLogout } from './api/auth/logout.js';
import { GET as getOauthStart } from './api/auth/oauth-start.js';
import { GET as getOauthCallback } from './api/auth/oauth-callback.js';
import { getOAuthConfig, getSessionFromRequest, sanitizeNextPath } from './api/_lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const PUBLIC_PREFIXES = ['/auth/', '/api/auth/', '/icons/'];
const PUBLIC_EXACT = ['/auth', '/manifest.webmanifest', '/service-worker.js'];
const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8']
]);

const apiRoutes = new Map([
  ['GET /api/contacts', getContacts],
  ['GET /api/auth/session', getSession],
  ['POST /api/auth/touch', postTouch],
  ['POST /api/auth/logout', postLogout],
  ['GET /api/auth/oauth-start', getOauthStart],
  ['GET /api/auth/oauth-callback', getOauthCallback]
]);

createServer(async (req, res) => {
  try {
    const request = await toWebRequest(req);
    const url = new URL(request.url);
    const pathname = url.pathname;

    const apiHandler = apiRoutes.get(`${request.method} ${pathname}`);
    if (apiHandler) {
      const response = await apiHandler(request);
      await sendWebResponse(res, response);
      return;
    }

    const session = getSessionFromRequest(request);
    const isPublic = PUBLIC_EXACT.includes(pathname) || PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));

    if (!session && !isPublic) {
      const nextPath = sanitizeNextPath(`${pathname}${url.search}`);
      const oauth = getOAuthConfig(url.origin);
      const redirectUrl = new URL(oauth ? '/api/auth/oauth-start' : '/auth/', url.origin);
      redirectUrl.searchParams.set('next', nextPath);
      res.writeHead(302, { location: redirectUrl.toString(), 'cache-control': 'no-store' });
      res.end();
      return;
    }

    const filePath = resolveStaticPath(pathname);
    if (!filePath) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const body = await readFile(filePath);
    const contentType = MIME_TYPES.get(path.extname(filePath)) || 'application/octet-stream';
    res.writeHead(200, { 'content-type': contentType });
    res.end(body);
  } catch (error) {
    console.error('server failed', error);
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
}).listen(PORT, () => {
  console.log(`CAPB server listening on http://0.0.0.0:${PORT}`);
});

async function toWebRequest(req) {
  const proto = headerValue(req.headers['x-forwarded-proto']) || 'http';
  const host = headerValue(req.headers.host) || `localhost:${PORT}`;
  const url = `${proto}://${host}${req.url || '/'}`;
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const method = req.method || 'GET';
  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method, headers });
  }

  const body = await readRequestBody(req);
  return new Request(url, { method, headers, body, duplex: 'half' });
}

async function sendWebResponse(res, response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      const existing = headers['set-cookie'];
      headers['set-cookie'] = existing ? [].concat(existing, value) : value;
      return;
    }
    headers[key] = value;
  });

  res.writeHead(response.status, headers);
  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

function resolveStaticPath(pathname) {
  const normalized = pathname === '/' ? '/index.html' : pathname;
  const requestedPath = normalized.endsWith('/') ? `${normalized}index.html` : normalized;
  const safePath = path.normalize(requestedPath).replace(/^([.][.][/\\])+/, '');
  const absolutePath = path.join(__dirname, safePath);

  if (!absolutePath.startsWith(__dirname)) {
    return null;
  }

  return absolutePath;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function headerValue(value) {
  return Array.isArray(value) ? value[0] : value || '';
}
