import React from 'react';
import { ArrowLeft, Info, Mail, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProjectLogo } from './ProjectLogo';

const CONTACT_EMAIL = 'correo@pidetietar.com';
const CONTACT_SUBJECT = 'Consulta desde PideTiétar';

interface ContactViewProps {
  onBack: () => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ onBack }) => {
  const { currentUser } = useApp();
  const userEmail = currentUser?.email?.trim() || '';
  const contactBody = userEmail
    ? `Correo del usuario: ${userEmail}\n\n`
    : '';
  const contactMailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(CONTACT_SUBJECT)}&body=${encodeURIComponent(contactBody)}`;

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 pb-8">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#121214] p-5 text-white shadow-lg sm:p-7">
      <div className="flex items-center gap-4">
        <ProjectLogo variant="badge" className="h-12 w-auto" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff8a5c]">PideTiétar</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Contáctame</h1>
          <p className="mt-1 text-xs text-stone-400">Información de la aplicación y canales de contacto</p>
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

    <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#ff4e00]" />
          <p>
            PideTiétar es una aplicación de pedidos y comercio local que conecta a clientes, negocios y repartidores del Valle del Tiétar.
          </p>
        </div>

        <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">Datos de la aplicación</h2>
        <dl className="mt-5 divide-y divide-stone-200 text-sm dark:divide-stone-800">
          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <dt className="font-bold text-stone-500 dark:text-stone-400">Nombre</dt>
            <dd className="text-stone-800 dark:text-stone-200">PideTiétar</dd>
          </div>
          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <dt className="font-bold text-stone-500 dark:text-stone-400">Servicio</dt>
            <dd className="text-stone-800 dark:text-stone-200 sm:text-right">Pedidos y comercio local</dd>
          </div>
          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <dt className="font-bold text-stone-500 dark:text-stone-400">Ámbito</dt>
            <dd className="inline-flex items-center gap-2 text-stone-800 dark:text-stone-200 sm:text-right">
              <MapPin className="h-4 w-4 text-[#ff4e00]" />
              Valle del Tiétar (Ávila)
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">Correo de contacto</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-400">
          Para consultas sobre la aplicación, pedidos o colaboración con PideTiétar, escríbenos a:
        </p>
        <a
          href={contactMailto}
          className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-[#d63d00] transition hover:border-[#ff4e00] hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-[#ffb08f] dark:hover:bg-orange-950/50"
        >
          <Mail className="h-5 w-5 shrink-0" />
          {CONTACT_EMAIL}
        </a>
      </div>
    </div>
    </section>
  );
};
