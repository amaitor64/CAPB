import crypto from 'node:crypto';

export const ALLOWED_EMAIL_DOMAIN = '@communaute-paysbasque.fr';
export const SESSION_COOKIE_NAME = 'capb_session';
export const SESSION_TTL_SECONDS = 60 * 60;
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;

const DEFAULT_OIDC_METADATA = {
  issuer: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN',
  authorization_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/auth',
  token_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/token',
  introspection_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/token/introspect',
  userinfo_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/userinfo',
  end_session_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/logout',
  frontchannel_logout_session_supported: true,
  frontchannel_logout_supported: true,
  jwks_uri: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/certs',
  check_session_iframe: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/login-status-iframe.html',
  grant_types_supported: ['authorization_code', 'client_credentials', 'implicit', 'password', 'refresh_token', 'urn:ietf:params:oauth:grant-type:device_code', 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'urn:ietf:params:oauth:grant-type:token-exchange', 'urn:ietf:params:oauth:grant-type:uma-ticket', 'urn:openid:params:grant-type:ciba'],
  acr_values_supported: ['0', '1'],
  response_types_supported: ['code', 'none', 'id_token', 'token', 'id_token token', 'code id_token', 'code token', 'code id_token token'],
  subject_types_supported: ['public', 'pairwise'],
  prompt_values_supported: ['none', 'login', 'consent'],
  id_token_signing_alg_values_supported: ['PS384', 'RS384', 'EdDSA', 'ES384', 'HS256', 'HS512', 'ES256', 'RS256', 'HS384', 'ES512', 'PS256', 'PS512', 'RS512'],
  id_token_encryption_alg_values_supported: ['ECDH-ES+A256KW', 'ECDH-ES+A192KW', 'ECDH-ES+A128KW', 'RSA-OAEP', 'RSA-OAEP-256', 'RSA1_5', 'ECDH-ES'],
  id_token_encryption_enc_values_supported: ['A256GCM', 'A192GCM', 'A128GCM', 'A128CBC-HS256', 'A192CBC-HS384', 'A256CBC-HS512'],
  userinfo_signing_alg_values_supported: ['PS384', 'RS384', 'EdDSA', 'ES384', 'HS256', 'HS512', 'ES256', 'RS256', 'HS384', 'ES512', 'PS256', 'PS512', 'RS512', 'none'],
  userinfo_encryption_alg_values_supported: ['ECDH-ES+A256KW', 'ECDH-ES+A192KW', 'ECDH-ES+A128KW', 'RSA-OAEP', 'RSA-OAEP-256', 'RSA1_5', 'ECDH-ES'],
  userinfo_encryption_enc_values_supported: ['A256GCM', 'A192GCM', 'A128GCM', 'A128CBC-HS256', 'A192CBC-HS384', 'A256CBC-HS512'],
  request_object_signing_alg_values_supported: ['PS384', 'RS384', 'EdDSA', 'ES384', 'HS256', 'HS512', 'ES256', 'RS256', 'HS384', 'ES512', 'PS256', 'PS512', 'RS512', 'none'],
  request_object_encryption_alg_values_supported: ['ECDH-ES+A256KW', 'ECDH-ES+A192KW', 'ECDH-ES+A128KW', 'RSA-OAEP', 'RSA-OAEP-256', 'RSA1_5', 'ECDH-ES'],
  request_object_encryption_enc_values_supported: ['A256GCM', 'A192GCM', 'A128GCM', 'A128CBC-HS256', 'A192CBC-HS384', 'A256CBC-HS512'],
  response_modes_supported: ['query', 'fragment', 'form_post', 'query.jwt', 'fragment.jwt', 'form_post.jwt', 'jwt'],
  registration_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/clients-registrations/openid-connect',
  token_endpoint_auth_methods_supported: ['private_key_jwt', 'client_secret_basic', 'client_secret_post', 'tls_client_auth', 'client_secret_jwt'],
  token_endpoint_auth_signing_alg_values_supported: ['PS384', 'RS384', 'EdDSA', 'ES384', 'HS256', 'HS512', 'ES256', 'RS256', 'HS384', 'ES512', 'PS256', 'PS512', 'RS512'],
  introspection_endpoint_auth_methods_supported: ['private_key_jwt', 'client_secret_basic', 'client_secret_post', 'tls_client_auth', 'client_secret_jwt'],
  introspection_endpoint_auth_signing_alg_values_supported: ['PS384', 'RS384', 'EdDSA', 'ES384', 'HS256', 'HS512', 'ES256', 'RS256', 'HS384', 'ES512', 'PS256', 'PS512', 'RS512'],
  authorization_signing_alg_values_supported: ['PS384', 'RS384', 'EdDSA', 'ES384', 'HS256', 'HS512', 'ES256', 'RS256', 'HS384', 'ES512', 'PS256', 'PS512', 'RS512'],
  authorization_encryption_alg_values_supported: ['ECDH-ES+A256KW', 'ECDH-ES+A192KW', 'ECDH-ES+A128KW', 'RSA-OAEP', 'RSA-OAEP-256', 'RSA1_5', 'ECDH-ES'],
  authorization_encryption_enc_values_supported: ['A256GCM', 'A192GCM', 'A128GCM', 'A128CBC-HS256', 'A192CBC-HS384', 'A256CBC-HS512'],
  claims_supported: ['iss', 'sub', 'aud', 'exp', 'iat', 'auth_time', 'name', 'given_name', 'family_name', 'preferred_username', 'email', 'acr', 'azp', 'nonce'],
  claim_types_supported: ['normal'],
  claims_parameter_supported: true,
  scopes_supported: ['openid', 'profile', 'acr', 'roles', 'web-origins', 'service_account', 'email', 'groups', 'microprofile-jwt', 'address', 'phone', 'offline_access', 'basic'],
  request_parameter_supported: true,
  request_uri_parameter_supported: true,
  require_request_uri_registration: true,
  code_challenge_methods_supported: ['plain', 'S256'],
  tls_client_certificate_bound_access_tokens: true,
  dpop_signing_alg_values_supported: ['PS384', 'RS384', 'EdDSA', 'ES384', 'ES256', 'RS256', 'ES512', 'PS256', 'PS512', 'RS512'],
  revocation_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/revoke',
  revocation_endpoint_auth_methods_supported: ['private_key_jwt', 'client_secret_basic', 'client_secret_post', 'tls_client_auth', 'client_secret_jwt'],
  revocation_endpoint_auth_signing_alg_values_supported: ['PS384', 'RS384', 'EdDSA', 'ES384', 'HS256', 'HS512', 'ES256', 'RS256', 'HS384', 'ES512', 'PS256', 'PS512', 'RS512'],
  backchannel_logout_supported: true,
  backchannel_logout_session_supported: true,
  device_authorization_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/auth/device',
  backchannel_token_delivery_modes_supported: ['poll', 'ping'],
  backchannel_authentication_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/ext/ciba/auth',
  backchannel_authentication_request_signing_alg_values_supported: ['PS384', 'RS384', 'EdDSA', 'ES384', 'ES256', 'RS256', 'ES512', 'PS256', 'PS512', 'RS512'],
  require_pushed_authorization_requests: false,
  pushed_authorization_request_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/ext/par/request',
  mtls_endpoint_aliases: {
    token_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/token',
    revocation_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/revoke',
    introspection_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/token/introspect',
    device_authorization_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/auth/device',
    registration_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/clients-registrations/openid-connect',
    userinfo_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/userinfo',
    pushed_authorization_request_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/ext/par/request',
    backchannel_authentication_endpoint: 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/ext/ciba/auth'
  },
  authorization_response_iss_parameter_supported: true,
  client_id_metadata_document_supported: false
};

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
  const authorizeUrl = String(process.env.OAUTH2_AUTHORIZE_URL || '').trim() || DEFAULT_OIDC_METADATA.authorization_endpoint;
  const tokenUrl = String(process.env.OAUTH2_TOKEN_URL || '').trim() || DEFAULT_OIDC_METADATA.token_endpoint;
  const userInfoUrl = String(process.env.OAUTH2_USERINFO_URL || '').trim() || DEFAULT_OIDC_METADATA.userinfo_endpoint;
  const redirectUri = String(process.env.OAUTH2_REDIRECT_URI || '').trim() || (origin ? `${origin}/api/auth/oauth-callback` : '');
  const scope = String(process.env.OAUTH2_SCOPE || 'openid profile email').trim();
  const providerName = String(process.env.OAUTH2_PROVIDER_NAME || 'SSO CAPB').trim();
  const issuer = String(process.env.OAUTH2_ISSUER || '').trim() || DEFAULT_OIDC_METADATA.issuer;
  const introspectionUrl = String(process.env.OAUTH2_INTROSPECTION_URL || '').trim() || DEFAULT_OIDC_METADATA.introspection_endpoint;
  const endSessionUrl = String(process.env.OAUTH2_END_SESSION_URL || '').trim() || DEFAULT_OIDC_METADATA.end_session_endpoint;
  const jwksUri = String(process.env.OAUTH2_JWKS_URI || '').trim() || DEFAULT_OIDC_METADATA.jwks_uri;

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
    providerName,
    issuer,
    introspectionUrl,
    endSessionUrl,
    jwksUri,
    metadata: DEFAULT_OIDC_METADATA
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
