<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/php/auth.php';
require_once dirname(__DIR__) . '/php/db.php';

if (!capb_get_session()) {
    capb_json(['ok' => false, 'error' => 'Authentification requise.'], 401);
}

$debugEnabled = (getenv('CAPB_DEBUG_DB') ?: '') === 'true';

try {
    $contacts = capb_fetch_contacts_tree();
} catch (Throwable $exception) {
    $body = [
        'ok' => false,
        'error' => 'Chargement des contacts impossible.',
    ];

    if ($debugEnabled) {
        $body['debug'] = [
            'message' => $exception->getMessage(),
            'type' => get_class($exception),
            'driver' => capb_db_driver(),
            'host' => capb_db_host(),
            'port' => capb_db_port(),
            'database' => capb_db_name(),
            'table' => capb_contacts_table(),
            'user' => capb_db_user(),
        ];
    }

    capb_json($body, 500);
}

if ($contacts === []) {
    $body = [
        'ok' => false,
        'error' => 'Aucun contact disponible en base.',
    ];

    if ($debugEnabled) {
        $body['debug'] = [
            'driver' => capb_db_driver(),
            'host' => capb_db_host(),
            'port' => capb_db_port(),
            'database' => capb_db_name(),
            'table' => capb_contacts_table(),
            'user' => capb_db_user(),
        ];
    }

    capb_json($body, 500);
}

capb_json(['ok' => true, 'contacts' => $contacts], 200, ['Cache-Control' => 'no-store']);
