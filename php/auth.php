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

function capb_is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }

    $forwardedProto = strtolower(trim((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')));
    if ($forwardedProto !== '') {
        return in_array($forwardedProto, ['https', 'wss'], true);
    }

    return false;
}

function capb_base_path(): string
{
    $configured = trim((string) getenv('APP_BASE_PATH'));
    if ($configured !== '') {
        $configured = '/' . trim($configured, '/');
        return $configured === '/' ? '' : $configured;
    }

    $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    foreach (['/api/auth', '/api', '/auth', '/pshtbt', '/psbt', '/psii', '/pi'] as $marker) {
        $position = strpos($scriptName, $marker . '/');
        if ($position !== false) {
            return rtrim(substr($scriptName, 0, $position), '/');
        }
    }

    return '';
}

function capb_app_url(string $path): string
{
    $basePath = capb_base_path();
    $normalizedPath = '/' . ltrim($path, '/');
    return ($basePath === '' ? '' : $basePath) . $normalizedPath;
}

function capb_normalize_email(?string $value): string
{
    return strtolower(trim((string) $value));
}

function capb_is_allowed_email(string $email): bool
{
    return str_ends_with(capb_normalize_email($email), CAPB_ALLOWED_EMAIL_DOMAIN);
}

function capb_base64url_decode(string $value): string|false
{
    $padding = strlen($value) % 4;
    if ($padding > 0) {
        $value .= str_repeat('=', 4 - $padding);
    }

    return base64_decode(strtr($value, '-_', '+/'), true);
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

    $json = capb_base64url_decode($encodedPayload);
    if ($json === false) {
        return null;
    }

    $payload = json_decode($json, true);
    return is_array($payload) ? $payload : null;
}

function capb_create_session_token(string $email, string $secret, ?string $idToken = null): string
{
    $now = time();
    $payload = [
        'type' => 'session',
        'email' => $email,
        'iat' => $now,
        'exp' => $now + CAPB_SESSION_TTL,
    ];

    if (is_string($idToken) && $idToken !== '') {
        $payload['id_token'] = $idToken;
    }

    return capb_sign_token($payload, $secret);
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
        return capb_app_url('/');
    }

    $path = parse_url($next, PHP_URL_PATH);
    if (!is_string($path) || $path === '' || $path[0] !== '/' || str_starts_with($path, '//')) {
        return capb_app_url('/');
    }

    $basePath = capb_base_path();
    if ($basePath !== '' && !str_starts_with($path, $basePath . '/') && $path !== $basePath) {
        return capb_app_url('/');
    }

    $query = parse_url($next, PHP_URL_QUERY);
    if (!is_string($query) || $query === '') {
        return $path;
    }

    return $path . '?' . $query;
}

function capb_current_request_next(): string
{
    $requestUri = (string) ($_SERVER['REQUEST_URI'] ?? '');
    $path = parse_url($requestUri, PHP_URL_PATH);
    if (!is_string($path) || $path === '') {
        return capb_app_url('/');
    }

    $basePath = capb_base_path();
    if ($basePath !== '' && !str_starts_with($path, $basePath . '/') && $path !== $basePath) {
        return capb_app_url('/');
    }

    return capb_sanitize_next($requestUri);
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
        $scheme = capb_is_https() ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $redirectUri = $scheme . '://' . $host . capb_app_url('/api/auth/oauth-callback');
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

    $json = capb_base64url_decode($parts[1]);
    if ($json === false) {
        return null;
    }

    $payload = json_decode($json, true);
    return is_array($payload) ? $payload : null;
}

function capb_validate_id_token_claims(array $claims, array $oauth): bool
{
    $issuer = (string) ($claims['iss'] ?? '');
    $expectedIssuer = (string) ($oauth['metadata']['issuer'] ?? '');
    if ($issuer === '' || $expectedIssuer === '' || !hash_equals($expectedIssuer, $issuer)) {
        return false;
    }

    $audience = $claims['aud'] ?? null;
    $clientId = (string) ($oauth['clientId'] ?? '');
    $audiences = is_array($audience) ? $audience : [$audience];
    if ($clientId === '' || !in_array($clientId, $audiences, true)) {
        return false;
    }

    if ((int) ($claims['exp'] ?? 0) <= time()) {
        return false;
    }

    return true;
}

function capb_logout_redirect_url(?string $next = null, ?string $idTokenHint = null): string
{
    $target = capb_sanitize_next($next ?? capb_app_url('/auth/'));
    if ($target === capb_app_url('/')) {
        $target = capb_app_url('/auth/');
    }

    $oauth = capb_oauth_config();
    $endSessionUrl = (string) ($oauth['metadata']['end_session_endpoint'] ?? '');
    if ($endSessionUrl === '' || !is_string($idTokenHint) || $idTokenHint === '') {
        return $target;
    }

    $scheme = capb_is_https() ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $postLogoutRedirect = $scheme . '://' . $host . $target;

    return $endSessionUrl . '?' . http_build_query([
        'post_logout_redirect_uri' => $postLogoutRedirect,
        'id_token_hint' => $idTokenHint,
    ]);
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
        'path' => capb_app_url('/'),
        'httponly' => true,
        'secure' => capb_is_https(),
        'samesite' => 'Lax',
    ]);
}

function capb_clear_session_cookie(): void
{
    setcookie(CAPB_SESSION_COOKIE, '', [
        'expires' => time() - 3600,
        'path' => capb_app_url('/'),
        'httponly' => true,
        'secure' => capb_is_https(),
        'samesite' => 'Lax',
    ]);
}

function capb_require_auth(?string $next = null): void
{
    if (capb_get_session()) {
        return;
    }

    $target = $next !== null ? capb_sanitize_next($next) : capb_current_request_next();
    $authorizeUrl = capb_build_oauth_authorize_url($target);
    if ($authorizeUrl) {
        capb_redirect($authorizeUrl);
    }

    capb_redirect(capb_app_url('/auth/') . '?next=' . rawurlencode($target));
}
