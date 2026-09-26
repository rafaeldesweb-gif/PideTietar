import mysql from "mysql2/promise";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

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

function ensureSqliteSchema(db) {
  db.exec(sqliteSchema);

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

  const businessesColumns = db.prepare("PRAGMA table_info(businesses)").all();
  const businessColumnNames = new Set(
    businessesColumns.map((column) => column.name),
  );

  const addColumnIfMissing = (columnName, definition) => {
    if (!businessColumnNames.has(columnName)) {
      db.exec(`ALTER TABLE businesses ADD COLUMN ${columnName} ${definition}`);
      businessColumnNames.add(columnName);
    }
  };

  addColumnIfMissing("delivery_modes", "TEXT DEFAULT '[]'");
  addColumnIfMissing("delivery_radius_km", "REAL DEFAULT 0");
  addColumnIfMissing("status", "TEXT DEFAULT 'PENDING'");
  addColumnIfMissing("updated_at", "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");
}

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

async function connectMysql() {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !database) {
    return null;
  }

  try {
    const pool = mysql.createPool({
      host,
      port: Number(process.env.MYSQL_PORT || 3306),
      user,
      password: process.env.MYSQL_PASSWORD || "",
      database,
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
      charset: "utf8mb4",
      ssl: { rejectUnauthorized: false },
    });
    const conn = await pool.getConnection();
    await conn.query("SELECT 1 AS ok");
    conn.release();
    return pool;
  } catch (error) {
    console.warn(
      "MySQL not reachable with the configured settings:",
      error.message,
    );
    return null;
  }
}

async function migrateMysql(pool) {
  await applyMysqlSchema(pool);
  await pool.execute(
    `INSERT INTO app_users (id, username, full_name, email, password_hash, role, status)
     SELECT UUID(), ?, 'RafaAdmin', 'rafaeldesweb@gmail.com', ?, 'SUPERADMIN', 'ACTIVE'
     WHERE NOT EXISTS (SELECT 1 FROM app_users WHERE username = ? OR email = 'rafaeldesweb@gmail.com')`,
    [
      process.env.SUPERADMIN_USERNAME || "RafaAdmin",
      bcrypt.hashSync(process.env.SUPERADMIN_PASSWORD || "13021999", 10),
      process.env.SUPERADMIN_USERNAME || "RafaAdmin",
    ],
  );
  console.log("MySQL schema created and superadmin seeded.");
}

function migrateSqlite() {
  const db = new Database(process.env.DB_PATH || "./data/app.db");
  ensureSqliteSchema(db);
  const hash = bcrypt.hashSync(
    process.env.SUPERADMIN_PASSWORD || "13021999",
    10,
  );
  const existing = db
    .prepare("SELECT id FROM app_users WHERE username = ? OR email = ?")
    .get(
      process.env.SUPERADMIN_USERNAME || "RafaAdmin",
      "rafaeldesweb@gmail.com",
    );
  if (!existing) {
    db.prepare(
      `INSERT INTO app_users (id, username, full_name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?, 'SUPERADMIN', 'ACTIVE')`,
    ).run(
      `usr-${Date.now()}`,
      process.env.SUPERADMIN_USERNAME || "RafaAdmin",
      "RafaAdmin",
      "rafaeldesweb@gmail.com",
      hash,
    );
  }
  console.log("SQLite schema created and superadmin seeded.");
}

async function status() {
  const pool = await connectMysql();
  if (!pool) {
    const db = new Database(process.env.DB_PATH || "./data/app.db");
    ensureSqliteSchema(db);
    console.log("Database mode: sqlite");
    const rows = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all();
    console.log(rows.map((r) => r.name).join(", ") || "No tables");
    return;
  }

  const [rows] = await pool.query(
    "SELECT DATABASE() AS db_name, VERSION() AS version",
  );
  console.log("Database mode: mysql");
  console.log(rows[0]);
}

async function migrate() {
  const pool = await connectMysql();
  if (pool) {
    await migrateMysql(pool);
    return;
  }
  migrateSqlite();
}

async function seed() {
  const pool = await connectMysql();
  if (pool) {
    await migrateMysql(pool);
    return;
  }
  migrateSqlite();
}

async function verify() {
  const pool = await connectMysql();
  if (!pool) {
    const db = new Database(process.env.DB_PATH || "./data/app.db");
    ensureSqliteSchema(db);
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all();
    console.log(
      `SQLite tables (${tables.length}): ${tables.map((t) => t.name).join(", ")}`,
    );
    return;
  }

  const [rows] = await pool.query("SHOW TABLES");
  console.log(
    `MySQL tables (${rows.length}): ${rows.map((row) => Object.values(row)[0]).join(", ")}`,
  );
}

async function crud() {
  const pool = await connectMysql();
  if (pool) {
    const localityId = `loc-demo-${Date.now()}`;
    const localitySlug = `sotillo-demo-${Date.now()}`;
    const businessId = `biz-demo-${Date.now()}`;
    const slug = `demo-${Date.now()}`;
    const email = `demo-${Date.now()}@pidetietar.es`;

    await pool.execute(
      `INSERT INTO localities (
        id,
        name,
        slug,
        province,
        autonomous_community,
        country_code,
        timezone,
        latitude,
        longitude,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [
        localityId,
        "Sotillo de la Adrada",
        localitySlug,
        "Ávila",
        "Castilla y León",
        "ES",
        "Europe/Madrid",
        40.2891,
        -4.5824,
      ],
    );

    await pool.execute(
      `INSERT INTO businesses (
        id,
        locality_id,
        public_name,
        slug,
        legal_name,
        email,
        phone_e164,
        address_line1,
        postal_code,
        latitude,
        longitude,
        rating_average,
        rating_count,
        estimated_time_min,
        estimated_time_max,
        minimum_order_cents,
        default_delivery_fee_cents,
        currency,
        order_acceptance_mode,
        verification_status,
        operational_status,
        logo_url,
        banner_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE public_name = VALUES(public_name)`,
      [
        businessId,
        localityId,
        "La Bodeguita de Sotillo",
        slug,
        "La Bodeguita de Sotillo",
        email,
        "+34600000000",
        "Calle Mayor 14",
        "05420",
        40.2889,
        -4.5828,
        4.8,
        230,
        25,
        40,
        1000,
        250,
        "EUR",
        "AUTOMATIC",
        "APPROVED",
        "CLOSED",
        "https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80",
      ],
    );

    const [readBusiness] = await pool.query(
      "SELECT id, locality_id, public_name, operational_status, verification_status FROM businesses WHERE email = ? LIMIT 1",
      [email],
    );

    await pool.execute(
      "UPDATE businesses SET operational_status = 'OPEN', updated_at = NOW() WHERE email = ?",
      [email],
    );

    const [updatedBusiness] = await pool.query(
      "SELECT id, locality_id, public_name, operational_status, verification_status FROM businesses WHERE email = ? LIMIT 1",
      [email],
    );

    await pool.execute("DELETE FROM businesses WHERE email = ?", [email]);
    await pool.execute("DELETE FROM localities WHERE id = ?", [localityId]);

    console.log("CRUD demo completed on MySQL.");
    console.log("Create/Read result:", JSON.stringify(readBusiness, null, 2));
    console.log("Update result:", JSON.stringify(updatedBusiness, null, 2));
    return;
  }

  const db = new Database(process.env.DB_PATH || "./data/app.db");
  ensureSqliteSchema(db);
  const businessId = `biz-${Date.now()}`;
  const productId = `prod-${Date.now()}`;
  const orderId = `order-${Date.now()}`;
  db.prepare(
    `INSERT OR REPLACE INTO businesses (id, name, legal_name, cif, phone, email, address, status, delivery_modes) VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', '[]')`,
  ).run(
    businessId,
    "Demo negocio",
    "Demo negocio",
    "00000000A",
    "+34 600000000",
    "demo@pidetietar.es",
    "Calle Demo 1",
  );
  db.prepare(
    `INSERT OR REPLACE INTO products (id, business_id, category_id, name, description, price_cents, tax_percentage, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
  ).run(
    productId,
    businessId,
    "general",
    "Bocadillo demo",
    "Bocadillo de prueba",
    850,
    21,
  );
  db.prepare(
    `INSERT OR REPLACE INTO orders (id, business_id, order_number, customer_name, customer_email, delivery_type, total_cents, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW')`,
  ).run(
    orderId,
    businessId,
    "PT-DEMO",
    "Cliente Demo",
    "cliente@demo.es",
    "DELIVERY",
    1500,
  );
  console.log(
    `CRUD demo completed in SQLite. businessId=${businessId}, productId=${productId}, orderId=${orderId}`,
  );
}

const command = process.argv[2] || "status";

switch (command) {
  case "status":
    await status();
    break;
  case "migrate":
    await migrate();
    break;
  case "seed":
    await seed();
    break;
  case "verify":
    await verify();
    break;
  case "crud":
    await crud();
    break;
  default:
    console.log(
      "Unknown command. Use: status | migrate | seed | verify | crud",
    );
    process.exit(1);
}
