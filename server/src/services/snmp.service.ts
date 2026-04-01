import { query } from '../config/db';
import { initSimulatedDevice, pollSimulatedDevice, oidLabels } from './snmp-simulator';

// ============================================================
// SNMP Cihaz CRUD
// ============================================================

export async function listSnmpDevices() {
  const result = await query(`
    SELECT sd.*, e.name as equipment_name, e.location, ec.name as category_name, ec.icon as category_icon,
           (SELECT COUNT(*) FROM snmp_oid_mappings WHERE snmp_device_id = sd.id) as oid_count,
           (SELECT COUNT(*) FROM snmp_data_logs WHERE snmp_device_id = sd.id AND recorded_at > NOW() - INTERVAL '5 minutes') as recent_readings
    FROM snmp_devices sd
    JOIN equipment e ON sd.equipment_id = e.id
    LEFT JOIN equipment_categories ec ON e.category_id = ec.id
    ORDER BY e.name
  `);
  return result.rows;
}

export async function getSnmpDevice(id: number) {
  const result = await query(`
    SELECT sd.*, e.name as equipment_name, e.location, ec.name as category_name, ec.icon as category_icon
    FROM snmp_devices sd
    JOIN equipment e ON sd.equipment_id = e.id
    LEFT JOIN equipment_categories ec ON e.category_id = ec.id
    WHERE sd.id = $1
  `, [id]);
  return result.rows[0];
}

export async function createSnmpDevice(data: {
  equipmentId: number; ipAddress: string; port?: number;
  snmpVersion?: string; community?: string; pollInterval?: number;
}) {
  const result = await query(
    `INSERT INTO snmp_devices (equipment_id, ip_address, port, snmp_version, community, poll_interval)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.equipmentId, data.ipAddress, data.port || 161, data.snmpVersion || '2c', data.community || 'public', data.pollInterval || 60]
  );

  // OID'leri otomatik oluştur (ekipman kategorisine göre)
  const device = result.rows[0];
  await autoCreateOidMappings(device.id, data.equipmentId);

  return device;
}

export async function updateSnmpDevice(id: number, data: {
  ipAddress?: string; port?: number; snmpVersion?: string;
  community?: string; pollInterval?: number; isActive?: boolean;
}) {
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.ipAddress !== undefined) { sets.push(`ip_address = $${idx++}`); values.push(data.ipAddress); }
  if (data.port !== undefined) { sets.push(`port = $${idx++}`); values.push(data.port); }
  if (data.snmpVersion !== undefined) { sets.push(`snmp_version = $${idx++}`); values.push(data.snmpVersion); }
  if (data.community !== undefined) { sets.push(`community = $${idx++}`); values.push(data.community); }
  if (data.pollInterval !== undefined) { sets.push(`poll_interval = $${idx++}`); values.push(data.pollInterval); }
  if (data.isActive !== undefined) { sets.push(`is_active = $${idx++}`); values.push(data.isActive); }
  sets.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE snmp_devices SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteSnmpDevice(id: number) {
  await query('DELETE FROM snmp_devices WHERE id = $1', [id]);
}

// ============================================================
// OID Mappings
// ============================================================

export async function getOidMappings(deviceId: number) {
  const result = await query(
    `SELECT som.*, cfd.field_label as linked_field_label
     FROM snmp_oid_mappings som
     LEFT JOIN check_field_definitions cfd ON som.field_def_id = cfd.id
     WHERE som.snmp_device_id = $1 ORDER BY som.sort_order`,
    [deviceId]
  );
  return result.rows;
}

async function autoCreateOidMappings(deviceId: number, equipmentId: number) {
  const eqResult = await query(
    `SELECT ec.name as category_name FROM equipment e
     JOIN equipment_categories ec ON e.category_id = ec.id WHERE e.id = $1`,
    [equipmentId]
  );
  if (eqResult.rows.length === 0) return;

  const catName = eqResult.rows[0].category_name.toLowerCase();
  let type = 'ups';
  if (catName.includes('jeneratör') || catName.includes('generator')) type = 'generator';
  else if (catName.includes('klima') || catName.includes('crac')) type = 'ac';
  else if (catName.includes('yangın') || catName.includes('fire')) type = 'fire';
  else if (catName.includes('pano') || catName.includes('elektrik')) type = 'pdu';

  const labels = oidLabels[type];
  if (!labels) return;

  let order = 0;
  for (const [key, info] of Object.entries(labels)) {
    await query(
      `INSERT INTO snmp_oid_mappings (snmp_device_id, oid, label, data_type, unit, sort_order)
       VALUES ($1, $2, $3, 'number', $4, $5)`,
      [deviceId, info.oid, info.label, info.unit, ++order]
    );
  }
}

// ============================================================
// SNMP Polling (Simülasyon modu)
// ============================================================

let pollingActive = false;
let pollingTimers: Map<number, NodeJS.Timeout> = new Map();

export async function startPolling() {
  if (pollingActive) return;
  pollingActive = true;
  console.log('SNMP polling started (simulation mode)');

  const devices = await query(`
    SELECT sd.*, ec.name as category_name
    FROM snmp_devices sd
    JOIN equipment e ON sd.equipment_id = e.id
    LEFT JOIN equipment_categories ec ON e.category_id = ec.id
    WHERE sd.is_active = true
  `);

  for (const device of devices.rows) {
    initSimulatedDevice(device.equipment_id, device.category_name);
    schedulePoll(device);
  }
}

function schedulePoll(device: any) {
  if (pollingTimers.has(device.id)) {
    clearInterval(pollingTimers.get(device.id)!);
  }

  const timer = setInterval(async () => {
    await pollDevice(device);
  }, (device.poll_interval || 60) * 1000);

  pollingTimers.set(device.id, timer);
  // İlk poll'u hemen yap
  pollDevice(device);
}

async function pollDevice(device: any) {
  try {
    const data = pollSimulatedDevice(device.equipment_id);
    if (!data) return;

    // OID mapping'leri al
    const mappings = await query(
      'SELECT * FROM snmp_oid_mappings WHERE snmp_device_id = $1',
      [device.id]
    );

    for (const mapping of mappings.rows) {
      // OID label'ından key bul
      const key = Object.entries(oidLabels).reduce((found: string | null, [, typeLabels]) => {
        if (found) return found;
        const entry = Object.entries(typeLabels).find(([, info]) => info.oid === mapping.oid);
        return entry ? entry[0] : null;
      }, null);

      if (key && data[key]) {
        const { value, status } = data[key];
        await query(
          `INSERT INTO snmp_data_logs (snmp_device_id, oid_mapping_id, value, numeric_value, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [device.id, mapping.id, String(value), value, status]
        );

        // Threshold alarm kontrolü
        if (status === 'critical') {
          const recentAlarm = await query(
            `SELECT id FROM snmp_alarms
             WHERE snmp_device_id = $1 AND oid_mapping_id = $2 AND is_acknowledged = false
             AND created_at > NOW() - INTERVAL '10 minutes'`,
            [device.id, mapping.id]
          );
          if (recentAlarm.rows.length === 0) {
            await query(
              `INSERT INTO snmp_alarms (snmp_device_id, oid_mapping_id, alarm_type, message, severity)
               VALUES ($1, $2, 'threshold', $3, 'critical')`,
              [device.id, mapping.id, `${mapping.label}: ${value} ${mapping.unit || ''} - Kritik seviye!`]
            );
          }
        }
      }
    }

    // Device durumunu güncelle
    await query(
      `UPDATE snmp_devices SET last_poll_at = NOW(), last_status = 'online' WHERE id = $1`,
      [device.id]
    );

  } catch (err) {
    console.error(`SNMP poll error for device ${device.id}:`, err);
    await query(
      `UPDATE snmp_devices SET last_poll_at = NOW(), last_status = 'error' WHERE id = $1`,
      [device.id]
    );
  }
}

export async function stopPolling() {
  pollingActive = false;
  for (const timer of pollingTimers.values()) {
    clearInterval(timer);
  }
  pollingTimers.clear();
  console.log('SNMP polling stopped');
}

export async function addDeviceToPolling(deviceId: number) {
  const result = await query(`
    SELECT sd.*, ec.name as category_name
    FROM snmp_devices sd
    JOIN equipment e ON sd.equipment_id = e.id
    LEFT JOIN equipment_categories ec ON e.category_id = ec.id
    WHERE sd.id = $1 AND sd.is_active = true
  `, [deviceId]);

  if (result.rows.length > 0) {
    const device = result.rows[0];
    initSimulatedDevice(device.equipment_id, device.category_name);
    schedulePoll(device);
  }
}

// ============================================================
// SNMP Data Queries
// ============================================================

export async function getLatestReadings(deviceId: number) {
  const result = await query(`
    SELECT DISTINCT ON (sdl.oid_mapping_id)
      sdl.*, som.label, som.unit, som.oid, som.min_threshold, som.max_threshold
    FROM snmp_data_logs sdl
    JOIN snmp_oid_mappings som ON sdl.oid_mapping_id = som.id
    WHERE sdl.snmp_device_id = $1
    ORDER BY sdl.oid_mapping_id, sdl.recorded_at DESC
  `, [deviceId]);
  return result.rows;
}

export async function getReadingHistory(deviceId: number, oidMappingId: number, hours: number = 24) {
  const result = await query(`
    SELECT value, numeric_value, status, recorded_at
    FROM snmp_data_logs
    WHERE snmp_device_id = $1 AND oid_mapping_id = $2
    AND recorded_at > NOW() - INTERVAL '1 hour' * $3
    ORDER BY recorded_at ASC
  `, [deviceId, oidMappingId, hours]);
  return result.rows;
}

export async function getAllLatestReadings() {
  const result = await query(`
    SELECT sd.id as device_id, sd.equipment_id, sd.last_status, sd.last_poll_at,
           e.name as equipment_name, ec.name as category_name, ec.icon as category_icon,
           json_agg(json_build_object(
             'label', som.label, 'unit', som.unit, 'value', latest.value,
             'numeric_value', latest.numeric_value, 'status', latest.status,
             'oid_mapping_id', som.id, 'recorded_at', latest.recorded_at
           ) ORDER BY som.sort_order) as readings
    FROM snmp_devices sd
    JOIN equipment e ON sd.equipment_id = e.id
    LEFT JOIN equipment_categories ec ON e.category_id = ec.id
    JOIN snmp_oid_mappings som ON som.snmp_device_id = sd.id
    LEFT JOIN LATERAL (
      SELECT value, numeric_value, status, recorded_at
      FROM snmp_data_logs
      WHERE snmp_device_id = sd.id AND oid_mapping_id = som.id
      ORDER BY recorded_at DESC LIMIT 1
    ) latest ON true
    WHERE sd.is_active = true AND latest.value IS NOT NULL
    GROUP BY sd.id, sd.equipment_id, sd.last_status, sd.last_poll_at, e.name, ec.name, ec.icon
    ORDER BY e.name
  `);
  return result.rows;
}

// ============================================================
// SNMP Alarms
// ============================================================

export async function getAlarms(onlyActive: boolean = true) {
  const where = onlyActive ? 'WHERE sa.is_acknowledged = false' : '';
  const result = await query(`
    SELECT sa.*, sd.ip_address, e.name as equipment_name, ec.name as category_name,
           som.label as oid_label
    FROM snmp_alarms sa
    JOIN snmp_devices sd ON sa.snmp_device_id = sd.id
    JOIN equipment e ON sd.equipment_id = e.id
    LEFT JOIN equipment_categories ec ON e.category_id = ec.id
    LEFT JOIN snmp_oid_mappings som ON sa.oid_mapping_id = som.id
    ${where}
    ORDER BY sa.created_at DESC
    LIMIT 100
  `);
  return result.rows;
}

export async function acknowledgeAlarm(id: number, userId: number) {
  const result = await query(
    `UPDATE snmp_alarms SET is_acknowledged = true, acknowledged_by = $2, acknowledged_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, userId]
  );
  return result.rows[0];
}
