# Cierre de sesión y conexiones simultáneas

## Reglas aplicadas

- Una conexión activa por cuenta, incluidos cliente, repartidores y SuperAdmin.
- Solo las cuentas `BUSINESS_ADMIN` admiten conexiones adicionales autorizadas por SuperAdmin en el botón «Conexiones» de su tabla de negocios.
- El servidor cuenta las sesiones y reserva los cupos dentro de una transacción por usuario. Un acceso simultáneo sin cupo devuelve `409 SESSION_LIMIT_REACHED`; no expulsa a quien ya estaba conectado.
- Recargar el mismo navegador conserva su sesión y no ocupa otro cupo. No se usa la IP ni la dirección MAC como prueba de identidad.
- Token, pedidos, cesta y acceso de Google pasan a `sessionStorage`; los valores antiguos de `localStorage` se eliminan. Cerrar sesión los borra incluso si falla el reporte por correo.
- Al cerrar el navegador, su conexión termina. Tras 10 segundos sin señal, el servidor revoca la sesión, libera el cupo y solicita el reporte diario. La revisión se ejecuta cada segundo. Si se pierde Internet, el cliente también borra su sesión a los 10 segundos y no vuelve a entrar automáticamente al recuperar la red.
- Los cortes menores permiten reconectar. Una cuenta de negocio con otra conexión autorizada activa mantiene su turno abierto; al cerrar la última se cierra el turno. El repartidor queda fuera de línea al terminar su sesión.

## Implementación y despliegue

`server.js` crea `auth_sessions` y migra `app_users.additional_connections` en SQLite y MySQL. Los tokens HMAC incluyen un `sid` y se comprueba su estado en servidor. Los tokens de la versión anterior requieren nuevo login.

La presencia usa WebSocket autenticado en `/api/auth/session`, con ping/pong nativo y token en el primer mensaje (no en la URL). El proxy de Vite está configurado con `ws: true`. Producción debe publicar juntos frontend/backend y permitir el upgrade WebSocket; no se ha desplegado ni verificado el proxy real de Hostinger.

## Validación aislada

- Lint, build, 30 pruebas de utilidades, 49 de API y 11 comprobaciones de sesión/perfil en navegador correctos.
- Conexión autenticada comprobada también a través del proxy real de desarrollo de Vite.
- Bloqueo de un segundo dispositivo y conservación de la primera conexión.
- Dos intentos simultáneos: exactamente uno consigue el cupo.
- Reutilización de la sesión al recargar y revocación de tokens al cerrar.
- Solo SuperAdmin puede ampliar cupos, y solo de negocios; no se reduce el límite por debajo de conexiones activas.
- Conservación/cierre del turno según quede otra conexión del negocio.
- Conexiones WebSocket reales contra servidor/SQLite temporales: se conserva una conexión viva y se revoca cuando cierra o deja de responder. Las pruebas aceleran el umbral del servidor sin cambiar los 10 segundos del cliente.
- Navegador Edge: limpieza de almacenamiento antiguo, cierre manual, reapertura, F5, corte breve y corte superior a 10 segundos (reloj de prueba), fallo de reporte y autorización desde el panel de SuperAdmin.

Las pruebas no envían correos reales ni modifican Hostinger. La batería general de formularios tiene los seis fallos ajenos a sesiones ya registrados en `repartidor-reportes-sesion-2026-11-07.md`; no se presenta como una preproducción completa aprobada.
