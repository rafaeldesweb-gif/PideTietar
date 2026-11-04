export const PRIVACY_POLICY_TITLE = 'Política de privacidad';
export const PRIVACY_POLICY_VERSION = 'v1';
export const PRIVACY_POLICY_LAST_UPDATED = '2 de noviembre de 2026';

export const PRIVACY_POLICY_CONTENT = `
<section class="prose prose-stone max-w-none dark:prose-invert prose-headings:font-black prose-h2:mt-8 prose-h2:text-xl prose-h3:text-base prose-p:text-sm prose-p:leading-7">

<h2 id="politica-privacidad">1. Responsable del tratamiento</h2>
<p>
El responsable del tratamiento de sus datos personales es <strong>PideTiétar</strong>, plataforma de intermediación de pedidos de alimentación y restauración en el Valle del Tiétar (Ávila). Puede contactar con nosotros a través de los canales habilitados en la aplicación.</p>

<h2>2. Datos que tratamos y con qué finalidad</h2>
<p>
Tratamos las siguientes categorías de datos, según el tipo de usuario:</p>

<h3>Clientes</h3>
<ul>
<li>Identificativos: nombre, correo electrónico, teléfono, dirección de entrega, localidad.</li>
<li>Credenciales de acceso: contraseña (almacenada con hash seguro).</li>
<li>Datos de pedidos: productos, importe, dirección de entrega, PIN de entrega, método de pago.</li>
<li>Datos de navegación y preferencias (tema oscuro/claro, localidad seleccionada).</li>
</ul>

<h3>Negocios</h3>
<ul>
<li>Identificativos: nombre comercial, razón social, CIF/NIF, dirección, localidad, teléfono, correo electrónico.</li>
<li>Datos bancarios: IBAN para liquidaciones.</li>
<li>Datos del gerente/responsable: nombre y DNI/NIE.</li>
<li>Datos del propietario de la cuenta de usuario: nombre, correo, contraseña.</li>
</ul>

<h3>Repartidores</h3>
<ul>
<li>Identificativos: nombre, correo electrónico, teléfono, dirección, DNI/NIE.</li>
<li>Datos bancarios: IBAN para cobro de servicios.</li>
<li>Estado de confirmación y disponibilidad (en línea/fuera de línea).</li>
<li>Negocios asignados y pedidos gestionados.</li>
</ul>

<h2>3. Base jurídica del tratamiento</h2>
<ul>
<li><strong>Ejecución de un contrato:</strong> registro de cuenta, gestión de pedidos, liquidaciones a negocios y repartidores.</li>
<li><strong>Consentimiento:</strong> aceptación de términos y condiciones, recepción de comunicaciones comerciales (si se marca).</li>
<li><strong>Obligación legal:</strong> facturación, conservación de registros contables, prevención de fraude.</li>
<li><strong>Interés legítimo:</strong> seguridad de la plataforma, prevención de usos fraudulentos, mejora del servicio.</li>
</ul>

<h2>4. Destinatarios de los datos</h2>
<ul>
<li><strong>Negocios:</strong> reciben los datos necesarios del cliente para entregar el pedido (nombre, dirección, teléfono, detalles del pedido).</li>
<li><strong>Repartidores:</strong> reciben los datos necesarios para realizar la entrega (dirección, teléfono, PIN de entrega).</li>
<li><strong>Proveedores de pago:</strong> Stripe, PayPal u otros PSP gestionan los pagos. PideTiétar no almacena datos de tarjetas de crédito.</li>
<li><strong>Proveedores tecnológicos:</strong> Supabase (almacenamiento de medios), Google (Calendar, Gmail, GIS si está configurado), Geoapify/OpenStreetMap (geocodificación de direcciones), Vite/Playwright (entorno de desarrollo y pruebas).</li>
<li><strong>Autoridades públicas:</strong> solo cuando exista una obligación legal.</li>
</ul>

<h2>5. Transferencias internacionales</h2>
<p>
Algunos proveedores (Supabase, Google, Stripe, PayPal) pueden tener servidores fuera del Espacio Económico Europeo. En esos casos, PideTiétar se asegura de que existan garantías adecuadas (cláusulas contractuales estándar, decisiones de adecuación o mecanismos equivalentes) antes de compartir datos.</p>

<h2>6. Plazos de conservación</h2>
<ul>
<li>Datos de cuenta: mientras la cuenta esté activa y, posteriormente, el tiempo necesario para cumplir obligaciones legales (facturación, reclamaciones, prevención de fraude).</li>
<li>Datos de pedidos y facturas: el tiempo exigido por la normativa fiscal y contable española.</li>
<li>Datos de repartidores: durante la vigencia de la relación y el plazo de prescripción de posibles reclamaciones laborales o mercantiles.</li>
</ul>

<h2>7. Derechos de los usuarios</h2>
<p>
Usted puede ejercer en cualquier momento los siguientes derechos:</p>
<ul>
<li>Acceso a sus datos personales.</li>
<li>Rectificación de datos inexactos.</li>
<li>Supresión («derecho al olvido»), salvo obligación legal de conservación.</li>
<li>Limitación del tratamiento.</li>
<li>Portabilidad de sus datos.</li>
<li>Oposición al tratamiento basada en interés legítimo o marketing.</li>
<li>Retirada del consentimiento, sin que afecte al tratamiento previo.</li>
</ul>
<p>
Para ejercer estos derechos, puede contactar con PideTiétar a través de los canales de la aplicación o por correo electrónico. Tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) si considera que sus derechos no han sido atendidos.</p>

<h2>8. Seguridad de los datos</h2>
<p>
PideTiétar adopta medidas técnicas y organizativas adecuadas para proteger sus datos contra acceso no autorizado, alteración, pérdida o divulgación: contraseñas con hash (bcrypt), comunicaciones cifradas (HTTPS), acceso restringido a datos sensibles (IBAN, DNI) y registros de auditoría.</p>
<p>
En caso de brecha de seguridad que pueda suponer un riesgo para sus derechos y libertades, PideTiétar notificará a la Agencia Española de Protección de Datos en el plazo de 72 horas y a los usuarios afectados cuando sea necesario.</p>

<h2>9. Menores de edad</h2>
<p>
La Plataforma no está destinada a menores de 18 años. No recabamos datos de menores a sabiendas. Si detectamos que un menor nos ha proporcionado datos, los eliminaremos.</p>

<h2>10. Cambios en esta política</h2>
<p>
PideTiétar podrá actualizar esta Política de privacidad. Los cambios relevantes se comunicarán por la aplicación o por correo electrónico.</p>

</section>
`;
