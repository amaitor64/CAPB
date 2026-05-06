<?php

declare(strict_types=1);

require_once __DIR__ . '/php/auth.php';
capb_require_auth();
readfile(__DIR__ . '/index.html');
