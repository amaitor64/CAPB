<?php

declare(strict_types=1);

function capb_db_driver(): string
{
    return strtolower(trim((string) getenv('CAPB_DB_DRIVER')) ?: 'mysql');
}

function capb_db_host(): string
{
    return trim((string) getenv('CAPB_DB_HOST')) ?: '192.168.15.253';
}

function capb_db_port(): int
{
    return (int) (getenv('CAPB_DB_PORT') ?: '3306');
}

function capb_db_name(): string
{
    return trim((string) getenv('CAPB_DB_NAME')) ?: 'exploitation';
}

function capb_db_charset(): string
{
    return trim((string) getenv('CAPB_DB_CHARSET')) ?: 'utf8mb4';
}

function capb_db_user(): string
{
    return trim((string) getenv('CAPB_DB_USER'));
}

function capb_db_password(): string
{
    return (string) getenv('CAPB_DB_PASSWORD');
}

function capb_contacts_table(): string
{
    $table = trim((string) getenv('CAPB_DB_CONTACTS_TABLE')) ?: 'contacts_secu';
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        throw new RuntimeException('CAPB_DB_CONTACTS_TABLE is invalid');
    }
    return $table;
}

function capb_db(): mysqli
{
    static $mysqli = null;
    if ($mysqli instanceof mysqli) {
        return $mysqli;
    }

    if (capb_db_driver() !== 'mysql') {
        throw new RuntimeException('Only MySQL / mysqli is supported on this host.');
    }

    if (!extension_loaded('mysqli')) {
        throw new RuntimeException('The mysqli extension is not available.');
    }

    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    $mysqli = new mysqli(
        capb_db_host(),
        capb_db_user(),
        capb_db_password(),
        capb_db_name(),
        capb_db_port()
    );

    $mysqli->set_charset(capb_db_charset());

    return $mysqli;
}

function capb_fetch_contacts_tree(): array
{
    $table = capb_contacts_table();
    $sql = "SELECT procedure_key, group_key, name, role, tel, label, link, link_label
            FROM {$table}
            WHERE is_active = 1
            ORDER BY procedure_key, group_key, sort_order, id";

    $result = capb_db()->query($sql);
    $contacts = [];

    while ($row = $result->fetch_assoc()) {
        $procedureKey = (string) $row['procedure_key'];
        $groupKey = (string) $row['group_key'];
        $contacts[$procedureKey] ??= [];
        $contacts[$procedureKey][$groupKey] ??= [];

        $item = [
            'name' => (string) $row['name'],
            'role' => (string) $row['role'],
            'tel' => (string) $row['tel'],
            'label' => (string) $row['label'],
        ];

        if (!empty($row['link'])) {
            $item['link'] = (string) $row['link'];
        }
        if (!empty($row['link_label'])) {
            $item['linkLabel'] = (string) $row['link_label'];
        }

        $contacts[$procedureKey][$groupKey][] = $item;
    }

    $result->free();

    return $contacts;
}
