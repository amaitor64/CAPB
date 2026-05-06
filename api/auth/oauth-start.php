<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/php/auth.php';

$oauth = capb_oauth_config();
if (!$oauth) {
    $next = capb_sanitize_next($_GET['next'] ?? '/');
    capb_redirect('/auth/?next=' . rawurlencode($next) . '&error=' . rawurlencode('OAuth2 non configuré.'));
}

$secret = capb_auth_secret();
$next = capb_sanitize_next($_GET['next'] ?? '/');
$state = capb_create_oauth_state_token($next, $secret);

$params = http_build_query([
    'response_type' => 'code',
    'client_id' => $oauth['clientId'],
    'redirect_uri' => $oauth['redirectUri'],
    'scope' => $oauth['scope'],
    'state' => $state,
]);

capb_redirect($oauth['authorizeUrl'] . '?' . $params);
