import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { env } from '../config/env';

export async function login(username: string, password: string) {
  const result = await query('SELECT * FROM users WHERE username = $1 AND is_active = TRUE', [username]);
  const user = result.rows[0];
  if (!user) throw new Error('Kullanıcı bulunamadı');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Hatalı şifre');

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: { id: user.id, username: user.username, displayName: user.display_name }
  };
}

export async function generateTVToken(userId: number) {
  const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = result.rows[0];
  if (!user) throw new Error('Kullanıcı bulunamadı');

  return jwt.sign(
    { userId: user.id, username: user.username },
    env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export async function getMe(userId: number) {
  const result = await query('SELECT id, username, display_name, created_at FROM users WHERE id = $1', [userId]);
  return result.rows[0];
}
