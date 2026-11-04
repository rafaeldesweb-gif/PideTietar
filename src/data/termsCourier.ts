export const TERMS_COURIER_TITLE = 'Términos y condiciones para repartidores';
export const TERMS_COURIER_VERSION = 'v1';
export const TERMS_COURIER_LAST_UPDATED = '2 de noviembre de 2026';

export const TERMS_COURIER_CONTENT = `
<section class="prose prose-stone max-w-none dark:prose-invert prose-headings:font-black prose-h2:mt-8 prose-h2:text-xl prose-h3:text-base prose-p:text-sm prose-p:leading-7">

<h2 id="terminos-repartidores">1. Objeto y aceptación</h2>
<p>
Estos Términos y Condiciones regulan el uso de la aplicación <strong>PideTiétar</strong> por parte de las personas que actúan como repartidores (el «Repartidor»), ya sea como repartidor de plataforma o como repartidor asociado a uno o varios negocios adheridos.</p>
<p>
El perfil de repartidor permite recibir y gestionar oportunidades de entrega asignadas por un negocio o por la plataforma. La aplicación no garantiza un número mínimo de servicios, ingresos, horarios, zonas, exclusividad ni continuidad.</p>

<h2>2. Registro y confirmación del repartidor</h2>
<p>
Para registrarse como repartidor es necesario proporcionar nombre completo, correo electrónico, teléfono, dirección, DNI/NIE y contraseña. También se solicita una cuenta bancaria (IBAN) para las liquidaciones de los servicios realizados.</p>
<p>
El repartidor debe ser confirmado antes de recibir pedidos. La confirmación puede ser realizada por el superadministrador de PideTiétar (<em>SUPERADMIN</em>) o por el negocio al que está asignado (<em>BUSINESS_EMAIL</em>). Mientras el estado sea <em>PENDING</em>, el repartidor no podrá recibir oportunidades de entrega.</p>
<p>
Un repartidor de negocio debe estar asociado a al menos un negocio. Un repartidor de plataforma puede ser asignado a varios negocios por el superadministrador.</p>

<h2>3. Disponibilidad y aceptación de entregas</h2>
<p>
El repartidor gestiona su disponibilidad (en línea / fuera de línea) desde su panel. Cuando acepte una entrega, deberá cumplir las instrucciones operativas, proteger el pedido, respetar el PIN de entrega del cliente y comunicar con rapidez cualquier impedimento.</p>
<p>
El repartidor puede dejar de utilizar la plataforma en cualquier momento, sin compromiso de permanencia, exclusividad ni número mínimo de servicios.</p>

<h2>4. Liquidaciones y pagos al repartidor</h2>
<p>
El importe que le corresponde al repartidor por cada entrega (<em>courier payout</em>) se calcula como la tarifa de envío menos la comisión de plataforma (20 % del envío). Las propinas (<em>tips</em>) se gestionan conforme a lo acordado con el negocio o el cliente.</p>
<p>
Los pagos al repartidor se abonan al IBAN proporcionado en su perfil. El IBAN es un dato sensible: solo el superadministrador puede configurarlo o modificarlo. El dueño del negocio no puede ver ni editar el IBAN del repartidor.</p>

<h2>5. Obligaciones del repartidor</h2>
<p>
El repartidor debe:<ul><li>Mantener actualizados sus datos personales (teléfono, dirección, DNI/NIE).</li><li>Entregar los pedidos en la dirección y plazo acordados.</li><li>Validar el PIN de entrega antes de marcar el pedido como entregado.</li><li>Respetar la confidencialidad de los datos del cliente y del negocio.</li><li>Utilizar la información recibida únicamente para completar la entrega.</li><li>Conducir con diligencia y respetar la normativa de seguridad vial.</li></ul></p>

<h2>6. Relación jurídica</h2>
<p>
Estos términos regulan el uso de la aplicación y la coordinación de entregas. No sustituyen el contrato laboral, mercantil o de prestación de servicios que pudiera ser necesario conforme a la relación real y a la legislación aplicable, incluida la normativa específica sobre reparto de última milla y plataformas de reparto.</p>

<h2>7. Responsabilidades</h2>
<p>
El repartidor responde de los daños o pérdidas causados en la entrega por negligencia propia. No es responsable de la calidad del producto, que corresponde al negocio.</p>
<p>
PideTiétar no responde de los actos u omisiones del repartidor en la realización de la entrega, salvo negligencia grave de la plataforma.</p>

<h2>8. Protección de datos</h2>
<p>
Los datos del repartidor (nombre, correo, teléfono, dirección, DNI/NIE, IBAN) se tratan conforme a la Política de privacidad. El IBAN solo es accesible al superadministrador y se utiliza exclusivamente para liquidaciones.</p>

<h2>9. Conductas prohibidas</h2>
<p>
No está permitido manipular pedidos, suplantar identidades, compartir credenciales, extraer datos de forma automatizada, acosar a clientes o negocios, o intentar alterar la seguridad del servicio. PideTiétar podrá suspender o retirar la confirmación de un repartidor cuando exista causa justificada.</p>

<h2>10. Ley aplicable y jurisdicción</h2>
<p>
Se aplica la legislación española, respetando los derechos laborales imperativos y las reglas de competencia judicial obligatorias.</p>

</section>
`;
