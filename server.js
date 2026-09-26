import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();
process.env.NODE_ENV ||= "development";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
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
  host: process.env.MYSQL_HOST || "",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "",
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
  charset: "utf8mb4",
  multipleStatements: false,
};

let mysqlPool = null;
let sqliteDb = null;
let databaseMode = "sqlite";

const sqliteSchema = `
  CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CLIENT',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    locality_id TEXT,
    name TEXT NOT NULL,
    legal_name TEXT,
    cif TEXT,
    phone TEXT,
    email TEXT,
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
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_app_users_email (email),
    UNIQUE KEY uq_app_users_username (username)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS businesses (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    locality_id VARCHAR(64) NULL,
    name VARCHAR(180) NOT NULL,
    legal_name VARCHAR(180) NULL,
    cif VARCHAR(40) NULL,
    phone VARCHAR(30) NULL,
    email VARCHAR(255) NULL,
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

function getSqliteDb() {
  if (!sqliteDb) {
    sqliteDb = new Database(DB_PATH);
    sqliteDb.pragma("journal_mode = WAL");
  }
  return sqliteDb;
}

function ensureSqliteSchemaShape() {
  const db = getSqliteDb();
  db.exec(sqliteSchema);

  const existingColumns = new Set(
    db
      .prepare("PRAGMA table_info(businesses)")
      .all()
      .map((column) => column.name),
  );

  const ensureColumn = (columnName, definition) => {
    if (!existingColumns.has(columnName)) {
      db.exec(`ALTER TABLE businesses ADD COLUMN ${columnName} ${definition}`);
      existingColumns.add(columnName);
    }
  };

  ensureColumn("delivery_modes", "TEXT DEFAULT '[]'");
  ensureColumn("delivery_radius_km", "REAL DEFAULT 0");
  ensureColumn("status", "TEXT DEFAULT 'PENDING'");
  ensureColumn("updated_at", "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");

  const ensureTable = (tableName, createSql) => {
    const exists = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(tableName);

    if (!exists) {
      db.exec(createSql);
    }
  };

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
    await seedSuperAdmin();
    return;
  }

  const db = getSqliteDb();
  ensureSqliteSchemaShape();
  seedSuperAdmin();
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

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username || row.email?.split("@")[0] || "",
    name: row.full_name || row.name || row.username || "Usuario",
    email: row.email,
    role: row.role || "CLIENT",
    status: row.status || "ACTIVE",
    createdAt: row.created_at || new Date().toISOString(),
  };
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
  const hash = bcrypt.hashSync(String(password || "PideTietar123"), 10);

  if (mysqlPool) {
    const id = cryptoRandomId();
    await mysqlPool.execute(
      "INSERT INTO app_users (id, username, full_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')",
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
    "INSERT INTO app_users (id, username, full_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')",
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
  if (!email || !password) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Email y contraseña son obligatorios",
    });
  }

  const existing = await getUserByIdentifier(username || email);
  if (existing) {
    return res
      .status(409)
      .json({ code: "USER_EXISTS", message: "El usuario o correo ya existe" });
  }

  const newUser = await createUser({
    username,
    fullName,
    email,
    password,
    role,
  });
  res.status(201).json({
    success: true,
    user: sanitizeUser(newUser),
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

  res.json({ success: true, user: sanitizeUser(user) });
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

app.get("/api/users", async (_req, res) => {
  const rows = await listUsers();
  res.json(rows.map((row) => sanitizeUser(row)));
});

app.post("/api/users", async (req, res) => {
  const user = await createUser(req.body);
  res.status(201).json({ success: true, user: sanitizeUser(user) });
});

app.get("/api/businesses", async (_req, res) => {
  const rows = await listBusinesses();
  res.json(rows);
});

app.post("/api/businesses", async (req, res) => {
  const body = req.body || {};
  const payload = {
    id: body.id || cryptoRandomId(),
    locality_id: body.locality_id || "locality-default",
    name: body.name || "Nuevo negocio",
    legal_name: body.legal_name || body.name || "Nuevo negocio",
    cif: body.cif || "00000000A",
    phone: body.phone || "+34 600 000 000",
    email: body.email || "contacto@negocio.local",
    address: body.address || "Dirección no indicada",
    latitude: body.latitude || 40.289,
    longitude: body.longitude || -4.58,
    rating: body.rating || 4.8,
    review_count: body.review_count || 0,
    estimated_time_min: body.estimated_time_min || 20,
    estimated_time_max: body.estimated_time_max || 40,
    delivery_fee_cents: body.delivery_fee_cents || 0,
    min_order_cents: body.min_order_cents || 0,
    banner_url: body.banner_url || "",
    logo_url: body.logo_url || "",
    is_shift_open: body.is_shift_open ?? 1,
    delivery_modes: JSON.stringify(body.delivery_modes || ["PICKUP"]),
    delivery_radius_km: body.delivery_radius_km || 5,
    status: body.status || "APPROVED",
  };

  if (mysqlPool) {
    await mysqlPool.execute(
      `INSERT INTO businesses (id, locality_id, name, legal_name, cif, phone, email, address, latitude, longitude, rating, review_count, estimated_time_min, estimated_time_max, delivery_fee_cents, min_order_cents, banner_url, logo_url, is_shift_open, delivery_modes, delivery_radius_km, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.id,
        payload.locality_id,
        payload.name,
        payload.legal_name,
        payload.cif,
        payload.phone,
        payload.email,
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
    `INSERT INTO businesses (id, locality_id, name, legal_name, cif, phone, email, address, latitude, longitude, rating, review_count, estimated_time_min, estimated_time_max, delivery_fee_cents, min_order_cents, banner_url, logo_url, is_shift_open, delivery_modes, delivery_radius_km, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    payload.id,
    payload.locality_id,
    payload.name,
    payload.legal_name,
    payload.cif,
    payload.phone,
    payload.email,
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

app.get("/api/products", async (_req, res) => {
  const rows = await listProducts();
  res.json(rows);
});

app.post("/api/products", async (req, res) => {
  const body = req.body || {};
  const product = {
    id: body.id || cryptoRandomId(),
    business_id: body.business_id || "business-default",
    category_id: body.category_id || "general",
    name: body.name || "Nuevo producto",
    description: body.description || "",
    tag: body.tag || "",
    ingredients: JSON.stringify(body.ingredients || []),
    allergens: JSON.stringify(body.allergens || []),
    price_cents: body.price_cents || 0,
    tax_percentage: body.tax_percentage || 0,
    image_url: body.image_url || "",
    is_available: body.is_available ?? 1,
    is_sold_out: body.is_sold_out ?? 0,
    removable_ingredients: JSON.stringify(body.removable_ingredients || []),
    additional_ingredients: JSON.stringify(body.additional_ingredients || []),
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

app.get("/api/orders", async (_req, res) => {
  const rows = await listOrders();
  res.json(rows);
});

app.post("/api/orders", async (req, res) => {
  const body = req.body || {};
  const id = body.id || cryptoRandomId();
  const total = Number(body.total_cents || body.totalCents || 0);

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

await ensureSchema();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`PideTiétar backend running on http://0.0.0.0:${PORT}`);
  console.log(`Database mode: ${databaseMode}`);
  console.log(
    `Database target: ${mysqlPool ? process.env.MYSQL_DATABASE || "mysql" : DB_PATH}`,
  );
});
