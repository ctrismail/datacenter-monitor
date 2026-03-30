import ExcelJS from 'exceljs';
import { query } from '../config/db';

export async function exportChecks(filters: { startDate?: string; endDate?: string; equipmentId?: number }) {
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (filters.equipmentId) {
    conditions.push(`cl.equipment_id = $${idx++}`);
    params.push(filters.equipmentId);
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

  const result = await query(`
    SELECT cl.checked_at, e.name as equipment_name, ec.name as category_name,
           ct.name as check_type_name, cl.status, u.display_name as user_name, cl.notes
    FROM check_logs cl
    JOIN equipment e ON cl.equipment_id = e.id
    JOIN equipment_categories ec ON e.category_id = ec.id
    JOIN check_types ct ON cl.check_type_id = ct.id
    JOIN users u ON cl.user_id = u.id
    ${where}
    ORDER BY cl.checked_at DESC
  `, params);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Kontrol Kayıtları');

  sheet.columns = [
    { header: 'Tarih', key: 'checked_at', width: 20 },
    { header: 'Kategori', key: 'category_name', width: 15 },
    { header: 'Ekipman', key: 'equipment_name', width: 25 },
    { header: 'Kontrol Tipi', key: 'check_type_name', width: 20 },
    { header: 'Durum', key: 'status', width: 12 },
    { header: 'Kontrol Eden', key: 'user_name', width: 20 },
    { header: 'Notlar', key: 'notes', width: 40 },
  ];

  // Header styling
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

  const statusMap: Record<string, string> = { ok: 'Normal', warning: 'Uyarı', critical: 'Kritik' };

  for (const row of result.rows) {
    const addedRow = sheet.addRow({
      ...row,
      checked_at: new Date(row.checked_at).toLocaleString('tr-TR'),
      status: statusMap[row.status] || row.status,
    });

    if (row.status === 'critical') {
      addedRow.getCell('status').font = { color: { argb: 'FFDC2626' }, bold: true };
    } else if (row.status === 'warning') {
      addedRow.getCell('status').font = { color: { argb: 'FFD97706' } };
    }
  }

  return workbook;
}

export async function exportMonthlyReport(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1 > 12 ? 1 : month + 1).padStart(2, '0')}-01`;

  const result = await query(`
    SELECT e.name as equipment_name, ec.name as category_name,
           COUNT(*) as total_checks,
           COUNT(*) FILTER (WHERE cl.status = 'ok') as ok_count,
           COUNT(*) FILTER (WHERE cl.status = 'warning') as warning_count,
           COUNT(*) FILTER (WHERE cl.status = 'critical') as critical_count,
           MIN(cl.checked_at) as first_check,
           MAX(cl.checked_at) as last_check
    FROM check_logs cl
    JOIN equipment e ON cl.equipment_id = e.id
    JOIN equipment_categories ec ON e.category_id = ec.id
    WHERE cl.checked_at >= $1 AND cl.checked_at < $2
    GROUP BY e.id, e.name, ec.name
    ORDER BY ec.name, e.name
  `, [startDate, endDate]);

  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`${months[month - 1]} ${year} Rapor`);

  sheet.columns = [
    { header: 'Kategori', key: 'category_name', width: 15 },
    { header: 'Ekipman', key: 'equipment_name', width: 25 },
    { header: 'Toplam Kontrol', key: 'total_checks', width: 15 },
    { header: 'Normal', key: 'ok_count', width: 12 },
    { header: 'Uyarı', key: 'warning_count', width: 12 },
    { header: 'Kritik', key: 'critical_count', width: 12 },
    { header: 'İlk Kontrol', key: 'first_check', width: 20 },
    { header: 'Son Kontrol', key: 'last_check', width: 20 },
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

  for (const row of result.rows) {
    sheet.addRow({
      ...row,
      first_check: row.first_check ? new Date(row.first_check).toLocaleString('tr-TR') : '-',
      last_check: row.last_check ? new Date(row.last_check).toLocaleString('tr-TR') : '-',
    });
  }

  return workbook;
}
