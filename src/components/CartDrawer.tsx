import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Trash2, Plus, Minus, CreditCard, Calendar, 
  MapPin, Clock, AlertCircle, Sparkles, CheckCircle2, ShieldCheck
} from 'lucide-react';
import { calculateOrderLedger } from '../services/paymentService';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, onOrderSuccess }) => {
  const { 
    cart, 
    clearCart, 
    removeFromCart, 
    updateCartQuantity, 
    businesses, 
    currentUser, 
    createOrder,
    showNotification
  } = useApp();

  const [deliveryType, setDeliveryType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE' | 'PAYPAL' | 'CASH_ON_DELIVERY'>('STRIPE');
  const [tipCents, setTipCents] = useState(150); // 1.50€ standard tip
  const [syncCalendar, setSyncCalendar] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentBusiness = cart ? businesses.find(b => b.id === cart.businessId) : null;
  const isShiftOpen = currentBusiness?.isShiftOpen ?? false;

  const subtotalCents = cart ? cart.items.reduce((acc, i) => acc + i.itemPriceCents * i.quantity, 0) : 0;
  const hasFreeDelivery = currentUser?.subscriptionPlan === 'PRO_MONTHLY' && subtotalCents >= 1200;
  
  const ledger = calculateOrderLedger(
    cart ? cart.items : [],
    currentBusiness?.deliveryFeeCents || 200,
    deliveryType,
    tipCents,
    hasFreeDelivery
  );

  const minOrderMet = currentBusiness ? subtotalCents >= currentBusiness.minOrderCents : true;

  const handleCheckout = async () => {
    if (!currentUser) {
      showNotification('Inicia sesión o regístrate para finalizar tu compra.', 'info');
      return;
    }
    if (!currentBusiness) return;
    if (!isShiftOpen) {
      showNotification('El comercio tiene el turno cerrado actualmente.', 'error');
      return;
    }
    if (!minOrderMet) {
      showNotification(`El pedido mínimo es de ${(currentBusiness.minOrderCents / 100).toFixed(2)}€`, 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await createOrder({
      deliveryType,
      addressIndex: selectedAddressIndex,
      paymentMethod,
      tipCents,
      syncCalendar
    });
    setIsSubmitting(false);

    if (result.success && result.order) {
      onClose();
      onOrderSuccess(result.order.id);
    } else {
      showNotification(result.error || 'Error al tramitar pedido', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-stone-900 shadow-2xl flex flex-col border-l border-stone-200 dark:border-stone-800">
          
          {/* Drawer Header */}
          <div className="p-4 sm:p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-serif">
                Tu Cesta de Pedido
              </h2>
              {currentBusiness && (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {currentBusiness.name}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {!cart || cart.items.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-950/40 text-[#FF4E00] flex items-center justify-center mb-4">
                  <CreditCard className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-stone-800 dark:text-stone-200 text-base mb-1">
                  Tu cesta está vacía
                </h4>
                <p className="text-xs text-stone-500 max-w-xs">
                  Explora las pizzerías, asadores y comercios del Tiétar y añade tus platos favoritos.
                </p>
              </div>
            ) : (
              <>
                {/* Closed Shift Alert if applicable */}
                {!isShiftOpen && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#A32300]" />
                    <span>Este comercio tiene su turno operativo cerrado en este momento. No admite pedidos inmediatos.</span>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-stone-400 uppercase font-semibold">
                    <span>Productos</span>
                    <button
                      onClick={clearCart}
                      className="text-stone-400 hover:text-red-500 transition cursor-pointer"
                    >
                      Vaciar cesta
                    </button>
                  </div>

                  {cart.items.map((item) => (
                    <div 
                      key={item.cartItemId}
                      className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-stone-900 dark:text-stone-100 text-sm truncate">
                          {item.product.name}
                        </div>
                        <div className="text-xs font-mono font-medium text-[#A32300] dark:text-[#FF4E00]">
                          {((item.itemPriceCents * item.quantity) / 100).toFixed(2)}€
                        </div>

                        {/* Selected options / removed ingredients */}
                        {item.selectedOptions.length > 0 && (
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                            {item.selectedOptions.map(o => o.optionName).join(', ')}
                          </div>
                        )}
                        {item.removedIngredients.length > 0 && (
                          <div className="text-[10px] text-red-500 mt-0.5">
                            Sin: {item.removedIngredients.join(', ')}
                          </div>
                        )}
                        {item.customerNote && (
                          <div className="text-[11px] italic text-stone-500 mt-1">
                            "{item.customerNote}"
                          </div>
                        )}
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => updateCartQuantity(item.cartItemId, -1)}
                          className="w-6 h-6 rounded-md bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 flex items-center justify-center text-xs font-bold transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200 min-w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.cartItemId, 1)}
                          className="w-6 h-6 rounded-md bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 flex items-center justify-center text-xs font-bold transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.cartItemId)}
                          className="text-stone-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery Type Switch */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-400 mb-2">
                    Modalidad de Entrega
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDeliveryType('DELIVERY')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                        deliveryType === 'DELIVERY'
                          ? 'border-[#FF4E00] bg-orange-50/50 dark:bg-orange-950/20 text-[#A32300] dark:text-[#FF4E00]'
                          : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Reparto a domicilio</span>
                    </button>
                    <button
                      onClick={() => setDeliveryType('PICKUP')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                        deliveryType === 'PICKUP'
                          ? 'border-[#FF4E00] bg-orange-50/50 dark:bg-orange-950/20 text-[#A32300] dark:text-[#FF4E00]'
                          : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>Recogida en local</span>
                    </button>
                  </div>
                </div>

                {/* Delivery Address selection */}
                {deliveryType === 'DELIVERY' && currentUser && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-stone-400 mb-2">
                      Dirección de Entrega
                    </label>
                    <select
                      value={selectedAddressIndex}
                      onChange={(e) => setSelectedAddressIndex(Number(e.target.value))}
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    >
                      {currentUser.addresses.map((addr, idx) => (
                        <option key={addr.id} value={idx}>
                          {addr.label}: {addr.street} ({addr.locality})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tip Selector */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold uppercase text-stone-400 mb-2">
                    <span>Propina para el repartidor del valle</span>
                    <span className="text-[#FF4E00] font-mono">{(tipCents / 100).toFixed(2)}€</span>
                  </div>
                  <div className="flex gap-2">
                    {[0, 100, 150, 250].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setTipCents(amount)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          tipCents === amount
                            ? 'border-[#FF4E00] bg-[#FF4E00] text-white'
                            : 'border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {amount === 0 ? 'Sin propina' : `${(amount / 100).toFixed(2)}€`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Google Calendar Task Synchronization Checkbox */}
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50">
                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncCalendar}
                      onChange={(e) => setSyncCalendar(e.target.checked)}
                      className="mt-0.5 rounded text-[#FF4E00] focus:ring-[#FF4E00]"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-blue-900 dark:text-blue-300 flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>Sincronizar automáticamente con Google Calendar</span>
                      </div>
                      <p className="text-blue-700 dark:text-blue-400 text-[11px] mt-0.5">
                        Crea una cita con aviso sonoro para la llegada del repartidor y el PIN de entrega.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Payment Gateway Selector (Stripe or PayPal) */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-400 mb-2">
                    Método de Pago Seguro
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentMethod('STRIPE')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                        paymentMethod === 'STRIPE'
                          ? 'border-[#FF4E00] bg-orange-50/50 dark:bg-orange-950/20 text-[#A32300] dark:text-[#FF4E00]'
                          : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      <div className="font-bold flex items-center space-x-1">
                        <CreditCard className="w-4 h-4 text-purple-600" />
                        <span>Stripe</span>
                      </div>
                      <span className="text-[10px] text-stone-400">Tarjeta / Apple / GPay</span>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('PAYPAL')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                        paymentMethod === 'PAYPAL'
                          ? 'border-[#FF4E00] bg-orange-50/50 dark:bg-orange-950/20 text-[#A32300] dark:text-[#FF4E00]'
                          : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      <div className="font-bold flex items-center space-x-1">
                        <span className="text-blue-600 font-extrabold text-sm">P</span>
                        <span>PayPal</span>
                      </div>
                      <span className="text-[10px] text-stone-400">Saldo o cuenta bancaria</span>
                    </button>
                  </div>
                </div>

                {/* Ledger Breakdown */}
                <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
                  <div className="flex justify-between">
                    <span>Subtotal productos:</span>
                    <span className="font-mono">{(ledger.subtotalCents / 100).toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coste de reparto:</span>
                    <span className="font-mono">
                      {hasFreeDelivery ? (
                        <span className="text-emerald-600 font-semibold">GRATIS (Club+)</span>
                      ) : (
                        `${(ledger.deliveryFeeCents / 100).toFixed(2)}€`
                      )}
                    </span>
                  </div>
                  {tipCents > 0 && (
                    <div className="flex justify-between text-stone-500">
                      <span>Propina repartidor:</span>
                      <span className="font-mono">{(tipCents / 100).toFixed(2)}€</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-stone-900 dark:text-stone-100 text-base pt-2 border-t border-stone-100 dark:border-stone-800">
                    <span>Total a pagar:</span>
                    <span className="text-[#A32300] dark:text-[#FF4E00] font-mono">
                      {(ledger.totalCents / 100).toFixed(2)}€
                    </span>
                  </div>

                  {/* Marketplace Commission Info (Transparency) */}
                  <div className="pt-2 text-[10px] text-stone-400 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Liquidación comercio (95% prod):</span>
                      <span>{(ledger.businessPayoutCents / 100).toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Comisión de plataforma PideTiétar:</span>
                      <span>{(ledger.totalPlatformCommissionCents / 100).toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Drawer Footer Checkout Button */}
          {cart && cart.items.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
              <button
                id="final-checkout-btn"
                onClick={handleCheckout}
                disabled={isSubmitting || !isShiftOpen || !minOrderMet}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF4E00] to-[#A32300] hover:from-[#e04500] hover:to-[#8c1e00] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-md flex items-center justify-between cursor-pointer"
              >
                <span>{isSubmitting ? 'Procesando pago seguro...' : `Pagar con ${paymentMethod}`}</span>
                <span className="font-mono text-base">{(ledger.totalCents / 100).toFixed(2)}€</span>
              </button>

              <div className="flex items-center justify-center space-x-1 text-[11px] text-stone-400 mt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Autenticación SSL cifrada de extremo a extremo</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
