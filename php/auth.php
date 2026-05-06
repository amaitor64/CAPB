<?php

declare(strict_types=1);

const CAPB_ALLOWED_EMAIL_DOMAIN = '@communaute-paysbasque.fr';
const CAPB_SESSION_COOKIE = 'capb_session';
const CAPB_SESSION_TTL = 3600;
const CAPB_OAUTH_STATE_TTL = 600;
const CAPB_DEFAULT_OIDC_METADATA = [
    'issuer' => 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN',
    'authorization_endpoint' => 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/auth',
    'token_endpoint' => 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/token',
    'introspection_endpoint' => 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/token/introspect',
    'userinfo_endpoint' => 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/userinfo',
    'end_session_endpoint' => 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/logout',
    'jwks_uri' => 'https://connect.elmn.communaute-paysbasque.fr/realms/ELMN/protocol/openid-connect/certs',
];

function capb_auth_secret(): string
{
    $secret = getenv('AUTH_SECRET') ?: '';
    if ($secret === '') {
        throw new RuntimeException('AUTH_SECRET is not configured');
    }

    return $secret;
}

function capb_normalize_email(?string $value): string
{
    return strtolower(trim((string) $value));
}

function capb_is_allowed_email(string $email): bool
{
    return str_ends_with(capb_normalize_email($email), CAPB_ALLOWED_EMAIL_DOMAIN);
}

function capb_sign_token(array $payload, string $secret): string
{
    $encodedPayload = rtrim(strtr(base64_encode(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)), '+/', '-_'), '=');
    $signature = hash_hmac('sha256', $encodedPayload, $secret, true);
    $encodedSignature = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

    return $encodedPayload . '.' . $encodedSignature;
}

function capb_verify_token(?string $token, string $secret): ?array
{
    if (!$token || !str_contains($token, '.')) {
        return null;
    }

    [$encodedPayload, $encodedSignature] = explode('.', $token, 2);
    if ($encodedPayload === '' || $encodedSignature === '') {
        return null;
    }

    $expectedSignature = rtrim(strtr(base64_encode(hash_hmac('sha256', $encodedPayload, $secret, true)), '+/', '-_'), '=');
    if (!hash_equals($expectedSignature, $encodedSignature)) {
        return null;
    }

    $json = base64_decode(strtr($encodedPayload, '-_', '+/'), true);
    if ($json === false) {
        return null;
    }

    $payload = json_decode($json, true);
    return is_array($payload) ? $payload : null;
}

function capb_create_session_token(string $email, string $secret): string
{
    $now = time();
    return capb_sign_token([
        'type' => 'session',
        'email' => $email,
        'iat' => $now,
        'exp' => $now + CAPB_SESSION_TTL,
    ], $secret);
}

function capb_create_oauth_state_token(string $nextPath, string $secret): string
{
    $now = time();
    return capb_sign_token([
        'type' => 'oauth_state',
        'next' => capb_sanitize_next($nextPath),
        'iat' => $now,
        'exp' => $now + CAPB_OAUTH_STATE_TTL,
        'nonce' => bin2hex(random_bytes(8)),
    ], $secret);
}

function capb_get_session(): ?array
{
    try {
        $secret = capb_auth_secret();
    } catch (RuntimeException) {
        return null;
    }

    $token = $_COOKIE[CAPB_SESSION_COOKIE] ?? null;
    $payload = capb_verify_token(is_string($token) ? $token : null, $secret);

    if (!$payload || ($payload['type'] ?? null) !== 'session' || (int) ($payload['exp'] ?? 0) <= time()) {
        return null;
    }

    return $payload;
}

function capb_sanitize_next(?string $next): string
{
    if (!$next || $next[0] !== '/' || str_starts_with($next, '//')) {
        return '/';
    }

    return $next;
}

function capb_oauth_config(): ?array
{
    if ((getenv('OAUTH2_ENABLED') ?: '') !== 'true') {
        return null;
    }

    $clientId = trim((string) getenv('OAUTH2_CLIENT_ID'));
    $clientSecret = trim((string) getenv('OAUTH2_CLIENT_SECRET'));
    $redirectUri = trim((string) getenv('OAUTH2_REDIRECT_URI'));
    $scope = trim((string) getenv('OAUTH2_SCOPE')) ?: 'openid profile email';
    $providerName = trim((string) getenv('OAUTH2_PROVIDER_NAME')) ?: 'ELMN';

    if ($clientId === '' || $clientSecret === '') {
        return null;
    }

    if ($redirectUri === '') {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $redirectUri = $scheme . '://' . $host . '/api/auth/oauth-callback';
    }

    return [
        'clientId' => $clientId,
        'clientSecret' => $clientSecret,
        'redirectUri' => $redirectUri,
        'scope' => $scope,
        'providerName' => $providerName,
        'authorizeUrl' => getenv('OAUTH2_AUTHORIZE_URL') ?: CAPB_DEFAULT_OIDC_METADATA['authorization_endpoint'],
        'tokenUrl' => getenv('OAUTH2_TOKEN_URL') ?: CAPB_DEFAULT_OIDC_METADATA['token_endpoint'],
        'userInfoUrl' => getenv('OAUTH2_USERINFO_URL') ?: CAPB_DEFAULT_OIDC_METADATA['userinfo_endpoint'],
        'metadata' => CAPB_DEFAULT_OIDC_METADATA,
    ];
}

function capb_build_oauth_authorize_url(string $next): ?string
{
    $oauth = capb_oauth_config();
    if (!$oauth) {
        return null;
    }

    $secret = capb_auth_secret();
    $state = capb_create_oauth_state_token($next, $secret);
    $params = http_build_query([
        'response_type' => 'code',
        'client_id' => $oauth['clientId'],
        'redirect_uri' => $oauth['redirectUri'],
        'scope' => $oauth['scope'],
        'state' => $state,
    ]);

    return $oauth['authorizeUrl'] . '?' . $params;
}

function capb_extract_email(array $claims): string
{
    foreach (['email', 'preferred_username', 'upn', 'unique_name'] as $key) {
        $value = capb_normalize_email($claims[$key] ?? '');
        if ($value !== '') {
            return $value;
        }
    }

    return '';
}

function capb_decode_jwt_payload(?string $token): ?array
{
    if (!$token || !str_contains($token, '.')) {
        return null;
    }

    $parts = explode('.', $token);
    if (count($parts) < 2) {
        return null;
    }

    $json = base64_decode(strtr($parts[1], '-_', '+/'), true);
    if ($json === false) {
        return null;
    }

    $payload = json_decode($json, true);
    return is_array($payload) ? $payload : null;
}

function capb_json(array $body, int $status = 200, array $headers = []): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    foreach ($headers as $name => $value) {
        header($name . ': ' . $value, true);
    }
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function capb_redirect(string $location, int $status = 302): never
{
    header('Location: ' . $location, true, $status);
    exit;
}

function capb_set_session_cookie(string $token): void
{
    setcookie(CAPB_SESSION_COOKIE, $token, [
        'expires' => time() + CAPB_SESSION_TTL,
        'path' => '/',
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Strict',
    ]);
}

function capb_clear_session_cookie(): void
{
    setcookie(CAPB_SESSION_COOKIE, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Strict',
    ]);
}

function capb_require_auth(): void
{
    if (capb_get_session()) {
        return;
    }

    $next = capb_sanitize_next($_SERVER['REQUEST_URI'] ?? '/');
    $authorizeUrl = capb_build_oauth_authorize_url($next);
    if ($authorizeUrl) {
        capb_redirect($authorizeUrl);
    }

    capb_redirect('/auth/?next=' . rawurlencode($next));
}
