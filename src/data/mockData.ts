import { BusinessCategory, Product, SubscriptionPlan } from '../types';

// Catálogo de categorías y planes de suscripción de la plataforma.
// No contiene negocios, productos ni localidades: esos datos se cargan
// siempre desde la API para que una instalación nueva empiece vacía.
export const CATEGORIES: BusinessCategory[] = [
  { id: 'biriyani', name: 'Arroces & Paellas', slug: 'arroces', iconName: 'Flame', imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=160&auto=format&fit=crop&q=80' },
  { id: 'rolls', name: 'Rolls & Wraps', slug: 'rolls', iconName: 'Utensils', imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=160&auto=format&fit=crop&q=80' },
  { id: 'postres', name: 'Postres & Dulces', slug: 'postres', iconName: 'IceCream', imageUrl: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=160&auto=format&fit=crop&q=80' },
  { id: 'bocadillos', name: 'Sandwich & Bocatas', slug: 'bocadillos', iconName: 'Sandwich', imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=160&auto=format&fit=crop&q=80' },
  { id: 'tartas', name: 'Tartas & Cakes', slug: 'tartas', iconName: 'Sparkles', imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=160&auto=format&fit=crop&q=80' },
  { id: 'vegano', name: 'Pure Veg / Verde', slug: 'vegano', iconName: 'Soup', imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=160&auto=format&fit=crop&q=80' },
  { id: 'pasta', name: 'Pasta Italiana', slug: 'pasta', iconName: 'Utensils', imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=160&auto=format&fit=crop&q=80' },
  { id: 'noodles', name: 'Fideos & Wok', slug: 'noodles', iconName: 'Soup', imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=160&auto=format&fit=crop&q=80' },
  { id: 'pizzas', name: 'Pizzas', slug: 'pizzas', iconName: 'Pizza', imageUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=160&auto=format&fit=crop&q=80' },
  { id: 'hamburguesas', name: 'Burgers', slug: 'hamburguesas', iconName: 'Sandwich', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=160&auto=format&fit=crop&q=80' },
  { id: 'patatas-raciones', name: 'Snacks & Patatas', slug: 'patatas-raciones', iconName: 'Soup', imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=160&auto=format&fit=crop&q=80' },
  { id: 'bebidas', name: 'Bebidas & Zumos', slug: 'bebidas', iconName: 'Wine', imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=160&auto=format&fit=crop&q=80' },
  { id: 'desayunos', name: 'Desayunos & Café', slug: 'desayunos', iconName: 'Coffee', imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=160&auto=format&fit=crop&q=80' },
  { id: 'tapas-carnes', name: 'Carnes & Asados', slug: 'carnes-asados', iconName: 'Flame', imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=160&auto=format&fit=crop&q=80' },
  { id: 'kioscos', name: 'Golosinas & Kiosco', slug: 'kioscos', iconName: 'Candy', imageUrl: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=160&auto=format&fit=crop&q=80' }
];

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
