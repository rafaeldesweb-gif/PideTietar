import { Locality, BusinessCategory, Business, Product, SubscriptionPlan } from '../types';

export const LOCALITIES: Locality[] = [
  {
    id: 'sotillo',
    name: 'Sotillo de la Adrada',
    postalCode: '05420',
    coordinates: { lat: 40.2889, lng: -4.5828 },
    active: true,
    coverImage: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'la-adrada',
    name: 'La Adrada',
    postalCode: '05430',
    coordinates: { lat: 40.2989, lng: -4.6361 },
    active: true,
    coverImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'santa-maria',
    name: 'Santa María del Tiétar',
    postalCode: '05429',
    coordinates: { lat: 40.3031, lng: -4.5519 },
    active: true,
    coverImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'casillas',
    name: 'Casillas',
    postalCode: '05428',
    coordinates: { lat: 40.3275, lng: -4.5775 },
    active: true,
    coverImage: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'piedralaves',
    name: 'Piedralaves',
    postalCode: '05440',
    coordinates: { lat: 40.3144, lng: -4.6989 },
    active: true,
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80'
  }
];

export const CATEGORIES: BusinessCategory[] = [
  { 
    id: 'biriyani', 
    name: 'Arroces & Paellas', 
    slug: 'arroces', 
    iconName: 'Flame',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=160&auto=format&fit=crop&q=80'
  },
  { 
    id: 'rolls', 
    name: 'Rolls & Wraps', 
    slug: 'rolls', 
    iconName: 'Utensils',
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=160&auto=format&fit=crop&q=80'
  },
  { 
    id: 'postres', 
    name: 'Postres & Dulces', 
    slug: 'postres', 
    iconName: 'IceCream',
    imageUrl: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=160&auto=format&fit=crop&q=80'
  },
  { 
    id: 'bocadillos', 
    name: 'Sandwich & Bocatas', 
    slug: 'bocadillos', 
    iconName: 'Sandwich',
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=160&auto=format&fit=crop&q=80'
  },
  { 
    id: 'tartas', 
    name: 'Tartas & Cakes', 
    slug: 'tartas', 
    iconName: 'Sparkles',
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=160&auto=format&fit=crop&q=80'
  },
  { 
    id: 'vegano', 
    name: 'Pure Veg / Verde', 
    slug: 'vegano', 
    iconName: 'Soup',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=160&auto=format&fit=crop&q=80'
  },
  { 
    id: 'pasta', 
    name: 'Pasta Italiana', 
    slug: 'pasta', 
    iconName: 'Utensils',
    imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=160&auto=format&fit=crop&q=80'
  },
  { 
    id: 'noodles', 
    name: 'Fideos & Wok', 
    slug: 'noodles', 
    iconName: 'Soup',
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=160&auto=format&fit=crop&q=80'
  },
  { 
    id: 'pizzas', 
    name: 'Pizzas', 
    slug: 'pizzas', 
    iconName: 'Pizza',
    imageUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=160&auto=format&fit=crop&q=80'
  },
  { 
    id: 'hamburguesas', 
    name: 'Burgers', 
    slug: 'hamburguesas', 
    iconName: 'Sandwich',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=160&auto=format&fit=crop&q=80'
  },
  { 
    id: 'patatas-raciones', 
    name: 'Snacks & Patatas', 
    slug: 'patatas-raciones', 
    iconName: 'Soup',
    imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=160&auto=format&fit=crop&q=80'
  },
  { 
    id: 'bebidas', 
    name: 'Bebidas & Zumos', 
    slug: 'bebidas', 
    iconName: 'Wine',
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=160&auto=format&fit=crop&q=80'
  },
  { 
    id: 'desayunos', 
    name: 'Desayunos & Café', 
    slug: 'desayunos', 
    iconName: 'Coffee',
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=160&auto=format&fit=crop&q=80'
  },
  { 
    id: 'tapas-carnes', 
    name: 'Carnes & Asados', 
    slug: 'carnes-asados', 
    iconName: 'Flame',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=160&auto=format&fit=crop&q=80'
  },
  { 
    id: 'kioscos', 
    name: 'Golosinas & Kiosco', 
    slug: 'kioscos', 
    iconName: 'Candy',
    imageUrl: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=160&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    businessId: 'biz-1',
    categoryId: 'hamburguesas',
    name: 'Burger Valleña Ternera de Ávila (200g)',
    description: 'Carne 100% IGP Ternera de Ávila, queso de cabra artesanal de la zona, cebolla caramelizada y salsa casera PideTiétar.',
    priceCents: 1150,
    taxPercentage: 10,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    salesCount: 142,
    removableIngredients: ['Cebolla caramelizada', 'Queso de cabra', 'Pepinillo'],
    optionGroups: [
      {
        id: 'opt-punto',
        name: 'Punto de la carne',
        required: true,
        minChoices: 1,
        maxChoices: 1,
        options: [
          { id: 'p-1', name: 'Poco hecha', priceCents: 0 },
          { id: 'p-2', name: 'Al punto sabroso', priceCents: 0 },
          { id: 'p-3', name: 'Muy hecha', priceCents: 0 }
        ]
      },
      {
        id: 'opt-extras',
        name: 'Extras opcionales',
        required: false,
        minChoices: 0,
        maxChoices: 3,
        options: [
          { id: 'e-1', name: 'Bacon crujiente ahumado', priceCents: 150 },
          { id: 'e-2', name: 'Huevo campero frito', priceCents: 120 },
          { id: 'e-3', name: 'Doble de queso fundido', priceCents: 150 }
        ]
      }
    ],
    allergens: ['Gluten', 'Lácteos', 'Huevo']
  },
  {
    id: 'prod-2',
    businessId: 'biz-1',
    categoryId: 'patatas-raciones',
    name: 'Patatas Revolconas con Torrezno de Soria',
    description: 'Receta tradicional del valle con pimentón de La Vera agridulce y torreznos crujientes recién tostados.',
    priceCents: 750,
    taxPercentage: 10,
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    salesCount: 189,
    removableIngredients: ['Torreznos'],
    allergens: []
  },
  {
    id: 'prod-3',
    businessId: 'biz-2',
    categoryId: 'pizzas',
    name: 'Pizza Artesana La Adrada Cuatro Quesos',
    description: 'Masa madre fermentada 48 horas, mozzarella fior di latte, gorgonzola, parmesano reggiano y queso curado del Tiétar.',
    priceCents: 1290,
    taxPercentage: 10,
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    salesCount: 220,
    removableIngredients: ['Orégano fresco'],
    optionGroups: [
      {
        id: 'opt-borde',
        name: 'Tipo de borde',
        required: false,
        minChoices: 0,
        maxChoices: 1,
        options: [
          { id: 'b-1', name: 'Borde clásico rústico', priceCents: 0 },
          { id: 'b-2', name: 'Borde relleno de queso philadelphia', priceCents: 220 }
        ]
      }
    ],
    allergens: ['Gluten', 'Lácteos']
  },
  {
    id: 'prod-4',
    businessId: 'biz-2',
    categoryId: 'pizzas',
    name: 'Pizza Calzone Serrano Rústica',
    description: 'Tomate San Marzano, jamón serrano bodega, setas boletus y albahaca fresca sellada al horno de piedra.',
    priceCents: 1350,
    taxPercentage: 10,
    imageUrl: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    salesCount: 95,
    allergens: ['Gluten', 'Lácteos']
  },
  {
    id: 'prod-5',
    businessId: 'biz-3',
    categoryId: 'kioscos',
    name: 'Pack Fiesta Chuches & Snacks Tiétar',
    description: 'Surtido grande de gominolas frescas, frutos secos tostados del valle y patatas fritas artesanas.',
    priceCents: 650,
    taxPercentage: 10,
    imageUrl: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    salesCount: 78,
    allergens: ['Frutos secos']
  },
  {
    id: 'prod-6',
    businessId: 'biz-3',
    categoryId: 'bebidas',
    name: 'Cerveza Artesana Gredos Rubia (33cl)',
    description: 'Elaborada con agua de deshielo de la Sierra de Gredos, fresca y aromática.',
    priceCents: 320,
    taxPercentage: 21,
    imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    salesCount: 160,
    allergens: ['Gluten']
  }
];

export const INITIAL_BUSINESSES: Business[] = [
  {
    id: 'biz-1',
    name: 'La Bodeguita de Sotillo',
    legalName: 'La Bodeguita de Sotillo S.L.',
    cif: 'B05123456',
    category: 'hamburguesas',
    localityId: 'sotillo',
    address: 'Calle Mayor 14, 05420 Sotillo de la Adrada',
    phone: '+34 918 64 21 00',
    email: 'contacto@labodeguitasotillo.es',
    coordinates: { lat: 40.2891, lng: -4.5824 },
    rating: 4.8,
    reviewCount: 230,
    estimatedTimeMin: 25,
    estimatedTimeMax: 40,
    deliveryFeeCents: 200,
    minOrderCents: 1000,
    bannerUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&auto=format&fit=crop&q=80',
    isShiftOpen: true,
    deliveryModes: ['PLATFORM_COURIER', 'PICKUP'],
    deliveryRadiusKm: 12,
    status: 'APPROVED',
    schedule: [
      { dayOfWeek: 1, openTime: '13:00', closeTime: '23:30', isOpen: true },
      { dayOfWeek: 2, openTime: '13:00', closeTime: '23:30', isOpen: true },
      { dayOfWeek: 3, openTime: '13:00', closeTime: '23:30', isOpen: true },
      { dayOfWeek: 4, openTime: '13:00', closeTime: '23:30', isOpen: true },
      { dayOfWeek: 5, openTime: '13:00', closeTime: '00:00', isOpen: true },
      { dayOfWeek: 6, openTime: '13:00', closeTime: '00:00', isOpen: true },
      { dayOfWeek: 0, openTime: '13:00', closeTime: '23:30', isOpen: true }
    ]
  },
  {
    id: 'biz-2',
    name: 'Pizzería Di Castello La Adrada',
    legalName: 'Pizza Castello Adrada C.B.',
    cif: 'E05765432',
    category: 'pizzas',
    localityId: 'la-adrada',
    address: 'Plaza del Castillo 3, 05430 La Adrada',
    phone: '+34 918 67 11 22',
    email: 'info@pizzeriadicastello.es',
    coordinates: { lat: 40.2985, lng: -4.6358 },
    rating: 4.9,
    reviewCount: 312,
    estimatedTimeMin: 20,
    estimatedTimeMax: 35,
    deliveryFeeCents: 250,
    minOrderCents: 1200,
    bannerUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&auto=format&fit=crop&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=200&auto=format&fit=crop&q=80',
    isShiftOpen: true,
    deliveryModes: ['OWN_COURIER', 'PICKUP'],
    deliveryRadiusKm: 15,
    status: 'APPROVED',
    schedule: [
      { dayOfWeek: 1, openTime: '19:00', closeTime: '23:30', isOpen: true },
      { dayOfWeek: 2, openTime: '19:00', closeTime: '23:30', isOpen: false },
      { dayOfWeek: 3, openTime: '19:00', closeTime: '23:30', isOpen: true },
      { dayOfWeek: 4, openTime: '19:00', closeTime: '23:30', isOpen: true },
      { dayOfWeek: 5, openTime: '19:00', closeTime: '00:00', isOpen: true },
      { dayOfWeek: 6, openTime: '13:00', closeTime: '00:00', isOpen: true },
      { dayOfWeek: 0, openTime: '13:00', closeTime: '23:30', isOpen: true }
    ]
  },
  {
    id: 'biz-3',
    name: 'Kiosco & Chucherías Santa María',
    legalName: 'Comercio Santa María C.B.',
    cif: 'B05987654',
    category: 'kioscos',
    localityId: 'santa-maria',
    address: 'Av. Juan Carlos I, 05429 Santa María del Tiétar',
    phone: '+34 918 64 00 99',
    email: 'pedidos@kioscosantamaria.es',
    coordinates: { lat: 40.3029, lng: -4.5515 },
    rating: 4.7,
    reviewCount: 88,
    estimatedTimeMin: 15,
    estimatedTimeMax: 25,
    deliveryFeeCents: 150,
    minOrderCents: 500,
    bannerUrl: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=1000&auto=format&fit=crop&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80',
    isShiftOpen: true,
    deliveryModes: ['PLATFORM_COURIER', 'PICKUP'],
    deliveryRadiusKm: 10,
    status: 'APPROVED',
    schedule: [
      { dayOfWeek: 1, openTime: '11:00', closeTime: '22:00', isOpen: true },
      { dayOfWeek: 2, openTime: '11:00', closeTime: '22:00', isOpen: true },
      { dayOfWeek: 3, openTime: '11:00', closeTime: '22:00', isOpen: true },
      { dayOfWeek: 4, openTime: '11:00', closeTime: '22:00', isOpen: true },
      { dayOfWeek: 5, openTime: '11:00', closeTime: '23:00', isOpen: true },
      { dayOfWeek: 6, openTime: '11:00', closeTime: '23:00', isOpen: true },
      { dayOfWeek: 0, openTime: '11:00', closeTime: '22:00', isOpen: true }
    ]
  }
];

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
