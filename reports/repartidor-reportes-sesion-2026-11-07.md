# Historial del repartidor y reportes de cierre de sesión

## Comportamiento

- Nombre junto al avatar del repartidor; en móvil también aparece junto al avatar dentro del menú.
- Historial de entregas propias desde el inicio de sesión. Recargar conserva el corte; un nuevo login lo reinicia. Los pedidos no se borran.
- Si un repartidor confirma con PIN una entrega sin repartidor asignado, el servidor registra a ese repartidor como responsable.
- Al cerrar sesión, la API genera el reporte del día de Madrid con los pedidos guardados. El correo de destino sale de la cuenta autenticada; el cliente no elige destinatario ni ámbito.
- Cliente: sus compras. Negocio: sus pedidos. Repartidor: sus repartos. SuperAdmin: resumen global, totales por zona y detalle por negocio, incluidos negocios sin movimientos.
- El correo incluye el detalle y un CSV. Omite PIN, contraseñas y cuentas bancarias.
- Los fallos de SMTP no impiden cerrar sesión y se comunican sin anunciar un envío inexistente.

El punto 4 de la petición terminaba en «dividido por zona y…». El criterio aplicado es zona → negocio y envío global al cerrar la propia sesión del SuperAdmin; no hay envío global por cada cierre de otro usuario ni una tarea programada.

## Validación

- Utilidades: 30 pruebas correctas.
- API: 47 pruebas correctas, incluidas autorización, destinatario real de la cuenta, desglose, día de Madrid, agrupación global, envío simulado, fallo simulado de SMTP y ausencia de SMTP.
- Navegador Edge con API/SQLite temporales: el flujo del repartidor y la comprobación responsive pasan. Se verifica historial 0 → 1, conservación al recargar, cierre efectivo en la interfaz y nuevo login con historial 0.
- Cabecera inspeccionada visualmente en 768 y 1280 px. La comprobación de paneles cubre 320, 375, 768 y 1280 px, sin desbordamientos ni solapamiento del logo con las acciones del repartidor.
- Los correos de prueba usan un transporte simulado; no se enviaron mensajes a servicios reales ni se modificó Hostinger.

## Fallos de la batería general de formularios

La batería completa no está verde: fallan seis subpruebas de otros formularios.

1. Registro: busca un checkbox de términos que no está en el formulario actual.
2. Categorías: la API rechaza el valor de imagen enviado por el formulario.
3. Alta de comercio: busca el checkbox de términos dentro del formulario.
4. Alta de negocio desde cocina: el mismo selector de términos no encuentra el checkbox.
5. Configuración del propietario: busca el antiguo botón «Abrir configuracion».
6. Comanda manual: no encuentra el campo con el placeholder de nota esperado.

Estos formularios no se han modificado en esta tarea. No se ha certificado el envío real de SMTP ni se ha desplegado esta versión.
