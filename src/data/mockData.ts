import { Product, SubscriptionPlan } from '../types';

// Catálogo de planes de suscripción de la plataforma. Las categorías se
// cargan desde la API y se gestionan en la tabla `categories`.

export function sortProductsByRating<T extends Pick<Product, 'id' | 'rating' | 'salesCount' | 'businessId'>>(products: T[]) {
  return [...products].sort((a, b) => {
    const ratingGap = (b.rating ?? 0) - (a.rating ?? 0);
    if (ratingGap !== 0) return ratingGap;
    return (b.salesCount ?? 0) - (a.salesCount ?? 0);
  });
}

export function getTopRatedProductsForLocality<T extends Pick<Product, 'id' | 'localityId' | 'rating' | 'salesCount' | 'businessId'>>(products: T[], localityId: string, limit = 4) {
  return sortProductsByRating(products.filter((product) => product.localityId === localityId || !product.localityId)).slice(0, limit);
}

export function getTopRatedProductsByBusiness<T extends Pick<Product, 'id' | 'businessId' | 'localityId' | 'rating' | 'salesCount'>>(products: T[], localityId: string, limit = 10) {
  const rankedProducts = sortProductsByRating(products.filter((product) => product.localityId === localityId || !product.localityId));
  const selectedByBusiness = new Map<string, T>();

  for (const product of rankedProducts) {
    if (!selectedByBusiness.has(product.businessId)) {
      selectedByBusiness.set(product.businessId, product);
    }
  }

  return Array.from(selectedByBusiness.values()).slice(0, limit);
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'sub-free',
    name: 'Plan Básico Local',
    tier: 'FREE',
    priceEur: 0,
    interval: 'month',
    description: 'Para clientes y comercios en periodo de prueba de 30 días.',
    features: [
      'Acceso a todos los comercios del valle',
      'Pedidos y seguimiento en tiempo real',
      'Atención estándar por correo',
      'Comisión estándar de plataforma por pedido'
    ]
  },
  {
    id: 'sub-pro',
    name: 'PideTiétar Club Plus (Cliente)',
    tier: 'PRO_MONTHLY',
    priceEur: 6.99,
    interval: 'month',
    description: 'Envíos gratuitos ilimitados en pedidos superiores a 12€ y descuentos exclusivos.',
    features: [
      'Envíos ilimitados gratuitos en pedidos > 12€',
      'Sincronización automática de citas y pedidos con Google Calendar',
      'Notificaciones y alertas prioritarias por Gmail',
      'Acceso anticipado a ofertas festivas del valle',
      'Soporte prioritario 7 días a la semana'
    ],
    stripePriceId: 'price_pro_monthly_client_7e',
    paypalPlanId: 'P-PLAN-PRO-CLIENT'
  },
  {
    id: 'sub-partner',
    name: 'Partner Comercio Destacado',
    tier: 'PREMIUM_PARTNER',
    priceEur: 29.99,
    interval: 'month',
    description: 'Para negocios locales que buscan máxima visibilidad, analíticas avanzadas y menor comisión.',
    features: [
      'Posicionamiento prioritario en portada y carrusel',
      'Comisión reducida al 3% en productos',
      'Exportación ilimitada de reportes de cierre de turno en PDF y CSV',
      'Integración directa con Google Calendar para reservas y turnos',
      'Soporte técnico dedicado vía WhatsApp y teléfono'
    ],
    stripePriceId: 'price_partner_monthly_30e',
    paypalPlanId: 'P-PLAN-BIZ-PARTNER'
  }
];
