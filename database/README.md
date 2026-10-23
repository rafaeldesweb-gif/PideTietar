# Base de datos de PideTiétar

Este esquema está diseñado para un entorno de producción con PostgreSQL 15+.

## Objetivo

La base de datos soporta:

- Usuarios con roles y permisos
- Zonas/localidades
- Negocios y sus categorías
- Catálogos y productos por negocio
- Tickets de venta y líneas de pedido
- Método y registro de pagos
- Resúmenes diarios de ventas por negocio
- Auditoría de creación, actualización y eliminación

## Aplicación recomendada

1. Crear la base de datos:

   ```bash
   createdb pidetietar_prod
   ```

2. Ejecutar el esquema:

   ```bash
   psql -d pidetietar_prod -f database/schema.sql
   ```

3. Cargar los catálogos base (roles y categorías):

   ```bash
   psql -d pidetietar_prod -f database/seed.sql
   ```

   No hay datos de ejemplo: las localidades, negocios y productos se crean
   desde el panel de superadministración.

## Principales relaciones

- `users` <-> `user_roles` <-> `roles`
- `localities` <-> `businesses`
- `categories` <-> `businesses` a través de `business_categories`
- `businesses` <-> `products`
- `products` <-> `product_option_groups` <-> `product_options`
- `customers` y `businesses` producen `sales_tickets`
- `sales_tickets` <-> `sales_ticket_items`
- `sales_tickets` <-> `payment_transactions`
- `businesses` <-> `business_daily_sales_summary`

## Auditoría

Todas las tablas principales incluyen:

- `created_at`
- `updated_at`
- `deleted_at`

Esto permite control de borrado lógico y trazabilidad de cambios.

## Recomendaciones de producción

- Usar PostgreSQL con conexión SSL
- Habilitar backups automáticos
- Añadir índices según volumen real
- Usar `ROW LEVEL SECURITY` para multi-tenant
- Considerar particionado por fecha en tablas de facturación si crece mucho volumen

## Variante MySQL / MariaDB

Los ficheros equivalentes para MySQL/MariaDB son:

- `database/mysql_schema.sql`
- `database/mysql_seed.sql`

Importación:

```bash
mysql -u USUARIO -p pidetietar_prod < database/mysql_schema.sql
mysql -u USUARIO -p pidetietar_prod < database/mysql_seed.sql
```

Verificado importando ambos ficheros en:

- MariaDB 10.11.19 y 11.8.9 (motor de los planes de hosting compartido, p. ej. Hostinger/Hetzner)
- MySQL 8.4.13

Notas importantes:

- `schema.sql`/`seed.sql` son **PostgreSQL**; `mysql_schema.sql`/`mysql_seed.sql` son **MySQL/MariaDB**. Ejecutar un fichero en el motor equivocado produce errores de sintaxis (dialectos distintos).
- Los ids los genera la propia BD con `UUID()`, y la aplicación (`server.js`) siempre envía el `id` generado en JavaScript.
- La aplicación usa SQLite (`data/app.db`) cuando no hay BD MySQL accesible; el esquema SQLite lo crea `server.js` al arrancar, no estos ficheros.
