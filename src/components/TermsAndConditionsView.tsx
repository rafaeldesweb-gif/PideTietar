import React, { useState } from 'react';
import { ArrowLeft, Bike, FileText, ShieldCheck, User, Building2, ShieldAlert } from 'lucide-react';
import { ProjectLogo } from './ProjectLogo';
import {
  COURIER_TERMS_ANCHOR,
  TERMS_BUSINESS_ANCHOR,
  TERMS_CLIENT_ANCHOR,
  PRIVACY_POLICY_ANCHOR,
  COOKIE_POLICY_ANCHOR,
  TERMS_ACCEPTED_MESSAGE,
  TERMS_ANCHOR,
  TERMS_LAST_UPDATED,
  TERMS_VERSION,
  openTermsInNewTab,
} from '../data/legalTerms';
import { TERMS_CLIENT_CONTENT, TERMS_CLIENT_TITLE, TERMS_CLIENT_VERSION as CLIENT_VERSION, TERMS_CLIENT_LAST_UPDATED as CLIENT_UPDATED } from '../data/termsClient';
import { TERMS_BUSINESS_CONTENT, TERMS_BUSINESS_TITLE, TERMS_BUSINESS_VERSION as BUSINESS_VERSION, TERMS_BUSINESS_LAST_UPDATED as BUSINESS_UPDATED } from '../data/termsBusiness';
import { TERMS_COURIER_CONTENT, TERMS_COURIER_TITLE, TERMS_COURIER_VERSION as COURIER_VERSION, TERMS_COURIER_LAST_UPDATED as COURIER_UPDATED } from '../data/termsCourier';
import { PRIVACY_POLICY_CONTENT, PRIVACY_POLICY_TITLE, PRIVACY_POLICY_VERSION as PRIVACY_VERSION, PRIVACY_POLICY_LAST_UPDATED as PRIVACY_UPDATED } from '../data/privacyPolicy';
import { COOKIE_POLICY_CONTENT, COOKIE_POLICY_TITLE, COOKIE_POLICY_VERSION as COOKIES_VERSION, COOKIE_POLICY_LAST_UPDATED as COOKIES_UPDATED } from '../data/cookiePolicy';

interface TermsAndConditionsViewProps {
  onBack: () => void;
}

type TermsDoc = 'client' | 'business' | 'courier' | 'privacy' | 'cookies' | 'legacy';

const getTermsDoc = (hash: string): TermsDoc => {
  if (hash === TERMS_CLIENT_ANCHOR) return 'client';
  if (hash === TERMS_BUSINESS_ANCHOR) return 'business';
  if (hash === COURIER_TERMS_ANCHOR) return 'courier';
  if (hash === PRIVACY_POLICY_ANCHOR) return 'privacy';
  if (hash === COOKIE_POLICY_ANCHOR) return 'cookies';
  return 'legacy';
};

const getDocContent = (type: TermsDoc) => {
  switch (type) {
    case 'client':
      return {
        title: TERMS_CLIENT_TITLE,
        version: CLIENT_VERSION,
        lastUpdated: CLIENT_UPDATED,
        content: TERMS_CLIENT_CONTENT,
        icon: <User className="mt-0.5 h-5 w-5 shrink-0 text-[#ff4e00]" />,
        intro: 'Estos términos regulan la relación entre usted como cliente y PideTiétar al utilizar la aplicación para realizar pedidos de alimentación y restauración.',
      };
    case 'business':
      return {
        title: TERMS_BUSINESS_TITLE,
        version: BUSINESS_VERSION,
        lastUpdated: BUSINESS_UPDATED,
        content: TERMS_BUSINESS_CONTENT,
        icon: <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[#ff4e00]" />,
        intro: 'Estos términos regulan la relación entre su negocio y PideTiétar como plataforma de intermediación de pedidos.',
      };
    case 'courier':
      return {
        title: TERMS_COURIER_TITLE,
        version: COURIER_VERSION,
        lastUpdated: COURIER_UPDATED,
        content: TERMS_COURIER_CONTENT,
        icon: <Bike className="mt-0.5 h-5 w-5 shrink-0 text-[#ff4e00]" />,
        intro: 'Estos términos regulan su uso de la aplicación como repartidor, ya sea de plataforma o asociado a uno o varios negocios.',
      };
    case 'privacy':
      return {
        title: PRIVACY_POLICY_TITLE,
        version: PRIVACY_VERSION,
        lastUpdated: PRIVACY_UPDATED,
        content: PRIVACY_POLICY_CONTENT,
        icon: <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#ff4e00]" />,
        intro: 'Información sobre cómo PideTiétar trata sus datos personales, con qué finalidad y cómo puede ejercer sus derechos.',
      };
    case 'cookies':
      return {
        title: COOKIE_POLICY_TITLE,
        version: COOKIES_VERSION,
        lastUpdated: COOKIES_UPDATED,
        content: COOKIE_POLICY_CONTENT,
        icon: <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#ff4e00]" />,
        intro: 'Información sobre las cookies y el almacenamiento local que utiliza PideTiétar y cómo puede gestionarlos.',
      };
    default:
      return {
        title: 'Términos y condiciones de uso',
        version: TERMS_VERSION,
        lastUpdated: TERMS_LAST_UPDATED,
        content: null,
        icon: <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#ff4e00]" />,
        intro: 'Términos generales de uso de la aplicación PideTiétar.',
      };
  }
};

export const TermsAndConditionsView: React.FC<TermsAndConditionsViewProps> = ({ onBack }) => {
  const hash = window.location.hash;
  const termsDoc = getTermsDoc(hash);
  const doc = getDocContent(termsDoc);
  const isTermsOrCourier = termsDoc === 'client' || termsDoc === 'business' || termsDoc === 'courier';

  // El checkbox de aceptación solo tiene sentido cuando los términos se abren
  // desde el formulario de registro (pestaña nueva con opener). Desde el enlace
  // del footer no hay formulario de registro abierto, así que no se muestra.
  const hasOpener = !!window.opener && !window.opener.closed;
  const [termsAccepted, setTermsAccepted] = useState(false);

  const anchorMap: Record<TermsDoc, string> = {
    client: TERMS_CLIENT_ANCHOR,
    business: TERMS_BUSINESS_ANCHOR,
    courier: COURIER_TERMS_ANCHOR,
    privacy: PRIVACY_POLICY_ANCHOR,
    cookies: COOKIE_POLICY_ANCHOR,
    legacy: TERMS_ANCHOR,
  };

  const currentAnchor = anchorMap[termsDoc];

  const handleTermsAcceptance = (accepted: boolean) => {
    setTermsAccepted(accepted);
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: TERMS_ACCEPTED_MESSAGE,
          anchor: currentAnchor,
          accepted,
          termsVersion: TERMS_VERSION,
        },
        window.location.origin,
      );
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#121214] p-5 text-white shadow-lg sm:p-7">
        <div className="flex items-center gap-4">
          <ProjectLogo variant="badge" className="h-12 w-auto" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff8a5c]">PideTiétar</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">{doc.title}</h1>
            <p className="mt-1 text-xs text-stone-400">Versión {doc.version} · Actualizado el {doc.lastUpdated}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-700 px-4 py-2 text-xs font-bold text-stone-200 transition hover:bg-stone-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <div className="mb-7 flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100">
          {doc.icon}
          <p>{doc.intro}</p>
        </div>

        {termsDoc === 'legacy' ? (
          <div className="prose prose-stone max-w-none dark:prose-invert prose-headings:font-black prose-h2:mt-8 prose-h2:text-xl prose-h3:text-base prose-p:text-sm prose-p:leading-7">
            <h2 id="terminos-y-condiciones">1. Objeto de la aplicación</h2>
            <p>
              PideTiétar es una plataforma digital de intermediación que facilita el contacto entre clientes, negocios de alimentación y repartidores dentro del Valle del Tiétar. La aplicación permite consultar ofertas, realizar pedidos, coordinar la entrega y comunicar el estado del pedido.
            </p>

            <h2>2. Aceptación y cuenta de usuario</h2>
            <p>
              Para crear una cuenta es necesario leer y aceptar estos términos. La persona usuaria debe aportar datos veraces, conservar sus credenciales y utilizar la aplicación de forma lícita. El uso de la cuenta es personal y la persona titular responde de la actividad realizada con ella.
            </p>

            <h2>3. Papel de PideTiétar en las compras</h2>
            <p>
              PideTiétar pone en contacto a las partes y facilita las herramientas digitales de la operación. La compraventa del producto se formaliza entre el cliente y el negocio cuando el pedido es aceptado conforme al flujo de la aplicación. El negocio responde de la existencia, preparación, composición, alérgenos, calidad, precio y entrega del producto, salvo las obligaciones que legalmente correspondan a PideTiétar por sus propios servicios.
            </p>
            <p>
              La entrega podrá realizarla el propio negocio, un repartidor del negocio o un repartidor coordinado por la plataforma, según la modalidad mostrada en cada pedido. PideTiétar no garantiza la disponibilidad permanente de un negocio, de un repartidor ni de un producto.
            </p>

            <h2>4. Responsabilidad y funcionamiento del servicio</h2>
            <p>
              La plataforma actuará con diligencia razonable para mantener el servicio y comunicar incidencias. No será responsable de los hechos que correspondan exclusivamente al negocio, al cliente, al repartidor, a la empresa de transporte, a los proveedores de pago o a causas de fuerza mayor, sin perjuicio de las responsabilidades que no puedan excluirse por ley.
            </p>
            <p>
              El cliente debe facilitar una dirección correcta, estar disponible para recibir el pedido, revisar las instrucciones de entrega y comunicar las incidencias por los canales habilitados. El negocio y el repartidor deben mantener actualizados sus datos operativos y cumplir las obligaciones que les sean aplicables.
            </p>

            <h2>5. Duración, finalización y ausencia de permanencia</h2>
            <p>
              La relación de uso de la aplicación comienza al aceptar estos términos y se mantiene mientras la cuenta y el servicio estén disponibles. Cualquiera de las partes puede dejar de utilizar la plataforma sin compromiso de permanencia, exclusividad, número mínimo de pedidos ni volumen garantizado.
            </p>
            <p>
              Si la aplicación deja de funcionar o de prestarse por cualquier razón, la relación de intermediación finalizará desde ese día. Seguirán siendo exigibles, cuando corresponda, las obligaciones nacidas de pedidos ya aceptados, pagos, devoluciones, reclamaciones, confidencialidad o normativa aplicable.
            </p>

            <h2>6. Pagos, pedidos e incidencias</h2>
            <p>
              Los importes, gastos de entrega y métodos de pago se mostrarán antes de confirmar cada pedido. Un pedido puede cancelarse o no completarse por falta de disponibilidad, imposibilidad de entrega, error de datos, incidencia técnica u otra causa justificada. Las devoluciones y reclamaciones se tramitarán conforme a la naturaleza de la incidencia y a la normativa aplicable.
            </p>

            <h2 id="terminos-repartidores" className="scroll-mt-6 flex items-center gap-2">
              <Bike className="h-5 w-5 text-[#ff4e00]" />
              7. Condiciones específicas para repartidores
            </h2>
            <p>
              El perfil de repartidor permite recibir y gestionar oportunidades de entrega asignadas por un negocio o por la plataforma. La aplicación no garantiza un número mínimo de servicios, ingresos, horarios, zonas, exclusividad ni continuidad.
            </p>
            <p>
              El repartidor puede dejar de utilizar la plataforma sin compromiso de permanencia. Cuando acepte una entrega deberá cumplir las instrucciones operativas, proteger el pedido, respetar el PIN y comunicar con rapidez cualquier impedimento. Estas condiciones regulan el uso de la aplicación y la coordinación de entregas; no sustituyen el contrato laboral, mercantil o de prestación de servicios que pudiera ser necesario conforme a la relación real y a la legislación aplicable.
            </p>
            <p>
              El repartidor debe mantener actualizados sus datos, respetar la confidencialidad de la información del cliente y del negocio, y utilizar la información recibida únicamente para completar la entrega. Los pagos o liquidaciones se calcularán conforme a las condiciones económicas comunicadas para cada servicio y no se devengarán por oportunidades no realizadas, salvo que corresponda por ley o por las condiciones particulares aplicables.
            </p>

            <h2>8. Conductas prohibidas</h2>
            <p>
              No está permitido utilizar la aplicación para actividades ilícitas, introducir datos falsos, manipular pedidos, suplantar a otra persona, compartir credenciales, extraer datos de forma automatizada, acosar a otras personas o intentar alterar la seguridad del servicio. PideTiétar podrá limitar o suspender una cuenta cuando exista una causa justificada, respetando la normativa aplicable.
            </p>

            <h2>9. Cambios y ley aplicable</h2>
            <p>
              PideTiétar podrá actualizar estos términos para adaptarlos a cambios legales, técnicos u operativos. Los cambios relevantes se comunicarán por la aplicación o por los medios disponibles. Se aplicará la legislación española, respetando los derechos imperativos de las personas consumidoras y las reglas de competencia judicial que resulten obligatorias.
            </p>
          </div>
        ) : (
          <div
            className="prose prose-stone max-w-none dark:prose-invert prose-headings:font-black prose-h2:mt-8 prose-h2:text-xl prose-h3:text-base prose-p:text-sm prose-p:leading-7"
            dangerouslySetInnerHTML={{ __html: doc.content || "" }}
          />
        )}

        {hasOpener && isTermsOrCourier && (
          <label className="mt-8 flex cursor-pointer items-start gap-3 border-t border-stone-200 pt-5 text-xs text-stone-600 dark:border-stone-800 dark:text-stone-300">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => handleTermsAcceptance(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF4E00]"
            />
            <span className="flex items-start gap-2 leading-5">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#ff4e00]" />
              <span>
                Acepto los {doc.title.toLowerCase()} de PideTiétar y confirmo que he podido leer esta página.
              </span>
            </span>
          </label>
        )}
      </div>
    </section>
  );
};
