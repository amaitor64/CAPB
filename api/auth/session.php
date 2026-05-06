<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/php/auth.php';

$session = capb_get_session();
capb_json([
    'authenticated' => (bool) $session,
    'email' => $session['email'] ?? null,
], 200, ['Cache-Control' => 'no-store']);
