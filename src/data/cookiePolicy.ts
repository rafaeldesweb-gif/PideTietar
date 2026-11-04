export const COOKIE_POLICY_TITLE = 'Política de cookies';
export const COOKIE_POLICY_VERSION = 'v1';
export const COOKIE_POLICY_LAST_UPDATED = '2 de noviembre de 2026';

export const COOKIE_POLICY_CONTENT = `
<section class="prose prose-stone max-w-none dark:prose-invert prose-headings:font-black prose-h2:mt-8 prose-h2:text-xl prose-h3:text-base prose-p:text-sm prose-p:leading-7">

<h2 id="politica-cookies">1. Qué son las cookies</h2>
<p>
Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web o utiliza una aplicación web. Permiten recordar información sobre su visita, como el idioma preferido, la sesión iniciada o los artículos del carrito.</p>

<h2>2. Cookies que utilizamos en PideTiétar</h2>
<p>
PideTiétar es una aplicación de una sola página (Single Page Application) construida con React y Vite. Utilizamos principalmente <strong>almacenamiento local del navegador (localStorage)</strong> y, en menor medida, cookies técnicas estrictamente necesarias para el funcionamiento del servicio:</p>

<h3>Cookies técnicas (estrictamente necesarias)</h3>
<ul>
<li>Sesión de usuario: mantiene identificada su sesión mientras navega por la aplicación (token de autenticación).</li>
<li>Carrito de compra: almacena temporalmente los productos seleccionados para finalizar el pedido.</li>
<li>Preferencias de interfaz: tema oscuro/claro, localidad seleccionada, vista actual.</li>
</ul>
<p>
Estas cookies no requieren su consentimiento porque son esenciales para que la aplicación funcione. Sin ellas, no podría iniciar sesión ni realizar pedidos.</p>

<h3>Cookies de analítica y rendimiento</h3>
<p>
Actualmente PideTiétar <strong>no instala cookies de analítica de terceros</strong> (por ejemplo, Google Analytics) sin su consentimiento previo. Si en el futuro se introdujeran, se le informará y se le pedirá su consentimiento antes de activarlas.</p>

<h3>Cookies de redes sociales y externos</h3>
<p>
La aplicación puede enlazar a servicios externos (Google Calendar, Gmail, Geoapify, Supabase, Stripe, PayPal). Esos servicios pueden instalar sus propias cookies cuando usted interactúe con ellos. PideTiétar no controla esas cookies; le recomendamos revisar las políticas de privacidad y cookies de cada proveedor.</p>

<h2>3. Gestión y desactivación de cookies</h2>
<p>
Puede configurar su navegador para aceptar, rechazar o eliminar cookies en cualquier momento. También puede borrar el almacenamiento local de la aplicación desde la configuración de su navegador. Tenga en cuenta que desactivar las cookies técnicas puede impedir el funcionamiento de la aplicación (inicio de sesión, carrito, pedidos).</p>

<h2>4. Base jurídica</h2>
<p>
El uso de cookies técnicas se basa en el interés legítimo de proporcionar el servicio solicitado por el usuario. Cualquier cookie opcional requerirá su consentimiento previo, informado y expreso.</p>

<h2>5. Cambios en esta política</h2>
<p>
PideTiétar podrá actualizar esta Política de cookies. Los cambios se publicarán en la aplicación con la fecha de última actualización.</p>

</section>
`;
