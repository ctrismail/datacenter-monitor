import { query } from '../config/db';

export async function listCheckTypes() {
  const result = await query('SELECT * FROM check_types ORDER BY id');
  return result.rows;
}

export async function createCheckType(name: string, description?: string) {
  const result = await query(
    'INSERT INTO check_types (name, description) VALUES ($1, $2) RETURNING *',
    [name, description || null]
  );
  return result.rows[0];
}

export async function listSchedules(equipmentId?: number) {
  let sql = `
    SELECT cs.*, e.name as equipment_name, ct.name as check_type_name
    FROM check_schedules cs
    JOIN equipment e ON cs.equipment_id = e.id
    JOIN check_types ct ON cs.check_type_id = ct.id
    WHERE cs.is_active = TRUE
  `;
  const params: any[] = [];
  if (equipmentId) {
    sql += ' AND cs.equipment_id = $1';
    params.push(equipmentId);
  }
  sql += ' ORDER BY e.name, ct.name';
  const result = await query(sql, params);
  return result.rows;
}

export async function createSchedule(equipmentId: number, checkTypeId: number, intervalHours: number) {
  const result = await query(
    'INSERT INTO check_schedules (equipment_id, check_type_id, interval_hours) VALUES ($1, $2, $3) RETURNING *',
    [equipmentId, checkTypeId, intervalHours]
  );
  return result.rows[0];
}

export async function updateSchedule(id: number, intervalHours: number) {
  const result = await query(
    'UPDATE check_schedules SET interval_hours = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [intervalHours, id]
  );
  return result.rows[0];
}

export async function deleteSchedule(id: number) {
  await query('UPDATE check_schedules SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [id]);
}

// Check Logs
export async function createCheckLog(data: {
  equipmentId: number;
  checkTypeId: number;
  userId: number;
  status: string;
  notes?: string;
  fieldValues?: { fieldDefId: number; value: string }[];
}) {
  const logResult = await query(
    `INSERT INTO check_logs (equipment_id, check_type_id, user_id, status, notes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.equipmentId, data.checkTypeId, data.userId, data.status, data.notes || null]
  );
  const log = logResult.rows[0];

  if (data.fieldValues && data.fieldValues.length > 0) {
    for (const fv of data.fieldValues) {
      await query(
        'INSERT INTO check_field_values (check_log_id, field_def_id, value) VALUES ($1, $2, $3)',
        [log.id, fv.fieldDefId, fv.value]
      );
    }
  }

  return log;
}

export async function listCheckLogs(filters: {
  equipmentId?: number;
  userId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (filters.equipmentId) {
    conditions.push(`cl.equipment_id = $${idx++}`);
    params.push(filters.equipmentId);
  }
  if (filters.userId) {
    conditions.push(`cl.user_id = $${idx++}`);
    params.push(filters.userId);
  }
  if (filters.startDate) {
    conditions.push(`cl.checked_at >= $${idx++}`);
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push(`cl.checked_at <= $${idx++}`);
    params.push(filters.endDate);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const offset = (page - 1) * limit;

  const countResult = await query(
    `SELECT COUNT(*) FROM check_logs cl ${where}`,
    params
  );

  const dataResult = await query(
    `SELECT cl.*, e.name as equipment_name, ct.name as check_type_name, u.display_name as user_name
     FROM check_logs cl
     JOIN equipment e ON cl.equipment_id = e.id
     JOIN check_types ct ON cl.check_type_id = ct.id
     JOIN users u ON cl.user_id = u.id
     ${where}
     ORDER BY cl.checked_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );

  return {
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
  };
}

export async function getCheckLogWithFields(checkLogId: number) {
  const logResult = await query(
    `SELECT cl.*, e.name as equipment_name, ct.name as check_type_name, u.display_name as user_name
     FROM check_logs cl
     JOIN equipment e ON cl.equipment_id = e.id
     JOIN check_types ct ON cl.check_type_id = ct.id
     JOIN users u ON cl.user_id = u.id
     WHERE cl.id = $1`,
    [checkLogId]
  );

  const fieldsResult = await query(
    `SELECT cfv.*, cfd.field_name, cfd.field_label, cfd.field_type, cfd.unit
     FROM check_field_values cfv
     JOIN check_field_definitions cfd ON cfv.field_def_id = cfd.id
     WHERE cfv.check_log_id = $1
     ORDER BY cfd.sort_order`,
    [checkLogId]
  );

  return { ...logResult.rows[0], fields: fieldsResult.rows };
}
