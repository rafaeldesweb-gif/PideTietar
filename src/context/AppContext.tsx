import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Cart, CartItem, Order, Business, BusinessCategory, BusinessHours, BusinessOwnerInput, Locality, Product, CartItemOptionSelected } from '../types';
import { scheduleOrderInGoogleCalendar, sendEmailViaGmail } from '../services/googleWorkspace';
import { processPayment } from '../services/paymentService';
import { isSingleBusinessOrder } from '../utils/orderValidation';

interface AppContextType {
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Auth & User
  currentUser: User | null;
  // true cuando ya se restauró (o descartó) el token guardado al cargar la app
  sessionChecked: boolean;
  loginAs: (role: User['role'], customEmail?: string, extraData?: Partial<User>, options?: { silent?: boolean }) => void;
  logout: () => void;
  updateCurrentUserProfile: (data: Partial<User>) => Promise<boolean>;
  setCourierProfile: (profile: NonNullable<User['courierProfile']>) => void;
  toggleCourierAvailability: (online?: boolean) => void;
  verifyEmailWithGmailCode: (code: string) => Promise<boolean>;
  sendGmailVerificationCode: () => Promise<boolean>;
  verificationSent: boolean;
  generatedCode: string | null;

  // Active locality
  selectedLocality: Locality | null;
  setSelectedLocality: (loc: Locality | null) => void;
  localities: Locality[];
  addLocality: (data: Partial<Locality>) => Locality;
  updateLocality: (localityId: string, data: Partial<Locality>) => void;
  deleteLocality: (localityId: string) => void;

  // Businesses & Catalog
  businesses: Business[];
  products: Product[];
  categories: BusinessCategory[];
  refreshCategories: () => Promise<BusinessCategory[] | null>;
  createCategory: (data: Partial<BusinessCategory>) => Promise<BusinessCategory | null>;
  updateCategory: (categoryId: string, data: Partial<BusinessCategory>) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  // Sincroniza los negocios con el servidor y reemplaza la lista (también si
  // llega vacía). El panel de superadmin la usa para no editar filas que sólo
  // existen en la caché del navegador. Devuelve null si la consulta falla.
  refreshBusinesses: () => Promise<Business[] | null>;
  createBusiness: (
    businessData: Partial<Business>,
    owner?: BusinessOwnerInput | null,
    onFieldErrors?: (errors: Record<string, string>) => void,
  ) => Promise<Business | null>;
  updateBusiness: (
    businessId: string,
    businessData: Partial<Business>,
    owner?: BusinessOwnerInput | null,
    onFieldErrors?: (errors: Record<string, string>) => void,
  ) => Promise<boolean>;
  deleteBusiness: (businessId: string) => Promise<boolean>;
  createUserAccount: (
    data: {
      username: string;
      fullName: string;
      email: string;
      password: string;
      phone?: string;
      address?: string;
      dni?: string;
      role: User['role'];
      businessId?: string;
      courierBusinessIds?: string[];
      accountNumber?: string;
      courierConfirmation?: NonNullable<User['courierProfile']>['confirmation'];
    },
    onFieldErrors?: (errors: Record<string, string>) => void,
  ) => Promise<boolean>;
  listCouriers: () => Promise<User[]>;
  setCourierConfirmation: (
    userId: string,
    confirmation: NonNullable<User['courierProfile']>['confirmation'],
  ) => Promise<boolean>;
  updateCourierDetails: (
    userId: string,
    data: {
      courierBusinessIds: string[];
      phone?: string;
      address?: string;
      dni?: string;
      accountNumber?: string;
    },
    onFieldErrors?: (errors: Record<string, string>) => void,
  ) => Promise<boolean>;
  addProductToBusiness: (businessId: string, product: Omit<Product, 'id' | 'businessId'>) => Product;
  updateProductInBusiness: (productId: string, product: Partial<Product>) => Product | null;
  deleteProductFromBusiness: (productId: string) => void;
  updateBusinessShift: (businessId: string, isOpen: boolean) => void;
  toggleProductAvailability: (productId: string) => void;
  createManualOrder: (orderData: Partial<Order>) => Order;

  // Cart
  cart: Cart | null;
  addToCart: (
    item: Omit<CartItem, 'cartItemId'>,
    businessId: string,
    options?: { skipConflictCheck?: boolean },
  ) => { success: boolean; conflict?: boolean };
  clearCart: () => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, delta: number) => void;

  // Orders
  orders: Order[];
  createOrder: (data: {
    deliveryType: 'DELIVERY' | 'PICKUP';
    addressIndex?: number;
    paymentMethod: 'STRIPE' | 'PAYPAL' | 'CASH_ON_DELIVERY';
    tipCents: number;
    syncCalendar: boolean;
  }) => Promise<{ success: boolean; order?: Order; error?: string }>;
  updateOrderStatus: (orderId: string, newStatus: Order['status'], note?: string, deliveryPin?: string) => void;
  verifyDeliveryPin: (orderId: string, pin: string) => boolean;
  submitBusinessReview: (businessId: string, orderId: string, score: number) => void;

  // Subscriptions
  userSubscription: User['subscriptionPlan'];
  setUserSubscription: (plan: User['subscriptionPlan']) => void;

  // Notifications banner
  notification: { message: string; type: 'success' | 'info' | 'error' } | null;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;

  // Global loading / error simulator
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  pageError: string | null;
  setPageError: (msg: string | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const API_BASE = '/api';

// La versión anterior guardaba en localStorage negocios, productos y zonas de
// demostración. Se limpian una sola vez para que una instalación existente no
// siga mostrando filas que no están en la base de datos. El token de sesión no
// se toca.
const LEGACY_DATA_CACHE_KEYS = [
  'pidetietar_localities',
  'pidetietar_businesses',
  'pidetietar_products',
  'pidetietar_selected_locality',
  'pidetietar_orders',
  'pidetietar_cart',
];
const DATA_CACHE_RESET_KEY = 'pidetietar_seed_cache_cleared_v1';

if (typeof window !== 'undefined') {
  try {
    if (!window.localStorage.getItem(DATA_CACHE_RESET_KEY)) {
      for (const key of LEGACY_DATA_CACHE_KEYS) {
        window.localStorage.removeItem(key);
      }
      window.localStorage.setItem(DATA_CACHE_RESET_KEY, '1');
    }
  } catch {
    // Si el navegador bloquea localStorage, la app sigue funcionando sin caché.
  }
}

const toServerLocality = (item: Partial<Locality> & { postal_code?: string; is_active?: boolean; latitude?: number; longitude?: number; postalCode?: string; active?: boolean; coordinates?: { lat: number; lng: number } }) => ({
  name: item.name || 'Nueva zona',
  postalCode: item.postalCode ?? item.postal_code ?? '00000',
  active: item.active ?? item.is_active ?? true,
  coordinates: item.coordinates || { lat: item.latitude ?? 0, lng: item.longitude ?? 0 },
});

const normalizeLocality = (item: any): Locality => ({
  id: item.id || `loc-${Date.now()}`,
  name: item.name || 'Zona',
  postalCode: item.postalCode ?? item.postal_code ?? '00000',
  coordinates: item.coordinates || { lat: Number(item.latitude ?? 0), lng: Number(item.longitude ?? 0) },
  active: item.active ?? item.is_active ?? true,
  coverImage: item.coverImage || item.cover_image,
});

// `delivery_modes` llega como JSON en texto (SQLite) o como array (MySQL):
// se parsea con cuidado para no romper la app cuando cambia de modo de base
// de datos o el valor viene mal formado.
const parseModeList = (value: unknown, fallback: string[]): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const DEFAULT_SCHEDULE = [
  { dayOfWeek: 1, openTime: '12:00', closeTime: '23:00', isOpen: true },
  { dayOfWeek: 2, openTime: '12:00', closeTime: '23:00', isOpen: true },
  { dayOfWeek: 3, openTime: '12:00', closeTime: '23:00', isOpen: true },
  { dayOfWeek: 4, openTime: '12:00', closeTime: '23:00', isOpen: true },
  { dayOfWeek: 5, openTime: '12:00', closeTime: '00:00', isOpen: true },
  { dayOfWeek: 6, openTime: '12:00', closeTime: '00:00', isOpen: true },
  { dayOfWeek: 0, openTime: '12:00', closeTime: '22:00', isOpen: true },
];

// El horario vive en la tabla `business_hours` (snake_case) y los formularios
// del panel trabajan con camelCase y lunes primero.
const normalizeSchedule = (schedule: any): BusinessHours[] => {
  if (!Array.isArray(schedule) || !schedule.length) return DEFAULT_SCHEDULE;

  const dayOrder = (day: number) => (day === 0 ? 7 : day);

  return schedule
    .map((slot: any): BusinessHours => ({
      dayOfWeek: Number(slot?.dayOfWeek ?? slot?.day_of_week ?? 0),
      openTime: String(slot?.openTime ?? slot?.open_time ?? '12:00'),
      closeTime: String(slot?.closeTime ?? slot?.close_time ?? '23:00'),
      isOpen: Boolean(slot?.isOpen ?? slot?.is_open ?? true),
    }))
    .sort((a, b) => dayOrder(a.dayOfWeek) - dayOrder(b.dayOfWeek));
};

const normalizeBusiness = (item: any): Business => {
  const deliveryModes = parseModeList(
    item.deliveryModes ?? item.delivery_modes,
    ['PLATFORM_COURIER', 'PICKUP'],
  ) as Business['deliveryModes'];

  return {
    id: item.id || `biz-${Date.now()}`,
    name: item.name || 'Negocio',
    legalName: item.legalName ?? item.legal_name ?? item.name ?? 'Negocio',
    cif: item.cif || '00000000A',
    accountNumber: item.accountNumber ?? item.account_number ?? '',
    category: item.category || 'general',
    localityId: item.localityId ?? item.locality_id ?? 'locality-default',
    address: item.address || 'Dirección por definir',
    phone: item.phone || '+34 600 000 000',
    email: item.email || 'contacto@negocio.es',
    coordinates: item.coordinates || { lat: Number(item.latitude ?? 40.2891), lng: Number(item.longitude ?? -4.5824) },
    rating: Number(item.rating ?? 4.5),
    reviewCount: Number(item.reviewCount ?? item.review_count ?? 0),
    estimatedTimeMin: Number(item.estimatedTimeMin ?? item.estimated_time_min ?? 20),
    estimatedTimeMax: Number(item.estimatedTimeMax ?? item.estimated_time_max ?? 40),
    deliveryFeeCents: Number(item.deliveryFeeCents ?? item.delivery_fee_cents ?? 250),
    minOrderCents: Number(item.minOrderCents ?? item.min_order_cents ?? 1000),
    bannerUrl: item.bannerUrl || item.banner_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80',
    logoUrl: item.logoUrl || item.logo_url || 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&auto=format&fit=crop&q=80',
    isShiftOpen: Boolean(item.isShiftOpen ?? item.is_shift_open ?? true),
    // Un negocio antiguo puede tener la lista vacía. El formulario de edición
    // no tiene selector de modos de entrega y el backend rechaza una lista
    // vacía, así que se normaliza a recogida en tienda para poder guardarlo.
    deliveryModes: deliveryModes.length ? deliveryModes : ['PICKUP'],
    deliveryRadiusKm: Number(item.deliveryRadiusKm ?? item.delivery_radius_km ?? 10),
    status: item.status || 'APPROVED',
    schedule: normalizeSchedule(item.schedule),
    featuredProducts: item.featuredProducts || [],
    managerName: item.managerName || item.manager_name || '',
    managerDni: item.managerDni || item.manager_dni || '',
  };
};

// El backend guarda estas listas como texto JSON y las devuelve sin parsear,
// así que un producto leído de la base de datos llegaba con `ingredients`
// como string y el formulario reventaba al intentar hacer .join(', ').
const parseListField = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeProduct = (item: any): Product => ({
  id: item.id || `prod-${Date.now()}`,
  businessId: item.businessId || item.business_id || 'business-default',
  localityId: item.localityId || item.locality_id,
  categoryId: item.categoryId || item.category_id || 'general',
  name: item.name || 'Producto',
  description: item.description || '',
  tag: item.tag || '',
  ingredients: parseListField(item.ingredients),
  priceCents: Number(item.priceCents ?? item.price_cents ?? 0),
  taxPercentage: Number(item.taxPercentage ?? item.tax_percentage ?? 0),
  imageUrl: item.imageUrl || item.image_url || '',
  isAvailable: item.isAvailable ?? item.is_available ?? true,
  isSoldOut: item.isSoldOut ?? item.is_sold_out ?? false,
  removableIngredients: parseListField(item.removableIngredients ?? item.removable_ingredients),
  additionalIngredients: parseListField(item.additionalIngredients ?? item.additional_ingredients),
  optionGroups: item.optionGroups || [],
  allergens: parseListField(item.allergens),
  salesCount: Number(item.salesCount ?? 0),
  rating: Number(item.rating ?? 0),
  ratingCount: Number(item.ratingCount ?? 0),
});

const normalizeCategory = (item: any): BusinessCategory => ({
  id: item.id || `cat-${Date.now()}`,
  name: item.name || 'Categoría',
  slug: item.slug || '',
  iconName: item.iconName ?? item.icon_name ?? 'Utensils',
  imageUrl: item.imageUrl ?? item.image_url ?? '',
});

const toIsoDate = (value: any): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const text = String(value).trim();
  if (!text) return null;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const parsed = new Date(text.replace(' ', 'T') + (hasZone ? '' : 'Z'));
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
};

const normalizeOrderItem = (item: any): Order['items'][number] => ({
  productId: String(item?.productId ?? item?.product_id ?? ''),
  productName: item?.productName ?? item?.product_name ?? 'Producto',
  unitPriceCents: Number(item?.unitPriceCents ?? item?.unit_price_cents ?? 0) || 0,
  taxPercentage: Number(item?.taxPercentage ?? item?.tax_percentage ?? 0) || 0,
  quantity: Number(item?.quantity ?? 1) || 1,
  removedIngredients: parseListField(
    item?.removedIngredients ?? item?.removed_ingredients,
  ).map((entry) => String(entry)),
  selectedOptions: parseListField(
    item?.selectedOptions ?? item?.selected_options,
  ).map((option: any) => ({
    groupName: String(option?.groupName ?? option?.group_name ?? ''),
    optionName: String(option?.optionName ?? option?.option_name ?? ''),
    priceCents: Number(option?.priceCents ?? option?.price_cents ?? 0) || 0,
  })),
  customerNote: item?.customerNote ?? item?.customer_note ?? undefined,
  totalCents: Number(item?.totalCents ?? item?.total_cents ?? 0) || 0,
});

// El backend devuelve los pedidos con la cabecera y las líneas en camelCase,
// pero las bases antiguas pueden tener filas en snake_case. Este normalizador
// deja siempre la misma forma que espera la UI.
const normalizeOrder = (item: any): Order => {
  const createdAt = toIsoDate(item?.createdAt ?? item?.created_at) || new Date(0).toISOString();
  const updatedAt = toIsoDate(item?.updatedAt ?? item?.updated_at) || createdAt;
  const status = (item?.status || 'NEW') as Order['status'];
  const rawHistory = parseListField(item?.statusHistory ?? item?.status_history);
  const statusHistory = rawHistory.length
    ? rawHistory.map((entry: any) => ({
        status: (entry?.status || status) as Order['status'],
        timestamp: toIsoDate(entry?.timestamp ?? entry?.created_at) || createdAt,
        note: entry?.note ?? '',
        changedByRole:
          entry?.changedByRole ?? entry?.changed_by_role ?? 'SISTEMA',
      }))
    : [
        {
          status,
          timestamp: createdAt,
          changedByRole: 'SISTEMA',
          note: 'Estado inicial',
        },
      ];

  const rawAddress = item?.deliveryAddress ?? item?.delivery_address;
  let deliveryAddress: Order['deliveryAddress'];
  if (rawAddress && typeof rawAddress === 'object') {
    deliveryAddress = rawAddress as Order['deliveryAddress'];
  } else if (typeof rawAddress === 'string' && rawAddress.trim()) {
    try {
      const parsed = JSON.parse(rawAddress);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        deliveryAddress = parsed as Order['deliveryAddress'];
      } else {
        deliveryAddress = rawAddress;
      }
    } catch {
      // La dirección es un string plano (no JSON): se usa tal cual.
      deliveryAddress = rawAddress;
    }
  }

  const reviewScore = item?.reviewScore ?? item?.review_score;

  return {
    id: String(item?.id || `ord-${Date.now()}`),
    orderNumber: item?.orderNumber ?? item?.order_number ?? '',
    businessId: item?.businessId ?? item?.business_id ?? '',
    businessName: item?.businessName ?? item?.business_name ?? 'Negocio',
    customerId: item?.customerId ?? item?.customer_id ?? '',
    customerName: item?.customerName ?? item?.customer_name ?? 'Cliente',
    customerPhone: item?.customerPhone ?? item?.customer_phone ?? '',
    customerEmail: item?.customerEmail ?? item?.customer_email ?? '',
    deliveryType:
      (item?.deliveryType ?? item?.delivery_type) === 'PICKUP'
        ? 'PICKUP'
        : 'DELIVERY',
    deliveryAddress,
    scheduledTime: item?.scheduledTime ?? item?.scheduled_time ?? undefined,
    items: parseListField(item?.items).map(normalizeOrderItem),
    subtotalCents: Number(item?.subtotalCents ?? item?.subtotal_cents ?? 0) || 0,
    deliveryFeeCents:
      Number(item?.deliveryFeeCents ?? item?.delivery_fee_cents ?? 0) || 0,
    platformFeeCents:
      Number(item?.platformFeeCents ?? item?.platform_fee_cents ?? 0) || 0,
    businessPayoutCents:
      Number(item?.businessPayoutCents ?? item?.business_payout_cents ?? 0) || 0,
    courierPayoutCents:
      Number(item?.courierPayoutCents ?? item?.courier_payout_cents ?? 0) || 0,
    tipCents: Number(item?.tipCents ?? item?.tip_cents ?? 0) || 0,
    totalCents: Number(item?.totalCents ?? item?.total_cents ?? 0) || 0,
    status,
    statusHistory,
    paymentMethod: (item?.paymentMethod ??
      item?.payment_method ??
      'CASH_ON_DELIVERY') as Order['paymentMethod'],
    paymentStatus: (item?.paymentStatus ??
      item?.payment_status ??
      'PAID') as Order['paymentStatus'],
    paymentTransactionId:
      item?.paymentTransactionId ?? item?.payment_transaction_id ?? undefined,
    courierId: item?.courierId ?? item?.courier_id ?? undefined,
    courierName: item?.courierName ?? item?.courier_name ?? undefined,
    courierPhone: item?.courierPhone ?? item?.courier_phone ?? undefined,
    deliveryPin: String(item?.deliveryPin ?? item?.delivery_pin ?? ''),
    calendarEventId:
      item?.calendarEventId ?? item?.calendar_event_id ?? undefined,
    gmailNotifiedAt:
      toIsoDate(item?.gmailNotifiedAt ?? item?.gmail_notified_at) ?? undefined,
    reviewRequested: Boolean(
      item?.reviewRequested ?? item?.review_requested ?? 0,
    ),
    reviewScore:
      reviewScore === null || reviewScore === undefined
        ? undefined
        : Number(reviewScore),
    reviewedAt:
      toIsoDate(item?.reviewedAt ?? item?.reviewed_at) ?? undefined,
    createdAt,
    updatedAt,
  };
};

// Mezcla los pedidos del servidor con los locales. El servidor manda, salvo
// que el pedido local tenga un cambio optimista más reciente (por ejemplo, un
// estado recién pulsado que aún se está guardando).
const mergeOrderLists = (local: Order[], remote: Order[]): Order[] => {
  const remoteById = new Map(remote.map((order) => [order.id, order]));
  const merged = remote.map((remoteOrder) => {
    const localOrder = local.find((order) => order.id === remoteOrder.id);
    if (!localOrder) return remoteOrder;
    const localUpdated = Date.parse(localOrder.updatedAt || localOrder.createdAt || '') || 0;
    const remoteUpdated = Date.parse(remoteOrder.updatedAt || remoteOrder.createdAt || '') || 0;
    return localUpdated > remoteUpdated + 750 ? localOrder : remoteOrder;
  });

  const now = Date.now();
  local.forEach((localOrder) => {
    if (remoteById.has(localOrder.id)) return;
    const created = Date.parse(localOrder.createdAt || '') || 0;
    // Se conserva unos segundos para que el POST que aún está en vuelo no
    // haga desaparecer el pedido de la pantalla.
    if (now - created < 30000) merged.unshift(localOrder);
  });

  return merged;
};

// La sesión viaja en un token firmado por el backend. Se guarda aquí para que
// cada petición pueda presentarlo en la cabecera Authorization.
const SESSION_TOKEN_KEY = 'pidetietar_token';

export const getSessionToken = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(SESSION_TOKEN_KEY) || '';
};

export const setSessionToken = (token?: string | null): void => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }
};

// `apiFetch` vive fuera del proveedor y no puede usar hooks: el proveedor
// registra aquí qué hacer cuando el backend rechaza el token (401), para
// cerrar la sesión en pantalla con un aviso en rojo en vez de dejar la app
// "a medias" (token borrado pero usuario todavía visible).
let sessionExpiredHandler: (() => void) | null = null;

export const setSessionExpiredHandler = (handler: (() => void) | null): void => {
  sessionExpiredHandler = handler;
};

const apiFetch = async (path: string, options?: RequestInit) => {
  const token = getSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'Error en la petición';
    let errors: Record<string, string> | undefined;
    let code: string | undefined;
    try {
      const payload = await response.json();
      message = payload?.message || payload?.error || message;
      errors = payload?.errors;
      code = payload?.code;
    } catch {
      // ignore parse errors
    }

    // Si la sesión caducó se limpia el token y se avisa a la app para cerrar
    // el usuario en pantalla con un aviso en rojo, en vez de dejar la sesión
    // "a medias" (sin token pero con el usuario todavía visible).
    if (response.status === 401) {
      setSessionToken(null);
      sessionExpiredHandler?.();
    }

    const error = new Error(message) as Error & {
      errors?: Record<string, string>;
      status?: number;
      code?: string;
    };
    error.errors = errors;
    error.status = response.status;
    error.code = code;
    throw error;
  }

  return response.headers.get('content-type')?.includes('application/json') ? response.json() : null;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state fixed to the current dashboard design
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('pidetietar_theme', 'light');
  }, []);

  const toggleDarkMode = () => setIsDarkMode(false);

  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Indica si ya se comprobó el token guardado contra el backend. Hasta que
  // no sea true no se sabe si hay sesión, así la app no muestra el modal de
  // login mientras restaura.
  const [sessionChecked, setSessionChecked] = useState(false);

  // Locality. El servidor es la única fuente: una instalación nueva empieza
  // sin zonas y el superadmin las crea desde su panel.
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [selectedLocality, setSelectedLocality] = useState<Locality | null>(null);

  // Businesses & Products
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  // Catálogo de categorías: lo gestiona el superadmin desde el panel y se
  // guarda en la tabla `categories`. No hay lista estática en el frontend.
  const [categories, setCategories] = useState<BusinessCategory[]>([]);

  useEffect(() => {
    let active = true;

    const loadFromDatabase = async () => {
      // null = la petición falló; se conserva lo que ya hubiera en pantalla.
      // [] = el servidor respondió y no hay filas: se reemplaza por vacío.
      const fetchRows = async (path: string): Promise<any[] | null> => {
        try {
          const data = await apiFetch(path, { cache: 'no-store' });
          return Array.isArray(data) ? data : [];
        } catch {
          return null;
        }
      };

      // /api/orders exige sesión: sin token no se consulta para no provocar
      // un 401 en la portada pública.
      const ordersRequest = getSessionToken()
        ? apiFetch('/orders', { cache: 'no-store' }).catch(() => null)
        : Promise.resolve(null);
      const [localitiesData, businessesData, productsData, categoriesData, ordersData] = await Promise.all([
        fetchRows('/localities'),
        fetchRows('/businesses'),
        fetchRows('/products'),
        fetchRows('/categories'),
        // null = no se pudo consultar o no hay sesión; [] = el servidor no tiene pedidos.
        ordersRequest,
      ]);

      if (!active) return;

      if (localitiesData) {
        const nextLocalities = localitiesData.map(normalizeLocality);
        setLocalities(nextLocalities);
        // Si la zona elegida sigue existiendo se conserva; si no, se elige la
        // primera o se queda en null cuando el catálogo está vacío.
        setSelectedLocality((current) => {
          if (!nextLocalities.length) return null;
          if (!current) return nextLocalities[0];
          return nextLocalities.find((locality) => locality.id === current.id) || nextLocalities[0];
        });
      }
      if (businessesData) {
        setBusinesses(businessesData.map(normalizeBusiness));
      }
      if (productsData) {
        setProducts(productsData.map(normalizeProduct));
      }
      if (categoriesData) {
        setCategories(categoriesData.map(normalizeCategory));
      }
      if (Array.isArray(ordersData)) {
        // A diferencia de las demás entidades, los pedidos sí se reemplazan
        // aunque la lista esté vacía: el servidor es la fuente de verdad y
        // la caché local no debe resucitar pedidos ya borrados.
        const nextOrders = ordersData.map(normalizeOrder);
        setOrders(nextOrders);
        localStorage.setItem('pidetietar_orders', JSON.stringify(nextOrders));
      }
    };

    loadFromDatabase();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleStorageSync = (event: StorageEvent) => {
      if (!event.key) return;

      if (event.key === 'pidetietar_orders') {
        setOrders(event.newValue ? JSON.parse(event.newValue) : []);
      }
      if (event.key === 'pidetietar_cart') {
        setCart(event.newValue ? JSON.parse(event.newValue) : null);
      }
    };

    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  // Cart
  const [cart, setCart] = useState<Cart | null>(() => {
    const saved = localStorage.getItem('pidetietar_cart');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (cart) {
      localStorage.setItem('pidetietar_cart', JSON.stringify(cart));
    } else {
      localStorage.removeItem('pidetietar_cart');
    }
  }, [cart]);

  // Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('pidetietar_orders');
    if (saved) return JSON.parse(saved);
    return [];
  });

  useEffect(() => {
    localStorage.setItem('pidetietar_orders', JSON.stringify(orders));
  }, [orders]);

  // Al cerrar sesión (o si el token guardado ya no vale) no deben quedar en
  // memoria pedidos ni carrito de la sesión anterior.
  useEffect(() => {
    if (!sessionChecked || currentUser) return;
    setOrders([]);
    setCart(null);
    localStorage.removeItem('pidetietar_orders');
    localStorage.removeItem('pidetietar_cart');
  }, [sessionChecked, currentUser]);

  // Sincronización periódica de pedidos: el cliente, el negocio y el
  // repartidor pueden estar en dispositivos distintos. El evento `storage`
  // sólo cubre pestañas del mismo navegador, así que se consulta la API cada
  // pocos segundos y también al recuperar el foco.
  useEffect(() => {
    let active = true;
    let inFlight = false;

    const syncOrders = async () => {
      if (!active || inFlight) return;
      // La API de pedidos exige sesión. Sin token no se consulta (portada pública).
      if (!getSessionToken()) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      inFlight = true;
      try {
        const data = await apiFetch('/orders', { cache: 'no-store' }).catch(() => null);
        if (!active || !Array.isArray(data)) return;
        const remoteOrders = data.map(normalizeOrder);
        setOrders((previous) => mergeOrderLists(previous, remoteOrders));
      } finally {
        inFlight = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void syncOrders();
    }, 4000);

    const handleFocus = () => {
      void syncOrders();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void syncOrders();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    void syncOrders();

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // Al cambiar de usuario se reinicia el ciclo y se sincroniza al instante,
    // sin esperar a los 4 segundos del siguiente intervalo.
  }, [currentUser?.id]);

  // Verification state
  const [verificationSent, setVerificationSent] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [notificationTimeout, setNotificationTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    // Se limpia el temporizador anterior para que un aviso no se oculte antes
    // de tiempo si llegan varios seguidos. Los errores duran más (5 s) para
    // dar tiempo a leer el mensaje.
    if (notificationTimeout) clearTimeout(notificationTimeout);
    setNotificationTimeout(setTimeout(() => setNotification(null), type === 'error' ? 5000 : 3000));
  };

  // Loading & Error simulator states
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [userSubscription, setUserSubscription] = useState<User['subscriptionPlan']>(currentUser?.subscriptionPlan || 'FREE');

  const setCourierProfile = (profile: NonNullable<User['courierProfile']>) => {
    setCurrentUser(prev => prev ? { ...prev, courierProfile: profile } : prev);
  };

  const toggleCourierAvailability = (online = true) => {
    setCurrentUser(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        courierProfile: {
          businessIds: prev.courierProfile?.businessIds || [],
          localityIds: prev.courierProfile?.localityIds || [],
          isOnline: online,
          confirmation: prev.courierProfile?.confirmation || 'PENDING'
        }
      };
    });
    showNotification(online ? 'Repartidor activo y disponible para entregas.' : 'Repartidor marcado como fuera de línea.', 'info');
  };

  // La sesión se construye con los datos reales del backend. No se rellenan
  // direcciones, suscripciones ni perfiles de ejemplo: si el servidor no los
  // envía, quedan vacíos.
  const loginAs = (role: User['role'], customEmail?: string, extraData?: Partial<User>, options?: { silent?: boolean }) => {
    const targetEmail = customEmail || extraData?.email || '';
    const fallbackCourierProfile: NonNullable<User['courierProfile']> = {
      businessIds: [],
      localityIds: [],
      isOnline: false,
      confirmation: 'PENDING',
    };

    const newUser: User = {
      ...extraData,
      id: extraData?.id || `usr-${role.toLowerCase()}`,
      username: extraData?.username || (targetEmail.includes('@') ? targetEmail.split('@')[0] : targetEmail),
      name: extraData?.name || (targetEmail.includes('@') ? targetEmail.split('@')[0] : targetEmail) || role,
      email: targetEmail,
      role: role,
      businessId: extraData?.businessId,
      isEmailVerified: extraData?.isEmailVerified ?? false,
      createdAt: extraData?.createdAt || new Date().toISOString(),
      addresses: extraData?.addresses ?? [],
      subscriptionPlan: extraData?.subscriptionPlan ?? 'FREE',
      subscriptionStatus: extraData?.subscriptionStatus ?? 'active',
      courierProfile: (role === 'PLATFORM_COURIER' || role === 'BUSINESS_COURIER')
        ? (extraData?.courierProfile || fallbackCourierProfile)
        : undefined,
    };

    if (role === 'BUSINESS_ADMIN' || role === 'SUPERADMIN' || role === 'CLIENT') {
      setCart(null);
    }

    setCurrentUser(newUser);
    setUserSubscription(newUser.subscriptionPlan);
    // La restauración de sesión al cargar (silent) no anuncia nada: el usuario
    // no ha iniciado sesión de nuevo, seguía dentro.
    if (!options?.silent) {
      showNotification(`Sesión iniciada como ${newUser.name} (${role})`, 'success');
    }
  };

  const logout = () => {
    setSessionToken(null);
    setCurrentUser(null);
    setOrders([]);
    setCart(null);
    localStorage.removeItem('pidetietar_orders');
    localStorage.removeItem('pidetietar_cart');
    showNotification('Has cerrado la sesión.', 'info');
  };

  // La sesión vive sólo en memoria: si nadie la restaura del token al cargar
  // la app, cada recarga (F5) o cada petición 401 "cerraba" la sesión aunque
  // el token siguiera siendo válido. Al montar se comprueba contra el backend
  // y se reutiliza loginAs (silent) para mantener la misma forma de Usuario
  // que un login normal, sin inventar direcciones ni suscripciones.
  useEffect(() => {
    const restoreSession = async () => {
      if (!getSessionToken()) {
        setSessionChecked(true);
        return;
      }

      try {
        const data = await apiFetch('/auth/me');
        const raw = (data as { user?: any } | null)?.user;
        if (raw) {
          // No se pasan addresses ni subscriptionPlan: el backend no los
          // persiste y loginAs deja los valores neutros por defecto.
          loginAs(
            (raw.role as User['role']) || 'CLIENT',
            raw.email,
            {
              id: String(raw.id),
              username: raw.username,
              name: raw.name,
              email: raw.email,
              phone: raw.phone || '',
              address: raw.address || '',
              dni: raw.dni || '',
              accountNumber: raw.accountNumber || '',
              avatarUrl: raw.avatarUrl || '',
              isEmailVerified: Boolean(raw.isEmailVerified),
              businessId: raw.businessId || undefined,
              courierProfile: raw.courierProfile,
            },
            { silent: true },
          );
        }
      } catch {
        // Token inválido o backend caído: apiFetch ya limpia el token en 401.
      } finally {
        setSessionChecked(true);
      }
    };

    void restoreSession();
  }, []);

  // Un 401 en mitad de una acción significa que el token ya no vale: se cierra
  // el usuario en pantalla con un aviso en rojo. El aviso se omite si no había
  // nadie en sesión (p. ej. el 401 de la propia restauración), así no se
  // spamea al cargar con un token caducado.
  const currentUserRef = useRef<User | null>(null);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (!currentUserRef.current) return;
      currentUserRef.current = null;
      setCurrentUser(null);
      setOrders([]);
      localStorage.removeItem('pidetietar_orders');
      showNotification('Tu sesión ha caducado. Vuelve a iniciar sesión para continuar.', 'error');
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  const updateCurrentUserProfile = async (data: Partial<User>) => {
    if (!currentUser?.id) {
      showNotification('No hay una sesión activa para actualizar.', 'error');
      return false;
    }

    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.fullName = data.name;
    if (data.email !== undefined) payload.email = data.email;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.password !== undefined && String(data.password).trim()) payload.password = data.password;
    if (data.avatarUrl !== undefined) payload.avatarUrl = data.avatarUrl;
    if (data.accountNumber !== undefined) payload.accountNumber = data.accountNumber;

    if (!Object.keys(payload).length) {
      showNotification('No hay cambios para actualizar.', 'info');
      return false;
    }

    try {
      const response = await apiFetch(`/users/${encodeURIComponent(currentUser.id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const updatedUser = response?.user;
      if (!updatedUser) {
        showNotification('No se pudo refrescar el perfil tras guardar.', 'error');
        return false;
      }

      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              id: updatedUser.id ?? prev.id,
              username: updatedUser.username ?? prev.username,
              name: updatedUser.name ?? prev.name,
              email: updatedUser.email ?? prev.email,
              phone: updatedUser.phone ?? prev.phone,
              accountNumber: updatedUser.accountNumber ?? prev.accountNumber,
              avatarUrl: updatedUser.avatarUrl ?? prev.avatarUrl,
            }
          : prev,
      );
      showNotification('Perfil actualizado correctamente.', 'success');
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo actualizar el perfil.';
      showNotification(message, 'error');
      return false;
    }
  };

  const sendGmailVerificationCode = async (): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const response = await apiFetch('/auth/send-verification-email', {
        method: 'POST',
        body: JSON.stringify({ email: currentUser.email, fullName: currentUser.name }),
      });

      setGeneratedCode(response.code || null);
      setVerificationSent(Boolean(response.sent || response.code));

      if (response.sent) {
        showNotification(`Código de 6 dígitos enviado a ${currentUser.email}.`, 'success');
        return true;
      }

      showNotification(`Aviso: código generado para pruebas (${response.code}) porque el SMTP no está configurado.`, 'info');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo enviar el correo de verificación.';
      showNotification(message, 'error');
      return false;
    }
  };

  const verifyEmailWithGmailCode = async (code: string): Promise<boolean> => {
    if (!currentUser || !code.trim()) {
      showNotification('Introduce el código de verificación.', 'error');
      return false;
    }

    try {
      const response = await apiFetch('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: currentUser.email, code: code.trim() }),
      });

      if (response.verified) {
        setCurrentUser(prev => prev ? { ...prev, isEmailVerified: true } : prev);
        setGeneratedCode(null);
        setVerificationSent(false);
        showNotification('¡Correo verificado con éxito! Ya puedes realizar pedidos.', 'success');
        return true;
      }

      showNotification(response.message || 'Código de verificación inválido.', 'error');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo verificar el correo.';
      showNotification(message, 'error');
      return false;
    }
  };

  const addLocality = (data: Partial<Locality>): Locality => {
    // Id provisional: sólo sirve para poder seleccionar la zona en esta sesión
    // mientras el backend responde con el id real.
    const tempId = data.id || `loc-${Date.now()}`;
    const newLocality: Locality = {
      id: tempId,
      name: data.name || 'Nueva zona',
      postalCode: data.postalCode || '00000',
      coordinates: data.coordinates || { lat: 0, lng: 0 },
      active: data.active ?? true,
      coverImage: data.coverImage,
    };

    setLocalities(prev => [...prev, newLocality]);
    void apiFetch('/localities', {
      method: 'POST',
      body: JSON.stringify(toServerLocality(newLocality)),
    })
      .then((response: any) => {
        showNotification(`Zona "${newLocality.name}" añadida.`, 'success');

        const created = response?.locality;
        const serverId = created?.id;
        if (!serverId || serverId === tempId) {
          setSelectedLocality(current => current ?? newLocality);
          return;
        }

        // El backend genera su propio id y antes se descartaba la respuesta:
        // la zona quedaba sólo en el navegador y "Crear comercio" fallaba
        // después con "La zona seleccionada no existe".
        const adopted = normalizeLocality(created);
        setLocalities(prev =>
          prev.map(loc => (loc.id === tempId ? { ...loc, ...adopted, id: serverId } : loc)),
        );
        setSelectedLocality(current => {
          if (!current) return { ...newLocality, ...adopted, id: serverId };
          return current.id === tempId ? { ...current, ...adopted, id: serverId } : current;
        });
      })
      .catch((error) => {
        // Se retira la zona provisional para no mostrar un alta que no ocurrió.
        setLocalities(prev => prev.filter(loc => loc.id !== tempId));
        setSelectedLocality(current => (current?.id === tempId ? null : current));
        showNotification(
          error instanceof Error ? error.message : 'No se pudo guardar la zona en el servidor.',
          'error',
        );
      });
    return newLocality;
  };

  const updateLocality = (localityId: string, data: Partial<Locality>) => {
    const next = { ...data };
    setLocalities(prev => prev.map(loc => (loc.id === localityId ? { ...loc, ...next } : loc)));
    setSelectedLocality(prev => (prev?.id === localityId ? { ...prev, ...next } : prev));

    // Antes sólo se tocaba el estado local: la zona volvía a su valor
    // antiguo al recargar. Ahora se guarda también en el servidor.
    void apiFetch(`/localities/${encodeURIComponent(localityId)}`, {
      method: 'PUT',
      body: JSON.stringify(toServerLocality({ ...next })),
    })
      .then(() => showNotification('Zona actualizada correctamente.', 'success'))
      .catch((error) => showNotification(
        error instanceof Error
          ? error.message
          : 'La zona se mostró modificada pero no se guardó en el servidor.',
        'error',
      ));
  };

  const deleteLocality = (localityId: string) => {
    const stillHasBusinesses = businesses.some(b => b.localityId === localityId);
    if (stillHasBusinesses) {
      showNotification('No puedes eliminar una zona con negocios registrados.', 'error');
      return;
    }

    const removed = localities.find(loc => loc.id === localityId);
    const wasSelected = selectedLocality?.id === localityId;
    const remaining = localities.filter(loc => loc.id !== localityId);

    setLocalities(remaining);
    if (wasSelected) {
      setSelectedLocality(remaining[0] || null);
    }

    void apiFetch(`/localities/${encodeURIComponent(localityId)}`, { method: 'DELETE' })
      .then(() => {
        if (removed) showNotification(`Zona "${removed.name}" eliminada.`, 'success');
      })
      .catch((error) => {
        showNotification(
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar la zona del servidor.',
          'error',
        );
        // Se restaura para no mostrar un borrado que no llegó a producirse.
        if (removed) {
          setLocalities(prev => [...prev, removed]);
          if (wasSelected) setSelectedLocality(removed);
        }
      });
  };

  const refreshCategories = async (): Promise<BusinessCategory[] | null> => {
    try {
      const data = await apiFetch('/categories', { cache: 'no-store' });
      const rows = (Array.isArray(data) ? data : []).map(normalizeCategory);
      setCategories(rows);
      return rows;
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la lista de categorías.',
        'error',
      );
      return null;
    }
  };

  const createCategory = async (
    data: Partial<BusinessCategory>,
  ): Promise<BusinessCategory | null> => {
    try {
      const response = await apiFetch('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name || '',
          slug: data.slug || '',
          icon_name: data.iconName || 'Utensils',
          image_url: data.imageUrl || '',
        }),
      });
      const payload = (response as any)?.category ?? response;
      if (!payload?.id) {
        throw new Error('El servidor no devolvió la categoría creada.');
      }
      const created = normalizeCategory(payload);
      setCategories((previous) => [
        created,
        ...previous.filter((category) => category.id !== created.id),
      ]);
      return created;
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'No se pudo guardar la categoría.',
        'error',
      );
      return null;
    }
  };

  const updateCategory = async (
    categoryId: string,
    data: Partial<BusinessCategory>,
  ): Promise<boolean> => {
    try {
      const response = await apiFetch(`/categories/${encodeURIComponent(categoryId)}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: data.name || '',
          slug: data.slug || '',
          icon_name: data.iconName || 'Utensils',
          image_url: data.imageUrl || '',
        }),
      });
      const payload = (response as any)?.category ?? response;
      if (!payload?.id) {
        throw new Error('El servidor no devolvió la categoría actualizada.');
      }
      const updated = normalizeCategory(payload);
      setCategories((previous) =>
        previous.map((category) =>
          category.id === categoryId ? { ...category, ...updated, id: categoryId } : category,
        ),
      );
      return true;
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'No se pudo actualizar la categoría.',
        'error',
      );
      return false;
    }
  };

  const deleteCategory = async (categoryId: string): Promise<boolean> => {
    try {
      await apiFetch(`/categories/${encodeURIComponent(categoryId)}`, {
        method: 'DELETE',
      });
      setCategories((previous) =>
        previous.filter((category) => category.id !== categoryId),
      );
      return true;
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'No se pudo eliminar la categoría.',
        'error',
      );
      return false;
    }
  };

  // El panel de administración llama a esta función antes de editar, eliminar
  // o asignar negocios a un repartidor: así sólo se trabaja con IDs que el
  // servidor reconoce. La lista del servidor reemplaza siempre a la anterior,
  // incluida una lista vacía.
  const refreshBusinesses = async (): Promise<Business[] | null> => {
    try {
      const data = await apiFetch('/businesses', { cache: 'no-store' });
      const rows = (Array.isArray(data) ? data : []).map(normalizeBusiness);
      setBusinesses(rows);
      return rows;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No se pudo actualizar la lista de negocios.';
      showNotification(message, 'error');
      // null (y no una lista vacía) para que quien llama sepa que la consulta
      // falló y no borre selecciones que quizá sigan siendo válidas.
      return null;
    }
  };

  // El registro de negocios es una operación de plataforma: sólo el superadmin
  // puede hacerla y el backend crea en la misma transacción el negocio, su
  // horario y la cuenta (usuario y clave) del propietario. Si algo falla no se
  // toca el estado local, para que no parezca guardado algo que no lo está.
  const createBusiness = async (
    businessData: Partial<Business>,
    owner?: BusinessOwnerInput | null,
    onFieldErrors?: (errors: Record<string, string>) => void,
  ): Promise<Business | null> => {
    const localityId = businessData.localityId || selectedLocality?.id || '';
    if (!localityId) {
      showNotification('Crea o selecciona una localidad antes de registrar el negocio.', 'error');
      return null;
    }

    const payload = {
      name: businessData.name || '',
      legal_name: businessData.legalName || businessData.name || '',
      cif: businessData.cif || '',
      account_number: businessData.accountNumber || '',
      category: businessData.category || '',
      locality_id: localityId,
      phone: businessData.phone || '',
      email: businessData.email || '',
      address: businessData.address || '',
      manager_name: businessData.managerName || '',
      manager_dni: businessData.managerDni || '',
      banner_url: businessData.bannerUrl || '',
      logo_url: businessData.logoUrl || '',
      latitude: businessData.coordinates?.lat,
      longitude: businessData.coordinates?.lng,
      rating: businessData.rating ?? 4.8,
      review_count: businessData.reviewCount ?? 0,
      estimated_time_min: businessData.estimatedTimeMin ?? 20,
      estimated_time_max: businessData.estimatedTimeMax ?? 40,
      delivery_fee_cents: businessData.deliveryFeeCents ?? 0,
      min_order_cents: businessData.minOrderCents ?? 0,
      delivery_radius_km: businessData.deliveryRadiusKm ?? 5,
      delivery_modes: businessData.deliveryModes || ['PICKUP'],
      is_shift_open: businessData.isShiftOpen ?? true,
      status: businessData.status || 'APPROVED',
      schedule: (businessData.schedule || []).map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        openTime: slot.openTime,
        closeTime: slot.closeTime,
        isOpen: slot.isOpen,
      })),
      owner: owner || undefined,
    };

    try {
      const response = await apiFetch('/businesses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const created = response?.business ? normalizeBusiness(response.business) : null;
      if (!created) {
        throw new Error('El servidor no devolvió el negocio creado.');
      }

      setBusinesses((previous) => [created, ...previous.filter((business) => business.id !== created.id)]);
      showNotification(`Nuevo negocio creado: ${created.name}`, 'success');
      return created;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el negocio';
      // El backend responde con los motivos campo a campo: se pasan al
      // formulario para que no haya que adivinar qué está mal.
      onFieldErrors?.(
        (error as { errors?: Record<string, string> })?.errors || {},
      );
      showNotification(message, 'error');
      return null;
    }
  };

  const updateBusiness = async (
    businessId: string,
    businessData: Partial<Business>,
    owner?: BusinessOwnerInput | null,
    onFieldErrors?: (errors: Record<string, string>) => void,
  ): Promise<boolean> => {
    const target = businesses.find((business) => business.id === businessId);
    if (!target) {
      showNotification('No se encontró el negocio que intentas editar.', 'error');
      return false;
    }

    const updatedBusiness: Business = { ...target, ...businessData };

    try {
      const response = await apiFetch(`/businesses/${businessId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: updatedBusiness.name,
          legal_name: updatedBusiness.legalName,
          cif: updatedBusiness.cif,
          phone: updatedBusiness.phone,
          email: updatedBusiness.email,
          account_number: updatedBusiness.accountNumber || '',
          address: updatedBusiness.address,
          locality_id: updatedBusiness.localityId,
          category: updatedBusiness.category,
          manager_name: updatedBusiness.managerName || '',
          manager_dni: updatedBusiness.managerDni || '',
          banner_url: updatedBusiness.bannerUrl || '',
          logo_url: updatedBusiness.logoUrl || '',
          latitude: updatedBusiness.coordinates?.lat,
          longitude: updatedBusiness.coordinates?.lng,
          rating: updatedBusiness.rating,
          review_count: updatedBusiness.reviewCount ?? 0,
          estimated_time_min: updatedBusiness.estimatedTimeMin,
          estimated_time_max: updatedBusiness.estimatedTimeMax,
          delivery_fee_cents: updatedBusiness.deliveryFeeCents,
          min_order_cents: updatedBusiness.minOrderCents,
          delivery_radius_km: updatedBusiness.deliveryRadiusKm,
          delivery_modes: updatedBusiness.deliveryModes,
          is_shift_open: updatedBusiness.isShiftOpen,
          status: updatedBusiness.status,
          schedule: (updatedBusiness.schedule || []).map((slot) => ({
            dayOfWeek: slot.dayOfWeek,
            openTime: slot.openTime,
            closeTime: slot.closeTime,
            isOpen: slot.isOpen,
          })),
          // Sólo llega si el superadmin rellena las credenciales: el backend
          // crea o actualiza la cuenta del propietario dentro de la misma
          // transacción.
          owner: owner || undefined,
        }),
      });

      // El servidor devuelve el negocio tal y como quedó guardado (incluida la
      // cuenta del propietario). Se usa esa copia para que la tabla no muestre
      // valores que el backend haya normalizado o descartado.
      const saved = response?.business
        ? normalizeBusiness(response.business)
        : updatedBusiness;

      setBusinesses((previous) =>
        previous.map((business) =>
          business.id === businessId ? saved : business,
        ),
      );
      showNotification(`Negocio actualizado: ${saved.name}`, 'success');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el negocio';
      if ((error as { status?: number })?.status === 404) {
        // La fila venía de la caché y ya no existe en el servidor. Se quita
        // para que no se vuelva a intentar editar algo fantasma.
        setBusinesses((previous) =>
          previous.filter((business) => business.id !== businessId),
        );
        showNotification(
          'Ese negocio ya no existe en el servidor. Se ha quitado de la lista.',
          'error',
        );
        return false;
      }
      onFieldErrors?.(
        (error as { errors?: Record<string, string> })?.errors || {},
      );
      showNotification(message, 'error');
      return false;
    }
  };

  const deleteBusiness = async (businessId: string): Promise<boolean> => {
    const target = businesses.find((business) => business.id === businessId);
    if (!target) {
      showNotification('No se encontró el negocio que intentas eliminar.', 'error');
      return false;
    }

    try {
      await apiFetch(`/businesses/${businessId}`, { method: 'DELETE' });
      setBusinesses((previous) => previous.filter((business) => business.id !== businessId));
      showNotification(`Negocio eliminado: ${target.name}`, 'success');
      return true;
    } catch (error) {
      if ((error as { status?: number })?.status === 404) {
        setBusinesses((previous) =>
          previous.filter((business) => business.id !== businessId),
        );
        showNotification(
          'Ese negocio ya no existe en el servidor. Se ha quitado de la lista.',
          'error',
        );
        return false;
      }
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el negocio';
      showNotification(message, 'error');
      return false;
    }
  };

  const createUserAccount = async (
    data: {
      username: string;
      fullName: string;
      email: string;
      password: string;
      phone?: string;
      address?: string;
      dni?: string;
      role: User['role'];
      businessId?: string;
      courierBusinessIds?: string[];
      accountNumber?: string;
      courierConfirmation?: NonNullable<User['courierProfile']>['confirmation'];
    },
    onFieldErrors?: (errors: Record<string, string>) => void,
  ): Promise<boolean> => {
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          username: data.username,
          fullName: data.fullName,
          email: data.email,
          password: data.password,
          phone: data.phone,
          address: data.address,
          dni: data.dni,
          role: data.role,
          businessId: data.businessId,
          courierBusinessIds: data.courierBusinessIds,
          accountNumber: data.accountNumber,
          courierConfirmation: data.courierConfirmation,
        }),
      });
      showNotification('Cuenta creada correctamente.', 'success');
      return true;
    } catch (error) {
      const serverErrors =
        (error as { errors?: Record<string, string> })?.errors || {};
      onFieldErrors?.(serverErrors);

      // Si el backend detalla qué campo falla, se muestra ese motivo en vez
      // del aviso genérico "revisa el formulario".
      const firstServerError = Object.values(serverErrors).find(Boolean);
      const message = firstServerError
        || (error instanceof Error ? error.message : 'No se pudo crear el usuario');
      showNotification(message, 'error');
      return false;
    }
  };

  // Lista las cuentas de repartidor visibles para quien consulta: el
  // superadmin recibe todas y el dueño del negocio sólo las suyas (el filtro
  // real lo aplica el backend).
  const listCouriers = async (): Promise<User[]> => {
    try {
      const data = await apiFetch('/users');
      const rows = Array.isArray(data) ? data : [];

      return rows
        .filter(
          (row: any) =>
            row?.role === 'PLATFORM_COURIER' ||
            row?.role === 'BUSINESS_COURIER',
        )
        .map(
          (row: any): User => ({
            id: String(row.id),
            username: row.username || '',
            name: row.name || 'Repartidor',
            email: row.email || '',
            phone: row.phone || '',
            address: row.address || '',
            dni: row.dni || '',
            role: row.role,
            businessId: row.businessId || undefined,
            accountNumber: row.accountNumber || '',
            isEmailVerified: Boolean(row.isEmailVerified),
            addresses: [],
            createdAt: row.createdAt || new Date().toISOString(),
            avatarUrl: row.avatarUrl || '',
            courierProfile: row.courierProfile,
          }),
        );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar los repartidores';
      showNotification(message, 'error');
      return [];
    }
  };

  const setCourierConfirmation = async (
    userId: string,
    confirmation: NonNullable<User['courierProfile']>['confirmation'],
  ): Promise<boolean> => {
    try {
      await apiFetch(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ courierConfirmation: confirmation }),
      });
      showNotification(
        confirmation === 'PENDING'
          ? 'Confirmación del repartidor retirada.'
          : 'Repartidor confirmado. Ya puede acceder a su panel.',
        'success',
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo confirmar al repartidor';
      showNotification(message, 'error');
      return false;
    }
  };

  // Edita los datos de contacto, los negocios asignados y la cuenta bancaria
  // de un repartidor. El backend restringe la cuenta bancaria al superadmin.
  const updateCourierDetails = async (
    userId: string,
    data: {
      courierBusinessIds: string[];
      phone?: string;
      address?: string;
      dni?: string;
      accountNumber?: string;
    },
    onFieldErrors?: (errors: Record<string, string>) => void,
  ): Promise<boolean> => {
    try {
      await apiFetch(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({
          courierBusinessIds: data.courierBusinessIds,
          phone: data.phone ?? '',
          address: data.address ?? '',
          dni: data.dni ?? '',
          accountNumber: data.accountNumber ?? '',
        }),
      });
      showNotification('Repartidor actualizado correctamente.', 'success');
      return true;
    } catch (error) {
      const serverErrors =
        (error as { errors?: Record<string, string> })?.errors || {};
      onFieldErrors?.(serverErrors);
      const firstServerError = Object.values(serverErrors).find(Boolean);
      const message = firstServerError
        || (error instanceof Error ? error.message : 'No se pudo actualizar el repartidor');
      showNotification(message, 'error');
      return false;
    }
  };

  const updateBusinessShift = (businessId: string, isOpen: boolean) => {
    const previous = businesses.find(b => b.id === businessId)?.isShiftOpen;
    setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, isShiftOpen: isOpen } : b));

    // El turno sólo vivía en el navegador: al recargar volvía al valor
    // guardado. Ahora se guarda en el servidor (PUT parcial con is_shift_open).
    void apiFetch(`/businesses/${encodeURIComponent(businessId)}`, {
      method: 'PUT',
      body: JSON.stringify({ is_shift_open: Number(isOpen) }),
    })
      .then(() => showNotification(`Turno ${isOpen ? 'ABIERTO y aceptando pedidos' : 'CERRADO'} para el comercio.`, 'success'))
      .catch((error) => {
        // Se revierte para no mostrar un turno que no llegó a guardarse.
        if (previous !== undefined) {
          setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, isShiftOpen: previous } : b));
        }
        showNotification(
          error instanceof Error ? error.message : 'No se pudo guardar el turno en el servidor.',
          'error',
        );
      });
  };

  const addProductToBusiness = (businessId: string, product: Omit<Product, 'id' | 'businessId'>): Product => {
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      businessId,
      isAvailable: product.isAvailable ?? true,
      salesCount: product.salesCount ?? 0,
      allergens: product.allergens ?? []
    };

    setProducts((prev: Product[]) => [newProduct, ...prev]);
    void apiFetch('/products', {
      method: 'POST',
      body: JSON.stringify({
        ...newProduct,
        business_id: newProduct.businessId,
        category_id: newProduct.categoryId,
        price_cents: newProduct.priceCents,
        tax_percentage: newProduct.taxPercentage,
        image_url: newProduct.imageUrl,
        is_available: newProduct.isAvailable,
        is_sold_out: newProduct.isSoldOut,
        removable_ingredients: newProduct.removableIngredients,
        additional_ingredients: newProduct.additionalIngredients,
      }),
    })
      .then(() => {
        showNotification(`Producto añadido a la carta: ${newProduct.name}`, 'success');
      })
      .catch((error) => {
        // Se quita de la lista para no mostrar un producto que no se guardó.
        setProducts((prev: Product[]) => prev.filter((p: Product) => p.id !== newProduct.id));
        showNotification(
          error instanceof Error ? error.message : 'No se pudo guardar el producto en el servidor.',
          'error',
        );
      });
    return newProduct;
  };

  const updateProductInBusiness = (productId: string, product: Partial<Product>): Product | null => {
    const currentProduct = products.find((p: Product) => p.id === productId);
    if (!currentProduct) return null;

    const updatedProduct: Product = { ...currentProduct, ...product };
    setProducts((prev: Product[]) => prev.map((p: Product) => p.id === productId ? updatedProduct : p));

    // Antes sólo se cambiaba el estado local: al recargar la app la edición
    // desaparecía. Ahora se guarda también en el servidor.
    void apiFetch(`/products/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: updatedProduct.name,
        description: updatedProduct.description,
        tag: updatedProduct.tag,
        category_id: updatedProduct.categoryId,
        price_cents: updatedProduct.priceCents,
        tax_percentage: updatedProduct.taxPercentage,
        image_url: updatedProduct.imageUrl,
        is_available: updatedProduct.isAvailable,
        is_sold_out: updatedProduct.isSoldOut,
        ingredients: updatedProduct.ingredients,
        allergens: updatedProduct.allergens,
        removable_ingredients: updatedProduct.removableIngredients,
        additional_ingredients: updatedProduct.additionalIngredients,
      }),
    })
      .then(() => showNotification(`Producto actualizado: ${updatedProduct.name}`, 'success'))
      .catch((error) => showNotification(
        error instanceof Error
          ? error.message
          : 'La edición se mostró en pantalla pero no se guardó en el servidor.',
        'error',
      ));

    return updatedProduct;
  };

  const deleteProductFromBusiness = (productId: string) => {
    const target = products.find((p: Product) => p.id === productId);
    setProducts((prev: Product[]) => prev.filter((p: Product) => p.id !== productId));

    void apiFetch(`/products/${encodeURIComponent(productId)}`, { method: 'DELETE' })
      .then(() => {
        if (target) showNotification(`Se eliminó ${target.name} del catálogo`, 'success');
      })
      .catch((error) => {
        showNotification(
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar el producto del servidor.',
          'error',
        );
        // Se devuelve a la lista para no mostrar un borrado que no ocurrió.
        if (target) setProducts((prev: Product[]) => [...prev, target]);
      });
  };

  const addToCart = (
    item: Omit<CartItem, 'cartItemId'>,
    businessId: string,
    options?: { skipConflictCheck?: boolean },
  ) => {
    if (item.product.businessId && item.product.businessId !== businessId) {
      return { success: false, conflict: true };
    }

    // Check single business constraint. Se puede omitir cuando el usuario acaba
    // de confirmar que quiere vaciar la cesta para añadir este producto.
    if (!options?.skipConflictCheck && cart && cart.businessId !== businessId && cart.items.length > 0) {
      return { success: false, conflict: true };
    }

    const newItem: CartItem = {
      ...item,
      cartItemId: 'ci_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
    };

    if (!cart || cart.businessId !== businessId) {
      setCart({
        businessId,
        items: [newItem]
      });
    } else {
      setCart({
        ...cart,
        items: [...cart.items, newItem]
      });
    }

    showNotification(`"${item.product.name}" añadido a la cesta`, 'success');
    return { success: true };
  };

  const clearCart = () => {
    setCart(null);
  };

  const removeFromCart = (cartItemId: string) => {
    if (!cart) return;
    const filtered = cart.items.filter(i => i.cartItemId !== cartItemId);
    if (filtered.length === 0) {
      setCart(null);
    } else {
      setCart({ ...cart, items: filtered });
    }
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    if (!cart) return;
    const updated = cart.items.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[];

    if (updated.length === 0) {
      setCart(null);
    } else {
      setCart({ ...cart, items: updated });
    }
  };

  const buildOrderItemSnapshot = (
    product: Product,
    quantity: number,
    removedIngredients: string[] = [],
    selectedOptions: CartItemOptionSelected[] = [],
    customerNote?: string,
    unitPriceCents?: number,
  ) => ({
    productId: product.id,
    productName: product.name,
    unitPriceCents: unitPriceCents ?? product.priceCents,
    taxPercentage: product.taxPercentage,
    quantity,
    removedIngredients,
    selectedOptions,
    customerNote,
    totalCents: (unitPriceCents ?? product.priceCents) * quantity,
  });

  const createOrder = async (data: {
    deliveryType: 'DELIVERY' | 'PICKUP';
    addressIndex?: number;
    paymentMethod: 'STRIPE' | 'PAYPAL' | 'CASH_ON_DELIVERY';
    tipCents: number;
    syncCalendar: boolean;
  }): Promise<{ success: boolean; order?: Order; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Debes iniciar sesión para pedir' };
    if (!cart || cart.items.length === 0) return { success: false, error: 'La cesta está vacía' };

    const business = businesses.find(b => b.id === cart.businessId);
    if (!business) return { success: false, error: 'Comercio no encontrado' };
    if (!business.isShiftOpen) return { success: false, error: 'El comercio tiene el turno cerrado en este momento' };

    const mixedBusinessItems = cart.items.some(item => item.product.businessId && item.product.businessId !== business.id);
    if (mixedBusinessItems || !isSingleBusinessOrder(business.id, cart.items.map(item => ({ product: { businessId: item.product.businessId } })))) {
      return { success: false, error: 'Cada ticket de pedido solo puede pertenecer a un único negocio.' };
    }

    const cleanedPhone = (currentUser.phone || '').trim();
    if (!cleanedPhone) {
      return { success: false, error: 'Necesitamos un teléfono para confirmar el pedido.' };
    }

    if (data.deliveryType === 'DELIVERY') {
      const selectedAddress = currentUser.addresses[data.addressIndex || 0];
      if (!selectedAddress || !selectedAddress.street.trim()) {
        return { success: false, error: 'Selecciona o añade una dirección de entrega antes de confirmar.' };
      }
    }

    const subtotalCents = cart.items.reduce((acc, i) => acc + i.itemPriceCents * i.quantity, 0);
    const hasFreeDelivery = currentUser.subscriptionPlan === 'PRO_MONTHLY' && subtotalCents >= 1200;
    const effectiveDeliveryFee = (data.deliveryType === 'PICKUP' || hasFreeDelivery) ? 0 : business.deliveryFeeCents;

    // Minimum order check
    if (subtotalCents < business.minOrderCents) {
      return { success: false, error: `El pedido mínimo para este local es de ${(business.minOrderCents / 100).toFixed(2)}€` };
    }

    const platformProductFee = Math.round(subtotalCents * 0.05);
    const platformDeliveryFee = Math.round(effectiveDeliveryFee * 0.20);
    const totalPlatformFee = platformProductFee + platformDeliveryFee;
    const businessPayout = subtotalCents - platformProductFee;
    const courierPayout = effectiveDeliveryFee - platformDeliveryFee;
    const totalCents = subtotalCents + effectiveDeliveryFee + data.tipCents;

    // Process payment verification if Stripe or PayPal
    let transactionId: string | undefined = undefined;
    if (data.paymentMethod === 'STRIPE' || data.paymentMethod === 'PAYPAL') {
      const payResult = await processPayment(totalCents, data.paymentMethod, {
        orderNumber: 'PT-' + Math.floor(1000 + Math.random() * 9000),
        customerEmail: currentUser.email
      });
      if (!payResult.success) {
        return { success: false, error: 'El pago no pudo ser autenticado por el proveedor' };
      }
      transactionId = payResult.transactionId;
    }

    const orderNum = 'PT-' + Math.floor(1000 + Math.random() * 9000);
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const selectedAddr = data.deliveryType === 'DELIVERY' 
      ? currentUser.address || undefined
      : undefined;

    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      orderNumber: orderNum,
      businessId: business.id,
      businessName: business.name,
      customerId: currentUser.id,
      customerName: currentUser.name,
      customerPhone: cleanedPhone || '+34 600 000 000',
      customerEmail: currentUser.email,
      deliveryType: data.deliveryType,
      deliveryAddress: selectedAddr,
      scheduledTime: 'Lo antes posible',
      items: cart.items.map(item => buildOrderItemSnapshot(
        item.product,
        item.quantity,
        item.removedIngredients,
        item.selectedOptions,
        item.customerNote,
        item.itemPriceCents,
      )),
      subtotalCents,
      deliveryFeeCents: effectiveDeliveryFee,
      platformFeeCents: totalPlatformFee,
      businessPayoutCents: businessPayout,
      courierPayoutCents: courierPayout,
      tipCents: data.tipCents,
      totalCents,
      status: data.deliveryType === 'PICKUP' ? 'NEW' : 'PAID',
      statusHistory: [
        { status: data.deliveryType === 'PICKUP' ? 'NEW' : 'PAID', timestamp: new Date().toISOString(), changedByRole: 'CLIENTE', note: data.deliveryType === 'PICKUP' ? 'Pedido creado para recogida en local' : 'Pago completado con éxito' }
      ],
      paymentMethod: data.paymentMethod,
      paymentStatus: data.deliveryType === 'PICKUP' ? 'PENDING' : 'PAID',
      paymentTransactionId: transactionId,
      deliveryPin: pin,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Google Calendar auto-scheduling
    if (data.syncCalendar) {
      const calRes = await scheduleOrderInGoogleCalendar({
        orderNumber: newOrder.orderNumber,
        businessName: newOrder.businessName,
        customerName: newOrder.customerName,
        customerEmail: newOrder.customerEmail,
        deliveryType: newOrder.deliveryType,
        deliveryAddress: newOrder.deliveryAddress,
        totalCents: newOrder.totalCents
      });
      if (calRes.success) {
        newOrder.calendarEventId = calRes.eventLink;
      }
    }

    // Gmail notification dispatch
    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1A0600; max-width: 600px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #FF4E00;">¡Gracias por tu pedido en PideTiétar!</h2>
        <p>Número de pedido: <strong>${newOrder.orderNumber}</strong></p>
        <p>Establecimiento: <strong>${newOrder.businessName}</strong></p>
        <p>PIN de Entrega seguro para el repartidor: <strong style="font-size: 20px; color: #A32300; background: #fff1e8; padding: 4px 10px; border-radius: 4px;">${newOrder.deliveryPin}</strong></p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p><strong>Total pagado:</strong> ${(newOrder.totalCents / 100).toFixed(2)}€ (${newOrder.paymentMethod})</p>
        <p style="font-size: 13px; color: #555;">Puedes seguir el estado en tiempo real desde la aplicación.</p>
      </div>
    `;

    sendEmailViaGmail({
      recipientEmail: newOrder.customerEmail,
      subject: `Confirmación de pedido ${newOrder.orderNumber} - PideTiétar`,
      bodyText: `Tu pedido ${newOrder.orderNumber} ha sido recibido por ${newOrder.businessName}. Tu PIN de entrega es ${newOrder.deliveryPin}`,
      htmlContent: emailBody
    }).catch(console.error);

    setOrders(prev => [newOrder, ...prev]);

    // El POST se espera antes de limpiar el carrito: si el backend rechaza el
    // pedido, no se borra la cesta (el usuario puede reintentar) y se avisa
    // en rojo con el mensaje real del servidor.
    try {
      await apiFetch('/orders', {
        method: 'POST',
        // Se envía el pedido completo (cabecera + líneas + historial) para que
        // el servidor pueda reconstruirlo tal cual en las tres vistas.
        body: JSON.stringify(newOrder),
      });
    } catch (error) {
      setOrders(prev => prev.filter(ord => ord.id !== newOrder.id));
      const message = error instanceof Error
        ? error.message
        : 'No se pudo guardar el pedido en el servidor.';
      showNotification(message, 'error');
      return { success: false, error: message };
    }

    clearCart();
    showNotification(`¡Pedido ${newOrder.orderNumber} confirmado con éxito!`, 'success');

    return { success: true, order: newOrder };
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status'], note?: string, deliveryPin?: string) => {
    const previousOrder = orders.find(ord => ord.id === orderId);
    const changedAt = new Date().toISOString();
    const historyEntry: Order['statusHistory'][number] = {
      status: newStatus,
      timestamp: changedAt,
      changedByRole: currentUser?.role || 'SISTEMA',
      note,
    };
    const nextHistory = previousOrder
      ? [...(previousOrder.statusHistory || []), historyEntry]
      : undefined;

    setOrders(prev => prev.map(ord => {
      if (ord.id !== orderId) return ord;
      return {
        ...ord,
        status: newStatus,
        reviewRequested: newStatus === 'DELIVERED' ? true : ord.reviewRequested,
        updatedAt: changedAt,
        statusHistory: [...(ord.statusHistory || []), historyEntry],
      };
    }));

    // El cambio de estado se guarda en el servidor para que el negocio, el
    // cliente y el repartidor lo vean desde cualquier dispositivo. Se envía el
    // historial completo para conservar la misma línea temporal en todos.
    const payload: Record<string, unknown> = {
      status: newStatus,
      updated_at: changedAt,
      note,
      changed_by_role: currentUser?.role || 'SISTEMA',
    };
    if (deliveryPin) payload.deliveryPin = deliveryPin;
    if (nextHistory) payload.status_history = nextHistory;
    if (newStatus === 'DELIVERED') payload.review_requested = true;

    void apiFetch(`/orders/${encodeURIComponent(orderId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
      .then(() => {
        if (newStatus === 'DELIVERED') {
          showNotification('Pedido entregado. Ayúdanos a valorar la experiencia del local.', 'success');
        } else {
          showNotification(`Estado de pedido actualizado a: ${newStatus}`, 'success');
        }
      })
      .catch((error) => {
        // Se restaura el pedido anterior para no mostrar un cambio que no se
        // llegó a guardar.
        if (previousOrder) {
          setOrders(prev => prev.map(ord => (ord.id === orderId ? previousOrder : ord)));
        }
        showNotification(
          error instanceof Error
            ? error.message
            : 'No se pudo guardar el estado del pedido en el servidor.',
          'error',
        );
      });
  };

  const submitBusinessReview = (businessId: string, orderId: string, score: number) => {
    const safeScore = Math.min(5, Math.max(1, Number(score) || 5));
    const targetBusiness = businesses.find((business) => business.id === businessId);

    if (!targetBusiness) {
      return;
    }

    const nextReviewCount = targetBusiness.reviewCount + 1;
    const nextAverage = Number(((targetBusiness.rating * targetBusiness.reviewCount + safeScore) / nextReviewCount).toFixed(1));

    setBusinesses((previous) =>
      previous.map((business) =>
        business.id === businessId
          ? {
              ...business,
              rating: nextAverage,
              reviewCount: nextReviewCount,
            }
          : business,
      ),
    );

    const reviewedAt = new Date().toISOString();
    setOrders((previous) =>
      previous.map((order) =>
        order.id === orderId
          ? {
              ...order,
              reviewRequested: false,
              reviewScore: safeScore,
              reviewedAt,
            }
          : order,
      ),
    );

    // La valoración también se guarda para que no vuelva a pedirse al recargar.
    void apiFetch(`/orders/${encodeURIComponent(orderId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        review_requested: false,
        review_score: safeScore,
        reviewed_at: reviewedAt,
      }),
    }).catch(() => {
      // La valoración ya se ve en pantalla; si falla el guardado se reintentará
      // en la siguiente valoración o al recargar la lista de pedidos.
    });

    showNotification(`Gracias por valorar a ${targetBusiness.name} con ${safeScore} estrellas.`, 'success');
  };

  const toggleProductAvailability = (productId: string) => {
    const target = products.find((p: Product) => p.id === productId);
    if (!target) return;

    const previousState = target.isAvailable;
    const nextState = !target.isAvailable;
    setProducts((prev: Product[]) => prev.map((p: Product) =>
      p.id === productId ? { ...p, isAvailable: nextState } : p,
    ));

    void apiFetch(`/products/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      body: JSON.stringify({ is_available: nextState }),
    })
      .then(() => {
        showNotification(`${target.name}: ${nextState ? 'Disponible' : 'Agotado en cocina'}`, 'success');
      })
      .catch((error) => {
        // Se revierte para no mostrar un cambio de disponibilidad que no se
        // llegó a guardar.
        setProducts((prev: Product[]) => prev.map((p: Product) =>
          p.id === productId ? { ...p, isAvailable: previousState } : p,
        ));
        showNotification(
          error instanceof Error
            ? error.message
            : 'No se pudo guardar el cambio de disponibilidad en el servidor.',
          'error',
        );
      });
  };

  const createManualOrder = (orderData: Partial<Order>): Order => {
    const orderNum = 'PT-' + Math.floor(1000 + Math.random() * 9000);
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      orderNumber: orderNum,
      businessId: orderData.businessId || '',
      businessName: orderData.businessName || '',
      customerId: 'usr-manual',
      customerName: orderData.customerName || 'Cliente en Barra / Mesa',
      customerPhone: orderData.customerPhone || '',
      customerEmail: orderData.customerEmail || '',
      deliveryType: orderData.deliveryType || 'PICKUP',
      deliveryAddress: orderData.deliveryAddress,
      scheduledTime: 'Inmediato (Comanda Mesa/Barra)',
      items: (orderData.items || []).map((item) => ({
        ...item,
        productName: item.productName || 'Producto',
        unitPriceCents: item.unitPriceCents || 0,
        totalCents: item.totalCents || item.unitPriceCents * item.quantity,
      })),
      subtotalCents: orderData.subtotalCents || 0,
      deliveryFeeCents: orderData.deliveryFeeCents || 0,
      platformFeeCents: 0,
      businessPayoutCents: orderData.subtotalCents || 0,
      courierPayoutCents: 0,
      tipCents: 0,
      totalCents: orderData.totalCents || orderData.subtotalCents || 0,
      paymentMethod: orderData.paymentMethod || 'CASH_ON_DELIVERY',
      paymentStatus: 'PAID',
      status: 'NEW',
      deliveryPin: pin,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [
        {
          status: 'NEW',
          timestamp: new Date().toISOString(),
          changedByRole: 'BUSINESS_ADMIN',
          note: 'Comanda manual creada en cocina / KDS'
        }
      ]
    };

    setOrders(prev => [newOrder, ...prev]);

    // Antes la comanda sólo vivía en el navegador y desaparecía al recargar.
    // Ahora se guarda completa (cabecera + líneas + historial) en el servidor.
    void apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify(newOrder),
    })
      .then(() => {
        showNotification(`Nueva comanda #${newOrder.orderNumber} creada en cocina`, 'success');
      })
      .catch((error) => {
        // Se retira la comanda para no mostrar un alta que no se guardó.
        setOrders(prev => prev.filter(ord => ord.id !== newOrder.id));
        showNotification(
          error instanceof Error ? error.message : 'No se pudo guardar la comanda en el servidor.',
          'error',
        );
      });
    return newOrder;
  };

  const verifyDeliveryPin = (orderId: string, pin: string): boolean => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return false;
    if (target.deliveryPin.trim() === pin.trim()) {
      updateOrderStatus(orderId, 'DELIVERED', 'Entrega verificada mediante PIN de cliente');
      return true;
    }
    return false;
  };

  return (
    <AppContext.Provider value={{
      isDarkMode,
      toggleDarkMode,
      currentUser,
      sessionChecked,
      loginAs,
      logout,
      setCourierProfile,
      toggleCourierAvailability,
      verifyEmailWithGmailCode,
      sendGmailVerificationCode,
      verificationSent,
      generatedCode,
      selectedLocality,
      setSelectedLocality,
      localities,
      addLocality,
      updateLocality,
      deleteLocality,
      businesses,
      products,
      categories,
      refreshCategories,
      createCategory,
      updateCategory,
      deleteCategory,
      refreshBusinesses,
      createBusiness,
      updateBusiness,
      deleteBusiness,
      createUserAccount,
      listCouriers,
      setCourierConfirmation,
      updateCourierDetails,
      addProductToBusiness,
      updateProductInBusiness,
      deleteProductFromBusiness,
      updateBusinessShift,
      toggleProductAvailability,
      createManualOrder,
      cart,
      addToCart,
      clearCart,
      removeFromCart,
      updateCartQuantity,
      orders,
      createOrder,
      updateOrderStatus,
      verifyDeliveryPin,
      submitBusinessReview,
      updateCurrentUserProfile,
      userSubscription,
      setUserSubscription,
      notification,
      showNotification,
      isLoading,
      setIsLoading,
      pageError,
      setPageError
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
