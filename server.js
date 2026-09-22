import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();
process.env.NODE_ENV ||= "production";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3000);
const configuredDbPath = process.env.DB_PATH || path.join("data", "app.db");
const DB_PATH = path.isAbsolute(configuredDbPath)
  ? configuredDbPath
  : path.resolve(__dirname, configuredDbPath);
const DATA_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    legal_name TEXT,
    cif TEXT,
    category TEXT,
    locality_id TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    banner_url TEXT,
    logo_url TEXT,
    delivery_fee_cents INTEGER DEFAULT 0,
    min_order_cents INTEGER DEFAULT 0,
    estimated_time_min INTEGER DEFAULT 20,
    estimated_time_max INTEGER DEFAULT 40,
    is_shift_open INTEGER DEFAULT 1,
    status TEXT DEFAULT 'APPROVED',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    tag TEXT,
    ingredients TEXT,
    removable_ingredients TEXT,
    additional_ingredients TEXT,
    price_cents INTEGER DEFAULT 0,
    image_url TEXT,
    category_id TEXT,
    tax_percentage INTEGER DEFAULT 0,
    is_available INTEGER DEFAULT 1,
    allergens TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database: DB_PATH,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/businesses", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM businesses ORDER BY created_at DESC")
    .all();
  res.json(rows);
});

app.post("/api/businesses", (req, res) => {
  const {
    id,
    name,
    legal_name,
    cif,
    category,
    locality_id,
    address,
    phone,
    email,
    banner_url,
    logo_url,
    delivery_fee_cents,
    min_order_cents,
    estimated_time_min,
    estimated_time_max,
    is_shift_open,
    status,
  } = req.body;

  if (!name || !address) {
    return res.status(400).json({ error: "Nombre y dirección obligatorios" });
  }

  const stmt = db.prepare(`
    INSERT INTO businesses (
      id, name, legal_name, cif, category, locality_id, address, phone, email,
      banner_url, logo_url, delivery_fee_cents, min_order_cents, estimated_time_min,
      estimated_time_max, is_shift_open, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const businessId = id || `biz-${Date.now()}`;
  stmt.run(
    businessId,
    name,
    legal_name || name,
    cif || "00000000A",
    category || "general",
    locality_id || "sotillo",
    address,
    phone || "+34 600 000 000",
    email || "contacto@negocio.es",
    banner_url || "",
    logo_url || "",
    Number(delivery_fee_cents || 0),
    Number(min_order_cents || 0),
    Number(estimated_time_min || 20),
    Number(estimated_time_max || 40),
    Number(is_shift_open ?? 1),
    status || "APPROVED",
  );

  res.status(201).json({ id: businessId, success: true });
});

app.get("/api/products", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM products ORDER BY created_at DESC")
    .all();
  res.json(rows);
});

app.post("/api/products", (req, res) => {
  const {
    id,
    business_id,
    name,
    description,
    tag,
    ingredients,
    removable_ingredients,
    additional_ingredients,
    price_cents,
    image_url,
    category_id,
    tax_percentage,
    is_available,
    allergens,
  } = req.body;

  if (!business_id || !name) {
    return res.status(400).json({ error: "business_id y name obligatorios" });
  }

  const stmt = db.prepare(`
    INSERT INTO products (
      id, business_id, name, description, tag, ingredients, removable_ingredients,
      additional_ingredients, price_cents, image_url, category_id, tax_percentage,
      is_available, allergens
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const productId = id || `prod-${Date.now()}`;
  stmt.run(
    productId,
    business_id,
    name,
    description || "",
    tag || "",
    Array.isArray(ingredients)
      ? JSON.stringify(ingredients)
      : ingredients || "[]",
    Array.isArray(removable_ingredients)
      ? JSON.stringify(removable_ingredients)
      : removable_ingredients || "[]",
    Array.isArray(additional_ingredients)
      ? JSON.stringify(additional_ingredients)
      : additional_ingredients || "[]",
    Number(price_cents || 0),
    image_url || "",
    category_id || "general",
    Number(tax_percentage || 0),
    Number(is_available ?? 1),
    Array.isArray(allergens) ? JSON.stringify(allergens) : allergens || "[]",
  );

  res.status(201).json({ id: productId, success: true });
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
      database: DB_PATH,
    });
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`PideTiétar backend running on http://0.0.0.0:${PORT}`);
  console.log(`SQLite DB ready at ${DB_PATH}`);
});
