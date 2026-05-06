<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/php/auth.php';

if (!capb_get_session()) {
    capb_json(['ok' => false, 'error' => 'Authentification requise.'], 401);
}

$raw = getenv('CAPB_CONTACTS_JSON') ?: '';
if ($raw === '') {
    capb_json(['ok' => false, 'error' => 'Chargement des contacts impossible.'], 500);
}

$contacts = json_decode($raw, true);
if (!is_array($contacts)) {
    capb_json(['ok' => false, 'error' => 'Chargement des contacts impossible.'], 500);
}

capb_json(['ok' => true, 'contacts' => $contacts], 200, ['Cache-Control' => 'no-store']);
