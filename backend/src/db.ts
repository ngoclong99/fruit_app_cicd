import 'dotenv/config';
import { Pool } from 'pg';

const dbHost = process.env.DB_HOST || 'localhost';

const pool = new Pool({
  host: dbHost,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASSWORD || 'mypassword',
  database: process.env.DB_NAME || 'mydb',
  max: 10,
  // Bat SSL khi connect den RDS
  ssl: dbHost.includes('rds.amazonaws.com')
    ? { rejectUnauthorized: false }
    : undefined,
});

export default pool;
