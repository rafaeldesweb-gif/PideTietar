/**
 * seed-data.mjs
 * Seed completo para PideTietar — Valle del Tiétar
 *
 * Inserta (sin duplicar):
 *   • categories       — 10 categorías de negocio
 *   • localities       — 5 municipios del Valle del Tiétar
 *   • businesses       — 25 negocios (5 por localidad)
 *   • business_categories — relación negocio↔categoría
 *   • business_hours   — horarios semanales
 *   • products         — ≥ 5 productos por negocio
 *
 * Uso:   node scripts/seed-data.mjs
 * O bien: npm run db:seed (si lo mapeas en package.json)
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// 1. CONEXIÓN
// ---------------------------------------------------------------------------
async function getPool() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 5,
    charset: "utf8mb4",
    ssl: { rejectUnauthorized: false },
  });
  const conn = await pool.getConnection();
  await conn.query("SELECT 1");
  conn.release();
  console.log("✅ Conexión MySQL establecida");
  return pool;
}

// ---------------------------------------------------------------------------
// 2. HELPERS
// ---------------------------------------------------------------------------
const uid = () => uuidv4();

async function upsertCategory(pool, { id, name, slug, icon_name, image_url }) {
  await pool.execute(
    `INSERT INTO categories (id, name, slug, icon_name, image_url)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), icon_name = VALUES(icon_name)`,
    [id, name, slug, icon_name, image_url]
  );
  return id;
}

async function upsertLocality(pool, { id, name, postal_code, latitude, longitude }) {
  await pool.execute(
    `INSERT INTO localities (id, name, postal_code, latitude, longitude, is_active)
     VALUES (?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [id, name, postal_code, latitude, longitude]
  );
  return id;
}

async function upsertBusiness(pool, b) {
  await pool.execute(
    `INSERT INTO businesses (
       id, locality_id, name, legal_name, cif, phone, email, address,
       latitude, longitude, rating, review_count,
       estimated_time_min, estimated_time_max,
       delivery_fee_cents, min_order_cents,
       banner_url, logo_url,
       is_shift_open, delivery_modes, delivery_radius_km, status
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status)`,
    [
      b.id, b.locality_id, b.name, b.legal_name, b.cif, b.phone, b.email, b.address,
      b.latitude, b.longitude, b.rating, b.review_count,
      b.estimated_time_min, b.estimated_time_max,
      b.delivery_fee_cents, b.min_order_cents,
      b.banner_url, b.logo_url,
      b.is_shift_open ? 1 : 0,
      JSON.stringify(b.delivery_modes),
      b.delivery_radius_km,
      b.status,
    ]
  );
  return b.id;
}

async function upsertBusinessCategory(pool, businessId, categoryId, isPrimary) {
  await pool.execute(
    `INSERT INTO business_categories (id, business_id, category_id, is_primary)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary)`,
    [uid(), businessId, categoryId, isPrimary ? 1 : 0]
  );
}

async function upsertHours(pool, businessId, hours) {
  for (const h of hours) {
    await pool.execute(
      `INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_open)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE open_time = VALUES(open_time), close_time = VALUES(close_time), is_open = VALUES(is_open)`,
      [uid(), businessId, h.day, h.open ?? null, h.close ?? null, h.is_open ? 1 : 0]
    );
  }
}

async function upsertProduct(pool, p) {
  await pool.execute(
    `INSERT INTO products (
       id, business_id, category_id, name, description, tag,
       ingredients, allergens, price_cents, tax_percentage,
       image_url, is_available, is_sold_out,
       removable_ingredients, additional_ingredients
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), price_cents = VALUES(price_cents)`,
    [
      p.id, p.business_id, p.category_id, p.name, p.description ?? null, p.tag ?? null,
      JSON.stringify(p.ingredients ?? []),
      JSON.stringify(p.allergens ?? []),
      p.price_cents, p.tax_percentage ?? 10,
      p.image_url ?? null,
      p.is_available !== false ? 1 : 0,
      p.is_sold_out ? 1 : 0,
      JSON.stringify(p.removable_ingredients ?? []),
      JSON.stringify(p.additional_ingredients ?? []),
    ]
  );
}

// Horario estándar: lun–vie 09–22, sáb 10–23, dom cerrado
function stdHours(openSat = true, openSun = false) {
  return [
    { day: 0, open: "10:00", close: "22:00", is_open: openSun },  // domingo
    { day: 1, open: "09:00", close: "22:00", is_open: true },      // lunes
    { day: 2, open: "09:00", close: "22:00", is_open: true },
    { day: 3, open: "09:00", close: "22:00", is_open: true },
    { day: 4, open: "09:00", close: "22:00", is_open: true },
    { day: 5, open: "09:00", close: "22:00", is_open: true },      // viernes
    { day: 6, open: "10:00", close: "23:00", is_open: openSat },   // sábado
  ];
}

// Horario bar/restaurante: cerrado lunes, resto abierto
function barHours() {
  return [
    { day: 0, open: "12:00", close: "24:00", is_open: true },
    { day: 1, open: null, close: null, is_open: false },
    { day: 2, open: "13:00", close: "23:00", is_open: true },
    { day: 3, open: "13:00", close: "23:00", is_open: true },
    { day: 4, open: "13:00", close: "23:00", is_open: true },
    { day: 5, open: "13:00", close: "24:00", is_open: true },
    { day: 6, open: "12:00", close: "24:00", is_open: true },
  ];
}

// ---------------------------------------------------------------------------
// 3. DATOS — CATEGORÍAS
// ---------------------------------------------------------------------------
const CAT = {
  restaurante:  { id: uid(), name: "Restaurante",        slug: "restaurante",        icon_name: "UtensilsCrossed", image_url: null },
  bar:          { id: uid(), name: "Bar & Tapas",         slug: "bar-tapas",          icon_name: "Beer",            image_url: null },
  panaderia:    { id: uid(), name: "Panadería",           slug: "panaderia",          icon_name: "Croissant",       image_url: null },
  carniceria:   { id: uid(), name: "Carnicería",          slug: "carniceria",         icon_name: "Beef",            image_url: null },
  fruteria:     { id: uid(), name: "Frutería",            slug: "fruteria",           icon_name: "Apple",           image_url: null },
  supermercado: { id: uid(), name: "Supermercado",        slug: "supermercado",       icon_name: "ShoppingCart",    image_url: null },
  farmacia:     { id: uid(), name: "Farmacia",            slug: "farmacia",           icon_name: "Plus",            image_url: null },
  papeleria:    { id: uid(), name: "Papelería",           slug: "papeleria",          icon_name: "Newspaper",       image_url: null },
  ferreteria:   { id: uid(), name: "Ferretería",          slug: "ferreteria",         icon_name: "Wrench",          image_url: null },
  flores:       { id: uid(), name: "Flores & Regalos",   slug: "flores-regalos",     icon_name: "Flower2",         image_url: null },
};

// ---------------------------------------------------------------------------
// 4. DATOS — LOCALIDADES (5 municipios del Valle del Tiétar)
// ---------------------------------------------------------------------------
const LOC = {
  sotillo:   { id: uid(), name: "Sotillo de la Adrada", postal_code: "05420", latitude: 40.2891, longitude: -4.5824 },
  arenas:    { id: uid(), name: "Arenas de San Pedro",  postal_code: "05400", latitude: 40.2097, longitude: -5.0878 },
  candeleda: { id: uid(), name: "Candeleda",             postal_code: "05480", latitude: 40.1548, longitude: -5.2424 },
  mombeltrán:{ id: uid(), name: "Mombeltrán",            postal_code: "05410", latitude: 40.2478, longitude: -4.9622 },
  lanzahita: { id: uid(), name: "Lanzahita",             postal_code: "05430", latitude: 40.2386, longitude: -4.8024 },
};

// ---------------------------------------------------------------------------
// 5. DATOS — NEGOCIOS (25 = 5 por localidad)
// ---------------------------------------------------------------------------

// Fotos de Unsplash (libres, con ?w=400&auto=format&fit=crop&q=80)
const IMGS = {
  panaderia:    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
  carniceria:   "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&auto=format&fit=crop&q=80",
  bar:          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80",
  restaurante:  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80",
  supermercado: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80",
  farmacia:     "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=800&auto=format&fit=crop&q=80",
  fruteria:     "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80",
  ferreteria:   "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&auto=format&fit=crop&q=80",
  papeleria:    "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=800&auto=format&fit=crop&q=80",
  flores:       "https://images.unsplash.com/photo-1487530811015-780b20ef51a0?w=800&auto=format&fit=crop&q=80",
  logo_generic: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&auto=format&fit=crop&q=80",
};

function biz(overrides) {
  return {
    id: uid(),
    legal_name: null,
    cif: null,
    phone: "+34600000000",
    email: null,
    rating: (Math.random() * 1.5 + 3.5).toFixed(2),
    review_count: Math.floor(Math.random() * 200 + 10),
    estimated_time_min: 20,
    estimated_time_max: 45,
    delivery_fee_cents: 150,
    min_order_cents: 800,
    is_shift_open: true,
    delivery_modes: ["DELIVERY", "PICKUP"],
    delivery_radius_km: 5,
    status: "APPROVED",
    logo_url: IMGS.logo_generic,
    ...overrides,
  };
}

const BUSINESSES = [
  // ── SOTILLO DE LA ADRADA ──────────────────────────────────────────────────
  biz({
    locality_id: LOC.sotillo.id,
    name: "Panadería La Adrada",
    email: "panaderia.adrada@pidetietar.es",
    address: "Calle Mayor 12, Sotillo de la Adrada",
    latitude: 40.2888, longitude: -4.5835,
    banner_url: IMGS.panaderia,
    categories: [{ cat: "panaderia", primary: true }],
    hours: stdHours(true, false),
    products: [
      { name: "Barra de pan rústico",    price_cents: 140,  description: "Pan artesano de masa madre con corteza crujiente",           tag: "POPULAR" },
      { name: "Pan de centeno",           price_cents: 280,  description: "Hogazas de centeno, densa y nutritiva" },
      { name: "Croissant mantequilla",    price_cents: 155,  description: "Croissant hojaldrado con mantequilla francesa" },
      { name: "Empanada de atún",         price_cents: 390,  description: "Empanada casera grande, rellena de atún y pimiento" },
      { name: "Roscón de nata",           price_cents: 220,  description: "Roscón esponjoso relleno de nata montada" },
      { name: "Tarta de manzana (ración)",price_cents: 310,  description: "Tarta casera de manzana caramelizada" },
    ],
  }),
  biz({
    locality_id: LOC.sotillo.id,
    name: "Carnicería El Valle",
    email: "carniceria.el.valle@pidetietar.es",
    address: "Plaza de España 3, Sotillo de la Adrada",
    latitude: 40.2895, longitude: -4.5820,
    banner_url: IMGS.carniceria,
    categories: [{ cat: "carniceria", primary: true }],
    hours: stdHours(true, false),
    products: [
      { name: "Secreto ibérico (kg)",     price_cents: 1890, description: "Secreto de cerdo ibérico de bellota, ideal a la brasa",     tag: "PREMIUM" },
      { name: "Chuletas de cordero (kg)", price_cents: 1650, description: "Cordero churro del Valle del Tiétar" },
      { name: "Pechuga de pollo (kg)",    price_cents: 680,  description: "Pollo de corral, sin antibióticos" },
      { name: "Hamburguesas caseras x4",  price_cents: 890,  description: "Mezcla de ternera y cerdo ibérico, 150 g c/u",              tag: "POPULAR" },
      { name: "Chorizo fresco (kg)",      price_cents: 950,  description: "Chorizo fresco con pimentón de la Vera" },
      { name: "Morcilla de arroz (kg)",   price_cents: 820,  description: "Morcilla tradicional abulense al estilo antiguo" },
    ],
  }),
  biz({
    locality_id: LOC.sotillo.id,
    name: "Bar Los Arrayanes",
    email: "bar.arrayanes@pidetietar.es",
    address: "Avenida de la Constitución 5, Sotillo de la Adrada",
    latitude: 40.2900, longitude: -4.5810,
    banner_url: IMGS.bar,
    delivery_fee_cents: 200,
    min_order_cents: 1200,
    categories: [{ cat: "bar", primary: true }],
    hours: barHours(),
    products: [
      { name: "Tapa de jamón ibérico",    price_cents: 450,  description: "Lonchas de jamón puro ibérico con pan tostado",            tag: "POPULAR" },
      { name: "Croquetas de cocido (6u)", price_cents: 680,  description: "Croquetas cremosas de cocido madrileño" },
      { name: "Patatas bravas",           price_cents: 530,  description: "Con salsa brava casera y all-i-oli" },
      { name: "Bocadillo de lomo",        price_cents: 590,  description: "Lomo a la plancha con tomate y pimientos" },
      { name: "Raciones de puntillitas",  price_cents: 890,  description: "Puntillitas fritas con limón, crujientes" },
      { name: "Tosta de queso de cabra",  price_cents: 480,  description: "Con miel de la sierra y nueces" },
    ],
  }),
  biz({
    locality_id: LOC.sotillo.id,
    name: "Frutería Naturales del Tiétar",
    email: "fruteria.tietar@pidetietar.es",
    address: "Calle Gredos 8, Sotillo de la Adrada",
    latitude: 40.2882, longitude: -4.5845,
    banner_url: IMGS.fruteria,
    categories: [{ cat: "fruteria", primary: true }],
    hours: stdHours(true, false),
    products: [
      { name: "Cerezas del Jerte (kg)",   price_cents: 490,  description: "Cerezas premium IGP del Valle del Jerte, temporada",       tag: "TEMPORADA" },
      { name: "Pimientos del piquillo (kg)",price_cents:380, description: "Pimientos rojos locales, ideales para asar" },
      { name: "Peras conferencia (kg)",   price_cents: 280,  description: "Peras jugosas de temporada" },
      { name: "Cesta de verdura semanal", price_cents: 1490, description: "5 kg de verdura variada de temporada, km 0",               tag: "POPULAR" },
      { name: "Tomates de ensalada (kg)", price_cents: 220,  description: "Tomates de campo, maduros y sabrosos" },
      { name: "Sandía entera",            price_cents: 590,  description: "Sandía de la zona, 6–8 kg aprox." },
    ],
  }),
  biz({
    locality_id: LOC.sotillo.id,
    name: "Farmacia Sotillo",
    email: "farmacia.sotillo@pidetietar.es",
    address: "Calle Real 1, Sotillo de la Adrada",
    latitude: 40.2878, longitude: -4.5818,
    banner_url: IMGS.farmacia,
    delivery_fee_cents: 0,
    min_order_cents: 500,
    categories: [{ cat: "farmacia", primary: true }],
    hours: [
      { day: 0, open: null, close: null, is_open: false },
      { day: 1, open: "09:30", close: "14:00", is_open: true },
      { day: 2, open: "09:30", close: "14:00", is_open: true },
      { day: 3, open: "09:30", close: "21:00", is_open: true },
      { day: 4, open: "09:30", close: "14:00", is_open: true },
      { day: 5, open: "09:30", close: "14:00", is_open: true },
      { day: 6, open: "10:00", close: "13:00", is_open: true },
    ],
    products: [
      { name: "Paracetamol 650 mg (20 comp)", price_cents: 280, description: "Analgésico y antipirético sin receta" },
      { name: "Ibuprofeno 400 mg (20 comp)",  price_cents: 310, description: "Antiinflamatorio de uso común" },
      { name: "Protector solar SPF 50",        price_cents: 1190, description: "Crema solar facial y corporal, 200 ml",                tag: "POPULAR" },
      { name: "Vitamina C 1000 mg (30 comp)", price_cents: 890, description: "Suplemento vitamínico efervescente" },
      { name: "Mascarilla FFP2 (caja 25u)",   price_cents: 1490, description: "Mascarillas certificadas CE" },
      { name: "Termómetro digital",            price_cents: 1290, description: "Termómetro axilar/oral de alta precisión" },
    ],
  }),

  // ── ARENAS DE SAN PEDRO ───────────────────────────────────────────────────
  biz({
    locality_id: LOC.arenas.id,
    name: "Restaurante El Castillo",
    email: "restaurante.castillo@pidetietar.es",
    address: "Plaza del Castillo 2, Arenas de San Pedro",
    latitude: 40.2085, longitude: -5.0872,
    banner_url: IMGS.restaurante,
    delivery_fee_cents: 250,
    min_order_cents: 2000,
    estimated_time_min: 30,
    estimated_time_max: 60,
    rating: 4.7,
    review_count: 312,
    categories: [{ cat: "restaurante", primary: true }, { cat: "bar", primary: false }],
    hours: barHours(),
    products: [
      { name: "Cocido maragato (menú)", price_cents: 1490, description: "Cocido tradicional de la zona, servido en tres vuelcos",    tag: "POPULAR" },
      { name: "Truchas del Tiétar a la plancha", price_cents: 1290, description: "Trucha fresca de río con almendras y jamón" },
      { name: "Churrasco mixto (2 pax)", price_cents: 2890, description: "Parrillada de carnes ibéricas con patatas" },
      { name: "Gazpacho de temporada",  price_cents: 490,  description: "Gazpacho andaluz casero, 400 ml" },
      { name: "Porra antequerana",      price_cents: 580,  description: "Sopa fría espesa con jamón y huevo duro" },
      { name: "Mousse de chocolate negro", price_cents: 420, description: "Postre artesano con cacao 70 %" },
      { name: "Tabla de quesos de Ávila", price_cents: 980, description: "Selección de quesos abulenses con mermelada" },
    ],
  }),
  biz({
    locality_id: LOC.arenas.id,
    name: "Supermercado Arenas",
    email: "super.arenas@pidetietar.es",
    address: "Avenida Triste Condesa 15, Arenas de San Pedro",
    latitude: 40.2102, longitude: -5.0855,
    banner_url: IMGS.supermercado,
    delivery_fee_cents: 200,
    min_order_cents: 1500,
    categories: [{ cat: "supermercado", primary: true }],
    hours: stdHours(true, true),
    products: [
      { name: "Leche entera (6 litros)",     price_cents: 690,  description: "Pack de 6 x 1 L de leche entera UHT" },
      { name: "Aceite de oliva virgen extra (1 L)", price_cents: 890, description: "AOVE andaluz, acidez < 0.4" },
      { name: "Pasta surtido (5 x 500 g)",   price_cents: 450,  description: "Pasta italiana variada: spaghetti, penne, fusilli" },
      { name: "Café molido (500 g)",          price_cents: 590,  description: "Mezcla 80/20 tueste natural",                           tag: "POPULAR" },
      { name: "Detergente líquido (3 L)",     price_cents: 890,  description: "Detergente concentrado para ropa" },
      { name: "Agua mineral (6 x 1.5 L)",     price_cents: 380,  description: "Agua de manantial de los Pirineos" },
      { name: "Cerveza artesana local (6u)",  price_cents: 1090, description: "Cervezas artesanas de Ávila, pack 6 x 33 cl" },
    ],
  }),
  biz({
    locality_id: LOC.arenas.id,
    name: "Panadería Tradición Arenense",
    email: "panaderia.arenas@pidetietar.es",
    address: "Calle San Pedro 7, Arenas de San Pedro",
    latitude: 40.2090, longitude: -5.0890,
    banner_url: IMGS.panaderia,
    categories: [{ cat: "panaderia", primary: true }],
    hours: [
      { day: 0, open: "08:00", close: "13:00", is_open: true },
      { day: 1, open: "07:30", close: "14:00", is_open: true },
      { day: 2, open: "07:30", close: "14:00", is_open: true },
      { day: 3, open: "07:30", close: "14:00", is_open: true },
      { day: 4, open: "07:30", close: "14:00", is_open: true },
      { day: 5, open: "07:30", close: "14:00", is_open: true },
      { day: 6, open: "08:00", close: "14:00", is_open: true },
    ],
    products: [
      { name: "Hogaza de pueblo (1 kg)",  price_cents: 320,  description: "Pan de pueblo de leña con corteza gruesa",                tag: "POPULAR" },
      { name: "Molletes (6 u)",           price_cents: 280,  description: "Molletes tiernos para el desayuno" },
      { name: "Torta de chicharrones",    price_cents: 490,  description: "Torta plana con chicharrón de cerdo ibérico" },
      { name: "Pan de aceite y romero",   price_cents: 240,  description: "Panecillos con AOVE y romero fresco" },
      { name: "Magdalenas caseras (12u)", price_cents: 380,  description: "Magdalenas de limón esponjosas" },
    ],
  }),
  biz({
    locality_id: LOC.arenas.id,
    name: "Flores y Detalles Arenas",
    email: "flores.arenas@pidetietar.es",
    address: "Calle Triana 4, Arenas de San Pedro",
    latitude: 40.2078, longitude: -5.0865,
    banner_url: IMGS.flores,
    delivery_fee_cents: 300,
    min_order_cents: 1500,
    categories: [{ cat: "flores", primary: true }],
    hours: stdHours(true, false),
    products: [
      { name: "Ramo de rosas rojas (12u)", price_cents: 2490, description: "Rosas premium de tallo largo",                           tag: "POPULAR" },
      { name: "Centro de flores mixtas",   price_cents: 1890, description: "Centro con flores de temporada, colorido" },
      { name: "Planta de cactus decorativa", price_cents: 890, description: "Cactus en maceta de cerámica artesana" },
      { name: "Ramo de girasoles (6u)",    price_cents: 1490, description: "Girasoles frescos con lazo decorativo" },
      { name: "Cesta regalo con flores",   price_cents: 3490, description: "Flores + bombones + vela aromática",                     tag: "ESPECIAL" },
    ],
  }),
  biz({
    locality_id: LOC.arenas.id,
    name: "Bar Taberna El Risquillo",
    email: "taberna.risquillo@pidetietar.es",
    address: "Calle Cervantes 11, Arenas de San Pedro",
    latitude: 40.2110, longitude: -5.0840,
    banner_url: IMGS.bar,
    delivery_fee_cents: 200,
    min_order_cents: 1000,
    categories: [{ cat: "bar", primary: true }],
    hours: barHours(),
    products: [
      { name: "Pincho de morcilla ibérica", price_cents: 280, description: "Morcilla de la Vera sobre pan tostado" },
      { name: "Ración de tortilla española", price_cents: 790, description: "Tortilla jugosa de patata y cebolla",                   tag: "POPULAR" },
      { name: "Bocadillo de calamares",     price_cents: 690,  description: "Calamares fritos en baguette con limón" },
      { name: "Jamón serrano (tabla)",      price_cents: 1290, description: "Tabla de jamón serrano con olivas y queso" },
      { name: "Ración de oreja a la plancha",price_cents: 890, description: "Oreja crujiente con pimentón y limón" },
    ],
  }),

  // ── CANDELEDA ─────────────────────────────────────────────────────────────
  biz({
    locality_id: LOC.candeleda.id,
    name: "Restaurante El Pimiento de Candeleda",
    email: "rest.pimiento@pidetietar.es",
    address: "Calle Pizarro 3, Candeleda",
    latitude: 40.1545, longitude: -5.2430,
    banner_url: IMGS.restaurante,
    delivery_fee_cents: 250,
    min_order_cents: 1800,
    rating: 4.8,
    review_count: 428,
    categories: [{ cat: "restaurante", primary: true }],
    hours: barHours(),
    products: [
      { name: "Pimientos del piquillo rellenos de bacalao", price_cents: 1190, description: "Especialidad local con salsa de marisco", tag: "POPULAR" },
      { name: "Carrilladas ibéricas estofadas", price_cents: 1490, description: "Carrilladas melosas con puré de patata trufado" },
      { name: "Ensalada de tomate y mozzarella", price_cents: 790, description: "Con AOVE de Candeleda y albahaca fresca" },
      { name: "Migas extremeñas",          price_cents: 880,  description: "Migas con chorizo, pimientos y uvas" },
      { name: "Judías del Barco con oreja", price_cents: 1290, description: "Judías blancas IGP con oreja de cerdo" },
      { name: "Flan de huevo casero",       price_cents: 390,  description: "Flan cremoso con caramelo" },
    ],
  }),
  biz({
    locality_id: LOC.candeleda.id,
    name: "Carnicería La Vera",
    email: "carniceria.vera@pidetietar.es",
    address: "Avenida Extremadura 8, Candeleda",
    latitude: 40.1552, longitude: -5.2415,
    banner_url: IMGS.carniceria,
    categories: [{ cat: "carniceria", primary: true }],
    hours: stdHours(true, false),
    products: [
      { name: "Ibérico de bellota (kg)",   price_cents: 2490, description: "Lomo ibérico de bellota 100 %",                         tag: "PREMIUM" },
      { name: "Pollo entero (und)",        price_cents: 990,  description: "Pollo de corral de la zona, ~2 kg" },
      { name: "Costillas de cerdo (kg)",   price_cents: 890,  description: "Costillas de cerdo largo para asar" },
      { name: "Pavo en filetes (kg)",      price_cents: 750,  description: "Filetes de pavo frescos, sin piel" },
      { name: "Pincho moruno (6u)",        price_cents: 690,  description: "Pinchos marinados con especias del Valle" },
      { name: "Chistorra navarra (250 g)", price_cents: 490,  description: "Chistorra fresca para la sartén" },
    ],
  }),
  biz({
    locality_id: LOC.candeleda.id,
    name: "Panadería San Andrés",
    email: "panaderia.sanandres@pidetietar.es",
    address: "Plaza de la Iglesia 1, Candeleda",
    latitude: 40.1540, longitude: -5.2440,
    banner_url: IMGS.panaderia,
    categories: [{ cat: "panaderia", primary: true }],
    hours: [
      { day: 0, open: "08:00", close: "13:00", is_open: true },
      { day: 1, open: "07:00", close: "13:30", is_open: true },
      { day: 2, open: "07:00", close: "13:30", is_open: true },
      { day: 3, open: "07:00", close: "13:30", is_open: true },
      { day: 4, open: "07:00", close: "13:30", is_open: true },
      { day: 5, open: "07:00", close: "13:30", is_open: true },
      { day: 6, open: "08:00", close: "14:00", is_open: true },
    ],
    products: [
      { name: "Pan de pueblo (800 g)",     price_cents: 260,  description: "Pan artesano de horno de leña",                          tag: "POPULAR" },
      { name: "Bollos de mantequilla (6u)",price_cents: 320,  description: "Bollos suizos con mantequilla y azúcar" },
      { name: "Empanada de pimientos",     price_cents: 490,  description: "Con pimientos de Candeleda asados" },
      { name: "Bizcocho de yogur",         price_cents: 420,  description: "Bizcocho casero de yogur con limón" },
      { name: "Pan de espelta integral",   price_cents: 380,  description: "Hogaza de espelta sin aditivos" },
    ],
  }),
  biz({
    locality_id: LOC.candeleda.id,
    name: "Supermercado La Cruz",
    email: "super.lacruz@pidetietar.es",
    address: "Calle Cruz 6, Candeleda",
    latitude: 40.1558, longitude: -5.2408,
    banner_url: IMGS.supermercado,
    delivery_fee_cents: 180,
    min_order_cents: 1200,
    categories: [{ cat: "supermercado", primary: true }],
    hours: stdHours(true, true),
    products: [
      { name: "Tomate frito casero (jar)",  price_cents: 280, description: "Bote de tomate frito casero 500 ml" },
      { name: "Jamón serrano (200 g)",      price_cents: 490, description: "Loncheado al vacío, curación 12 meses" },
      { name: "Queso manchego curado (wedge)", price_cents: 680, description: "Cuña 200 g de queso manchego DO",                    tag: "POPULAR" },
      { name: "Vino tinto Ribera (botella)", price_cents: 890, description: "Ribera del Duero joven, maridaje perfecto" },
      { name: "Aceitunas rellenas (250 g)", price_cents: 220, description: "Aceitunas manzanilla rellenas de anchoa" },
      { name: "Arroz bomba (kg)",           price_cents: 290, description: "Arroz valenciano extra para paellas" },
    ],
  }),
  biz({
    locality_id: LOC.candeleda.id,
    name: "Papelería La Jara",
    email: "papeleria.lajara@pidetietar.es",
    address: "Calle Real 14, Candeleda",
    latitude: 40.1538, longitude: -5.2445,
    banner_url: IMGS.papeleria,
    delivery_fee_cents: 150,
    min_order_cents: 500,
    categories: [{ cat: "papeleria", primary: true }],
    hours: stdHours(true, false),
    products: [
      { name: "Pack cuadernos A4 (5u)",    price_cents: 690, description: "Cuadernos rayados de 80 páginas" },
      { name: "Bolígrafos BIC (caja 20u)", price_cents: 490, description: "Bolígrafos azules, negro y rojo surtidos" },
      { name: "Rotuladores Stabilo (12u)", price_cents: 890, description: "Set de marcadores fluorescentes de colores",              tag: "POPULAR" },
      { name: "Cello (6 rollos)",          price_cents: 380, description: "Celo transparente 19 mm x 33 m" },
      { name: "Cartulina colores (50 h)",  price_cents: 590, description: "Cartulinas A4 en 10 colores distintos" },
    ],
  }),

  // ── MOMBELTRÁN ────────────────────────────────────────────────────────────
  biz({
    locality_id: LOC.mombeltrán.id,
    name: "Bar Las Murallas",
    email: "bar.murallas@pidetietar.es",
    address: "Plaza del Castillo 1, Mombeltrán",
    latitude: 40.2472, longitude: -4.9630,
    banner_url: IMGS.bar,
    delivery_fee_cents: 200,
    min_order_cents: 1000,
    categories: [{ cat: "bar", primary: true }],
    hours: barHours(),
    products: [
      { name: "Albóndigas en salsa de tomate (6u)", price_cents: 780, description: "Albóndigas de ternera y cerdo con salsa casera", tag: "POPULAR" },
      { name: "Tosta de anchoas y tomate",   price_cents: 390, description: "Anchoas del Cantábrico sobre tosta con tomate" },
      { name: "Oreja estofada (ración)",     price_cents: 850, description: "Guiso de oreja de cerdo con laurel y vino" },
      { name: "Bocata de tortilla",          price_cents: 580, description: "Tortilla española en baguette" },
      { name: "Croquetas de jamón (8u)",     price_cents: 750, description: "Cremosas con jamón ibérico" },
    ],
  }),
  biz({
    locality_id: LOC.mombeltrán.id,
    name: "Ferretería Serrana",
    email: "ferreteria.serrana@pidetietar.es",
    address: "Calle Empedrada 9, Mombeltrán",
    latitude: 40.2480, longitude: -4.9615,
    banner_url: IMGS.ferreteria,
    delivery_fee_cents: 300,
    min_order_cents: 1000,
    categories: [{ cat: "ferreteria", primary: true }],
    hours: stdHours(true, false),
    products: [
      { name: "Juego de destornilladores (6u)", price_cents: 1290, description: "Set Phillips + plano, mango softgrip",              tag: "POPULAR" },
      { name: "Cinta aislante (5u)",        price_cents: 590, description: "Pack de 5 rollos de cinta aislante negra" },
      { name: "Bombilla LED E27 (4u)",      price_cents: 890, description: "Bombillas LED 9W = 60W equivalente" },
      { name: "Alargador 5 m (3 enchufes)", price_cents: 1490, description: "Alargador con toma de tierra y protección" },
      { name: "Pistola de silicona",        price_cents: 1190, description: "Pistola para cartuchos de silicona neutros" },
    ],
  }),
  biz({
    locality_id: LOC.mombeltrán.id,
    name: "Panadería El Horno del Duque",
    email: "panaderia.duque@pidetietar.es",
    address: "Calle del Horno 3, Mombeltrán",
    latitude: 40.2465, longitude: -4.9640,
    banner_url: IMGS.panaderia,
    categories: [{ cat: "panaderia", primary: true }],
    hours: [
      { day: 0, open: null, close: null, is_open: false },
      { day: 1, open: "07:30", close: "13:30", is_open: true },
      { day: 2, open: "07:30", close: "13:30", is_open: true },
      { day: 3, open: "07:30", close: "13:30", is_open: true },
      { day: 4, open: "07:30", close: "13:30", is_open: true },
      { day: 5, open: "07:30", close: "13:30", is_open: true },
      { day: 6, open: "08:00", close: "13:00", is_open: true },
    ],
    products: [
      { name: "Pan de mesa largo",         price_cents: 110,  description: "Barra larga artesana de corteza dorada",                tag: "POPULAR" },
      { name: "Bollo relleno de crema",    price_cents: 180,  description: "Bollo esponjoso con crema pastelera" },
      { name: "Roscas de anís",            price_cents: 250,  description: "Roscas dulces artesanas con anís" },
      { name: "Pan sin gluten (400 g)",    price_cents: 390,  description: "Pan apto celíacos, sin trazas de gluten" },
      { name: "Palmeritas de hojaldre",    price_cents: 140,  description: "Palmeras crujientes recién hechas" },
    ],
  }),
  biz({
    locality_id: LOC.mombeltrán.id,
    name: "Frutería El Nogal",
    email: "fruteria.elnogal@pidetietar.es",
    address: "Calle Bajada 5, Mombeltrán",
    latitude: 40.2490, longitude: -4.9605,
    banner_url: IMGS.fruteria,
    categories: [{ cat: "fruteria", primary: true }],
    hours: stdHours(false, false),
    products: [
      { name: "Nueces del Jerte (kg)",     price_cents: 890, description: "Nueces frescas de la zona sin cáscara" },
      { name: "Manzanas reinetas (kg)",    price_cents: 280, description: "Manzanas ácidas ideales para cocinar",                   tag: "POPULAR" },
      { name: "Pimientos de Padrón (250g)",price_cents: 290, description: "Los de Padrón: unos pican y otros no" },
      { name: "Espárragos blancos (manojo)",price_cents: 490, description: "Espárragos frescos de temporada, 500 g" },
      { name: "Naranjas zumo (kg)",        price_cents: 240, description: "Naranjas valencianas de huerta propia" },
    ],
  }),
  biz({
    locality_id: LOC.mombeltrán.id,
    name: "Restaurante Ávila Rural",
    email: "rest.avilarural@pidetietar.es",
    address: "Calle Sierra 2, Mombeltrán",
    latitude: 40.2476, longitude: -4.9625,
    banner_url: IMGS.restaurante,
    delivery_fee_cents: 300,
    min_order_cents: 2000,
    estimated_time_min: 35,
    estimated_time_max: 65,
    rating: 4.6,
    review_count: 189,
    categories: [{ cat: "restaurante", primary: true }],
    hours: barHours(),
    products: [
      { name: "Chuletón de ternera abulense", price_cents: 2890, description: "Chuletón 600 g de ternera Ávila DO, a la brasa",    tag: "PREMIUM" },
      { name: "Sopa de ajo castellana",    price_cents: 690,  description: "Sopa de ajo con huevo escalfado y jamón" },
      { name: "Revuelto de setas y jamón", price_cents: 1090, description: "Con setas de temporada de la sierra" },
      { name: "Cochinillo asado (ración)", price_cents: 1890, description: "Un cuarto de cochinillo, piel crujiente" },
      { name: "Arroz cremoso con trufa",   price_cents: 1490, description: "Con queso parmesano y trufa negra de temporada" },
      { name: "Coulant de chocolate",      price_cents: 490,  description: "Con interior líquido y helado de vainilla" },
    ],
  }),

  // ── LANZAHITA ─────────────────────────────────────────────────────────────
  biz({
    locality_id: LOC.lanzahita.id,
    name: "Bar El Puente",
    email: "bar.elpuente@pidetietar.es",
    address: "Calle del Río 1, Lanzahita",
    latitude: 40.2380, longitude: -4.8030,
    banner_url: IMGS.bar,
    delivery_fee_cents: 180,
    min_order_cents: 900,
    categories: [{ cat: "bar", primary: true }],
    hours: barHours(),
    products: [
      { name: "Bocadillo de jamón y tomate", price_cents: 480, description: "Pa amb tomàquet con jamón ibérico",                    tag: "POPULAR" },
      { name: "Pincho de lomo con pimiento", price_cents: 290, description: "Lomo de cerdo a la plancha con pimiento rojo" },
      { name: "Tortilla de patatas (ración)",price_cents: 690, description: "Tortilla española a punto de cuajado" },
      { name: "Chorizo al vino (ración)",    price_cents: 780, description: "Chorizo guisado en vino tinto local" },
      { name: "Migas de pastor",             price_cents: 880, description: "Migas con chorizo, tocino y manzana" },
    ],
  }),
  biz({
    locality_id: LOC.lanzahita.id,
    name: "Carnicería El Tiétar",
    email: "carniceria.tietar@pidetietar.es",
    address: "Plaza Mayor 4, Lanzahita",
    latitude: 40.2388, longitude: -4.8018,
    banner_url: IMGS.carniceria,
    categories: [{ cat: "carniceria", primary: true }],
    hours: stdHours(true, false),
    products: [
      { name: "Chuletas de cerdo (kg)",    price_cents: 790, description: "Chuletas de palo de cerdo blanco, frescas" },
      { name: "Ternera para guiso (kg)",   price_cents: 1290, description: "Dados de ternera para cocinar en salsa" },
      { name: "Conejo entero (und)",       price_cents: 890, description: "Conejo de granja local, limpio y troceado",              tag: "POPULAR" },
      { name: "Salchicha fresca (kg)",     price_cents: 680, description: "Salchicha fresca de cerdo con especias" },
      { name: "Panceta curada (200 g)",    price_cents: 390, description: "Panceta curada en sal propia para freír" },
    ],
  }),
  biz({
    locality_id: LOC.lanzahita.id,
    name: "Farmacia Lanzahita",
    email: "farmacia.lanzahita@pidetietar.es",
    address: "Calle Grande 9, Lanzahita",
    latitude: 40.2395, longitude: -4.8010,
    banner_url: IMGS.farmacia,
    delivery_fee_cents: 0,
    min_order_cents: 500,
    categories: [{ cat: "farmacia", primary: true }],
    hours: [
      { day: 0, open: null, close: null, is_open: false },
      { day: 1, open: "09:30", close: "14:00", is_open: true },
      { day: 2, open: "09:30", close: "14:00", is_open: true },
      { day: 3, open: "09:30", close: "14:00", is_open: true },
      { day: 4, open: "09:30", close: "14:00", is_open: true },
      { day: 5, open: "09:30", close: "14:00", is_open: true },
      { day: 6, open: "10:00", close: "13:00", is_open: true },
    ],
    products: [
      { name: "Crema hidratante facial (50ml)", price_cents: 890, description: "Con factor solar SPF 15 y vitamina E" },
      { name: "Probióticos (30 cáp)",       price_cents: 1490, description: "Flora intestinal con Lactobacillus" },
      { name: "Tiritas variadas (20u)",     price_cents: 290, description: "Apósitos adhesivos surtidos" },
      { name: "Spray nasal descongestionante", price_cents: 590, description: "Alivio rápido de la congestión" },
      { name: "Vitaminas B12 (60 comp)",    price_cents: 790, description: "Suplemento energético para adultos",                    tag: "POPULAR" },
    ],
  }),
  biz({
    locality_id: LOC.lanzahita.id,
    name: "Panadería La Ermita",
    email: "panaderia.laermita@pidetietar.es",
    address: "Camino de la Ermita 2, Lanzahita",
    latitude: 40.2372, longitude: -4.8040,
    banner_url: IMGS.panaderia,
    categories: [{ cat: "panaderia", primary: true }],
    hours: [
      { day: 0, open: "08:00", close: "13:30", is_open: true },
      { day: 1, open: "07:30", close: "13:30", is_open: true },
      { day: 2, open: "07:30", close: "13:30", is_open: true },
      { day: 3, open: "07:30", close: "13:30", is_open: true },
      { day: 4, open: "07:30", close: "13:30", is_open: true },
      { day: 5, open: "07:30", close: "13:30", is_open: true },
      { day: 6, open: "08:00", close: "14:00", is_open: true },
    ],
    products: [
      { name: "Barra de pan común",        price_cents: 120, description: "Barra de pan blanco del día",                           tag: "POPULAR" },
      { name: "Muffin de arándanos",        price_cents: 180, description: "Muffin casero con arándanos frescos" },
      { name: "Focaccia de romero",         price_cents: 290, description: "Focaccia italiana con sal gruesa y romero" },
      { name: "Donuts glaseados (4u)",      price_cents: 340, description: "Donuts blandos con glaseado de azúcar" },
      { name: "Pan de nueces (400 g)",      price_cents: 360, description: "Pan artesano con nueces de la zona" },
    ],
  }),
  biz({
    locality_id: LOC.lanzahita.id,
    name: "Supermercado La Fuente",
    email: "super.lafuente@pidetietar.es",
    address: "Avenida de Gredos 12, Lanzahita",
    latitude: 40.2382, longitude: -4.8025,
    banner_url: IMGS.supermercado,
    delivery_fee_cents: 200,
    min_order_cents: 1200,
    categories: [{ cat: "supermercado", primary: true }],
    hours: stdHours(true, false),
    products: [
      { name: "Pasta italiana (500 g)",    price_cents: 180, description: "Spaghetti n.5 de sémola de trigo duro" },
      { name: "Arroz Largo (1 kg)",        price_cents: 220, description: "Arroz largo tipo basmati" },
      { name: "Huevos campiña (12u)",      price_cents: 380, description: "Huevos de gallina campera de la zona",                  tag: "POPULAR" },
      { name: "Yogures naturales (4u)",    price_cents: 290, description: "Yogures naturales cremosos sin azúcar" },
      { name: "Mantequilla (250 g)",       price_cents: 290, description: "Mantequilla 82 % MG sin sal" },
      { name: "Zumo naranja (2 L)",        price_cents: 490, description: "Zumo de naranja 100 % natural" },
    ],
  }),
];

// ---------------------------------------------------------------------------
// 6. SEED
// ---------------------------------------------------------------------------
async function seed() {
  const pool = await getPool();

  // -- Categorías
  console.log("\n📂 Insertando categorías...");
  for (const cat of Object.values(CAT)) {
    await upsertCategory(pool, cat);
  }
  console.log(`   ✓ ${Object.keys(CAT).length} categorías`);

  // -- Localidades
  console.log("\n📍 Insertando localidades...");
  for (const loc of Object.values(LOC)) {
    await upsertLocality(pool, loc);
  }
  console.log(`   ✓ ${Object.keys(LOC).length} localidades`);

  // -- Negocios → horarios → productos
  console.log("\n🏪 Insertando negocios, horarios y productos...");
  let totalProducts = 0;

  for (const b of BUSINESSES) {
    const { categories: bizCats, hours, products, ...bizData } = b;

    await upsertBusiness(pool, bizData);

    // Categorías del negocio
    for (const { cat, primary } of bizCats) {
      await upsertBusinessCategory(pool, bizData.id, CAT[cat].id, primary);
    }

    // Horarios
    await upsertHours(pool, bizData.id, hours);

    // Productos: necesitan category_id → usar la categoría primaria del negocio
    const primaryCatId = CAT[bizCats.find((c) => c.primary).cat].id;
    for (const p of products) {
      await upsertProduct(pool, {
        id: uid(),
        business_id: bizData.id,
        category_id: primaryCatId,
        ...p,
      });
      totalProducts++;
    }

    console.log(`   ✓ ${bizData.name} (${products.length} productos)`);
  }

  console.log(`\n🎉 Seed completado:`);
  console.log(`   • ${Object.keys(CAT).length} categorías`);
  console.log(`   • ${Object.keys(LOC).length} localidades`);
  console.log(`   • ${BUSINESSES.length} negocios`);
  console.log(`   • ${totalProducts} productos`);

  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Error durante el seed:", err);
  process.exit(1);
});
