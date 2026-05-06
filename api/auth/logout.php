<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/php/auth.php';

capb_clear_session_cookie();
capb_json(['ok' => true], 200, ['Cache-Control' => 'no-store']);
