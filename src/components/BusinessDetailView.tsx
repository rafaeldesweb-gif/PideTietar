import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ArrowLeft, Star, Clock, Bike, MapPin, Phone, 
  Info, ShieldCheck, Plus, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Business, Product } from '../types';

interface BusinessDetailViewProps {
  business: Business;
  onBack: () => void;
  openProductCustomizer: (prod: Product, bizId: string) => void;
}

export const BusinessDetailView: React.FC<BusinessDetailViewProps> = ({
  business,
  onBack,
  openProductCustomizer
}) => {
  const { products, userSubscription, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'catalog' | 'info'>('catalog');

  const bizProducts = products.filter(p => p.businessId === business.id);
  const courierActiveForBusiness =
    currentUser?.role === 'PLATFORM_COURIER' || currentUser?.role === 'BUSINESS_COURIER'
      ? Boolean(
          currentUser.courierProfile?.isOnline &&
          currentUser.courierProfile.businessIds.includes(business.id)
        )
      : false;

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Back Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-[#FF4E00] transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al listado de comercios</span>
      </button>

      {/* Business Header Card */}
      <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
        <div className="relative h-56 sm:h-72 w-full overflow-hidden">
          <img
            src={business.bannerUrl}
            alt={business.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {business.isShiftOpen ? (
              <span className="inline-flex items-center space-x-1.5 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>Recibiendo pedidos</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                <span>Turno cerrado</span>
              </span>
            )}

            {courierActiveForBusiness && (
              <span className="inline-flex items-center space-x-1.5 bg-[#FF4E00] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md border border-white/30">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>Repartidor activo en este negocio</span>
              </span>
            )}
          </div>
        </div>

        {/* Business Meta Summary */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 dark:text-stone-100">
                {business.name}
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-[#FF4E00] shrink-0" />
                <span>{business.address}</span>
              </p>
            </div>

            <div className="flex items-center space-x-3 bg-stone-50 dark:bg-stone-800/60 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
              <div className="text-center px-2">
                <div className="flex items-center space-x-1 text-amber-500 font-bold text-base">
                  <Star className="w-4 h-4 fill-amber-500" />
                  <span>{business.rating}</span>
                </div>
                <div className="text-[10px] text-stone-400 font-medium">{business.reviewCount} opiniones</div>
              </div>
              <div className="w-px h-8 bg-stone-200 dark:bg-stone-700" />
              <div className="text-center px-2">
                <div className="font-bold text-stone-900 dark:text-stone-100 text-base">
                  {business.estimatedTimeMin}-{business.estimatedTimeMax}
                </div>
                <div className="text-[10px] text-stone-400 font-medium">Minutos</div>
              </div>
              <div className="w-px h-8 bg-stone-200 dark:bg-stone-700" />
              <div className="text-center px-2">
                <div className="font-bold text-stone-900 dark:text-stone-100 text-base">
                  {userSubscription === 'PRO_MONTHLY' ? '0€' : `${(business.deliveryFeeCents / 100).toFixed(2)}€`}
                </div>
                <div className="text-[10px] text-stone-400 font-medium">Envío</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Carta vs Info) */}
          <div className="flex space-x-4 border-b border-stone-200 dark:border-stone-800 pt-2">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'catalog'
                  ? 'border-[#FF4E00] text-[#A32300] dark:text-[#FF4E00]'
                  : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              Carta y Menú ({bizProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'info'
                  ? 'border-[#FF4E00] text-[#A32300] dark:text-[#FF4E00]'
                  : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              Horarios & Información Legal
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
              Platos Disponibles
            </h2>
            <span className="text-xs text-stone-400">
              Pedido mínimo: {(business.minOrderCents / 100).toFixed(2)}€
            </span>
          </div>

          {bizProducts.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800">
              <p className="text-stone-500 text-sm">Este comercio aún no ha cargado productos en la carta.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bizProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => openProductCustomizer(product, business.id)}
                  className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs hover:border-[#FF4E00] transition flex gap-4 cursor-pointer group"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[#FF4E00] transition">
                      {product.name}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                      {product.description}
                    </p>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-[#A32300] dark:text-[#FF4E00]">
                        {(product.priceCents / 100).toFixed(2)}€
                      </span>
                      <span className="text-[11px] font-semibold text-stone-400 group-hover:text-[#FF4E00] flex items-center space-x-1">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir</span>
                      </span>
                    </div>
                  </div>

                  <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-stone-100 dark:bg-stone-800">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Information & Legal */}
      {activeTab === 'info' && (
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-6">
          <div>
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-2">
              Horario Regular del Establecimiento
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day, idx) => {
                const sched = business.schedule.find(s => s.dayOfWeek === idx);
                return (
                  <div key={day} className="flex justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-800/40">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">{day}:</span>
                    <span className="text-stone-500">
                      {sched && sched.isOpen ? `${sched.openTime} - ${sched.closeTime}` : 'Cerrado por descanso'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-2">
              Datos Fiscales & Contacto
            </h3>
            <div className="space-y-1 text-xs text-stone-600 dark:text-stone-400">
              <p><strong>Razón Social:</strong> {business.legalName}</p>
              <p><strong>NIF/CIF:</strong> {business.cif}</p>
              <p><strong>Teléfono para pedidos:</strong> {business.phone}</p>
              <p><strong>Correo electrónico:</strong> {business.email}</p>
              <p><strong>Radio de entrega homologado:</strong> {business.deliveryRadiusKm} km</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
