import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { DatabaseSync } from "node:sqlite";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

dotenv.config();
process.env.NODE_ENV ||= "development";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Las rutas de abajo son handlers async (p. ej. app.post("/x", async (req, res) => {...})).
// En Express 4 un rechazo de promesa dentro de un handler async NO se reenvía a next(),
// se convierte en un "unhandledRejection" y por defecto Node mata el proceso completo
// (caía TODO el servidor, no solo la petición, provocando 503 para cualquier usuario).
// Se envuelve cada handler para reenviar cualquier error al middleware de errores de Express.
["get", "post", "put", "delete", "patch"].forEach((method) => {
  const original = app[method].bind(app);
  app[method] = (routePath, ...handlers) => {
    const wrapped = handlers.map((handler) => {
      if (typeof handler !== "function") return handler;
      return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
      };
    });
    return original(routePath, ...wrapped);
  };
});

const PORT = Number(process.env.PORT || 4000);
const CONFIGURED_DB_PATH = process.env.DB_PATH || path.join("data", "app.db");
const DB_PATH = path.isAbsolute(CONFIGURED_DB_PATH)
  ? CONFIGURED_DB_PATH
  : path.resolve(__dirname, CONFIGURED_DB_PATH);
const DATA_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const mysqlConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || "",
  port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306),
  user: process.env.DB_USER || process.env.MYSQL_USER || "",
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "",
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "",
  connectionLimit: Number(
    process.env.DB_CONNECTION_LIMIT || process.env.MYSQL_CONNECTION_LIMIT || 10,
  ),
  charset: "utf8mb4",
  multipleStatements: false,
};

let mysqlPool = null;
let sqliteDb = null;
let databaseMode = "sqlite";

const emailVerificationTtlMs =
  Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES || 15) * 60 * 1000;
const INSECURE_DEFAULT_PASSWORD = "PideTietar123";
const MIN_PASSWORD_LENGTH = 8;

function normalizePassword(value) {
  return String(value ?? "").trim();
}

function validatePasswordOrThrow(passwordRaw) {
  const password = normalizePassword(passwordRaw);

  if (!password) {
    const error = new Error("La contraseña es obligatoria");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    const error = new Error(
      `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
    );
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  return password;
}

function isUsingInsecureDefaultPassword(hash) {
  if (!hash) return false;

  try {
    return bcrypt.compareSync(INSECURE_DEFAULT_PASSWORD, String(hash));
  } catch (error) {
    console.warn(
      "Unable to validate password hash while checking insecure default:",
      error.message,
    );
    return false;
  }
}

const sqliteSchema = `
  CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CLIENT',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    account_number TEXT,
    email_verified INTEGER DEFAULT 0,
    email_verified_at TEXT,
    password_change_required INTEGER DEFAULT 0,
    password_changed_at TEXT,
    email_verification_code TEXT,
    email_verification_expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS localities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    postal_code TEXT,
    latitude REAL,
    longitude REAL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    locality_id TEXT,
    name TEXT NOT NULL,
    legal_name TEXT,
    cif TEXT,
    phone TEXT,
    email TEXT,
    account_number TEXT,
    address TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    estimated_time_min INTEGER DEFAULT 20,
    estimated_time_max INTEGER DEFAULT 60,
    delivery_fee_cents INTEGER DEFAULT 0,
    min_order_cents INTEGER DEFAULT 0,
    banner_url TEXT,
    logo_url TEXT,
    is_shift_open INTEGER DEFAULT 0,
    delivery_modes TEXT DEFAULT '[]',
    delivery_radius_km REAL DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    category_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    tag TEXT,
    ingredients TEXT,
    allergens TEXT,
    price_cents INTEGER DEFAULT 0,
    tax_percentage REAL DEFAULT 0,
    image_url TEXT,
    is_available INTEGER DEFAULT 1,
    is_sold_out INTEGER DEFAULT 0,
    removable_ingredients TEXT,
    additional_ingredients TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    business_id TEXT,
    order_number TEXT,
    customer_name TEXT,
    customer_email TEXT,
    delivery_type TEXT,
    total_cents INTEGER DEFAULT 0,
    status TEXT DEFAULT 'NEW',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price_cents INTEGER DEFAULT 0,
    total_cents INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    entity TEXT NOT NULL,
    action TEXT NOT NULL,
    payload TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

const mysqlSchema = `
  CREATE TABLE IF NOT EXISTS app_users (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    username VARCHAR(64) NULL,
    full_name VARCHAR(180) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(40) NOT NULL DEFAULT 'CLIENT',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    account_number VARCHAR(255) NULL,
    email_verified TINYINT(1) NOT NULL DEFAULT 0,
    email_verified_at DATETIME(3) NULL,
    password_change_required TINYINT(1) NOT NULL DEFAULT 0,
    password_changed_at DATETIME(3) NULL,
    email_verification_code VARCHAR(12) NULL,
    email_verification_expires_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_app_users_email (email),
    UNIQUE KEY uq_app_users_username (username)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS localities (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    name VARCHAR(180) NOT NULL,
    postal_code VARCHAR(20) NULL,
    latitude DECIMAL(9,6) NULL,
    longitude DECIMAL(9,6) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS businesses (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    locality_id VARCHAR(64) NULL,
    name VARCHAR(180) NOT NULL,
    legal_name VARCHAR(180) NULL,
    cif VARCHAR(40) NULL,
    phone VARCHAR(30) NULL,
    email VARCHAR(255) NULL,
    account_number VARCHAR(255) NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(9,6) NULL,
    longitude DECIMAL(9,6) NULL,
    rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    review_count INT NOT NULL DEFAULT 0,
    estimated_time_min INT NOT NULL DEFAULT 20,
    estimated_time_max INT NOT NULL DEFAULT 60,
    delivery_fee_cents INT NOT NULL DEFAULT 0,
    min_order_cents INT NOT NULL DEFAULT 0,
    banner_url TEXT NULL,
    logo_url TEXT NULL,
    is_shift_open TINYINT(1) NOT NULL DEFAULT 0,
    delivery_modes JSON NOT NULL,
    delivery_radius_km DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS products (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    business_id CHAR(36) NOT NULL,
    category_id VARCHAR(64) NULL,
    name VARCHAR(180) NOT NULL,
    description TEXT NULL,
    tag VARCHAR(80) NULL,
    ingredients JSON NULL,
    allergens JSON NULL,
    price_cents INT NOT NULL DEFAULT 0,
    tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    image_url TEXT NULL,
    is_available TINYINT(1) NOT NULL DEFAULT 1,
    is_sold_out TINYINT(1) NOT NULL DEFAULT 0,
    removable_ingredients JSON NULL,
    additional_ingredients JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS orders (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    business_id CHAR(36) NULL,
    order_number VARCHAR(64) NULL,
    customer_name VARCHAR(180) NULL,
    customer_email VARCHAR(255) NULL,
    delivery_type VARCHAR(20) NULL,
    total_cents INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'NEW',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS order_items (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    order_id CHAR(36) NOT NULL,
    product_id CHAR(36) NULL,
    product_name VARCHAR(180) NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price_cents INT NOT NULL DEFAULT 0,
    total_cents INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS audit_logs (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    entity VARCHAR(120) NOT NULL,
    action VARCHAR(120) NOT NULL,
    payload JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const mysqlSchemaStatements = mysqlSchema
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

async function applyMysqlSchema(pool) {
  for (const statement of mysqlSchemaStatements) {
    await pool.query(statement);
  }
}

async function ensureMySqlSchemaShape(pool) {
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'app_users'`,
  );

  const existingColumns = new Set(
    columns.map((column) => String(column.COLUMN_NAME)),
  );
  const pendingClauses = [];

  const ensureColumn = (columnName, definition) => {
    if (!existingColumns.has(columnName)) {
      pendingClauses.push(`ADD COLUMN ${columnName} ${definition}`);
    }
  };

  ensureColumn("account_number", "VARCHAR(255) NULL");
  ensureColumn("email_verified", "TINYINT(1) NOT NULL DEFAULT 0");
  ensureColumn("email_verified_at", "DATETIME(3) NULL");
  ensureColumn("password_change_required", "TINYINT(1) NOT NULL DEFAULT 0");
  ensureColumn("password_changed_at", "DATETIME(3) NULL");
  ensureColumn("email_verification_code", "VARCHAR(12) NULL");
  ensureColumn("email_verification_expires_at", "DATETIME(3) NULL");

  if (!pendingClauses.length) {
    return;
  }

  await pool.query(`ALTER TABLE app_users ${pendingClauses.join(", ")}`);
}

function getSqliteDb() {
  if (!sqliteDb) {
    sqliteDb = new DatabaseSync(DB_PATH);
    sqliteDb.exec("PRAGMA journal_mode = WAL");
  }
  return sqliteDb;
}

const ensureTable = (tableName, createSql) => {
  const db = getSqliteDb();
  const exists = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);

  if (!exists) {
    db.exec(createSql);
  }
};

function ensureSqliteSchemaShape() {
  const db = getSqliteDb();
  db.exec(sqliteSchema);

  const getColumnNames = (tableName) =>
    new Set(
      db
        .prepare(`PRAGMA table_info(${tableName})`)
        .all()
        .map((column) => column.name),
    );

  const ensureColumn = (tableName, columnName, definition) => {
    const existingColumns = getColumnNames(tableName);
    if (!existingColumns.has(columnName)) {
      db.exec(
        `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`,
      );
    }
  };

  ensureColumn("businesses", "account_number", "TEXT");
  ensureColumn("businesses", "rating", "REAL DEFAULT 0");
  ensureColumn("businesses", "review_count", "INTEGER DEFAULT 0");
  ensureColumn("businesses", "latitude", "REAL");
  ensureColumn("businesses", "longitude", "REAL");
  ensureColumn("businesses", "delivery_modes", "TEXT DEFAULT '[]'");
  ensureColumn("businesses", "delivery_radius_km", "REAL DEFAULT 0");
  ensureColumn("businesses", "status", "TEXT DEFAULT 'PENDING'");
  ensureColumn("businesses", "updated_at", "TEXT");

  ensureColumn("products", "tax_percentage", "REAL DEFAULT 0");
  ensureColumn("products", "is_sold_out", "INTEGER DEFAULT 0");
  ensureColumn("products", "allergens", "TEXT");
  ensureColumn("products", "updated_at", "TEXT");

  ensureColumn("orders", "updated_at", "TEXT");

  const userColumns = getColumnNames("app_users");
  if (!userColumns.has("account_number")) {
    db.exec("ALTER TABLE app_users ADD COLUMN account_number TEXT");
  }
  if (!userColumns.has("email_verified")) {
    db.exec(
      "ALTER TABLE app_users ADD COLUMN email_verified INTEGER DEFAULT 0",
    );
  }
  if (!userColumns.has("email_verified_at")) {
    db.exec("ALTER TABLE app_users ADD COLUMN email_verified_at TEXT");
  }
  if (!userColumns.has("password_change_required")) {
    db.exec(
      "ALTER TABLE app_users ADD COLUMN password_change_required INTEGER DEFAULT 0",
    );
  }
  if (!userColumns.has("password_changed_at")) {
    db.exec("ALTER TABLE app_users ADD COLUMN password_changed_at TEXT");
  }
  if (!userColumns.has("email_verification_code")) {
    db.exec("ALTER TABLE app_users ADD COLUMN email_verification_code TEXT");
  }
  if (!userColumns.has("email_verification_expires_at")) {
    db.exec(
      "ALTER TABLE app_users ADD COLUMN email_verification_expires_at TEXT",
    );
  }

  ensureTable(
    "localities",
    `CREATE TABLE localities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      postal_code TEXT,
      latitude REAL,
      longitude REAL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  ensureTable(
    "order_items",
    `CREATE TABLE order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT,
      quantity INTEGER DEFAULT 1,
      unit_price_cents INTEGER DEFAULT 0,
      total_cents INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )`,
  );

  ensureTable(
    "audit_logs",
    `CREATE TABLE audit_logs (
      id TEXT PRIMARY KEY,
      entity TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
}

async function ensureMySqlConnection() {
  if (!mysqlConfig.host || !mysqlConfig.user || !mysqlConfig.database) {
    return null;
  }

  try {
    mysqlPool = mysql.createPool({
      host: mysqlConfig.host,
      port: mysqlConfig.port,
      user: mysqlConfig.user,
      password: mysqlConfig.password,
      database: mysqlConfig.database,
      waitForConnections: true,
      connectionLimit: mysqlConfig.connectionLimit,
      charset: mysqlConfig.charset,
      multipleStatements: mysqlConfig.multipleStatements,
      ssl: { rejectUnauthorized: false },
    });

    const conn = await mysqlPool.getConnection();
    await conn.query("SELECT 1 AS ok");
    conn.release();
    databaseMode = "mysql";
    return mysqlPool;
  } catch (error) {
    console.warn("MySQL not available, falling back to SQLite:", error.message);
    mysqlPool = null;
    databaseMode = "sqlite";
    return null;
  }
}

async function ensureSchema() {
  const pool = await ensureMySqlConnection();

  if (pool) {
    await applyMysqlSchema(pool);
    await ensureMySqlSchemaShape(pool);
    await seedSuperAdmin();
    await flagUsersWithInsecureDefaultPassword();
    return;
  }

  ensureSqliteSchemaShape();
  await seedSuperAdmin();
  await flagUsersWithInsecureDefaultPassword();
}

async function seedSuperAdmin() {
  const userName = process.env.SUPERADMIN_USERNAME || "RafaAdmin";
  const loginPassword = process.env.SUPERADMIN_PASSWORD || "13021999";
  const hash = bcrypt.hashSync(loginPassword, 10);

  if (mysqlPool) {
    await mysqlPool.execute(
      `INSERT INTO app_users (id, username, full_name, email, password_hash, role, status)
       SELECT UUID(), ?, 'RafaAdmin', 'rafaeldesweb@gmail.com', ?, 'SUPERADMIN', 'ACTIVE'
       WHERE NOT EXISTS (SELECT 1 FROM app_users WHERE username = ? OR email = 'rafaeldesweb@gmail.com')`,
      [userName, hash, userName],
    );
    return;
  }

  const db = getSqliteDb();
  const existing = db
    .prepare("SELECT id FROM app_users WHERE username = ? OR email = ?")
    .get(userName, "rafaeldesweb@gmail.com");

  if (!existing) {
    db.prepare(
      `INSERT INTO app_users (id, username, full_name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, 'SUPERADMIN', 'ACTIVE')`,
    ).run(
      `usr-${Date.now()}`,
      userName,
      "RafaAdmin",
      "rafaeldesweb@gmail.com",
      hash,
    );
  }
}

async function flagUsersWithInsecureDefaultPassword() {
  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      `SELECT id, password_hash
         FROM app_users
        WHERE COALESCE(password_change_required, 0) = 0`,
    );
    const affectedIds = rows
      .filter((row) => isUsingInsecureDefaultPassword(row.password_hash))
      .map((row) => row.id);

    if (!affectedIds.length) {
      return;
    }

    const placeholders = affectedIds.map(() => "?").join(", ");
    await mysqlPool.execute(
      `UPDATE app_users
          SET password_change_required = 1
        WHERE id IN (${placeholders})`,
      affectedIds,
    );
    console.warn(
      `Flagged ${affectedIds.length} account(s) requiring password change due to insecure historical default password.`,
    );
    return;
  }

  const db = getSqliteDb();
  const rows = db
    .prepare(
      `SELECT id, password_hash
         FROM app_users
        WHERE COALESCE(password_change_required, 0) = 0`,
    )
    .all();

  let affectedCount = 0;
  const markStatement = db.prepare(
    "UPDATE app_users SET password_change_required = 1 WHERE id = ?",
  );

  for (const row of rows) {
    if (!isUsingInsecureDefaultPassword(row.password_hash)) continue;
    markStatement.run(row.id);
    affectedCount += 1;
  }

  if (affectedCount) {
    console.warn(
      `Flagged ${affectedCount} account(s) requiring password change due to insecure historical default password.`,
    );
  }
}

function sanitizeUser(row) {
  if (!row) return null;
  const isEmailVerified = Boolean(
    row.email_verified === 1 ||
    row.email_verified === true ||
    row.is_email_verified === 1 ||
    row.is_email_verified === true ||
    row.email_verified_at,
  );

  return {
    id: row.id,
    username: row.username || row.email?.split("@")[0] || "",
    name: row.full_name || row.name || row.username || "Usuario",
    email: row.email,
    role: row.role || "CLIENT",
    status: row.status || "ACTIVE",
    accountNumber: row.account_number || row.accountNumber || "",
    isEmailVerified: isEmailVerified,
    emailVerified: isEmailVerified,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function buildVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || "";
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || "";
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";

  if (!host || !user || !pass) {
    return null;
  }

  const preferredPort = Number(
    process.env.SMTP_PORT || process.env.EMAIL_PORT || 465,
  );
  const preferredSecure =
    String(
      process.env.SMTP_SECURE || process.env.EMAIL_SECURE || "true",
    ).toLowerCase() === "true";

  const candidates = [
    { port: preferredPort, secure: preferredSecure },
    ...(preferredPort === 465
      ? [{ port: 587, secure: false }]
      : preferredPort === 587
        ? [{ port: 465, secure: true }]
        : []),
  ];

  const seen = new Set();
  for (const candidate of candidates) {
    const key = `${candidate.port}:${candidate.secure}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const transport = nodemailer.createTransport({
      host,
      port: candidate.port,
      secure: candidate.secure,
      auth: { user, pass },
      requireTLS: !candidate.secure,
      tls: { rejectUnauthorized: false },
    });

    if (transport) {
      return transport;
    }
  }

  return null;
}

async function sendVerificationEmail({ email, fullName, code }) {
  const from =
    process.env.EMAIL_FROM || process.env.SMTP_FROM || "noreply@pidetietar.es";
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || "";
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || "";
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";

  if (!host || !user || !pass) {
    return {
      sent: false,
      code,
      message:
        "SMTP no configurado; se devuelve el código para pruebas locales.",
    };
  }

  const candidateConfigs = [
    {
      port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465),
      secure:
        String(
          process.env.SMTP_SECURE || process.env.EMAIL_SECURE || "true",
        ).toLowerCase() === "true",
    },
    { port: 587, secure: false },
    { port: 465, secure: true },
  ];

  const seen = new Set();
  for (const cfg of candidateConfigs) {
    const key = `${cfg.port}:${cfg.secure}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const transporter = nodemailer.createTransport({
        host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user, pass },
        requireTLS: !cfg.secure,
        tls: { rejectUnauthorized: false },
      });

      await transporter.sendMail({
        from,
        to: email,
        subject: "Verifica tu cuenta en PideTiétar",
        text: `Hola ${fullName || "usuario"},\n\nTu código de verificación es: ${code}\n\nEste código expira en 15 minutos.`,
        html: `
          <div style="font-family: Arial, sans-serif; background: #fff; color: #1a1a1a; padding: 24px; border-radius: 12px; max-width: 560px; margin: 0 auto; border: 1px solid #f0f0f0;">
            <h2 style="color: #ff4e00; margin-top: 0;">PideTiétar</h2>
            <p>Hola <strong>${fullName || "usuario"}</strong>,</p>
            <p>Para verificar tu cuenta, usa este código:</p>
            <div style="background: #fff5f0; border: 2px dashed #ff4e00; border-radius: 10px; padding: 18px; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 4px; margin: 20px 0; color: #a93200;">${code}</div>
            <p>Este código expira en 15 minutos.</p>
          </div>
        `,
      });

      return { sent: true, code };
    } catch (error) {
      // Continue to next candidate if the first SMTP mode fails.
    }
  }

  return {
    sent: false,
    code,
    message:
      "No fue posible enviar el correo con el SMTP configurado; se devuelve el código para pruebas locales.",
  };
}

async function setUserVerificationCode(userId, code) {
  const expiresAt = new Date(Date.now() + emailVerificationTtlMs).toISOString();

  if (mysqlPool) {
    await mysqlPool.execute(
      "UPDATE app_users SET email_verification_code = ?, email_verification_expires_at = ?, email_verified = 0 WHERE id = ?",
      [code, expiresAt, userId],
    );
    return;
  }

  const db = getSqliteDb();
  db.prepare(
    "UPDATE app_users SET email_verification_code = ?, email_verification_expires_at = ?, email_verified = 0 WHERE id = ?",
  ).run(code, expiresAt, userId);
}

async function clearUserVerificationCode(userId) {
  if (mysqlPool) {
    await mysqlPool.execute(
      "UPDATE app_users SET email_verified = 1, email_verified_at = ?, email_verification_code = NULL, email_verification_expires_at = NULL WHERE id = ?",
      [new Date().toISOString(), userId],
    );
    return;
  }

  const db = getSqliteDb();
  db.prepare(
    "UPDATE app_users SET email_verified = 1, email_verified_at = ?, email_verification_code = NULL, email_verification_expires_at = NULL WHERE id = ?",
  ).run(new Date().toISOString(), userId);
}

async function getUserByIdentifier(identifier) {
  const value = String(identifier || "").trim();

  if (!value) return null;

  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM app_users WHERE username = ? OR email = ? LIMIT 1",
      [value, value],
    );
    return rows[0] || null;
  }

  const db = getSqliteDb();
  return (
    db
      .prepare(
        "SELECT * FROM app_users WHERE username = ? OR email = ? LIMIT 1",
      )
      .get(value, value) || null
  );
}

// A diferencia de getUserByIdentifier (que compara un único valor contra
// username Y email), esta función comprueba el username y el email reales por
// separado. Es necesaria porque un usuario puede existir con un email dado
// bajo un username distinto (p. ej. la cuenta semilla del superadmin usa
// username "RafaAdmin" con email "rafaeldesweb@gmail.com"): si alguien se
// registra con ese mismo email derivando otro username, getUserByIdentifier(
// username) nunca encontraba el email ya existente y la inserción posterior
// violaba la restricción UNIQUE de la columna email.
async function findUserByUsernameOrEmail(username, email) {
  const cleanUsername = String(username || "").trim();
  const cleanEmail = String(email || "").trim();

  const conditions = [];
  const params = [];

  if (cleanUsername) {
    conditions.push("username = ?");
    params.push(cleanUsername);
  }

  if (cleanEmail) {
    conditions.push("email = ?");
    params.push(cleanEmail);
  }

  if (conditions.length === 0) return null;

  const sql = `SELECT * FROM app_users WHERE (${conditions.join(" OR ")}) LIMIT 1`;

  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(sql, params);
    return rows[0] || null;
  }

  const db = getSqliteDb();
  return db.prepare(sql).get(...params) || null;
}

async function listLocalities() {
  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM localities ORDER BY created_at DESC",
    );
    return rows;
  }

  const db = getSqliteDb();
  return db.prepare("SELECT * FROM localities ORDER BY created_at DESC").all();
}

async function listBusinesses() {
  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM businesses ORDER BY created_at DESC",
    );
    return rows;
  }

  const db = getSqliteDb();
  return db.prepare("SELECT * FROM businesses ORDER BY created_at DESC").all();
}

async function listProducts() {
  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM products ORDER BY created_at DESC",
    );
    return rows;
  }

  const db = getSqliteDb();
  return db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
}

async function listOrders() {
  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM orders ORDER BY created_at DESC",
    );
    return rows;
  }

  const db = getSqliteDb();
  return db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
}

async function listUsers() {
  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM app_users ORDER BY created_at DESC",
    );
    return rows;
  }

  const db = getSqliteDb();
  return db.prepare("SELECT * FROM app_users ORDER BY created_at DESC").all();
}

async function createUser({
  username,
  fullName,
  email,
  password,
  role = "CLIENT",
}) {
  const cleanUsername = String(
    username || email.split("@")[0] || "client",
  ).trim();
  const cleanEmail = String(
    email || `${cleanUsername}@pidetietar.local`,
  ).trim();
  const cleanPassword = validatePasswordOrThrow(password);
  const hash = bcrypt.hashSync(cleanPassword, 10);

  if (mysqlPool) {
    const id = cryptoRandomId();
    await mysqlPool.execute(
      "INSERT INTO app_users (id, username, full_name, email, password_hash, role, status, email_verified) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 0)",
      [id, cleanUsername, fullName || cleanUsername, cleanEmail, hash, role],
    );
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM app_users WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0];
  }

  const db = getSqliteDb();
  const id = cryptoRandomId();
  db.prepare(
    "INSERT INTO app_users (id, username, full_name, email, password_hash, role, status, email_verified) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 0)",
  ).run(id, cleanUsername, fullName || cleanUsername, cleanEmail, hash, role);
  return db.prepare("SELECT * FROM app_users WHERE id = ? LIMIT 1").get(id);
}

function cryptoRandomId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", async (_req, res) => {
  const pool = await ensureMySqlConnection();
  res.json({
    status: "ok",
    mode: pool ? "mysql" : "sqlite",
    database: pool ? process.env.MYSQL_DATABASE || "mysql" : DB_PATH,
    timestamp: new Date().toISOString(),
    superadmin: {
      username: process.env.SUPERADMIN_USERNAME || "RafaAdmin",
      configured: true,
    },
  });
});

app.get("/api/debug/database", async (_req, res) => {
  const pool = await ensureMySqlConnection();
  if (pool) {
    const [rows] = await pool.query("SHOW TABLES");
    return res.json({
      mode: "mysql",
      database: process.env.MYSQL_DATABASE,
      tables: rows.map((r) => Object.values(r)[0]),
    });
  }

  const tables = getSqliteDb()
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    .all();
  res.json({
    mode: "sqlite",
    database: DB_PATH,
    tables: tables.map((item) => item.name),
  });
});

app.post("/api/auth/register", async (req, res) => {
  const {
    username,
    fullName,
    email,
    password,
    role = "CLIENT",
  } = req.body || {};
  const cleanPassword = normalizePassword(password);
  if (!email || !cleanPassword) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Email y contraseña son obligatorios",
    });
  }
  if (cleanPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
    });
  }

  const existing = await findUserByUsernameOrEmail(username, email);
  if (existing) {
    return res
      .status(409)
      .json({ code: "USER_EXISTS", message: "El usuario o correo ya existe" });
  }

  const newUser = await createUser({
    username,
    fullName,
    email,
    password: cleanPassword,
    role,
  });

  const verificationCode = buildVerificationCode();
  await setUserVerificationCode(newUser.id, verificationCode);
  const emailDelivery = await sendVerificationEmail({
    email: newUser.email,
    fullName: newUser.full_name || newUser.username || "usuario",
    code: verificationCode,
  });

  res.status(201).json({
    success: true,
    user: sanitizeUser(newUser),
    requiresEmailVerification: true,
    emailVerificationSent: emailDelivery.sent,
    verificationCode: emailDelivery.sent ? undefined : verificationCode,
    message: emailDelivery.sent
      ? "Usuario creado. Revisa tu email para verificar la cuenta."
      : "Usuario creado. Se ha generado un código de verificación para pruebas locales.",
  });
});

app.post("/api/auth/send-verification-email", async (req, res) => {
  const { email } = req.body || {};
  const user = await getUserByIdentifier(email);

  if (!user) {
    return res.status(404).json({
      code: "USER_NOT_FOUND",
      message: "No existe un usuario con ese correo.",
    });
  }

  const code = buildVerificationCode();
  await setUserVerificationCode(user.id, code);
  const emailDelivery = await sendVerificationEmail({
    email: user.email,
    fullName: user.full_name || user.username || "usuario",
    code,
  });

  res.json({
    success: true,
    sent: emailDelivery.sent,
    code: emailDelivery.sent ? undefined : code,
    message: emailDelivery.sent
      ? "Código de verificación enviado al correo."
      : "Código generado para pruebas locales.",
  });
});

app.post("/api/auth/verify-email", async (req, res) => {
  const { email, code } = req.body || {};
  const user = await getUserByIdentifier(email);

  if (!user) {
    return res.status(404).json({
      code: "USER_NOT_FOUND",
      message: "No encontramos ese usuario.",
    });
  }

  const expiresAtRaw =
    user.email_verification_expires_at || user.email_verificationExpiresAt;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw).getTime() : 0;
  const currentCode =
    user.email_verification_code || user.emailVerificationCode;

  if (user.email_verified === 1 || user.email_verified === true) {
    return res.json({
      success: true,
      verified: true,
      message: "El correo ya estaba verificado.",
    });
  }

  if (!currentCode || !code || String(code) !== String(currentCode)) {
    return res.status(400).json({
      code: "INVALID_CODE",
      message: "Código de verificación inválido.",
    });
  }

  if (Date.now() > expiresAt) {
    return res.status(410).json({
      code: "EXPIRED_CODE",
      message: "El código ha expirado; solicita uno nuevo.",
    });
  }

  await clearUserVerificationCode(user.id);

  res.json({
    success: true,
    verified: true,
    message: "Correo verificado correctamente.",
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { username, email, password } = req.body || {};
  const identifier = username || email;
  const cleanPassword = String(password || "");

  if (!identifier || !cleanPassword) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Usuario y contraseña obligatorios",
    });
  }

  if (
    String(identifier).toLowerCase() === "rafaadmin" &&
    cleanPassword === (process.env.SUPERADMIN_PASSWORD || "13021999")
  ) {
    const user = {
      id: "superadmin-rafaadmin",
      username: "RafaAdmin",
      full_name: "RafaAdmin",
      email: "rafaeldesweb@gmail.com",
      role: "SUPERADMIN",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
    };
    return res.json({ success: true, user: sanitizeUser(user) });
  }

  const user = await getUserByIdentifier(identifier);

  if (!user || !bcrypt.compareSync(cleanPassword, user.password_hash)) {
    return res
      .status(401)
      .json({ code: "INVALID_CREDENTIALS", message: "Credenciales inválidas" });
  }

  const requiresPasswordChange = Boolean(
    user.password_change_required === 1 ||
      user.password_change_required === true,
  );

  if (requiresPasswordChange) {
    return res.status(403).json({
      code: "PASSWORD_CHANGE_REQUIRED",
      message:
        "Por seguridad, debes cambiar tu contraseña antes de iniciar sesión.",
      requiresPasswordChange: true,
      identifier: user.email || user.username || identifier,
    });
  }

  const isEmailVerified = Boolean(
    user.email_verified === 1 ||
    user.email_verified === true ||
    user.email_verified_at,
  );

  if (
    !isEmailVerified &&
    user.email &&
    user.email !== "rafaeldesweb@gmail.com"
  ) {
    return res.status(403).json({
      code: "EMAIL_NOT_VERIFIED",
      message: "Debes verificar tu correo antes de iniciar sesión.",
      user: sanitizeUser(user),
      requiresEmailVerification: true,
    });
  }

  res.json({ success: true, user: sanitizeUser(user) });
});

app.post("/api/auth/change-password", async (req, res) => {
  const { identifier, currentPassword, newPassword } = req.body || {};
  const cleanIdentifier = String(identifier || "").trim();
  const cleanCurrentPassword = normalizePassword(currentPassword);
  const cleanNewPassword = normalizePassword(newPassword);

  if (!cleanIdentifier || !cleanCurrentPassword || !cleanNewPassword) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Identificador, contraseña actual y nueva contraseña son obligatorios.",
    });
  }

  if (cleanNewPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    });
  }

  if (cleanCurrentPassword === cleanNewPassword) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "La nueva contraseña debe ser diferente a la actual.",
    });
  }

  const user = await getUserByIdentifier(cleanIdentifier);
  if (!user || !bcrypt.compareSync(cleanCurrentPassword, user.password_hash)) {
    return res.status(401).json({
      code: "INVALID_CREDENTIALS",
      message: "No se pudo validar tu identidad para cambiar la contraseña.",
    });
  }

  const newHash = bcrypt.hashSync(cleanNewPassword, 10);
  const changedAt = new Date().toISOString();

  if (mysqlPool) {
    await mysqlPool.execute(
      `UPDATE app_users
          SET password_hash = ?,
              password_change_required = 0,
              password_changed_at = ?
        WHERE id = ?`,
      [newHash, changedAt, user.id],
    );
  } else {
    const db = getSqliteDb();
    db.prepare(
      `UPDATE app_users
          SET password_hash = ?,
              password_change_required = 0,
              password_changed_at = ?
        WHERE id = ?`,
    ).run(newHash, changedAt, user.id);
  }

  return res.json({
    success: true,
    message: "Contraseña actualizada correctamente. Ya puedes iniciar sesión.",
  });
});

app.get("/api/auth/me", async (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId;
  if (!userId) {
    return res
      .status(401)
      .json({ code: "UNAUTHORIZED", message: "No hay sesión activa" });
  }

  if (String(userId) === "superadmin-rafaadmin") {
    return res.json({
      user: sanitizeUser({
        id: "superadmin-rafaadmin",
        username: "RafaAdmin",
        full_name: "RafaAdmin",
        email: "rafaeldesweb@gmail.com",
        role: "SUPERADMIN",
        status: "ACTIVE",
        created_at: new Date().toISOString(),
      }),
    });
  }

  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM app_users WHERE id = ? LIMIT 1",
      [String(userId)],
    );
    return res.json({ user: sanitizeUser(rows[0]) });
  }

  const db = getSqliteDb();
  const row = db
    .prepare("SELECT * FROM app_users WHERE id = ? LIMIT 1")
    .get(String(userId));
  res.json({ user: sanitizeUser(row) });
});

app.get("/api/localities", async (_req, res) => {
  const rows = await listLocalities();
  res.json(rows);
});

app.post("/api/localities", async (req, res) => {
  const body = req.body || {};
  const id = body.id || cryptoRandomId();
  const payload = {
    id,
    name: body.name || "Nueva zona",
    postal_code: body.postalCode || body.postal_code || "00000",
    latitude: body.coordinates?.lat ?? body.latitude ?? 40.2891,
    longitude: body.coordinates?.lng ?? body.longitude ?? -4.5824,
    is_active: Number(body.active ?? body.is_active ?? 1),
  };

  if (mysqlPool) {
    await mysqlPool.execute(
      "INSERT INTO localities (id, name, postal_code, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?)",
      [
        payload.id,
        payload.name,
        payload.postal_code,
        payload.latitude,
        payload.longitude,
        payload.is_active,
      ],
    );
    return res.status(201).json({ success: true, locality: payload });
  }

  const db = getSqliteDb();
  db.prepare(
    "INSERT INTO localities (id, name, postal_code, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    payload.id,
    payload.name,
    payload.postal_code,
    payload.latitude,
    payload.longitude,
    payload.is_active,
  );
  res.status(201).json({ success: true, locality: payload });
});

app.put("/api/localities/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const fields = [];
  const values = [];

  if (body.name !== undefined) {
    fields.push("name = ?");
    values.push(body.name);
  }
  if (body.postalCode !== undefined || body.postal_code !== undefined) {
    fields.push("postal_code = ?");
    values.push(body.postalCode ?? body.postal_code);
  }
  if (
    body.coordinates !== undefined ||
    body.latitude !== undefined ||
    body.longitude !== undefined
  ) {
    fields.push("latitude = ?", "longitude = ?");
    values.push(
      body.coordinates?.lat ?? body.latitude ?? null,
      body.coordinates?.lng ?? body.longitude ?? null,
    );
  }
  if (body.active !== undefined || body.is_active !== undefined) {
    fields.push("is_active = ?");
    values.push(Number(body.active ?? body.is_active ?? 1));
  }

  if (!fields.length) {
    return res
      .status(400)
      .json({ success: false, message: "No hay campos para actualizar" });
  }

  values.push(id);
  if (mysqlPool) {
    await mysqlPool.execute(
      `UPDATE localities SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
    return res.json({ success: true });
  }

  const db = getSqliteDb();
  db.prepare(`UPDATE localities SET ${fields.join(", ")} WHERE id = ?`).run(
    ...values,
  );
  res.json({ success: true });
});

app.delete("/api/localities/:id", async (req, res) => {
  const { id } = req.params;
  if (mysqlPool) {
    await mysqlPool.execute("DELETE FROM localities WHERE id = ?", [id]);
    return res.json({ success: true });
  }

  const db = getSqliteDb();
  db.prepare("DELETE FROM localities WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/api/users", async (_req, res) => {
  const rows = await listUsers();
  res.json(rows.map((row) => sanitizeUser(row)));
});

app.post("/api/users", async (req, res) => {
  const cleanPassword = normalizePassword(req.body?.password);
  if (!cleanPassword) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "La contraseña es obligatoria para crear usuarios",
    });
  }
  if (cleanPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
    });
  }
  const user = await createUser({ ...req.body, password: cleanPassword });
  res.status(201).json({ success: true, user: sanitizeUser(user) });
});

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const updates = [];
  const values = [];

  if (body.username !== undefined) {
    updates.push("username = ?");
    values.push(body.username);
  }
  if (
    body.fullName !== undefined ||
    body.full_name !== undefined ||
    body.name !== undefined
  ) {
    updates.push("full_name = ?");
    values.push(body.fullName ?? body.full_name ?? body.name ?? "");
  }
  if (body.email !== undefined) {
    updates.push("email = ?");
    values.push(body.email);
  }
  if (body.password !== undefined) {
    updates.push("password_hash = ?");
    values.push(bcrypt.hashSync(String(body.password), 10));
  }
  if (body.role !== undefined) {
    updates.push("role = ?");
    values.push(body.role);
  }
  if (body.status !== undefined) {
    updates.push("status = ?");
    values.push(body.status);
  }
  if (body.phone !== undefined) {
    updates.push("phone = ?");
    values.push(body.phone);
  }
  if (body.accountNumber !== undefined || body.account_number !== undefined) {
    updates.push("account_number = ?");
    values.push(body.accountNumber ?? body.account_number ?? null);
  }

  if (!updates.length) {
    return res
      .status(400)
      .json({ success: false, message: "No hay campos para actualizar" });
  }

  values.push(id);
  if (mysqlPool) {
    await mysqlPool.execute(
      `UPDATE app_users SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM app_users WHERE id = ? LIMIT 1",
      [id],
    );
    return res.json({ success: true, user: sanitizeUser(rows[0]) });
  }

  const db = getSqliteDb();
  db.prepare(`UPDATE app_users SET ${updates.join(", ")} WHERE id = ?`).run(
    ...values,
  );
  const row = db
    .prepare("SELECT * FROM app_users WHERE id = ? LIMIT 1")
    .get(id);
  res.json({ success: true, user: sanitizeUser(row) });
});

app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  if (mysqlPool) {
    await mysqlPool.execute("DELETE FROM app_users WHERE id = ?", [id]);
    return res.json({ success: true });
  }

  const db = getSqliteDb();
  db.prepare("DELETE FROM app_users WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/api/businesses", async (_req, res) => {
  const rows = await listBusinesses();
  res.json(rows);
});

app.post("/api/businesses", async (req, res) => {
  const body = req.body || {};
  const payload = {
    id: body.id || cryptoRandomId(),
    locality_id: body.locality_id || body.localityId || "locality-default",
    name: body.name || "Nuevo negocio",
    legal_name:
      body.legal_name || body.legalName || body.name || "Nuevo negocio",
    cif: body.cif || "00000000A",
    phone: body.phone || "+34 600 000 000",
    email: body.email || "contacto@negocio.local",
    account_number: body.accountNumber || body.account_number || null,
    address: body.address || "Dirección no indicada",
    latitude: body.latitude || 40.289,
    longitude: body.longitude || -4.58,
    rating: body.rating || 4.8,
    review_count: body.review_count || 0,
    estimated_time_min: body.estimated_time_min || 20,
    estimated_time_max: body.estimated_time_max || 40,
    delivery_fee_cents: body.delivery_fee_cents || 0,
    min_order_cents: body.min_order_cents || 0,
    banner_url: body.banner_url || body.bannerUrl || "",
    logo_url: body.logo_url || body.logoUrl || "",
    is_shift_open: Number(body.is_shift_open ?? body.isShiftOpen ?? 1),
    delivery_modes: JSON.stringify(
      body.delivery_modes || body.deliveryModes || ["PICKUP"],
    ),
    delivery_radius_km: body.delivery_radius_km || body.deliveryRadiusKm || 5,
    status: body.status || "APPROVED",
  };

  if (mysqlPool) {
    await mysqlPool.execute(
      `INSERT INTO businesses (id, locality_id, name, legal_name, cif, phone, email, account_number, address, latitude, longitude, rating, review_count, estimated_time_min, estimated_time_max, delivery_fee_cents, min_order_cents, banner_url, logo_url, is_shift_open, delivery_modes, delivery_radius_km, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.id,
        payload.locality_id,
        payload.name,
        payload.legal_name,
        payload.cif,
        payload.phone,
        payload.email,
        payload.account_number,
        payload.address,
        payload.latitude,
        payload.longitude,
        payload.rating,
        payload.review_count,
        payload.estimated_time_min,
        payload.estimated_time_max,
        payload.delivery_fee_cents,
        payload.min_order_cents,
        payload.banner_url,
        payload.logo_url,
        payload.is_shift_open,
        payload.delivery_modes,
        payload.delivery_radius_km,
        payload.status,
      ],
    );
    return res.status(201).json({ success: true, id: payload.id });
  }

  const db = getSqliteDb();
  db.prepare(
    `INSERT INTO businesses (id, locality_id, name, legal_name, cif, phone, email, account_number, address, latitude, longitude, rating, review_count, estimated_time_min, estimated_time_max, delivery_fee_cents, min_order_cents, banner_url, logo_url, is_shift_open, delivery_modes, delivery_radius_km, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    payload.id,
    payload.locality_id,
    payload.name,
    payload.legal_name,
    payload.cif,
    payload.phone,
    payload.email,
    payload.account_number,
    payload.address,
    payload.latitude,
    payload.longitude,
    payload.rating,
    payload.review_count,
    payload.estimated_time_min,
    payload.estimated_time_max,
    payload.delivery_fee_cents,
    payload.min_order_cents,
    payload.banner_url,
    payload.logo_url,
    payload.is_shift_open,
    payload.delivery_modes,
    payload.delivery_radius_km,
    payload.status,
  );

  res.status(201).json({ success: true, id: payload.id });
});

app.put("/api/businesses/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const updates = [];
  const values = [];

  const assign = (field, value) => {
    updates.push(`${field} = ?`);
    values.push(value);
  };
  if (body.name !== undefined) assign("name", body.name);
  if (body.legal_name !== undefined || body.legalName !== undefined)
    assign("legal_name", body.legal_name ?? body.legalName);
  if (body.cif !== undefined) assign("cif", body.cif);
  if (body.phone !== undefined) assign("phone", body.phone);
  if (body.email !== undefined) assign("email", body.email);
  if (body.accountNumber !== undefined || body.account_number !== undefined)
    assign("account_number", body.accountNumber ?? body.account_number);
  if (body.address !== undefined) assign("address", body.address);
  if (body.locality_id !== undefined || body.localityId !== undefined)
    assign("locality_id", body.locality_id ?? body.localityId);
  if (body.status !== undefined) assign("status", body.status);
  if (
    body.deliveryFeeCents !== undefined ||
    body.delivery_fee_cents !== undefined
  )
    assign(
      "delivery_fee_cents",
      body.deliveryFeeCents ?? body.delivery_fee_cents,
    );
  if (body.isShiftOpen !== undefined || body.is_shift_open !== undefined)
    assign("is_shift_open", body.isShiftOpen ?? body.is_shift_open);

  if (!updates.length) {
    return res
      .status(400)
      .json({ success: false, message: "No hay campos para actualizar" });
  }

  values.push(id);
  if (mysqlPool) {
    await mysqlPool.execute(
      `UPDATE businesses SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
    return res.json({ success: true });
  }

  const db = getSqliteDb();
  db.prepare(`UPDATE businesses SET ${updates.join(", ")} WHERE id = ?`).run(
    ...values,
  );
  res.json({ success: true });
});

app.delete("/api/businesses/:id", async (req, res) => {
  const { id } = req.params;
  if (mysqlPool) {
    await mysqlPool.execute("DELETE FROM businesses WHERE id = ?", [id]);
    return res.json({ success: true });
  }

  const db = getSqliteDb();
  db.prepare("DELETE FROM businesses WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/api/products", async (_req, res) => {
  const rows = await listProducts();
  res.json(rows);
});

app.post("/api/products", async (req, res) => {
  const body = req.body || {};
  const product = {
    id: body.id || cryptoRandomId(),
    business_id: body.business_id || body.businessId || "business-default",
    category_id: body.category_id || body.categoryId || "general",
    name: body.name || "Nuevo producto",
    description: body.description || "",
    tag: body.tag || "",
    ingredients: JSON.stringify(body.ingredients || []),
    allergens: JSON.stringify(body.allergens || []),
    price_cents: body.price_cents ?? body.priceCents ?? 0,
    tax_percentage: body.tax_percentage ?? body.taxPercentage ?? 0,
    image_url: body.image_url || body.imageUrl || "",
    is_available: Number(body.is_available ?? body.isAvailable ?? 1),
    is_sold_out: Number(body.is_sold_out ?? body.isSoldOut ?? 0),
    removable_ingredients: JSON.stringify(
      body.removable_ingredients || body.removableIngredients || [],
    ),
    additional_ingredients: JSON.stringify(
      body.additional_ingredients || body.additionalIngredients || [],
    ),
  };

  if (mysqlPool) {
    await mysqlPool.execute(
      `INSERT INTO products (id, business_id, category_id, name, description, tag, ingredients, allergens, price_cents, tax_percentage, image_url, is_available, is_sold_out, removable_ingredients, additional_ingredients)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.id,
        product.business_id,
        product.category_id,
        product.name,
        product.description,
        product.tag,
        product.ingredients,
        product.allergens,
        product.price_cents,
        product.tax_percentage,
        product.image_url,
        product.is_available,
        product.is_sold_out,
        product.removable_ingredients,
        product.additional_ingredients,
      ],
    );
    return res.status(201).json({ success: true, id: product.id });
  }

  const db = getSqliteDb();
  db.prepare(
    `INSERT INTO products (id, business_id, category_id, name, description, tag, ingredients, allergens, price_cents, tax_percentage, image_url, is_available, is_sold_out, removable_ingredients, additional_ingredients)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    product.id,
    product.business_id,
    product.category_id,
    product.name,
    product.description,
    product.tag,
    product.ingredients,
    product.allergens,
    product.price_cents,
    product.tax_percentage,
    product.image_url,
    product.is_available,
    product.is_sold_out,
    product.removable_ingredients,
    product.additional_ingredients,
  );
  res.status(201).json({ success: true, id: product.id });
});

app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const updates = [];
  const values = [];
  const assign = (field, value) => {
    updates.push(`${field} = ?`);
    values.push(value);
  };

  if (body.name !== undefined) assign("name", body.name);
  if (body.description !== undefined) assign("description", body.description);
  if (body.price_cents !== undefined || body.priceCents !== undefined)
    assign("price_cents", body.price_cents ?? body.priceCents);
  if (body.tax_percentage !== undefined || body.taxPercentage !== undefined)
    assign("tax_percentage", body.tax_percentage ?? body.taxPercentage);
  if (body.is_available !== undefined || body.isAvailable !== undefined)
    assign("is_available", body.is_available ?? body.isAvailable);
  if (body.is_sold_out !== undefined || body.isSoldOut !== undefined)
    assign("is_sold_out", body.is_sold_out ?? body.isSoldOut);
  if (body.image_url !== undefined || body.imageUrl !== undefined)
    assign("image_url", body.image_url ?? body.imageUrl);

  if (!updates.length) {
    return res
      .status(400)
      .json({ success: false, message: "No hay campos para actualizar" });
  }

  values.push(id);
  if (mysqlPool) {
    await mysqlPool.execute(
      `UPDATE products SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
    return res.json({ success: true });
  }

  const db = getSqliteDb();
  db.prepare(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`).run(
    ...values,
  );
  res.json({ success: true });
});

app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  if (mysqlPool) {
    await mysqlPool.execute("DELETE FROM products WHERE id = ?", [id]);
    return res.json({ success: true });
  }

  const db = getSqliteDb();
  db.prepare("DELETE FROM products WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/api/orders", async (_req, res) => {
  const rows = await listOrders();
  res.json(rows);
});

app.post("/api/orders", async (req, res) => {
  const body = req.body || {};
  const id = body.id || cryptoRandomId();
  const total = Number(body.total_cents ?? body.totalCents ?? 0);

  if (mysqlPool) {
    await mysqlPool.execute(
      "INSERT INTO orders (id, business_id, order_number, customer_name, customer_email, delivery_type, total_cents, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        body.business_id || null,
        body.order_number || `PT-${Math.floor(Math.random() * 9000 + 1000)}`,
        body.customer_name || "Cliente",
        body.customer_email || "cliente@pidetietar.local",
        body.delivery_type || "DELIVERY",
        total,
        body.status || "NEW",
      ],
    );
    return res.status(201).json({ success: true, id });
  }

  const db = getSqliteDb();
  db.prepare(
    "INSERT INTO orders (id, business_id, order_number, customer_name, customer_email, delivery_type, total_cents, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    id,
    body.business_id || null,
    body.order_number || `PT-${Math.floor(Math.random() * 9000 + 1000)}`,
    body.customer_name || "Cliente",
    body.customer_email || "cliente@pidetietar.local",
    body.delivery_type || "DELIVERY",
    total,
    body.status || "NEW",
  );

  res.status(201).json({ success: true, id });
});

app.put("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const updates = [];
  const values = [];
  const assign = (field, value) => {
    updates.push(`${field} = ?`);
    values.push(value);
  };

  if (body.status !== undefined) assign("status", body.status);
  if (body.total_cents !== undefined || body.totalCents !== undefined)
    assign("total_cents", Number(body.total_cents ?? body.totalCents));
  if (body.customer_name !== undefined)
    assign("customer_name", body.customer_name);
  if (body.customer_email !== undefined)
    assign("customer_email", body.customer_email);

  if (!updates.length) {
    return res
      .status(400)
      .json({ success: false, message: "No hay campos para actualizar" });
  }

  values.push(id);
  if (mysqlPool) {
    await mysqlPool.execute(
      `UPDATE orders SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
    return res.json({ success: true });
  }

  const db = getSqliteDb();
  db.prepare(`UPDATE orders SET ${updates.join(", ")} WHERE id = ?`).run(
    ...values,
  );
  res.json({ success: true });
});

app.delete("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  if (mysqlPool) {
    await mysqlPool.execute("DELETE FROM orders WHERE id = ?", [id]);
    return res.json({ success: true });
  }

  const db = getSqliteDb();
  db.prepare("DELETE FROM orders WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/api/debug/config", (_req, res) => {
  res.json({
    mysqlHost: process.env.MYSQL_HOST || null,
    mysqlDatabase: process.env.MYSQL_DATABASE || null,
    mysqlUser: process.env.MYSQL_USER || null,
    mode: databaseMode,
    superadminUser: process.env.SUPERADMIN_USERNAME || "RafaAdmin",
    productionReady: !!(
      process.env.MYSQL_HOST &&
      process.env.MYSQL_USER &&
      process.env.MYSQL_DATABASE
    ),
  });
});

const distPath = path.join(__dirname, "dist");
const indexFile = path.join(distPath, "index.html");

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(indexFile);
  });
} else {
  app.get("*", (_req, res) => {
    res.status(200).json({
      message:
        "Backend listo. Ejecuta npm run build para publicar la app en producción.",
      mode: databaseMode,
      database: mysqlPool ? process.env.MYSQL_DATABASE || "mysql" : DB_PATH,
    });
  });
}

// Middleware de error de Express (4 argumentos): captura cualquier error
// reenviado por los handlers async envueltos más arriba y responde con JSON
// en lugar de dejar que Express devuelva HTML o que el proceso se caiga.
app.use((err, _req, res, _next) => {
  console.error("Unhandled route error:", err);
  if (res.headersSent) return;

  const isDuplicate =
    err?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    err?.code === "SQLITE_CONSTRAINT" ||
    err?.code === "ER_DUP_ENTRY";

  if (isDuplicate) {
    return res.status(409).json({
      code: "USER_EXISTS",
      message: "El usuario o correo ya existe",
    });
  }

  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "Error interno del servidor. Inténtalo de nuevo más tarde.",
  });
});

// Red de seguridad adicional: si algún error asíncrono se generase fuera del
// ciclo de petición/respuesta (por tanto fuera del wrapper de rutas de arriba),
// se registra en lugar de dejar que tumbe todo el proceso y provoque un 503.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

// No se usa top-level await: algunos cargadores de hosting (p. ej. Hostinger)
// arrancan este archivo con require(), y require() no puede cargar
// sincrónicamente un grafo ESM que contenga top-level await. Se envuelve el
// arranque en una función async para mantener el mismo comportamiento sin
// dejar ningún await en el ámbito superior del módulo.
async function startServer() {
  await ensureSchema();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PideTiétar backend running on http://0.0.0.0:${PORT}`);
    console.log(`Database mode: ${databaseMode}`);
    console.log(
      `Database target: ${mysqlPool ? process.env.MYSQL_DATABASE || "mysql" : DB_PATH}`,
    );
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
