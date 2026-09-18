import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Check, Sparkles, ShieldCheck, CreditCard, 
  Calendar, Bike, Zap, ArrowRight 
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../data/mockData';
import { processSubscriptionCheckout } from '../services/paymentService';
import { SubscriptionPlan } from '../types';

export const SubscriptionsView: React.FC = () => {
  const { currentUser, userSubscription, setUserSubscription, showNotification } = useApp();
  const [selectedGateway, setSelectedGateway] = useState<'STRIPE' | 'PAYPAL'>('STRIPE');
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!currentUser) {
      showNotification('Inicia sesión para gestionar tu suscripción mensual', 'info');
      return;
    }

    if (plan.tier === 'FREE') {
      setUserSubscription('FREE');
      showNotification('Plan Básico activado', 'info');
      return;
    }

    setProcessingPlanId(plan.id);
    const res = await processSubscriptionCheckout(
      plan.tier as 'PRO_MONTHLY' | 'PREMIUM_PARTNER',
      plan.priceEur,
      selectedGateway,
      currentUser.email
    );
    setProcessingPlanId(null);

    if (res.success) {
      setUserSubscription(plan.tier);
      showNotification(`¡Suscripción a ${plan.name} activada con éxito mediante ${res.provider}! Próxima renovación: ${res.nextBillingDate}`, 'success');
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      
      {/* Header section */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-[#A32300] dark:text-[#F5BB00] text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Planes de Suscripción Mensual Segura</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-stone-900 dark:text-stone-100 tracking-tight">
          PideTiétar Club & Partners
        </h1>

        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
          Ahorra en costes de envío con el Club Plus o potencia tu comercio local con herramientas avanzadas de sincronización en Google Calendar y visibilidad destacada.
        </p>
      </div>

      {/* Payment Gateway Toggle */}
      <div className="flex flex-col items-center justify-center space-y-2">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          Selecciona pasarela de pago para la suscripción recurrente
        </span>
        <div className="inline-flex p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
          <button
            onClick={() => setSelectedGateway('STRIPE')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer ${
              selectedGateway === 'STRIPE'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-purple-600" />
            <span>Stripe Billing</span>
          </button>
          <button
            onClick={() => setSelectedGateway('PAYPAL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer ${
              selectedGateway === 'PAYPAL'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <span className="text-blue-600 font-extrabold">P</span>
            <span>PayPal Subscriptions</span>
          </button>
        </div>
      </div>

      {/* Plans Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SUBSCRIPTION_PLANS.map(plan => {
          const isCurrent = userSubscription === plan.tier;
          const isPro = plan.tier === 'PRO_MONTHLY';

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all ${
                isPro
                  ? 'bg-gradient-to-b from-orange-50/80 to-white dark:from-stone-900 dark:to-stone-900/60 border-2 border-[#FF4E00] shadow-xl md:-translate-y-2'
                  : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs'
              }`}
            >
              {isPro && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF4E00] to-[#A32300] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  Más Popular para Clientes
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg font-serif text-stone-900 dark:text-stone-100">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 min-h-[32px]">
                    {plan.description}
                  </p>
                </div>

                <div className="pt-2 flex items-baseline space-x-1">
                  <span className="text-3xl font-extrabold font-serif text-stone-900 dark:text-stone-100">
                    {plan.priceEur === 0 ? '0€' : `${plan.priceEur.toFixed(2)}€`}
                  </span>
                  <span className="text-xs text-stone-400">/ mes</span>
                </div>

                <div className="pt-4 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
                  {plan.features.map((feat: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs text-stone-700 dark:text-stone-300">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-stone-100 dark:border-stone-800">
                {isCurrent ? (
                  <div className="w-full py-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-xs text-center border border-emerald-200 dark:border-emerald-800">
                    Tu Plan Actual Activo
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={processingPlanId === plan.id}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                      isPro
                        ? 'bg-gradient-to-r from-[#FF4E00] to-[#A32300] hover:from-[#e04500] hover:to-[#8c1e00] text-white shadow-md'
                        : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100'
                    }`}
                  >
                    <span>{processingPlanId === plan.id ? 'Autenticando...' : `Suscribirme con ${selectedGateway}`}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Security & Guarantee Note */}
      <div className="p-6 rounded-2xl bg-stone-50 dark:bg-stone-850/50 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>Pagos y renovaciones gestionadas de forma segura con Stripe Connect y PayPal Checkout. Puedes cancelar en cualquier momento sin penalizaciones.</span>
        </div>
      </div>

    </div>
  );
};
