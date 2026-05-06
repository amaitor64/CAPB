CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    procedure_key TEXT NOT NULL,
    group_key TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    tel TEXT NOT NULL,
    label TEXT NOT NULL,
    link TEXT NULL,
    link_label TEXT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contacts_procedure_group_sort
    ON contacts (procedure_key, group_key, sort_order, id);
