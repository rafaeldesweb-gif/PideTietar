export const TERMS_BUSINESS_TITLE = 'Términos y condiciones para negocios';
export const TERMS_BUSINESS_VERSION = 'v1';
export const TERMS_BUSINESS_LAST_UPDATED = '2 de noviembre de 2026';

export const TERMS_BUSINESS_CONTENT = `
<section class="prose prose-stone max-w-none dark:prose-invert prose-headings:font-black prose-h2:mt-8 prose-h2:text-xl prose-h3:text-base prose-p:text-sm prose-p:leading-7">

<h2 id="terminos-negocios">1. Objeto y aceptación</h2>
<p>
Estos Términos y Condiciones regulan la relación entre <strong>PideTiétar</strong> (la «Plataforma») y los establecimientos de alimentación y restauración del Valle del Tiétar que se den de alta como negocios adheridos (el «Negocio»). La Plataforma facilita herramientas digitales para la recepción y gestión de pedidos a domicilio.
</p>
<p>
El alta de un negocio solo puede realizarla el superadministrador de PideTiétar. Al aceptar estos términos, el Negocio declara actuar en el ejercicio de una actividad económica, disponer de los títulos y licencias necesarios para su apertura y funcionamiento, y comprometerse a cumplir la normativa aplicable (sanitaria, fiscal, de protección al consumidor, de protección de datos y laboral).
</p>

<h2>2. Alta, datos del negocio y cuenta del responsable</h2>
<p>
El Negocio debe proporcionar nombre comercial, razón social, CIF/NIF, dirección, localidad, teléfono, correo electrónico, cuenta bancaria (IBAN) para liquidaciones y datos del gerente/responsable (nombre y DNI/NIE). El IBAN es el único medio por el cual PideTiétar abonará las liquidaciones al Negocio.
</p>
<p>
La cuenta de acceso del propietario (usuario de negocio) se crea junto con el alta del establecimiento. El propietario es el único autorizado para editar los datos del negocio, gestionar el catálogo, actualizar horarios y aceptar o rechazar pedidos.
</p>

<h2>3. Catálogo, productos e información al consumidor</h2>
<p>
El Negocio es el único responsable de la veracidad, actualidad y legalidad de los precios, descripciones, ingredientes, alérgenos e imágenes de sus productos. Debe cumplir la normativa de información alimentaria (alérgenos, etiquetado, información nutricional si procede) y de seguridad alimentaria.
</p>
<p>
Los precios deben incluir el IVA. Los gastos de envío y el importe mínimo de pedido se configuran por el Negocio y se muestran al cliente antes de confirmar la compra.
</p>

<h2>4. Comisión de la plataforma y pagos</h2>
<p>
PideTiétar cobra al Negocio una comisión por cada pedido aceptado: <strong>5 % del subtotal de productos + 20 % de la tarifa de envío</strong>. El importe líquido que le corresponde al Negocio (<em>business payout</em>) se calcula como el subtotal menos la comisión de productos; el importe correspondiente al repartidor se calcula como la tarifa de envío menos la comisión de plataforma sobre el envío.</p>
<p>
Las liquidaciones se abonan al IBAN del Negocio con la periodicidad acordada (semanal o mensual) a través de la pasarela de pago integrada (Stripe Connect o similar). PideTiétar emite factura al Negocio por el importe de la comisión devengada.
</p>
<p>
El Negocio debe emitir factura o ticket al cliente por cada pedido cuando este lo solicite, conforme a la normativa fiscal española.</p>

<h2>5. Gestión de pedidos</h2>
<p>
El Negocio debe mantener actualizada la disponibilidad de productos y los horarios de apertura. Debe aceptar o rechazar los pedidos en el tiempo mostrado en la aplicación y preparar y entregar los pedidos en buen estado y dentro del plazo acordado.</p>
<p>
El Negocio responde frente al cliente de la calidad, existencia, composición, alérgenos, seguridad y entrega del producto. PideTiétar no es parte en el contrato de compraventa entre el Negocio y el cliente.</p>

<h2>6. Repartidores</h2>
<p>
El reparto podrá realizarse por personal propio del Negocio, por repartidores asignados al Negocio en la Plataforma o por repartidores de plataforma, según la modalidad seleccionada para cada pedido.</p>
<p>
El Negocio es responsable de instruir a sus propios repartidores y de que cumplan con la normativa laboral, de seguridad vial y de protección de datos aplicable.</p>

<h2>7. Suspensión y baja</h2>
<p>
PideTiétar podrá suspender o dar de baja a un negocio por incumplimiento de estos términos, actividad ilegal, quejas reiteradas de clientes o problemas de seguridad alimentaria.</p>
<p>
No se permite eliminar un negocio si tiene pedidos asociados pendientes o facturados (bloqueo por pedidos existentes). En caso de baja, los datos del Negocio se conservarán el tiempo necesario para cumplir obligaciones fiscales y legales.</p>

<h2>8. Responsabilidades</h2>
<p>
PideTiétar actúa como intermediario tecnológico y no garantiza la disponibilidad permanente del servicio ni de los repartidores. El Negocio es el único responsable frente al cliente y frente a terceros por los productos servidos, los incumplimientos de horarios y las incidencias en la entrega.</p>

<h2>9. Protección de datos</h2>
<p>
El Negocio acepta que PideTiétar trate sus datos de identificación, contacto y bancarios con la finalidad de gestionar la relación contractual y las liquidaciones. La información detallada figura en la Política de privacidad.</p>

<h2>10. Ley aplicable y jurisdicción</h2>
<p>
Se aplica la legislación española. Cualquier controversia se someterá a los juzgados y tribunales de Ávila, salvo que una norma imperativa establezca otra competencia.</p>

</section>
`;
