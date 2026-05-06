<?php

declare(strict_types=1);

require_once __DIR__ . '/php/auth.php';
capb_require_auth(capb_app_url('/'));
readfile(__DIR__ . '/index.html');
