import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/datacenter_monitor',
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret',
  PORT: parseInt(process.env.PORT || '3001', 10),
};
