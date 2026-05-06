<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/php/auth.php';

function capb_oauth_auth_redirect(string $next, string $error): never
{
    capb_redirect('/auth/?next=' . rawurlencode($next) . '&error=' . rawurlencode($error));
}

$secret = capb_auth_secret();
$stateToken = (string) ($_GET['state'] ?? '');
$statePayload = capb_verify_token($stateToken, $secret);
$next = capb_sanitize_next($statePayload['next'] ?? '/');

if (!$statePayload || ($statePayload['type'] ?? null) !== 'oauth_state' || (int) ($statePayload['exp'] ?? 0) <= time()) {
    capb_oauth_auth_redirect($next, 'Session OAuth2 expirée ou invalide.');
}

if (!empty($_GET['error'])) {
    capb_oauth_auth_redirect($next, (string) ($_GET['error_description'] ?? $_GET['error']));
}

$code = (string) ($_GET['code'] ?? '');
if ($code === '') {
    capb_oauth_auth_redirect($next, 'Code OAuth2 manquant.');
}

$oauth = capb_oauth_config();
if (!$oauth) {
    capb_oauth_auth_redirect($next, 'OAuth2 non configuré.');
}

$tokenResponse = capb_post_form($oauth['tokenUrl'], [
    'grant_type' => 'authorization_code',
    'code' => $code,
    'redirect_uri' => $oauth['redirectUri'],
    'client_id' => $oauth['clientId'],
    'client_secret' => $oauth['clientSecret'],
]);

if (($tokenResponse['status'] ?? 500) >= 400 || !is_array($tokenResponse['json'] ?? null)) {
    capb_oauth_auth_redirect($next, 'Échange OAuth2 impossible.');
}

$tokenSet = $tokenResponse['json'];
$email = '';
if (!empty($tokenSet['id_token'])) {
    $claims = capb_decode_jwt_payload((string) $tokenSet['id_token']);
    $email = capb_extract_email(is_array($claims) ? $claims : []);
}

if ($email === '' && !empty($tokenSet['access_token']) && !empty($oauth['userInfoUrl'])) {
    $userInfo = capb_get_json($oauth['userInfoUrl'], (string) $tokenSet['access_token']);
    $email = capb_extract_email($userInfo);
}

if ($email === '' || !capb_is_allowed_email($email)) {
    capb_oauth_auth_redirect($next, 'Compte OAuth2 non autorisé pour ce site.');
}

capb_set_session_cookie(capb_create_session_token($email, $secret));
capb_redirect($next);

function capb_post_form(string $url, array $data): array
{
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => http_build_query($data),
            'ignore_errors' => true,
        ],
    ]);

    $body = file_get_contents($url, false, $context);
    $status = 500;
    foreach ($http_response_header ?? [] as $headerLine) {
        if (preg_match('#HTTP/\S+\s+(\d{3})#', $headerLine, $matches)) {
            $status = (int) $matches[1];
            break;
        }
    }

    return [
        'status' => $status,
        'json' => is_string($body) ? json_decode($body, true) : null,
    ];
}

function capb_get_json(string $url, string $accessToken): array
{
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "Authorization: Bearer {$accessToken}\r\nIgnore-Errors: true\r\n",
            'ignore_errors' => true,
        ],
    ]);

    $body = file_get_contents($url, false, $context);
    $json = is_string($body) ? json_decode($body, true) : null;

    return is_array($json) ? $json : [];
}
