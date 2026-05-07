import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Tu dong bat SSL khi ket noi den RDS (endpoint chua "rds.amazonaws.com")
  // RDS yeu cau SSL, Docker PostgreSQL thi khong can
  ssl: process.env.DB_HOST?.includes('rds.amazonaws.com')
    ? { rejectUnauthorized: false }
    : false,
});

export async function initDB() {
  // Chi kiem tra ket noi den DB, khong tao table o day
  // Table duoc tao thu cong tren DB de dam bao co kiem soat schema
  await pool.query('SELECT 1');
}
