<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/php/auth.php';
require_once dirname(__DIR__) . '/php/db.php';

if (!capb_get_session()) {
    capb_json(['ok' => false, 'error' => 'Authentification requise.'], 401);
}

try {
    $contacts = capb_fetch_contacts_tree();
} catch (Throwable $exception) {
    capb_json(['ok' => false, 'error' => 'Chargement des contacts impossible.'], 500);
}

if ($contacts === []) {
    capb_json(['ok' => false, 'error' => 'Aucun contact disponible en base.'], 500);
}

capb_json(['ok' => true, 'contacts' => $contacts], 200, ['Cache-Control' => 'no-store']);
