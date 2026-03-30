import { query } from '../config/db';

export async function getDashboardSummary() {
  const result = await query(`
    WITH equipment_status AS (
      SELECT
        e.id,
        e.name,
        e.category_id,
        ec.name as category_name,
        ec.icon as category_icon,
        e.location,
        cs.interval_hours,
        cs.check_type_id,
        ct.name as check_type_name,
        (
          SELECT cl.checked_at
          FROM check_logs cl
          WHERE cl.equipment_id = e.id AND cl.check_type_id = cs.check_type_id
          ORDER BY cl.checked_at DESC LIMIT 1
        ) as last_checked,
        (
          SELECT cl.status
          FROM check_logs cl
          WHERE cl.equipment_id = e.id AND cl.check_type_id = cs.check_type_id
          ORDER BY cl.checked_at DESC LIMIT 1
        ) as last_status
      FROM equipment e
      JOIN equipment_categories ec ON e.category_id = ec.id
      JOIN check_schedules cs ON cs.equipment_id = e.id AND cs.is_active = TRUE
      JOIN check_types ct ON cs.check_type_id = ct.id
      WHERE e.is_active = TRUE
    )
    SELECT
      COUNT(DISTINCT id) as total_equipment,
      COUNT(*) as total_checks,
      COUNT(*) FILTER (WHERE last_checked IS NOT NULL AND
        EXTRACT(EPOCH FROM (NOW() - last_checked)) / 3600 <= interval_hours) as ok_count,
      COUNT(*) FILTER (WHERE last_checked IS NOT NULL AND
        EXTRACT(EPOCH FROM (NOW() - last_checked)) / 3600 > interval_hours * 0.8 AND
        EXTRACT(EPOCH FROM (NOW() - last_checked)) / 3600 <= interval_hours) as warning_count,
      COUNT(*) FILTER (WHERE last_checked IS NULL OR
        EXTRACT(EPOCH FROM (NOW() - last_checked)) / 3600 > interval_hours) as overdue_count
    FROM equipment_status
  `);
  return result.rows[0];
}

export async function getEquipmentStatuses() {
  const result = await query(`
    SELECT
      e.id,
      e.name,
      e.location,
      e.category_id,
      ec.name as category_name,
      ec.icon as category_icon,
      json_agg(json_build_object(
        'schedule_id', cs.id,
        'check_type_id', cs.check_type_id,
        'check_type_name', ct.name,
        'interval_hours', cs.interval_hours,
        'last_checked', (
          SELECT cl.checked_at
          FROM check_logs cl
          WHERE cl.equipment_id = e.id AND cl.check_type_id = cs.check_type_id
          ORDER BY cl.checked_at DESC LIMIT 1
        ),
        'last_status', (
          SELECT cl.status
          FROM check_logs cl
          WHERE cl.equipment_id = e.id AND cl.check_type_id = cs.check_type_id
          ORDER BY cl.checked_at DESC LIMIT 1
        ),
        'last_user', (
          SELECT u.display_name
          FROM check_logs cl
          JOIN users u ON cl.user_id = u.id
          WHERE cl.equipment_id = e.id AND cl.check_type_id = cs.check_type_id
          ORDER BY cl.checked_at DESC LIMIT 1
        ),
        'hours_since_check', (
          SELECT EXTRACT(EPOCH FROM (NOW() -
            (SELECT cl2.checked_at FROM check_logs cl2
             WHERE cl2.equipment_id = e.id AND cl2.check_type_id = cs.check_type_id
             ORDER BY cl2.checked_at DESC LIMIT 1)
          )) / 3600
        )
      )) as schedules
    FROM equipment e
    JOIN equipment_categories ec ON e.category_id = ec.id
    LEFT JOIN check_schedules cs ON cs.equipment_id = e.id AND cs.is_active = TRUE
    LEFT JOIN check_types ct ON cs.check_type_id = ct.id
    WHERE e.is_active = TRUE
    GROUP BY e.id, e.name, e.location, e.category_id, ec.name, ec.icon, ec.sort_order
    ORDER BY ec.sort_order, e.name
  `);
  return result.rows;
}

export async function getAlerts() {
  const result = await query(`
    SELECT
      e.id as equipment_id,
      e.name as equipment_name,
      e.location,
      ec.name as category_name,
      ct.name as check_type_name,
      cs.interval_hours,
      (
        SELECT cl.checked_at
        FROM check_logs cl
        WHERE cl.equipment_id = e.id AND cl.check_type_id = cs.check_type_id
        ORDER BY cl.checked_at DESC LIMIT 1
      ) as last_checked,
      EXTRACT(EPOCH FROM (NOW() - (
        SELECT cl.checked_at
        FROM check_logs cl
        WHERE cl.equipment_id = e.id AND cl.check_type_id = cs.check_type_id
        ORDER BY cl.checked_at DESC LIMIT 1
      ))) / 3600 as hours_overdue
    FROM equipment e
    JOIN equipment_categories ec ON e.category_id = ec.id
    JOIN check_schedules cs ON cs.equipment_id = e.id AND cs.is_active = TRUE
    JOIN check_types ct ON cs.check_type_id = ct.id
    WHERE e.is_active = TRUE
    AND (
      (SELECT cl.checked_at FROM check_logs cl
       WHERE cl.equipment_id = e.id AND cl.check_type_id = cs.check_type_id
       ORDER BY cl.checked_at DESC LIMIT 1) IS NULL
      OR
      EXTRACT(EPOCH FROM (NOW() - (
        SELECT cl.checked_at FROM check_logs cl
        WHERE cl.equipment_id = e.id AND cl.check_type_id = cs.check_type_id
        ORDER BY cl.checked_at DESC LIMIT 1
      ))) / 3600 > cs.interval_hours
    )
    ORDER BY hours_overdue DESC NULLS FIRST
  `);
  return result.rows;
}

export async function getChartData(equipmentId: number, days: number = 30) {
  const result = await query(`
    SELECT
      cl.checked_at,
      cl.status,
      ct.name as check_type_name,
      u.display_name as user_name,
      cl.notes
    FROM check_logs cl
    JOIN check_types ct ON cl.check_type_id = ct.id
    JOIN users u ON cl.user_id = u.id
    WHERE cl.equipment_id = $1
    AND cl.checked_at >= NOW() - INTERVAL '1 day' * $2
    ORDER BY cl.checked_at ASC
  `, [equipmentId, days]);
  return result.rows;
}

export async function getRecentChecks(limit: number = 10) {
  const result = await query(`
    SELECT cl.*, e.name as equipment_name, ct.name as check_type_name, u.display_name as user_name
    FROM check_logs cl
    JOIN equipment e ON cl.equipment_id = e.id
    JOIN check_types ct ON cl.check_type_id = ct.id
    JOIN users u ON cl.user_id = u.id
    ORDER BY cl.checked_at DESC
    LIMIT $1
  `, [limit]);
  return result.rows;
}
