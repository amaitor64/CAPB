<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/php/auth.php';

$session = capb_get_session();
$next = capb_sanitize_next($_GET['next'] ?? capb_app_url('/auth/'));
$idTokenHint = is_string($session['id_token'] ?? null) ? (string) $session['id_token'] : null;
$redirectUrl = capb_logout_redirect_url($next, $idTokenHint);

capb_clear_session_cookie();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    capb_json(['ok' => true, 'redirect' => $redirectUrl], 200, ['Cache-Control' => 'no-store']);
}

capb_redirect($redirectUrl);
