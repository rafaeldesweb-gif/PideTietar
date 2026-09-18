import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Package, Clock, CheckCircle2, MapPin, Bike, 
  Calendar, ExternalLink, ShieldCheck, Mail, RefreshCw
} from 'lucide-react';
import { OrderStatus } from '../types';

export const OrdersView: React.FC = () => {
  const { orders, currentUser, updateOrderStatus } = useApp();

  const userOrders = currentUser 
    ? orders.filter(o => o.customerId === currentUser.id || currentUser.role === 'SUPERADMIN')
    : [];

  const statusLabels: Record<OrderStatus, { label: string; color: string }> = {
    PENDING_PAYMENT: { label: 'Pago Pendiente', color: 'bg-stone-100 text-stone-700' },
    PAID: { label: 'Pagado y Confirmado', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' },
    NEW: { label: 'Nuevo en Cocina', color: 'bg-amber-100 text-amber-800' },
    ACCEPTED: { label: 'Aceptado por el Comercio', color: 'bg-indigo-100 text-indigo-800' },
    PREPARING: { label: 'En Preparación / Horno', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300' },
    READY: { label: 'Listo para Reparto', color: 'bg-purple-100 text-purple-800' },
    ASSIGNED: { label: 'Repartidor Asignado', color: 'bg-cyan-100 text-cyan-800' },
    PICKED_UP: { label: 'En Camino a tu Domicilio', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300' },
    DELIVERED: { label: 'Entregado con Éxito', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
    REJECTED: { label: 'Rechazado', color: 'bg-red-100 text-red-800' },
    REFUNDED: { label: 'Reembolsado', color: 'bg-stone-200 text-stone-800' }
  };

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-100">
            Mis Pedidos en PideTiétar
          </h1>
          <p className="text-xs text-stone-500">
            Seguimiento en tiempo real, PIN de entrega seguro y sincronización con Google Calendar
          </p>
        </div>
      </div>

      {userOrders.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-950/40 text-[#FF4E00] flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-stone-800 dark:text-stone-200 text-base">
            No tienes pedidos activos
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Pide en tus asadores y restaurantes favoritos del Tiétar para ver el estado de tu pedido aquí en tiempo real.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {userOrders.map(order => {
            const currentBadge = statusLabels[order.status] || { label: order.status, color: 'bg-stone-100 text-stone-700' };

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 overflow-hidden shadow-xs hover:shadow-md transition"
              >
                {/* Header card info */}
                <div className="p-4 sm:p-6 border-b border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50 dark:bg-stone-800/30">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-sm text-[#FF4E00]">
                        {order.orderNumber}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${currentBadge.color}`}>
                        {currentBadge.label}
                      </span>
                    </div>
                    <div className="font-bold text-stone-900 dark:text-stone-100 text-base">
                      {order.businessName}
                    </div>
                    <div className="text-xs text-stone-400">
                      Realizado el {new Date(order.createdAt).toLocaleDateString('es-ES', { 
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                      })}
                    </div>
                  </div>

                  {/* PIN & Total */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                    <div className="text-right">
                      <span className="text-xs text-stone-400">Total pagado: </span>
                      <span className="font-mono font-bold text-base text-stone-900 dark:text-stone-100">
                        {(order.totalCents / 100).toFixed(2)}€
                      </span>
                    </div>

                    {/* PIN delivery badge */}
                    <div className="mt-1 flex items-center space-x-1.5 bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/50 px-3 py-1 rounded-xl">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#A32300] dark:text-[#FF4E00]" />
                      <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">PIN de entrega:</span>
                      <span className="font-mono font-bold text-sm text-[#A32300] dark:text-[#FF4E00]">
                        {order.deliveryPin}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body: Live timeline & Items snapshot */}
                <div className="p-4 sm:p-6 space-y-6">
                  
                  {/* Status Progress Bar */}
                  <div>
                    <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                      Progreso del Pedido
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: 'PAID', label: '1. Pagado' },
                        { key: 'PREPARING', label: '2. En Cocina' },
                        { key: 'PICKED_UP', label: '3. En Camino' },
                        { key: 'DELIVERED', label: '4. Entregado' }
                      ].map((step, idx) => {
                        const isPastOrCurrent = 
                          (step.key === 'PAID' && ['PAID', 'NEW', 'ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'].includes(order.status)) ||
                          (step.key === 'PREPARING' && ['PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'].includes(order.status)) ||
                          (step.key === 'PICKED_UP' && ['PICKED_UP', 'DELIVERED'].includes(order.status)) ||
                          (step.key === 'DELIVERED' && order.status === 'DELIVERED');

                        return (
                          <div key={step.key} className="space-y-1">
                            <div className={`h-2 rounded-full transition ${
                              isPastOrCurrent ? 'bg-[#FF4E00]' : 'bg-stone-200 dark:bg-stone-800'
                            }`} />
                            <div className={`text-[10px] sm:text-xs font-semibold truncate ${
                              isPastOrCurrent ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400'
                            }`}>
                              {step.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Purchased Items snapshot */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      Resumen de platos
                    </div>
                    <div className="divide-y divide-stone-100 dark:divide-stone-800/60">
                      {order.items.map((it, i) => (
                        <div key={i} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-stone-800 dark:text-stone-200">{it.quantity}x </span>
                            <span className="text-stone-700 dark:text-stone-300">{it.productName}</span>
                            {it.selectedOptions.length > 0 && (
                              <div className="text-[11px] text-stone-400">
                                {it.selectedOptions.map(o => o.optionName).join(', ')}
                              </div>
                            )}
                          </div>
                          <span className="font-mono text-stone-600 dark:text-stone-400">
                            {(it.totalCents / 100).toFixed(2)}€
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Integrations bar: Google Calendar & Gmail notifications info */}
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-2 text-stone-500">
                      <Mail className="w-4 h-4 text-red-500" />
                      <span>Notificación enviada a <strong>{order.customerEmail}</strong></span>
                    </div>

                    {order.calendarEventId ? (
                      <a
                        href={order.calendarEventId}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold cursor-pointer"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Ver tarea en Google Calendar</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-stone-400 flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Sincronización de tarea activada</span>
                      </span>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
