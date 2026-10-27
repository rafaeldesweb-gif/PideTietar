# Revisión de formularios y CRUD — 27/10/2026

Resultado: pruebas locales aprobadas; despliegue de producción pendiente de resolver los bloqueos indicados al final.

## Ejecución

```bash
npm run test:preproduction
```

Resultado de esta ejecución:

| Comprobación | Resultado |
| --- | --- |
| TypeScript (`npm run lint`) | Correcto |
| Utilidades existentes (`npm test`) | 15 pruebas aprobadas |
| CRUD, perfiles y medios (`npm run test:api`) | 29 pruebas aprobadas |
| Formularios en navegador (`npm run test:forms`) | 21 pruebas aprobadas |
| Compilación (`npm run build`) | Correcta; aviso de bundle superior a 500 kB |

Son 65 pruebas según el contador de `node:test`, que incluye los casos que agrupan subpruebas. Las pruebas de navegador incluyen 28 combinaciones de siete pantallas y cuatro anchos: 320, 375, 768 y 1280 px.

Las pruebas usan procesos independientes, SQLite temporal, contraseñas aleatorias y limpieza de sus datos al terminar. No crean ni borran usuarios, pedidos, negocios ni archivos en Hostinger o Supabase reales. La sustitución de archivos de Supabase usa el SDK real con transporte HTTP simulado.

En Windows, las pruebas de navegador usan Microsoft Edge instalado; en otros sistemas requieren Chromium de Playwright. El cargador `tsx` falló al consultar el usuario de Windows dentro del entorno restringido de Codex; la batería completa terminó correctamente al ejecutarse fuera de ese aislamiento.

## Cobertura

| Área | Flujos comprobados |
| --- | --- |
| Registro y acceso | Registro, dirección y localidad, email inválido, duplicados, acceso por username, restauración del perfil |
| Contraseñas | Cambio obligatorio por interfaz, cambio por API, contraseña anterior rechazada, nueva contraseña aceptada |
| Perfil | Nombre, correo, teléfono, avatar y contraseña; usuario nuevo y sesión antigua del superadmin; prohibición de editar otro usuario |
| Localidades | Alta, lectura, edición y borrado; gestores de superadmin y del modal; nombre vacío e ID inexistente |
| Categorías | Alta, lectura, edición y borrado desde UI y API; slug duplicado, categoría en uso y acceso sin sesión |
| Negocios | Alta desde los dos formularios, cuenta del propietario, datos, IBAN, horarios, envío gratuito y ámbito del propietario; borrado sin pedidos y bloqueo si hay pedidos |
| Repartidores | Alta desde negocio y superadmin, edición de contacto e IBAN, confirmación, restricciones del dueño y ocultación del IBAN |
| Productos | Alta, lectura, edición y borrado por UI y API; ingredientes, extras, categoría, disponibilidad y precios inválidos |
| Fotos | Preparación de PNG en UI y error de almacenamiento; reutilización de archivo y fila, compatibilidad con rutas antiguas y dos subidas simultáneas en el transporte simulado |
| Personalización | Selección de extras y conservación en la cesta |
| Cesta | Teléfono introducido, recogida, fallo de API con carrito conservado y reintento correcto |
| Comanda manual | Apertura, cliente, teléfono, personalización, nota y persistencia del pedido |
| Pedidos | Alta con líneas, lectura por rol, actualización, PIN incorrecto/correcto, valoración y borrado; protección contra sobrescritura por POST |
| Valoraciones | Persistencia de la nota y actualización de la media y el número de reseñas del negocio |
| Diseño adaptable | Superadmin, negocio, categorías, perfil, personalizador, cesta y repartidor en los cuatro anchos indicados |

El CRUD no implica que cada entidad tenga las cuatro operaciones expuestas en la interfaz: se comprueban los formularios existentes y las operaciones correspondientes de su API.

## Fallos corregidos durante esta revisión

- Registro sin validación del formato del email y de la existencia de la localidad.
- Nombres de localidad vacíos y éxito falso al editar un ID inexistente.
- Precios negativos o con fracciones de céntimo e impuestos fuera de rango en productos.
- Creación de pedidos que sobrescribía pedidos existentes mediante `upsert`.
- Creación de pedidos sin comprobar el ámbito del negocio, importes no negativos, estados, líneas, cantidades y pertenencia de productos.
- PIN de entrega enviado incorrectamente desde el panel del repartidor; confirmación de éxito antes de esperar la API.
- Posibilidad de cambiar el PIN mediante la actualización del pedido, fuera de la verificación de entrega.
- Valoraciones sin validación de rango, aliases camelCase rechazados y media del negocio sin persistencia.
- Teléfono escrito en la cesta ignorado al construir el pedido.
- Dirección perdida en la sesión inmediatamente después del registro o de entrar por username.
- Formularios de producto y comanda que se limpiaban antes de conocer el resultado del servidor.
- Edición de producto sin restaurar los datos mostrados si fallaba el guardado.
- Configuración del administrador que se cerraba incluso con errores de validación.
- Comanda manual sin botón para abrir su formulario.
- Sustitución de gastos de envío de cero por importes por defecto.
- Contenedores de medios que podían cubrir controles y fallback recursivo si también fallaba la imagen de respaldo. El respaldo ahora usa el logo local.
- Desbordamiento del panel de superadmin en móvil.
- Endpoint de salud que podía abrir nuevos pools o cambiar de motor al consultarlo.
- Mensajes genéricos de validación que ocultaban el campo que fallaba.
- Pie de página que presentaba Stripe/PayPal como verificados pese a usar pagos simulados.

## Bloqueos de producción confirmados

1. **Hostinger rechaza la conexión.** La comprobación directa al terminar devuelve `ER_ACCESS_DENIED_ERROR`; el backend local activo usa SQLite. Falta verificar permisos remotos y credenciales y repetir la batería en una base MySQL/MariaDB de pruebas. Pasar en SQLite no demuestra compatibilidad completa con Hostinger.
2. **Pagos simulados.** `src/services/paymentService.ts` genera identificadores ficticios. No se ha realizado ningún cargo real ni verificado Stripe/PayPal, webhooks, reembolsos o liquidaciones. El éxito del checkout local solo verifica el formulario y su API.
3. **Importes aún procedentes del navegador.** La API ahora rechaza valores negativos, fracciones, líneas inválidas y sobrescrituras, pero todavía acepta el desglose financiero recibido. Falta calcular precios, extras, envío, comisión y liquidaciones en el servidor y contrastar el pago con el proveedor antes de considerar un pedido pagado. Validar números no sustituye esa comprobación.

## Límites de esta ejecución

- No se enviaron correos reales ni se crearon citas en Google Calendar. La verificación por código se probó con SMTP desactivado en el proceso aislado; que el entorno local tenga SMTP configurado no demuestra entrega real.
- No se sobrescribieron archivos reales de Supabase. La autorización, Storage, caché/CDN y relación real deben comprobarse en un entorno de pruebas conectado antes del despliegue.
- No se ensayaron vídeos reales, todos los tipos de archivo, todas las combinaciones de extras, carga concurrente de pedidos ni un catálogo grande.
- Las pruebas no son una auditoría exhaustiva de seguridad ni certifican la aplicación para producción.

Los bloqueos anteriores permanecen abiertos. No se ha desplegado la aplicación.
