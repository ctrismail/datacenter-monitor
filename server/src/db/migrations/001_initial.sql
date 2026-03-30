-- Kullanıcılar
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOLEAN      DEFAULT TRUE,
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Ekipman Kategorileri (Jeneratör, Klima vb.)
CREATE TABLE IF NOT EXISTS equipment_categories (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    icon       VARCHAR(50),
    sort_order INT          DEFAULT 0,
    created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Ekipmanlar
CREATE TABLE IF NOT EXISTS equipment (
    id          SERIAL PRIMARY KEY,
    category_id INT          REFERENCES equipment_categories(id) ON DELETE SET NULL,
    name        VARCHAR(150) NOT NULL,
    location    VARCHAR(200),
    description TEXT,
    is_active   BOOLEAN      DEFAULT TRUE,
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Kontrol Tipleri (Görsel Kontrol, Çalıştırma Testi vb.)
CREATE TABLE IF NOT EXISTS check_types (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Kontrol Takvimi (her ekipman+kontrol tipi için sıklık)
CREATE TABLE IF NOT EXISTS check_schedules (
    id             SERIAL PRIMARY KEY,
    equipment_id   INT     NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    check_type_id  INT     NOT NULL REFERENCES check_types(id) ON DELETE CASCADE,
    interval_hours INT     NOT NULL,
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(equipment_id, check_type_id)
);

-- Kontrol Kayıtları
CREATE TABLE IF NOT EXISTS check_logs (
    id            SERIAL PRIMARY KEY,
    equipment_id  INT         NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    check_type_id INT         NOT NULL REFERENCES check_types(id) ON DELETE CASCADE,
    user_id       INT         REFERENCES users(id) ON DELETE SET NULL,
    status        VARCHAR(20) NOT NULL CHECK (status IN ('ok', 'warning', 'critical')),
    notes         TEXT,
    checked_at    TIMESTAMPTZ DEFAULT NOW(),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Kontrol Veri Alanları (jeneratör yakıt, sıcaklık vb. dinamik alanlar)
CREATE TABLE IF NOT EXISTS check_field_definitions (
    id            SERIAL PRIMARY KEY,
    category_id   INT          NOT NULL REFERENCES equipment_categories(id) ON DELETE CASCADE,
    field_name    VARCHAR(100) NOT NULL,
    field_label   VARCHAR(150) NOT NULL,
    field_type    VARCHAR(20)  NOT NULL CHECK (field_type IN ('number', 'text', 'select', 'boolean')),
    unit          VARCHAR(30),
    options       TEXT,
    sort_order    INT          DEFAULT 0,
    is_required   BOOLEAN      DEFAULT FALSE,
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Kontrol Veri Değerleri (her kontrol kaydına bağlı dinamik değerler)
CREATE TABLE IF NOT EXISTS check_field_values (
    id              SERIAL PRIMARY KEY,
    check_log_id    INT          NOT NULL REFERENCES check_logs(id) ON DELETE CASCADE,
    field_def_id    INT          NOT NULL REFERENCES check_field_definitions(id) ON DELETE CASCADE,
    value           TEXT,
    UNIQUE(check_log_id, field_def_id)
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_check_logs_equipment   ON check_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_check_logs_checked_at  ON check_logs(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_logs_user        ON check_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_check_schedules_equip  ON check_schedules(equipment_id);
CREATE INDEX IF NOT EXISTS idx_check_field_values_log ON check_field_values(check_log_id);

-- Varsayılan Veriler

-- Kategoriler
INSERT INTO equipment_categories (name, icon, sort_order) VALUES
    ('Jeneratör', 'zap', 1),
    ('Klima', 'thermometer', 2)
ON CONFLICT DO NOTHING;

-- Kontrol Tipleri
INSERT INTO check_types (name, description) VALUES
    ('Rutin Kontrol', 'Günlük rutin kontrol'),
    ('Görsel Kontrol', 'Görsel muayene ve fiziksel durum kontrolü'),
    ('Çalıştırma Testi', 'Ekipmanın çalıştırılarak test edilmesi'),
    ('Bakım', 'Periyodik bakım işlemi')
ON CONFLICT DO NOTHING;

-- Jeneratör veri alanları (category_id = 1)
INSERT INTO check_field_definitions (category_id, field_name, field_label, field_type, unit, sort_order, is_required) VALUES
    (1, 'fuel_level', 'Yakıt Seviyesi', 'number', '%', 1, TRUE),
    (1, 'engine_temp', 'Motor Sıcaklığı', 'number', '°C', 2, FALSE),
    (1, 'oil_pressure', 'Yağ Basıncı', 'number', 'bar', 3, FALSE),
    (1, 'battery_voltage', 'Akü Voltajı', 'number', 'V', 4, FALSE),
    (1, 'running_hours', 'Çalışma Saati', 'number', 'saat', 5, FALSE),
    (1, 'engine_status', 'Motor Durumu', 'select', NULL, 6, TRUE),
    (1, 'coolant_temp', 'Soğutma Suyu Sıcaklığı', 'number', '°C', 7, FALSE),
    (1, 'load_percent', 'Yük Oranı', 'number', '%', 8, FALSE),
    (1, 'physical_condition', 'Fiziksel Durum', 'select', NULL, 9, FALSE),
    (1, 'leak_check', 'Sızıntı Kontrolü', 'boolean', NULL, 10, TRUE)
ON CONFLICT DO NOTHING;

-- Klima veri alanları (category_id = 2)
INSERT INTO check_field_definitions (category_id, field_name, field_label, field_type, unit, sort_order, is_required) VALUES
    (2, 'set_temp', 'Ayar Sıcaklığı', 'number', '°C', 1, TRUE),
    (2, 'room_temp', 'Ortam Sıcaklığı', 'number', '°C', 2, TRUE),
    (2, 'humidity', 'Nem Oranı', 'number', '%', 3, FALSE),
    (2, 'filter_status', 'Filtre Durumu', 'select', NULL, 4, TRUE),
    (2, 'compressor_status', 'Kompresör Durumu', 'select', NULL, 5, FALSE),
    (2, 'airflow', 'Hava Akışı', 'select', NULL, 6, FALSE),
    (2, 'drain_check', 'Drenaj Kontrolü', 'boolean', NULL, 7, FALSE),
    (2, 'noise_level', 'Gürültü Seviyesi', 'select', NULL, 8, FALSE)
ON CONFLICT DO NOTHING;

-- Varsayılan admin kullanıcı (şifre: admin123)
-- bcrypt hash for 'admin123'
INSERT INTO users (username, display_name, password_hash) VALUES
    ('admin', 'Sistem Yöneticisi', '$2a$10$rQEY7GxFvMJGhXqMz7kxaeKXMfR7gPXvH8fF9CrJpK3ZBvxVqXJmu')
ON CONFLICT (username) DO NOTHING;
