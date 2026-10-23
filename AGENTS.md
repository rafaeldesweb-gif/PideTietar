# AGENTS.md

App de pedidos para el Valle del Tiétar: frontend React 19 + Vite y backend Express en un único `server.js`. Código, comentarios y UI en español.

## Comandos

- `npm run lint` → `tsc --noEmit`. **No hay ESLint, ni test runner, ni suite de tests en el repo**: es la única comprobación estática.
- `npm run build` → `vite build`. Orden habitual: `npm run lint` → `npm run build`.
- `npm run dev` → **solo** el frontend (Vite, puerto 3000). El backend es otro proceso: `npm run server` (puerto 4000). Vite proxyea `/api` → `http://localhost:4000`.
- Smoke test de API: `curl http://localhost:4000/api/health`.
- `npm run test:responsive` → Playwright sobre 10 viewports; arranca Vite él mismo si el 3000 no responde. Requiere los navegadores de Playwright instalados.
- `npm run clean` → solo borra `dist/`. No toca el código ni la base de datos.

## Arquitectura

- `server.js` (~4.700 líneas, JS plano sin build) es todo el backend. Al arrancar **intenta MySQL** con `.env` y, si la conexión falla, **cae a SQLite local** `data/app.db`. El modo activo vive en la variable `databaseMode`.
- El servidor **crea y migra su propio esquema** SQLite al arrancar (`ensureSqliteSchemaShape`, añadiendo columnas con `ALTER TABLE`). Tocar la BD real = tocar ese esquema.
- `database/schema.sql` y `database/mysql_schema.sql` son **solo documentación**: el servidor nunca los ejecuta. Son dialectos distintos (PostgreSQL vs MySQL/MariaDB); ejecutar uno en el motor equivocado produce errores de sintaxis.
- Entrada frontend: `index.html` → `src/main.tsx`. Estado global en `src/context/AppContext.tsx`; tipos compartidos en `src/types.ts`; errores de formulario en `src/components/FormErrors.tsx`.
- Auth: token HMAC stateless (`requireAuth` / `requireRole(...)`). Existe un superadmin que entra **sin necesitar BD**; sus credenciales se configuran con `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD` (hay un valor de respaldo en `server.js` solo para desarrollo). `POST /api/auth/login` acepta `username` o `email`.
- `GET /api/orders` exige sesión y filtra por rol en el servidor: superadmin ve todo; el administrador y los repartidores de negocio ven su negocio; el repartidor de plataforma cubre todo el valle; el cliente solo sus pedidos (con respaldo por email para pedidos antiguos). Los endpoints `/api/debug/*` son solo de superadmin.
- La **cuenta bancaria (IBAN) es un dato del negocio** (`businesses.account_number`), no del cliente: se recoge en el alta y la edita el propio usuario del negocio desde "DATOS DEL NEGOCIO" en `BusinessDashboard` (para conectar la pasarela de pago). No la añadas a los formularios de cliente (`AuthModal`), que la tienen eliminada a propósito.
- `server.js` sirve `dist/` estáticamente si existe: un build viejo puede confundir tus pruebas en el puerto 4000.

## Trampas

- **localStorage cachea** localidades/negocios/productos/pedidos (`pidetietar_*`); si la API devuelve vacío se conservan, y si no hay nada quedan los datos demo de `src/data/`. Una "BD vacía" puede parecer poblada: limpia localStorage al probar la UI.
- `node:sqlite` (`DatabaseSync`) exige **Node ≥ 22.5**; `package.json` ya lo declara en `engines`.
- `node:sqlite` rechaza bindings booleanos: pasa siempre `Number(...)`.
- Los handlers async de Express se envuelven globalmente (línea ~24) para reenviar rejections a `next()`; una ruta nueva queda cubierta, pero no elimines ese wrapper.
- Límite `express.json({ limit: "2mb" })`: las imágenes van como data URL o `http(s)://` sin espacios.
- `vite.config.ts` admite `DISABLE_HMR=true` para desactivar HMR y file watching durante ediciones.
- `data/` está excluido de git (`data/*.db*`, `data/.session_secret`): no subas la base de datos ni el secreto de sesión.

## Contrato de errores de la API

- Validación: `400 { code: "VALIDATION_ERROR", message, errors }`, con `errors` indexado por **snake_case** (nombres de columna reales de la BD).
- El frontend los traduce a campos camelCase del formulario dentro de `src/components/FormErrors.tsx` (`owner_username` → `adminUsername`, etc.). Si añades un campo nuevo, mápealo ahí.
- Códigos de dominio en el cuerpo: `BUSINESS_HAS_ORDERS` (409), `INVALID_CREDENTIALS` (401), entre otros.
