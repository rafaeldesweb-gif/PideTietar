import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Cart, CartItem, Order, Business, Locality, Product, CartItemOptionSelected } from '../types';
import { INITIAL_BUSINESSES, LOCALITIES, INITIAL_PRODUCTS } from '../data/mockData';
import { scheduleOrderInGoogleCalendar, sendEmailViaGmail } from '../services/googleWorkspace';
import { processPayment } from '../services/paymentService';
import { isSingleBusinessOrder } from '../utils/orderValidation';

interface AppContextType {
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Auth & User
  currentUser: User | null;
  loginAs: (role: User['role'], customEmail?: string, extraData?: Partial<User>) => void;
  logout: () => void;
  updateCurrentUserProfile: (data: Partial<User>) => void;
  setCourierProfile: (profile: NonNullable<User['courierProfile']>) => void;
  toggleCourierAvailability: (online?: boolean) => void;
  verifyEmailWithGmailCode: (code: string) => Promise<boolean>;
  sendGmailVerificationCode: () => Promise<boolean>;
  verificationSent: boolean;
  generatedCode: string | null;

  // Active locality
  selectedLocality: Locality;
  setSelectedLocality: (loc: Locality) => void;
  localities: Locality[];
  addLocality: (data: Partial<Locality>) => Locality;
  updateLocality: (localityId: string, data: Partial<Locality>) => void;
  deleteLocality: (localityId: string) => void;

  // Businesses & Catalog
  businesses: Business[];
  products: typeof INITIAL_PRODUCTS;
  createBusiness: (businessData: Partial<Business>) => Business;
  addProductToBusiness: (businessId: string, product: Omit<Product, 'id' | 'businessId'>) => Product;
  updateProductInBusiness: (productId: string, product: Partial<Product>) => Product | null;
  deleteProductFromBusiness: (productId: string) => void;
  updateBusinessShift: (businessId: string, isOpen: boolean) => void;
  toggleProductAvailability: (productId: string) => void;
  createManualOrder: (orderData: Partial<Order>) => Order;

  // Cart
  cart: Cart | null;
  addToCart: (item: Omit<CartItem, 'cartItemId'>, businessId: string) => { success: boolean; conflict?: boolean };
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
  updateOrderStatus: (orderId: string, newStatus: Order['status'], note?: string) => void;
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

  // Locality
  const [localities, setLocalities] = useState<Locality[]>(LOCALITIES);
  const [selectedLocality, setSelectedLocality] = useState<Locality>(LOCALITIES[0]);

  // Businesses & Products
  const [businesses, setBusinesses] = useState<Business[]>(() => {
    const saved = localStorage.getItem('pidetietar_businesses');
    return saved ? JSON.parse(saved) : INITIAL_BUSINESSES;
  });
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('pidetietar_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  useEffect(() => {
    localStorage.setItem('pidetietar_businesses', JSON.stringify(businesses));
  }, [businesses]);

  useEffect(() => {
    localStorage.setItem('pidetietar_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    const handleStorageSync = (event: StorageEvent) => {
      if (!event.key) return;

      if (event.key === 'pidetietar_orders') {
        setOrders(event.newValue ? JSON.parse(event.newValue) : []);
      }
      if (event.key === 'pidetietar_businesses') {
        setBusinesses(event.newValue ? JSON.parse(event.newValue) : INITIAL_BUSINESSES);
      }
      if (event.key === 'pidetietar_products') {
        setProducts(event.newValue ? JSON.parse(event.newValue) : INITIAL_PRODUCTS);
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

  // Verification state
  const [verificationSent, setVerificationSent] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
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

  // Switch roles for instant testing of all roles
  const loginAs = (role: User['role'], customEmail?: string, extraData?: Partial<User>) => {
    const roleNames: Record<User['role'], string> = {
      CLIENT: 'Lucía Morales (Cliente)',
      BUSINESS_ADMIN: 'Carlos Gómez (Admin Asador)',
      PLATFORM_COURIER: 'Marcos Ruiz (Repartidor Patinete)',
      BUSINESS_COURIER: 'Javier Adrada (Repartidor Pizzería)',
      SUPERADMIN: 'Rafael Santos (Superadmin)'
    };

    const targetEmail = customEmail || (role === 'SUPERADMIN' ? 'rafaeldesweb@gmail.com' : `${role.toLowerCase()}@pidetietar.es`);
    const fallbackCourierProfile: NonNullable<User['courierProfile']> = {
      businessIds: role === 'BUSINESS_COURIER' ? ['biz-2'] : ['biz-1'],
      localityIds: ['sotillo'],
      isOnline: true,
      confirmation: role === 'SUPERADMIN' ? 'SUPERADMIN' : 'PENDING'
    };

    const newUser: User = {
      id: `usr-${role.toLowerCase()}`,
      name: roleNames[role],
      email: targetEmail,
      password: 'admin123',
      phone: '+34 612 345 678',
      role: role,
      businessId: (role === 'BUSINESS_ADMIN') ? 'biz-1' : (role === 'BUSINESS_COURIER' ? 'biz-2' : undefined),
      isEmailVerified: extraData?.isEmailVerified ?? (role === 'CLIENT' || role === 'PLATFORM_COURIER' || role === 'BUSINESS_COURIER' ? false : true),
      createdAt: new Date().toISOString(),
      avatarUrl: `https://images.unsplash.com/photo-${role === 'CLIENT' ? '1544005313-94ddf0286df2' : '1507003211169-0a1dd7228f2d'}?w=120&auto=format&fit=crop&q=80`,
      subscriptionPlan: role === 'CLIENT' ? 'PRO_MONTHLY' : (role === 'BUSINESS_ADMIN' ? 'PREMIUM_PARTNER' : 'FREE'),
      subscriptionStatus: 'active',
      addresses: [
        {
          id: 'addr-test',
          label: 'Dirección habitual',
          street: 'Calle Real 8',
          locality: 'Sotillo de la Adrada',
          postalCode: '05420',
          coordinates: { lat: 40.2889, lng: -4.5828 },
          isDefault: true
        }
      ],
      courierProfile: (role === 'PLATFORM_COURIER' || role === 'BUSINESS_COURIER')
        ? (extraData?.courierProfile || fallbackCourierProfile)
        : undefined,
      ...extraData
    };

    if (role === 'BUSINESS_ADMIN' || role === 'SUPERADMIN') {
      setCart(null);
    }

    setCurrentUser(newUser);
    setUserSubscription(newUser.subscriptionPlan);
    showNotification(`Sesión iniciada como ${newUser.name} (${role})`, 'success');
  };

  const logout = () => {
    setCurrentUser(null);
    showNotification('Has cerrado la sesión.', 'info');
  };

  const updateCurrentUserProfile = (data: Partial<User>) => {
    setCurrentUser(prev => {
      if (!prev) return prev;
      const nextUser = { ...prev, ...data };
      return nextUser;
    });
    showNotification('Perfil actualizado correctamente.', 'success');
  };

  const sendGmailVerificationCode = async (): Promise<boolean> => {
    if (!currentUser) return false;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setVerificationSent(true);

    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1A0600; max-width: 500px; border: 1px solid #e5e5e5; border-radius: 8px;">
        <h2 style="color: #FF4E00; margin-top: 0;">PideTiétar - Verificación de Cuenta</h2>
        <p>Hola <strong>${currentUser.name}</strong>,</p>
        <p>Tu código de seguridad para verificar tu cuenta en PideTiétar es:</p>
        <div style="background-color: #FFF4ED; border: 2px dashed #FF4E00; padding: 14px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #A32300; margin: 20px 0;">
          ${code}
        </div>
        <p style="font-size: 13px; color: #666;">Válido durante 15 minutos. No compartas este código con nadie.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <small style="color: #888;">PideTiétar - Todo el valle a tu puerta</small>
      </div>
    `;

    const res = await sendEmailViaGmail({
      recipientEmail: currentUser.email,
      subject: `Código de verificación PideTiétar: ${code}`,
      bodyText: `Tu código de verificación de PideTiétar es: ${code}`,
      htmlContent: emailBody
    });

    if (res.success) {
      showNotification(`Código de 6 dígitos enviado a ${currentUser.email} vía Gmail`, 'success');
      return true;
    } else {
      showNotification(`Aviso: Código generado (${code}) simulado en consola: ${res.error}`, 'info');
      return true;
    }
  };

  const verifyEmailWithGmailCode = async (code: string): Promise<boolean> => {
    if (!generatedCode || code.trim() !== generatedCode.trim()) {
      showNotification('Código de verificación inválido. Por favor revisa tu bandeja de Gmail.', 'error');
      return false;
    }

    if (currentUser) {
      setCurrentUser({ ...currentUser, isEmailVerified: true });
    }
    setGeneratedCode(null);
    setVerificationSent(false);
    showNotification('¡Correo verificado con éxito! Ya puedes realizar pedidos.', 'success');
    return true;
  };

  const addLocality = (data: Partial<Locality>): Locality => {
    const newLocality: Locality = {
      id: data.id || `loc-${Date.now()}`,
      name: data.name || 'Nueva zona',
      postalCode: data.postalCode || '00000',
      coordinates: data.coordinates || { lat: 40.2891, lng: -4.5824 },
      active: data.active ?? true,
      coverImage: data.coverImage,
    };

    setLocalities(prev => [...prev, newLocality]);
    showNotification(`Zona "${newLocality.name}" añadida.`, 'success');
    return newLocality;
  };

  const updateLocality = (localityId: string, data: Partial<Locality>) => {
    setLocalities(prev => prev.map(loc => (loc.id === localityId ? { ...loc, ...data } : loc)));
    setSelectedLocality(prev => (prev.id === localityId ? { ...prev, ...data } : prev));
    showNotification('Zona actualizada correctamente.', 'success');
  };

  const deleteLocality = (localityId: string) => {
    const stillHasBusinesses = businesses.some(b => b.localityId === localityId);
    if (stillHasBusinesses) {
      showNotification('No puedes eliminar una zona con negocios registrados.', 'error');
      return;
    }

    setLocalities(prev => {
      const remaining = prev.filter(loc => loc.id !== localityId);
      if (selectedLocality.id === localityId && remaining.length > 0) {
        setSelectedLocality(remaining[0]);
      }
      return remaining;
    });
    showNotification('Zona eliminada.', 'info');
  };

  const createBusiness = (businessData: Partial<Business>): Business => {
    const newBusiness: Business = {
      id: businessData.id || `biz-${Date.now()}`,
      name: businessData.name || 'Nuevo negocio',
      legalName: businessData.legalName || businessData.name || 'Nuevo negocio',
      cif: businessData.cif || '00000000A',
      category: businessData.category || 'general',
      localityId: businessData.localityId || selectedLocality.id,
      address: businessData.address || 'Dirección por definir',
      phone: businessData.phone || '+34 600 000 000',
      email: businessData.email || 'contacto@nuevo-negocio.es',
      managerName: businessData.managerName || '',
      managerDni: businessData.managerDni || '',
      coordinates: businessData.coordinates || { lat: 40.2891, lng: -4.5824 },
      rating: businessData.rating ?? 4.5,
      reviewCount: businessData.reviewCount || 0,
      estimatedTimeMin: businessData.estimatedTimeMin || 20,
      estimatedTimeMax: businessData.estimatedTimeMax || 40,
      deliveryFeeCents: businessData.deliveryFeeCents || 250,
      minOrderCents: businessData.minOrderCents || 1000,
      bannerUrl: businessData.bannerUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80',
      logoUrl: businessData.logoUrl || 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&auto=format&fit=crop&q=80',
      isShiftOpen: businessData.isShiftOpen ?? true,
      deliveryModes: businessData.deliveryModes || ['PLATFORM_COURIER', 'PICKUP'],
      deliveryRadiusKm: businessData.deliveryRadiusKm || 10,
      status: businessData.status || 'APPROVED',
      schedule: businessData.schedule || [
        { dayOfWeek: 1, openTime: '12:00', closeTime: '23:00', isOpen: true },
        { dayOfWeek: 2, openTime: '12:00', closeTime: '23:00', isOpen: true },
        { dayOfWeek: 3, openTime: '12:00', closeTime: '23:00', isOpen: true },
        { dayOfWeek: 4, openTime: '12:00', closeTime: '23:00', isOpen: true },
        { dayOfWeek: 5, openTime: '12:00', closeTime: '00:00', isOpen: true },
        { dayOfWeek: 6, openTime: '12:00', closeTime: '00:00', isOpen: true },
        { dayOfWeek: 0, openTime: '12:00', closeTime: '22:00', isOpen: true }
      ],
      featuredProducts: businessData.featuredProducts || []
    };

    setBusinesses(prev => [newBusiness, ...prev]);
    showNotification(`Nuevo negocio creado: ${newBusiness.name}`, 'success');
    return newBusiness;
  };

  const updateBusinessShift = (businessId: string, isOpen: boolean) => {
    setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, isShiftOpen: isOpen } : b));
    showNotification(`Turno ${isOpen ? 'ABIERTO y aceptando pedidos' : 'CERRADO'} para el comercio.`, isOpen ? 'success' : 'info');
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
    showNotification(`Producto añadido a la carta: ${newProduct.name}`, 'success');
    return newProduct;
  };

  const updateProductInBusiness = (productId: string, product: Partial<Product>): Product | null => {
    const currentProduct = products.find((p: Product) => p.id === productId);
    if (!currentProduct) return null;

    const updatedProduct: Product = { ...currentProduct, ...product };
    setProducts((prev: Product[]) => prev.map((p: Product) => p.id === productId ? updatedProduct : p));
    showNotification(`Producto actualizado: ${updatedProduct.name}`, 'info');
    return updatedProduct;
  };

  const deleteProductFromBusiness = (productId: string) => {
    const target = products.find((p: Product) => p.id === productId);
    setProducts((prev: Product[]) => prev.filter((p: Product) => p.id !== productId));
    if (target) {
      showNotification(`Se eliminó ${target.name} del catálogo`, 'info');
    }
  };

  const addToCart = (item: Omit<CartItem, 'cartItemId'>, businessId: string) => {
    if (item.product.businessId && item.product.businessId !== businessId) {
      return { success: false, conflict: true };
    }

    // Check single business constraint
    if (cart && cart.businessId !== businessId && cart.items.length > 0) {
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
      ? (currentUser.addresses[data.addressIndex || 0] || currentUser.addresses[0])
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
      status: 'PAID',
      statusHistory: [
        { status: 'PAID', timestamp: new Date().toISOString(), changedByRole: 'CLIENTE', note: 'Pago completado con éxito' }
      ],
      paymentMethod: data.paymentMethod,
      paymentStatus: 'PAID',
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
    clearCart();
    showNotification(`¡Pedido ${newOrder.orderNumber} confirmado con éxito!`, 'success');

    return { success: true, order: newOrder };
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status'], note?: string) => {
    setOrders(prev => prev.map(ord => {
      if (ord.id === orderId) {
        const nextOrder = {
          ...ord,
          status: newStatus,
          reviewRequested: newStatus === 'DELIVERED' ? true : ord.reviewRequested,
          updatedAt: new Date().toISOString(),
          statusHistory: [
            ...ord.statusHistory,
            {
              status: newStatus,
              timestamp: new Date().toISOString(),
              changedByRole: currentUser?.role || 'SISTEMA',
              note
            }
          ]
        };

        if (newStatus === 'DELIVERED') {
          showNotification('Pedido entregado. Ayúdanos a valorar la experiencia del local.', 'success');
        }

        return nextOrder;
      }
      return ord;
    }));
    if (newStatus !== 'DELIVERED') {
      showNotification(`Estado de pedido actualizado a: ${newStatus}`, 'info');
    }
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

    setOrders((previous) =>
      previous.map((order) =>
        order.id === orderId
          ? {
              ...order,
              reviewRequested: false,
              reviewScore: safeScore,
              reviewedAt: new Date().toISOString(),
            }
          : order,
      ),
    );

    showNotification(`Gracias por valorar a ${targetBusiness.name} con ${safeScore} estrellas.`, 'success');
  };

  const toggleProductAvailability = (productId: string) => {
    setProducts((prev: Product[]) => prev.map((p: Product) => {
      if (p.id === productId) {
        const nextState = !p.isAvailable;
        showNotification(`${p.name}: ${nextState ? 'Disponible' : 'Agotado en cocina'}`, 'info');
        return { ...p, isAvailable: nextState };
      }
      return p;
    }));
  };

  const createManualOrder = (orderData: Partial<Order>): Order => {
    const orderNum = 'PT-' + Math.floor(1000 + Math.random() * 9000);
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      orderNumber: orderNum,
      businessId: orderData.businessId || 'biz-1',
      businessName: orderData.businessName || 'La Bodeguita de Sotillo',
      customerId: 'usr-manual',
      customerName: orderData.customerName || 'Cliente en Barra / Mesa',
      customerPhone: orderData.customerPhone || '+34 600 000 000',
      customerEmail: orderData.customerEmail || 'mostrador@labodeguita.es',
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
    showNotification(`Nueva comanda #${newOrder.orderNumber} creada en cocina`, 'success');
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
      createBusiness,
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
