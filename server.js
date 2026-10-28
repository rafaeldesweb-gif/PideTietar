import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { DatabaseSync } from "node:sqlite";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import {
  getSupabaseMediaBucket,
  getSupabaseMediaClient,
  parseDataUrl,
  replaceMediaAsset,
} from "./server/supabaseMedia.js";

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
// Vigencia del enlace de recuperación de contraseña desde el superadmin.
const passwordResetTtlMs =
  Number(process.env.PASSWORD_RESET_TTL_MINUTES || 60) * 60 * 1000;
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
    phone TEXT,
    address TEXT,
    dni TEXT,
    avatar_url MEDIUMTEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CLIENT',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    business_id TEXT,
    account_number TEXT,
    email_verified INTEGER DEFAULT 0,
    email_verified_at TEXT,
    password_change_required INTEGER DEFAULT 0,
    password_changed_at TEXT,
    email_verification_code TEXT,
    email_verification_expires_at TEXT,
    password_reset_hash TEXT,
    password_reset_expires_at TEXT,
    courier_confirmation TEXT DEFAULT 'PENDING',
    courier_business_ids TEXT DEFAULT '[]',
    is_online INTEGER NOT NULL DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon_name TEXT,
    image_url MEDIUMTEXT,
    show_ingredients INTEGER NOT NULL DEFAULT 1,
    show_removable_ingredients INTEGER NOT NULL DEFAULT 1,
    show_additional_ingredients INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS platform_meta (
    meta_key TEXT PRIMARY KEY,
    meta_value TEXT,
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
    banner_url MEDIUMTEXT,
    logo_url MEDIUMTEXT,
    is_shift_open INTEGER DEFAULT 0,
    delivery_modes TEXT DEFAULT '[]',
    delivery_radius_km REAL DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    category TEXT,
    manager_name TEXT,
    manager_dni TEXT,
    owner_user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS business_hours (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TEXT NOT NULL,
    close_time TEXT NOT NULL,
    is_open INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    UNIQUE (business_id, day_of_week)
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
    image_url MEDIUMTEXT,
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
    business_name TEXT,
    order_number TEXT,
    customer_id TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    delivery_type TEXT DEFAULT 'DELIVERY',
    delivery_address TEXT,
    scheduled_time TEXT,
    subtotal_cents INTEGER DEFAULT 0,
    delivery_fee_cents INTEGER DEFAULT 0,
    platform_fee_cents INTEGER DEFAULT 0,
    business_payout_cents INTEGER DEFAULT 0,
    courier_payout_cents INTEGER DEFAULT 0,
    tip_cents INTEGER DEFAULT 0,
    total_cents INTEGER DEFAULT 0,
    status TEXT DEFAULT 'NEW',
    status_history TEXT DEFAULT '[]',
    payment_method TEXT DEFAULT 'CASH_ON_DELIVERY',
    payment_status TEXT DEFAULT 'PAID',
    payment_transaction_id TEXT,
    courier_id TEXT,
    courier_name TEXT,
    courier_phone TEXT,
    delivery_pin TEXT,
    calendar_event_id TEXT,
    gmail_notified_at TEXT,
    review_requested INTEGER DEFAULT 0,
    review_score INTEGER,
    reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price_cents INTEGER DEFAULT 0,
    tax_percentage REAL DEFAULT 0,
    removed_ingredients TEXT DEFAULT '[]',
    selected_options TEXT DEFAULT '[]',
    customer_note TEXT,
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
    phone VARCHAR(30) NULL,
    address TEXT NULL,
    dni VARCHAR(20) NULL,
    avatar_url MEDIUMTEXT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(40) NOT NULL DEFAULT 'CLIENT',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    business_id CHAR(36) NULL,
    account_number VARCHAR(255) NULL,
    email_verified TINYINT(1) NOT NULL DEFAULT 0,
    email_verified_at DATETIME(3) NULL,
    password_change_required TINYINT(1) NOT NULL DEFAULT 0,
    password_changed_at DATETIME(3) NULL,
    email_verification_code VARCHAR(12) NULL,
    email_verification_expires_at DATETIME(3) NULL,
    password_reset_hash VARCHAR(64) NULL,
    password_reset_expires_at DATETIME(3) NULL,
    courier_confirmation VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    courier_business_ids JSON NULL,
    is_online TINYINT(1) NOT NULL DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS categories (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    icon_name VARCHAR(80) NULL,
    image_url MEDIUMTEXT NULL,
    show_ingredients TINYINT(1) NOT NULL DEFAULT 1,
    show_removable_ingredients TINYINT(1) NOT NULL DEFAULT 1,
    show_additional_ingredients TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_slug (slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS platform_meta (
    meta_key VARCHAR(80) NOT NULL,
    meta_value TEXT NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (meta_key)
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
    banner_url MEDIUMTEXT NULL,
    logo_url MEDIUMTEXT NULL,
    is_shift_open TINYINT(1) NOT NULL DEFAULT 0,
    delivery_modes JSON NOT NULL,
    delivery_radius_km DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    category VARCHAR(120) NULL,
    manager_name VARCHAR(180) NULL,
    manager_dni VARCHAR(40) NULL,
    owner_user_id CHAR(36) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_businesses_owner (owner_user_id),
    CONSTRAINT fk_businesses_owner
      FOREIGN KEY (owner_user_id) REFERENCES app_users (id)
      ON DELETE SET NULL
      ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS business_hours (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    business_id CHAR(36) NOT NULL,
    day_of_week TINYINT UNSIGNED NOT NULL,
    open_time VARCHAR(8) NOT NULL,
    close_time VARCHAR(8) NOT NULL,
    is_open TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_business_hours_day (business_id, day_of_week),
    CONSTRAINT chk_business_hours_day CHECK (day_of_week BETWEEN 0 AND 6),
    CONSTRAINT fk_business_hours_business
      FOREIGN KEY (business_id) REFERENCES businesses (id)
      ON DELETE CASCADE
      ON UPDATE CASCADE
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
    image_url MEDIUMTEXT NULL,
    is_available TINYINT(1) NOT NULL DEFAULT 1,
    is_sold_out TINYINT(1) NOT NULL DEFAULT 0,
    removable_ingredients JSON NULL,
    additional_ingredients JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_products_business_id (business_id),
    CONSTRAINT fk_products_businesses
      FOREIGN KEY (business_id) REFERENCES businesses (id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS orders (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    business_id CHAR(36) NULL,
    business_name VARCHAR(180) NULL,
    order_number VARCHAR(64) NULL,
    customer_id VARCHAR(64) NULL,
    customer_name VARCHAR(180) NULL,
    customer_email VARCHAR(255) NULL,
    customer_phone VARCHAR(30) NULL,
    delivery_type VARCHAR(20) NULL,
    delivery_address JSON NULL,
    scheduled_time VARCHAR(120) NULL,
    subtotal_cents INT NOT NULL DEFAULT 0,
    delivery_fee_cents INT NOT NULL DEFAULT 0,
    platform_fee_cents INT NOT NULL DEFAULT 0,
    business_payout_cents INT NOT NULL DEFAULT 0,
    courier_payout_cents INT NOT NULL DEFAULT 0,
    tip_cents INT NOT NULL DEFAULT 0,
    total_cents INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'NEW',
    status_history JSON NULL,
    payment_method VARCHAR(30) NULL,
    payment_status VARCHAR(30) NULL,
    payment_transaction_id VARCHAR(120) NULL,
    courier_id VARCHAR(64) NULL,
    courier_name VARCHAR(180) NULL,
    courier_phone VARCHAR(30) NULL,
    delivery_pin VARCHAR(12) NULL,
    calendar_event_id TEXT NULL,
    gmail_notified_at DATETIME(3) NULL,
    review_requested TINYINT(1) NOT NULL DEFAULT 0,
    review_score INT NULL,
    reviewed_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_orders_business_id (business_id),
    CONSTRAINT fk_orders_businesses
      FOREIGN KEY (business_id) REFERENCES businesses (id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS order_items (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    order_id CHAR(36) NOT NULL,
    product_id VARCHAR(64) NULL,
    product_name VARCHAR(180) NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price_cents INT NOT NULL DEFAULT 0,
    tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    removed_ingredients JSON NULL,
    selected_options JSON NULL,
    customer_note TEXT NULL,
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

async function ensureMysqlColumns(pool, tableName, definitions) {
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?`,
    [tableName],
  );

  const existingColumns = new Set(
    columns.map((column) => String(column.COLUMN_NAME)),
  );
  const pendingClauses = definitions
    .filter(([columnName]) => !existingColumns.has(columnName))
    .map(
      ([columnName, definition]) =>
        `ADD COLUMN ${columnName} ${definition}`,
    );

  if (!pendingClauses.length) return;

  await pool.query(`ALTER TABLE ${tableName} ${pendingClauses.join(", ")}`);
}

// Migra columnas existentes de TEXT a MEDIUMTEXT (necesario para albergar
// data URLs largas de fotos y vídeos sin truncarlas).
async function ensureMysqlColumnTypes(pool, definitions) {
  for (const [tableName, columnName, newDefinition] of definitions) {
    const [rows] = await pool.query(
      `SELECT DATA_TYPE
         FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?`,
      [tableName, columnName],
    );

    if (!rows.length) continue;

    const currentType = String(rows[0].DATA_TYPE || "").toLowerCase();
    if (currentType === "mediumtext" || currentType === "longtext") continue;

    await pool.query(
      `ALTER TABLE ${tableName} MODIFY COLUMN ${columnName} ${newDefinition}`,
    );
  }
}

async function ensureMysqlForeignKey(
  pool,
  { constraintName, tableName, columnNames, refTable, refColumns, onDelete },
) {
  if (!columnNames.length || !refColumns.length) return;

  const [constraints] = await pool.query(
    `SELECT CONSTRAINT_NAME
       FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    [tableName],
  );
  const alreadyExists = constraints.some(
    (row) => String(row.CONSTRAINT_NAME) === constraintName,
  );
  if (alreadyExists) return;

  try {
    await pool.query(
      `ALTER TABLE ${tableName}
        ADD CONSTRAINT ${constraintName}
        FOREIGN KEY (${columnNames.join(", ")})
        REFERENCES ${refTable} (${refColumns.join(", ")})
        ON DELETE ${onDelete}
        ON UPDATE CASCADE`,
    );
  } catch (error) {
    // Si hay datos huérfanos la restricción no puede aplicarse; se avisa en
    // lugar de tumbar el arranque para que el superadmin pueda corregirlos.
    console.warn(
      `No se pudo crear la foreign key ${constraintName} en ${tableName}: ${error.message}`,
    );
  }
}

async function ensureMySqlSchemaShape(pool) {
  await ensureMysqlColumns(pool, "categories", [
    ["show_ingredients", "TINYINT(1) NOT NULL DEFAULT 1"],
    ["show_removable_ingredients", "TINYINT(1) NOT NULL DEFAULT 1"],
    ["show_additional_ingredients", "TINYINT(1) NOT NULL DEFAULT 1"],
  ]);

  await ensureMysqlColumns(pool, "app_users", [
    ["business_id", "CHAR(36) NULL"],
    ["account_number", "VARCHAR(255) NULL"],
    ["phone", "VARCHAR(30) NULL"],
    ["address", "TEXT NULL"],
    ["dni", "VARCHAR(20) NULL"],
    ["avatar_url", "TEXT NULL"],
    ["email_verified", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["email_verified_at", "DATETIME(3) NULL"],
    ["password_change_required", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["password_changed_at", "DATETIME(3) NULL"],
    ["email_verification_code", "VARCHAR(12) NULL"],
    ["email_verification_expires_at", "DATETIME(3) NULL"],
    ["password_reset_hash", "VARCHAR(64) NULL"],
    ["password_reset_expires_at", "DATETIME(3) NULL"],
    ["courier_confirmation", "VARCHAR(20) NOT NULL DEFAULT 'PENDING'"],
    ["courier_business_ids", "JSON NULL"],
    ["is_online", "TINYINT(1) NOT NULL DEFAULT 0"],
  ]);

  await ensureMysqlColumns(pool, "businesses", [
    ["category", "VARCHAR(120) NULL"],
    ["manager_name", "VARCHAR(180) NULL"],
    ["manager_dni", "VARCHAR(40) NULL"],
    ["owner_user_id", "CHAR(36) NULL"],
    ["account_number", "VARCHAR(255) NULL"],
    ["rating", "DECIMAL(3,2) NOT NULL DEFAULT 0.00"],
    ["review_count", "INT NOT NULL DEFAULT 0"],
    ["latitude", "DECIMAL(9,6) NULL"],
    ["longitude", "DECIMAL(9,6) NULL"],
    ["delivery_modes", "JSON NULL"],
    ["delivery_radius_km", "DECIMAL(5,2) NOT NULL DEFAULT 0.00"],
    ["status", "VARCHAR(30) NOT NULL DEFAULT 'PENDING'"],
  ]);

  await ensureMysqlColumns(pool, "orders", [
    ["business_name", "VARCHAR(180) NULL"],
    ["customer_id", "VARCHAR(64) NULL"],
    ["customer_phone", "VARCHAR(30) NULL"],
    ["delivery_address", "JSON NULL"],
    ["scheduled_time", "VARCHAR(120) NULL"],
    ["subtotal_cents", "INT NOT NULL DEFAULT 0"],
    ["delivery_fee_cents", "INT NOT NULL DEFAULT 0"],
    ["platform_fee_cents", "INT NOT NULL DEFAULT 0"],
    ["business_payout_cents", "INT NOT NULL DEFAULT 0"],
    ["courier_payout_cents", "INT NOT NULL DEFAULT 0"],
    ["tip_cents", "INT NOT NULL DEFAULT 0"],
    ["status_history", "JSON NULL"],
    ["payment_method", "VARCHAR(30) NULL"],
    ["payment_status", "VARCHAR(30) NULL"],
    ["payment_transaction_id", "VARCHAR(120) NULL"],
    ["courier_id", "VARCHAR(64) NULL"],
    ["courier_name", "VARCHAR(180) NULL"],
    ["courier_phone", "VARCHAR(30) NULL"],
    ["delivery_pin", "VARCHAR(12) NULL"],
    ["calendar_event_id", "TEXT NULL"],
    ["gmail_notified_at", "DATETIME(3) NULL"],
    ["review_requested", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["review_score", "INT NULL"],
    ["reviewed_at", "DATETIME(3) NULL"],
  ]);

  await ensureMysqlColumns(pool, "order_items", [
    ["tax_percentage", "DECIMAL(5,2) NOT NULL DEFAULT 0.00"],
    ["removed_ingredients", "JSON NULL"],
    ["selected_options", "JSON NULL"],
    ["customer_note", "TEXT NULL"],
  ]);

  await ensureMysqlForeignKey(pool, {
    constraintName: "fk_businesses_owner",
    tableName: "businesses",
    columnNames: ["owner_user_id"],
    refTable: "app_users",
    refColumns: ["id"],
    onDelete: "SET NULL",
  });

  await ensureMysqlForeignKey(pool, {
    constraintName: "fk_orders_businesses",
    tableName: "orders",
    columnNames: ["business_id"],
    refTable: "businesses",
    refColumns: ["id"],
    onDelete: "RESTRICT",
  });

  await ensureMysqlForeignKey(pool, {
    constraintName: "fk_products_businesses",
    tableName: "products",
    columnNames: ["business_id"],
    refTable: "businesses",
    refColumns: ["id"],
    onDelete: "RESTRICT",
  });

  await ensureMysqlColumnTypes(pool, [
    ["app_users", "avatar_url", "MEDIUMTEXT NULL"],
    ["businesses", "banner_url", "MEDIUMTEXT NULL"],
    ["businesses", "logo_url", "MEDIUMTEXT NULL"],
    ["products", "image_url", "MEDIUMTEXT NULL"],
  ]);
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
  ensureColumn("businesses", "category", "TEXT");
  ensureColumn("businesses", "manager_name", "TEXT");
  ensureColumn("businesses", "manager_dni", "TEXT");
  ensureColumn(
    "businesses",
    "owner_user_id",
    "TEXT REFERENCES app_users(id) ON DELETE SET NULL",
  );
  ensureColumn("businesses", "updated_at", "TEXT");
  ensureColumn("categories", "show_ingredients", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("categories", "show_removable_ingredients", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("categories", "show_additional_ingredients", "INTEGER NOT NULL DEFAULT 1");

  ensureColumn("app_users", "business_id", "TEXT");
  ensureColumn("app_users", "is_online", "INTEGER NOT NULL DEFAULT 0");
  // Confirmación del alta de repartidores: PENDING (sin aprobar),
  // BUSINESS_EMAIL (aprobado por el negocio) o SUPERADMIN (aprobado por la
  // plataforma). Es lo que desbloquea el panel del repartidor.
  ensureColumn(
    "app_users",
    "courier_confirmation",
    "TEXT DEFAULT 'PENDING'",
  );
  // Negocios que cubre un repartidor. Se guarda como lista JSON para seguir el
  // mismo patrón que businesses.delivery_modes. `business_id` se mantiene como
  // negocio de referencia para los repartidores de un único negocio.
  ensureColumn(
    "app_users",
    "courier_business_ids",
    "TEXT DEFAULT '[]'",
  );

  ensureColumn("products", "tax_percentage", "REAL DEFAULT 0");
  ensureColumn("products", "is_sold_out", "INTEGER DEFAULT 0");
  ensureColumn("products", "allergens", "TEXT");
  ensureColumn("products", "updated_at", "TEXT");

  ensureColumn("orders", "updated_at", "TEXT");
  ensureColumn("orders", "business_name", "TEXT");
  ensureColumn("orders", "customer_id", "TEXT");
  ensureColumn("orders", "customer_phone", "TEXT");
  ensureColumn("orders", "delivery_address", "TEXT");
  ensureColumn("orders", "scheduled_time", "TEXT");
  ensureColumn("orders", "subtotal_cents", "INTEGER DEFAULT 0");
  ensureColumn("orders", "delivery_fee_cents", "INTEGER DEFAULT 0");
  ensureColumn("orders", "platform_fee_cents", "INTEGER DEFAULT 0");
  ensureColumn("orders", "business_payout_cents", "INTEGER DEFAULT 0");
  ensureColumn("orders", "courier_payout_cents", "INTEGER DEFAULT 0");
  ensureColumn("orders", "tip_cents", "INTEGER DEFAULT 0");
  ensureColumn("orders", "status_history", "TEXT DEFAULT '[]'");
  ensureColumn("orders", "payment_method", "TEXT DEFAULT 'CASH_ON_DELIVERY'");
  ensureColumn("orders", "payment_status", "TEXT DEFAULT 'PAID'");
  ensureColumn("orders", "payment_transaction_id", "TEXT");
  ensureColumn("orders", "courier_id", "TEXT");
  ensureColumn("orders", "courier_name", "TEXT");
  ensureColumn("orders", "courier_phone", "TEXT");
  ensureColumn("orders", "delivery_pin", "TEXT");
  ensureColumn("orders", "calendar_event_id", "TEXT");
  ensureColumn("orders", "gmail_notified_at", "TEXT");
  ensureColumn("orders", "review_requested", "INTEGER DEFAULT 0");
  ensureColumn("orders", "review_score", "INTEGER");
  ensureColumn("orders", "reviewed_at", "TEXT");

  const userColumns = getColumnNames("app_users");
  if (!userColumns.has("account_number")) {
    db.exec("ALTER TABLE app_users ADD COLUMN account_number TEXT");
  }
  if (!userColumns.has("phone")) {
    db.exec("ALTER TABLE app_users ADD COLUMN phone TEXT");
  }
  if (!userColumns.has("address")) {
    db.exec("ALTER TABLE app_users ADD COLUMN address TEXT");
  }
  if (!userColumns.has("dni")) {
    db.exec("ALTER TABLE app_users ADD COLUMN dni TEXT");
  }
  if (!userColumns.has("avatar_url")) {
    db.exec("ALTER TABLE app_users ADD COLUMN avatar_url TEXT");
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
  if (!userColumns.has("password_reset_hash")) {
    db.exec("ALTER TABLE app_users ADD COLUMN password_reset_hash TEXT");
  }
  if (!userColumns.has("password_reset_expires_at")) {
    db.exec("ALTER TABLE app_users ADD COLUMN password_reset_expires_at TEXT");
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
      tax_percentage REAL DEFAULT 0,
      removed_ingredients TEXT DEFAULT '[]',
      selected_options TEXT DEFAULT '[]',
      customer_note TEXT,
      total_cents INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )`,
  );

  ensureColumn("order_items", "tax_percentage", "REAL DEFAULT 0");
  ensureColumn("order_items", "removed_ingredients", "TEXT DEFAULT '[]'");
  ensureColumn("order_items", "selected_options", "TEXT DEFAULT '[]'");
  ensureColumn("order_items", "customer_note", "TEXT");

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

  ensureOrdersBusinessForeignKey();
}

// SQLite no permite añadir una foreign key a una columna ya existente con
// ALTER TABLE, así que si una base creada antes de esta versión carece de la
// relación orders.business_id -> businesses.id se reconstruye la tabla
// conservando los datos. PRAGMA foreign_keys se desactiva únicamente durante
// la reconstrucción (DROP TABLE ordena a SQLite que no valide referencias).
function ensureOrdersBusinessForeignKey() {
  const db = getSqliteDb();
  const foreignKeys = db.prepare("PRAGMA foreign_key_list(orders)").all();
  const alreadyLinked = foreignKeys.some(
    (fk) => String(fk.table || "").toLowerCase() === "businesses",
  );
  if (alreadyLinked) return;

  const existingColumns = new Set(
    db.prepare("PRAGMA table_info(orders)").all().map((column) => column.name),
  );
  const columnList = [
    "id",
    "business_id",
    "business_name",
    "order_number",
    "customer_id",
    "customer_name",
    "customer_email",
    "customer_phone",
    "delivery_type",
    "delivery_address",
    "scheduled_time",
    "subtotal_cents",
    "delivery_fee_cents",
    "platform_fee_cents",
    "business_payout_cents",
    "courier_payout_cents",
    "tip_cents",
    "total_cents",
    "status",
    "status_history",
    "payment_method",
    "payment_status",
    "payment_transaction_id",
    "courier_id",
    "courier_name",
    "courier_phone",
    "delivery_pin",
    "calendar_event_id",
    "gmail_notified_at",
    "review_requested",
    "review_score",
    "reviewed_at",
    "created_at",
    "updated_at",
  ].filter((name) => existingColumns.has(name));

  if (!columnList.length || !existingColumns.has("id")) {
    console.warn(
      "No se pudo añadir la foreign key a orders.business_id: estructura inesperada.",
    );
    return;
  }

  const selectList = columnList.join(", ");
  db.exec("PRAGMA foreign_keys = OFF");
  try {
    db.exec("DROP TABLE IF EXISTS orders_migrated");
    // La tabla intermedia es deliberadamente más permisiva que la de un
    // instalación nueva: una base antigua puede tener filas con NULL en
    // created_at/updated_at (columnas añadidas por migración sin rellenar las
    // filas existentes) y la reconstrucción debe conservarlas todas.
    db.exec(`CREATE TABLE orders_migrated (
      id TEXT PRIMARY KEY,
      business_id TEXT REFERENCES businesses(id) ON DELETE RESTRICT,
      business_name TEXT,
      order_number TEXT,
      customer_id TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      delivery_type TEXT DEFAULT 'DELIVERY',
      delivery_address TEXT,
      scheduled_time TEXT,
      subtotal_cents INTEGER DEFAULT 0,
      delivery_fee_cents INTEGER DEFAULT 0,
      platform_fee_cents INTEGER DEFAULT 0,
      business_payout_cents INTEGER DEFAULT 0,
      courier_payout_cents INTEGER DEFAULT 0,
      tip_cents INTEGER DEFAULT 0,
      total_cents INTEGER DEFAULT 0,
      status TEXT DEFAULT 'NEW',
      status_history TEXT DEFAULT '[]',
      payment_method TEXT DEFAULT 'CASH_ON_DELIVERY',
      payment_status TEXT DEFAULT 'PAID',
      payment_transaction_id TEXT,
      courier_id TEXT,
      courier_name TEXT,
      courier_phone TEXT,
      delivery_pin TEXT,
      calendar_event_id TEXT,
      gmail_notified_at TEXT,
      review_requested INTEGER DEFAULT 0,
      review_score INTEGER,
      reviewed_at TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);
    db.exec(
      `INSERT INTO orders_migrated (${selectList}) SELECT ${selectList} FROM orders`,
    );
    db.exec("DROP TABLE orders");
    db.exec("ALTER TABLE orders_migrated RENAME TO orders");
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id)",
    );
    console.log("Migración aplicada: orders.business_id ahora tiene foreign key.");
  } catch (error) {
    console.warn("No se pudo migrar orders.business_id:", error.message);
    try {
      db.exec("DROP TABLE IF EXISTS orders_migrated");
    } catch {
      // Nada que limpiar: la tabla original sigue intacta.
    }
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
}

async function ensureMySqlConnection() {
  if (mysqlPool) return mysqlPool;
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
    const failedPool = mysqlPool;
    mysqlPool = null;
    await failedPool?.end().catch(() => {});
    databaseMode = "sqlite";
    return null;
  }
}

// Catálogo inicial de categorías de la plataforma. Se inserta una sola vez,
// cuando la tabla `categories` se crea por primera vez. Si el superadmin borra
// una categoría después, no vuelve a aparecer al reiniciar el servidor.
const DEFAULT_CATEGORIES = [
  ["biriyani", "Arroces & Paellas", "arroces", "Flame", "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=160&auto=format&fit=crop&q=80"],
  ["rolls", "Rolls & Wraps", "rolls", "Utensils", "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=160&auto=format&fit=crop&q=80"],
  ["postres", "Postres & Dulces", "postres", "IceCream", "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=160&auto=format&fit=crop&q=80"],
  ["bocadillos", "Sandwich & Bocatas", "bocadillos", "Sandwich", "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=160&auto=format&fit=crop&q=80"],
  ["tartas", "Tartas & Cakes", "tartas", "Sparkles", "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=160&auto=format&fit=crop&q=80"],
  ["vegano", "Pure Veg / Verde", "vegano", "Soup", "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=160&auto=format&fit=crop&q=80"],
  ["pasta", "Pasta Italiana", "pasta", "Utensils", "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=160&auto=format&fit=crop&q=80"],
  ["noodles", "Fideos & Wok", "noodles", "Soup", "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=160&auto=format&fit=crop&q=80"],
  ["pizzas", "Pizzas", "pizzas", "Pizza", "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=160&auto=format&fit=crop&q=80"],
  ["hamburguesas", "Burgers", "hamburguesas", "Sandwich", "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=160&auto=format&fit=crop&q=80"],
  ["patatas-raciones", "Snacks & Patatas", "patatas-raciones", "Soup", "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=160&auto=format&fit=crop&q=80"],
  ["bebidas", "Bebidas & Zumos", "bebidas", "Wine", "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=160&auto=format&fit=crop&q=80"],
  ["desayunos", "Desayunos & Café", "desayunos", "Coffee", "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=160&auto=format&fit=crop&q=80"],
  ["tapas-carnes", "Carnes & Asados", "carnes-asados", "Flame", "https://images.unsplash.com/photo-1544025162-d76694265947?w=160&auto=format&fit=crop&q=80"],
  ["kioscos", "Golosinas & Kiosco", "kioscos", "Candy", "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=160&auto=format&fit=crop&q=80"],
];

const CATEGORY_SEED_MARKER = "categories_seeded_v1";

// Siembra el catálogo inicial sólo una vez. El marcador evita que las
// categorías borradas por el superadmin reaparezcan al reiniciar, pero también
// permite recuperar una tabla `categories` vacía creada por un esquema manual.
async function seedDefaultCategories() {
  if (mysqlPool) {
    const [markers] = await mysqlPool.execute(
      "SELECT meta_value FROM platform_meta WHERE meta_key = ?",
      [CATEGORY_SEED_MARKER],
    );
    if (markers.length > 0) return;

    const [rows] = await mysqlPool.execute(
      "SELECT COUNT(*) AS c FROM categories",
    );
    if (Number(rows[0]?.c || 0) === 0) {
      for (const [id, name, slug, iconName, imageUrl] of DEFAULT_CATEGORIES) {
        await mysqlPool.execute(
          "INSERT INTO categories (id, name, slug, icon_name, image_url) VALUES (?, ?, ?, ?, ?)",
          [id, name, slug, iconName, imageUrl],
        );
      }
    }

    await mysqlPool.execute(
      `INSERT INTO platform_meta (meta_key, meta_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
      [CATEGORY_SEED_MARKER, "1"],
    );
    return;
  }

  const db = getSqliteDb();
  const marker = db
    .prepare("SELECT meta_value FROM platform_meta WHERE meta_key = ?")
    .get(CATEGORY_SEED_MARKER);
  if (marker) return;

  const existing = db.prepare("SELECT COUNT(*) AS c FROM categories").get();
  if (Number(existing?.c || 0) === 0) {
    const insert = db.prepare(
      "INSERT INTO categories (id, name, slug, icon_name, image_url) VALUES (?, ?, ?, ?, ?)",
    );
    for (const [id, name, slug, iconName, imageUrl] of DEFAULT_CATEGORIES) {
      insert.run(id, name, slug, iconName, imageUrl);
    }
  }

  db.prepare(
    `INSERT INTO platform_meta (meta_key, meta_value) VALUES (?, ?)
     ON CONFLICT(meta_key) DO UPDATE SET meta_value = excluded.meta_value,
       updated_at = CURRENT_TIMESTAMP`,
  ).run(CATEGORY_SEED_MARKER, "1");
}

async function ensureSchema() {
  const pool = await ensureMySqlConnection();

  if (pool) {
    await applyMysqlSchema(pool);
    await ensureMySqlSchemaShape(pool);
    await seedDefaultCategories();
    await seedSuperAdmin();
    await flagUsersWithInsecureDefaultPassword();
    return;
  }

  ensureSqliteSchemaShape();
  await seedDefaultCategories();
  await seedSuperAdmin();
  await flagUsersWithInsecureDefaultPassword();
}

async function seedSuperAdmin() {
  const userName = process.env.SUPERADMIN_USERNAME || "RafaAdmin";
  // Respaldo operativo existente: se conserva para poder entrar aunque no
  // haya configuración de entorno. En producción debe sustituirse mediante
  // SUPERADMIN_PASSWORD y forzarse el cambio posterior.
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

function parseCourierBusinessIds(row) {
  if (!row) return [];
  const raw = row.courier_business_ids ?? row.courierBusinessIds;
  let values = [];

  if (Array.isArray(raw)) {
    values = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      values = Array.isArray(parsed) ? parsed : [];
    } catch {
      values = raw.split(",");
    }
  }

  const cleaned = [
    ...new Set(
      values.map((value) => String(value ?? "").trim()).filter(Boolean),
    ),
  ];

  if (cleaned.length) return cleaned;

  // Compatibilidad con repartidores creados antes de la lista de negocios.
  const legacyBusinessId = row.business_id || row.businessId;
  return legacyBusinessId ? [String(legacyBusinessId)] : [];
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
  const role = row.role || "CLIENT";
  const businessId = row.business_id || row.businessId || null;
  const isCourier =
    role === "PLATFORM_COURIER" || role === "BUSINESS_COURIER";
  const rawConfirmation = String(
    row.courier_confirmation || row.courierConfirmation || "PENDING",
  ).toUpperCase();
  const courierConfirmation = [
    "PENDING",
    "BUSINESS_EMAIL",
    "SUPERADMIN",
  ].includes(rawConfirmation)
    ? rawConfirmation
    : "PENDING";

  return {
    id: row.id,
    username: row.username || row.email?.split("@")[0] || "",
    name: row.full_name || row.name || row.username || "Usuario",
    email: row.email,
    phone: row.phone || "",
    address: row.address || "",
    dni: row.dni || "",
    avatarUrl: row.avatar_url || row.avatarUrl || "",
    role: role,
    status: row.status || "ACTIVE",
    businessId: businessId,
    accountNumber: row.account_number || row.accountNumber || "",
    isEmailVerified: isEmailVerified,
    emailVerified: isEmailVerified,
    createdAt: row.created_at || new Date().toISOString(),
    courierProfile: isCourier
      ? {
          // Un repartidor puede cubrir uno o varios negocios. El de
          // plataforma cubre todo el valle y el panel no filtra por esta lista.
          businessIds: parseCourierBusinessIds(row),
          localityIds: [],
          isOnline: Boolean(row.is_online),
          confirmation: courierConfirmation,
        }
      : undefined,
  };
}

function buildVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function smtpFromAddress() {
  return (
    process.env.EMAIL_FROM || process.env.SMTP_FROM || "noreply@pidetietar.es"
  );
}

// Plantilla de marca para los correos de la plataforma (verificación y
// recuperación). Todo el estilo va en línea: Gmail y Outlook eliminan las
// etiquetas <style>. El logo se embebe con cid:pidetietar-logo (adjunto en
// cada sendMail) para que se vea aunque el cliente bloquee imágenes remotas.
const BRAND_EMAIL_LOGO_PATH = path.join(__dirname, "public", "Logo.png");
const BRAND_EMAIL_LOGO_CID = "pidetietar-logo";

function renderBrandEmail({ heading, bodyHtml, preheader = "" }) {
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0; padding:0; background:#f5f3f0;">
    <span style="display:none; max-height:0; overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background:#f5f3f0; padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:100%; border-collapse:collapse;">
            <tr>
              <td align="center" style="background:#1a0903; background-image:linear-gradient(135deg, #1a0903 0%, #3a1503 60%, #6b2400 100%); border-radius:20px 20px 0 0; padding:28px 24px;">
                <img src="cid:${BRAND_EMAIL_LOGO_CID}" alt="PideTiétar" width="180" style="display:block; width:180px; max-width:100%; height:auto; border:0;" />
                <div style="color:#f6c594; font-family:Arial, sans-serif; font-size:11px; letter-spacing:3px; text-transform:uppercase; margin-top:6px;">Valle del Tiétar · Ávila</div>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff; border-left:1px solid #efe6df; border-right:1px solid #efe6df; padding:32px 36px 28px; font-family:Georgia, 'Times New Roman', serif;">
                <h2 style="margin:0 0 16px; font-size:26px; line-height:1.2; color:#1a0903;">${heading}</h2>
                <div style="margin:0; font-family:Arial, sans-serif; font-size:14px; line-height:22px; color:#3f342e;">
                  ${bodyHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#fffaf4; border:1px solid #efe6df; border-top:0; border-radius:0 0 20px 20px; padding:18px 36px; font-family:Arial, sans-serif; font-size:11px; line-height:18px; color:#8d7f73;">
                PideTiétar · Pedidos entre vecinos y comercios del Valle del Tiétar.<br />
                Si no esperabas este mensaje, puedes ignorarlo: tu cuenta y tu contraseña siguen igual.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Envío común de los correos de marca: prueba la configuración SMTP
// preferente y, si falla, los puertos alternativos (587/465).
async function sendBrandEmail({ to, subject, text, heading, bodyHtml, preheader }) {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || "";
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || "";
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";

  if (!host || !user || !pass) {
    return {
      sent: false,
      message: "SMTP no configurado; se devuelve el contenido para pruebas locales.",
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
        from: smtpFromAddress(),
        to,
        subject,
        text,
        html: renderBrandEmail({ heading, bodyHtml, preheader }),
        attachments: fs.existsSync(BRAND_EMAIL_LOGO_PATH)
          ? [
              {
                filename: "logo.png",
                path: BRAND_EMAIL_LOGO_PATH,
                cid: BRAND_EMAIL_LOGO_CID,
              },
            ]
          : [],
      });

      return { sent: true };
    } catch (error) {
      // Se sigue con el siguiente candidato de puerto/seguridad.
    }
  }

  return {
    sent: false,
    message:
      "No fue posible enviar el correo con el SMTP configurado; se devuelve el contenido para pruebas locales.",
  };
}

async function sendVerificationEmail({ email, fullName, code }) {
  const name = fullName || "usuario";
  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola <strong>${name}</strong>,</p>
    <p style="margin:0 0 18px;">Para verificar tu cuenta de PideTiétar, introduce este código:</p>
    <div style="margin:0 0 18px; background:#fff5f0; border:2px dashed #ff4e00; border-radius:12px; padding:20px 12px; text-align:center; font-size:34px; font-weight:700; letter-spacing:8px; color:#a93200; font-family:'Courier New', monospace;">${code}</div>
    <p style="margin:0; color:#8d7f73; font-size:12px;">Este código expira en 15 minutos y sólo puede usarse una vez.</p>
  `;

  const delivery = await sendBrandEmail({
    to: email,
    subject: `Tu código de verificación en PideTiétar: ${code}`,
    text: `Hola ${name},\n\nTu código de verificación es: ${code}\n\nEste código expira en 15 minutos.\n`,
    heading: "Verifica tu cuenta",
    bodyHtml,
    preheader: `Tu código de verificación: ${code} (expira en 15 minutos)`,
  });

  return { ...delivery, code };
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

// Recuperación de contraseña: el token nunca se guarda en claro (sólo su
// SHA-256) y el enlace llega por correo al usuario elegido por el superadmin.
function sha256Hex(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

async function setPasswordResetToken(userId, tokenHash, expiresAt) {
  if (mysqlPool) {
    await mysqlPool.execute(
      "UPDATE app_users SET password_reset_hash = ?, password_reset_expires_at = ? WHERE id = ?",
      [tokenHash, expiresAt, userId],
    );
    return;
  }

  const db = getSqliteDb();
  db.prepare(
    "UPDATE app_users SET password_reset_hash = ?, password_reset_expires_at = ? WHERE id = ?",
  ).run(tokenHash, expiresAt, userId);
}

async function clearPasswordResetToken(userId) {
  if (mysqlPool) {
    await mysqlPool.execute(
      "UPDATE app_users SET password_reset_hash = NULL, password_reset_expires_at = NULL WHERE id = ?",
      [userId],
    );
    return;
  }

  const db = getSqliteDb();
  db.prepare(
    "UPDATE app_users SET password_reset_hash = NULL, password_reset_expires_at = NULL WHERE id = ?",
  ).run(userId);
}

async function getUserByPasswordResetToken(tokenHash) {
  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM app_users WHERE password_reset_hash = ? LIMIT 1",
      [tokenHash],
    );
    return rows[0] || null;
  }

  const db = getSqliteDb();
  return (
    db
      .prepare(
        "SELECT * FROM app_users WHERE password_reset_hash = ? LIMIT 1",
      )
      .get(tokenHash) || null
  );
}

async function sendPasswordResetEmail({ email, fullName, resetUrl, minutes }) {
  const name = fullName || "usuario";
  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola <strong>${name}</strong>,</p>
    <p style="margin:0 0 18px;">El superadministrador ha iniciado la recuperación de tu contraseña. Abre el siguiente botón para fijar una clave nueva:</p>
    <p style="margin:0 0 18px; text-align:center;">
      <a href="${resetUrl}" style="display:inline-block; background:#1a0903; color:#8bca60; font-family:Arial, sans-serif; font-size:15px; font-weight:700; letter-spacing:1px; padding:14px 32px; border-radius:12px; text-decoration:none; background-image:linear-gradient(135deg, #1a0903 0%, #3a1503 70%, #6b2400 100%);">Restablecer contraseña</a>
    </p>
    <p style="margin:0 0 18px; font-size:12px; color:#8d7f73;">O copia este enlace en tu navegador:<br />
      <a href="${resetUrl}" style="color:#ff4e00; word-break:break-all;">${resetUrl}</a>
    </p>
    <p style="margin:0; color:#8d7f73; font-size:12px;">Este enlace expira en ${minutes} minutos y sólo puede usarse una vez. Si no has solicitado nada, ignora el mensaje: tu contraseña sigue siendo la misma.</p>
  `;

  const delivery = await sendBrandEmail({
    to: email,
    subject: "Recupera tu contraseña en PideTiétar",
    text: `Hola ${name},\n\nEl superadministrador ha iniciado la recuperación de tu contraseña.\nAbre este enlace para fijar una nueva clave (válido durante ${minutes} minutos):\n\n${resetUrl}\n\nSi no has solicitado esto, ignora el mensaje y tu contraseña sigue siendo la misma.\n`,
    heading: "Recupera tu contraseña",
    bodyHtml,
    preheader: "Enlace de un solo uso para fijar una contraseña nueva",
  });

  return delivery;
}

// Correo de bienvenida: se envía al crear cualquier cuenta (registro libre o
// alta desde el panel). Va sin bloquear la respuesta del endpoint (void).
function appHomeUrl() {
  return String(process.env.APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

const WELCOME_ROLE_LINES = {
  CLIENT: "Ya puedes explorar los comercios del valle, armar tu carrito y seguir tus pedidos en tiempo real.",
  BUSINESS_ADMIN: "Ya puedes abrir tu panel, publicar tu carta y recibir pedidos de los vecinos del valle.",
  PLATFORM_COURIER: "Ya puedes entrar a tu panel de repartidor y gestionar las entregas de la plataforma.",
  BUSINESS_COURIER: "Ya puedes entrar a tu panel de repartidor para gestionar las entregas de tu negocio.",
  SUPERADMIN: "Ya puedes gestionar la plataforma desde el panel de superadministración.",
};

function sendWelcomeEmail({ email, fullName, role }) {
  const name = fullName || "usuario";
  const roleLine = WELCOME_ROLE_LINES[String(role || "CLIENT").toUpperCase()] || WELCOME_ROLE_LINES.CLIENT;
  const homeUrl = appHomeUrl();
  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola <strong>${name}</strong>,</p>
    <p style="margin:0 0 12px;">Te damos la bienvenida a <strong>PideTiétar</strong>, la app de pedidos entre vecinos y comercios del Valle del Tiétar.</p>
    <p style="margin:0 0 20px;">${roleLine}</p>
    <p style="margin:0 0 18px; text-align:center;">
      <a href="${homeUrl}" style="display:inline-block; background:#1a0903; color:#8bca60; font-family:Arial, sans-serif; font-size:15px; font-weight:700; letter-spacing:1px; padding:14px 32px; border-radius:12px; text-decoration:none; background-image:linear-gradient(135deg, #1a0903 0%, #3a1503 70%, #6b2400 100%);">Entrar y explorar</a>
    </p>
    <p style="margin:0; color:#8d7f73; font-size:12px;">Si el botón no funciona, abre ${homeUrl} en tu navegador.</p>
  `;

  return sendBrandEmail({
    to: email,
    subject: "¡Bienvenido a PideTiétar!",
    text: `Hola ${name},\n\nTe damos la bienvenida a PideTiétar, la app de pedidos entre vecinos y comercios del Valle del Tiétar.\n${roleLine}\n\nEntra aquí: ${homeUrl}\n`,
    heading: "Bienvenido a PideTiétar",
    bodyHtml,
    preheader: "Ya puedes pedir en los comercios del Valle del Tiétar",
  });
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
  let rows = [];
  let hours = [];

  if (mysqlPool) {
    const [result] = await mysqlPool.execute(
      "SELECT * FROM businesses ORDER BY created_at DESC",
    );
    rows = result;
  } else {
    rows = getSqliteDb()
      .prepare("SELECT * FROM businesses ORDER BY created_at DESC")
      .all();
  }

  let couriers = [];
  if (mysqlPool) {
    const [result] = await mysqlPool.execute(
      "SELECT * FROM app_users WHERE role IN ('BUSINESS_COURIER', 'PLATFORM_COURIER') AND status = 'ACTIVE' AND is_online = 1 AND courier_confirmation IN ('BUSINESS_EMAIL', 'SUPERADMIN') AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.courier_id = app_users.id AND o.status NOT IN ('DELIVERED', 'CANCELLED', 'REJECTED', 'REFUNDED'))",
    );
    couriers = result;
  } else {
    couriers = getSqliteDb().prepare(
      "SELECT * FROM app_users WHERE role IN ('BUSINESS_COURIER', 'PLATFORM_COURIER') AND status = 'ACTIVE' AND is_online = 1 AND courier_confirmation IN ('BUSINESS_EMAIL', 'SUPERADMIN') AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.courier_id = app_users.id AND o.status NOT IN ('DELIVERED', 'CANCELLED', 'REJECTED', 'REFUNDED'))",
    ).all();
  }
  const onlineBusinessIds = new Set();
  let platformCourierOnline = false;
  for (const courier of couriers) {
    if (courier.role === "PLATFORM_COURIER") platformCourierOnline = true;
    else for (const businessId of parseCourierBusinessIds(courier)) onlineBusinessIds.add(businessId);
  }
  const scheduled = attachBusinessSchedules(rows, await readBusinessHours());
  return scheduled.map((business) => ({
    ...business,
    has_online_courier:
      parseStoredList(business.delivery_modes ?? business.deliveryModes).some((mode) => ["OWN_COURIER", "PLATFORM_COURIER"].includes(mode)) &&
      (platformCourierOnline || onlineBusinessIds.has(String(business.id))),
  }));
}

async function listProducts() {
  // Cada pedido entregado aporta una valoración a cada producto que contiene,
  // sin duplicarla por unidades ni por líneas con opciones distintas.
  const sql = `SELECT p.*, COALESCE(stats.rating, 0) AS rating,
      COALESCE(stats.rating_count, 0) AS ratingCount
    FROM products p
    LEFT JOIN (
      SELECT purchased.product_id, AVG(o.review_score) AS rating,
        COUNT(*) AS rating_count
      FROM (SELECT DISTINCT order_id, product_id FROM order_items) purchased
      JOIN orders o ON o.id = purchased.order_id
      WHERE o.status = 'DELIVERED' AND o.review_score BETWEEN 1 AND 5
      GROUP BY purchased.product_id
    ) stats ON stats.product_id = p.id
    ORDER BY p.created_at DESC`;
  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(sql);
    return rows;
  }

  const db = getSqliteDb();
  return db.prepare(sql).all();
}

async function getProductById(id) {
  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM products WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] || null;
  }

  return getSqliteDb()
    .prepare("SELECT * FROM products WHERE id = ? LIMIT 1")
    .get(id) || null;
}

function getSessionBusinessId(user) {
  return String(user?.business_id || user?.businessId || "").trim();
}

function assertBusinessResourceAccess(user, businessId, message) {
  const role = String(user?.role || "").toUpperCase();
  if (role === "SUPERADMIN") return;
  if (role === "BUSINESS_ADMIN" && getSessionBusinessId(user) === String(businessId || "")) {
    return;
  }
  throw httpError(403, "FORBIDDEN", message);
}

async function listCategories() {
  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM categories ORDER BY name ASC",
    );
    return rows;
  }

  const db = getSqliteDb();
  return db.prepare("SELECT * FROM categories ORDER BY name ASC").all();
}

async function getCategoryById(id) {
  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM categories WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] || null;
  }

  const db = getSqliteDb();
  return db.prepare("SELECT * FROM categories WHERE id = ? LIMIT 1").get(id) || null;
}

// Los productos tienen una FK real a categories en MySQL. Validar antes de
// insertar evita que el cliente reciba un error de clave ajena indescifrable.
function validateProductInput(body) {
  const errors = {};
  if (body.name !== undefined && (!cleanString(body.name) || cleanString(body.name).length > 180)) errors.name = "El nombre del producto debe tener entre 1 y 180 caracteres.";
  const price = body.priceCents ?? body.price_cents;
  if (price !== undefined && (!Number.isSafeInteger(Number(price)) || Number(price) < 0)) errors.price_cents = "El precio debe ser un número entero de céntimos mayor o igual que cero.";
  const tax = body.taxPercentage ?? body.tax_percentage;
  if (tax !== undefined && (!Number.isFinite(Number(tax)) || Number(tax) < 0 || Number(tax) > 100)) errors.tax_percentage = "El impuesto debe estar entre 0 y 100.";
  assertValid(errors);
}

async function resolveProductCategoryId(categoryIdRaw) {
  const categoryId = String(categoryIdRaw ?? "").trim();
  if (!categoryId) {
    throw validationError("Selecciona una categoría para el producto.", {
      category_id: "La categoría es obligatoria.",
    });
  }

  const category = await getCategoryById(categoryId);
  if (!category) {
    throw validationError(
      "La categoría seleccionada no existe. Actualiza la lista y vuelve a intentarlo.",
      { category_id: "La categoría seleccionada no existe." },
    );
  }

  return categoryId;
}

// SQLite guarda los JSON como TEXT; MySQL puede devolverlos ya parseados.
function parseStoredJson(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function parseStoredList(value) {
  const parsed = parseStoredJson(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function toIsoTimestamp(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const text = String(value).trim();
  if (!text) return null;

  // SQLite CURRENT_TIMESTAMP devuelve "YYYY-MM-DD HH:MM:SS" en UTC, sin zona.
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const normalized = text.replace(" ", "T") + (hasZone ? "" : "Z");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? text : date.toISOString();
}

function toSqlTimestamp(value) {
  const iso = toIsoTimestamp(value) || new Date().toISOString();
  return iso.replace("T", " ").replace("Z", "");
}

function toSqlTimestampOrNull(value) {
  const iso = toIsoTimestamp(value);
  return iso ? iso.replace("T", " ").replace("Z", "") : null;
}

function serializeJsonField(value, fallback = null) {
  if (value === null || value === undefined || value === "") {
    return fallback === null ? null : JSON.stringify(fallback);
  }
  if (typeof value === "string") {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return JSON.stringify(value);
    }
  }
  return JSON.stringify(value);
}

function serializeStringList(value) {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((entry) => String(entry)));
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(
        Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [value],
      );
    } catch {
      return JSON.stringify(
        value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
      );
    }
  }
  return "[]";
}

function serializeObjectList(value) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(Array.isArray(parsed) ? parsed : []);
    } catch {
      return "[]";
    }
  }
  return "[]";
}

function normalizeOrderItemRow(row) {
  const quantity = Number(row.quantity ?? 1);
  return {
    productId: String(row.product_id ?? row.productId ?? ""),
    productName: row.product_name ?? row.productName ?? "Producto",
    unitPriceCents: Number(row.unit_price_cents ?? row.unitPriceCents ?? 0) || 0,
    taxPercentage: Number(row.tax_percentage ?? row.taxPercentage ?? 0) || 0,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    removedIngredients: parseStoredList(
      row.removed_ingredients ?? row.removedIngredients,
    ).map((entry) => String(entry)),
    selectedOptions: parseStoredList(
      row.selected_options ?? row.selectedOptions,
    ),
    customerNote: row.customer_note ?? row.customerNote ?? undefined,
    totalCents: Number(row.total_cents ?? row.totalCents ?? 0) || 0,
  };
}

function normalizeOrderRow(row, items = []) {
  const createdAt =
    toIsoTimestamp(row.created_at ?? row.createdAt) ||
    new Date(0).toISOString();
  const updatedAt =
    toIsoTimestamp(row.updated_at ?? row.updatedAt) || createdAt;
  const status = String(row.status || "NEW");
  const rawHistory = parseStoredList(
    row.status_history ?? row.statusHistory,
  );
  const statusHistory = rawHistory.length
    ? rawHistory.map((entry) => ({
        status: String(entry?.status || status),
        timestamp:
          toIsoTimestamp(entry?.timestamp ?? entry?.created_at) || createdAt,
        note: entry?.note ?? "",
        changedByRole:
          entry?.changedByRole ?? entry?.changed_by_role ?? "SISTEMA",
      }))
    : [
        {
          status,
          timestamp: createdAt,
          changedByRole: "SISTEMA",
          note: "Estado inicial",
        },
      ];

  const rawAddress = row.delivery_address ?? row.deliveryAddress;
  const parsedAddress =
    typeof rawAddress === "string"
      ? parseStoredJson(rawAddress, null)
      : rawAddress;
  const deliveryAddress =
    parsedAddress && typeof parsedAddress === "object"
      ? parsedAddress
      : undefined;

  const reviewScore = row.review_score ?? row.reviewScore;

  return {
    id: String(row.id),
    orderNumber: row.order_number ?? row.orderNumber ?? "",
    businessId: row.business_id ?? row.businessId ?? "",
    businessName:
      row.business_name ??
      row.businessName ??
      row.joined_business_name ??
      "Negocio",
    customerId: row.customer_id ?? row.customerId ?? "",
    customerName: row.customer_name ?? row.customerName ?? "Cliente",
    customerPhone: row.customer_phone ?? row.customerPhone ?? "",
    customerEmail: row.customer_email ?? row.customerEmail ?? "",
    deliveryType:
      (row.delivery_type ?? row.deliveryType) === "PICKUP"
        ? "PICKUP"
        : "DELIVERY",
    deliveryAddress,
    scheduledTime: row.scheduled_time ?? row.scheduledTime ?? undefined,
    items: Array.isArray(items)
      ? items.map((item) => normalizeOrderItemRow(item))
      : [],
    subtotalCents: Number(row.subtotal_cents ?? row.subtotalCents ?? 0) || 0,
    deliveryFeeCents:
      Number(row.delivery_fee_cents ?? row.deliveryFeeCents ?? 0) || 0,
    platformFeeCents:
      Number(row.platform_fee_cents ?? row.platformFeeCents ?? 0) || 0,
    businessPayoutCents:
      Number(row.business_payout_cents ?? row.businessPayoutCents ?? 0) || 0,
    courierPayoutCents:
      Number(row.courier_payout_cents ?? row.courierPayoutCents ?? 0) || 0,
    tipCents: Number(row.tip_cents ?? row.tipCents ?? 0) || 0,
    totalCents: Number(row.total_cents ?? row.totalCents ?? 0) || 0,
    status,
    statusHistory,
    paymentMethod:
      row.payment_method ?? row.paymentMethod ?? "CASH_ON_DELIVERY",
    paymentStatus: row.payment_status ?? row.paymentStatus ?? "PAID",
    paymentTransactionId:
      row.payment_transaction_id ?? row.paymentTransactionId ?? undefined,
    courierId: row.courier_id ?? row.courierId ?? undefined,
    courierName: row.courier_name ?? row.courierName ?? undefined,
    courierPhone: row.courier_phone ?? row.courierPhone ?? undefined,
    deliveryPin: String(row.delivery_pin ?? row.deliveryPin ?? ""),
    calendarEventId:
      row.calendar_event_id ?? row.calendarEventId ?? undefined,
    gmailNotifiedAt:
      toIsoTimestamp(row.gmail_notified_at ?? row.gmailNotifiedAt) || undefined,
    reviewRequested: Boolean(
      row.review_requested ?? row.reviewRequested ?? 0,
    ),
    reviewScore:
      reviewScore === null || reviewScore === undefined
        ? undefined
        : Number(reviewScore),
    reviewedAt:
      toIsoTimestamp(row.reviewed_at ?? row.reviewedAt) || undefined,
    createdAt,
    updatedAt,
  };
}

function groupOrderItems(itemRows) {
  const itemsByOrder = new Map();
  for (const item of itemRows) {
    const orderId = String(item.order_id ?? item.orderId ?? "");
    if (!orderId) continue;
    if (!itemsByOrder.has(orderId)) itemsByOrder.set(orderId, []);
    itemsByOrder.get(orderId).push(item);
  }
  return itemsByOrder;
}

function buildOrderVisibilityFilter(user) {
  const role = String(user?.role || "").toUpperCase();

  if (role === "SUPERADMIN") {
    return { whereSql: "", params: [] };
  }

  const userId = String(user?.id || "").trim();
  const userEmail = String(user?.email || "").trim().toLowerCase();
  const businessId = String(user?.business_id || user?.businessId || "").trim();
  const courierBusinessIds = parseCourierBusinessIds(user);

  if (role === "BUSINESS_ADMIN") {
    return businessId
      ? { whereSql: "WHERE o.business_id = ?", params: [businessId] }
      : { whereSql: "WHERE 1 = 0", params: [] };
  }

  if (role === "BUSINESS_COURIER") {
    const clauses = [];
    const params = [];
    if (courierBusinessIds.length) {
      const placeholders = courierBusinessIds.map(() => "?").join(", ");
      clauses.push(`o.business_id IN (${placeholders})`);
      params.push(...courierBusinessIds);
    }
    if (userId) {
      clauses.push("o.courier_id = ?");
      params.push(userId);
    }
    return clauses.length
      ? { whereSql: `WHERE (${clauses.join(" OR ")})`, params }
      : { whereSql: "WHERE 1 = 0", params: [] };
  }

  if (role === "PLATFORM_COURIER") {
    // El repartidor de plataforma cubre todo el valle y su panel muestra los
    // pedidos de todos los negocios, igual que antes de filtrar en servidor.
    return { whereSql: "", params: [] };
  }

  if (role === "CLIENT") {
    const clauses = [];
    const params = [];
    if (userId) {
      clauses.push("o.customer_id = ?");
      params.push(userId);
    }
    if (userEmail) {
      // Los pedidos antiguos no guardaban customer_id: se conserva el mismo
      // respaldo por email que usa el frontend, pero sólo cuando el pedido no
      // está ya vinculado a otra cuenta.
      clauses.push(
        "((o.customer_id IS NULL OR o.customer_id = '') AND LOWER(o.customer_email) = ?)",
      );
      params.push(userEmail);
    }
    return clauses.length
      ? { whereSql: `WHERE (${clauses.join(" OR ")})`, params }
      : { whereSql: "WHERE 1 = 0", params: [] };
  }

  return { whereSql: "WHERE 1 = 0", params: [] };
}

async function listOrders(user) {
  const { whereSql, params } = buildOrderVisibilityFilter(user);
  const selectOrdersSql =
    "SELECT o.*, b.name AS joined_business_name FROM orders o " +
    "LEFT JOIN businesses b ON b.id = o.business_id " +
    `${whereSql} ORDER BY o.created_at DESC`;
  // Se reutiliza el mismo WHERE para no cargar líneas de pedidos que el
  // usuario no puede ver.
  const selectItemsSql =
    "SELECT oi.* FROM order_items oi " +
    "JOIN orders o ON o.id = oi.order_id " +
    `${whereSql} ORDER BY oi.created_at ASC`;

  if (mysqlPool) {
    const [orderRows] = await mysqlPool.execute(selectOrdersSql, params);
    const [itemRows] = await mysqlPool.execute(selectItemsSql, params);
    const itemsByOrder = groupOrderItems(itemRows);
    return orderRows.map((row) =>
      normalizeOrderRow(row, itemsByOrder.get(String(row.id)) || []),
    );
  }

  const db = getSqliteDb();
  const orderRows = db.prepare(selectOrdersSql).all(...params);
  const itemRows = db.prepare(selectItemsSql).all(...params);
  const itemsByOrder = groupOrderItems(itemRows);
  return orderRows.map((row) =>
    normalizeOrderRow(row, itemsByOrder.get(String(row.id)) || []),
  );
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
  phone,
  address,
  dni,
  avatarUrl,
  role = "CLIENT",
  businessId = null,
  courierConfirmation = "PENDING",
  courierBusinessIds = [],
  accountNumber = null,
}) {
  const cleanUsername = String(
    username || email.split("@")[0] || "client",
  ).trim();
  const cleanEmail = String(
    email || `${cleanUsername}@pidetietar.local`,
  ).trim();
  const cleanPassword = validatePasswordOrThrow(password);
  const hash = bcrypt.hashSync(cleanPassword, 10);
  const requestedConfirmation = String(
    courierConfirmation || "PENDING",
  ).toUpperCase();
  const cleanCourierConfirmation = [
    "PENDING",
    "BUSINESS_EMAIL",
    "SUPERADMIN",
  ].includes(requestedConfirmation)
    ? requestedConfirmation
    : "PENDING";
  const cleanCourierBusinessIds = Array.isArray(courierBusinessIds)
    ? [
        ...new Set(
          courierBusinessIds
            .map((id) => String(id ?? "").trim())
            .filter(Boolean),
        ),
      ]
    : [];
  const cleanAccountNumber = accountNumber
    ? String(accountNumber).replace(/\s+/g, "").toUpperCase()
    : null;
  const cleanAddress = address ? String(address).trim() : null;
  const cleanDni = dni
    ? String(dni).replace(/\s+/g, "").toUpperCase()
    : null;

  if (mysqlPool) {
    const id = cryptoRandomId();
    await mysqlPool.execute(
      "INSERT INTO app_users (id, username, full_name, email, phone, address, dni, avatar_url, password_hash, role, status, business_id, account_number, email_verified, courier_confirmation, courier_business_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, 1, ?, ?)",
      [
        id,
        cleanUsername,
        fullName || cleanUsername,
        cleanEmail,
        phone || null,
        cleanAddress,
        cleanDni,
        avatarUrl || null,
        hash,
        role,
        businessId || null,
        cleanAccountNumber,
        cleanCourierConfirmation,
        JSON.stringify(cleanCourierBusinessIds),
      ],
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
    "INSERT INTO app_users (id, username, full_name, email, phone, address, dni, avatar_url, password_hash, role, status, business_id, account_number, email_verified, courier_confirmation, courier_business_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, 1, ?, ?)",
  ).run(
    id,
    cleanUsername,
    fullName || cleanUsername,
    cleanEmail,
    phone || null,
    cleanAddress,
    cleanDni,
    avatarUrl || null,
    hash,
    role,
    businessId || null,
    cleanAccountNumber,
    cleanCourierConfirmation,
    JSON.stringify(cleanCourierBusinessIds),
  );
  return db.prepare("SELECT * FROM app_users WHERE id = ? LIMIT 1").get(id);
}

function cryptoRandomId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// =========================================================
// SESIONES (token firmado) Y AUTORIZACIÓN
// =========================================================
// No se añadieron dependencias (jsonwebtoken, etc.): el token es un HMAC-SHA256
// de un payload JSON. Sin la clave no se puede falsificar y su validez temporal
// se comprueba con comparación constante en tiempo.
const SESSION_TTL_MS =
  Number(process.env.SESSION_TTL_HOURS || 168) * 60 * 60 * 1000;

function loadSessionSecret() {
  if (process.env.SESSION_SECRET) return String(process.env.SESSION_SECRET);

  const secretFile = path.join(DATA_DIR, ".session_secret");
  try {
    const existing = fs.readFileSync(secretFile, "utf8").trim();
    if (existing.length >= 32) return existing;
  } catch {
    // Todavía no existe: se genera más abajo.
  }

  const secret = randomBytes(48).toString("hex");
  try {
    fs.writeFileSync(secretFile, secret, { mode: 0o600 });
  } catch (error) {
    console.warn("No se pudo persistir el secreto de sesión:", error.message);
  }
  return secret;
}

const SESSION_SECRET = loadSessionSecret();

const b64url = (value) => Buffer.from(value).toString("base64url");

function getSuperAdminSessionUser() {
  return {
    id: "superadmin-rafaadmin",
    username: process.env.SUPERADMIN_USERNAME || "RafaAdmin",
    full_name: "RafaAdmin",
    email:
      process.env.SUPERADMIN_EMAIL || "rafaeldesweb@gmail.com",
    role: "SUPERADMIN",
    status: "ACTIVE",
    business_id: null,
    created_at: new Date().toISOString(),
  };
}

function createSessionToken(user) {
  const payload = {
    sub: user.id,
    role: user.role || "CLIENT",
    businessId: user.business_id || user.businessId || null,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  };

  const body = b64url(JSON.stringify(payload));
  const signature = createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

function readSessionToken(token) {
  if (!token) return null;

  const parts = String(token).split(".");
  if (parts.length !== 2) return null;

  const [body, signature] = parts;
  if (!body || !signature) return null;

  const expected = createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!payload || !payload.sub) return null;
  if (!payload.exp || Date.now() > Number(payload.exp)) return null;

  return payload;
}

async function loadUserForSession(userId) {
  if (String(userId) === "superadmin-rafaadmin") {
    // Las sesiones antiguas de emergencia usan un ID virtual. Cuando existe
    // la cuenta sembrada, se debe leer y editar su fila real.
    try {
      const storedUser = await getUserByIdentifier(
        process.env.SUPERADMIN_USERNAME || "RafaAdmin",
      );
      if (storedUser?.role === "SUPERADMIN") return storedUser;
    } catch {
      // Se mantiene el acceso de emergencia si la base no responde.
    }
    return getSuperAdminSessionUser();
  }

  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM app_users WHERE id = ? LIMIT 1",
      [String(userId)],
    );
    return rows[0] || null;
  }

  const db = getSqliteDb();
  return (
    db
      .prepare("SELECT * FROM app_users WHERE id = ? LIMIT 1")
      .get(String(userId)) || null
  );
}

async function readRequestUser(req) {
  const header = String(req.headers.authorization || "");
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const token = bearer || String(req.headers["x-auth-token"] || "").trim();

  const payload = readSessionToken(token);
  if (!payload) return null;

  return loadUserForSession(payload.sub);
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function validationError(message, errors = {}) {
  const error = new Error(message);
  error.status = 400;
  error.code = "VALIDATION_ERROR";
  error.errors = errors;
  return error;
}

function assertValid(errors) {
  const keys = Object.keys(errors);
  if (!keys.length) return;
  throw validationError("Revisa los datos del formulario; hay campos con errores.", errors);
}

// Devuelve un middleware de roles. Sin argumentos sólo exige sesión iniciada.
function requireRole(...roles) {
  return async (req, _res, next) => {
    try {
      const user = await readRequestUser(req);
      if (!user) {
        throw httpError(
          401,
          "UNAUTHORIZED",
          "Debes iniciar sesión para realizar esta acción.",
        );
      }

      const role = String(user.role || "").toUpperCase();
      if (roles.length && !roles.includes(role)) {
        throw httpError(
          403,
          "FORBIDDEN",
          "Tu usuario no tiene permisos para realizar esta acción.",
        );
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

const requireAuth = requireRole();
const requireSuperAdmin = requireRole("SUPERADMIN");

// =========================================================
// TRANSACCIONES (SQLite y MySQL con la misma interfaz)
// =========================================================
const SELECT_STATEMENT = /^\s*(select|with|pragma)\b/i;

async function txQuery(tx, sql, params = []) {
  if (mysqlPool) {
    const [rows] = await tx.execute(sql, params);
    return rows;
  }

  const statement = tx.prepare(sql);
  if (SELECT_STATEMENT.test(sql)) return statement.all(...params);
  statement.run(...params);
  return null;
}

async function withTransaction(run) {
  if (mysqlPool) {
    const conn = await mysqlPool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await run(conn);
      await conn.commit();
      return result;
    } catch (error) {
      try {
        await conn.rollback();
      } catch {
        // La conexión se libera igualmente en el finally.
      }
      throw error;
    } finally {
      conn.release();
    }
  }

  const db = getSqliteDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = await run(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // La transacción puede haberse revertido ya por el motor.
    }
    throw error;
  }
}

// =========================================================
// VALIDACIÓN DE NEGOCIOS Y DE LA CUENTA DEL PROPIETARIO
// =========================================================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
// NIF (8 dígitos + letra), CIF (letra + 7 dígitos + control alfanumérico) y
// NIE (X/Y/Z + 7 dígitos + letra).
const CIF_REGEX =
  /^([0-9]{8}[A-Z]|[A-HJ-NP-SUVW][0-9]{7}[0-9A-J]|[XYZ][0-9]{7}[A-Z])$/;
const DNI_REGEX = /^([0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z])$/;
const IBAN_REGEX = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,64}$/;
const IMAGE_URL_MAX_LENGTH = 1500000;
const ALLOWED_DELIVERY_MODES = [
  "OWN_COURIER",
  "PLATFORM_COURIER",
  "PICKUP",
  "DELIVERY",
];
const ALLOWED_BUSINESS_STATUSES = ["APPROVED", "PENDING", "SUSPENDED"];
const MIN_BUSINESS_NAME_LENGTH = 2;
const MAX_BUSINESS_NAME_LENGTH = 180;
const MAX_TIME_MINUTES = 240;
const MAX_FEE_CENTS = 1000000;

const cleanString = (value) => String(value ?? "").trim();
const asInteger = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
};
const asBooleanFlag = (value, fallback) => {
  if (value === undefined) return fallback;
  if (value === null) return fallback;
  if (value === true || value === 1 || value === "1" || value === "true") return 1;
  if (value === false || value === 0 || value === "0" || value === "false") return 0;
  return fallback;
};

function isValidImageUrl(value) {
  const isDataMedia =
    value.startsWith("data:image/") ||
    value.startsWith("data:video/mp4") ||
    value.startsWith("data:video/webm");
  if (/^https?:\/\/\S+$/i.test(value)) return true;
  return isDataMedia && !value.includes(" ");
}

const MEDIA_ENTITY_TYPES = new Set(["USER", "BUSINESS", "PRODUCT", "CATEGORY"]);
const ALLOWED_MEDIA_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "video/mp4",
  "video/webm",
]);
const MAX_MEDIA_BYTES = 6 * 1024 * 1024;
const ORDER_STATUSES = new Set(["PENDING_PAYMENT", "PAID", "NEW", "ACCEPTED", "PREPARING", "READY", "ASSIGNED", "PICKED_UP", "DELIVERED", "CANCELLED", "REJECTED", "REFUNDED"]);

function normalizeMediaEntityType(value) {
  const entityType = cleanString(value).toUpperCase();
  if (!MEDIA_ENTITY_TYPES.has(entityType)) {
    throw validationError("El tipo de entidad multimedia no es válido.", {
      entityType: "Usa USER, BUSINESS, PRODUCT o CATEGORY.",
    });
  }
  return entityType;
}

async function saveSupabaseMediaAsset({
  entityType,
  entityId,
  fieldName,
  value,
  originalName,
  createdBy,
}) {
  const cleanValue = cleanString(value);
  if (!cleanValue || !cleanValue.startsWith("data:")) return cleanValue;

  const parsed = parseDataUrl(cleanValue);
  if (!parsed) {
    throw validationError("El archivo multimedia no tiene un formato válido.", {
      value: "Usa un data URL base64 válido.",
    });
  }
  if (!ALLOWED_MEDIA_CONTENT_TYPES.has(parsed.contentType)) {
    throw validationError("El tipo de archivo multimedia no está permitido.", {
      value: "Solo se aceptan JPG, PNG, GIF, MP4 o WebM.",
    });
  }
  if (!parsed.buffer.length || parsed.buffer.length > MAX_MEDIA_BYTES) {
    throw httpError(413, "PAYLOAD_TOO_LARGE", "El archivo multimedia supera el límite de 6 MB.");
  }

  const supabase = getSupabaseMediaClient();
  if (!supabase) {
    throw httpError(503, "MEDIA_STORAGE_UNAVAILABLE", "El almacenamiento multimedia de Supabase no está configurado.");
  }

  const normalizedType = normalizeMediaEntityType(entityType);
  const normalizedId = cleanString(entityId);
  const normalizedField = cleanString(fieldName) || "media";
  if (!normalizedId) {
    throw validationError("Falta el ID de la entidad multimedia.", {
      entityId: "El ID es obligatorio.",
    });
  }

  const bucket = getSupabaseMediaBucket();
  return replaceMediaAsset(supabase, bucket, {
    entityType: normalizedType,
    entityId: normalizedId,
    fieldName: normalizedField,
    buffer: parsed.buffer,
    contentType: parsed.contentType,
    originalName: cleanString(originalName),
    createdBy: cleanString(createdBy),
  });
}

async function normalizeStoredMediaValue(options) {
  const value = cleanString(options.value);
  if (!value.startsWith("data:")) return value;
  const asset = await saveSupabaseMediaAsset(options);
  return asset.public_url;
}

async function persistUserAvatar(userId, value, createdBy) {
  const storedValue = await normalizeStoredMediaValue({
    entityType: "USER",
    entityId: userId,
    fieldName: "avatar_url",
    value,
    createdBy,
  });
  if (mysqlPool) {
    await mysqlPool.execute("UPDATE app_users SET avatar_url = ? WHERE id = ?", [storedValue || null, userId]);
  } else {
    getSqliteDb().prepare("UPDATE app_users SET avatar_url = ? WHERE id = ?").run(storedValue || null, userId);
  }
  return storedValue;
}

async function listSupabaseMediaAssets(entityType, entityId) {
  const supabase = getSupabaseMediaClient();
  if (!supabase) return [];
  const query = supabase.from("media_assets").select("*").eq("entity_id", cleanString(entityId));
  const result = await query.eq("entity_type", normalizeMediaEntityType(entityType)).order("created_at", { ascending: false });
  if (result.error) {
    throw httpError(502, "MEDIA_RELATION_FAILED", result.error.message || "No se pudieron consultar los medios.");
  }
  return result.data || [];
}

async function deleteSupabaseMediaAsset(id) {
  const supabase = getSupabaseMediaClient();
  if (!supabase) throw httpError(503, "MEDIA_STORAGE_UNAVAILABLE", "El almacenamiento multimedia de Supabase no está configurado.");
  const found = await supabase.from("media_assets").select("id, storage_bucket, storage_path").eq("id", id).maybeSingle();
  if (found.error) throw httpError(502, "MEDIA_RELATION_FAILED", found.error.message || "No se pudo consultar el medio.");
  if (!found.data) throw httpError(404, "NOT_FOUND", "El medio no existe.");
  const bucket = found.data.storage_bucket || getSupabaseMediaBucket();
  const removed = await supabase.storage.from(bucket).remove([found.data.storage_path]);
  if (removed.error) throw httpError(502, "MEDIA_DELETE_FAILED", removed.error.message || "No se pudo eliminar el archivo multimedia.");
  const deleted = await supabase.from("media_assets").delete().eq("id", id);
  if (deleted.error) throw httpError(502, "MEDIA_RELATION_FAILED", deleted.error.message || "No se pudo eliminar la relación multimedia.");
}

async function assertMediaMutationAccess(user, entityType, entityId) {
  const role = String(user?.role || "").toUpperCase();
  if (role === "SUPERADMIN") return;
  const normalizedType = normalizeMediaEntityType(entityType);
  const normalizedId = cleanString(entityId);

  if (normalizedType === "USER") {
    if (String(user.id || "") !== normalizedId) {
      throw httpError(403, "FORBIDDEN", "Solo puedes modificar tus propios medios.");
    }
    return;
  }
  if (normalizedType === "BUSINESS") {
    assertBusinessResourceAccess(user, normalizedId, "Solo puedes modificar medios de tu propio negocio.");
    return;
  }
  if (normalizedType === "PRODUCT") {
    const product = await getProductById(normalizedId);
    if (!product) throw httpError(404, "NOT_FOUND", "El producto no existe.");
    assertBusinessResourceAccess(user, product.business_id, "Solo puedes modificar medios de tu propio negocio.");
    return;
  }
  throw httpError(403, "FORBIDDEN", "Solo el superadmin puede modificar medios de categorías.");
}

function normalizeCategorySlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function validateCategory(body) {
  const errors = {};
  const name = cleanString(body.name);
  const slug = normalizeCategorySlug(body.slug || name);
  const iconName = cleanString(body.iconName ?? body.icon_name);
  const imageUrl = cleanString(body.imageUrl ?? body.image_url);
  const showIngredients = asBooleanFlag(
    body.showIngredients ?? body.show_ingredients,
    1,
  );
  const showRemovableIngredients = asBooleanFlag(
    body.showRemovableIngredients ?? body.show_removable_ingredients,
    1,
  );
  const showAdditionalIngredients = asBooleanFlag(
    body.showAdditionalIngredients ?? body.show_additional_ingredients,
    1,
  );

  if (name.length < 2) {
    errors.name = "El nombre debe tener al menos 2 caracteres.";
  } else if (name.length > 120) {
    errors.name = "El nombre no puede superar los 120 caracteres.";
  }

  if (!slug) {
    errors.slug = "El slug es obligatorio.";
  } else if (slug.length > 120) {
    errors.slug = "El slug no puede superar los 120 caracteres.";
  }

  if (iconName.length > 80) {
    errors.iconName = "El icono no puede superar los 80 caracteres.";
  }

  if (imageUrl) {
    if (imageUrl.length > IMAGE_URL_MAX_LENGTH) {
      errors.imageUrl = "La imagen es demasiado grande.";
    } else if (!isValidImageUrl(imageUrl)) {
      errors.imageUrl = "La imagen debe ser una URL http(s) o un data URL de imagen.";
    }
  }

  return {
    errors,
    values: {
      name,
      slug,
      iconName,
      imageUrl,
      showIngredients,
      showRemovableIngredients,
      showAdditionalIngredients,
    },
  };
}

function validateSchedule(schedule) {
  const errors = [];
  if (!Array.isArray(schedule)) {
    errors.push("El horario debe ser una lista de días.");
    return { errors, value: [] };
  }

  if (schedule.length > 7) {
    errors.push("El horario no puede tener más de 7 entradas (una por día).");
    return { errors, value: [] };
  }

  const seen = new Set();
  const value = [];

  schedule.forEach((slot, index) => {
    const prefix = `schedule[${index}]`;
    const dayOfWeek = asInteger(slot?.dayOfWeek ?? slot?.day_of_week);
    const isOpen = asBooleanFlag(slot?.isOpen ?? slot?.is_open, 1);
    // Los TIME de MySQL pueden llegar con segundos. Los días cerrados no
    // necesitan horas; se conservan valores válidos para las columnas NOT NULL.
    const normalizeTime = (input, fallback) => {
      const time = cleanString(input);
      if (!time && !isOpen) return fallback;
      return /^([01]\d|2[0-3]):[0-5]\d:00$/.test(time) ? time.slice(0, 5) : time;
    };
    const openTime = normalizeTime(slot?.openTime ?? slot?.open_time, "12:00");
    const closeTime = normalizeTime(slot?.closeTime ?? slot?.close_time, "23:00");

    if (dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6) {
      errors.push(`${prefix}: el día de la semana debe estar entre 0 (domingo) y 6 (sábado).`);
      return;
    }
    if (seen.has(dayOfWeek)) {
      errors.push(`${prefix}: el día ${dayOfWeek} está repetido.`);
      return;
    }
    if (!TIME_REGEX.test(openTime)) {
      errors.push(`${prefix}: la hora de apertura no es válida (formato HH:MM).`);
      return;
    }
    if (!TIME_REGEX.test(closeTime)) {
      errors.push(`${prefix}: la hora de cierre no es válida (formato HH:MM).`);
      return;
    }

    seen.add(dayOfWeek);
    value.push({
      day_of_week: dayOfWeek,
      open_time: openTime,
      close_time: closeTime,
      is_open: isOpen,
    });
  });

  return { errors, value };
}

// Valida el alta completa o la actualización parcial de un negocio.
// `partial` = true sólo exige los campos que llegan en el body.
function validateBusiness(body, { partial = false } = {}) {
  const errors = {};
  const value = {};
  const raw = body || {};

  const exists = (...keys) => keys.some((key) => raw[key] !== undefined);
  const get = (...keys) => {
    for (const key of keys) {
      if (raw[key] !== undefined) return raw[key];
    }
    return undefined;
  };
  const required = (...keys) => !partial || exists(...keys);

  if (required("name")) {
    const name = cleanString(get("name"));
    if (!name) {
      errors.name = "El nombre del negocio es obligatorio.";
    } else if (name.length < MIN_BUSINESS_NAME_LENGTH || name.length > MAX_BUSINESS_NAME_LENGTH) {
      errors.name = `El nombre debe tener entre ${MIN_BUSINESS_NAME_LENGTH} y ${MAX_BUSINESS_NAME_LENGTH} caracteres.`;
    } else {
      value.name = name;
    }
  }

  if (exists("legal_name", "legalName") || !partial) {
    const legalName = cleanString(get("legal_name", "legalName"));
    if (legalName.length > MAX_BUSINESS_NAME_LENGTH) {
      errors.legal_name = "La razón social no puede superar los 180 caracteres.";
    } else {
      // En el alta sin razón social se reutiliza el nombre comercial.
      value.legal_name = legalName || (partial ? "" : value.name || "");
    }
  }

  if (required("cif")) {
    const cif = cleanString(get("cif")).toUpperCase();
    if (!cif) {
      errors.cif = "El CIF/NIF es obligatorio.";
    } else if (!CIF_REGEX.test(cif)) {
      errors.cif = "El CIF/NIF no tiene un formato válido (ej. B12345678, 12345678Z o X1234567L).";
    } else {
      value.cif = cif;
    }
  }

  if (required("email")) {
    const email = cleanString(get("email")).toLowerCase();
    if (!email) {
      errors.email = "El email de contacto es obligatorio.";
    } else if (!EMAIL_REGEX.test(email) || email.length > 255) {
      errors.email = "El email de contacto no es válido.";
    } else {
      value.email = email;
    }
  }

  if (required("phone")) {
    const phone = cleanString(get("phone"));
    const digits = phone.replace(/\D/g, "");
    if (!phone) {
      errors.phone = "El teléfono es obligatorio.";
    } else if (!/^\+?[\d\s.()-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
      errors.phone = "El teléfono debe contener entre 7 y 15 dígitos (ej. +34 600 000 000).";
    } else {
      value.phone = phone;
    }
  }

  if (required("address")) {
    const address = cleanString(get("address"));
    if (!address) {
      errors.address = "La dirección es obligatoria.";
    } else if (address.length < 5 || address.length > 500) {
      errors.address = "La dirección debe tener entre 5 y 500 caracteres.";
    } else {
      value.address = address;
    }
  }

  if (required("locality_id", "localityId")) {
    const localityId = cleanString(get("locality_id", "localityId"));
    if (!localityId) {
      errors.locality_id = "Debes seleccionar una zona.";
    } else if (localityId.length > 64) {
      errors.locality_id = "El identificador de la zona no es válido.";
    } else {
      value.locality_id = localityId;
    }
  }

  if (required("category")) {
    const category = cleanString(get("category"));
    if (!category) {
      errors.category = "La categoría del negocio es obligatoria.";
    } else if (category.length > 120) {
      errors.category = "La categoría no puede superar los 120 caracteres.";
    } else {
      value.category = category;
    }
  }

  if (exists("account_number", "accountNumber")) {
    const accountNumber = cleanString(
      get("account_number", "accountNumber"),
    )
      .replace(/\s+/g, "")
      .toUpperCase();

    if (!accountNumber) {
      value.account_number = null;
    } else if (!IBAN_REGEX.test(accountNumber)) {
      errors.account_number =
        "El número de cuenta no es válido. Debe ser un IBAN (ej. ES9121000418450200051332).";
    } else {
      value.account_number = accountNumber;
    }
  }

  if (exists("latitude") || !partial) {
    const latitude = get("latitude");
    const parsed = latitude === undefined ? 40.289 : Number(latitude);
    if (!Number.isFinite(parsed) || parsed < -90 || parsed > 90) {
      errors.latitude = "La latitud debe estar entre -90 y 90.";
    } else {
      value.latitude = Math.round(parsed * 1e6) / 1e6;
    }
  }

  if (exists("longitude") || !partial) {
    const longitude = get("longitude");
    const parsed = longitude === undefined ? -4.58 : Number(longitude);
    if (!Number.isFinite(parsed) || parsed < -180 || parsed > 180) {
      errors.longitude = "La longitud debe estar entre -180 y 180.";
    } else {
      value.longitude = Math.round(parsed * 1e6) / 1e6;
    }
  }

  if (exists("rating")) {
    const rating = Number(get("rating"));
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      errors.rating = "La valoración debe estar entre 0 y 5.";
    } else {
      value.rating = Math.round(rating * 100) / 100;
    }
  } else if (!partial) {
    // Arranque con nota positiva: el negocio no nace a cero.
    value.rating = 4.8;
  }

  if (exists("review_count", "reviewCount")) {
    const reviewCount = asInteger(get("review_count", "reviewCount"));
    if (reviewCount === null || reviewCount < 0) {
      errors.review_count = "El número de reseñas debe ser un entero positivo.";
    } else {
      value.review_count = reviewCount;
    }
  } else if (!partial) {
    value.review_count = 0;
  }

  const timeMin = asInteger(get("estimated_time_min", "estimatedTimeMin"));
  const timeMax = asInteger(get("estimated_time_max", "estimatedTimeMax"));

  if (exists("estimated_time_min", "estimatedTimeMin")) {
    if (timeMin === null || timeMin < 1 || timeMin > MAX_TIME_MINUTES) {
      errors.estimated_time_min = `El tiempo mínimo debe estar entre 1 y ${MAX_TIME_MINUTES} minutos.`;
    } else {
      value.estimated_time_min = timeMin;
    }
  } else if (!partial) {
    value.estimated_time_min = 20;
  }

  if (exists("estimated_time_max", "estimatedTimeMax")) {
    if (timeMax === null || timeMax < 1 || timeMax > MAX_TIME_MINUTES) {
      errors.estimated_time_max = `El tiempo máximo debe estar entre 1 y ${MAX_TIME_MINUTES} minutos.`;
    } else {
      value.estimated_time_max = timeMax;
    }
  } else if (!partial) {
    value.estimated_time_max = 40;
  }

  if (!errors.estimated_time_min && !errors.estimated_time_max) {
    const finalMin = value.estimated_time_min ?? timeMin;
    const finalMax = value.estimated_time_max ?? timeMax;
    if (finalMin && finalMax && finalMin > finalMax) {
      errors.estimated_time_min =
        "El tiempo mínimo no puede ser mayor que el tiempo máximo.";
    }
  }

  if (exists("delivery_fee_cents", "deliveryFeeCents")) {
    const fee = asInteger(get("delivery_fee_cents", "deliveryFeeCents"));
    if (fee === null || fee < 0 || fee > MAX_FEE_CENTS) {
      errors.delivery_fee_cents = "El gasto de envío no es válido.";
    } else {
      value.delivery_fee_cents = fee;
    }
  } else if (!partial) {
    value.delivery_fee_cents = 0;
  }

  if (exists("min_order_cents", "minOrderCents")) {
    const minOrder = asInteger(get("min_order_cents", "minOrderCents"));
    if (minOrder === null || minOrder < 0 || minOrder > MAX_FEE_CENTS) {
      errors.min_order_cents = "El pedido mínimo no es válido.";
    } else {
      value.min_order_cents = minOrder;
    }
  } else if (!partial) {
    value.min_order_cents = 0;
  }

  if (exists("delivery_radius_km", "deliveryRadiusKm")) {
    const radius = Number(get("delivery_radius_km", "deliveryRadiusKm"));
    if (!Number.isFinite(radius) || radius < 0 || radius > 100) {
      errors.delivery_radius_km = "El radio de reparto debe estar entre 0 y 100 km.";
    } else {
      value.delivery_radius_km = Math.round(radius * 100) / 100;
    }
  } else if (!partial) {
    value.delivery_radius_km = 5;
  }

  if (exists("delivery_modes", "deliveryModes")) {
    const modes = get("delivery_modes", "deliveryModes");
    const list = (Array.isArray(modes) ? modes : String(modes || "").split(","))
      .map((mode) => cleanString(mode))
      .filter(Boolean);

    if (!list.length) {
      errors.delivery_modes = "Debes elegir al menos un modo de entrega.";
    } else if (new Set(list).size !== list.length) {
      errors.delivery_modes = "Hay modos de entrega repetidos.";
    } else {
      const invalid = list.filter(
        (mode) => !ALLOWED_DELIVERY_MODES.includes(mode),
      );
      if (invalid.length) {
        errors.delivery_modes = `Modos de entrega no permitidos: ${invalid.join(", ")}.`;
      } else {
        value.delivery_modes = list;
      }
    }
  } else if (!partial) {
    value.delivery_modes = ["PICKUP"];
  }

  if (exists("status")) {
    const status = cleanString(get("status")).toUpperCase();
    if (!ALLOWED_BUSINESS_STATUSES.includes(status)) {
      errors.status = `El estado debe ser uno de: ${ALLOWED_BUSINESS_STATUSES.join(", ")}.`;
    } else {
      value.status = status;
    }
  } else if (!partial) {
    // Quien registra un negocio es siempre el superadmin: se aprueba al alta.
    value.status = "APPROVED";
  }

  if (exists("is_shift_open", "isShiftOpen")) {
    value.is_shift_open = asBooleanFlag(
      get("is_shift_open", "isShiftOpen"),
      0,
    );
  } else if (!partial) {
    value.is_shift_open = 1;
  }

  for (const [field, altField] of [
    ["banner_url", "bannerUrl"],
    ["logo_url", "logoUrl"],
  ]) {
    if (!exists(field, altField)) continue;
    const image = cleanString(get(field, altField));
    if (!image) {
      value[field] = "";
    } else if (!isValidImageUrl(image)) {
      errors[field] = "La imagen debe ser una URL http(s) o un archivo cargado.";
    } else if (image.length > IMAGE_URL_MAX_LENGTH) {
      errors[field] = "La imagen es demasiado pesada (máximo aproximado 1 MB).";
    } else {
      value[field] = image;
    }
  }

  if (exists("manager_name", "managerName")) {
    const managerName = cleanString(get("manager_name", "managerName"));
    if (managerName.length > 180) {
      errors.manager_name = "El nombre de la persona responsable no puede superar 180 caracteres.";
    } else {
      value.manager_name = managerName || null;
    }
  }

  if (exists("manager_dni", "managerDni")) {
    const managerDni = cleanString(get("manager_dni", "managerDni")).toUpperCase();
    if (managerDni && !DNI_REGEX.test(managerDni)) {
      errors.manager_dni = "El DNI/NIE de la persona responsable no es válido.";
    } else {
      value.manager_dni = managerDni || null;
    }
  }

  if (exists("schedule")) {
    const schedule = validateSchedule(get("schedule"));
    schedule.errors.forEach((message, index) => {
      errors[`schedule_${index}`] = message;
    });
    value.schedule = schedule.value;
    if (schedule.errors.length) errors.schedule = schedule.errors[0];
  }

  return { errors, value };
}

// Valida las credenciales del usuario propietario que se creará junto al negocio.
function validateOwnerAccount(owner, { required: isRequired = true } = {}) {
  const errors = {};
  const value = {};
  const raw = owner || {};
  const isPresent =
    raw.username !== undefined ||
    raw.email !== undefined ||
    raw.password !== undefined;

  if (!isPresent) {
    if (isRequired) {
      errors.owner = "Debes asignar usuario, email y contraseña al nuevo negocio.";
    }
    return { errors, value };
  }

  const username = cleanString(raw.username);
  const fullName = cleanString(raw.fullName || raw.full_name || raw.name);
  const email = cleanString(raw.email).toLowerCase();
  const password = String(raw.password ?? "");

  if (!username) {
    errors.ownerUsername = "El usuario es obligatorio.";
  } else if (!USERNAME_REGEX.test(username)) {
    errors.ownerUsername =
      "El usuario debe tener entre 3 y 64 caracteres y solo admite letras, números, punto, guion bajo o guion.";
  } else {
    value.username = username;
  }

  if (!fullName || fullName.length > 180) {
    errors.ownerFullName = "El nombre completo debe tener entre 1 y 180 caracteres.";
  } else {
    value.fullName = fullName;
  }

  if (!email) {
    errors.ownerEmail = "El email de la cuenta es obligatorio.";
  } else if (!EMAIL_REGEX.test(email) || email.length > 255) {
    errors.ownerEmail = "El email de la cuenta no es válido.";
  } else {
    value.email = email;
  }

  if (!password) {
    errors.ownerPassword = "La contraseña es obligatoria.";
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.ownerPassword = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  } else if (password.length > 200) {
    errors.ownerPassword = "La contraseña no puede superar los 200 caracteres.";
  } else {
    value.password = password;
  }

  value.role = "BUSINESS_ADMIN";

  return { errors, value };
}

function defaultScheduleValue() {
  // Horario por defecto de la plataforma cuando el formulario no envía ninguno.
  return [1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => ({
    day_of_week: dayOfWeek,
    open_time: "12:00",
    close_time: "23:00",
    is_open: 1,
  }));
}

async function writeBusinessHours(tx, businessId, schedule) {
  const rows = schedule?.length ? schedule : defaultScheduleValue();

  await txQuery(
    tx,
    "DELETE FROM business_hours WHERE business_id = ?",
    [businessId],
  );

  for (const row of rows) {
    await txQuery(
      tx,
      `INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_open)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        cryptoRandomId(),
        businessId,
        row.day_of_week,
        row.open_time,
        row.close_time,
        row.is_open,
      ],
    );
  }

  return rows;
}

async function countRows(sql, params = []) {
  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(sql, params);
    return Number(rows[0]?.c ?? 0);
  }

  const db = getSqliteDb();
  const row = db.prepare(sql).get(...params);
  return Number(row?.c ?? 0);
}

// Lee el horario de todos los negocios. Si se pasa una transacción se consulta
// a través de ella: en MySQL la lectura tendría que ir por la MISMA conexión o
// no vería lo que aún no se ha confirmado.
async function readBusinessHours(tx) {
  if (tx) {
    return txQuery(tx, "SELECT * FROM business_hours ORDER BY day_of_week ASC");
  }

  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM business_hours ORDER BY day_of_week ASC",
    );
    return rows;
  }

  return getSqliteDb()
    .prepare("SELECT * FROM business_hours ORDER BY day_of_week ASC")
    .all();
}

function attachBusinessSchedules(rows, hours = []) {
  if (!rows.length) return rows;

  const byBusiness = new Map();
  for (const hour of hours) {
    const list = byBusiness.get(hour.business_id) || [];
    list.push(hour);
    byBusiness.set(hour.business_id, list);
  }

  // Los formularios del panel trabajan con lunes primero y domingo al final.
  const dayOrder = (day) => (Number(day) === 0 ? 7 : Number(day));

  return rows.map((row) => ({
    ...row,
    schedule: (byBusiness.get(row.id) || [])
      .slice()
      .sort(
        (a, b) => dayOrder(a.day_of_week) - dayOrder(b.day_of_week),
      ),
  }));
}

async function findOwnerAccount(owner) {
  const usernameSql = "SELECT * FROM app_users WHERE username = ? LIMIT 1";
  const emailSql = "SELECT * FROM app_users WHERE email = ? LIMIT 1";

  if (mysqlPool) {
    const [byUsername] = await mysqlPool.execute(usernameSql, [
      owner.username,
    ]);
    const [byEmail] = await mysqlPool.execute(emailSql, [owner.email]);
    return byUsername[0] || byEmail[0] || null;
  }

  const db = getSqliteDb();
  return (
    db.prepare(usernameSql).get(owner.username) ||
    db.prepare(emailSql).get(owner.email) ||
    null
  );
}

// Crea o actualiza la cuenta del propietario del negocio dentro de la transacción.
async function upsertOwnerAccount(tx, owner, businessId) {
  const existing = await findOwnerAccount(owner);
  const hash = bcrypt.hashSync(owner.password, 10);

  if (existing) {
    await txQuery(
      tx,
      `UPDATE app_users
          SET full_name = ?,
              business_id = ?,
              password_hash = ?,
              password_change_required = 0,
              password_changed_at = NULL
        WHERE id = ?`,
      [owner.fullName, businessId, hash, existing.id],
    );

    const rows = await txQuery(tx, "SELECT * FROM app_users WHERE id = ?", [
      existing.id,
    ]);
    const updated = Array.isArray(rows) ? rows[0] : null;
    return updated || { ...existing, business_id: businessId };
  }

  const id = cryptoRandomId();
  await txQuery(
    tx,
    `INSERT INTO app_users (id, username, full_name, email, password_hash, role, status, business_id, email_verified, password_change_required)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, 1, 0)`,
    [
      id,
      owner.username,
      owner.fullName,
      owner.email,
      hash,
      owner.role || "BUSINESS_ADMIN",
      businessId,
    ],
  );

  const rows = await txQuery(tx, "SELECT * FROM app_users WHERE id = ?", [id]);
  return Array.isArray(rows) ? rows[0] : null;
}

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", async (_req, res) => {
  // Consultar salud no debe cambiar de motor ni crear un pool nuevo.
  const pool = mysqlPool;
  if (pool) await pool.query("SELECT 1 AS ok");
  res.json({
    status: "ok",
    mode: pool ? "mysql" : "sqlite",
    database: pool ? mysqlConfig.database : DB_PATH,
    timestamp: new Date().toISOString(),
    superadmin: {
      username: process.env.SUPERADMIN_USERNAME || "RafaAdmin",
      configured: true,
    },
  });
});

app.get("/api/debug/database", requireSuperAdmin, async (_req, res) => {
  const pool = mysqlPool;
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
    phone,
    address,
    avatarUrl,
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
  if (!address || !String(address).trim()) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "La dirección es obligatoria para crear la cuenta.",
      errors: { address: "La dirección es obligatoria." },
    });
  }

  const errors = {};
  if (!EMAIL_REGEX.test(cleanString(email))) errors.email = "El correo electrónico no es válido.";
  const localityId = cleanString(req.body.localityId ?? req.body.locality_id);
  if (!localityId || !(await countRows("SELECT COUNT(*) AS c FROM localities WHERE id = ?", [localityId]))) {
    errors.localityId = "Selecciona una localidad válida.";
  }
  assertValid(errors);

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
    phone,
    address,
    avatarUrl,
    role: "CLIENT",
  });
  if (avatarUrl && String(avatarUrl).startsWith("data:")) {
    newUser.avatar_url = await persistUserAvatar(newUser.id, avatarUrl, newUser.id);
  }

  // Mensaje de bienvenida con la plantilla de marca. Sin bloquear la
  // respuesta: si el SMTP falla, el alta del usuario sigue correcta.
  void sendWelcomeEmail({ email: newUser.email, fullName: newUser.full_name, role: newUser.role })
    .catch(() => {});

  res.status(201).json({
    success: true,
    user: sanitizeUser(newUser),
    token: createSessionToken(newUser),
    requiresEmailVerification: false,
    emailVerificationSent: false,
    message: "Usuario creado correctamente. Ya puedes iniciar sesión.",
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
    const user = await loadUserForSession("superadmin-rafaadmin");
    return res.json({
      success: true,
      user: sanitizeUser(user),
      token: createSessionToken(user),
    });
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

  res.json({
    success: true,
    user: sanitizeUser(user),
    token: createSessionToken(user),
  });
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

// El superadmin envía a la cuenta elegida (p. ej. el dueño de un negocio) un
// enlace de uso único para fijar una nueva contraseña sin conocer la actual.
app.post("/api/users/:id/request-password-reset", requireSuperAdmin, async (req, res) => {
  const targetUser = await loadUserForSession(req.params.id);

  if (!targetUser) {
    throw httpError(404, "USER_NOT_FOUND", "El usuario indicado no existe.");
  }
  if (String(targetUser.id) === "superadmin-rafaadmin") {
    throw httpError(
      409,
      "RESET_UNAVAILABLE",
      "La cuenta de emergencia no tiene fila en la base de datos: usa cambiar la clave en el desplegable de superadministración.",
    );
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + passwordResetTtlMs).toISOString();
  await setPasswordResetToken(targetUser.id, tokenHash, expiresAt);

  const appUrl = String(process.env.APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  const resetUrl = `${appUrl}/#restablecer-clave?token=${token}`;
  const minutes = Math.round(passwordResetTtlMs / 60000);
  const emailDelivery = await sendPasswordResetEmail({
    email: targetUser.email,
    fullName: targetUser.full_name || targetUser.username || "usuario",
    resetUrl,
    minutes,
  });

  res.json({
    success: true,
    sent: emailDelivery.sent,
    message: emailDelivery.sent
      ? `Enlace enviado al correo de ${targetUser.username || targetUser.email}.`
      : emailDelivery.message,
    resetUrl: emailDelivery.sent ? undefined : resetUrl,
    expiresAt,
  });
});

// Consumo del enlace: público porque el token aleatorio es la prueba de
// identidad. El hash se borra al usarse, así que el enlace es de un solo uso.
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body || {};
  const cleanToken = String(token || "").trim();
  const cleanNewPassword = normalizePassword(newPassword);

  if (!cleanToken || !cleanNewPassword) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Token y nueva contraseña son obligatorios.",
    });
  }
  if (cleanNewPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    });
  }

  const user = await getUserByPasswordResetToken(sha256Hex(cleanToken));
  const expiresAtRaw =
    user?.password_reset_expires_at || user?.passwordResetExpiresAt;

  if (!user || !expiresAtRaw || Date.now() > new Date(expiresAtRaw).getTime()) {
    // Un token usado ya no tiene hash guardado y un caducado sí: ambos casos
    // devuelven el mismo error sin revelar detalles del estado de la fila.
    throw httpError(
      400,
      "INVALID_RESET_TOKEN",
      "El enlace no es válido o ha caducado. Pide otro enlace al superadministrador.",
    );
  }

  const newHash = bcrypt.hashSync(cleanNewPassword, 10);
  const changedAt = new Date().toISOString();

  if (mysqlPool) {
    await mysqlPool.execute(
      `UPDATE app_users
          SET password_hash = ?,
              password_change_required = 0,
              password_changed_at = ?,
              password_reset_hash = NULL,
              password_reset_expires_at = NULL
        WHERE id = ?`,
      [newHash, changedAt, user.id],
    );
  } else {
    const db = getSqliteDb();
    db.prepare(
      `UPDATE app_users
          SET password_hash = ?,
              password_change_required = 0,
              password_changed_at = ?,
              password_reset_hash = NULL,
              password_reset_expires_at = NULL
        WHERE id = ?`,
    ).run(newHash, changedAt, user.id);
  }

  res.json({
    success: true,
    message: "Contraseña restablecida. Ya puedes iniciar sesión con la nueva.",
  });
});

app.get("/api/auth/me", async (req, res) => {
  // Sólo responde a quien presenta un token de sesión válido: antes se fiaba de
  // la cabecera x-user-id, con la que cualquiera podía suplantar a otro usuario.
  const user = await readRequestUser(req);

  if (!user) {
    return res
      .status(401)
      .json({ code: "UNAUTHORIZED", message: "No hay sesión activa" });
  }

  res.json({ user: sanitizeUser(user) });
});

app.post("/api/media", requireAuth, async (req, res) => {
  const body = req.body || {};
  const entityType = body.entityType ?? body.entity_type;
  const entityId = body.entityId ?? body.entity_id;
  const fieldName = body.fieldName ?? body.field_name ?? "media";
  const value = body.dataUrl ?? body.value ?? body.url;
  await assertMediaMutationAccess(req.user, entityType, entityId);
  const asset = await saveSupabaseMediaAsset({
    entityType,
    entityId,
    fieldName,
    value,
    originalName: body.originalName ?? body.original_name,
    createdBy: req.user.id,
  });
  if (!asset || typeof asset === "string") {
    throw validationError("El medio debe ser un data URL base64 para subirlo a Supabase.", {
      dataUrl: "El archivo multimedia es obligatorio.",
    });
  }
  res.status(201).json({ success: true, asset });
});

app.get("/api/media", async (req, res) => {
  const entityType = req.query.entityType ?? req.query.entity_type;
  const entityId = req.query.entityId ?? req.query.entity_id;
  if (!entityType || !entityId) {
    throw validationError("Indica la entidad multimedia que quieres consultar.", {
      entityType: "El tipo de entidad es obligatorio.",
      entityId: "El ID de entidad es obligatorio.",
    });
  }
  const assets = await listSupabaseMediaAssets(entityType, entityId);
  res.json(assets);
});

app.delete("/api/media/:id", requireAuth, async (req, res) => {
  const supabase = getSupabaseMediaClient();
  if (!supabase) throw httpError(503, "MEDIA_STORAGE_UNAVAILABLE", "El almacenamiento multimedia de Supabase no está configurado.");
  const found = await supabase.from("media_assets").select("id, entity_type, entity_id").eq("id", req.params.id).maybeSingle();
  if (found.error) throw httpError(502, "MEDIA_RELATION_FAILED", found.error.message || "No se pudo consultar el medio.");
  if (!found.data) throw httpError(404, "NOT_FOUND", "El medio no existe.");
  await assertMediaMutationAccess(req.user, found.data.entity_type, found.data.entity_id);
  await deleteSupabaseMediaAsset(req.params.id);
  res.json({ success: true });
});

app.get("/api/localities", async (_req, res) => {
  const rows = await listLocalities();
  res.json(rows);
});

app.post("/api/localities", requireRole("SUPERADMIN", "BUSINESS_ADMIN"), async (req, res) => {
  const body = req.body || {};
  if (!cleanString(body.name)) throw validationError("El nombre de la localidad es obligatorio.", { name: "Escribe el nombre de la localidad." });
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

app.put("/api/localities/:id", requireRole("SUPERADMIN", "BUSINESS_ADMIN"), async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  if (!(await countRows("SELECT COUNT(*) AS c FROM localities WHERE id = ?", [id]))) throw httpError(404, "NOT_FOUND", "La localidad no existe.");
  if (body.name !== undefined && !cleanString(body.name)) throw validationError("El nombre de la localidad es obligatorio.", { name: "Escribe el nombre de la localidad." });
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

app.delete("/api/localities/:id", requireRole("SUPERADMIN", "BUSINESS_ADMIN"), async (req, res) => {
  const { id } = req.params;
  if (mysqlPool) {
    await mysqlPool.execute("DELETE FROM localities WHERE id = ?", [id]);
    return res.json({ success: true });
  }

  const db = getSqliteDb();
  db.prepare("DELETE FROM localities WHERE id = ?").run(id);
  res.json({ success: true });
});

const ALLOWED_USER_ROLES = [
  "CLIENT",
  "BUSINESS_ADMIN",
  "PLATFORM_COURIER",
  "BUSINESS_COURIER",
  "SUPERADMIN",
];

app.get("/api/users", requireAuth, async (req, res) => {
  const sessionRole = String(req.user.role || "").toUpperCase();
  if (sessionRole !== "SUPERADMIN" && sessionRole !== "BUSINESS_ADMIN") {
    throw httpError(
      403,
      "FORBIDDEN",
      "Tu usuario no tiene permisos para consultar cuentas.",
    );
  }

  const rows = await listUsers();

  if (sessionRole === "SUPERADMIN") {
    return res.json(rows.map((row) => sanitizeUser(row)));
  }

  // El dueño del negocio ve a todo repartidor que tenga su negocio asignado
  // (la lista multinegocio o, en datos antiguos, el business_id de referencia).
  const ownBusinessId = String(req.user.business_id || "");
  const visibleRows = ownBusinessId
    ? rows.filter(
        (row) =>
          String(row.role || "").toUpperCase() === "BUSINESS_COURIER" &&
          parseCourierBusinessIds(row).includes(ownBusinessId),
      )
    : [];

  const visibleUsers = visibleRows.map((row) => sanitizeUser(row));
  // El IBAN del repartidor es un dato de cobro que sólo gestiona el
  // superadmin: el dueño del negocio puede confirmarlo, pero no ver su cuenta.
  for (const user of visibleUsers) {
    if (user) user.accountNumber = "";
  }
  res.json(visibleUsers);
});

app.post("/api/users", requireAuth, async (req, res) => {
  const body = req.body || {};
  const errors = {};
  const sessionUser = req.user;
  const sessionRole = String(sessionUser.role || "").toUpperCase();
  const isSuperAdmin = sessionRole === "SUPERADMIN";
  const isBusinessAdmin = sessionRole === "BUSINESS_ADMIN";

  if (!isSuperAdmin && !isBusinessAdmin) {
    throw httpError(
      403,
      "FORBIDDEN",
      "Tu usuario no tiene permisos para crear cuentas.",
    );
  }

  const email = cleanString(body.email).toLowerCase();
  const username =
    cleanString(body.username) || (email ? email.split("@")[0] : "");
  const fullName = cleanString(
    body.fullName || body.full_name || body.name,
  );
  const password = normalizePassword(body.password);
  const requestedRole = cleanString(body.role || "").toUpperCase();
  let role = requestedRole || "CLIENT";
  let businessId = cleanString(body.businessId || body.business_id) || null;
  let courierConfirmation = cleanString(
    body.courierConfirmation || body.courier_confirmation || "PENDING",
  ).toUpperCase();
  const accountNumber = cleanString(
    body.accountNumber || body.account_number,
  )
    .replace(/\s+/g, "")
    .toUpperCase();
  const phone = cleanString(body.phone);
  const address = cleanString(body.address);
  const dni = cleanString(
    body.dni ?? body.documentNumber ?? body.document_number,
  )
    .replace(/\s+/g, "")
    .toUpperCase();
  const requestedBusinessIds =
    body.courierBusinessIds ?? body.courier_business_ids;
  let courierBusinessIds = Array.isArray(requestedBusinessIds)
    ? [
        ...new Set(
          requestedBusinessIds
            .map((id) => String(id ?? "").trim())
            .filter(Boolean),
        ),
      ]
    : [];

  if (isBusinessAdmin) {
    // El dueño sólo puede crear repartidores para su propio negocio y no
    // puede aprobarlos como SUPERADMIN: la confirmación queda pendiente y la
    // firma él mismo después (BUSINESS_EMAIL).
    if (requestedRole && requestedRole !== "BUSINESS_COURIER") {
      errors.role = "Sólo puedes crear repartidores para tu negocio.";
    }
    role = "BUSINESS_COURIER";
    businessId =
      cleanString(sessionUser.business_id || sessionUser.businessId) || null;
    courierConfirmation = "PENDING";
    courierBusinessIds = businessId ? [businessId] : [];

    if (accountNumber) {
      errors.accountNumber =
        "Sólo el superadmin puede configurar la cuenta bancaria del repartidor.";
    }

    if (!businessId) {
      throw httpError(
        403,
        "FORBIDDEN",
        "Tu cuenta no tiene un negocio asignado para crear repartidores.",
      );
    }
  } else {
    if (role === "BUSINESS_COURIER") {
      // Compatibilidad con el formulario anterior, que sólo mandaba businessId.
      if (!courierBusinessIds.length && businessId) {
        courierBusinessIds = [businessId];
      }
      if (courierBusinessIds.length) {
        businessId = courierBusinessIds[0];
      }
    } else if (role === "PLATFORM_COURIER") {
      // El repartidor de plataforma cubre todo el valle: business_id se deja
      // vacío y la lista queda como información de zonas asignadas.
      businessId = null;
    } else {
      courierBusinessIds = [];
    }
  }

  if (!["PENDING", "BUSINESS_EMAIL", "SUPERADMIN"].includes(courierConfirmation)) {
    errors.courierConfirmation =
      "La confirmación del repartidor no es válida.";
  }
  if (!fullName || fullName.length > 180) {
    errors.fullName = "El nombre completo debe tener entre 1 y 180 caracteres.";
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    errors.email = "El email no es válido.";
  }
  if (!username || !USERNAME_REGEX.test(username)) {
    errors.username =
      "El usuario debe tener entre 3 y 64 caracteres y solo admite letras, números, punto, guion bajo o guion.";
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (!ALLOWED_USER_ROLES.includes(role)) {
    errors.role = `El rol debe ser uno de: ${ALLOWED_USER_ROLES.join(", ")}.`;
  }
  if (role === "BUSINESS_COURIER" && courierBusinessIds.length === 0) {
    errors.courierBusinessIds =
      "Selecciona al menos un negocio para el repartidor.";
  }
  if (
    (role === "PLATFORM_COURIER" || role === "BUSINESS_COURIER") &&
    courierBusinessIds.length
  ) {
    const missingBusinessIds = [];
    for (const candidateId of courierBusinessIds) {
      const found = await countRows(
        "SELECT COUNT(*) AS c FROM businesses WHERE id = ?",
        [candidateId],
      );
      if (found === 0) missingBusinessIds.push(candidateId);
    }
    if (missingBusinessIds.length) {
      errors.courierBusinessIds =
        "Alguno de los negocios seleccionados no existe.";
    }
  }
  if (accountNumber && !IBAN_REGEX.test(accountNumber)) {
    errors.accountNumber = "El número de cuenta (IBAN) no es válido.";
  }
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (
      !/^\+?[\d\s.()-]+$/.test(phone) ||
      digits.length < 7 ||
      digits.length > 15
    ) {
      errors.phone =
        "El teléfono debe contener entre 7 y 15 dígitos (ej. +34 600 000 000).";
    }
  }
  if (address && (address.length < 5 || address.length > 500)) {
    errors.address = "La dirección debe tener entre 5 y 500 caracteres.";
  }
  if (dni && !DNI_REGEX.test(dni)) {
    errors.dni = "El DNI/NIE no es válido.";
  }

  assertValid(errors);

  const user = await createUser({
    username,
    fullName,
    email,
    password,
    phone: phone || null,
    address: address || null,
    dni: dni || null,
    avatarUrl: cleanString(body.avatarUrl || body.avatar_url) || null,
    role,
    businessId,
    courierConfirmation:
      role === "PLATFORM_COURIER" || role === "BUSINESS_COURIER"
        ? courierConfirmation
        : "PENDING",
    courierBusinessIds:
      role === "PLATFORM_COURIER" || role === "BUSINESS_COURIER"
        ? courierBusinessIds
        : [],
    accountNumber:
      role === "PLATFORM_COURIER" || role === "BUSINESS_COURIER"
        ? accountNumber || null
        : null,
  });
  const avatarUrl = cleanString(body.avatarUrl || body.avatar_url);
  if (avatarUrl.startsWith("data:")) {
    user.avatar_url = await persistUserAvatar(user.id, avatarUrl, sessionUser.id);
  }

  // Bienvenida con la plantilla de marca, sin bloquear la respuesta.
  if (user.email) {
    void sendWelcomeEmail({ email: user.email, fullName: user.full_name, role: user.role })
      .catch(() => {});
  }

  res.status(201).json({ success: true, user: sanitizeUser(user) });
});

app.put("/api/users/:id", requireAuth, async (req, res) => {
  const requestedId = req.params.id;
  const body = req.body || {};
  const sessionUser = req.user;
  const sessionRole = String(sessionUser.role || "").toUpperCase();
  const isSuperAdmin = sessionRole === "SUPERADMIN";
  const isBusinessAdmin = sessionRole === "BUSINESS_ADMIN";
  const targetUser = await loadUserForSession(requestedId);

  if (!targetUser) {
    throw httpError(404, "USER_NOT_FOUND", "El usuario indicado no existe.");
  }

  const id = targetUser.id;
  if (String(id) === "superadmin-rafaadmin") {
    throw httpError(503, "PROFILE_UNAVAILABLE", "La cuenta de emergencia no tiene un perfil guardado en la base de datos. No se han guardado cambios.");
  }
  const isSelf = String(sessionUser.id) === String(id);

  const targetRole = String(targetUser.role || "").toUpperCase();
  const sessionBusinessId = String(
    sessionUser.business_id || sessionUser.businessId || "",
  );
  const targetBusinessId = String(
    targetUser.business_id || targetUser.businessId || "",
  );
  // El dueño del negocio es "propietario" del repartidor si su negocio está
  // entre los asignados (o si es el business_id de referencia en datos
  // antiguos, que parseCourierBusinessIds devuelve como respaldo).
  const isBusinessCourierOwner =
    isBusinessAdmin &&
    !isSelf &&
    targetRole === "BUSINESS_COURIER" &&
    Boolean(sessionBusinessId) &&
    (targetBusinessId === sessionBusinessId ||
      parseCourierBusinessIds(targetUser).includes(sessionBusinessId));

  // Sólo el propio usuario, el superadmin o el dueño del negocio al que
  // pertenece el repartidor pueden editar una cuenta.
  if (!isSelf && !isSuperAdmin && !isBusinessCourierOwner) {
    throw httpError(
      403,
      "FORBIDDEN",
      "No tienes permisos para modificar este usuario.",
    );
  }

  // El dueño de un negocio sólo puede tocar la confirmación de sus
  // repartidores, no el resto de campos de la cuenta.
  if (isBusinessCourierOwner && !isSuperAdmin) {
    const allowedFields = new Set([
      "courierConfirmation",
      "courier_confirmation",
    ]);
    const unexpectedFields = Object.keys(body).filter(
      (key) => !allowedFields.has(key),
    );
    if (unexpectedFields.length) {
      throw httpError(
        403,
        "FORBIDDEN",
        "Sólo puedes confirmar a los repartidores de tu negocio.",
      );
    }
  }

  const updates = [];
  const values = [];
  const errors = {};

  if (body.isOnline !== undefined) {
    if (!isSelf || !["BUSINESS_COURIER", "PLATFORM_COURIER"].includes(targetRole)) {
      throw httpError(403, "FORBIDDEN", "Sólo el propio repartidor puede cambiar su disponibilidad.");
    }
    if (typeof body.isOnline !== "boolean") {
      throw validationError("La disponibilidad debe ser verdadera o falsa.", { isOnline: "Valor no válido." });
    }
    updates.push("is_online = ?");
    values.push(Number(body.isOnline));
  }

  if (body.username !== undefined) {
    const username = cleanString(body.username);
    if (!USERNAME_REGEX.test(username)) {
      errors.username =
        "El usuario debe tener entre 3 y 64 caracteres y solo admite letras, números, punto, guion bajo o guion.";
    } else {
      updates.push("username = ?");
      values.push(username);
    }
  }
  if (
    body.fullName !== undefined ||
    body.full_name !== undefined ||
    body.name !== undefined
  ) {
    const fullName = cleanString(body.fullName ?? body.full_name ?? body.name);
    if (!fullName || fullName.length > 180) {
      errors.fullName = "El nombre completo debe tener entre 1 y 180 caracteres.";
    } else {
      updates.push("full_name = ?");
      values.push(fullName);
    }
  }
  if (body.email !== undefined) {
    const email = cleanString(body.email).toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      errors.email = "El email no es válido.";
    } else {
      updates.push("email = ?");
      values.push(email);
    }
  }
  if (body.password !== undefined) {
    const cleanPassword = normalizePassword(body.password);
    if (!cleanPassword || cleanPassword.length < MIN_PASSWORD_LENGTH) {
      errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    } else {
      // Cambio de contraseña desde el perfil: se limpia la marca de cambio
      // pendiente para que el usuario pueda entrar con la nueva clave.
      updates.push("password_hash = ?");
      values.push(bcrypt.hashSync(cleanPassword, 10));
      updates.push("password_change_required = ?");
      values.push(0);
      updates.push("password_changed_at = ?");
      values.push(new Date().toISOString());
    }
  }
  if (body.role !== undefined) {
    const role = cleanString(body.role).toUpperCase();
    if (!isSuperAdmin) {
      errors.role = "Sólo el superadmin puede cambiar roles de usuario.";
    } else if (!ALLOWED_USER_ROLES.includes(role)) {
      errors.role = `El rol debe ser uno de: ${ALLOWED_USER_ROLES.join(", ")}.`;
    } else {
      updates.push("role = ?");
      values.push(role);
    }
  }
  // Rol que tendrá la cuenta al terminar la petición. Se usa para validar la
  // cuenta bancaria y los negocios asignados cuando el superadmin cambia el
  // rol en la misma edición.
  const requestedRole =
    body.role !== undefined && isSuperAdmin
      ? cleanString(body.role).toUpperCase()
      : targetRole;
  const effectiveRole = ALLOWED_USER_ROLES.includes(requestedRole)
    ? requestedRole
    : targetRole;
  const isCourierRole =
    effectiveRole === "PLATFORM_COURIER" ||
    effectiveRole === "BUSINESS_COURIER";
  if (body.status !== undefined) {
    const status = cleanString(body.status).toUpperCase();
    if (!isSuperAdmin) {
      errors.status = "Sólo el superadmin puede cambiar el estado de usuario.";
    } else if (!["ACTIVE", "SUSPENDED", "INACTIVE"].includes(status)) {
      errors.status = "El estado no es válido.";
    } else {
      updates.push("status = ?");
      values.push(status);
    }
  }
  if (body.phone !== undefined) {
    const phone = cleanString(body.phone);
    const digits = phone.replace(/\D/g, "");
    if (
      phone &&
      (!/^\+?[\d\s.()-]+$/.test(phone) ||
        digits.length < 7 ||
        digits.length > 15)
    ) {
      errors.phone = "El teléfono debe contener entre 7 y 15 dígitos.";
    } else {
      updates.push("phone = ?");
      values.push(phone || null);
    }
  }
  if (body.address !== undefined) {
    const address = cleanString(body.address);
    if (address && (address.length < 5 || address.length > 500)) {
      errors.address = "La dirección debe tener entre 5 y 500 caracteres.";
    } else {
      updates.push("address = ?");
      values.push(address || null);
    }
  }
  if (
    body.dni !== undefined ||
    body.documentNumber !== undefined ||
    body.document_number !== undefined
  ) {
    const dni = cleanString(
      body.dni ?? body.documentNumber ?? body.document_number,
    )
      .replace(/\s+/g, "")
      .toUpperCase();
    if (dni && !DNI_REGEX.test(dni)) {
      errors.dni = "El DNI/NIE no es válido.";
    } else {
      updates.push("dni = ?");
      values.push(dni || null);
    }
  }
  let avatarToUpload;
  if (body.avatarUrl !== undefined || body.avatar_url !== undefined) {
    const avatarUrl = cleanString(body.avatarUrl ?? body.avatar_url) || null;
    if (avatarUrl && !isValidImageUrl(avatarUrl)) {
      errors.avatarUrl = "La imagen debe ser una URL http(s) o un archivo cargado.";
    } else if (avatarUrl && avatarUrl.startsWith("data:")) {
      avatarToUpload = avatarUrl;
    } else {
      updates.push("avatar_url = ?");
      values.push(avatarUrl);
    }
  }
  if (body.accountNumber !== undefined || body.account_number !== undefined) {
    const accountNumber = cleanString(
      body.accountNumber ?? body.account_number,
    )
      .replace(/\s+/g, "")
      .toUpperCase();
    if (isCourierRole && !isSuperAdmin) {
      // El IBAN del repartidor es dato de cobro: sólo lo gestiona el superadmin.
      errors.accountNumber =
        "Sólo el superadmin puede modificar la cuenta bancaria de un repartidor.";
    } else if (accountNumber && !IBAN_REGEX.test(accountNumber)) {
      errors.accountNumber = "El número de cuenta (IBAN) no es válido.";
    } else {
      updates.push("account_number = ?");
      values.push(accountNumber || null);
    }
  }
  if (
    body.courierBusinessIds !== undefined ||
    body.courier_business_ids !== undefined
  ) {
    if (!isSuperAdmin) {
      errors.courierBusinessIds =
        "Sólo el superadmin puede cambiar los negocios asignados a un repartidor.";
    } else if (!isCourierRole) {
      errors.courierBusinessIds =
        "Sólo los repartidores pueden tener negocios asignados.";
    } else {
      const rawBusinessIds =
        body.courierBusinessIds ?? body.courier_business_ids;
      if (!Array.isArray(rawBusinessIds)) {
        errors.courierBusinessIds = "La lista de negocios no es válida.";
      } else {
        const courierBusinessIds = [
          ...new Set(
            rawBusinessIds
              .map((value) => String(value ?? "").trim())
              .filter(Boolean),
          ),
        ];
        const missingBusinessIds = [];
        for (const candidateId of courierBusinessIds) {
          const found = await countRows(
            "SELECT COUNT(*) AS c FROM businesses WHERE id = ?",
            [candidateId],
          );
          if (found === 0) missingBusinessIds.push(candidateId);
        }

        if (missingBusinessIds.length) {
          errors.courierBusinessIds =
            "Alguno de los negocios seleccionados no existe.";
        } else if (
          effectiveRole === "BUSINESS_COURIER" &&
          courierBusinessIds.length === 0
        ) {
          errors.courierBusinessIds =
            "Un repartidor de negocio necesita al menos un negocio asignado.";
        } else {
          updates.push("courier_business_ids = ?");
          values.push(JSON.stringify(courierBusinessIds));
          // `business_id` se mantiene como negocio de referencia para los
          // repartidores de negocio y vacío para los de plataforma.
          updates.push("business_id = ?");
          values.push(
            effectiveRole === "BUSINESS_COURIER"
              ? courierBusinessIds[0]
              : null,
          );
        }
      }
    }
  }
  if (
    isSuperAdmin &&
    body.role !== undefined &&
    effectiveRole === "BUSINESS_COURIER" &&
    body.courierBusinessIds === undefined &&
    body.courier_business_ids === undefined &&
    parseCourierBusinessIds(targetUser).length === 0
  ) {
    errors.courierBusinessIds =
      "Selecciona al menos un negocio para el repartidor.";
  }
  if (
    body.courierConfirmation !== undefined ||
    body.courier_confirmation !== undefined
  ) {
    const confirmation = cleanString(
      body.courierConfirmation ?? body.courier_confirmation,
    ).toUpperCase();

    if (!["PENDING", "BUSINESS_EMAIL", "SUPERADMIN"].includes(confirmation)) {
      errors.courierConfirmation =
        "La confirmación del repartidor no es válida.";
    } else if (
      targetRole !== "PLATFORM_COURIER" &&
      targetRole !== "BUSINESS_COURIER"
    ) {
      errors.courierConfirmation =
        "Sólo se puede confirmar una cuenta de repartidor.";
    } else if (!isSuperAdmin && !isBusinessCourierOwner) {
      errors.courierConfirmation =
        "No tienes permisos para confirmar esta cuenta.";
    } else if (!isSuperAdmin && confirmation !== "BUSINESS_EMAIL") {
      errors.courierConfirmation =
        "El negocio sólo puede confirmar repartidores con BUSINESS_EMAIL.";
    } else {
      updates.push("courier_confirmation = ?");
      values.push(confirmation);
    }
  }

  assertValid(errors);

  if (avatarToUpload) {
    const storedAvatarUrl = await normalizeStoredMediaValue({
      entityType: "USER", entityId: id, fieldName: "avatar_url",
      value: avatarToUpload, createdBy: sessionUser.id,
    });
    updates.push("avatar_url = ?");
    values.push(storedAvatarUrl);
  }

  if (!updates.length) {
    return res
      .status(400)
      .json({ success: false, message: "No hay campos para actualizar" });
  }

  values.push(id);
  // El dueño del negocio no debe recibir el IBAN del repartidor ni siquiera
  // en la respuesta de la confirmación.
  const buildResponseUser = (row) => {
    if (!row) {
      throw httpError(404, "USER_NOT_FOUND", "No se encontró el usuario al comprobar los cambios guardados.");
    }
    const user = sanitizeUser(row);
    if (user && isBusinessAdmin && !isSelf) user.accountNumber = "";
    return user;
  };
  if (mysqlPool) {
    await mysqlPool.execute(
      `UPDATE app_users SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM app_users WHERE id = ? LIMIT 1",
      [id],
    );
    return res.json({ success: true, user: buildResponseUser(rows[0]) });
  }

  const db = getSqliteDb();
  db.prepare(`UPDATE app_users SET ${updates.join(", ")} WHERE id = ?`).run(
    ...values,
  );
  const row = db
    .prepare("SELECT * FROM app_users WHERE id = ? LIMIT 1")
    .get(id);
  res.json({ success: true, user: buildResponseUser(row) });
});

app.delete("/api/users/:id", requireRole("SUPERADMIN"), async (req, res) => {
  const { id } = req.params;

  if (String(req.user.id) === String(id)) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "No puedes eliminar la cuenta con la que has iniciado sesión.",
    });
  }

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

// El alta de negocios es una operación de plataforma: sólo el superadmin puede
// registrarlos y, en la misma transacción, se crea la cuenta (usuario y clave)
// del propietario, que después podrá cambiarla desde su perfil.
app.post("/api/businesses", requireRole("SUPERADMIN"), async (req, res) => {
  const body = req.body || {};

  const businessValidation = validateBusiness(body, { partial: false });
  assertValid(businessValidation.errors);

  const ownerValidation = validateOwnerAccount(body.owner, {
    required: true,
  });
  assertValid(ownerValidation.errors);

  const value = businessValidation.value;
  const owner = ownerValidation.value;

  const localityExists = await countRows(
    "SELECT COUNT(*) AS c FROM localities WHERE id = ?",
    [value.locality_id],
  );
  if (!localityExists) {
    throw validationError("La zona seleccionada no existe.", {
      locality_id: "Selecciona una zona válida antes de guardar.",
    });
  }

  const duplicatedOwner = await findOwnerAccount(owner);
  if (duplicatedOwner) {
    const errors = {};
    if (String(duplicatedOwner.username) === owner.username) {
      errors.ownerUsername = "Ya existe un usuario con ese nombre.";
    }
    if (String(duplicatedOwner.email) === owner.email) {
      errors.ownerEmail = "Ya existe una cuenta de acceso con ese correo.";
    }
    throw validationError(
      "Ya existe una cuenta con esos datos de acceso.",
      errors,
    );
  }

  const businessId = cryptoRandomId();
  value.banner_url = await normalizeStoredMediaValue({
    entityType: "BUSINESS",
    entityId: businessId,
    fieldName: "banner_url",
    value: value.banner_url,
    createdBy: req.user.id,
  });
  value.logo_url = await normalizeStoredMediaValue({
    entityType: "BUSINESS",
    entityId: businessId,
    fieldName: "logo_url",
    value: value.logo_url,
    createdBy: req.user.id,
  });

  const { business, ownerAccount } = await withTransaction(async (tx) => {
    await txQuery(
      tx,
      `INSERT INTO businesses (
         id, locality_id, name, legal_name, cif, phone, email, account_number,
         address, latitude, longitude, rating, review_count,
         estimated_time_min, estimated_time_max, delivery_fee_cents,
         min_order_cents, banner_url, logo_url, is_shift_open, delivery_modes,
         delivery_radius_km, status, category, manager_name, manager_dni,
         owner_user_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        businessId,
        value.locality_id,
        value.name,
        value.legal_name || value.name,
        value.cif,
        value.phone,
        value.email,
        value.account_number ?? null,
        value.address,
        value.latitude,
        value.longitude,
        value.rating,
        value.review_count,
        value.estimated_time_min,
        value.estimated_time_max,
        value.delivery_fee_cents,
        value.min_order_cents,
        value.banner_url ?? "",
        value.logo_url ?? "",
        value.is_shift_open,
        JSON.stringify(value.delivery_modes),
        value.delivery_radius_km,
        value.status,
        value.category,
        value.manager_name ?? null,
        value.manager_dni ?? null,
      ],
    );

    // Nada de lo que llega del formulario se pierde: el horario guarda su
    // propia tabla con una fila por día.
    await writeBusinessHours(tx, businessId, value.schedule);

    const ownerAccount = await upsertOwnerAccount(tx, owner, businessId);

    await txQuery(tx, "UPDATE businesses SET owner_user_id = ? WHERE id = ?", [
      ownerAccount?.id ?? null,
      businessId,
    ]);

    const rows = await attachBusinessSchedules(
      await txQuery(tx, "SELECT * FROM businesses WHERE id = ?", [businessId]),
      await readBusinessHours(tx),
    );

    return { business: rows[0], ownerAccount };
  });

  res.status(201).json({
    success: true,
    business,
    owner: {
      id: ownerAccount?.id ?? null,
      username: owner.username,
      fullName: owner.fullName,
      email: owner.email,
      role: "BUSINESS_ADMIN",
      businessId,
      // La contraseña NUNCA se devuelve: la escribió el superadmin en el
      // formulario y en la base de datos sólo vive su hash bcrypt.
    },
  });
});

app.put("/api/businesses/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const sessionUser = req.user;
  const isSuperAdmin =
    String(sessionUser.role || "").toUpperCase() === "SUPERADMIN";
  const isBusinessOwner = String(sessionUser.business_id || "") === String(id);

  // El superadmin puede editar cualquier negocio; el propietario sólo el suyo.
  if (!isSuperAdmin && !isBusinessOwner) {
    throw httpError(
      403,
      "FORBIDDEN",
      "No tienes permisos para modificar este negocio.",
    );
  }

  const validation = validateBusiness(body, { partial: true });
  assertValid(validation.errors);

  const value = { ...validation.value };
  const schedule = value.schedule;
  delete value.schedule;
  if (value.banner_url !== undefined) {
    value.banner_url = await normalizeStoredMediaValue({
      entityType: "BUSINESS",
      entityId: id,
      fieldName: "banner_url",
      value: value.banner_url,
      createdBy: req.user.id,
    });
  }
  if (value.logo_url !== undefined) {
    value.logo_url = await normalizeStoredMediaValue({
      entityType: "BUSINESS",
      entityId: id,
      fieldName: "logo_url",
      value: value.logo_url,
      createdBy: req.user.id,
    });
  }

  const updates = [];
  const values = [];

  const assign = (field, fieldValue) => {
    if (fieldValue === undefined) return;
    updates.push(`${field} = ?`);
    values.push(fieldValue);
  };

  assign("name", value.name);
  assign("legal_name", value.legal_name);
  assign("cif", value.cif);
  assign("phone", value.phone);
  assign("email", value.email);
  assign("account_number", value.account_number);
  assign("address", value.address);
  assign("locality_id", value.locality_id);
  assign("category", value.category);
  assign("manager_name", value.manager_name);
  assign("manager_dni", value.manager_dni);
  assign("banner_url", value.banner_url);
  assign("logo_url", value.logo_url);
  assign("latitude", value.latitude);
  assign("longitude", value.longitude);
  assign("rating", value.rating);
  assign("review_count", value.review_count);
  assign("estimated_time_min", value.estimated_time_min);
  assign("estimated_time_max", value.estimated_time_max);
  assign("delivery_fee_cents", value.delivery_fee_cents);
  assign("min_order_cents", value.min_order_cents);
  assign("delivery_radius_km", value.delivery_radius_km);
  assign("is_shift_open", value.is_shift_open);
  assign("status", value.status);

  if (value.delivery_modes !== undefined) {
    updates.push("delivery_modes = ?");
    values.push(JSON.stringify(value.delivery_modes));
  }

  if (!updates.length && !schedule && !body.owner) {
    return res
      .status(400)
      .json({ success: false, message: "No hay campos para actualizar" });
  }

  if (value.locality_id) {
    const localityExists = await countRows(
      "SELECT COUNT(*) AS c FROM localities WHERE id = ?",
      [value.locality_id],
    );
    if (!localityExists) {
      throw validationError("La zona seleccionada no existe.", {
        locality_id: "Selecciona una zona válida antes de guardar.",
      });
    }
  }

  const hasOwnerPayload =
    Boolean(body.owner) &&
    (body.owner.username !== undefined ||
      body.owner.email !== undefined ||
      body.owner.password !== undefined);

  let ownerValidation = null;
  if (hasOwnerPayload) {
    ownerValidation = validateOwnerAccount(body.owner, { required: true });
    assertValid(ownerValidation.errors);
  }

  const updatedBusiness = await withTransaction(async (tx) => {
    if (updates.length) {
      await txQuery(
        tx,
        `UPDATE businesses SET ${updates.join(", ")} WHERE id = ?`,
        [...values, id],
      );
    }

    // El horario se reemplaza entero para no dejar días sin actualizar.
    if (schedule) {
      await writeBusinessHours(tx, id, schedule);
    }

    if (ownerValidation) {
      await upsertOwnerAccount(tx, ownerValidation.value, id);
    }

    const rows = await attachBusinessSchedules(
      await txQuery(tx, "SELECT * FROM businesses WHERE id = ?", [id]),
      await readBusinessHours(tx),
    );

    return rows[0];
  });

  if (!updatedBusiness) {
    throw httpError(404, "NOT_FOUND", "El negocio no existe.");
  }

  res.json({ success: true, business: updatedBusiness });
});

// Se conserva el historial de ventas: si el negocio tiene pedidos no se borra,
// se responde 409 en vez de dejar que la foreign key provoque un 500.
app.delete("/api/businesses/:id", requireRole("SUPERADMIN"), async (req, res) => {
  const { id } = req.params;

  const businessExists = await countRows(
    "SELECT COUNT(*) AS c FROM businesses WHERE id = ?",
    [id],
  );
  if (!businessExists) {
    throw httpError(404, "NOT_FOUND", "El negocio no existe.");
  }

  const ordersCount = await countRows(
    "SELECT COUNT(*) AS c FROM orders WHERE business_id = ?",
    [id],
  );
  if (ordersCount > 0) {
    return res.status(409).json({
      success: false,
      code: "BUSINESS_HAS_ORDERS",
      message: `Este negocio tiene ${ordersCount} pedido(s) registrados. No se puede eliminar porque se perdería el historial de ventas.`,
    });
  }

  await withTransaction(async (tx) => {
    // El catálogo y el horario pertenecen al negocio: se eliminan con él.
    await txQuery(tx, "DELETE FROM products WHERE business_id = ?", [id]);
    await txQuery(tx, "DELETE FROM business_hours WHERE business_id = ?", [id]);
    await txQuery(
      tx,
      "UPDATE app_users SET business_id = NULL WHERE business_id = ?",
      [id],
    );
    await txQuery(tx, "DELETE FROM businesses WHERE id = ?", [id]);
  });

  res.json({ success: true });
});

app.get("/api/categories", async (_req, res) => {
  const rows = await listCategories();
  res.json(rows);
});

app.post("/api/categories", requireRole("SUPERADMIN"), async (req, res) => {
  const body = req.body || {};
  const validation = validateCategory(body);
  assertValid(validation.errors);

  const {
    name,
    slug,
    iconName,
    imageUrl,
    showIngredients,
    showRemovableIngredients,
    showAdditionalIngredients,
  } = validation.values;
  const duplicate = await countRows(
    "SELECT COUNT(*) AS c FROM categories WHERE slug = ?",
    [slug],
  );
  if (duplicate > 0) {
    throw httpError(
      409,
      "CATEGORY_EXISTS",
      "Ya existe una categoría con ese slug. Prueba con otro.",
    );
  }

  const id = cryptoRandomId();
  const storedImageUrl = await normalizeStoredMediaValue({
    entityType: "CATEGORY",
    entityId: id,
    fieldName: "image_url",
    value: imageUrl,
    createdBy: req.user.id,
  });
  if (mysqlPool) {
    await mysqlPool.execute(
      `INSERT INTO categories
        (id, name, slug, icon_name, image_url, show_ingredients,
         show_removable_ingredients, show_additional_ingredients)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        slug,
        iconName || null,
        storedImageUrl || null,
        showIngredients,
        showRemovableIngredients,
        showAdditionalIngredients,
      ],
    );
  } else {
    getSqliteDb()
      .prepare(
        `INSERT INTO categories
          (id, name, slug, icon_name, image_url, show_ingredients,
           show_removable_ingredients, show_additional_ingredients)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        name,
        slug,
        iconName || null,
        storedImageUrl || null,
        showIngredients,
        showRemovableIngredients,
        showAdditionalIngredients,
      );
  }

  const created = await getCategoryById(id);
  res.status(201).json({ success: true, category: created });
});

app.put("/api/categories/:id", requireRole("SUPERADMIN"), async (req, res) => {
  const { id } = req.params;
  const current = await getCategoryById(id);
  if (!current) {
    throw httpError(404, "NOT_FOUND", "La categoría no existe.");
  }

  const body = req.body || {};
  const validation = validateCategory({
    name: body.name !== undefined ? body.name : current.name,
    slug: body.slug !== undefined ? body.slug : current.slug,
    iconName:
      body.iconName !== undefined || body.icon_name !== undefined
        ? body.iconName ?? body.icon_name
        : current.icon_name,
    imageUrl:
      body.imageUrl !== undefined || body.image_url !== undefined
        ? body.imageUrl ?? body.image_url
        : current.image_url,
    showIngredients:
      body.showIngredients !== undefined || body.show_ingredients !== undefined
        ? body.showIngredients ?? body.show_ingredients
        : current.show_ingredients,
    showRemovableIngredients:
      body.showRemovableIngredients !== undefined || body.show_removable_ingredients !== undefined
        ? body.showRemovableIngredients ?? body.show_removable_ingredients
        : current.show_removable_ingredients,
    showAdditionalIngredients:
      body.showAdditionalIngredients !== undefined || body.show_additional_ingredients !== undefined
        ? body.showAdditionalIngredients ?? body.show_additional_ingredients
        : current.show_additional_ingredients,
  });
  assertValid(validation.errors);

  const {
    name,
    slug,
    iconName,
    imageUrl,
    showIngredients,
    showRemovableIngredients,
    showAdditionalIngredients,
  } = validation.values;
  const duplicate = await countRows(
    "SELECT COUNT(*) AS c FROM categories WHERE slug = ? AND id <> ?",
    [slug, id],
  );
  if (duplicate > 0) {
    throw httpError(
      409,
      "CATEGORY_EXISTS",
      "Ya existe otra categoría con ese slug.",
    );
  }

  const storedImageUrl = await normalizeStoredMediaValue({
    entityType: "CATEGORY",
    entityId: id,
    fieldName: "image_url",
    value: imageUrl,
    createdBy: req.user.id,
  });

  if (mysqlPool) {
    await mysqlPool.execute(
      `UPDATE categories
          SET name = ?, slug = ?, icon_name = ?, image_url = ?,
              show_ingredients = ?, show_removable_ingredients = ?,
              show_additional_ingredients = ?,
              updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?`,
      [
        name,
        slug,
        iconName || null,
        storedImageUrl || null,
        showIngredients,
        showRemovableIngredients,
        showAdditionalIngredients,
        id,
      ],
    );
  } else {
    getSqliteDb()
      .prepare(
        `UPDATE categories
            SET name = ?, slug = ?, icon_name = ?, image_url = ?,
                show_ingredients = ?, show_removable_ingredients = ?,
                show_additional_ingredients = ?,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
      )
      .run(
        name,
        slug,
        iconName || null,
        storedImageUrl || null,
        showIngredients,
        showRemovableIngredients,
        showAdditionalIngredients,
        id,
      );
  }

  const updated = await getCategoryById(id);
  res.json({ success: true, category: updated });
});

app.delete("/api/categories/:id", requireRole("SUPERADMIN"), async (req, res) => {
  const { id } = req.params;
  const category = await getCategoryById(id);
  if (!category) {
    throw httpError(404, "NOT_FOUND", "La categoría no existe.");
  }

  const referenceParams = [id, category.slug];
  const businessRefs = await countRows(
    "SELECT COUNT(*) AS c FROM businesses WHERE category IN (?, ?)",
    referenceParams,
  );
  const productRefs = await countRows(
    "SELECT COUNT(*) AS c FROM products WHERE category_id IN (?, ?)",
    referenceParams,
  );
  if (businessRefs + productRefs > 0) {
    throw httpError(
      409,
      "CATEGORY_IN_USE",
      "No se puede eliminar la categoría porque hay negocios o productos que la usan.",
    );
  }

  if (mysqlPool) {
    await mysqlPool.execute("DELETE FROM categories WHERE id = ?", [id]);
  } else {
    getSqliteDb().prepare("DELETE FROM categories WHERE id = ?").run(id);
  }

  res.json({ success: true });
});

app.get("/api/products", async (_req, res) => {
  const rows = await listProducts();
  res.json(rows);
});

app.post("/api/products", requireRole("SUPERADMIN", "BUSINESS_ADMIN"), async (req, res) => {
  const body = req.body || {};
  validateProductInput(body);
  const requestedBusinessId = body.business_id || body.businessId || getSessionBusinessId(req.user);
  if (!requestedBusinessId) {
    throw validationError("El producto debe pertenecer a un negocio.", {
      business_id: "Selecciona un negocio válido.",
    });
  }
  const businessExists = await countRows(
    "SELECT COUNT(*) AS c FROM businesses WHERE id = ?",
    [requestedBusinessId],
  );
  if (!businessExists) {
    throw validationError("El negocio seleccionado no existe.", {
      business_id: "Selecciona un negocio válido.",
    });
  }
  assertBusinessResourceAccess(
    req.user,
    requestedBusinessId,
    "Solo puedes crear productos para tu propio negocio.",
  );
  const categoryId = await resolveProductCategoryId(
    body.category_id ?? body.categoryId,
  );
  const product = {
    id: body.id || cryptoRandomId(),
    business_id: requestedBusinessId,
    category_id: categoryId,
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
  product.image_url = await normalizeStoredMediaValue({
    entityType: "PRODUCT",
    entityId: product.id,
    fieldName: "image_url",
    value: product.image_url,
    createdBy: req.user.id,
  });

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

app.put("/api/products/:id", requireRole("SUPERADMIN", "BUSINESS_ADMIN"), async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  validateProductInput(body);
  const existing = await getProductById(id);
  if (!existing) throw httpError(404, "NOT_FOUND", "El producto no existe.");
  assertBusinessResourceAccess(
    req.user,
    existing.business_id,
    "Solo puedes modificar productos de tu propio negocio.",
  );
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
  // node:sqlite sólo admite números, textos y nulos: un booleano literal
  // revienta con "cannot be bound to SQLite parameter".
  if (body.is_available !== undefined || body.isAvailable !== undefined)
    assign("is_available", Number(body.is_available ?? body.isAvailable ?? 1));
  if (body.is_sold_out !== undefined || body.isSoldOut !== undefined)
    assign("is_sold_out", Number(body.is_sold_out ?? body.isSoldOut ?? 0));
  if (body.image_url !== undefined || body.imageUrl !== undefined) {
    assign(
      "image_url",
      await normalizeStoredMediaValue({
        entityType: "PRODUCT",
        entityId: id,
        fieldName: "image_url",
        value: body.image_url ?? body.imageUrl,
        createdBy: req.user.id,
      }),
    );
  }

  // Campos del formulario de catálogo: sin ellos, editar un producto desde la
  // app borraba silenciosamente el tag, los ingredientes o la categoría.
  const asJsonList = (value) => {
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return JSON.stringify(Array.isArray(parsed) ? parsed : [parsed]);
      } catch {
        return JSON.stringify(
          value.split(",").map((entry) => entry.trim()).filter(Boolean),
        );
      }
    }
    return "[]";
  };

  if (body.tag !== undefined) assign("tag", String(body.tag ?? ""));
  if (body.category_id !== undefined || body.categoryId !== undefined) {
    const categoryId = await resolveProductCategoryId(
      body.category_id ?? body.categoryId,
    );
    assign("category_id", categoryId);
  }
  if (body.ingredients !== undefined)
    assign("ingredients", asJsonList(body.ingredients));
  if (body.allergens !== undefined)
    assign("allergens", asJsonList(body.allergens));
  if (body.removable_ingredients !== undefined || body.removableIngredients !== undefined)
    assign(
      "removable_ingredients",
      asJsonList(body.removable_ingredients ?? body.removableIngredients),
    );
  if (body.additional_ingredients !== undefined || body.additionalIngredients !== undefined)
    assign(
      "additional_ingredients",
      asJsonList(body.additional_ingredients ?? body.additionalIngredients),
    );

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

app.delete("/api/products/:id", requireRole("SUPERADMIN", "BUSINESS_ADMIN"), async (req, res) => {
  const { id } = req.params;
  const existing = await getProductById(id);
  if (!existing) throw httpError(404, "NOT_FOUND", "El producto no existe.");
  assertBusinessResourceAccess(
    req.user,
    existing.business_id,
    "Solo puedes eliminar productos de tu propio negocio.",
  );
  if (mysqlPool) {
    await mysqlPool.execute("DELETE FROM products WHERE id = ?", [id]);
    return res.json({ success: true });
  }

  const db = getSqliteDb();
  db.prepare("DELETE FROM products WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/api/orders", requireAuth, async (req, res) => {
  res.set("Cache-Control", "no-store");
  const rows = await listOrders(req.user);
  res.json(rows);
});

app.post("/api/orders", requireRole(), async (req, res) => {
  const body = req.body || {};
  const role = String(req.user.role || "").toUpperCase();
  if (!["CLIENT", "BUSINESS_ADMIN", "SUPERADMIN"].includes(role)) throw httpError(403, "FORBIDDEN", "Tu rol no puede crear pedidos.");
  if (role === "CLIENT") {
    const requestedCustomerId = body.customerId ?? body.customer_id;
    if (requestedCustomerId && String(requestedCustomerId) !== String(req.user.id)) {
      throw httpError(403, "FORBIDDEN", "No puedes crear pedidos en nombre de otro cliente.");
    }
  }
  const orderId = body.id || cryptoRandomId();
  if (await countRows("SELECT COUNT(*) AS c FROM orders WHERE id = ?", [orderId])) throw httpError(409, "ORDER_EXISTS", "El pedido ya existe. No se ha modificado.");
  const businessId = body.businessId ?? body.business_id;
  if (role !== "CLIENT") assertBusinessResourceAccess(req.user, businessId, "Solo puedes crear pedidos para tu negocio.");
  const inputErrors = {};
  for (const [key, raw] of Object.entries(body)) {
    if ((key.endsWith("Cents") || key.endsWith("_cents")) && (!Number.isSafeInteger(Number(raw)) || Number(raw) < 0)) inputErrors[key] = "Los importes deben ser céntimos enteros mayores o iguales que cero.";
  }
  if (!businessId || !(await countRows("SELECT COUNT(*) AS c FROM businesses WHERE id = ?", [businessId]))) inputErrors.business_id = "Selecciona un negocio válido.";
  if (role === "CLIENT" && body.status && !["NEW", "PAID"].includes(body.status)) inputErrors.status = "El cliente solo puede crear pedidos nuevos.";
  if (body.status && !ORDER_STATUSES.has(body.status)) inputErrors.status = "El estado del pedido no es válido.";
  assertValid(inputErrors);
  // El cuerpo puede llegar en camelCase (frontend) o en snake_case (clientes
  // antiguos). Se aceptan ambos para no romper pedidos ya guardados.
  const pick = (camel, snake) =>
    body[camel] !== undefined ? body[camel] : body[snake];
  const toCents = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const now = new Date().toISOString();
  const createdAt = pick("createdAt", "created_at") || now;
  const updatedAt = pick("updatedAt", "updated_at") || createdAt;
  const status = body.status || "NEW";
  const reviewScoreRaw = pick("reviewScore", "review_score");
  const reviewScore =
    reviewScoreRaw === null || reviewScoreRaw === undefined
      ? null
      : Number(reviewScoreRaw);
  const reviewRequested =
    status === "DELIVERED"
      ? true
      : Boolean(pick("reviewRequested", "review_requested"));

  const orderRecord = {
    id: orderId,
    business_id: pick("businessId", "business_id") || null,
    business_name: pick("businessName", "business_name") || null,
    order_number:
      pick("orderNumber", "order_number") ||
      `PT-${Math.floor(Math.random() * 9000 + 1000)}`,
    customer_id:
      role === "CLIENT"
        ? req.user.id
        : pick("customerId", "customer_id") || null,
    customer_name: pick("customerName", "customer_name") || "Cliente",
    customer_email:
      pick("customerEmail", "customer_email") ||
      "cliente@pidetietar.local",
    customer_phone: pick("customerPhone", "customer_phone") || null,
    delivery_type:
      pick("deliveryType", "delivery_type") === "PICKUP"
        ? "PICKUP"
        : "DELIVERY",
    delivery_address: serializeJsonField(
      pick("deliveryAddress", "delivery_address"),
      null,
    ),
    scheduled_time: pick("scheduledTime", "scheduled_time") || null,
    subtotal_cents: toCents(pick("subtotalCents", "subtotal_cents")),
    delivery_fee_cents: toCents(
      pick("deliveryFeeCents", "delivery_fee_cents"),
    ),
    platform_fee_cents: toCents(
      pick("platformFeeCents", "platform_fee_cents"),
    ),
    business_payout_cents: toCents(
      pick("businessPayoutCents", "business_payout_cents"),
    ),
    courier_payout_cents: toCents(
      pick("courierPayoutCents", "courier_payout_cents"),
    ),
    tip_cents: toCents(pick("tipCents", "tip_cents")),
    total_cents: toCents(pick("totalCents", "total_cents")),
    status,
    status_history: serializeObjectList(
      pick("statusHistory", "status_history"),
    ),
    payment_method:
      pick("paymentMethod", "payment_method") || "CASH_ON_DELIVERY",
    payment_status: pick("paymentStatus", "payment_status") || "PAID",
    payment_transaction_id:
      pick("paymentTransactionId", "payment_transaction_id") || null,
    courier_id: pick("courierId", "courier_id") || null,
    courier_name: pick("courierName", "courier_name") || null,
    courier_phone: pick("courierPhone", "courier_phone") || null,
    delivery_pin:
      pick("deliveryPin", "delivery_pin") !== undefined &&
      pick("deliveryPin", "delivery_pin") !== null
        ? String(pick("deliveryPin", "delivery_pin"))
        : null,
    calendar_event_id:
      pick("calendarEventId", "calendar_event_id") || null,
    gmail_notified_at: toSqlTimestampOrNull(
      pick("gmailNotifiedAt", "gmail_notified_at"),
    ),
    review_requested: reviewRequested ? 1 : 0,
    review_score: Number.isFinite(reviewScore) ? reviewScore : null,
    reviewed_at: toSqlTimestampOrNull(
      pick("reviewedAt", "reviewed_at"),
    ),
    created_at: toSqlTimestamp(createdAt),
    updated_at: toSqlTimestamp(updatedAt),
  };

  const itemsInput = Array.isArray(body.items)
    ? body.items
    : Array.isArray(body.orderItems)
      ? body.orderItems
      : Array.isArray(body.order_items)
        ? body.order_items
        : null;

  if (!itemsInput?.length) throw validationError("El pedido necesita al menos un producto.", { items: "Añade productos al pedido." });
  for (const [index, item] of itemsInput.entries()) {
    const productId = cleanString(item?.productId ?? item?.product_id);
    if (!productId) throw validationError("Falta un producto del pedido.", { items: `Selecciona el producto de la línea ${index + 1}.` });
    const product = await getProductById(productId);
    if (!product || String(product.business_id) !== String(businessId)) throw validationError("Los productos deben pertenecer al negocio del pedido.", { items: `El producto de la línea ${index + 1} no es válido para este negocio.` });
    const quantity = Number(item?.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) throw validationError("La cantidad no es válida.", { items: "Cada cantidad debe ser un entero entre 1 y 100." });
    for (const amount of [item?.unitPriceCents ?? item?.unit_price_cents, item?.totalCents ?? item?.total_cents]) {
      if (!Number.isSafeInteger(Number(amount)) || Number(amount) < 0) throw validationError("Los precios de las líneas no son válidos.", { items: "Los importes deben ser céntimos enteros mayores o iguales que cero." });
    }
  }

  const columns = Object.keys(orderRecord);
  const placeholders = columns.map(() => "?").join(", ");
  const insertOrderSql = `INSERT INTO orders (${columns.join(", ")}) VALUES (${placeholders})`;

  const itemColumns = [
    "id",
    "order_id",
    "product_id",
    "product_name",
    "quantity",
    "unit_price_cents",
    "tax_percentage",
    "removed_ingredients",
    "selected_options",
    "customer_note",
    "total_cents",
  ];
  const insertItemSql = `INSERT INTO order_items (${itemColumns.join(", ")}) VALUES (${itemColumns.map(() => "?").join(", ")})`;

  await withTransaction(async (tx) => {
    await txQuery(
      tx,
      insertOrderSql,
      columns.map((column) => orderRecord[column]),
    );

    if (itemsInput) {
      await txQuery(tx, "DELETE FROM order_items WHERE order_id = ?", [
        orderId,
      ]);
      for (const item of itemsInput) {
        await txQuery(tx, insertItemSql, [
          item?.id || cryptoRandomId(),
          orderId,
          item?.productId ?? item?.product_id ?? null,
          item?.productName ?? item?.product_name ?? "Producto",
          toCents(item?.quantity ?? 1) || 1,
          toCents(item?.unitPriceCents ?? item?.unit_price_cents),
          toCents(item?.taxPercentage ?? item?.tax_percentage),
          serializeStringList(
            item?.removedIngredients ?? item?.removed_ingredients,
          ),
          serializeObjectList(
            item?.selectedOptions ?? item?.selected_options,
          ),
          item?.customerNote ?? item?.customer_note ?? null,
          toCents(item?.totalCents ?? item?.total_cents),
        ]);
      }
    }
  });

  res.status(201).json({ success: true, id: orderId });
});

// El servidor comprueba el ámbito del usuario y el PIN antes de aceptar cambios
// de estado; el cliente sólo puede enviar la valoración de su propio pedido.
app.put("/api/orders/:id", requireRole(), async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const now = new Date().toISOString();
  const read = (camel, snake) =>
    body[camel] !== undefined ? body[camel] : body[snake];
  const has = (camel, snake) =>
    body[camel] !== undefined || body[snake] !== undefined;
  const toCents = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const result = await withTransaction(async (tx) => {
    const rows = await txQuery(tx, "SELECT * FROM orders WHERE id = ?", [id]);
    const existing = Array.isArray(rows) ? rows[0] : rows;
    if (!existing) return { notFound: true };

    const role = String(req.user.role || "").toUpperCase();
    const orderBusinessId = String(existing.business_id || "");
    if (role === "BUSINESS_ADMIN") {
      assertBusinessResourceAccess(
        req.user,
        orderBusinessId,
        "Solo puedes modificar pedidos de tu propio negocio.",
      );
    } else if (role === "BUSINESS_COURIER" || role === "PLATFORM_COURIER") {
      const assignedBusinesses = parseCourierBusinessIds(req.user);
      const canAccess = role === "PLATFORM_COURIER" ||
        assignedBusinesses.includes(orderBusinessId) ||
        String(existing.courier_id || "") === String(req.user.id || "");
      if (!canAccess) {
        throw httpError(403, "FORBIDDEN", "No puedes modificar este pedido.");
      }
      const courierAllowedFields = new Set([
        "status",
        "status_history",
        "delivery_pin",
        "deliveryPin",
        "courier_id",
        "courierId",
        "courier_name",
        "courierName",
        "courier_phone",
        "courierPhone",
        "review_requested",
        "updated_at",
        "updatedAt",
        "changed_at",
        "changedAt",
        "changed_by_role",
        "changedByRole",
        "note",
      ]);
      const forbiddenField = Object.keys(body).find(
        (field) => !courierAllowedFields.has(field),
      );
      if (forbiddenField) {
        throw httpError(403, "FORBIDDEN", "El repartidor solo puede actualizar el estado y los datos de entrega.");
      }
    } else if (role === "CLIENT") {
      const isOwner =
        String(existing.customer_id || "") === String(req.user.id || "") ||
        (!existing.customer_id &&
          String(existing.customer_email || "").toLowerCase() ===
            String(req.user.email || "").toLowerCase());
      if (!isOwner) {
        throw httpError(403, "FORBIDDEN", "No puedes modificar este pedido.");
      }
      const clientAllowedFields = new Set([
        "review_requested",
        "review_score",
        "reviewed_at",
        "reviewRequested", "reviewScore", "reviewedAt",
      ]);
      const forbiddenField = Object.keys(body).find(
        (field) => !clientAllowedFields.has(field),
      );
      if (forbiddenField) {
        throw httpError(403, "FORBIDDEN", "El cliente solo puede enviar la valoración del pedido.");
      }
    }

    const financialFields = [
      "subtotalCents",
      "subtotal_cents",
      "deliveryFeeCents",
      "delivery_fee_cents",
      "platformFeeCents",
      "platform_fee_cents",
      "businessPayoutCents",
      "business_payout_cents",
      "courierPayoutCents",
      "courier_payout_cents",
      "totalCents",
      "total_cents",
      "paymentStatus",
      "payment_status",
      "paymentTransactionId",
      "payment_transaction_id",
    ];
    if (role !== "SUPERADMIN" && financialFields.some((field) => Object.prototype.hasOwnProperty.call(body, field))) {
      throw httpError(403, "FORBIDDEN", "Los importes y el pago solo los puede validar el servidor.");
    }

    const updates = new Map();
    const set = (field, value) => updates.set(field, value);

    let nextStatus = existing.status || "NEW";
    if (has("status", "status")) {
      nextStatus = String(read("status", "status") || "NEW");
      if (!ORDER_STATUSES.has(nextStatus)) throw validationError("El estado del pedido no es válido.", { status: "Selecciona un estado válido." });
      set("status", nextStatus);
    }

    if (
      has("status", "status") && role !== "SUPERADMIN" && existing.delivery_type !== "PICKUP" &&
      nextStatus === "DELIVERED" &&
      existing.delivery_pin
    ) {
      const submittedPin = read("deliveryPin", "delivery_pin");
      if (String(submittedPin || "") !== String(existing.delivery_pin)) {
        throw httpError(400, "INVALID_DELIVERY_PIN", "El PIN de entrega no es válido.");
      }
    }

    if (has("businessId", "business_id"))
      set("business_id", read("businessId", "business_id") || null);
    if (has("businessName", "business_name"))
      set("business_name", read("businessName", "business_name") || null);
    if (has("orderNumber", "order_number"))
      set(
        "order_number",
        read("orderNumber", "order_number") || existing.order_number || "",
      );
    if (has("customerId", "customer_id"))
      set("customer_id", read("customerId", "customer_id") || null);
    if (has("customerName", "customer_name"))
      set(
        "customer_name",
        read("customerName", "customer_name") ||
          existing.customer_name ||
          "Cliente",
      );
    if (has("customerEmail", "customer_email"))
      set(
        "customer_email",
        read("customerEmail", "customer_email") ||
          existing.customer_email ||
          "",
      );
    if (has("customerPhone", "customer_phone"))
      set("customer_phone", read("customerPhone", "customer_phone") || null);
    if (has("deliveryType", "delivery_type")) {
      set(
        "delivery_type",
        read("deliveryType", "delivery_type") === "PICKUP"
          ? "PICKUP"
          : "DELIVERY",
      );
    }
    if (has("deliveryAddress", "delivery_address")) {
      set(
        "delivery_address",
        serializeJsonField(
          read("deliveryAddress", "delivery_address"),
          null,
        ),
      );
    }
    if (has("scheduledTime", "scheduled_time"))
      set("scheduled_time", read("scheduledTime", "scheduled_time") || null);
    if (has("subtotalCents", "subtotal_cents"))
      set(
        "subtotal_cents",
        toCents(read("subtotalCents", "subtotal_cents")),
      );
    if (has("deliveryFeeCents", "delivery_fee_cents"))
      set(
        "delivery_fee_cents",
        toCents(read("deliveryFeeCents", "delivery_fee_cents")),
      );
    if (has("platformFeeCents", "platform_fee_cents"))
      set(
        "platform_fee_cents",
        toCents(read("platformFeeCents", "platform_fee_cents")),
      );
    if (has("businessPayoutCents", "business_payout_cents"))
      set(
        "business_payout_cents",
        toCents(read("businessPayoutCents", "business_payout_cents")),
      );
    if (has("courierPayoutCents", "courier_payout_cents"))
      set(
        "courier_payout_cents",
        toCents(read("courierPayoutCents", "courier_payout_cents")),
      );
    if (has("tipCents", "tip_cents"))
      set("tip_cents", toCents(read("tipCents", "tip_cents")));
    if (has("totalCents", "total_cents"))
      set("total_cents", toCents(read("totalCents", "total_cents")));
    if (has("paymentMethod", "payment_method"))
      set(
        "payment_method",
        read("paymentMethod", "payment_method") || existing.payment_method || null,
      );
    if (has("paymentStatus", "payment_status"))
      set(
        "payment_status",
        read("paymentStatus", "payment_status") || existing.payment_status || null,
      );
    if (has("paymentTransactionId", "payment_transaction_id"))
      set(
        "payment_transaction_id",
        read("paymentTransactionId", "payment_transaction_id") || null,
      );
    if (has("courierId", "courier_id"))
      set("courier_id", read("courierId", "courier_id") || null);
    if (has("courierName", "courier_name"))
      set("courier_name", read("courierName", "courier_name") || null);
    if (has("courierPhone", "courier_phone"))
      set("courier_phone", read("courierPhone", "courier_phone") || null);
    if (has("deliveryPin", "delivery_pin")) {
      const pin = read("deliveryPin", "delivery_pin");
      if (role === "SUPERADMIN") set("delivery_pin", pin === null || pin === undefined ? null : String(pin));
      else if (nextStatus !== "DELIVERED") throw httpError(403, "FORBIDDEN", "El PIN solo se envía para verificar la entrega y no se puede modificar.");
    }
    if (has("calendarEventId", "calendar_event_id"))
      set(
        "calendar_event_id",
        read("calendarEventId", "calendar_event_id") || null,
      );
    if (has("gmailNotifiedAt", "gmail_notified_at"))
      set(
        "gmail_notified_at",
        toSqlTimestampOrNull(read("gmailNotifiedAt", "gmail_notified_at")),
      );
    if (has("reviewRequested", "review_requested"))
      set(
        "review_requested",
        read("reviewRequested", "review_requested") ? 1 : 0,
      );
    if (has("reviewScore", "review_score")) {
      const score = read("reviewScore", "review_score");
      if (role === "CLIENT" && existing.status !== "DELIVERED") throw validationError("Solo puedes valorar un pedido entregado.", { reviewScore: "El pedido todavía no se ha entregado." });
      if (score !== null && score !== undefined && (!Number.isInteger(Number(score)) || Number(score) < 1 || Number(score) > 5)) throw validationError("La valoración no es válida.", { reviewScore: "La valoración debe ser un entero entre 1 y 5." });
      set(
        "review_score",
        score === null || score === undefined
          ? null
          : Number.isFinite(Number(score))
            ? Number(score)
            : null,
      );
    }
    if (has("reviewedAt", "reviewed_at"))
      set("reviewed_at", toSqlTimestampOrNull(read("reviewedAt", "reviewed_at")));

    if (has("statusHistory", "status_history")) {
      set(
        "status_history",
        serializeObjectList(read("statusHistory", "status_history")),
      );
    } else if (has("status", "status")) {
      const history = parseStoredList(existing.status_history);
      history.push({
        status: nextStatus,
        timestamp:
          toIsoTimestamp(
            read("changedAt", "changed_at") ||
              read("updatedAt", "updated_at") ||
              now,
          ) || now,
        note: body.note ?? "",
        changedByRole:
          read("changedByRole", "changed_by_role") || "SISTEMA",
      });
      set("status_history", JSON.stringify(history));
    }

    // Al marcar el pedido como entregado se solicita una valoración, salvo que
    // el cliente ya haya enviado su puntuación en esta misma petición.
    const statusWasUpdated = has("status", "status");
    const hasReviewScore = updates.has("review_score");
    if (statusWasUpdated && nextStatus === "DELIVERED" && !hasReviewScore) {
      set(
        "review_requested",
        updates.has("review_requested")
          ? updates.get("review_requested")
          : 1,
      );
    }

    if (!updates.size) return { empty: true };

    set(
      "updated_at",
      toSqlTimestamp(read("updatedAt", "updated_at") || now),
    );

    const fields = [...updates.keys()];
    const values = [...updates.values()];
    await txQuery(
      tx,
      `UPDATE orders SET ${fields.map((field) => `${field} = ?`).join(", ")} WHERE id = ?`,
      [...values, id],
    );

    if (updates.has("review_score")) {
      const [summary] = await txQuery(tx, "SELECT AVG(review_score) AS rating, COUNT(*) AS total FROM orders WHERE business_id = ? AND review_score IS NOT NULL AND status = 'DELIVERED'", [existing.business_id]);
      await txQuery(tx, "UPDATE businesses SET rating = ?, review_count = ? WHERE id = ?", [Number(summary.rating || 0), Number(summary.total || 0), existing.business_id]);
    }

    return { success: true };
  });

  if (result.notFound) {
    return res.status(404).json({ success: false, message: "Pedido no encontrado" });
  }
  if (result.empty) {
    return res
      .status(400)
      .json({ success: false, message: "No hay campos para actualizar" });
  }

  res.json({ success: true });
});

app.delete("/api/orders/:id", requireRole("SUPERADMIN", "BUSINESS_ADMIN"), async (req, res) => {
  const { id } = req.params;
  let existing;
  if (mysqlPool) {
    const [rows] = await mysqlPool.execute(
      "SELECT * FROM orders WHERE id = ? LIMIT 1",
      [id],
    );
    existing = rows[0] || null;
  } else {
    existing =
      getSqliteDb().prepare("SELECT * FROM orders WHERE id = ? LIMIT 1").get(id) ||
      null;
  }
  if (!existing) {
    throw httpError(404, "NOT_FOUND", "El pedido no existe.");
  }
  assertBusinessResourceAccess(
    req.user,
    existing.business_id,
    "Solo puedes eliminar pedidos de tu propio negocio.",
  );

  await withTransaction(async (tx) => {
    // order_items referencia orders: hay que vaciar las líneas antes de borrar
    // la cabecera para no violar la foreign key.
    await txQuery(tx, "DELETE FROM order_items WHERE order_id = ?", [id]);
    await txQuery(tx, "DELETE FROM orders WHERE id = ?", [id]);
  });

  res.json({ success: true });
});

app.get("/api/debug/config", requireSuperAdmin, (_req, res) => {
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
  if (res.headersSent) return;

  // Errores de validación propios: siempre se devuelven tal cual, sin log.
  if (err?.code === "VALIDATION_ERROR") {
    return res.status(err.status || 400).json({
      code: "VALIDATION_ERROR",
      message: err.message || "Revisa los datos del formulario.",
      errors: err.errors || {},
    });
  }

  if (err?.code === "UNAUTHORIZED" || err?.status === 401) {
    return res.status(401).json({
      code: "UNAUTHORIZED",
      message: err.message || "Debes iniciar sesión para realizar esta acción.",
    });
  }

  if (err?.code === "FORBIDDEN" || err?.status === 403) {
    return res.status(403).json({
      code: "FORBIDDEN",
      message:
        err.message || "Tu usuario no tiene permisos para realizar esta acción.",
    });
  }

  if (err?.code === "NOT_FOUND" || err?.status === 404) {
    return res.status(404).json({
      code: "NOT_FOUND",
      message: err.message || "El recurso solicitado no existe.",
    });
  }

  // body-parser: payload demasiado grande (p. ej. una foto en base64 pesada).
  if (err?.type === "entity.too.large" || err?.status === 413) {
    return res.status(413).json({
      code: "PAYLOAD_TOO_LARGE",
      message:
        "Los datos enviados son demasiado pesados. Prueba con una imagen más ligera.",
    });
  }

  // Errores de dominio creados con httpError(status, code, message): conservan
  // su código y mensaje (p. ej. CATEGORY_EXISTS o CATEGORY_IN_USE) en lugar de
  // convertirse en un genérico INTERNAL_ERROR.
  if (err?.status && err?.code) {
    return res.status(err.status).json({
      code: err.code,
      message: err.message || "No se pudo completar la operación.",
    });
  }

  // Foreign key incumplida: nunca debe llegar como 500 al cliente.
  const isForeignKey =
    err?.code === "SQLITE_CONSTRAINT_FOREIGNKEY" ||
    err?.code === "ER_ROW_IS_REFERENCED_2" ||
    err?.code === "ER_NO_REFERENCED_ROW_2" ||
    /FOREIGN KEY constraint failed/i.test(String(err?.message || ""));

  if (isForeignKey) {
    console.warn("Foreign key violation:", err.message);
    return res.status(409).json({
      code: "FOREIGN_KEY_CONFLICT",
      message:
        "No se puede completar la operación porque otros datos dependen de este registro.",
    });
  }

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

  console.error("Unhandled route error:", err);

  res.status(err?.status || 500).json({
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
    // Diagnóstico de correo: si falta una variable SMTP el envío devolverá
    // el enlace/código en la respuesta. Así se ve al arrancar sin adivinar.
    const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || "";
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || "";
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";
    console.log(
      smtpHost && smtpUser && smtpPass
        ? `SMTP configurado ✔ host=${smtpHost}`
        : "SMTP sin configurar: los correos no se envían y el enlace/código se devuelve en la API.",
    );
    console.log(`Logo del correo: ${BRAND_EMAIL_LOGO_PATH} (${fs.existsSync(BRAND_EMAIL_LOGO_PATH) ? "encontrado" : "no existe; el email saldrá sin imagen"})`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
