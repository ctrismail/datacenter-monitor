import { query } from '../config/db';

// Categories
export async function listCategories() {
  const result = await query('SELECT * FROM equipment_categories ORDER BY sort_order, id');
  return result.rows;
}

export async function createCategory(name: string, icon?: string) {
  const result = await query(
    'INSERT INTO equipment_categories (name, icon) VALUES ($1, $2) RETURNING *',
    [name, icon || null]
  );
  return result.rows[0];
}

export async function updateCategory(id: number, name: string, icon?: string) {
  const result = await query(
    'UPDATE equipment_categories SET name = $1, icon = $2 WHERE id = $3 RETURNING *',
    [name, icon || null, id]
  );
  return result.rows[0];
}

export async function deleteCategory(id: number) {
  await query('DELETE FROM equipment_categories WHERE id = $1', [id]);
}

// Equipment
export async function listEquipment(categoryId?: number) {
  let sql = `
    SELECT e.*, ec.name as category_name, ec.icon as category_icon
    FROM equipment e
    LEFT JOIN equipment_categories ec ON e.category_id = ec.id
    WHERE e.is_active = TRUE
  `;
  const params: any[] = [];
  if (categoryId) {
    sql += ' AND e.category_id = $1';
    params.push(categoryId);
  }
  sql += ' ORDER BY ec.sort_order, e.name';
  const result = await query(sql, params);
  return result.rows;
}

export async function getEquipment(id: number) {
  const result = await query(
    `SELECT e.*, ec.name as category_name, ec.icon as category_icon
     FROM equipment e
     LEFT JOIN equipment_categories ec ON e.category_id = ec.id
     WHERE e.id = $1`,
    [id]
  );
  return result.rows[0];
}

export async function createEquipment(data: { categoryId: number; name: string; location?: string; description?: string }) {
  const result = await query(
    'INSERT INTO equipment (category_id, name, location, description) VALUES ($1, $2, $3, $4) RETURNING *',
    [data.categoryId, data.name, data.location || null, data.description || null]
  );
  return result.rows[0];
}

export async function updateEquipment(id: number, data: { categoryId?: number; name?: string; location?: string; description?: string }) {
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.categoryId !== undefined) { sets.push(`category_id = $${idx++}`); values.push(data.categoryId); }
  if (data.name !== undefined) { sets.push(`name = $${idx++}`); values.push(data.name); }
  if (data.location !== undefined) { sets.push(`location = $${idx++}`); values.push(data.location); }
  if (data.description !== undefined) { sets.push(`description = $${idx++}`); values.push(data.description); }
  sets.push('updated_at = NOW()');
  values.push(id);

  const result = await query(
    `UPDATE equipment SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteEquipment(id: number) {
  await query('UPDATE equipment SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [id]);
}

// Field Definitions
export async function getFieldDefinitions(categoryId: number) {
  const result = await query(
    'SELECT * FROM check_field_definitions WHERE category_id = $1 ORDER BY sort_order',
    [categoryId]
  );
  return result.rows;
}
