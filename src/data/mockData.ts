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

const BUSINESS_SEED_DATA: Array<Partial<Business> & { localityId: string; category: string; name: string; legalName: string; cif: string; address: string; phone: string; email: string; coordinates: { lat: number; lng: number }; rating: number; reviewCount: number; bannerUrl: string; logoUrl: string; isShiftOpen: boolean; deliveryModes: Business['deliveryModes']; deliveryRadiusKm: number; status: Business['status']; }> = [
  { localityId: 'sotillo', category: 'hamburguesas', name: 'La Bodeguita de Sotillo', legalName: 'La Bodeguita de Sotillo S.L.', cif: 'B05123456', address: 'Calle Mayor 14, 05420 Sotillo de la Adrada', phone: '+34 918 64 21 00', email: 'contacto@labodeguitasotillo.es', coordinates: { lat: 40.2891, lng: -4.5824 }, rating: 4.8, reviewCount: 230, bannerUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 12, status: 'APPROVED' },
  { localityId: 'sotillo', category: 'pizzas', name: 'Masa Madre Sotillo', legalName: 'Masa Madre Sotillo SL', cif: 'B05234567', address: 'Calle de la Fuente 16, 05420 Sotillo de la Adrada', phone: '+34 918 77 44 11', email: 'hola@masamadresotillo.es', coordinates: { lat: 40.2914, lng: -4.5846 }, rating: 4.7, reviewCount: 198, bannerUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['OWN_COURIER', 'PICKUP'], deliveryRadiusKm: 11, status: 'APPROVED' },
  { localityId: 'sotillo', category: 'tapas-carnes', name: 'Asador El Encinar', legalName: 'El Encinar Carnes S.L.', cif: 'B05345678', address: 'Avenida de la Vega 21, 05420 Sotillo de la Adrada', phone: '+34 918 30 13 50', email: 'asador@elencinar.es', coordinates: { lat: 40.2875, lng: -4.5788 }, rating: 4.9, reviewCount: 274, bannerUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 14, status: 'APPROVED' },
  { localityId: 'sotillo', category: 'vegano', name: 'Verde y Viento', legalName: 'Verde y Viento Biocuisine', cif: 'B05456789', address: 'Plaza de la Cruz 7, 05420 Sotillo de la Adrada', phone: '+34 918 88 14 44', email: 'salud@verdeyviento.es', coordinates: { lat: 40.2861, lng: -4.5866 }, rating: 4.6, reviewCount: 161, bannerUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PICKUP'], deliveryRadiusKm: 8, status: 'APPROVED' },
  { localityId: 'sotillo', category: 'pasta', name: 'Trattoria El Rincón', legalName: 'El Rincón Trattoria SL', cif: 'B05567890', address: 'Calle del Sol 33, 05420 Sotillo de la Adrada', phone: '+34 918 52 31 08', email: 'rincón@trattoria.es', coordinates: { lat: 40.2923, lng: -4.5791 }, rating: 4.8, reviewCount: 215, bannerUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 13, status: 'APPROVED' },

  { localityId: 'la-adrada', category: 'pizzas', name: 'Pizzería del Rincón', legalName: 'Del Rincón Pizzas SL', cif: 'B06123456', address: 'Plaza Mayor 9, 05430 La Adrada', phone: '+34 918 40 12 14', email: 'hola@pizzeriadelrincon.es', coordinates: { lat: 40.2987, lng: -4.6357 }, rating: 4.9, reviewCount: 289, bannerUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['OWN_COURIER', 'PICKUP'], deliveryRadiusKm: 15, status: 'APPROVED' },
  { localityId: 'la-adrada', category: 'hamburguesas', name: 'Burger House La Adrada', legalName: 'Burger House La Adrada S.L.', cif: 'B06234567', address: 'Calle de las Eras 5, 05430 La Adrada', phone: '+34 918 17 09 90', email: 'contacto@burgerhouseladrada.es', coordinates: { lat: 40.3002, lng: -4.6308 }, rating: 4.7, reviewCount: 189, bannerUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 12, status: 'APPROVED' },
  { localityId: 'la-adrada', category: 'postres', name: 'Dulce Mimbre', legalName: 'Dulce Mimbre Pastelería', cif: 'B06345678', address: 'Calle de la Paz 12, 05430 La Adrada', phone: '+34 918 21 88 26', email: 'dulce@dulcemimbre.es', coordinates: { lat: 40.3007, lng: -4.6374 }, rating: 4.8, reviewCount: 214, bannerUrl: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PICKUP'], deliveryRadiusKm: 7, status: 'APPROVED' },
  { localityId: 'la-adrada', category: 'tapas-carnes', name: 'La Parrilla del Tiétar', legalName: 'La Parrilla del Tiétar SL', cif: 'B06456789', address: 'Avenida del Rio 18, 05430 La Adrada', phone: '+34 918 99 15 70', email: 'parrilla@tietar.es', coordinates: { lat: 40.2976, lng: -4.6289 }, rating: 4.9, reviewCount: 320, bannerUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 14, status: 'APPROVED' },
  { localityId: 'la-adrada', category: 'kioscos', name: 'Merienda del Valle', legalName: 'Merienda del Valle SL', cif: 'B06567890', address: 'Calle San Vicente 2, 05430 La Adrada', phone: '+34 918 06 83 09', email: 'merienda@valle.es', coordinates: { lat: 40.3018, lng: -4.6335 }, rating: 4.5, reviewCount: 122, bannerUrl: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1528712306091-ed0763094c98?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PICKUP'], deliveryRadiusKm: 6, status: 'APPROVED' },

  { localityId: 'santa-maria', category: 'kioscos', name: 'Kiosco & Chucherías Santa María', legalName: 'Comercio Santa María C.B.', cif: 'B07123456', address: 'Av. Juan Carlos I, 05429 Santa María del Tiétar', phone: '+34 918 64 00 99', email: 'pedidos@kioscosantamaria.es', coordinates: { lat: 40.3029, lng: -4.5515 }, rating: 4.7, reviewCount: 88, bannerUrl: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 10, status: 'APPROVED' },
  { localityId: 'santa-maria', category: 'pasta', name: 'La Pasta del Río', legalName: 'La Pasta del Río SL', cif: 'B07234567', address: 'Calle Río 11, 05429 Santa María del Tiétar', phone: '+34 918 72 63 12', email: 'rio@lapastadelrio.es', coordinates: { lat: 40.3042, lng: -4.5481 }, rating: 4.8, reviewCount: 232, bannerUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 13, status: 'APPROVED' },
  { localityId: 'santa-maria', category: 'bocadillos', name: 'Bocatas del Tiétar', legalName: 'Bocatas del Tiétar S.L.', cif: 'B07345678', address: 'Calle Horno 9, 05429 Santa María del Tiétar', phone: '+34 918 15 34 77', email: 'hola@bocatasdeltietar.es', coordinates: { lat: 40.3014, lng: -4.5557 }, rating: 4.6, reviewCount: 176, bannerUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 9, status: 'APPROVED' },
  { localityId: 'santa-maria', category: 'desayunos', name: 'Café de la Sierra', legalName: 'Café de la Sierra SA', cif: 'B07456789', address: 'Calle Real 3, 05429 Santa María del Tiétar', phone: '+34 918 44 21 05', email: 'cafe@sierratietar.es', coordinates: { lat: 40.2997, lng: -4.5536 }, rating: 4.7, reviewCount: 205, bannerUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PICKUP'], deliveryRadiusKm: 5, status: 'APPROVED' },
  { localityId: 'santa-maria', category: 'rolls', name: 'Wrap & Go Tiétar', legalName: 'Wrap & Go Tiétar C.B.', cif: 'B07567890', address: 'Calle Muelle 17, 05429 Santa María del Tiétar', phone: '+34 918 58 73 19', email: 'wrap@go.es', coordinates: { lat: 40.3061, lng: -4.5529 }, rating: 4.5, reviewCount: 138, bannerUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1528712306091-ed0763094c98?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 8, status: 'APPROVED' },

  { localityId: 'casillas', category: 'hamburguesas', name: 'Burgueria Casillas', legalName: 'Burgueria Casillas S.L.', cif: 'B08123456', address: 'Calle Ancha 28, 05428 Casillas', phone: '+34 918 32 44 17', email: 'pedidos@burgueriacasillas.es', coordinates: { lat: 40.3278, lng: -4.5768 }, rating: 4.8, reviewCount: 205, bannerUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 12, status: 'APPROVED' },
  { localityId: 'casillas', category: 'pizzas', name: 'La Fornace Casillas', legalName: 'La Fornace Casillas SL', cif: 'B08234567', address: 'Avenida del Valle 8, 05428 Casillas', phone: '+34 918 58 11 44', email: 'hola@lafornacecasillas.es', coordinates: { lat: 40.3292, lng: -4.5731 }, rating: 4.7, reviewCount: 184, bannerUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 9, status: 'APPROVED' },
  { localityId: 'casillas', category: 'vegano', name: 'Huerto del Saliente', legalName: 'Huerto del Saliente SL', cif: 'B08345678', address: 'Calle del Pinar 4, 05428 Casillas', phone: '+34 918 28 66 92', email: 'huerto@saliente.es', coordinates: { lat: 40.3249, lng: -4.5794 }, rating: 4.9, reviewCount: 244, bannerUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PICKUP'], deliveryRadiusKm: 7, status: 'APPROVED' },
  { localityId: 'casillas', category: 'tartas', name: 'Pastelería de la Vega', legalName: 'Pastelería de la Vega SL', cif: 'B08456789', address: 'Calle del Río 14, 05428 Casillas', phone: '+34 918 84 15 88', email: 'pasteles@vega.es', coordinates: { lat: 40.3265, lng: -4.5802 }, rating: 4.8, reviewCount: 218, bannerUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PICKUP'], deliveryRadiusKm: 6, status: 'APPROVED' },
  { localityId: 'casillas', category: 'noodles', name: 'Wok de la Sierra', legalName: 'Wok de la Sierra SA', cif: 'B08567890', address: 'Plaza del Pósito 12, 05428 Casillas', phone: '+34 918 14 76 39', email: 'wok@sierracasillas.es', coordinates: { lat: 40.3289, lng: -4.5784 }, rating: 4.7, reviewCount: 147, bannerUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 10, status: 'APPROVED' },

  { localityId: 'piedralaves', category: 'tapas-carnes', name: 'Asador de Piedralaves', legalName: 'Asador de Piedralaves SL', cif: 'B09123456', address: 'Calle Encina 3, 05440 Piedralaves', phone: '+34 918 97 12 40', email: 'asador@piedralaves.es', coordinates: { lat: 40.3158, lng: -4.7016 }, rating: 4.8, reviewCount: 264, bannerUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 15, status: 'APPROVED' },
  { localityId: 'piedralaves', category: 'biriyani', name: 'Paellas y Arroces del Valle', legalName: 'Paellas y Arroces del Valle SA', cif: 'B09234567', address: 'Calle Jardín 6, 05440 Piedralaves', phone: '+34 918 44 11 60', email: 'paellas@valle.es', coordinates: { lat: 40.3144, lng: -4.6972 }, rating: 4.9, reviewCount: 298, bannerUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 14, status: 'APPROVED' },
  { localityId: 'piedralaves', category: 'bocadillos', name: 'Sobremesa Bocatas', legalName: 'Sobremesa Bocatas SL', cif: 'B09345678', address: 'Calle Mayor 19, 05440 Piedralaves', phone: '+34 918 88 30 12', email: 'bocata@sobremesa.es', coordinates: { lat: 40.3172, lng: -4.7033 }, rating: 4.6, reviewCount: 146, bannerUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PLATFORM_COURIER', 'PICKUP'], deliveryRadiusKm: 8, status: 'APPROVED' },
  { localityId: 'piedralaves', category: 'postres', name: 'La Dulce Tarde', legalName: 'La Dulce Tarde S.L.', cif: 'B09456789', address: 'Plaza de la Iglesia 6, 05440 Piedralaves', phone: '+34 918 66 84 10', email: 'dulce@tarde.es', coordinates: { lat: 40.3127, lng: -4.7005 }, rating: 4.7, reviewCount: 187, bannerUrl: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PICKUP'], deliveryRadiusKm: 7, status: 'APPROVED' },
  { localityId: 'piedralaves', category: 'desayunos', name: 'Pan y Nata', legalName: 'Pan y Nata C.B.', cif: 'B09567890', address: 'Calle de la Fuente 12, 05440 Piedralaves', phone: '+34 918 22 88 73', email: 'info@panynata.es', coordinates: { lat: 40.3164, lng: -4.6991 }, rating: 4.5, reviewCount: 134, bannerUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1000&auto=format&fit=crop&q=80', logoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&auto=format&fit=crop&q=80', isShiftOpen: true, deliveryModes: ['PICKUP'], deliveryRadiusKm: 6, status: 'APPROVED' }
];

const MAIN_PRODUCT_TEMPLATES = [
  { categoryId: 'hamburguesas', name: 'Burger Valleña Ternera de Ávila', description: 'Carne 100% IGP y queso artesano con salsa casera', priceCents: 1150, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80', tag: 'Más pedido', allergens: ['Gluten', 'Lácteos', 'Huevo'] },
  { categoryId: 'patatas-raciones', name: 'Patatas Revolconas con Torrezno', description: 'Patatas al vapor con pimentón y torreznos crujientes', priceCents: 750, imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80', tag: 'Clásico', allergens: ['Gluten'] },
  { categoryId: 'pizzas', name: 'Pizza Artesana Cuatro Quesos', description: 'Masa madre y quesos curados del valle', priceCents: 1290, imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80', tag: 'Top rating', allergens: ['Gluten', 'Lácteos'] },
  { categoryId: 'tapas-carnes', name: 'Chuletón de Ávila', description: 'Bistec de calidad con guarnición de la casa', priceCents: 1890, imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', tag: 'Especialidad', allergens: ['Lácteos'] },
  { categoryId: 'bocadillos', name: 'Bocadillo de Calamares', description: 'Calamares tiernos en migas con alioli fresco', priceCents: 980, imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80', tag: 'Cerca de ti', allergens: ['Gluten'] },
  { categoryId: 'tartas', name: 'Tarta de Queso con Mermelada', description: 'Base crujiente y relleno cremoso de queso', priceCents: 620, imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80', tag: 'Postre', allergens: ['Gluten', 'Lácteos'] },
  { categoryId: 'vegano', name: 'Bowls de Hortalizas', description: 'Receta fresca y equilibrada con quinoa y verduras', priceCents: 1050, imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80', tag: 'Veggie', allergens: ['Sésamo'] },
  { categoryId: 'pasta', name: 'Pasta al Tomate y Albahaca', description: 'Pasta casera con salsa de tomate y basil', priceCents: 1180, imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=600&auto=format&fit=crop&q=80', tag: 'Italiano', allergens: ['Gluten'] },
  { categoryId: 'noodles', name: 'Wok de Fideos con Verduras', description: 'Fideos salteados con soja y verduras asadas', priceCents: 1080, imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80', tag: 'Wok', allergens: ['Soja', 'Gluten'] },
  { categoryId: 'kioscos', name: 'Pack de Golosinas del Valle', description: 'Selección de chuches y snacks locales', priceCents: 690, imageUrl: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=600&auto=format&fit=crop&q=80', tag: 'Snack', allergens: ['Frutos secos'] }
];

const DRINK_TEMPLATES = [
  { categoryId: 'bebidas', name: 'Limonada de Menta', description: 'Refrescante limonada natural con menta del huerto', priceCents: 340, imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&auto=format&fit=crop&q=80', allergens: [] },
  { categoryId: 'bebidas', name: 'Cerveza Artesana Rubia', description: 'Cerveza suave, de maltas tostadas y amargor limpio', priceCents: 420, imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&auto=format&fit=crop&q=80', allergens: ['Gluten'] },
  { categoryId: 'bebidas', name: 'Zumo de Naranja Natural', description: 'Natural, recién exprimido y sin azúcar añadida', priceCents: 360, imageUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&auto=format&fit=crop&q=80', allergens: [] },
  { categoryId: 'bebidas', name: 'Gaseosa de Limón', description: 'Bebida fría para acompañar tus platos favoritos', priceCents: 320, imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80', allergens: [] }
];

const DEFAULT_SCHEDULE = [
  { dayOfWeek: 1, openTime: '13:00', closeTime: '23:30', isOpen: true },
  { dayOfWeek: 2, openTime: '13:00', closeTime: '23:30', isOpen: true },
  { dayOfWeek: 3, openTime: '13:00', closeTime: '23:30', isOpen: true },
  { dayOfWeek: 4, openTime: '13:00', closeTime: '23:30', isOpen: true },
  { dayOfWeek: 5, openTime: '13:00', closeTime: '00:00', isOpen: true },
  { dayOfWeek: 6, openTime: '13:00', closeTime: '00:00', isOpen: true },
  { dayOfWeek: 0, openTime: '13:00', closeTime: '23:30', isOpen: true }
];

const buildCatalogForBusiness = (business: Business, businessIndex: number): Product[] => {
  const mainProducts = MAIN_PRODUCT_TEMPLATES.map((template, index) => {
    const priceDelta = ((businessIndex + index) % 4) * 70;
    const rating = Number((4.3 + ((businessIndex % 5) * 0.12) + ((index % 3) * 0.14)).toFixed(1));

    return {
      id: `${business.id}-product-${index + 1}`,
      businessId: business.id,
      localityId: business.localityId,
      categoryId: template.categoryId,
      name: `${template.name} ${business.name.split(' ')[0]}`.trim(),
      description: template.description,
      tag: template.tag,
      ingredients: [template.name, 'Ingredientes frescos del valle'],
      priceCents: template.priceCents + priceDelta,
      taxPercentage: 10,
      imageUrl: template.imageUrl,
      isAvailable: true,
      salesCount: 75 + businessIndex * 18 + index * 11,
      allergens: template.allergens,
      rating,
      ratingCount: 42 + businessIndex * 12 + index * 6,
    } satisfies Product;
  });

  const drinks = DRINK_TEMPLATES.map((template, index) => ({
    id: `${business.id}-drink-${index + 1}`,
    businessId: business.id,
    localityId: business.localityId,
    categoryId: template.categoryId,
    name: template.name,
    description: template.description,
    priceCents: template.priceCents + ((businessIndex + index) % 3) * 25,
    taxPercentage: 10,
    imageUrl: template.imageUrl,
    isAvailable: true,
    salesCount: 55 + businessIndex * 14 + index * 9,
    allergens: template.allergens,
    rating: Number((4.1 + ((businessIndex % 4) * 0.18) + ((index % 2) * 0.1)).toFixed(1)),
    ratingCount: 26 + businessIndex * 8 + index * 5,
  } satisfies Product));

  return [...mainProducts, ...drinks];
};

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

export const INITIAL_BUSINESSES: Business[] = BUSINESS_SEED_DATA.map((business, index) => ({
  ...business,
  id: `biz-${index + 1}`,
  category: business.category,
  deliveryFeeCents: 200 + (index % 4) * 50,
  minOrderCents: 800 + (index % 5) * 150,
  estimatedTimeMin: 20 + (index % 4) * 5,
  estimatedTimeMax: 30 + (index % 5) * 8,
  schedule: DEFAULT_SCHEDULE,
  featuredProducts: [],
}));

export const INITIAL_PRODUCTS: Product[] = INITIAL_BUSINESSES.flatMap((business, index) => buildCatalogForBusiness(business, index));

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
