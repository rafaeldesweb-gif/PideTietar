INSERT INTO roles (name, description) VALUES
  ('CLIENT', 'Cliente final de la plataforma'),
  ('BUSINESS_ADMIN', 'Administrador de negocio'),
  ('PLATFORM_COURIER', 'Repartidor de la plataforma'),
  ('BUSINESS_COURIER', 'Repartidor asignado por negocio'),
  ('SUPERADMIN', 'Superadministrador del sistema')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO localities (id, name, postal_code, latitude, longitude, is_active) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Sotillo de la Adrada', '05420', 40.456700, -4.922200, 1),
  ('22222222-2222-4222-8222-222222222222', 'El Tiétar', '05429', 40.470100, -4.965100, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), postal_code = VALUES(postal_code), latitude = VALUES(latitude), longitude = VALUES(longitude), is_active = VALUES(is_active);

INSERT INTO categories (id, name, slug, icon_name) VALUES
  ('33333333-3333-4333-8333-333333333333', 'Hamburguesas', 'hamburguesas', 'Utensils'),
  ('44444444-4444-4444-8444-444444444444', 'Pizzas', 'pizzas', 'Pizza'),
  ('55555555-5555-4555-8555-555555555555', 'Kebabs', 'kebabs', 'Flame'),
  ('66666666-6666-4666-8666-666666666666', 'Postres', 'postres', 'Sparkles')
ON DUPLICATE KEY UPDATE name = VALUES(name), icon_name = VALUES(icon_name);
