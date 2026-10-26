# AGENTS.md

App de pedidos para el Valle del Tiétar: frontend React 19 + Vite 8 y backend Express 4 en un único `server.js`. Código, comentarios y UI en español.

## Comandos

- `npm run lint` → `tsc --noEmit`. **No hay ESLint ni formateador**: es la única comprobación estática. También typechequea los `*.test.ts`.
- `npm run build` → `vite build`. Orden habitual: `npm run lint` → `npm run build`.
- `npm run dev` → **solo** el frontend (Vite, puerto 3000). El backend es otro proceso: `npm run server` (puerto 4000). `npm start` es equivalente a `npm run server` y sirve `dist/` si existe. Vite proxea `/api` → `http://localhost:4000`.
- `npm run preview` → sirve el build de Vite en el 4173 y hereda el proxy `/api` → 4000 (`server.proxy`), pero no arranca el backend.
- Tests: `node --import tsx --test "src/**/*.test.ts"`. Son tests de `node:test` sobre utilidades del frontend; **no hay script npm, tests de backend ni de componentes**. `node --test` a secas falla porque los imports TS no llevan extensión.
- Smoke test de API: `curl http://localhost:4000/api/health` (devuelve `mode: "mysql" | "sqlite"`).
- `npm run test:responsive` → Playwright/Chromium sobre 10 viewports; arranca Vite en el 3000 si no responde. Solo comprueba desbordamiento horizontal de la portada. Requiere `npx playwright install chromium`.
- `npm run clean` → solo borra `dist/`. No toca el código ni la base de datos.

## Arquitectura

- `server.js` (JS plano sin build) es todo el backend funcional. Al arrancar **intenta MySQL en Hostinger** con `.env` y, si la conexión falla, **cae a SQLite local** `data/app.db` (WAL). El modo activo vive en `databaseMode` y se ve en `/api/health`. Supabase queda reservado para el almacenamiento de fotos, vídeos, GIF y sus relaciones de medios; no sustituye la base funcional de pedidos, usuarios, negocios y pagos.
- El servidor **crea y migra su propio esquema** en ambos motores: SQLite con `sqliteSchema` + `ensureSqliteSchemaShape` (`ALTER TABLE`); MySQL con `mysqlSchema` + `ensureMySqlSchemaShape`. Tocar la BD real = tocar ese esquema.
- `database/schema.sql` es **solo documentación PostgreSQL** (el backend no soporta PostgreSQL); `database/mysql_schema.sql` es la variante MySQL/MariaDB. El servidor no ejecuta ninguno de los dos: su esquema MySQL está embebido en `server.js`. Ejecutar un dialecto en el motor equivocado da errores de sintaxis.
- Frontend: `index.html` → `src/main.tsx` → `src/App.tsx`. No hay router: la vista (`home`, `orders`, `business-dashboard`, etc.) es estado de React. Estado global en `src/context/AppContext.tsx`; tipos en `src/types.ts`; planes de suscripción estáticos en `src/data/mockData.ts`; errores de formulario en `src/components/FormErrors.tsx`.
- **No hay datos demo ni seed de localidades, negocios o productos**: el frontend arranca vacío y la API es la única fuente de esas entidades. Los datos reales se crean desde el panel de superadministración. Las categorías son catálogo de plataforma: las 15 iniciales se siembran una sola vez al crear la tabla `categories` o si existe vacía y aún no hay marcador `categories_seeded_v1` en `platform_meta`; después se gestionan desde la API y no se reponen si el superadmin las borra.
- `AppContext` centraliza las llamadas con `apiFetch` (`/api`, `Authorization: Bearer <token>`). Al montar carga localidades/negocios/productos/categorías desde la API (aunque devuelva listas vacías) y, si hay token, pedidos; los pedidos se refrescan cada 4 s y al recuperar el foco. `refreshBusinesses()` reemplaza la lista de negocios con la del servidor (también vacía) y la usa `AdminDashboard` antes de editar/eliminar o asignar negocios a un repartidor. Localidades, negocios, productos y categorías **no se cachean en localStorage**.
- Servicios: `src/services/googleWorkspace.ts` (GIS/Calendar/Gmail) y `src/services/paymentService.ts` (ledger y checkout). Utilidades: `orderValidation.ts`, `orderVisibility.ts`, `productOptions.ts`, `imageUpload.ts`, `mediaUpload.ts`, `courierValidation.ts`. Componente compartido: `src/components/MediaView.tsx` (pinta foto o vídeo con `object-contain` para que se vea completo en el espacio asignado; acepta jpeg/jpg/png/gif y mp4 de hasta 2 s). `src/components/SensitiveInput.tsx` (campos sensibles: contraseñas, PIN de entrega e IBAN; botón mostrar/ocultar con `Eye`/`EyeOff`, `<button type="button">`). Se usa en `AuthModal`, `AdminDashboard`, `BusinessDashboard` y `CourierDashboard`.
- **Carga de medios (fotos y vídeos)**: fotos jpeg/jpg/png/gif reescaladas a máx. 800 px y calidad JPEG 0.65; vídeos mp4 de hasta 2 s recodificados a 480p, ~800 kbps, códec H.264. `processMediaFile(file)` procesa archivos de `<input type="file">`; `processMediaUrl(url)` procesa URLs pegadas (http/https o data:). `MEDIA_ACCEPT` incluye `.jpg,.jpeg,.png,.gif,.mp4` y sus MIME types. La integración prevista debe guardar el binario en Supabase Storage y la relación/URL segura en Supabase; mientras no esté implementada, el backend actual acepta URLs o data URLs con sus límites existentes. Todos los inputs de archivo tienen un campo de texto adicional para pegar una URL o ruta de archivo.
- **Lazy loading**: `src/hooks/useIntersectionObserver.ts` detecta cuándo un elemento entra al viewport; `src/components/LazyMediaView.tsx` envuelve `MediaView` con carga diferida, skeleton y altura fija para evitar layout shift. Se usa en `HomeView.tsx` (categorías, banners de comercios, productos destacados) y `BusinessDetailView.tsx` (imágenes de productos).
- **MediaView**: acepta `defaultSrc` (logo de PideTietar por defecto) y `showLoading`; muestra el logo por defecto si `src` está vacío o la carga falla.
- `server.js` sirve `dist/` estáticamente si existe **al arrancar**: un build viejo puede confundir tus pruebas en el 4000. Si no existía, el catch-all devuelve JSON hasta reiniciar.
- No hay CORS, helmet ni rate limiting: el frontend debe usar el proxy de Vite en desarrollo o el mismo origen en producción.
- Medios en Supabase: `POST /api/media` sube un data URL al bucket configurado y crea la relación en `public.media_assets`; `GET /api/media?entityType=...&entityId=...` consulta relaciones; `DELETE /api/media/:id` elimina archivo y relación con autorización. La migración está en `database/supabase_media.sql` y usa como `entity_id` los IDs externos de Hostinger.

## Auth, roles y permisos

- Roles: `CLIENT`, `BUSINESS_ADMIN`, `BUSINESS_COURIER`, `PLATFORM_COURIER`, `SUPERADMIN`.
- Sesión: token HMAC-SHA256 stateless (no JWT) con `sub`, `role`, `businessId`, `iat`, `exp`; TTL por defecto 168 h (`SESSION_TTL_HOURS`). Se acepta en `Authorization: Bearer ...` o `x-auth-token`. `requireAuth` / `requireRole(...)` lo validan; `requireSuperAdmin` = `requireRole("SUPERADMIN")`.
- Contraseñas con bcrypt. `POST /api/auth/register` siempre crea `CLIENT` y exige `address` (dirección de entrega) en el cuerpo; devuelve 400 `VALIDATION_ERROR` si falta. El superadmin puede entrar **sin BD** con `SUPERADMIN_PASSWORD`; el identificador de ese acceso de emergencia está fijado en `server.js` y **no** lo cambia `SUPERADMIN_USERNAME` (esa variable solo bautiza el usuario sembrado en la BD). En producción define siempre `SUPERADMIN_PASSWORD` y `SESSION_SECRET`.
- `POST /api/auth/login` acepta `username` o `email`. Si la cuenta tiene `password_change_required`, responde 403 `PASSWORD_CHANGE_REQUIRED`; `POST /api/auth/change-password` permite fijar la nueva sin sesión presentando identificador + contraseña actual.
- `GET /api/orders` exige sesión y filtra en servidor:
  - `SUPERADMIN` y `PLATFORM_COURIER`: todos (el de plataforma cubre el valle).
  - `BUSINESS_ADMIN`: solo su `business_id`.
  - `BUSINESS_COURIER`: pedidos de sus negocios asignados (`courier_business_ids`) **o** asignados a él (`courier_id`).
  - `CLIENT`: `customer_id` propio; los pedidos antiguos sin `customer_id` se aceptan por email.
- Los endpoints `/api/debug/*` son solo de superadmin.

## Reglas de negocio

- **IBAN**: la cuenta bancaria es del negocio (`businesses.account_number`) y, para repartidores, un dato de cobro (`app_users.account_number`). El cliente no la maneja (`AuthModal` la tiene eliminada a propósito). El dueño edita la de su negocio desde "DATOS DEL NEGOCIO"; la del repartidor solo la configura el superadmin y el dueño no puede verla ni editarla, solo confirmar al repartidor.
- **Negocios**: `GET` público; alta solo `SUPERADMIN` (crea negocio + horario + cuenta del propietario en una transacción); edición `SUPERADMIN` o el propietario de ese negocio; borrado `SUPERADMIN`, bloqueado con 409 `BUSINESS_HAS_ORDERS` si hay pedidos.
- **Usuarios**: `GET /api/users` solo superadmin y dueño de negocio (este ve únicamente sus `BUSINESS_COURIER`). El dueño solo crea repartidores de su negocio y con confirmación `PENDING`; el superadmin puede crear cualquier rol. `PUT /api/users/:id` permite al propio usuario, al superadmin o al dueño confirmar a su repartidor (este último solo `courierConfirmation`). `DELETE` solo superadmin y no permite borrarse a sí mismo.
- **Repartidores**: `courier_confirmation` ∈ `PENDING` | `BUSINESS_EMAIL` | `SUPERADMIN`; `BUSINESS_COURIER` necesita al menos un negocio. La ficha guarda teléfono, dirección y DNI/NIE en `app_users.phone/address/dni`; el alta exige esos tres datos en la UI y la edición permite completarlos. El panel de repartidor exige email verificado **y** confirmación (`BUSINESS_EMAIL` o `SUPERADMIN`) en el frontend. En el panel de superadmin el alta vive detrás del botón "Actualizar" (desplegar/ocultar), la clave se puede mostrar/ocultar y los errores del servidor se pintan en su campo (`toCourierFieldErrors`).
- **Pedidos**: importes siempre en **céntimos enteros**. Comisión de plataforma: 5 % del subtotal + 20 % del envío; `business_payout` y `courier_payout` se guardan en el pedido. El PIN de entrega lo genera el cliente y el servidor lo valida antes de aceptar `DELIVERED`. `POST /api/orders` y `PUT /api/orders/:id` aceptan camelCase y snake_case; las mutaciones comprueban el ámbito del negocio y bloquean cambios financieros posteriores para roles no autorizados. La creación todavía debe evolucionar para calcular importes exclusivamente en servidor.
- **Registro de cliente**: el alta (`POST /api/auth/register`) exige `localityId` (selector de localidad en el frontend) y `address`. La cesta del carrito se vacía al cerrar sesión y al iniciar una nueva sesión de cliente. Los formularios (registro, cesta) se limpian al cerrar y volver a abrir.
- **Catálogo**: `GET /api/products` público; `POST/PUT/DELETE` solo `SUPERADMIN`/`BUSINESS_ADMIN` y el servidor comprueba que el producto pertenece al negocio de la sesión. Las mutaciones de localidades también admiten `BUSINESS_ADMIN` sin comprobar ámbito. `POST/PUT /api/products` **sí validan que `category_id` exista** antes de escribir: sin categoría o con una inexistente devuelven 400 `VALIDATION_ERROR` con `errors.category_id` (MySQL tiene FK real a `categories`).
- **Categorías**: `GET /api/categories` público; `POST/PUT/DELETE /api/categories` solo `SUPERADMIN`. La tabla `categories` guarda `id`, `name`, `slug` único, `icon_name` e `image_url`. El gestor está en `CategoryManagerModal` y se abre desde `AdminDashboard` y desde `BusinessDashboard`. No se puede borrar una categoría usada por `businesses.category` o `products.category_id` (409 `CATEGORY_IN_USE`); un slug repetido devuelve 409 `CATEGORY_EXISTS`.
- **Email**: código de 6 dígitos vía SMTP (`SMTP_*`/`EMAIL_*`) o devuelto en la respuesta si no hay SMTP. Pero `createUser` inserta `email_verified = 1`: las cuentas nuevas nacen verificadas y el flujo de verificación no bloquea el alta; `send-verification-email` vuelve a marcar la cuenta como no verificada hasta introducir el código.
- **Pagos y Google**: `paymentService.ts` está simulado (IDs fake, sin Stripe/PayPal real); `googleWorkspace.ts` puede usar GIS real con `VITE_GOOGLE_CLIENT_ID`, pero sin token válido cae a enlaces de Calendar y logs de Gmail. No los presentes como integraciones reales sin configurar claves.

## Trampas

- **localStorage solo cachea** `pidetietar_orders` (con fusión entre pestañas), `pidetietar_cart`, `pidetietar_token`, `pidetietar_theme` y `pidetietar_google_token`. Localidades, negocios, productos y categorías **no se guardan**: la API es la fuente de verdad y una respuesta vacía deja la UI vacía. La clave `pidetietar_seed_cache_cleared_v1` limpia una sola vez las cachés antiguas de entidades (`localities`, `businesses`, `products`, `selected_locality`, `orders`, `cart`) para que una instalación vieja no siga mostrando datos demo; el token no se toca. Si pruebas la UI con un perfil antiguo, limpia localStorage.
- **MySQL y categorías**: `database/mysql_schema.sql` define `fk_products_category`; sin una fila válida en `categories` el alta de producto falla. No uses IDs fijos como `hamburguesas` ni el antiguo `"general"`: el formulario debe elegir una categoría de `/api/categories`. El arranque siembra las 15 iniciales si la tabla está vacía y no existe `categories_seeded_v1` en `platform_meta`; después no las repone.
- `loginAs` y la restauración de sesión **no inventan** direcciones ni suscripciones: usan lo que envíe el backend y dejan valores neutros si faltan. El backend **no persiste** `addresses` ni `subscriptionPlan`; no los uses como datos reales.
- Los pedidos locales se fusionan con los remotos (`mergeOrderLists`) y hay actualizaciones optimistas con rollback; no dupliques esa lógica ni elimines el refresco periódico.
- `node:sqlite` (`DatabaseSync`) exige **Node ≥ 22.5**; `package.json` ya lo declara en `engines`. Rechaza bindings booleanos: pasa siempre `Number(...)`.
- Los handlers async de Express se envuelven globalmente (línea ~24) para reenviar rejections a `next()`; no elimines ese wrapper ni el middleware de errores de 4 argumentos. También hay `unhandledRejection`/`uncaughtException` como red de seguridad.
- Límite `express.json({ limit: "2mb" })`: las imágenes van como data URL o `http(s)://` sin espacios. `fileToDataUrl` reescala a ~900.000 caracteres; respeta ese margen para no provocar 413.
- `vite.config.ts` admite `DISABLE_HMR=true` para desactivar HMR y file watching durante ediciones; el watcher ignora `data/`, `*.db*` y `dist/` (la BD se escribe en cada pedido y recargaba la página).
- `data/` está excluido de git (`data/*.db*`, `data/.session_secret`): no subas la base de datos ni el secreto de sesión.
- La contraseña histórica por defecto (`INSECURE_DEFAULT_PASSWORD` en `server.js`) está marcada como insegura: al arrancar, las cuentas que la usan reciben `password_change_required = 1`. No la reutilices en datos de prueba ni la copies a la documentación.
- `firebase-applet-config.json` y `metadata.json` son restos de AI Studio; no hay SDK de Firebase ni Gemini en el código.

## Contrato de errores de la API

- Validación: `400 { code: "VALIDATION_ERROR", message, errors }`. `errors` suele usar **snake_case** (columnas reales de la BD), pero usuarios y cuenta del propietario usan camelCase (`fullName`, `ownerUsername`, `courierBusinessIds`, etc.).
- El frontend los traduce a campos camelCase del formulario dentro de `src/components/FormErrors.tsx` (`owner_username`/`ownerUsername` → `adminUsername`, etc.). Si añades un campo nuevo, mápalo ahí.
- Códigos de dominio: `INVALID_CREDENTIALS` (401), `PASSWORD_CHANGE_REQUIRED` (403), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `USER_EXISTS` (409), `BUSINESS_HAS_ORDERS` (409), `CATEGORY_EXISTS` (409), `CATEGORY_IN_USE` (409), `INVALID_CODE` (400), `INVALID_DELIVERY_PIN` (400), `MEDIA_STORAGE_UNAVAILABLE` (503), `MEDIA_UPLOAD_FAILED` (502), `MEDIA_RELATION_FAILED` (502), `MEDIA_DELETE_FAILED` (502), `EXPIRED_CODE` (410), `FOREIGN_KEY_CONFLICT` (409), `PAYLOAD_TOO_LARGE` (413), `INTERNAL_ERROR` (500).
- Algunas rutas antiguas (p. ej. `PUT /api/localities/:id` sin campos) devuelven `{ success: false, message }` sin `code`; no asumas que todo error trae `errors`.

## Entorno

- `.env.example` documenta `PORT`, `DB_PATH`, MySQL (`MYSQL_*` o `DB_*`), `SUPERADMIN_*`, `SESSION_SECRET`, `APP_URL`, claves Stripe/PayPal y `VITE_GOOGLE_CLIENT_ID`.
- El código además lee `SESSION_TTL_HOURS`, `EMAIL_VERIFICATION_TTL_MINUTES` y SMTP (`SMTP_HOST/PORT/USER/PASS/SECURE/FROM` o alias `EMAIL_*`), que **no están en `.env.example`**.
