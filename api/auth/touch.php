<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/php/auth.php';

$session = capb_get_session();
if (!$session) {
    capb_json(['ok' => false, 'error' => 'Session absente.'], 401);
}

$secret = capb_auth_secret();
capb_set_session_cookie(capb_create_session_token((string) $session['email'], $secret));
capb_json(['ok' => true], 200, ['Cache-Control' => 'no-store']);
