import React, { useState } from 'react';
import { Bike, ChevronDown, ChevronUp, Clock, Tag, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { DeliveryOrder } from '../types/game';

interface OrderTrackerBarProps {
  order: DeliveryOrder;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenRewards: () => void;
}

export const OrderTrackerBar: React.FC<OrderTrackerBarProps> = ({
  order,
  isMuted,
  onToggleMute,
  onOpenRewards,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative z-20 w-full bg-[#11092a]/95 border-b border-purple-800/40 backdrop-blur-md text-white select-none shadow-md">
      {/* Top Single Row Bar */}
      <div className="max-w-6xl mx-auto px-2 sm:px-3 py-1 sm:py-1.5 flex items-center justify-between gap-1 sm:gap-4">
        {/* Brand Lockup: 3 Spheres + Brand title (matching top header in Image 3 & 4) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center -space-x-1.5">
            <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-pink-500 shadow-[0_0_8px_#ff2a8d]" />
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-cyan-400 shadow-[0_0_8px_#00d0ff] z-1" />
            <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-amber-400 shadow-[0_0_8px_#ffc700]" />
          </div>
          <span className="font-extrabold text-[11px] sm:text-sm tracking-tight text-white hidden xs:inline">
            Bubble <span className="text-pink-400">Delivery</span>
          </span>
        </div>

        {/* Live Delivery Progress Pill */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 max-w-xs sm:max-w-md mx-auto flex items-center justify-between gap-1 sm:gap-2.5 bg-purple-950/70 hover:bg-purple-900/60 border border-purple-700/50 px-2 sm:px-3 py-0.5 rounded-full cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-1.5 truncate">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-pink-600/30 flex items-center justify-center shrink-0">
              <Bike className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-pink-400 animate-pulse" />
            </div>
            <div className="text-[10px] sm:text-xs truncate">
              <span className="font-semibold text-white truncate">{order.restaurant}</span>
              <span className="text-purple-400 mx-1 hidden sm:inline">·</span>
              <span className="text-emerald-400 font-medium hidden sm:inline">{order.status}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 text-[10px] sm:text-xs text-amber-300 font-mono font-bold bg-amber-950/40 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-500/30">
            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
            <span>{order.currentEtaMinutes}m</span>
            {isExpanded ? <ChevronUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-300" /> : <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-300" />}
          </div>
        </div>

        {/* Right Quick Actions: Coupon indicator & Sound */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={onOpenRewards}
            className="flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-gradient-to-r from-pink-950/80 to-purple-900/80 border border-pink-500/40 hover:border-pink-400 text-pink-200 text-[10px] sm:text-xs rounded-full transition-transform active:scale-95 cursor-pointer"
            title="Ver cupones acumulados"
          >
            <Tag className="w-3 h-3 text-pink-400" />
            <span className="hidden md:inline font-semibold">Cupones</span>
            {order.appliedCouponCode && (
              <span className="bg-pink-500 text-white text-[9px] px-1 rounded font-mono font-bold">
                {order.appliedCouponCode}
              </span>
            )}
          </button>

          <button
            onClick={onToggleMute}
            aria-label="Silenciar sonido"
            className="p-1 sm:p-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-700/50 rounded-full text-purple-300 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" /> : <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Expanded Delivery Drawer */}
      {isExpanded && (
        <div className="border-t border-purple-800/40 bg-[#160d38] px-4 py-3 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Order Details */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-purple-400 font-semibold mb-1">
              Pedido Activo ({order.orderId})
            </div>
            <ul className="space-y-1 text-purple-200">
              {order.items.map((item, i) => (
                <li key={i} className="truncate flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Progress Tracker */}
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-purple-400 font-semibold mb-1.5">
              <span>Trayecto en tiempo real</span>
              <span className="text-pink-300 font-mono">{order.currentEtaMinutes} minutos</span>
            </div>
            <div className="w-full h-2.5 bg-purple-950 rounded-full overflow-hidden border border-purple-800/60 relative">
              <div
                className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${order.progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-purple-300 mt-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              ¡Supera niveles mientras esperas para acumular descuentos reales!
            </p>
          </div>

          {/* Price & Coupon status */}
          <div className="bg-purple-950/60 p-2.5 rounded-xl border border-purple-800/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-300">
              <span>Total Pedido:</span>
              <span className="font-mono line-through text-purple-400">
                ${order.originalTotal.toFixed(2)}
              </span>
            </div>

            {order.currentDiscount > 0 ? (
              <div className="flex items-center justify-between text-emerald-300 font-semibold">
                <span>Descuento Ganado:</span>
                <span className="font-mono">-${order.currentDiscount.toFixed(2)}</span>
              </div>
            ) : (
              <div className="text-[11px] text-amber-300/90 italic">
                Gana el Nivel 1 para desbloquear 5% OFF
              </div>
            )}

            <div className="flex items-center justify-between text-white font-bold text-sm pt-1 border-t border-purple-800/40 mt-1">
              <span>Total Final:</span>
              <span className="font-mono text-emerald-400 text-base">
                ${order.finalTotal.toFixed(2)} USD
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
