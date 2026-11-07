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

### Verificación de direcciones

Define `GEOAPIFY_API_KEY` en `.env` con la clave de tu proyecto en
[Geoapify](https://myprojects.geoapify.com/). Reinicia `npm run server` después
de modificar `.env` o `server.js`: Vite solo recarga el frontend.

Sin clave, la API indica `configured: false`, `checked: false` y `verified: false`.
El registro conserva el comportamiento local, pero la dirección no se muestra
como confirmada. Si el navegador recibe HTML (`Unexpected token '<'`) o un 404
en `/api/address/verify`, comprueba que el backend del puerto 4000 ejecuta la
versión actual y reinícialo. Las rutas de API desconocidas devuelven JSON.

La búsqueda incluye el CP de la localidad y resuelve nombres abreviados, como
Sotillo → Sotillo de la Adrada (05420). `#34` se consulta como portal `34`.
La API distingue `verificationLevel: "building"` (portal confirmado), `"street"`
(calle localizada, portal sin confirmar) y coincidencias insuficientes. Un
`full_match` con `confidence_building_level: 0` no confirma el portal. El registro
sí se permite si `streetVerified: true`: la calle pertenece a la localidad y CP
seleccionados. Una coincidencia solo de localidad o una calle fuera de zona no
permiten registrarse cuando Geoapify está configurado.

## Producción

```bash
npm run lint
npm run build
npm start
```

`npm start` sirve la API y el contenido de `dist/` desde el puerto indicado en `PORT` (4000 por defecto). Si usas un proxy inverso, apunta al puerto del backend.

## Reportes al cerrar sesión

Cada cierre de sesión solicitado desde la interfaz llama a `POST /api/auth/logout`
antes de retirar el token del navegador. La plataforma envía al correo de la cuenta
un reporte de los pedidos con movimientos durante el día de Madrid hasta ese momento,
con desglose, estados y un CSV adjunto. El cliente recibe sus compras, el negocio
los pedidos de su negocio y el repartidor únicamente sus repartos. El SuperAdmin
recibe el reporte global al cerrar su propia sesión, agrupado por zona y negocio,
incluidos los comercios sin movimientos y los totales de cada zona.

El historial visible del repartidor empieza de cero con cada nuevo inicio de sesión;
recargar la página conserva la sesión actual. No se borran pedidos de la base de datos,
y el correo sigue cubriendo el día completo. Para enviarlo deben estar configurados
`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` y los datos de remitente de `.env.example`.
La interfaz comunica los fallos de SMTP y no los presenta como envíos realizados.
Cerrar una pestaña o dejar caducar el token no solicita un reporte.

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
