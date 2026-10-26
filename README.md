# PideTiétar

Aplicación de pedidos y gestión para el Valle del Tiétar. Frontend React + Vite y backend Express en un único `server.js`.

## Requisitos

- Node.js **22.5 o superior** (el backend usa `node:sqlite`).
- npm.
- Opcional: MySQL/MariaDB. Si no hay conexión, el backend usa SQLite local.

## Instalación

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env` y ajusta los valores. El archivo `.env` no se sube al repositorio.

## Desarrollo

Ejecuta el backend y el frontend en dos terminales:

```bash
# Terminal 1: API en http://localhost:4000
npm run server

# Terminal 2: frontend en http://localhost:3000
npm run dev
```

Vite redirige `/api` al backend del puerto 4000.

## Producción

```bash
npm run lint
npm run build
npm start
```

`npm start` sirve la API y el contenido de `dist/` desde el puerto indicado en `PORT` (4000 por defecto). Si usas un proxy inverso, apunta al puerto del backend.

## Base de datos

- El backend intenta conectar con MySQL usando las variables `MYSQL_*` o `DB_*`.
- Si no hay conexión, usa SQLite en `data/app.db`.
- El esquema lo crea y migra el propio servidor al arrancar. No hay que ejecutar migraciones manuales.
- `data/` contiene datos locales y el secreto de sesión: está excluido de git y no debe subirse.

## Archivos multimedia en Supabase

La base funcional permanece en Hostinger/MySQL (con SQLite como fallback local). Las fotos, vídeos y GIF se guardan en Supabase Storage, en el bucket `app-images`, y sus relaciones se guardan en `public.media_assets` usando los IDs externos de Hostinger. Ejecuta [database/supabase_media.sql](database/supabase_media.sql) una vez en el SQL Editor de Supabase antes de subir medios. La clave `SUPABASE_SECRET_KEY` solo debe existir en el backend; el navegador, si necesita consultar Supabase directamente, usa únicamente `VITE_SUPABASE_PUBLISHABLE_KEY` con RLS.

Los endpoints de medios son `POST /api/media`, `GET /api/media?entityType=...&entityId=...` y `DELETE /api/media/:id`. Las altas y ediciones de negocios, productos y categorías convierten automáticamente los data URLs en archivos de Supabase y guardan la URL pública en la base funcional.

## Acceso de superadministrador

El usuario y la contraseña se configuran con `SUPERADMIN_USERNAME` y `SUPERADMIN_PASSWORD`. No dejes credenciales reales en el repositorio ni en la documentación.

## Seguridad

- `GET /api/orders` exige sesión y filtra los pedidos por rol: superadmin, administrador del negocio, repartidor que cubre el negocio y cliente propietario del pedido.
- Los endpoints `/api/debug/*` están reservados al superadmin.
- Define `SESSION_SECRET` en producción. Si no existe, el servidor genera `data/.session_secret`.
- Sirve la aplicación detrás de HTTPS.

## Comprobaciones

- `npm run lint` — comprobación de tipos.
- `npm run build` — build de producción.
- `npm run test:responsive` — Playwright sobre varios viewports (requiere navegadores instalados).
- `curl http://localhost:4000/api/health` — estado del backend.
