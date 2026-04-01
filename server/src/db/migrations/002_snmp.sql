-- SNMP Cihaz Konfigürasyonu
CREATE TABLE IF NOT EXISTS snmp_devices (
    id              SERIAL PRIMARY KEY,
    equipment_id    INT          NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    ip_address      VARCHAR(50)  NOT NULL,
    port            INT          DEFAULT 161,
    snmp_version    VARCHAR(5)   DEFAULT '2c' CHECK (snmp_version IN ('1', '2c', '3')),
    community       VARCHAR(100) DEFAULT 'public',
    is_active       BOOLEAN      DEFAULT TRUE,
    poll_interval   INT          DEFAULT 60,
    last_poll_at    TIMESTAMPTZ,
    last_status     VARCHAR(20)  DEFAULT 'unknown' CHECK (last_status IN ('online', 'offline', 'error', 'unknown')),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE(equipment_id)
);

-- SNMP OID Tanımları (hangi OID'den hangi veriyi okuyacağız)
CREATE TABLE IF NOT EXISTS snmp_oid_mappings (
    id              SERIAL PRIMARY KEY,
    snmp_device_id  INT          NOT NULL REFERENCES snmp_devices(id) ON DELETE CASCADE,
    field_def_id    INT          REFERENCES check_field_definitions(id) ON DELETE SET NULL,
    oid             VARCHAR(255) NOT NULL,
    label           VARCHAR(150) NOT NULL,
    data_type       VARCHAR(20)  DEFAULT 'number' CHECK (data_type IN ('number', 'text', 'boolean', 'gauge')),
    unit            VARCHAR(30),
    min_threshold   NUMERIC,
    max_threshold   NUMERIC,
    sort_order      INT          DEFAULT 0,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- SNMP Veri Kayıtları (polling sonuçları)
CREATE TABLE IF NOT EXISTS snmp_data_logs (
    id              SERIAL PRIMARY KEY,
    snmp_device_id  INT          NOT NULL REFERENCES snmp_devices(id) ON DELETE CASCADE,
    oid_mapping_id  INT          NOT NULL REFERENCES snmp_oid_mappings(id) ON DELETE CASCADE,
    value           TEXT         NOT NULL,
    numeric_value   NUMERIC,
    status          VARCHAR(20)  DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'critical')),
    recorded_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- SNMP Alarmlar
CREATE TABLE IF NOT EXISTS snmp_alarms (
    id              SERIAL PRIMARY KEY,
    snmp_device_id  INT          NOT NULL REFERENCES snmp_devices(id) ON DELETE CASCADE,
    oid_mapping_id  INT          REFERENCES snmp_oid_mappings(id) ON DELETE SET NULL,
    alarm_type      VARCHAR(50)  NOT NULL,
    message         TEXT         NOT NULL,
    severity        VARCHAR(20)  DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    is_acknowledged BOOLEAN      DEFAULT FALSE,
    acknowledged_by INT          REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_snmp_data_logs_device    ON snmp_data_logs(snmp_device_id);
CREATE INDEX IF NOT EXISTS idx_snmp_data_logs_recorded  ON snmp_data_logs(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_snmp_data_logs_oid       ON snmp_data_logs(oid_mapping_id);
CREATE INDEX IF NOT EXISTS idx_snmp_alarms_device       ON snmp_alarms(snmp_device_id);
CREATE INDEX IF NOT EXISTS idx_snmp_alarms_active       ON snmp_alarms(is_acknowledged) WHERE is_acknowledged = FALSE;
