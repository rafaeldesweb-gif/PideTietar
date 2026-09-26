# PideTiétar

Aplicación de pedidos y gestión para el Valle del Tiétar con frontend React + Vite y backend Express.

## Funcionalidades principales

- Registro y acceso con pantalla principal de registro.
- Acceso fijo de superadministrador con usuario `RafaAdmin` y contraseña `13021999`.
- Backend con soporte para MySQL real y fallback a SQLite local.
- CRUD para negocios, productos, usuarios y pedidos.
- Scripts de migración y verificación para base de datos.
- Preparado para funcionar con Hostinger mediante variables de entorno.

## Inicio rápido

1. Instala dependencias:
   npm install
2. Ajusta el archivo `.env` con tu host, usuario y base de datos MySQL de Hostinger.
3. Crea la base de datos y ejecuta:
   npm run db:migrate
   npm run db:seed
4. Inicia la aplicación:
   npm run dev
5. Ejecuta la API:
   npm run server

## Base de datos

- Base de datos real: MySQL usando `MYSQL_HOST`, `MYSQL_DATABASE`, `MYSQL_USER` y `MYSQL_PASSWORD`.
- Si no hay configuración MySQL, la app usa SQLite local en `data/app.db`.
- Comandos útiles:
  - `npm run db:status`
  - `npm run db:migrate`
  - `npm run db:seed`
  - `npm run db:verify`
  - `npm run db:crud`

## Login fijo de superadmin

- Usuario: `RafaAdmin`
- Contraseña: `13021999`

## Debug y verificación

- `npm run lint`
- `npm run build`
- `curl http://localhost:3000/api/health`
