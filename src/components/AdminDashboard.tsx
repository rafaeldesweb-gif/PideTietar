import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, Users, Store, DollarSign, 
  MapPin, AlertCircle, BarChart3, CheckCircle2, 
  Settings, RefreshCw
} from 'lucide-react';
import { LOCALITIES } from '../data/mockData';

export const AdminDashboard: React.FC = () => {
  const { businesses, orders, updateBusinessShift, showNotification } = useApp();

  const totalGrossVolumeCents = orders.reduce((acc, o) => acc + o.totalCents, 0);
  const totalPlatformCommissionsCents = orders.reduce((acc, o) => acc + o.platformFeeCents, 0);

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">
              Superadministración PideTiétar
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Supervisión global de las localidades del Valle del Tiétar, comisiones y conciliación financiera
          </p>
        </div>
        <div className="text-right text-xs text-stone-400 font-mono">
          rafaeldesweb@gmail.com
        </div>
      </div>

      {/* Global Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800">
          <div className="text-xs font-semibold text-stone-400">Volumen Bruto Gestionado (GMV)</div>
          <div className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-100 mt-1">
            {(totalGrossVolumeCents / 100).toFixed(2)}€
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Total pedidos pagados vía Stripe/PayPal</p>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800">
          <div className="text-xs font-semibold text-stone-400">Ingresos Plataforma PideTiétar</div>
          <div className="text-2xl font-bold font-serif text-[#FF4E00] mt-1">
            {(totalPlatformCommissionsCents / 100).toFixed(2)}€
          </div>
          <p className="text-[11px] text-stone-500 mt-1">5% productos + 20% reparto</p>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800">
          <div className="text-xs font-semibold text-stone-400">Comercios Homologados</div>
          <div className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-100 mt-1">
            {businesses.length}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">100% operativos en el valle</p>
        </div>
      </div>

      {/* Localities & Businesses management table */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 space-y-4">
        <h2 className="text-base font-bold font-serif text-stone-900 dark:text-stone-100">
          Comercios Registrados por Localidad
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800 text-stone-400 uppercase font-semibold">
                <th className="pb-3">Comercio</th>
                <th className="pb-3">Localidad</th>
                <th className="pb-3">CIF</th>
                <th className="pb-3">Estado Turno</th>
                <th className="pb-3">Valoración</th>
                <th className="pb-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {businesses.map(biz => (
                <tr key={biz.id} className="text-stone-700 dark:text-stone-300">
                  <td className="py-3 font-semibold text-stone-900 dark:text-stone-100">
                    {biz.name}
                  </td>
                  <td className="py-3">
                    {LOCALITIES.find(l => l.id === biz.localityId)?.name || biz.localityId}
                  </td>
                  <td className="py-3 font-mono">{biz.cif}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      biz.isShiftOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {biz.isShiftOpen ? 'Abierto' : 'Cerrado'}
                    </span>
                  </td>
                  <td className="py-3">★ {biz.rating} ({biz.reviewCount})</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => {
                        updateBusinessShift(biz.id, !biz.isShiftOpen);
                      }}
                      className="text-xs text-[#FF4E00] hover:underline font-semibold cursor-pointer"
                    >
                      {biz.isShiftOpen ? 'Forzar Cierre' : 'Abrir Turno'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
