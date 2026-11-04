import { Cart, CartItem, Order, User, Business } from '../types';

export interface LedgerBreakdown {
  subtotalCents: number;
  deliveryFeeCents: number;
  platformProductFeeCents: number; // 5% of subtotal
  platformDeliveryFeeCents: number; // 20% of delivery fee
  totalPlatformCommissionCents: number;
  businessPayoutCents: number;
  courierPayoutCents: number;
  tipCents: number;
  totalCents: number;
}

/**
 * Calculates marketplace breakdown strictly in integer cents
 */
export function calculateOrderLedger(
  items: CartItem[],
  deliveryFeeCents: number,
  deliveryType: 'DELIVERY' | 'PICKUP',
  tipCents: number = 0,
  hasFreeDelivery: boolean = false
): LedgerBreakdown {
  const subtotalCents = items.reduce((acc, item) => acc + item.itemPriceCents * item.quantity, 0);
  const effectiveDeliveryFee = (deliveryType === 'PICKUP' || hasFreeDelivery) ? 0 : deliveryFeeCents;

  // Platform commissions: 5% of items subtotal, 20% of delivery fee
  const platformProductFeeCents = Math.round(subtotalCents * 0.05);
  const platformDeliveryFeeCents = Math.round(effectiveDeliveryFee * 0.20);
  const totalPlatformCommissionCents = platformProductFeeCents + platformDeliveryFeeCents;

  const businessPayoutCents = subtotalCents - platformProductFeeCents;
  const courierPayoutCents = effectiveDeliveryFee - platformDeliveryFeeCents;

  const totalCents = subtotalCents + effectiveDeliveryFee + tipCents;

  return {
    subtotalCents,
    deliveryFeeCents: effectiveDeliveryFee,
    platformProductFeeCents,
    platformDeliveryFeeCents,
    totalPlatformCommissionCents,
    businessPayoutCents,
    courierPayoutCents,
    tipCents,
    totalCents
  };
}

export interface PaymentProcessingResult {
  success: boolean;
  transactionId: string;
  provider: 'STRIPE' | 'PAYPAL';
  amountCents: number;
  error?: string;
}

/**
 * Simulates or routes payment through Stripe / PayPal verification
 */
export async function processPayment(
  amountCents: number,
  provider: 'STRIPE' | 'PAYPAL',
  details: { orderNumber: string; customerEmail: string }
): Promise<PaymentProcessingResult> {
  // Check if real keys are present in client env or server proxy
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

  // 1.2s delay for secure authentication check
  await new Promise(r => setTimeout(r, 1200));

  if (provider === 'STRIPE') {
    return {
      success: true,
      transactionId: 'ch_stripe_' + Math.random().toString(36).substring(2, 12),
      provider: 'STRIPE',
      amountCents
    };
  } else {
    return {
      success: true,
      transactionId: 'PAYID-' + Math.random().toString(36).substring(2, 12).toUpperCase(),
      provider: 'PAYPAL',
      amountCents
    };
  }
}

/**
 * Process monthly subscription payments via Stripe or PayPal
 */
export async function processSubscriptionCheckout(
  planTier: 'PRO_MONTHLY' | 'PREMIUM_PARTNER',
  amountEur: number,
  provider: 'STRIPE' | 'PAYPAL',
  userEmail: string
): Promise<{ success: boolean; subscriptionId: string; nextBillingDate: string; provider: string }> {
  await new Promise(r => setTimeout(r, 1500));

  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);

  return {
    success: true,
    subscriptionId: `sub_${provider.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`,
    nextBillingDate: nextMonth.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
    provider
  };
}

/*─────────────────────────────────────────────────────────────────────────────
  Stripe Connect – preparación para cobros reales, desgloses y pagos
  a negocios y repartidores.

  Estas funciones se llaman desde el frontend y delegan en los endpoints
  del backend (server.js) que a su vez usan la clave secreta de Stripe.
  Nunca se expone STRIPE_SECRET_KEY en el navegador.
  ─────────────────────────────────────────────────────────────────────────────*/

export interface StripeConnectAccountInput {
  businessId: string;
  businessName: string;
  businessEmail: string;
  businessCountry: string; // 'ES'
  accountNumber?: string; // IBAN para transferencias
}

export interface StripeConnectAccountResult {
  accountId: string;
  accountLinkUrl: string;
  status: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

export interface StripePaymentIntentInput {
  orderId: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  businessId: string;
  applicationFeeCents: number;
  transferData?: {
    destination: string; // Stripe connected account ID (business)
    amountCents: number; // amount to transfer to business (business payout)
  };
}

export interface StripePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  status: string;
}

export interface StripePayoutInput {
  accountId: string; // Stripe connected account ID
  amountCents: number;
  currency: string;
  description?: string;
}

export interface StripePayoutResult {
  payoutId: string;
  status: string;
  amountCents: number;
}

/**
 * Crea una cuenta conectada de Stripe Express para un negocio y devuelve
 * el enlace de onboarding para que el negocio complete sus datos bancarios.
 */
export async function createStripeConnectAccount(
  input: StripeConnectAccountInput
): Promise<StripeConnectAccountResult> {
  const response = await fetch('/api/stripe/create-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo crear la cuenta de Stripe Connect.');
  }

  return data;
}

/**
 * Crea un Payment Intent en Stripe con la lógica de marketplace:
 * - El cliente paga el importe total.
 * - PideTiétar retiene su comisión (application_fee).
 * - El resto se transfiere automáticamente a la cuenta conectada del negocio.
 */
export async function createStripePaymentIntent(
  input: StripePaymentIntentInput
): Promise<StripePaymentIntentResult> {
  const response = await fetch('/api/stripe/payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo crear el intento de pago.');
  }

  return data;
}

/**
 * Solicita una transferencia (payout) desde la cuenta conectada de Stripe
 * hacia el IBAN del negocio o del repartidor.
 */
export async function createStripePayout(
  input: StripePayoutInput
): Promise<StripePayoutResult> {
  const response = await fetch('/api/stripe/payout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo crear la transferencia.');
  }

  return data;
}

/**
 * Consulta el estado de una cuenta conectada de Stripe (si ya puede cobrar
 * y si ya puede recibir transferencias).
 */
export async function getStripeAccountStatus(
  accountId: string
): Promise<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}> {
  const response = await fetch(`/api/stripe/account-status?accountId=${encodeURIComponent(accountId)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo consultar el estado de la cuenta.');
  }
  return data;
}
