import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bike, MapPin, Navigation, CheckCircle2, ShieldCheck, 
  Clock, Phone, AlertCircle, KeyRound, ArrowRight
} from 'lucide-react';
import { Order } from '../types';

export const CourierDashboard: React.FC = () => {
  const { orders, verifyDeliveryPin, showNotification, currentUser, toggleCourierAvailability } = useApp();
  const [inputPins, setInputPins] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'assigned' | 'completed'>('assigned');

  const canAccessCourierPanel = !!currentUser && (currentUser.role === 'PLATFORM_COURIER' || currentUser.role === 'BUSINESS_COURIER');
  const isAvailable = currentUser?.courierProfile?.isOnline ?? false;

  if (!canAccessCourierPanel) {
    return null;
  }

  // Assigned orders for courier
  const acceptedBusinessIds = currentUser?.courierProfile?.businessIds || [];

  const activeDeliveries = orders.filter(
    o => o.deliveryType === 'DELIVERY' && 
         ['READY', 'ASSIGNED', 'PICKED_UP'].includes(o.status) &&
         acceptedBusinessIds.includes(o.businessId)
  );

  const completedDeliveries = orders.filter(
    o => o.deliveryType === 'DELIVERY' && 
         o.status === 'DELIVERED' &&
         acceptedBusinessIds.includes(o.businessId)
  );

  const handleVerifyPin = (orderId: string) => {
    const pin = inputPins[orderId] || '';
    if (pin.length < 4) {
      showNotification('Introduce el PIN de 4 dígitos proporcionado por el cliente', 'error');
      return;
    }

    const success = verifyDeliveryPin(orderId, pin);
    if (success) {
      showNotification('¡PIN correcto! Entrega validada y liquidada al instante.', 'success');
      setInputPins(prev => ({ ...prev, [orderId]: '' }));
    } else {
      showNotification('PIN incorrecto. Solicita al cliente el código de su app o confirmación de Gmail.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-[calc(var(--safe-area-bottom)+4rem)] sm:space-y-6">
      
      {/* Courier Top Status */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-xs dark:border-stone-800 dark:bg-stone-900 sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FF4E00]/10 text-[#FF4E00] flex items-center justify-center">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">
              Panel del Repartidor Tiétar
            </h1>
            <p className="text-xs text-stone-500">
              Vehículo: Patinete eléctrico homologado • Zona: Valle del Tiétar
            </p>
          </div>
        </div>

        {/* Availability Toggle */}
        <button
          onClick={() => {
            toggleCourierAvailability(!isAvailable);
            showNotification(`Estado de repartidor: ${!isAvailable ? 'DISPONIBLE para rutas' : 'NO DISPONIBLE'}`, 'info');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            isAvailable
              ? 'bg-emerald-600 text-white'
              : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-white animate-pulse' : 'bg-stone-400'}`} />
          <span>{isAvailable ? 'Disponible para entregas' : 'En pausa'}</span>
        </button>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-1.5 dark:border-stone-800 dark:bg-stone-900">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition sm:text-sm ${
            activeTab === 'assigned'
              ? 'bg-[#FF4E00] text-white'
              : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-stone-800'
          }`}
        >
          Rutas Activas ({activeDeliveries.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition sm:text-sm ${
            activeTab === 'completed'
              ? 'bg-[#FF4E00] text-white'
              : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-stone-800'
          }`}
        >
          Historial ({completedDeliveries.length})
        </button>
      </div>

      {/* Tab 1: Active Deliveries */}
      {activeTab === 'assigned' && (
        <div className="space-y-4">
          {activeDeliveries.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
              <Clock className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="font-bold text-stone-800 dark:text-stone-200 text-sm">
                No hay entregas pendientes asignadas
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Mantente disponible para recibir la próxima recogida en asadores o pizzerías.
              </p>
            </div>
          ) : (
            activeDeliveries.map(ord => (
              <div
                key={ord.id}
                className="space-y-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-xs dark:border-stone-800 dark:bg-stone-900 sm:p-6"
              >
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div>
                    <span className="font-mono font-bold text-sm text-[#FF4E00]">
                      Pedido #{ord.orderNumber}
                    </span>
                    <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      Recogida en: {ord.businessName}
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 rounded-full">
                    {ord.status === 'READY' ? 'Listo en local' : 'En reparto'}
                  </span>
                </div>

                {/* Delivery details: Address & Customer */}
                <div className="p-3.5 bg-stone-50 dark:bg-stone-800/50 rounded-2xl text-xs space-y-1.5">
                  <div className="flex items-center space-x-2 text-stone-700 dark:text-stone-300 font-semibold">
                    <MapPin className="w-4 h-4 text-[#FF4E00] shrink-0" />
                    <span>
                      {ord.deliveryAddress ? `${ord.deliveryAddress.street}, ${ord.deliveryAddress.locality}` : 'Dirección pendiente'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-stone-500">
                    <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Contacto cliente: {ord.customerName} ({ord.customerPhone})</span>
                  </div>
                </div>

                {/* Proof of delivery: PIN verification */}
                <div className="p-4 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-2xl space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#A32300] dark:text-[#FF4E00]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Prueba de Entrega Segura (PIN de 4 dígitos)</span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Solicita al cliente el PIN mostrado en su pantalla o en su correo de confirmación de Gmail.
                  </p>

                  <div className="flex max-w-sm flex-col gap-2 pt-1 sm:flex-row">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="PIN ej. 4921"
                      value={inputPins[ord.id] || ''}
                      onChange={(e) => setInputPins({ ...inputPins, [ord.id]: e.target.value })}
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-center font-mono text-sm font-bold tracking-widest dark:border-stone-700 dark:bg-stone-800"
                    />
                    <button
                      onClick={() => handleVerifyPin(ord.id)}
                      className="rounded-xl bg-[#FF4E00] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#A32300] cursor-pointer"
                    >
                      Validar Entrega
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Completed */}
      {activeTab === 'completed' && (
        <div className="space-y-3">
          {completedDeliveries.map(ord => (
            <div
              key={ord.id}
              className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-mono font-bold text-[#FF4E00]">#{ord.orderNumber}</span>
                <span className="text-stone-500 ml-2">{ord.businessName} → {ord.deliveryAddress?.locality}</span>
              </div>
              <span className="text-emerald-600 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Entregado con PIN</span>
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
