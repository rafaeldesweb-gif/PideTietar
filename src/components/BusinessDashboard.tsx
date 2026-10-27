import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Bike,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coffee,
  Download,
  Edit3,
  FileText,
  Flame,
  LogOut,
  MapPin,
  Minus,
  Phone,
  Plus,
  Power,
  Printer,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Utensils,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from 'lucide-react';
import { Order, OrderStatus, Product, CartItemOptionSelected, BusinessHours, User } from '../types';
import { ProjectLogo } from './ProjectLogo';
import { CategoryManagerModal } from './CategoryManagerModal';
import { SensitiveInput } from './SensitiveInput';
import {
  FieldError,
  FieldErrors,
  fieldClass,
  firstErrorMessage,
  toBusinessFieldErrors,
} from './FormErrors';
import { MediaView } from './MediaView';
import {
  MEDIA_ACCEPT,
  isMediaUrl,
  processMediaFile,
  processMediaUrl,
} from '../utils/mediaUpload';
import { normalizeDni, validateCourierContact } from '../utils/courierValidation';
import { buildEffectiveOptionGroups, getDefaultSelectedOptions } from '../utils/productOptions';

interface ManualOrderLine {
  lineId: string;
  product: Product;
  quantity: number;
  removedIngredients: string[];
  selectedOptions: CartItemOptionSelected[];
  customerNote: string;
  unitPriceCents: number;
}

interface BusinessDashboardProps {
  initialBusinessId?: string | null;
}

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({ initialBusinessId }) => {
  const {
    currentUser,
    businesses,
    products,
    categories,
    orders,
    selectedLocality,
    localities,
    addLocality,
    updateLocality,
    deleteLocality,
    createBusiness,
    updateBusiness,
    updateOrderStatus,
    updateBusinessShift,
    toggleProductAvailability,
    addProductToBusiness,
    updateProductInBusiness,
    deleteProductFromBusiness,
    createManualOrder,
    showNotification,
    logout,
    updateCurrentUserProfile,
    createUserAccount,
    listCouriers,
    setCourierConfirmation,
  } = useApp();

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    initialBusinessId || currentUser?.businessId || businesses[0]?.id || null,
  );

  useEffect(() => {
    if (initialBusinessId) {
      setSelectedBusinessId(initialBusinessId);
    }
  }, [initialBusinessId]);

  const [ordersZoneFilter, setOrdersZoneFilter] = useState<string>('all');
  const [ordersBusinessFilter, setOrdersBusinessFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'stats' | 'team'>('orders');
  const [selectedTicket, setSelectedTicket] = useState<Order | null>(null);
  const [clearedOrderIds, setClearedOrderIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('pt_cleared_orders');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem('pt_cleared_orders', JSON.stringify(Array.from(clearedOrderIds)));
  }, [clearedOrderIds]);
  const [newOrderModal, setNewOrderModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  // Datos del comercio: los edita el propio usuario del negocio (y el
  // superadmin). Aquí es donde se guarda la cuenta bancaria (IBAN) que luego
  // necesita la pasarela de pago para ingresar al negocio.
  const [businessDataModal, setBusinessDataModal] = useState(false);
  const [businessDataForm, setBusinessDataForm] = useState({
    name: '',
    legalName: '',
    cif: '',
    accountNumber: '',
    phone: '',
    email: '',
    address: '',
    managerName: '',
    managerDni: '',
  });
  const [businessDataErrors, setBusinessDataErrors] = useState<FieldErrors>({});
  const [businessDataSaving, setBusinessDataSaving] = useState(false);

  // Repartidores del negocio (pestaña Equipo).
  const [couriers, setCouriers] = useState<User[]>([]);
  const [couriersLoading, setCouriersLoading] = useState(false);
  const [courierForm, setCourierForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    dni: '',
  });
  const [courierFormErrors, setCourierFormErrors] = useState<FieldErrors>({});
  const [courierSubmitting, setCourierSubmitting] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualDeliveryType, setManualDeliveryType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [manualTableNumber, setManualTableNumber] = useState('');
  const [manualSelectedItems, setManualSelectedItems] = useState<ManualOrderLine[]>([]);
  const [manualCustomizerProduct, setManualCustomizerProduct] = useState<Product | null>(null);
  const [manualCustomizerQuantity, setManualCustomizerQuantity] = useState(1);
  const [manualCustomizerRemoved, setManualCustomizerRemoved] = useState<string[]>([]);
  const [manualCustomizerOptions, setManualCustomizerOptions] = useState<CartItemOptionSelected[]>([]);
  const [manualCustomizerNote, setManualCustomizerNote] = useState('');
  const [catalogForm, setCatalogForm] = useState({
    name: '',
    description: '',
    tag: '',
    ingredients: '',
    removableIngredients: '',
    additionalIngredients: '',
    priceCents: '0',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    categoryId: '',
    isAvailable: true,
    allergens: '',
  });
  // Texto pegado para imagen del producto.
  const [catalogImageUrlText, setCatalogImageUrlText] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newBusinessModalOpen, setNewBusinessModalOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [zoneManagerOpen, setZoneManagerOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZonePostalCode, setNewZonePostalCode] = useState('');
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editZoneName, setEditZoneName] = useState('');
  const [editZonePostalCode, setEditZonePostalCode] = useState('');
  const defaultBusinessSchedule: BusinessHours[] = [
    { dayOfWeek: 1, openTime: '12:00', closeTime: '23:00', isOpen: true },
    { dayOfWeek: 2, openTime: '12:00', closeTime: '23:00', isOpen: true },
    { dayOfWeek: 3, openTime: '12:00', closeTime: '23:00', isOpen: true },
    { dayOfWeek: 4, openTime: '12:00', closeTime: '23:00', isOpen: true },
    { dayOfWeek: 5, openTime: '12:00', closeTime: '00:00', isOpen: true },
    { dayOfWeek: 6, openTime: '12:00', closeTime: '00:00', isOpen: true },
    { dayOfWeek: 0, openTime: '12:00', closeTime: '22:00', isOpen: true },
  ];

  const [newBusinessForm, setNewBusinessForm] = useState({
    name: '',
    legalName: '',
    cif: '',
    accountNumber: '',
    category: '',
    localityId: selectedLocality?.id || '',
    address: '',
    phone: '',
    email: '',
    managerName: '',
    managerDni: '',
    adminUsername: '',
    adminEmail: '',
    adminPassword: '',
    bannerUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&auto=format&fit=crop&q=80',
    deliveryFeeCents: '2',
    estimatedTimeMin: '20',
    estimatedTimeMax: '40',
    schedule: defaultBusinessSchedule,
  });
  // Textos pegados para banner y logo (alternativa al input de archivo).
  const [newBusinessBannerUrlText, setNewBusinessBannerUrlText] = useState('');
  const [newBusinessLogoUrlText, setNewBusinessLogoUrlText] = useState('');
  // Errores campo a campo que devuelve el servidor al crear el comercio.
  const [businessFormErrors, setBusinessFormErrors] = useState<FieldErrors>({});
  // Si la categoría elegida desaparece (por ejemplo, se elimina desde el
  // gestor) o el catálogo aún no ha llegado, los formularios caen a la primera
  // categoría disponible o se quedan vacíos para que la validación lo marque.
  useEffect(() => {
    setCatalogForm((previous) => {
      if (categories.some((category) => category.id === previous.categoryId)) {
        return previous;
      }
      const nextCategoryId = categories[0]?.id || '';
      return previous.categoryId === nextCategoryId
        ? previous
        : { ...previous, categoryId: nextCategoryId };
    });
    setNewBusinessForm((previous) => {
      if (categories.some((category) => category.id === previous.category)) {
        return previous;
      }
      const nextCategoryId = categories[0]?.id || '';
      return previous.category === nextCategoryId
        ? previous
        : { ...previous, category: nextCategoryId };
    });
  }, [categories]);
  const [userSettingsForm, setUserSettingsForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    // Nunca se precarga la contraseña: el campo sólo se usa para escribir una
    // nueva. Precargarla rellenaría el formulario con la clave real del usuario.
    password: '',
    phone: currentUser?.phone || '',
    avatarUrl: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  });
  // Texto pegado para avatar de usuario.
  const [userSettingsAvatarUrlText, setUserSettingsAvatarUrlText] = useState('');

  useEffect(() => {
    if (currentUser) {
      setUserSettingsForm({
        name: currentUser.name,
        email: currentUser.email,
        password: '',
        phone: currentUser.phone || '',
        avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      });
    }
  }, [currentUser, settingsModal]);

  useEffect(() => {
    if (currentUser?.businessId) {
      setSelectedBusinessId(currentUser.businessId);
    }
  }, [currentUser?.businessId]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'BUSINESS_ADMIN' || currentUser.role === 'SUPERADMIN') {
      setSelectedTicket(null);
      setNewOrderModal(false);
      setManualCustomerName('');
      setManualPhone('');
      setManualAddress('');
      setManualDeliveryType('PICKUP');
      setManualTableNumber('');
      setManualSelectedItems([]);
      setManualCustomizerProduct(null);
      setManualCustomizerQuantity(1);
      setManualCustomizerRemoved([]);
      setManualCustomizerOptions([]);
      setManualCustomizerNote('');
      setActiveTab('orders');
    }
  }, [currentUser?.id, currentUser?.role]);

  const business =
    businesses.find((b) => b.id === selectedBusinessId) ||
    businesses.find((b) => b.id === currentUser?.businessId) ||
    businesses[0];

  const refreshCouriers = async () => {
    if (!business?.id) return;
    setCouriersLoading(true);
    const rows = await listCouriers();
    // Un repartidor puede cubrir varios negocios: se muestra si el negocio
    // actual está en su lista (o en su business_id de referencia).
    setCouriers(
      rows.filter((courier) => {
        const assigned = courier.courierProfile?.businessIds || [];
        return assigned.includes(business.id) || courier.businessId === business.id;
      }),
    );
    setCouriersLoading(false);
  };

  useEffect(() => {
    void refreshCouriers();
    // Se recarga al cambiar de negocio o de usuario; los cambios puntuales se
    // refrescan tras crear o confirmar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id, currentUser?.id]);

  const handleCreateBusinessCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!courierForm.fullName.trim()) {
      errors.fullName = 'El nombre es obligatorio.';
    }
    if (!courierForm.username.trim()) {
      errors.username = 'El usuario es obligatorio.';
    }
    if (!courierForm.email.trim()) {
      errors.email = 'El email es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(courierForm.email.trim())) {
      errors.email = 'El email no es válido.';
    }
    if (courierForm.password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres.';
    }
    Object.assign(errors, validateCourierContact(courierForm, { required: true }));

    setCourierFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCourierSubmitting(true);
    const ok = await createUserAccount({
      fullName: courierForm.fullName.trim(),
      username: courierForm.username.trim(),
      email: courierForm.email.trim(),
      password: courierForm.password,
      phone: courierForm.phone.trim(),
      address: courierForm.address.trim(),
      dni: normalizeDni(courierForm.dni),
      role: 'BUSINESS_COURIER',
      businessId: business?.id,
      courierBusinessIds: business?.id ? [business.id] : [],
      courierConfirmation: 'PENDING',
    });
    setCourierSubmitting(false);

    if (ok) {
      setCourierForm({
        fullName: '',
        username: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        dni: '',
      });
      setCourierFormErrors({});
      await refreshCouriers();
    }
  };

  const handleConfirmBusinessCourier = async (courier: User) => {
    const ok = await setCourierConfirmation(courier.id, 'BUSINESS_EMAIL');
    if (ok) await refreshCouriers();
  };

  const categoryOptions = categories;
  const canManageOrders = !!currentUser && (currentUser.role === 'BUSINESS_ADMIN' || currentUser.role === 'SUPERADMIN');
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';
  // En el control de pedidos global no hay un negocio seleccionado: la
  // cabecera no debe mostrar el nombre ni el estado del primer negocio.
  const hideBusinessHeader = !!isSuperAdmin && activeTab === 'orders' && ordersBusinessFilter === 'all';

  if (!currentUser || !canManageOrders) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fff2eb] text-[#FF4E00]">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-stone-900">Acceso a administración</h2>
          <p className="mt-3 text-sm text-stone-600">
            Debes iniciar sesión con un usuario administrador para gestionar pedidos, menús y turnos del negocio.
          </p>
        </div>
      </div>
    );
  }

  if (!business) {
    return <div className="p-6 text-stone-700">No hay negocio disponible.</div>;
  }

  const isCurrentLogicalDay = (dateStr: string) => {
    const d = new Date(dateStr);
    const orderDate = new Date(d.getTime() - 4 * 60 * 60 * 1000); // 4 AM offset for late night shifts
    const todayDate = new Date(Date.now() - 4 * 60 * 60 * 1000);
    return orderDate.getDate() === todayDate.getDate() 
      && orderDate.getMonth() === todayDate.getMonth() 
      && orderDate.getFullYear() === todayDate.getFullYear();
  };

  const businessOrders = (isSuperAdmin
    ? orders.filter((order) => {
        const orderBusiness = businesses.find((b) => b.id === order.businessId);
        if (!orderBusiness) return false;
        if (ordersZoneFilter !== 'all' && orderBusiness.localityId !== ordersZoneFilter) return false;
        if (ordersBusinessFilter !== 'all' && order.businessId !== ordersBusinessFilter) return false;
        return true;
      })
    : orders.filter((o) => o.businessId === business.id))
    .filter(o => isCurrentLogicalDay(o.createdAt));
  const restaurantProducts = products.filter((p) => p.businessId === business.id);
  const zoneBusinessesForFilter =
    ordersZoneFilter === 'all'
      ? businesses
      : businesses.filter((b) => b.localityId === ordersZoneFilter);
  const localityBusinesses = isSuperAdmin
    ? zoneBusinessesForFilter
    : businesses.filter((b) => b.localityId === business.localityId);
  const deliveryOrders = businessOrders.filter((order) => order.deliveryType === 'DELIVERY');
  const pickupOrders = businessOrders.filter((order) => order.deliveryType === 'PICKUP');
  const deliverySalesCents = deliveryOrders.reduce((acc, order) => acc + order.subtotalCents, 0);
  const pickupSalesCents = pickupOrders.reduce((acc, order) => acc + order.subtotalCents, 0);
  const totalSalesCents = businessOrders.reduce((acc, order) => acc + order.subtotalCents, 0);
  const averageTicketCents = businessOrders.length > 0 ? Math.round(totalSalesCents / businessOrders.length) : 0;
  const activeUnfinishedOrders = businessOrders.filter(
    (order) => !['DELIVERED', 'CANCELLED', 'REJECTED', 'REFUNDED'].includes(order.status),
  );

  const productSalesMap = businessOrders.reduce<Record<string, { name: string; quantity: number }>>((acc, order) => {
    order.items.forEach((item) => {
      const key = item.productId;
      const current = acc[key] || { name: item.productName, quantity: 0 };
      current.quantity += item.quantity;
      acc[key] = current;
    });
    return acc;
  }, {});
  const topProduct = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity)[0];

  const kanbanColumns: Array<{
    id: string;
    title: string;
    dotColor: string;
    badgeColor: string;
    statuses: OrderStatus[];
  }> = [
    {
      id: 'nuevos',
      title: 'NUEVOS',
      dotColor: 'bg-amber-500',
      badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      statuses: ['PAID', 'NEW'],
    },
    {
      id: 'preparacion',
      title: 'EN PREPARACIÓN',
      dotColor: 'bg-blue-500',
      badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      statuses: ['ACCEPTED', 'PREPARING'],
    },
    {
      id: 'listos',
      title: 'LISTOS',
      dotColor: 'bg-purple-500',
      badgeColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      statuses: ['READY', 'ASSIGNED'],
    },
    {
      id: 'entregados',
      title: 'ENTREGADOS',
      dotColor: 'bg-emerald-500',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      statuses: ['PICKED_UP', 'DELIVERED'],
    },
  ];

  const handleToggleShift = () => {
    if (business.isShiftOpen) {
      updateBusinessShift(business.id, false);
      return;
    }

    updateBusinessShift(business.id, true);
  };

  const openManualCustomizer = (prod: Product) => {
    setManualCustomizerProduct(prod);
    setManualCustomizerQuantity(1);
    setManualCustomizerRemoved([]);
    setManualCustomizerOptions(getDefaultSelectedOptions(prod));
    setManualCustomizerNote('');
  };

  const closeManualCustomizer = () => setManualCustomizerProduct(null);

  const toggleManualRemovable = (ing: string) => {
    setManualCustomizerRemoved((prev) => (prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing]));
  };

  const selectManualOption = (groupName: string, optionName: string, priceCents: number, isMulti: boolean) => {
    setManualCustomizerOptions((prev) => {
      if (!isMulti) {
        const withoutGroup = prev.filter((o) => o.groupName !== groupName);
        return [...withoutGroup, { groupName, optionName, priceCents }];
      }
      const exists = prev.some((o) => o.groupName === groupName && o.optionName === optionName);
      if (exists) {
        return prev.filter((o) => !(o.groupName === groupName && o.optionName === optionName));
      }
      return [...prev, { groupName, optionName, priceCents }];
    });
  };

  const confirmManualCustomization = () => {
    if (!manualCustomizerProduct) return;
    const optionsTotal = manualCustomizerOptions.reduce((acc, o) => acc + o.priceCents, 0);
    const unitPriceCents = manualCustomizerProduct.priceCents + optionsTotal;

    setManualSelectedItems((prev) => [
      ...prev,
      {
        lineId: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        product: manualCustomizerProduct,
        quantity: manualCustomizerQuantity,
        removedIngredients: manualCustomizerRemoved,
        selectedOptions: manualCustomizerOptions,
        customerNote: manualCustomizerNote.trim(),
        unitPriceCents,
      },
    ]);

    closeManualCustomizer();
  };

  const updateManualLineQuantity = (lineId: string, delta: number) => {
    setManualSelectedItems((prev) =>
      prev
        .map((line) => (line.lineId === lineId ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0),
    );
  };

  const removeManualLine = (lineId: string) => {
    setManualSelectedItems((prev) => prev.filter((line) => line.lineId !== lineId));
  };

  const handleCreateManualOrder = (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !canManageOrders) {
      showNotification('Debes iniciar sesión como administrador para crear una comanda.', 'error');
      return;
    }
    if (manualSelectedItems.length === 0) {
      showNotification('Debes seleccionar al menos un plato para la comanda.', 'error');
      return;
    }

    const mixedBusinessItems = manualSelectedItems.some((line) => line.product.businessId && line.product.businessId !== business.id);
    if (mixedBusinessItems) {
      showNotification('Cada ticket solo puede incluir productos de este negocio.', 'error');
      return;
    }

    const cleanedPhone = manualPhone.trim();
    if (!cleanedPhone) {
      showNotification('El teléfono del cliente es obligatorio para confirmar el pedido.', 'error');
      return;
    }

    if (manualDeliveryType === 'DELIVERY' && !manualAddress.trim()) {
      showNotification('La dirección de entrega es obligatoria cuando el pedido es para llevar.', 'error');
      return;
    }

    const subtotalCents = manualSelectedItems.reduce(
      (total, line) => total + line.unitPriceCents * line.quantity,
      0,
    );

    // La dirección de la comanda usa la zona activa o, si no hay ninguna
    // seleccionada, la zona real del negocio. Nunca inventa una localidad.
    const deliveryLocality =
      selectedLocality || localities.find((loc) => loc.id === business.localityId) || null;

    createManualOrder({
      businessId: business.id,
      businessName: business.name,
      customerName: (manualCustomerName.trim() || 'Comensal Sala') + (manualTableNumber.trim() ? ` [Mesa ${manualTableNumber.trim()}]` : ''),
      customerPhone: cleanedPhone,
      deliveryType: manualDeliveryType,
      deliveryAddress: manualDeliveryType === 'DELIVERY'
        ? {
            id: `manual-delivery-${Date.now()}`,
            label: 'Entrega a domicilio',
            street: manualAddress.trim(),
            locality: deliveryLocality?.name || '',
            postalCode: deliveryLocality?.postalCode || '',
            coordinates: deliveryLocality?.coordinates || { lat: 0, lng: 0 },
            reference: manualTableNumber.trim() || undefined,
          }
        : undefined,
      items: manualSelectedItems.map((line) => ({
        productId: line.product.id,
        productName: line.product.name,
        unitPriceCents: line.unitPriceCents,
        taxPercentage: line.product.taxPercentage,
        quantity: line.quantity,
        removedIngredients: line.removedIngredients,
        selectedOptions: line.selectedOptions,
        customerNote: [manualTableNumber ? `Mesa: ${manualTableNumber}` : '', line.customerNote].filter(Boolean).join(' — '),
        totalCents: line.unitPriceCents * line.quantity,
      })),
      subtotalCents,
      deliveryFeeCents: 0,
      totalCents: subtotalCents,
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentStatus: 'PAID',
    });

    setManualCustomerName('');
    setManualPhone('');
    setManualAddress('');
    setManualTableNumber('');
    setManualSelectedItems([]);
    setNewOrderModal(false);
  };

  const defaultCategoryIdForBusiness = () => {
    if (
      business.category &&
      categories.some((category) => category.id === business.category)
    ) {
      return business.category;
    }
    return categories[0]?.id || '';
  };

  const resetCatalogForm = () => {
    setCatalogForm({
      name: '',
      description: '',
      tag: '',
      ingredients: '',
      removableIngredients: '',
      additionalIngredients: '',
      priceCents: '0',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
      categoryId: defaultCategoryIdForBusiness(),
      isAvailable: true,
      allergens: '',
    });
    setEditingProductId(null);
  };

  const handleCatalogSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = catalogForm.name.trim();
    const trimmedDescription = catalogForm.description.trim();
    const normalizedPrice = Number(catalogForm.priceCents) || 0;

    if (!trimmedName || !trimmedDescription || normalizedPrice <= 0) {
      showNotification('Completa nombre, descripción y precio para guardar el producto.', 'error');
      return;
    }

    if (!categories.length) {
      showNotification('No hay categorías disponibles. El superadministrador debe crear al menos una antes de añadir productos.', 'error');
      return;
    }

    if (!categories.some((category) => category.id === catalogForm.categoryId)) {
      showNotification('Selecciona una categoría válida para el producto.', 'error');
      return;
    }

    const parseExtraIngredient = (entry: string) => {
      const cleaned = entry.trim();
      if (!cleaned) return null;
      const match = cleaned.match(/^(.*?)(?:\s*[:\-]\s*|\s+)([0-9]+(?:[.,][0-9]+)?)$/);
      const name = match ? match[1].trim() : cleaned;
      const priceText = match ? match[2].replace(',', '.') : '0';
      const priceValue = Number(priceText) || 0;
      if (!name) return null;
      return { name, priceCents: Math.round(priceValue * 100) };
    };

    const payload = {
      name: trimmedName,
      description: trimmedDescription,
      tag: catalogForm.tag.trim(),
      ingredients: catalogForm.ingredients.split(',').map((item) => item.trim()).filter(Boolean),
      removableIngredients: catalogForm.removableIngredients.split(',').map((item) => item.trim()).filter(Boolean),
      additionalIngredients: catalogForm.additionalIngredients
        .split(',')
        .map(parseExtraIngredient)
        .filter(Boolean) as Array<{ name: string; priceCents: number }>,
      priceCents: Math.round(normalizedPrice * 100),
      imageUrl: catalogForm.imageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
      categoryId: catalogForm.categoryId,
      taxPercentage: 10,
      isAvailable: catalogForm.isAvailable,
      allergens: catalogForm.allergens.split(',').map((item) => item.trim()).filter(Boolean),
    };

    if (editingProductId) {
      updateProductInBusiness(editingProductId, payload);
    } else {
      addProductToBusiness(business.id, payload);
    }

    resetCatalogForm();
  };

  const startEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setCatalogForm({
      name: prod.name,
      description: prod.description,
      tag: prod.tag || '',
      ingredients: (prod.ingredients || []).join(', '),
      removableIngredients: (prod.removableIngredients || []).join(', '),
      additionalIngredients: (prod.additionalIngredients || [])
        .map((item) => `${item.name}: ${(item.priceCents / 100).toFixed(2)}`)
        .join(', '),
      priceCents: (prod.priceCents / 100).toFixed(2),
      imageUrl: prod.imageUrl,
      categoryId: categories.some((category) => category.id === prod.categoryId)
        ? prod.categoryId
        : categories[0]?.id || '',
      isAvailable: prod.isAvailable,
      allergens: (prod.allergens || []).join(', '),
    });
  };

  const handleAddZone = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newZoneName.trim() || !newZonePostalCode.trim()) {
      showNotification('Introduce nombre y código postal de la zona.', 'error');
      return;
    }
    addLocality({ name: newZoneName.trim(), postalCode: newZonePostalCode.trim() });
    setNewZoneName('');
    setNewZonePostalCode('');
  };

  const startEditZone = (localityId: string, name: string, postalCode: string) => {
    setEditingZoneId(localityId);
    setEditZoneName(name);
    setEditZonePostalCode(postalCode);
  };

  const saveEditZone = () => {
    if (!editingZoneId) return;
    if (!editZoneName.trim() || !editZonePostalCode.trim()) {
      showNotification('Introduce nombre y código postal de la zona.', 'error');
      return;
    }
    updateLocality(editingZoneId, { name: editZoneName.trim(), postalCode: editZonePostalCode.trim() });
    setEditingZoneId(null);
  };

  // Reutiliza la utilidad compartida: lee el archivo y lo convierte a data URL,
  // reescalando imágenes y recodificando vídeos (máximo 2 s) para no superar
  // el límite de ~1 MB que impone el servidor.
  const readMediaFile = async (file: File): Promise<string> => {
    const media = await processMediaFile(file);
    return media.dataUrl;
  };

  const handleBusinessImageUpload = async (
    field: 'bannerUrl' | 'logoUrl',
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readMediaFile(file);
      setNewBusinessForm((prev) => ({ ...prev, [field]: dataUrl }));
    } catch (error) {
      showNotification('No se pudo cargar el archivo seleccionado.', 'error');
    }
    event.target.value = '';
  };

  const handleBusinessUrlPaste = async (
    field: 'bannerUrl' | 'logoUrl',
    urlText: string,
    setUrlText: (v: string) => void,
  ) => {
    const url = urlText.trim();
    if (!url) return;
    if (!isMediaUrl(url)) {
      showNotification('Introduce una dirección web válida (http/https) o un archivo de datos.', 'error');
      return;
    }
    try {
      const media = await processMediaUrl(url);
      setNewBusinessForm((prev) => ({ ...prev, [field]: media.dataUrl }));
      setUrlText('');
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'No se pudo procesar la dirección web.',
        'error',
      );
    }
  };

  const handleProductImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readMediaFile(file);
      setCatalogForm((prev) => ({ ...prev, imageUrl: dataUrl }));
    } catch (error) {
      showNotification('No se pudo leer el archivo del producto.', 'error');
    }
  };

  const handleProductUrlPaste = async (urlText: string, setUrlText: (v: string) => void) => {
    const url = urlText.trim();
    if (!url) return;
    if (!isMediaUrl(url)) {
      showNotification('Introduce una dirección web válida (http/https) o un archivo de datos.', 'error');
      return;
    }
    try {
      const media = await processMediaUrl(url);
      setCatalogForm((prev) => ({ ...prev, imageUrl: media.dataUrl }));
      setUrlText('');
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'No se pudo procesar la dirección web.',
        'error',
      );
    }
  };

  const updateBusinessScheduleDay = (dayOfWeek: number, updates: Partial<BusinessHours>) => {
    setNewBusinessForm((prev) => ({
      ...prev,
      schedule: prev.schedule.map((slot) =>
        slot.dayOfWeek === dayOfWeek ? { ...slot, ...updates } : slot,
      ),
    }));
  };

  const handleUserAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readMediaFile(file);
      setUserSettingsForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
    } catch (error) {
      showNotification('No se pudo leer el archivo del avatar.', 'error');
    }
  };

  const handleUserAvatarUrlPaste = async (urlText: string, setUrlText: (v: string) => void) => {
    const url = urlText.trim();
    if (!url) return;
    if (!isMediaUrl(url)) {
      showNotification('Introduce una dirección web válida (http/https) o un archivo de datos.', 'error');
      return;
    }
    try {
      const media = await processMediaUrl(url);
      setUserSettingsForm((prev) => ({ ...prev, avatarUrl: media.dataUrl }));
      setUrlText('');
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'No se pudo procesar la dirección web.',
        'error',
      );
    }
  };

  // Abre el formulario con los datos actuales del comercio para que el
  // propietario pueda actualizarlos (IBAN incluido) sin pasar por el superadmin.
  const openBusinessDataModal = () => {
    setBusinessDataErrors({});
    setBusinessDataForm({
      name: business.name || '',
      legalName: business.legalName || '',
      cif: business.cif || '',
      accountNumber: business.accountNumber || '',
      phone: business.phone || '',
      email: business.email || '',
      address: business.address || '',
      managerName: business.managerName || '',
      managerDni: business.managerDni || '',
    });
    setBusinessDataModal(true);
  };

  const handleSaveBusinessData = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanAccountNumber = businessDataForm.accountNumber.trim().replace(/\s+/g, '').toUpperCase();

    // Mismo criterio que el servidor para marcar el campo antes de la petición.
    const localErrors: FieldErrors = {};
    if (!businessDataForm.name.trim()) localErrors.name = 'El nombre del negocio es obligatorio.';
    if (!businessDataForm.address.trim()) localErrors.address = 'La dirección del negocio es obligatoria.';
    if (cleanAccountNumber && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(cleanAccountNumber)) {
      localErrors.accountNumber = 'El número de cuenta debe ser un IBAN (ej. ES91 2100 0418 4502 0005 1332).';
    }

    if (Object.keys(localErrors).length) {
      setBusinessDataErrors(localErrors);
      showNotification(firstErrorMessage(localErrors) || 'Revisa los campos marcados.', 'error');
      return;
    }

    setBusinessDataSaving(true);
    try {
      const saved = await updateBusiness(
        business.id,
        {
          name: businessDataForm.name.trim(),
          legalName: businessDataForm.legalName.trim() || businessDataForm.name.trim(),
          cif: businessDataForm.cif.trim(),
          accountNumber: cleanAccountNumber,
          phone: businessDataForm.phone.trim(),
          email: businessDataForm.email.trim(),
          address: businessDataForm.address.trim(),
          managerName: businessDataForm.managerName.trim(),
          managerDni: businessDataForm.managerDni.trim(),
        },
        null,
        (errors) => setBusinessDataErrors(toBusinessFieldErrors(errors)),
      );

      if (saved) setBusinessDataModal(false);
    } finally {
      setBusinessDataSaving(false);
    }
  };

  const handleCreateBusiness = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusinessFormErrors({});

    // Mismo criterio que el servidor, para marcar el campo en el formulario
    // antes de hacer la petición.
    const localErrors: FieldErrors = {};
    if (!newBusinessForm.name.trim()) localErrors.name = 'El nombre del negocio es obligatorio.';
    if (!newBusinessForm.address.trim()) localErrors.address = 'La dirección del negocio es obligatoria.';
    if (!newBusinessForm.localityId) localErrors.localityId = 'Selecciona la zona donde está el negocio.';
    if (!newBusinessForm.category) localErrors.category = 'Selecciona la categoría del negocio.';
    if (!newBusinessForm.adminUsername.trim()) localErrors.adminUsername = 'El usuario de acceso es obligatorio.';
    if (!newBusinessForm.adminEmail.trim()) localErrors.adminEmail = 'El email de acceso es obligatorio.';
    if (!newBusinessForm.adminPassword.trim()) localErrors.adminPassword = 'La clave inicial es obligatoria.';
    else if (newBusinessForm.adminPassword.trim().length < 8) {
      localErrors.adminPassword = 'La clave inicial debe tener al menos 8 caracteres.';
    }

    if (Object.keys(localErrors).length) {
      setBusinessFormErrors(localErrors);
      showNotification(firstErrorMessage(localErrors) || 'Revisa los datos del formulario.', 'error');
      return;
    }

    // El backend crea el negocio, su horario y la cuenta del propietario en
    // una sola operación: si algo falla no queda nada a medias.
    const createdBusiness = await createBusiness(
      {
        name: newBusinessForm.name.trim(),
        legalName: newBusinessForm.legalName.trim() || newBusinessForm.name.trim(),
        cif: newBusinessForm.cif.trim() || '00000000A',
        accountNumber: newBusinessForm.accountNumber.trim(),
        category: newBusinessForm.category,
        localityId: newBusinessForm.localityId,
        address: newBusinessForm.address.trim(),
        phone: newBusinessForm.phone.trim() || '+34 600 000 000',
        email: newBusinessForm.email.trim() || 'contacto@nuevo-negocio.es',
        managerName: newBusinessForm.managerName.trim(),
        managerDni: newBusinessForm.managerDni.trim(),
        bannerUrl: newBusinessForm.bannerUrl,
        logoUrl: newBusinessForm.logoUrl,
        minOrderCents: 0,
        deliveryFeeCents: Number(newBusinessForm.deliveryFeeCents) * 100 || 250,
        estimatedTimeMin: Number(newBusinessForm.estimatedTimeMin) || 20,
        estimatedTimeMax: Number(newBusinessForm.estimatedTimeMax) || 40,
        schedule: newBusinessForm.schedule,
        isShiftOpen: true,
        status: 'APPROVED',
      },
      {
        username: newBusinessForm.adminUsername.trim(),
        fullName: `${newBusinessForm.managerName.trim() || newBusinessForm.name.trim()} (${newBusinessForm.name.trim()})`,
        email: newBusinessForm.adminEmail.trim(),
        password: newBusinessForm.adminPassword.trim(),
      },
      (errors) => setBusinessFormErrors(toBusinessFieldErrors(errors)),
    );

    if (!createdBusiness) {
      // createBusiness ya ha mostrado el motivo y el callback ha pintado los
      // errores campo a campo sobre el formulario.
      return;
    }

    setBusinessFormErrors({});
    // La clave no se muestra en la notificación: ya la conoce quien la acaba
    // de escribir y las notificaciones se quedan en pantalla.
    showNotification(
      `Negocio ${createdBusiness.name} creado y acceso asignado a ${newBusinessForm.adminUsername.trim()} (rol BUSINESS_ADMIN).`,
      'success',
    );

    setNewBusinessForm({
      name: '',
      legalName: '',
      cif: '',
      accountNumber: '',
      category: categories[0]?.id || '',
      localityId: selectedLocality?.id || '',
      address: '',
      phone: '',
      email: '',
      managerName: '',
      managerDni: '',
      adminUsername: '',
      adminEmail: '',
      adminPassword: '',
      bannerUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80',
      logoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&auto=format&fit=crop&q=80',
      deliveryFeeCents: '2',
      estimatedTimeMin: '20',
      estimatedTimeMax: '40',
      schedule: defaultBusinessSchedule,
    });
    setNewBusinessModalOpen(false);
  };

  return (
    <div className="min-h-[85vh] bg-[#f7f4f1] text-stone-900 rounded-3xl border border-stone-200 shadow-[0_18px_45px_rgba(43,28,18,0.08)] overflow-hidden flex flex-col font-sans">
      <header className="border-b border-stone-200 bg-white px-3 py-2 sm:h-16 sm:px-6 sm:py-0">
        <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF4E00] flex items-center justify-center text-white shadow-md shadow-[#FF4E00]/20 overflow-hidden">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C7.5 2 3.8 5.2 3.2 9.5h17.6C20.2 5.2 16.5 2 12 2zm-8.8 9.5c-.1.5-.2 1-.2 1.5 0 .5.4 1 1 1h16c.6 0 1-.5 1-1 0-.5-.1-1-.2-1.5H3.2zM4 16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2H4zm1 4c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2H5z" />
            </svg>
          </div>

          {!hideBusinessHeader && (
            <div className="flex items-center space-x-2.5">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-stone-900 uppercase font-serif">
                {business.name.toUpperCase()}
              </span>
              <div className={`hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                business.isShiftOpen 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700' 
                  : 'bg-red-500/10 border-red-500/30 text-red-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${business.isShiftOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span>{business.isShiftOpen ? 'COCINA EN LÍNEA' : 'SERVICIO CERRADO'}</span>
              </div>
            </div>
          )}
        </div>



        {!hideBusinessHeader && (
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={handleToggleShift}
              className={`px-2.5 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                currentUser && business.isShiftOpen
                  ? 'bg-emerald-600/20 text-emerald-700 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-600 border border-red-500/30'
              }`}
              title={currentUser ? 'Cambiar estado del local' : 'No hay sesión de administrador'}
              disabled={!currentUser}
            >
              <Power className="w-3 h-3" />
              <span className="hidden md:inline">{currentUser ? (business.isShiftOpen ? 'Servicio Abierto' : 'Servicio Cerrado') : 'Servicio Cerrado'}</span>
            </button>

            <button
              onClick={() => setSettingsModal(true)}
              className="inline-flex rounded-lg p-1.5 text-stone-600 transition hover:bg-stone-100 md:hidden"
              aria-label="Abrir configuracion"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={openBusinessDataModal}
              className="inline-flex rounded-lg p-1.5 text-stone-600 transition hover:bg-stone-100 md:hidden"
              aria-label="Editar datos del negocio"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        )}
        </div>
      </header>

      <div className="border-b border-stone-200 bg-[#faf7f4] p-2 md:hidden">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${
              activeTab === 'orders'
                ? 'bg-[#FF4E00] text-white'
                : 'bg-white text-stone-600'
            }`}
          >
            Pedidos
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${
              activeTab === 'menu'
                ? 'bg-[#FF4E00] text-white'
                : 'bg-white text-stone-600'
            }`}
          >
            Menu
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${
              activeTab === 'stats'
                ? 'bg-[#FF4E00] text-white'
                : 'bg-white text-stone-600'
            }`}
          >
            Estadisticas
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${
              activeTab === 'team'
                ? 'bg-[#FF4E00] text-white'
                : 'bg-white text-stone-600'
            }`}
          >
            Equipo
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="hidden w-full shrink-0 flex-col justify-between border-r border-stone-200 bg-[#faf7f4] p-4 md:flex md:w-60">
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2.5">
                <ProjectLogo variant="badge" className="h-10 w-auto max-w-[150px] shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">PANEL DE CONTROL</div>
                  <h2 className="text-lg font-black text-stone-900 tracking-tight mt-0.5">ADMINISTRADOR</h2>
                </div>
              </div>
              <div className="text-[11px] font-mono text-teal-400 mt-2 flex items-center space-x-1">
                <span>Terminal 01 // Online</span>
              </div>
            </div>

            {currentUser && (
              <div className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center space-x-2.5 shadow-sm">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                <MediaView
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt="user"
                  className="block w-10 h-10 rounded-full border-2 border-stone-700 bg-stone-100"
                  style={{ borderRadius: '9999px' }}
                  fit="cover"
                />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-stone-900 truncate">{currentUser.name}</div>
                  <div className="inline-flex items-center space-x-1 text-[9px] font-bold text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>EN VIVO</span>
                  </div>
                </div>
              </div>
            )}

            <nav className="space-y-1.5">
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-[#fff2eb] text-stone-900 shadow-sm font-extrabold border border-[#ffd7c2]'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span>PEDIDOS</span>
                {businessOrders.filter((order) => ['PAID', 'NEW', 'ACCEPTED', 'PREPARING'].includes(order.status)).length > 0 && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-full bg-[#FF4E00] text-white">
                    {businessOrders.filter((order) => ['PAID', 'NEW', 'ACCEPTED', 'PREPARING'].includes(order.status)).length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('menu')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer ${
                  activeTab === 'menu'
                    ? 'bg-[#fff2eb] text-stone-900 shadow-sm font-extrabold border border-[#ffd7c2]'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>GESTIÓN MENÚ</span>
              </button>

              <button
                onClick={() => setActiveTab('stats')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer ${
                  activeTab === 'stats'
                    ? 'bg-[#fff2eb] text-stone-900 shadow-sm font-extrabold border border-[#ffd7c2]'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>ESTADÍSTICAS</span>
              </button>

              <button
                onClick={() => setActiveTab('team')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer ${
                  activeTab === 'team'
                    ? 'bg-[#fff2eb] text-stone-900 shadow-sm font-extrabold border border-[#ffd7c2]'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>EQUIPO</span>
              </button>
            </nav>
          </div>

          <div className="pt-4 border-t border-[#e6dac8] space-y-1">
            <button
              onClick={() => setSettingsModal(true)}
              className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition flex items-center space-x-2"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>CONFIGURACIÓN</span>
            </button>

            <button
              onClick={openBusinessDataModal}
              className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition flex items-center space-x-2"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>DATOS DEL NEGOCIO</span>
            </button>

            <button
              onClick={() => {
                const pendingEntregados = businessOrders.filter(o => ['PICKED_UP', 'DELIVERED'].includes(o.status) && !clearedOrderIds.has(o.id));
                if (pendingEntregados.length > 0) {
                  showNotification('Debes limpiar la columna de ENTREGADOS clickando encima de cada ticket antes de cerrar sesión.', 'error');
                  return;
                }
                showNotification('Sesión de terminal cerrada.', 'info');
                logout();
              }}
              className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition flex items-center space-x-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>CERRAR SESIÓN</span>
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-[#f5f3f0]">
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    {isSuperAdmin ? 'SUPERADMINISTRACIÓN' : 'PANEL DE COCINA'}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">CONTROL DE PEDIDOS</h1>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {isSuperAdmin
                      ? 'Todos los pedidos del valle, filtrados por zona y negocio.'
                      : 'Gestión en tiempo real del flujo del local.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="px-4 py-2.5 rounded-2xl bg-white border border-stone-200 min-w-[100px] text-center shadow-sm">
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">PEDIDOS HOY</div>
                    <div className="text-xl sm:text-2xl font-black text-stone-900 font-mono mt-0.5">{businessOrders.length}</div>
                  </div>

                  <div className="px-4 py-2.5 rounded-2xl bg-white border border-stone-200 min-w-[120px] text-center shadow-sm">
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">TICKET PROMEDIO</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-0.5">{(averageTicketCents / 100).toFixed(2)}€</div>
                  </div>


                </div>
              </div>

              {isSuperAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-stone-500">Filtrar por zona</label>
                    <select
                      value={ordersZoneFilter}
                      onChange={(event) => {
                        setOrdersZoneFilter(event.target.value);
                        setOrdersBusinessFilter('all');
                      }}
                      className="w-full rounded-xl border border-stone-200 bg-[#fffaf4] px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                    >
                      <option value="all">Todas las zonas</option>
                      {localities.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-stone-500">Filtrar por negocio</label>
                    <select
                      value={ordersBusinessFilter}
                      onChange={(event) => {
                        const nextBusinessId = event.target.value;
                        setOrdersBusinessFilter(nextBusinessId);
                        if (nextBusinessId !== 'all') {
                          setSelectedBusinessId(nextBusinessId);
                        }
                      }}
                      className="w-full rounded-xl border border-stone-200 bg-[#fffaf4] px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                    >
                      <option value="all">Todos los negocios</option>
                      {zoneBusinessesForFilter.map((biz) => (
                        <option key={biz.id} value={biz.id}>{biz.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kanbanColumns.map((column) => {
                  const columnOrders = businessOrders.filter((order) => column.statuses.includes(order.status) && (column.id !== 'entregados' || !clearedOrderIds.has(order.id)));

                  return (
                    <div key={column.id} className="bg-white rounded-2xl border border-stone-200 p-3.5 flex flex-col min-h-[460px] shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`}></span>
                          <h3 className="text-xs font-black text-stone-800 tracking-wider">{column.title}</h3>
                        </div>
                        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${column.badgeColor}`}>
                          {columnOrders.length}
                        </span>
                      </div>

                      <div className="space-y-3 flex-1 overflow-y-auto">
                        {columnOrders.length === 0 ? (
                          <div className="h-44 rounded-xl border border-dashed border-[#e9dac8] bg-[#fffdfb] flex flex-col items-center justify-center text-stone-500">
                            <span className="text-[11px] font-bold tracking-widest uppercase">SIN PEDIDOS</span>
                          </div>
                        ) : (
                          columnOrders.map((order) => (
                            <div
                              key={order.id}
                              onClick={() => {
                                if (column.id === 'entregados') {
                                  setClearedOrderIds(prev => new Set(prev).add(order.id));
                                } else {
                                  setSelectedTicket(order);
                                }
                              }}
                              className="bg-[#fffaf5] hover:bg-[#fff3ea] border border-[#eadcc7] hover:border-[#f0bea0] p-3.5 rounded-xl transition cursor-pointer space-y-2.5 shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-black text-xs text-[#FF4E00]">#{order.orderNumber}</span>
                                <div className="flex items-center space-x-1 text-[10px] text-stone-500">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(order.createdAt || Date.now()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>

                              {isSuperAdmin && (
                                <div className="text-[10px] font-bold text-[#A32300] truncate">
                                  {order.businessName}
                                  {(() => {
                                    const locName = localities.find(
                                      (loc) => loc.id === businesses.find((b) => b.id === order.businessId)?.localityId,
                                    )?.name;
                                    return locName ? ` · ${locName}` : '';
                                  })()}
                                </div>
                              )}

                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-stone-900 truncate max-w-[130px]">{order.customerName}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-[#fff1e8] text-[#A32300] border border-[#f4d3b8]">
                                  {order.deliveryType === 'DELIVERY' ? '🛵 Domicilio' : '🛍️ Recogida'}
                                </span>
                              </div>

                              <div className="text-[11px] text-stone-600 space-y-0.5 border-t border-[#f0e2d5] pt-2">
                                {order.items.slice(0, 3).map((item, index) => (
                                  <div key={`${item.productId}-${index}`} className="space-y-0.5">
                                    <div className="flex justify-between truncate">
                                      <span className="truncate"><strong className="text-stone-900">{item.quantity}x</strong> {item.productName}</span>
                                    </div>
                                    {(item.selectedOptions || []).length > 0 && (
                                      <div className="truncate text-[10px] text-stone-500">
                                        {(item.selectedOptions || []).map((option) => option.optionName).join(', ')}
                                      </div>
                                    )}
                                    {(item.removedIngredients || []).length > 0 && (
                                      <div className="truncate text-[10px] text-red-500">
                                        Sin: {(item.removedIngredients || []).join(', ')}
                                      </div>
                                    )}
                                    {item.customerNote && (
                                      <div className="truncate text-[10px] italic text-stone-500">
                                        "{item.customerNote}"
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {order.items.length > 3 && (
                                  <div className="text-[10px] text-stone-500 italic">+{order.items.length - 3} platos más...</div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-[#f0e2d5] flex items-center justify-between">
                                <span className="font-mono font-black text-xs text-stone-900">{(order.totalCents / 100).toFixed(2)}€</span>

                                {column.id === 'nuevos' && (
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      updateOrderStatus(order.id, 'PREPARING', 'Comanda aceptada en cocina');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold transition"
                                  >
                                    Preparar
                                  </button>
                                )}

                                {column.id === 'preparacion' && (
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      updateOrderStatus(order.id, 'READY', 'Comanda terminada en fogones');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold transition"
                                  >
                                    Listo
                                  </button>
                                )}

                                {column.id === 'listos' && (
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      updateOrderStatus(order.id, 'PICKED_UP', 'Salida al repartidor');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition"
                                  >
                                    Salida
                                  </button>
                                )}

                                {column.id === 'entregados' && (
                                  <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Finalizado</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">CARTA Y COCINA</div>
                  <h2 className="text-2xl font-black text-stone-900">Gestión de Platos y Stock</h2>
                  <p className="text-xs text-stone-600 mt-0.5">Añade, edita o elimina platos del catálogo del local.</p>
                </div>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setNewBusinessModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#FF4E00] hover:bg-[#E64600] text-white text-xs font-bold px-4 py-2.5 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    CREAR UN NEGOCIO NUEVO
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
                <div className="@container min-w-0 bg-white rounded-2xl border border-[#eadcc7] overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-[#f0e2d5] flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
                    <span>Listado de Platos de {business.name}</span>
                    <span>{restaurantProducts.length} productos registrados</span>
                  </div>

                  <div className="divide-y divide-[#f3e8dd]">
                    {restaurantProducts.length === 0 ? (
                      <div className="p-6 text-center text-sm text-stone-600">Aún no hay productos en el catálogo de este negocio.</div>
                    ) : (
                      restaurantProducts.map((prod) => (
                        <div key={prod.id} className="p-4 flex flex-col @min-[480px]:flex-row @min-[480px]:items-center justify-between gap-3 hover:bg-[#fff7f2] transition">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                            <MediaView
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-12 h-12 rounded-xl border border-[#e9dac8]"
                    />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-stone-900 text-sm truncate">{prod.name}</div>
                              <div className="text-xs text-stone-600 line-clamp-1 max-w-md">{prod.description}</div>
                              <div className="font-mono font-bold text-xs text-[#FF4E00] mt-0.5">{(prod.priceCents / 100).toFixed(2)}€</div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditProduct(prod)}
                              className="inline-flex h-11 w-11 shrink-0 items-center justify-center p-0 rounded-lg bg-stone-800 text-stone-300 hover:text-white transition cursor-pointer"
                              aria-label="Editar producto"
                            >
                              <Edit3 className="w-4 h-4 shrink-0" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteProductFromBusiness(prod.id)}
                              className="inline-flex h-11 w-11 shrink-0 items-center justify-center p-0 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition cursor-pointer"
                              aria-label="Eliminar producto"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                            </button>
                            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
                              <span className={`whitespace-nowrap text-xs font-bold ${prod.isAvailable ? 'text-emerald-600' : 'text-stone-500'}`}>
                                {prod.isAvailable ? 'En Carta' : 'Agotado'}
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={prod.isAvailable}
                                aria-label={`Disponibilidad de ${prod.name}`}
                                onClick={() => toggleProductAvailability(prod.id)}
                                className="inline-flex h-11 w-12 shrink-0 items-center justify-center p-0 cursor-pointer"
                              >
                                <span className={`flex h-6 w-12 items-center rounded-full p-1 transition-colors ${prod.isAvailable ? 'bg-emerald-600 justify-end' : 'bg-stone-800 justify-start'}`}>
                                  <span className="w-4 h-4 shrink-0 rounded-full bg-white shadow-md block"></span>
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-[#fffaf5] rounded-2xl border border-[#eadcc7] p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-stone-900">{editingProductId ? 'Editar producto' : 'Añadir nuevo producto'}</h3>
                    {editingProductId && (
                      <button
                        type="button"
                        onClick={resetCatalogForm}
                        className="text-xs text-stone-500 hover:text-stone-900 flex items-center space-x-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancelar</span>
                      </button>
                    )}
                  </div>

                  {currentUser?.role === 'SUPERADMIN' && (
                    <button
                      type="button"
                      onClick={() => setCategoryManagerOpen(true)}
                      className="mb-3 w-full rounded-xl border border-dashed border-[#e6d7c5] bg-[#fffaf4] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#A32300] hover:border-[#FF4E00] hover:bg-[#fff2eb] transition"
                    >
                      Gestionar categorías
                    </button>
                  )}

                  <form onSubmit={handleCatalogSubmit} className="space-y-3 text-sm">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Nombre</label>
                      <input
                        value={catalogForm.name}
                        onChange={(event) => setCatalogForm((prev) => ({ ...prev, name: event.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="Ej. Hamburguesa Valleña"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Descripción</label>
                      <textarea
                        value={catalogForm.description}
                        onChange={(event) => setCatalogForm((prev) => ({ ...prev, description: event.target.value }))}
                        rows={3}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="Describe el plato..."
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Etiqueta</label>
                      <input
                        value={catalogForm.tag}
                        onChange={(event) => setCatalogForm((prev) => ({ ...prev, tag: event.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="Ej. Bestseller, Veggie, Top Ventas"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Categoría</label>
                      <select
                        value={catalogForm.categoryId}
                        onChange={(event) => setCatalogForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                      >
                        <option value="" disabled>Selecciona una categoría</option>
                        {categoryOptions.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Precio en €</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={catalogForm.priceCents}
                        onChange={(event) => setCatalogForm((prev) => ({ ...prev, priceCents: event.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Ingredientes</label>
                      <input
                        value={catalogForm.ingredients}
                        onChange={(event) => setCatalogForm((prev) => ({ ...prev, ingredients: event.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="Lechuga, tomate, queso"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Ingredientes que se pueden quitar</label>
                      <input
                        value={catalogForm.removableIngredients}
                        onChange={(event) => setCatalogForm((prev) => ({ ...prev, removableIngredients: event.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="Queso, cebolla, aguacate"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Ingredientes adicionales (nombre: precio)</label>
                      <input
                        value={catalogForm.additionalIngredients}
                        onChange={(event) => setCatalogForm((prev) => ({ ...prev, additionalIngredients: event.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="Bacon: 1.20, Huevo: 0.80, Salsa extra: 0.50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Subir una imagen del producto</label>
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          accept={MEDIA_ACCEPT}
                          onChange={handleProductImageUpload}
                          className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner file:mr-3 file:rounded-md file:border-0 file:bg-[#FF4E00] file:text-white file:px-2 file:py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Pega aquí una URL de imagen…"
                          value={catalogImageUrlText}
                          onChange={(e) => setCatalogImageUrlText(e.target.value)}
                          onBlur={() => handleProductUrlPaste(catalogImageUrlText, setCatalogImageUrlText)}
                          className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner text-xs"
                        />
                      </div>
                      <MediaView
                        src={catalogForm.imageUrl || undefined}
                        alt={catalogForm.name}
                        className="mt-2 w-full h-24 rounded-xl border border-[#e6d7c5]"
                        showLoading
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Alérgenos</label>
                      <input
                        value={catalogForm.allergens}
                        onChange={(event) => setCatalogForm((prev) => ({ ...prev, allergens: event.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="Gluten, Lactosa..."
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-stone-700">Visible en la carta</label>
                      <button
                        type="button"
                        onClick={() => setCatalogForm((prev) => ({ ...prev, isAvailable: !prev.isAvailable }))}
                        className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center cursor-pointer ${
                          catalogForm.isAvailable ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow-md block"></span>
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF4E00] hover:bg-[#E64600] text-white text-sm font-black uppercase tracking-wide px-4 py-2.5 transition"
                    >
                      {editingProductId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editingProductId ? 'Guardar cambios' : 'Añadir producto'}
                    </button>
                  </form>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#eadcc7] overflow-hidden shadow-sm">
                <div className="p-4 border-b border-[#f0e2d5] flex items-center justify-between text-xs text-stone-600">
                  <span className="font-bold text-stone-800 text-sm">Negocios de la misma zona</span>
                  <span>{selectedLocality?.name || 'Sin localidad'}</span>
                </div>

                <div className="divide-y divide-[#f3e8dd]">
                  {localityBusinesses.length === 0 ? (
                    <div className="p-6 text-center text-sm text-stone-600">No hay negocios registrados en esta localidad.</div>
                  ) : (
                    localityBusinesses.map((biz) => (
                      <button
                        type="button"
                        key={biz.id}
                        onClick={() => {
                          setSelectedBusinessId(biz.id);
                          setEditingProductId(null);
                          setCatalogForm({
                            name: '',
                            description: '',
                            tag: '',
                            ingredients: '',
                            removableIngredients: '',
                            additionalIngredients: '',
                            priceCents: '0',
                            imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
                            categoryId: categories.some((category) => category.id === biz.category)
                              ? biz.category
                              : categories[0]?.id || '',
                            isAvailable: true,
                            allergens: '',
                          });
                        }}
                        className={`w-full p-4 flex items-center justify-between gap-4 text-left transition cursor-pointer ${
                          biz.id === business.id ? 'bg-orange-50/60' : 'hover:bg-[#fff7f2]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-stone-900 text-sm truncate">{biz.name}</div>
                          <div className="text-xs text-stone-500 truncate">{biz.address}</div>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                          biz.isShiftOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {biz.isShiftOpen ? 'Abierto' : 'Cerrado'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <ProjectLogo variant="badge" className="h-12 w-auto max-w-[180px] shrink-0" />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Resumen diario</div>
                  <h2 className="text-xl font-black text-stone-900">Estadísticas PideTiétar</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Ventas totales para llevar</div>
                  <div className="mt-2 text-2xl font-black text-stone-900">{(deliverySalesCents / 100).toFixed(2)}€</div>
                </div>
                <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Ventas totales para recoger</div>
                  <div className="mt-2 text-2xl font-black text-stone-900">{(pickupSalesCents / 100).toFixed(2)}€</div>
                </div>
                <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total de Tickets</div>
                  <div className="mt-2 text-2xl font-black text-stone-900">{businessOrders.length}</div>
                </div>
                <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Ticket promedio</div>
                  <div className="mt-2 text-2xl font-black text-stone-900">{(averageTicketCents / 100).toFixed(2)}€</div>
                </div>
                <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total de Ventas</div>
                  <div className="mt-2 text-2xl font-black text-stone-900">{(totalSalesCents / 100).toFixed(2)}€</div>
                </div>
                <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Tickets activos</div>
                  <div className="mt-2 text-2xl font-black text-stone-900">{activeUnfinishedOrders.length}</div>
                </div>
                <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm xl:col-span-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Producto más vendido</div>
                  <div className="mt-2 text-xl font-black text-stone-900">{topProduct ? topProduct.name : 'Sin ventas'}</div>
                  <div className="mt-1 text-xs text-stone-500">{topProduct ? `${topProduct.quantity} unidades` : 'Aún no hay datos'}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="rounded-2xl bg-white border border-stone-200 p-6 shadow-sm">
              <h3 className="text-xl font-black text-stone-900">Equipo y turnos</h3>
              <p className="mt-2 text-sm text-stone-600">Turno del local: {business.isShiftOpen ? 'Abierto' : 'Cerrado'}</p>
              <div className="mt-4 space-y-3 text-sm text-stone-700">
                <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3"><span>Responsable</span><span>{currentUser?.name || 'Sin asignar'}</span></div>
                <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3"><span>Localidad</span><span>{selectedLocality?.name || 'Sin localidad'}</span></div>
                <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3"><span>Pedidos pendientes</span><span>{activeUnfinishedOrders.length}</span></div>
              </div>

              <div className="mt-6 border-t border-stone-200 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                      <Bike className="h-4 w-4 text-[#FF4E00]" />
                      Repartidores del negocio
                    </h4>
                    <p className="mt-1 text-xs text-stone-500">
                      Crea sus cuentas y confírmalas para que puedan acceder al panel de reparto.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshCouriers()}
                    className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
                  >
                    Actualizar
                  </button>
                </div>

                <form onSubmit={handleCreateBusinessCourier} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-500">Nombre completo</label>
                    <input
                      value={courierForm.fullName}
                      onChange={(e) => setCourierForm({ ...courierForm, fullName: e.target.value })}
                      className={fieldClass('w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-black outline-none focus:border-[#FF4E00] placeholder-stone-400', Boolean(courierFormErrors.fullName))}
                      placeholder="Ej. Javier Adrada"
                    />
                    <FieldError message={courierFormErrors.fullName} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-500">Usuario de acceso</label>
                    <input
                      value={courierForm.username}
                      onChange={(e) => setCourierForm({ ...courierForm, username: e.target.value })}
                      className={fieldClass('w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-black outline-none focus:border-[#FF4E00] placeholder-stone-400', Boolean(courierFormErrors.username))}
                      placeholder="ej. javier.adrada"
                    />
                    <FieldError message={courierFormErrors.username} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-500">Email</label>
                    <input
                      type="email"
                      value={courierForm.email}
                      onChange={(e) => setCourierForm({ ...courierForm, email: e.target.value })}
                      className={fieldClass('w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-black outline-none focus:border-[#FF4E00] placeholder-stone-400', Boolean(courierFormErrors.email))}
                      placeholder="repartidor@negocio.com"
                    />
                    <FieldError message={courierFormErrors.email} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-500">Clave inicial</label>
                    <SensitiveInput
                      type="password"
                      value={courierForm.password}
                      onChange={(e) => setCourierForm({ ...courierForm, password: e.target.value })}
                      className={fieldClass('w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-black outline-none focus:border-[#FF4E00] placeholder-stone-400', Boolean(courierFormErrors.password))}
                      placeholder="Mínimo 8 caracteres"
                      toggleLabel="clave"
                    />
                    <FieldError message={courierFormErrors.password} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-500">Teléfono</label>
                    <input
                      type="tel"
                      value={courierForm.phone}
                      onChange={(e) => setCourierForm({ ...courierForm, phone: e.target.value })}
                      className={fieldClass('w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-black outline-none focus:border-[#FF4E00] placeholder-stone-400', Boolean(courierFormErrors.phone))}
                      placeholder="+34 600 000 000"
                    />
                    <FieldError message={courierFormErrors.phone} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-500">DNI / NIE</label>
                    <input
                      value={courierForm.dni}
                      onChange={(e) => setCourierForm({ ...courierForm, dni: e.target.value.toUpperCase() })}
                      className={fieldClass('w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-black outline-none focus:border-[#FF4E00] placeholder-stone-400 uppercase', Boolean(courierFormErrors.dni))}
                      placeholder="12345678Z"
                    />
                    <p className="mt-1 text-[10px] text-stone-400">
                      DNI (8 dígitos + letra) o NIE (X/Y/Z + 7 dígitos + letra).
                    </p>
                    <FieldError message={courierFormErrors.dni} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-stone-500">Dirección</label>
                    <input
                      value={courierForm.address}
                      onChange={(e) => setCourierForm({ ...courierForm, address: e.target.value })}
                      className={fieldClass('w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-black outline-none focus:border-[#FF4E00] placeholder-stone-400', Boolean(courierFormErrors.address))}
                      placeholder="Calle, número, código postal y localidad"
                      autoComplete="street-address"
                    />
                    <FieldError message={courierFormErrors.address} />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={courierSubmitting}
                      className="flex items-center space-x-2 rounded-xl bg-[#FF4E00] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#E64600] disabled:opacity-60"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{courierSubmitting ? 'Creando cuenta...' : 'Crear repartidor'}</span>
                    </button>
                  </div>
                </form>

                <div className="mt-4 divide-y divide-stone-100">
                  {couriers.length === 0 ? (
                    <p className="py-3 text-xs text-stone-400">
                      {couriersLoading ? 'Cargando repartidores...' : 'Este negocio todavía no tiene repartidores.'}
                    </p>
                  ) : (
                    couriers.map((courier) => {
                      const confirmation = courier.courierProfile?.confirmation || 'PENDING';

                      return (
                        <div key={courier.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-stone-800">{courier.name}</p>
                            <p className="text-xs text-stone-500">{courier.email}</p>
                            <p className="mt-0.5 text-xs text-stone-400">
                              {courier.phone || 'Sin teléfono'} ·{' '}
                              {courier.dni ? `DNI/NIE ${courier.dni}` : 'Sin DNI/NIE'}
                            </p>
                          </div>
                          {confirmation === 'PENDING' ? (
                            <button
                              type="button"
                              onClick={() => void handleConfirmBusinessCourier(courier)}
                              className="flex items-center space-x-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Confirmar</span>
                            </button>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
                              {confirmation === 'SUPERADMIN' ? 'Confirmado por superadmin' : 'Confirmado por el negocio'}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {newOrderModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-[#171412] border border-stone-700 rounded-[28px] w-full max-w-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700/80">
              <h3 className="text-2xl font-black text-stone-50">Nuevo pedido</h3>
              <button onClick={() => setNewOrderModal(false)} className="text-stone-300 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-4 p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  value={manualCustomerName}
                  onChange={(event) => setManualCustomerName(event.target.value)}
                  placeholder="Nombre del cliente"
                  className="rounded-xl border border-stone-700 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-50 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                />
                <input
                  value={manualPhone}
                  onChange={(event) => setManualPhone(event.target.value)}
                  placeholder="Teléfono *"
                  className="rounded-xl border border-stone-700 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-50 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setManualDeliveryType('PICKUP')}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition ${manualDeliveryType === 'PICKUP' ? 'bg-[#FF4E00] text-white shadow-lg shadow-[#FF4E00]/30' : 'bg-stone-800 text-stone-200 border border-stone-700'}`}
                >
                  Recogida
                </button>
                <button
                  type="button"
                  onClick={() => setManualDeliveryType('DELIVERY')}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition ${manualDeliveryType === 'DELIVERY' ? 'bg-[#FF4E00] text-white shadow-lg shadow-[#FF4E00]/30' : 'bg-stone-800 text-stone-200 border border-stone-700'}`}
                >
                  Para llevar
                </button>
              </div>

              {manualDeliveryType === 'DELIVERY' && (
                <input
                  value={manualAddress}
                  onChange={(event) => setManualAddress(event.target.value)}
                  placeholder="Dirección de entrega *"
                  className="w-full rounded-xl border border-stone-700 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-50 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                  required
                />
              )}

              <input
                value={manualTableNumber}
                onChange={(event) => setManualTableNumber(event.target.value)}
                placeholder="Mesa o referencia (opcional)"
                className="w-full rounded-xl border border-stone-700 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-50 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
              />

              <div className="border border-stone-700 bg-stone-900/40 rounded-2xl p-3">
                <div className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-stone-300">Productos</div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {restaurantProducts.length === 0 ? (
                    <div className="text-sm text-stone-400">No hay productos activos en este negocio.</div>
                  ) : (
                    restaurantProducts.map((prod) => (
                      <button
                        type="button"
                        key={prod.id}
                        onClick={() => openManualCustomizer(prod)}
                        className="w-full flex items-center justify-between gap-3 rounded-xl border border-stone-700 bg-stone-950/70 p-2.5 hover:border-[#FF4E00] hover:bg-[#1e140f] transition text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <MediaView
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-12 h-12 rounded-xl border border-stone-700"
                        />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-stone-100 truncate">{prod.name}</div>
                            <div className="text-xs text-stone-400">{(prod.priceCents / 100).toFixed(2)}€</div>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FF4E00] text-white text-xs font-bold px-3 py-1.5 shrink-0">
                          <Plus className="w-3.5 h-3.5" />
                          Añadir
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="border border-stone-700 bg-stone-900/40 rounded-2xl p-3">
                <div className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-stone-300">Líneas de la comanda</div>
                {manualSelectedItems.length === 0 ? (
                  <div className="text-sm text-stone-400">Aún no has añadido ningún plato personalizado.</div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {manualSelectedItems.map((line) => (
                      <div key={line.lineId} className="p-3 rounded-xl bg-stone-950/70 border border-stone-700 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-stone-100 truncate">{line.product.name}</div>
                          <div className="text-xs font-mono font-medium text-[#FFB483]">
                            {((line.unitPriceCents * line.quantity) / 100).toFixed(2)}€
                          </div>
                          {line.selectedOptions.length > 0 && (
                            <div className="text-[11px] text-stone-400 mt-1">
                              {line.selectedOptions.map((o) => o.optionName).join(', ')}
                            </div>
                          )}
                          {line.removedIngredients.length > 0 && (
                            <div className="text-[10px] text-red-300 mt-0.5">Sin: {line.removedIngredients.join(', ')}</div>
                          )}
                          {line.customerNote && (
                            <div className="text-[11px] italic text-stone-400 mt-1">"{line.customerNote}"</div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button type="button" onClick={() => updateManualLineQuantity(line.lineId, -1)} className="w-7 h-7 rounded-md bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-100">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-stone-100 min-w-4 text-center">{line.quantity}</span>
                          <button type="button" onClick={() => updateManualLineQuantity(line.lineId, 1)} className="w-7 h-7 rounded-md bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-100">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => removeManualLine(line.lineId)} className="text-stone-400 hover:text-red-400 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-2 border-t border-stone-700 text-sm font-bold text-stone-100">
                      <span>Total comanda</span>
                      <span className="font-mono">
                        {(manualSelectedItems.reduce((acc, line) => acc + line.unitPriceCents * line.quantity, 0) / 100).toFixed(2)}€
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setNewOrderModal(false)} className="rounded-xl border border-stone-700 bg-stone-800 text-stone-200 px-4 py-2.5 font-semibold transition hover:bg-stone-700">Cancelar</button>
                <button type="submit" className="rounded-xl bg-[#FF4E00] text-white px-4 py-2.5 font-bold transition hover:bg-[#e94500] shadow-lg shadow-[#FF4E00]/20">Guardar pedido</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {manualCustomizerProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="relative h-40 shrink-0">
            <MediaView
              src={manualCustomizerProduct.imageUrl}
              alt={manualCustomizerProduct.name}
              className="w-full h-full"
            />
              <button
                type="button"
                onClick={closeManualCustomizer}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              <div>
                <h3 className="text-lg font-black text-stone-900">{manualCustomizerProduct.name}</h3>
                <p className="text-xs text-stone-500 mt-1">{manualCustomizerProduct.description}</p>
                <div className="mt-2 text-base font-mono font-bold text-[#A32300]">
                  {((manualCustomizerProduct.priceCents + manualCustomizerOptions.reduce((acc, o) => acc + o.priceCents, 0)) / 100).toFixed(2)}€
                </div>
              </div>

              {manualCustomizerProduct.removableIngredients && manualCustomizerProduct.removableIngredients.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">¿Deseas quitar algún ingrediente?</label>
                  <div className="flex flex-wrap gap-2">
                    {manualCustomizerProduct.removableIngredients.map((ing) => {
                      const isRemoved = manualCustomizerRemoved.includes(ing);
                      return (
                        <button
                          type="button"
                          key={ing}
                          onClick={() => toggleManualRemovable(ing)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                            isRemoved ? 'border-red-400 bg-red-50 text-red-700' : 'border-stone-200 bg-stone-50 text-stone-700'
                          }`}
                        >
                          {isRemoved && <X className="w-3.5 h-3.5 text-red-500" />}
                          <span>{isRemoved ? `Sin ${ing}` : `Quitar ${ing}`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {buildEffectiveOptionGroups(manualCustomizerProduct).map((grp) => {
                const isMulti = grp.maxChoices > 1;
                const isExtras = grp.id === 'synthetic-additional-ingredients';
                const isMeatDoneness = grp.id === 'synthetic-meat-doneness';

                return (
                  <div key={grp.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-700">{grp.name}</label>
                      <span className="text-[11px] text-stone-400">{grp.required ? 'Obligatorio' : 'Opcional'}</span>
                    </div>

                    {isExtras && (
                      <p className="text-[11px] text-stone-400">Elige los que quieras: su precio se suma al total.</p>
                    )}
                    {isMeatDoneness && (
                      <p className="text-[11px] text-stone-400">Indícanos cómo quieres que cocinemos la carne.</p>
                    )}

                    <div className="grid grid-cols-1 gap-2">
                      {grp.options.map((opt) => {
                        const isSelected = manualCustomizerOptions.some((o) => o.groupName === grp.name && o.optionName === opt.name);
                        return (
                          <button
                            type="button"
                            key={opt.id}
                            onClick={() => selectManualOption(grp.name, opt.name, opt.priceCents, isMulti)}
                            className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition ${
                              isSelected ? 'border-[#FF4E00] bg-orange-50/50 text-[#A32300]' : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 border flex items-center justify-center ${isMulti ? 'rounded-md' : 'rounded-full'} ${isSelected ? 'border-[#FF4E00] bg-[#FF4E00] text-white' : 'border-stone-400'}`}>
                                {isSelected && <Check className="w-2.5 h-2.5" />}
                              </div>
                              <span>{opt.name}</span>
                            </div>
                            {opt.priceCents > 0 && <span className="font-mono text-stone-500 font-semibold">+{(opt.priceCents / 100).toFixed(2)}€</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">Instrucciones para la cocina (máx. 250 car.)</label>
                <textarea
                  value={manualCustomizerNote}
                  maxLength={250}
                  onChange={(event) => setManualCustomizerNote(event.target.value)}
                  placeholder="Ejemplo: Bien tostado, salsa aparte..."
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                  rows={2}
                />
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-stone-200">
                <button type="button" onClick={() => setManualCustomizerQuantity((q) => Math.max(1, q - 1))} className="text-stone-500 hover:text-stone-900">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-stone-900 text-sm min-w-5 text-center">{manualCustomizerQuantity}</span>
                <button type="button" onClick={() => setManualCustomizerQuantity((q) => q + 1)} className="text-stone-500 hover:text-stone-900">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={confirmManualCustomization}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-[#FF4E00] to-[#A32300] hover:from-[#e04500] hover:to-[#8c1e00] text-white font-bold rounded-xl text-sm transition shadow-md flex items-center justify-between"
              >
                <span>Añadir a la comanda</span>
                <span className="font-mono text-base">
                  {(((manualCustomizerProduct.priceCents + manualCustomizerOptions.reduce((acc, o) => acc + o.priceCents, 0)) * manualCustomizerQuantity) / 100).toFixed(2)}€
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-stone-900">Configuración del administrador</h3>
              <button onClick={() => setSettingsModal(false)} className="text-stone-500 hover:text-stone-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
                <MediaView
                  src={userSettingsForm.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                  alt="Avatar del administrador"
                  className="block w-14 h-14 rounded-full border-2 border-[#e7d5c7] bg-stone-100"
                  style={{ borderRadius: '9999px' }}
                  fit="cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Avatar</div>
                  <div className="mt-1 block w-full">
                    <input
                      type="file"
                      accept={MEDIA_ACCEPT}
                      onChange={handleUserAvatarUpload}
                      className="text-xs text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#FF4E00] file:px-2 file:py-1.5 file:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Pega aquí una URL de avatar…"
                      value={userSettingsAvatarUrlText}
                      onChange={(e) => setUserSettingsAvatarUrlText(e.target.value)}
                      onBlur={() => handleUserAvatarUrlPaste(userSettingsAvatarUrlText, setUserSettingsAvatarUrlText)}
                      className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner text-xs mt-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Nombre</label>
                <input
                  value={userSettingsForm.name}
                  onChange={(event) => setUserSettingsForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Email</label>
                <input
                  type="email"
                  value={userSettingsForm.email}
                  onChange={(event) => setUserSettingsForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Contraseña</label>
                <SensitiveInput
                  type="password"
                  value={userSettingsForm.password}
                  onChange={(event) => setUserSettingsForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                  placeholder="Nueva contraseña"
                  toggleLabel="contraseña"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Teléfono</label>
                <input
                  value={userSettingsForm.phone}
                  onChange={(event) => setUserSettingsForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setSettingsModal(false)} className="rounded-xl bg-stone-100 text-stone-700 px-4 py-2 font-semibold">Cerrar</button>
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) return;
                  // Sólo se envía la contraseña si el usuario escribe una nueva
                  // en el campo. Antes el spread de currentUser arrastraba la
                  // clave por defecto del usuario mock ("admin123") y la
                  // sustituía por la real sin avisar.
                  const newPassword = userSettingsForm.password.trim();
                  const { password: _ignoredPassword, ...restUser } = currentUser;
                  void _ignoredPassword;
                  updateCurrentUserProfile({
                    ...restUser,
                    name: userSettingsForm.name.trim() || currentUser.name,
                    email: userSettingsForm.email.trim() || currentUser.email,
                    phone: userSettingsForm.phone.trim() || currentUser.phone,
                    avatarUrl: userSettingsForm.avatarUrl.trim() || currentUser.avatarUrl,
                    ...(newPassword ? { password: newPassword } : {}),
                  });
                  setSettingsModal(false);
                }}
                className="rounded-xl bg-[#FF4E00] text-white px-4 py-2 font-semibold hover:bg-[#E64600]"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {businessDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black text-stone-900">Datos del negocio</h3>
                <p className="mt-0.5 text-xs text-stone-500">
                  La cuenta bancaria (IBAN) es la cuenta donde la plataforma de pago ingresará los cobros de tus pedidos.
                </p>
              </div>
              <button onClick={() => setBusinessDataModal(false)} className="text-stone-500 hover:text-stone-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 border-t border-stone-200" />

            {(() => {
              const visibleKeys = ['name', 'legalName', 'cif', 'accountNumber', 'phone', 'email', 'address', 'managerName', 'managerDni'];
              const summaryError = Object.entries(businessDataErrors).find(([key]) => !visibleKeys.includes(key))?.[1];
              return summaryError ? (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
                  {summaryError}
                </div>
              ) : null;
            })()}

            <form onSubmit={handleSaveBusinessData} className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">Nombre comercial *</label>
                <input
                  value={businessDataForm.name}
                  onChange={(event) => setBusinessDataForm({ ...businessDataForm, name: event.target.value })}
                  className={fieldClass('w-full rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-900 outline-none focus:border-[#FF4E00]', Boolean(businessDataErrors.name))}
                />
                <FieldError message={businessDataErrors.name} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">Razón social</label>
                <input
                  value={businessDataForm.legalName}
                  onChange={(event) => setBusinessDataForm({ ...businessDataForm, legalName: event.target.value })}
                  className={fieldClass('w-full rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-900 outline-none focus:border-[#FF4E00]', Boolean(businessDataErrors.legalName))}
                />
                <FieldError message={businessDataErrors.legalName} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">CIF / NIF</label>
                <input
                  value={businessDataForm.cif}
                  onChange={(event) => setBusinessDataForm({ ...businessDataForm, cif: event.target.value.toUpperCase() })}
                  placeholder="B12345678"
                  className={fieldClass('w-full rounded-xl border border-stone-200 px-4 py-2 text-sm uppercase text-stone-900 outline-none focus:border-[#FF4E00]', Boolean(businessDataErrors.cif))}
                />
                <FieldError message={businessDataErrors.cif} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">Cuenta bancaria (IBAN)</label>
                <SensitiveInput
                  type="text"
                  value={businessDataForm.accountNumber}
                  onChange={(event) => setBusinessDataForm({ ...businessDataForm, accountNumber: event.target.value })}
                  placeholder="ES91 2100 0418 4502 0005 1332"
                  className={fieldClass('w-full rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-900 outline-none focus:border-[#FF4E00]', Boolean(businessDataErrors.accountNumber))}
                  toggleLabel="IBAN"
                />
                <p className="mt-1 text-[11px] text-stone-500">Obligatoria para conectar la pasarela de pago y recibir los ingresos.</p>
                <FieldError message={businessDataErrors.accountNumber} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">Teléfono</label>
                  <input
                    value={businessDataForm.phone}
                    onChange={(event) => setBusinessDataForm({ ...businessDataForm, phone: event.target.value })}
                    className={fieldClass('w-full rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-900 outline-none focus:border-[#FF4E00]', Boolean(businessDataErrors.phone))}
                  />
                  <FieldError message={businessDataErrors.phone} />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">Email de contacto</label>
                  <input
                    type="email"
                    value={businessDataForm.email}
                    onChange={(event) => setBusinessDataForm({ ...businessDataForm, email: event.target.value })}
                    className={fieldClass('w-full rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-900 outline-none focus:border-[#FF4E00]', Boolean(businessDataErrors.email))}
                  />
                  <FieldError message={businessDataErrors.email} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">Dirección *</label>
                <input
                  value={businessDataForm.address}
                  onChange={(event) => setBusinessDataForm({ ...businessDataForm, address: event.target.value })}
                  className={fieldClass('w-full rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-900 outline-none focus:border-[#FF4E00]', Boolean(businessDataErrors.address))}
                />
                <FieldError message={businessDataErrors.address} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">Responsable</label>
                  <input
                    value={businessDataForm.managerName}
                    onChange={(event) => setBusinessDataForm({ ...businessDataForm, managerName: event.target.value })}
                    className={fieldClass('w-full rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-900 outline-none focus:border-[#FF4E00]', Boolean(businessDataErrors.managerName))}
                  />
                  <FieldError message={businessDataErrors.managerName} />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">DNI del responsable</label>
                  <input
                    value={businessDataForm.managerDni}
                    onChange={(event) => setBusinessDataForm({ ...businessDataForm, managerDni: event.target.value.toUpperCase() })}
                    className={fieldClass('w-full rounded-xl border border-stone-200 px-4 py-2 text-sm uppercase text-stone-900 outline-none focus:border-[#FF4E00]', Boolean(businessDataErrors.managerDni))}
                  />
                  <FieldError message={businessDataErrors.managerDni} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBusinessDataModal(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-stone-600 transition hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={businessDataSaving}
                  className="rounded-xl bg-[#FF4E00] px-4 py-2 font-semibold text-white transition hover:bg-[#E64600] disabled:opacity-60"
                >
                  {businessDataSaving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {newBusinessModalOpen && currentUser?.role === 'SUPERADMIN' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black text-stone-900">Crear negocio nuevo</h3>
                <p className="text-xs text-stone-500 mt-0.5">Completa todos los datos del comercio y deja listo el catálogo inicial.</p>
              </div>
              <button onClick={() => setNewBusinessModalOpen(false)} className="text-stone-500 hover:text-stone-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-t border-stone-200 my-4" />

            <form onSubmit={handleCreateBusiness} className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Nombre del negocio</label>
                  <input
                    value={newBusinessForm.name}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Ej. La Bodeguita del Valle"
                    className={fieldClass(
                      'w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner',
                      Boolean(businessFormErrors.name),
                    )}
                  />
                  <FieldError message={businessFormErrors.name} />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Razón social</label>
                  <input
                    value={newBusinessForm.legalName}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, legalName: event.target.value }))}
                    placeholder="Ej. La Bodeguita del Valle SL"
                    className={fieldClass(
                      'w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner',
                      Boolean(businessFormErrors.legalName),
                    )}
                  />
                  <FieldError message={businessFormErrors.legalName} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">CIF</label>
                  <input
                    value={newBusinessForm.cif}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, cif: event.target.value }))}
                    placeholder="B12345678"
                    className={fieldClass(
                      'w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner',
                      Boolean(businessFormErrors.cif),
                    )}
                  />
                  <p className="mt-1 text-[11px] text-stone-500">
                    Letra + 7 dígitos + control, 8 dígitos + letra o NIE (X/Y/Z…).
                  </p>
                  <FieldError message={businessFormErrors.cif} />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Categoría</label>
                  <select
                    value={newBusinessForm.category}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, category: event.target.value }))}
                    className={fieldClass(
                      'w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner',
                      Boolean(businessFormErrors.category),
                    )}
                  >
                    <option value="" disabled>Selecciona una categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <FieldError message={businessFormErrors.category} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] uppercase tracking-wider text-stone-600">Zona</label>
                    <button
                      type="button"
                      onClick={() => setZoneManagerOpen(true)}
                      className="text-[11px] font-bold text-[#FF4E00] hover:underline"
                    >
                      Gestionar zonas
                    </button>
                  </div>
                  <select
                    required
                    value={newBusinessForm.localityId}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, localityId: event.target.value }))}
                    className={fieldClass(
                      'w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner',
                      Boolean(businessFormErrors.localityId),
                    )}
                  >
                    <option value="">Seleccionar...</option>
                    {localities.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                  {localities.length === 0 && (
                    <p className="mt-1 text-[11px] text-amber-600">
                      No hay zonas creadas. Usa «Gestionar zonas» antes de registrar el negocio.
                    </p>
                  )}
                  <FieldError message={businessFormErrors.localityId} />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Teléfono</label>
                  <input
                    value={newBusinessForm.phone}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="+34 600 000 000"
                    className={fieldClass(
                      'w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner',
                      Boolean(businessFormErrors.phone),
                    )}
                  />
                  <FieldError message={businessFormErrors.phone} />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Dirección</label>
                <input
                  value={newBusinessForm.address}
                  onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, address: event.target.value }))}
                  placeholder="Calle Mayor 12, 05420 Sotillo de la Adrada"
                  className={fieldClass(
                    'w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner',
                    Boolean(businessFormErrors.address),
                  )}
                />
                <FieldError message={businessFormErrors.address} />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Email</label>
                <input
                  value={newBusinessForm.email}
                  onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="contacto@negocio.es"
                  className={fieldClass(
                    'w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner',
                    Boolean(businessFormErrors.email),
                  )}
                />
                <FieldError message={businessFormErrors.email} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Persona responsable</label>
                  <input
                    value={newBusinessForm.managerName}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, managerName: event.target.value }))}
                    placeholder="Ej. María López"
                    className={fieldClass(
                      'w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner',
                      Boolean(businessFormErrors.managerName),
                    )}
                  />
                  <FieldError message={businessFormErrors.managerName} />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">DNI / NIE responsable</label>
                  <input
                    value={newBusinessForm.managerDni}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, managerDni: event.target.value }))}
                    placeholder="12345678Z"
                    className={fieldClass(
                      'w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner uppercase',
                      Boolean(businessFormErrors.managerDni),
                    )}
                  />
                  <p className="mt-1 text-[11px] text-stone-500">
                    8 dígitos y la letra (12345678Z) o NIE (X1234567L).
                  </p>
                  <FieldError message={businessFormErrors.managerDni} />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Nº de cuenta (IBAN)</label>
                <SensitiveInput
                  type="text"
                  value={newBusinessForm.accountNumber}
                  onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, accountNumber: event.target.value }))}
                  placeholder="ES9121000418450200051332"
                  className={fieldClass(
                    'w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner',
                    Boolean(businessFormErrors.accountNumber),
                  )}
                  toggleLabel="IBAN"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Opcional. Formato IBAN: ES + 20 dígitos (sin espacios ni letras).
                </p>
                <FieldError message={businessFormErrors.accountNumber} />
              </div>

              <div className="space-y-3 rounded-2xl border border-[#eadcc7] bg-[#fffaf5] p-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-stone-600 font-bold">Acceso del propietario</div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Sólo se guarda el usuario y la clave que escribes aquí: no se genera nada de forma
                    automática. Se crea junto al negocio en el mismo paso y el propietario puede
                    cambiar la contraseña desde su perfil.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Usuario</label>
                    <input
                      value={newBusinessForm.adminUsername}
                      onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, adminUsername: event.target.value }))}
                      placeholder="bodeguita"
                      className={fieldClass(
                        'w-full rounded-xl bg-white border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner',
                        Boolean(businessFormErrors.adminUsername),
                      )}
                    />
                    <FieldError message={businessFormErrors.adminUsername} />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Email de acceso</label>
                    <input
                      type="email"
                      value={newBusinessForm.adminEmail}
                      onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, adminEmail: event.target.value }))}
                      placeholder="dueno@negocio.es"
                      className={fieldClass(
                        'w-full rounded-xl bg-white border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner',
                        Boolean(businessFormErrors.adminEmail),
                      )}
                    />
                    <FieldError message={businessFormErrors.adminEmail} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Contraseña temporal</label>
                  <SensitiveInput
                    type="password"
                    value={newBusinessForm.adminPassword}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, adminPassword: event.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                    className={fieldClass(
                      'w-full rounded-xl bg-white border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner',
                      Boolean(businessFormErrors.adminPassword),
                    )}
                    toggleLabel="clave"
                  />
                  <FieldError message={businessFormErrors.adminPassword} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Gasto de envío (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newBusinessForm.deliveryFeeCents}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, deliveryFeeCents: event.target.value }))}
                    className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Tiempo estimado min</label>
                  <input
                    type="number"
                    min="0"
                    value={newBusinessForm.estimatedTimeMin}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, estimatedTimeMin: event.target.value }))}
                    className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Tiempo estimado max</label>
                <input
                  type="number"
                  min="0"
                  value={newBusinessForm.estimatedTimeMax}
                  onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, estimatedTimeMax: event.target.value }))}
                  className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                />
              </div>

              <div className="space-y-3 rounded-2xl border border-[#eadcc7] bg-[#fffaf5] p-3">
                <div className="text-[11px] uppercase tracking-wider text-stone-600 font-bold">Horario de apertura</div>
                <div className="space-y-2">
                  {newBusinessForm.schedule.map((slot) => {
                    const dayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][slot.dayOfWeek];
                    return (
                      <div key={slot.dayOfWeek} className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
                        <span className="text-[11px] font-bold text-stone-700">{dayName}</span>
                        <input
                          type="time"
                          value={slot.openTime}
                          onChange={(event) => updateBusinessScheduleDay(slot.dayOfWeek, { openTime: event.target.value })}
                          className="w-full rounded-lg bg-white border border-[#e6d7c5] px-2 py-1.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                        />
                        <input
                          type="time"
                          value={slot.closeTime}
                          onChange={(event) => updateBusinessScheduleDay(slot.dayOfWeek, { closeTime: event.target.value })}
                          className="w-full rounded-lg bg-white border border-[#e6d7c5] px-2 py-1.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                        />
                        <button
                          type="button"
                          onClick={() => updateBusinessScheduleDay(slot.dayOfWeek, { isOpen: !slot.isOpen })}
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-bold ${
                            slot.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {slot.isOpen ? 'Abierto' : 'Cerrado'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Banner del negocio</label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept={MEDIA_ACCEPT}
                    onChange={(event) => handleBusinessImageUpload('bannerUrl', event)}
                    className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner file:mr-3 file:rounded-md file:border-0 file:bg-[#FF4E00] file:text-white file:px-2 file:py-1.5"
                  />
                </div>
                <MediaView
                  src={newBusinessForm.bannerUrl || undefined}
                  alt="Banner preview"
                  className="mt-2 h-20 w-full rounded-xl border border-[#e6d7c5]"
                  showLoading
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Logo del negocio</label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept={MEDIA_ACCEPT}
                    onChange={(event) => handleBusinessImageUpload('logoUrl', event)}
                    className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner file:mr-3 file:rounded-md file:border-0 file:bg-[#FF4E00] file:text-white file:px-2 file:py-1.5"
                  />
                </div>
                <MediaView
                  src={newBusinessForm.logoUrl || undefined}
                  alt="Logo preview"
                  className="mt-2 h-16 w-16 rounded-xl border border-[#e6d7c5]"
                  showLoading
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF4E00] hover:bg-[#E64600] text-white text-sm font-black uppercase tracking-wide px-4 py-2.5 transition mt-2"
              >
                <Plus className="w-4 h-4" />
                Crear negocio
              </button>
            </form>
          </div>
        </div>
      )}

      <CategoryManagerModal
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
      />

      {zoneManagerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-stone-900">Gestionar zonas</h3>
              <button onClick={() => setZoneManagerOpen(false)} className="text-stone-500 hover:text-stone-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-stone-100">
              {localities.map((loc) => {
                const isEditing = editingZoneId === loc.id;
                return (
                  <div key={loc.id} className="py-3 flex items-center justify-between gap-3">
                    {isEditing ? (
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          value={editZoneName}
                          onChange={(event) => setEditZoneName(event.target.value)}
                          className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900"
                          placeholder="Nombre"
                        />
                        <input
                          value={editZonePostalCode}
                          onChange={(event) => setEditZonePostalCode(event.target.value)}
                          className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900"
                          placeholder="Código postal"
                        />
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-stone-900 truncate">{loc.name}</div>
                        <div className="text-[11px] text-stone-400">{loc.postalCode}</div>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isEditing ? (
                        <>
                          <button type="button" onClick={saveEditZone} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition" aria-label="Guardar zona">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => setEditingZoneId(null)} className="p-1.5 rounded-lg bg-stone-100 text-stone-500 hover:text-stone-900 transition" aria-label="Cancelar edición">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEditZone(loc.id, loc.name, loc.postalCode)} className="p-1.5 rounded-lg bg-stone-100 text-stone-600 hover:text-stone-900 transition" aria-label="Editar zona">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => deleteLocality(loc.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition" aria-label="Eliminar zona">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleAddZone} className="pt-3 mt-2 border-t border-stone-100 flex flex-col gap-2">
              <input
                value={newZoneName}
                onChange={(event) => setNewZoneName(event.target.value)}
                placeholder="Nombre de la nueva zona"
                className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900"
              />
              <input
                value={newZonePostalCode}
                onChange={(event) => setNewZonePostalCode(event.target.value)}
                placeholder="Código postal"
                className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-900"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#FF4E00] hover:bg-[#E64600] text-white text-xs font-bold px-3 py-2 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir zona
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
