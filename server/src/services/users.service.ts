import bcrypt from 'bcryptjs';
import { query } from '../config/db';

export async function listUsers() {
  const result = await query(
    'SELECT id, username, display_name, is_active, created_at FROM users ORDER BY id'
  );
  return result.rows;
}

export async function createUser(username: string, displayName: string, password: string) {
  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    'INSERT INTO users (username, display_name, password_hash) VALUES ($1, $2, $3) RETURNING id, username, display_name',
    [username, displayName, hash]
  );
  return result.rows[0];
}

export async function updateUser(id: number, data: { displayName?: string; password?: string; isActive?: boolean }) {
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.displayName !== undefined) {
    sets.push(`display_name = $${idx++}`);
    values.push(data.displayName);
  }
  if (data.password !== undefined) {
    sets.push(`password_hash = $${idx++}`);
    values.push(await bcrypt.hash(data.password, 10));
  }
  if (data.isActive !== undefined) {
    sets.push(`is_active = $${idx++}`);
    values.push(data.isActive);
  }
  sets.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, username, display_name, is_active`,
    values
  );
  return result.rows[0];
}

export async function deleteUser(id: number) {
  await query('UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [id]);
}
