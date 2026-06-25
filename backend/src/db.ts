import "dotenv/config";
import { Pool } from "pg";

const dbHost = process.env.DB_HOST || "localhost";

const pool = new Pool({
  host: dbHost,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "myuser",
  password: process.env.DB_PASSWORD || "mypassword",
  database: process.env.DB_NAME || "mydb",
  max: 10,
  // Bat SSL khi connect den RDS
  ssl: dbHost.includes("rds.amazonaws.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

// Smoke-test connection luc khoi dong. Dung pool.query (tu tra client ve pool)
// thay vi pool.connect() — connect() giu client tren tay, neu khong release()
// se ro ri vinh vien 1 slot trong pool (max: 10).
pool
  .query("SELECT 1")
  .then(() => console.log("Connected PostgreSQL success !"))
  .catch((err) => console.error("Error connected database:", err.stack));

// Migration nhe luc khoi dong (idempotent). init.sql chi chay khi volume DB moi
// nen cac lenh "IF NOT EXISTS" nay phu cho DB da co san.
//  - refresh_tokens: token_hash = sha256(refresh token) → DB leak khong lo token that.
//  - users.email_verified / mfa_*: phuc vu email verification + MFA (TOTP).
pool
  .query(
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
       token_hash VARCHAR(64) PRIMARY KEY,
       user_id    VARCHAR(36) NOT NULL,
       expires_at TIMESTAMP   NOT NULL,
       revoked    BOOLEAN     NOT NULL DEFAULT FALSE,
       created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
     );
     CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);

     ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified     BOOLEAN NOT NULL DEFAULT FALSE;
     ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token VARCHAR(64);
     ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled        BOOLEAN NOT NULL DEFAULT FALSE;
     ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret         VARCHAR(64);`,
  )
  .catch((err) => console.error("Migration failed:", err.stack));

export default pool;
