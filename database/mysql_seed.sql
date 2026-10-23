-- Datos base del sistema (roles y categorías).
-- Las localidades, negocios y productos se crean desde el panel de
-- superadministración: no se siembran datos de ejemplo.
INSERT INTO roles (name, description) VALUES
  ('CLIENT', 'Cliente final de la plataforma'),
  ('BUSINESS_ADMIN', 'Administrador de negocio'),
  ('PLATFORM_COURIER', 'Repartidor de la plataforma'),
  ('BUSINESS_COURIER', 'Repartidor asignado por negocio'),
  ('SUPERADMIN', 'Superadministrador del sistema')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO categories (id, name, slug, icon_name) VALUES
  ('33333333-3333-4333-8333-333333333333', 'Hamburguesas', 'hamburguesas', 'Utensils'),
  ('44444444-4444-4444-8444-444444444444', 'Pizzas', 'pizzas', 'Pizza'),
  ('55555555-5555-4555-8555-555555555555', 'Kebabs', 'kebabs', 'Flame'),
  ('66666666-6666-4666-8666-666666666666', 'Postres', 'postres', 'Sparkles')
ON DUPLICATE KEY UPDATE name = VALUES(name), icon_name = VALUES(icon_name);
