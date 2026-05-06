<?php

declare(strict_types=1);

function capb_db_driver(): string
{
    return strtolower(trim((string) getenv('CAPB_DB_DRIVER')) ?: 'mysql');
}

function capb_db_dsn(): string
{
    $dsn = trim((string) getenv('CAPB_DB_DSN'));
    if ($dsn !== '') {
        return $dsn;
    }

    $driver = capb_db_driver();
    if ($driver === 'mysql') {
        $host = trim((string) getenv('CAPB_DB_HOST')) ?: '192.168.15.253';
        $port = (int) (getenv('CAPB_DB_PORT') ?: '3306');
        $database = trim((string) getenv('CAPB_DB_NAME')) ?: 'exploitation';
        $charset = trim((string) getenv('CAPB_DB_CHARSET')) ?: 'utf8mb4';
        return sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, $port, $database, $charset);
    }

    $path = trim((string) getenv('CAPB_DB_PATH'));
    if ($path === '') {
        $path = dirname(__DIR__) . '/var/capb.sqlite';
    }

    return 'sqlite:' . $path;
}

function capb_db_user(): ?string
{
    $value = getenv('CAPB_DB_USER');
    return $value === false || $value === '' ? null : $value;
}

function capb_db_password(): ?string
{
    $value = getenv('CAPB_DB_PASSWORD');
    return $value === false || $value === '' ? null : $value;
}

function capb_contacts_table(): string
{
    $table = trim((string) getenv('CAPB_DB_CONTACTS_TABLE')) ?: 'contacts_secu';
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        throw new RuntimeException('CAPB_DB_CONTACTS_TABLE is invalid');
    }
    return $table;
}

function capb_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = capb_db_dsn();
    $user = capb_db_user();
    $password = capb_db_password();

    if (str_starts_with($dsn, 'sqlite:')) {
        $path = substr($dsn, 7);
        $directory = dirname($path);
        if ($directory !== '' && $directory !== '.' && !is_dir($directory)) {
            mkdir($directory, 0775, true);
        }
    }

    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    if (str_starts_with($dsn, 'sqlite:')) {
        $pdo->exec('PRAGMA foreign_keys = ON');
    }

    return $pdo;
}

function capb_fetch_contacts_tree(): array
{
    $table = capb_contacts_table();
    $statement = capb_db()->query(
        "SELECT procedure_key, group_key, name, role, tel, label, link, link_label
         FROM {$table}
         WHERE is_active = 1
         ORDER BY procedure_key, group_key, sort_order, id"
    );

    $contacts = [];
    foreach ($statement->fetchAll() as $row) {
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

    return $contacts;
}
