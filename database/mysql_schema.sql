SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS business_daily_sales_summary;
DROP TABLE IF EXISTS payment_transactions;
DROP TABLE IF EXISTS sales_ticket_status_history;
DROP TABLE IF EXISTS sales_ticket_items;
DROP TABLE IF EXISTS sales_tickets;
DROP TABLE IF EXISTS product_options;
DROP TABLE IF EXISTS product_option_groups;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS business_hours;
DROP TABLE IF EXISTS business_categories;
DROP TABLE IF EXISTS businesses;
DROP TABLE IF EXISTS user_addresses;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS localities;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE roles (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE localities (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  name VARCHAR(120) NOT NULL,
  postal_code VARCHAR(20) NULL,
  latitude DECIMAL(9,6) NULL,
  longitude DECIMAL(9,6) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  icon_name VARCHAR(80) NULL,
  image_url TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NULL,
  avatar_url TEXT NULL,
  is_email_verified TINYINT(1) NOT NULL DEFAULT 0,
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
  user_id CHAR(36) NOT NULL,
  role_id INT NOT NULL,
  assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_addresses (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  label VARCHAR(60) NOT NULL,
  street VARCHAR(255) NOT NULL,
  locality_id CHAR(36) NULL,
  postal_code VARCHAR(20) NULL,
  latitude DECIMAL(9,6) NULL,
  longitude DECIMAL(9,6) NULL,
  reference TEXT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_user_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_addresses_locality FOREIGN KEY (locality_id) REFERENCES localities(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE businesses (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  locality_id CHAR(36) NOT NULL,
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
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_businesses_locality FOREIGN KEY (locality_id) REFERENCES localities(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_business_status CHECK (status IN ('APPROVED','PENDING','SUSPENDED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE business_categories (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  business_id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_business_category (business_id, category_id),
  CONSTRAINT fk_business_categories_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_business_categories_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE business_hours (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  business_id CHAR(36) NOT NULL,
  day_of_week INT NOT NULL,
  open_time TIME NULL,
  close_time TIME NULL,
  is_open TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_business_day (business_id, day_of_week),
  CONSTRAINT fk_business_hours_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_day_of_week CHECK (day_of_week BETWEEN 0 AND 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  business_id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
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
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_products_business (business_id),
  KEY idx_products_category (category_id),
  KEY idx_products_available (is_available),
  CONSTRAINT fk_products_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_option_groups (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  product_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  min_choices INT NOT NULL DEFAULT 0,
  max_choices INT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_product_groups_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_options (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  group_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  price_cents INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_product_options_group FOREIGN KEY (group_id) REFERENCES product_option_groups(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_tickets (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  ticket_number VARCHAR(40) NOT NULL,
  business_id CHAR(36) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  delivery_type VARCHAR(20) NOT NULL,
  delivery_address_id CHAR(36) NULL,
  customer_note TEXT NULL,
  scheduled_at DATETIME(3) NULL,
  subtotal_cents INT NOT NULL DEFAULT 0,
  delivery_fee_cents INT NOT NULL DEFAULT 0,
  platform_fee_cents INT NOT NULL DEFAULT 0,
  business_payout_cents INT NOT NULL DEFAULT 0,
  courier_payout_cents INT NOT NULL DEFAULT 0,
  tip_cents INT NOT NULL DEFAULT 0,
  total_cents INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  payment_method VARCHAR(30) NOT NULL DEFAULT 'CARD',
  payment_transaction_id VARCHAR(120) NULL,
  courier_id CHAR(36) NULL,
  delivery_pin VARCHAR(12) NULL,
  review_requested TINYINT(1) NOT NULL DEFAULT 0,
  review_score INT NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ticket_number (ticket_number),
  KEY idx_tickets_business (business_id),
  KEY idx_tickets_customer (customer_id),
  KEY idx_tickets_status (status),
  KEY idx_tickets_created (created_at),
  CONSTRAINT fk_tickets_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_tickets_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_tickets_address FOREIGN KEY (delivery_address_id) REFERENCES user_addresses(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_tickets_courier FOREIGN KEY (courier_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_ticket_delivery CHECK (delivery_type IN ('DELIVERY','PICKUP')),
  CONSTRAINT chk_ticket_status CHECK (status IN ('PENDING_PAYMENT','PAID','NEW','ACCEPTED','PREPARING','READY','ASSIGNED','PICKED_UP','DELIVERED','CANCELLED','REJECTED','REFUNDED')),
  CONSTRAINT chk_payment_status CHECK (payment_status IN ('PENDING','AUTHORIZED','CAPTURED','FAILED','REFUNDED','PARTIALLY_REFUNDED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_ticket_items (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  ticket_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  product_name_snapshot VARCHAR(180) NOT NULL,
  unit_price_cents INT NOT NULL DEFAULT 0,
  tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  quantity INT NOT NULL,
  removed_ingredients JSON NULL,
  selected_options JSON NULL,
  customer_note TEXT NULL,
  total_cents INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_ticket_items_ticket (ticket_id),
  CONSTRAINT fk_ticket_items_ticket FOREIGN KEY (ticket_id) REFERENCES sales_tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ticket_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_ticket_status_history (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  ticket_id CHAR(36) NOT NULL,
  status VARCHAR(30) NOT NULL,
  note TEXT NULL,
  changed_by_user_id CHAR(36) NULL,
  changed_by_role VARCHAR(50) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_status_history_ticket (ticket_id),
  CONSTRAINT fk_status_history_ticket FOREIGN KEY (ticket_id) REFERENCES sales_tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_status_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_history_status CHECK (status IN ('PENDING_PAYMENT','PAID','NEW','ACCEPTED','PREPARING','READY','ASSIGNED','PICKED_UP','DELIVERED','CANCELLED','REJECTED','REFUNDED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_transactions (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  ticket_id CHAR(36) NOT NULL,
  payer_user_id CHAR(36) NOT NULL,
  business_id CHAR(36) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  gateway_reference VARCHAR(180) NULL,
  amount_cents INT NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  processed_at DATETIME(3) NULL,
  refunded_at DATETIME(3) NULL,
  metadata JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_payment_ticket (ticket_id),
  KEY idx_payment_business (business_id),
  CONSTRAINT fk_payment_ticket FOREIGN KEY (ticket_id) REFERENCES sales_tickets(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_payment_payer FOREIGN KEY (payer_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_payment_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_payment_method CHECK (payment_method IN ('CARD','PAYPAL','STRIPE','CASH','TRANSFER')),
  CONSTRAINT chk_payment_state CHECK (status IN ('PENDING','AUTHORIZED','CAPTURED','FAILED','REFUNDED','PARTIALLY_REFUNDED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE business_daily_sales_summary (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  business_id CHAR(36) NOT NULL,
  sales_date DATE NOT NULL,
  total_orders INT NOT NULL DEFAULT 0,
  paid_orders INT NOT NULL DEFAULT 0,
  total_revenue_cents INT NOT NULL DEFAULT 0,
  gross_sales_cents INT NOT NULL DEFAULT 0,
  platform_fee_cents INT NOT NULL DEFAULT 0,
  payout_cents INT NOT NULL DEFAULT 0,
  avg_order_value_cents INT NOT NULL DEFAULT 0,
  unique_customers INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_business_day_summary (business_id, sales_date),
  CONSTRAINT fk_business_summary FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  table_name VARCHAR(120) NOT NULL,
  record_id CHAR(36) NULL,
  action VARCHAR(40) NOT NULL,
  changed_by_user_id CHAR(36) NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_audit_table_record (table_name, record_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_audit_action CHECK (action IN ('INSERT','UPDATE','DELETE','SOFT_DELETE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_addresses_user ON user_addresses(user_id);
CREATE INDEX idx_businesses_locality ON businesses(locality_id);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_business_categories_business ON business_categories(business_id);
CREATE INDEX idx_business_categories_category ON business_categories(category_id);
CREATE INDEX idx_products_business_idx ON products(business_id);
CREATE INDEX idx_products_category_idx ON products(category_id);
CREATE INDEX idx_payment_transactions_ticket ON payment_transactions(ticket_id);
CREATE INDEX idx_business_daily_summary_business_date ON business_daily_sales_summary(business_id, sales_date);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
