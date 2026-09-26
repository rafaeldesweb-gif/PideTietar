CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- CORE LOOKUP TABLES
-- =========================================================

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE localities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  postal_code VARCHAR(20),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  icon_name VARCHAR(80),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- =========================================================
-- USERS, ROLES, ADDRESSES
-- =========================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password_hash TEXT,
  avatar_url TEXT,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(60) NOT NULL,
  street VARCHAR(255) NOT NULL,
  locality_id UUID REFERENCES localities(id),
  postal_code VARCHAR(20),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  reference TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- =========================================================
-- BUSINESSES, BUSINESS CATEGORIES, HOURS
-- =========================================================

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locality_id UUID NOT NULL REFERENCES localities(id) ON DELETE RESTRICT,
  name VARCHAR(180) NOT NULL,
  legal_name VARCHAR(180),
  cif VARCHAR(40),
  phone VARCHAR(30),
  email VARCHAR(255),
  address TEXT NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  estimated_time_min INT NOT NULL DEFAULT 20,
  estimated_time_max INT NOT NULL DEFAULT 60,
  delivery_fee_cents INT NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  min_order_cents INT NOT NULL DEFAULT 0 CHECK (min_order_cents >= 0),
  banner_url TEXT,
  logo_url TEXT,
  is_shift_open BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_modes TEXT[] NOT NULL DEFAULT ARRAY['DELIVERY', 'PICKUP'],
  delivery_radius_km NUMERIC(5,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('APPROVED', 'PENDING', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE business_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (business_id, category_id)
);

CREATE TABLE business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME,
  close_time TIME,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (business_id, day_of_week)
);

-- =========================================================
-- PRODUCTS AND PRODUCT OPTIONS
-- =========================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  tag VARCHAR(80),
  ingredients TEXT[],
  allergens TEXT[],
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_sold_out BOOLEAN NOT NULL DEFAULT FALSE,
  removable_ingredients TEXT[],
  additional_ingredients JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE product_option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  min_choices INT NOT NULL DEFAULT 0,
  max_choices INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES product_option_groups(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  price_cents INT NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- =========================================================
-- SALES TICKETS / ORDERS / ORDER ITEMS
-- =========================================================

CREATE TABLE sales_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(40) NOT NULL UNIQUE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('DELIVERY', 'PICKUP')),
  delivery_address_id UUID REFERENCES user_addresses(id) ON DELETE RESTRICT,
  customer_note TEXT,
  scheduled_at TIMESTAMPTZ,
  subtotal_cents INT NOT NULL CHECK (subtotal_cents >= 0),
  delivery_fee_cents INT NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  platform_fee_cents INT NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  business_payout_cents INT NOT NULL DEFAULT 0 CHECK (business_payout_cents >= 0),
  courier_payout_cents INT NOT NULL DEFAULT 0 CHECK (courier_payout_cents >= 0),
  tip_cents INT NOT NULL DEFAULT 0 CHECK (tip_cents >= 0),
  total_cents INT NOT NULL CHECK (total_cents >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING_PAYMENT', 'PAID', 'NEW', 'ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED', 'REJECTED', 'REFUNDED')
  ),
  payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (
    payment_status IN ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')
  ),
  payment_method VARCHAR(30) NOT NULL DEFAULT 'CARD' CHECK (
    payment_method IN ('CARD', 'PAYPAL', 'STRIPE', 'CASH', 'TRANSFER')
  ),
  payment_transaction_id VARCHAR(120),
  courier_id UUID REFERENCES users(id) ON DELETE SET NULL,
  delivery_pin VARCHAR(12),
  review_requested BOOLEAN NOT NULL DEFAULT FALSE,
  review_score INT CHECK (review_score BETWEEN 1 AND 5),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE sales_ticket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES sales_tickets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name_snapshot VARCHAR(180) NOT NULL,
  unit_price_cents INT NOT NULL CHECK (unit_price_cents >= 0),
  tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL CHECK (quantity > 0),
  removed_ingredients TEXT[],
  selected_options JSONB,
  customer_note TEXT,
  total_cents INT NOT NULL CHECK (total_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE sales_ticket_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES sales_tickets(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL CHECK (
    status IN ('PENDING_PAYMENT', 'PAID', 'NEW', 'ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED', 'REJECTED', 'REFUNDED')
  ),
  note TEXT,
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_by_role VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- =========================================================
-- PAYMENTS AND DAILY SALES SUMMARY
-- =========================================================

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES sales_tickets(id) ON DELETE RESTRICT,
  payer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  provider VARCHAR(50) NOT NULL,
  payment_method VARCHAR(30) NOT NULL CHECK (
    payment_method IN ('CARD', 'PAYPAL', 'STRIPE', 'CASH', 'TRANSFER')
  ),
  gateway_reference VARCHAR(180),
  amount_cents INT NOT NULL CHECK (amount_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  status VARCHAR(30) NOT NULL CHECK (
    status IN ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')
  ),
  processed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE business_daily_sales_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sales_date DATE NOT NULL,
  total_orders INT NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
  paid_orders INT NOT NULL DEFAULT 0 CHECK (paid_orders >= 0),
  total_revenue_cents INT NOT NULL DEFAULT 0 CHECK (total_revenue_cents >= 0),
  gross_sales_cents INT NOT NULL DEFAULT 0 CHECK (gross_sales_cents >= 0),
  platform_fee_cents INT NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  payout_cents INT NOT NULL DEFAULT 0 CHECK (payout_cents >= 0),
  avg_order_value_cents INT NOT NULL DEFAULT 0 CHECK (avg_order_value_cents >= 0),
  unique_customers INT NOT NULL DEFAULT 0 CHECK (unique_customers >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (business_id, sales_date)
);

-- =========================================================
-- AUDIT LOG
-- =========================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(120) NOT NULL,
  record_id UUID,
  action VARCHAR(40) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE')),
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_businesses_locality_id ON businesses(locality_id);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_business_categories_business_id ON business_categories(business_id);
CREATE INDEX idx_business_categories_category_id ON business_categories(category_id);
CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_available ON products(is_available);
CREATE INDEX idx_sales_tickets_business_id ON sales_tickets(business_id);
CREATE INDEX idx_sales_tickets_customer_id ON sales_tickets(customer_id);
CREATE INDEX idx_sales_tickets_created_at ON sales_tickets(created_at);
CREATE INDEX idx_sales_tickets_status ON sales_tickets(status);
CREATE INDEX idx_sales_ticket_items_ticket_id ON sales_ticket_items(ticket_id);
CREATE INDEX idx_payment_transactions_ticket_id ON payment_transactions(ticket_id);
CREATE INDEX idx_payment_transactions_business_id ON payment_transactions(business_id);
CREATE INDEX idx_business_daily_sales_summary_business_date ON business_daily_sales_summary(business_id, sales_date);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- =========================================================
-- TRIGGERS FOR updated_at
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roles_set_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER localities_set_updated_at
BEFORE UPDATE ON localities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER categories_set_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_roles_set_updated_at
BEFORE UPDATE ON user_roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_addresses_set_updated_at
BEFORE UPDATE ON user_addresses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER businesses_set_updated_at
BEFORE UPDATE ON businesses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER business_categories_set_updated_at
BEFORE UPDATE ON business_categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER business_hours_set_updated_at
BEFORE UPDATE ON business_hours
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER product_option_groups_set_updated_at
BEFORE UPDATE ON product_option_groups
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER product_options_set_updated_at
BEFORE UPDATE ON product_options
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sales_tickets_set_updated_at
BEFORE UPDATE ON sales_tickets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sales_ticket_items_set_updated_at
BEFORE UPDATE ON sales_ticket_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sales_ticket_status_history_set_updated_at
BEFORE UPDATE ON sales_ticket_status_history
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER payment_transactions_set_updated_at
BEFORE UPDATE ON payment_transactions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER business_daily_sales_summary_set_updated_at
BEFORE UPDATE ON business_daily_sales_summary
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- OPTIONAL: VIEWS FOR REPORTS
-- =========================================================

CREATE VIEW v_business_daily_sales AS
SELECT
  b.id AS business_id,
  b.name AS business_name,
  s.sales_date,
  s.total_orders,
  s.paid_orders,
  s.total_revenue_cents,
  s.platform_fee_cents,
  s.payout_cents,
  s.avg_order_value_cents,
  s.unique_customers
FROM business_daily_sales_summary s
JOIN businesses b ON b.id = s.business_id
WHERE s.deleted_at IS NULL;

CREATE VIEW v_ticket_totals AS
SELECT
  t.id AS ticket_id,
  t.ticket_number,
  t.customer_id,
  u.full_name AS customer_name,
  t.business_id,
  b.name AS business_name,
  t.total_cents,
  t.status,
  t.payment_status,
  t.created_at
FROM sales_tickets t
JOIN users u ON u.id = t.customer_id
JOIN businesses b ON b.id = t.business_id
WHERE t.deleted_at IS NULL;
