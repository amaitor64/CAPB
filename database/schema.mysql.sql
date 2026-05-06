CREATE TABLE IF NOT EXISTS contacts_secu (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    procedure_key VARCHAR(50) NOT NULL,
    group_key VARCHAR(50) NOT NULL,
    name VARCHAR(190) NOT NULL,
    role VARCHAR(190) NOT NULL,
    tel VARCHAR(40) NOT NULL,
    label VARCHAR(60) NOT NULL,
    link VARCHAR(255) DEFAULT NULL,
    link_label VARCHAR(190) DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_contacts_procedure_group_sort (procedure_key, group_key, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
