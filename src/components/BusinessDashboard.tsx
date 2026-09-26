import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coffee,
  Download,
  Edit3,
  Eye,
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
import { Order, OrderStatus, Product, CartItemOptionSelected, BusinessCategory, BusinessHours } from '../types';
import { ProjectLogo } from './ProjectLogo';
import { CATEGORIES } from '../data/mockData';

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
    orders,
    selectedLocality,
    localities,
    addLocality,
    updateLocality,
    deleteLocality,
    createBusiness,
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
    categoryId: 'hamburguesas',
    isAvailable: true,
    allergens: '',
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newBusinessModalOpen, setNewBusinessModalOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [categoryList, setCategoryList] = useState<BusinessCategory[]>(CATEGORIES);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    name: '',
    slug: '',
    iconName: 'Utensils',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
  });
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
    category: 'hamburguesas',
    localityId: selectedLocality.id,
    address: '',
    phone: '',
    email: '',
    bannerUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&auto=format&fit=crop&q=80',
    deliveryFeeCents: '2',
    estimatedTimeMin: '20',
    estimatedTimeMax: '40',
    schedule: defaultBusinessSchedule,
  });
  const [userSettingsForm, setUserSettingsForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    password: currentUser?.password || '',
    phone: currentUser?.phone || '',
    avatarUrl: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  });

  useEffect(() => {
    if (currentUser) {
      setUserSettingsForm({
        name: currentUser.name,
        email: currentUser.email,
        password: currentUser.password || '',
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

  const categoryOptions = categoryList.length > 0 ? categoryList : CATEGORIES;
  const canManageOrders = !!currentUser && (currentUser.role === 'BUSINESS_ADMIN' || currentUser.role === 'SUPERADMIN');
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';

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

  const normaliseCategorySlug = (value: string): string =>
    value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'categoria';

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryForm({
      id: '',
      name: '',
      slug: '',
      iconName: 'Utensils',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    });
  };

  const handleCategorySubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const cleanedName = categoryForm.name.trim();
    const nextSlug = categoryForm.slug.trim() || normaliseCategorySlug(cleanedName);

    if (!cleanedName) {
      showNotification('Escribe un nombre para la categoría.', 'error');
      return;
    }

    if (editingCategoryId) {
      setCategoryList((previous) =>
        previous.map((category) =>
          category.id === editingCategoryId
            ? { ...category, name: cleanedName, slug: nextSlug, iconName: categoryForm.iconName, imageUrl: categoryForm.imageUrl }
            : category,
        ),
      );
      showNotification('Categoría actualizada.', 'success');
    } else {
      const newCategory: BusinessCategory = {
        id: `${Date.now()}-${normaliseCategorySlug(cleanedName)}`,
        name: cleanedName,
        slug: nextSlug,
        iconName: categoryForm.iconName,
        imageUrl: categoryForm.imageUrl,
      };
      setCategoryList((previous) => [newCategory, ...previous]);
      showNotification('Categoría añadida.', 'success');
    }

    resetCategoryForm();
  };

  const startEditCategory = (category: BusinessCategory) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      id: category.id,
      name: category.name,
      slug: category.slug,
      iconName: category.iconName || 'Utensils',
      imageUrl: category.imageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    });
    setCategoryManagerOpen(true);
  };

  const removeCategory = (categoryId: string) => {
    setCategoryList((previous) => previous.filter((category) => category.id !== categoryId));
    if (editingCategoryId === categoryId) {
      resetCategoryForm();
    }
    showNotification('Categoría eliminada.', 'success');
  };

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
    const defaults: CartItemOptionSelected[] = [];
    (prod.optionGroups || []).forEach((grp) => {
      if (grp.required && grp.options.length > 0) {
        defaults.push({ groupName: grp.name, optionName: grp.options[0].name, priceCents: grp.options[0].priceCents });
      }
    });
    setManualCustomizerOptions(defaults);
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
            locality: selectedLocality.name,
            postalCode: selectedLocality.postalCode,
            coordinates: selectedLocality.coordinates,
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
      categoryId: business.category || 'hamburguesas',
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
      categoryId: prod.categoryId,
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

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
      reader.readAsDataURL(file);
    });

  const handleBusinessImageUpload = async (
    field: 'bannerUrl' | 'logoUrl',
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setNewBusinessForm((prev) => ({ ...prev, [field]: dataUrl }));
    } catch (error) {
      showNotification('No se pudo cargar la imagen seleccionada.', 'error');
    }
  };

  const handleProductImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCatalogForm((prev) => ({ ...prev, imageUrl: dataUrl }));
    } catch (error) {
      showNotification('No se pudo leer la imagen del producto.', 'error');
    }
  };

  const handleCategoryImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCategoryForm((prev) => ({ ...prev, imageUrl: dataUrl }));
    } catch (error) {
      showNotification('No se pudo leer la imagen de la categoría.', 'error');
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
      const dataUrl = await readFileAsDataUrl(file);
      setUserSettingsForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
    } catch (error) {
      showNotification('No se pudo leer la imagen del avatar.', 'error');
    }
  };

  const handleCreateBusiness = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newBusinessForm.name.trim() || !newBusinessForm.address.trim()) {
      showNotification('Introduce al menos nombre y dirección del negocio.', 'error');
      return;
    }

    createBusiness({
      name: newBusinessForm.name.trim(),
      legalName: newBusinessForm.legalName.trim() || newBusinessForm.name.trim(),
      cif: newBusinessForm.cif.trim() || '00000000A',
      category: newBusinessForm.category,
      localityId: newBusinessForm.localityId,
      address: newBusinessForm.address.trim(),
      phone: newBusinessForm.phone.trim() || '+34 600 000 000',
      email: newBusinessForm.email.trim() || 'contacto@nuevo-negocio.es',
      bannerUrl: newBusinessForm.bannerUrl,
      logoUrl: newBusinessForm.logoUrl,
      minOrderCents: 0,
      deliveryFeeCents: Number(newBusinessForm.deliveryFeeCents) * 100 || 250,
      estimatedTimeMin: Number(newBusinessForm.estimatedTimeMin) || 20,
      estimatedTimeMax: Number(newBusinessForm.estimatedTimeMax) || 40,
      schedule: newBusinessForm.schedule,
      isShiftOpen: true,
      status: 'APPROVED',
    });

    setNewBusinessForm({
      name: '',
      legalName: '',
      cif: '',
      category: 'hamburguesas',
      localityId: selectedLocality.id,
      address: '',
      phone: '',
      email: '',
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
        </div>



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
        </div>
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
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt="user"
                  className="block w-10 h-10 rounded-full object-cover object-center border-2 border-stone-700 bg-stone-100"
                  style={{ borderRadius: '9999px' }}
                />
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

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-[#f5f3f0]">
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
                                  <div key={`${item.productId}-${index}`} className="flex justify-between truncate">
                                    <span className="truncate"><strong className="text-stone-900">{item.quantity}x</strong> {item.productName}</span>
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
                <div className="bg-white rounded-2xl border border-[#eadcc7] overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-[#f0e2d5] flex items-center justify-between text-xs text-stone-600">
                    <span>Listado de Platos de {business.name}</span>
                    <span>{restaurantProducts.length} productos registrados</span>
                  </div>

                  <div className="divide-y divide-[#f3e8dd]">
                    {restaurantProducts.length === 0 ? (
                      <div className="p-6 text-center text-sm text-stone-600">Aún no hay productos en el catálogo de este negocio.</div>
                    ) : (
                      restaurantProducts.map((prod) => (
                        <div key={prod.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#fff7f2] transition">
                          <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                            <img src={prod.imageUrl} alt={prod.name} className="w-12 h-12 rounded-xl object-cover border border-[#e9dac8]" />
                            <div className="min-w-0">
                              <div className="font-bold text-stone-900 text-sm truncate">{prod.name}</div>
                              <div className="text-xs text-stone-600 line-clamp-1 max-w-md">{prod.description}</div>
                              <div className="font-mono font-bold text-xs text-[#FF4E00] mt-0.5">{(prod.priceCents / 100).toFixed(2)}€</div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => startEditProduct(prod)}
                              className="p-2 rounded-lg bg-stone-800 text-stone-300 hover:text-white transition cursor-pointer"
                              aria-label="Editar producto"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteProductFromBusiness(prod.id)}
                              className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition cursor-pointer"
                              aria-label="Eliminar producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="flex items-center space-x-3 pl-2 border-l border-stone-200">
                              <span className={`text-xs font-bold ${prod.isAvailable ? 'text-emerald-600' : 'text-stone-500'}`}>
                                {prod.isAvailable ? 'En Carta' : 'Agotado'}
                              </span>
                              <button
                                onClick={() => toggleProductAvailability(prod.id)}
                                className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center cursor-pointer ${
                                  prod.isAvailable ? 'bg-emerald-600 justify-end' : 'bg-stone-800 justify-start'
                                }`}
                              >
                                <span className="w-4 h-4 rounded-full bg-white shadow-md block"></span>
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
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProductImageUpload}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner file:mr-3 file:rounded-md file:border-0 file:bg-[#FF4E00] file:text-white file:px-2 file:py-1.5"
                      />
                      {catalogForm.imageUrl && !catalogForm.imageUrl.startsWith('https://images.unsplash.com') && (
                        <p className="mt-1 text-[10px] text-emerald-600 font-bold">Imagen cargada correctamente</p>
                      )}
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
                  <span>{selectedLocality.name}</span>
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
                            categoryId: biz.category || 'hamburguesas',
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
                <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3"><span>Localidad</span><span>{selectedLocality.name}</span></div>
                <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3"><span>Pedidos pendientes</span><span>{activeUnfinishedOrders.length}</span></div>
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
                          <img src={prod.imageUrl} alt={prod.name} className="w-12 h-12 rounded-xl object-cover border border-stone-700" />
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
              <img src={manualCustomizerProduct.imageUrl} alt={manualCustomizerProduct.name} className="w-full h-full object-cover" />
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

              {manualCustomizerProduct.optionGroups && manualCustomizerProduct.optionGroups.map((grp) => {
                const isMulti = grp.maxChoices > 1;
                return (
                  <div key={grp.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-700">{grp.name}</label>
                      <span className="text-[11px] text-stone-400">{grp.required ? 'Obligatorio' : 'Opcional'}</span>
                    </div>

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
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#FF4E00] bg-[#FF4E00] text-white' : 'border-stone-400'}`}>
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
                <img
                  src={userSettingsForm.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                  alt="Avatar del administrador"
                  className="block w-14 h-14 rounded-full object-cover object-center border-2 border-[#e7d5c7] bg-stone-100"
                  style={{ borderRadius: '9999px' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Avatar</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUserAvatarUpload}
                    className="mt-1 block w-full text-xs text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#FF4E00] file:px-2 file:py-1.5 file:text-white"
                  />
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
                <input
                  type="password"
                  value={userSettingsForm.password}
                  onChange={(event) => setUserSettingsForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                  placeholder="Nueva contraseña"
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
                  updateCurrentUserProfile({
                    ...currentUser,
                    name: userSettingsForm.name.trim() || currentUser.name,
                    email: userSettingsForm.email.trim() || currentUser.email,
                    password: userSettingsForm.password.trim() || currentUser.password,
                    phone: userSettingsForm.phone.trim() || currentUser.phone,
                    avatarUrl: userSettingsForm.avatarUrl.trim() || currentUser.avatarUrl,
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
                    className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Razón social</label>
                  <input
                    value={newBusinessForm.legalName}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, legalName: event.target.value }))}
                    placeholder="Ej. La Bodeguita del Valle SL"
                    className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">CIF</label>
                  <input
                    value={newBusinessForm.cif}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, cif: event.target.value }))}
                    placeholder="B12345678"
                    className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Categoría</label>
                  <select
                    value={newBusinessForm.category}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, category: event.target.value }))}
                    className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
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
                    value={newBusinessForm.localityId}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, localityId: event.target.value }))}
                    className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                  >
                    {localities.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Teléfono</label>
                  <input
                    value={newBusinessForm.phone}
                    onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="+34 600 000 000"
                    className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Dirección</label>
                <input
                  value={newBusinessForm.address}
                  onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, address: event.target.value }))}
                  placeholder="Calle Mayor 12, 05420 Sotillo de la Adrada"
                  className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Email</label>
                <input
                  value={newBusinessForm.email}
                  onChange={(event) => setNewBusinessForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="contacto@negocio.es"
                  className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                />
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
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleBusinessImageUpload('bannerUrl', event)}
                  className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner file:mr-3 file:rounded-md file:border-0 file:bg-[#FF4E00] file:text-white file:px-2 file:py-1.5"
                />
                {newBusinessForm.bannerUrl && (
                  <img src={newBusinessForm.bannerUrl} alt="Banner preview" className="mt-2 h-20 w-full rounded-xl object-cover border border-[#e6d7c5]" />
                )}
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Logo del negocio</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleBusinessImageUpload('logoUrl', event)}
                  className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner file:mr-3 file:rounded-md file:border-0 file:bg-[#FF4E00] file:text-white file:px-2 file:py-1.5"
                />
                {newBusinessForm.logoUrl && (
                  <img src={newBusinessForm.logoUrl} alt="Logo preview" className="mt-2 h-16 w-16 rounded-xl object-cover border border-[#e6d7c5]" />
                )}
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

      {categoryManagerOpen && currentUser?.role === 'SUPERADMIN' && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-[28px] w-full max-w-5xl p-5 shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">SUPERADMIN</div>
                <h3 className="text-2xl font-black text-stone-900 mt-1">Gestión de categorías</h3>
              </div>
              <button type="button" onClick={() => { setCategoryManagerOpen(false); resetCategoryForm(); }} className="text-stone-500 hover:text-stone-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-5">
              <div className="bg-[#fffaf5] border border-[#eadcc7] rounded-2xl p-4 shadow-sm">
                <div className="mb-4">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                    {editingCategoryId ? 'Editar categoría' : 'Añadir nueva categoría'}
                  </div>
                  <h4 className="mt-1 text-lg font-black text-stone-900">
                    {editingCategoryId ? 'Actualiza la categoría' : 'Crea una nueva categoría'}
                  </h4>
                </div>

                <form onSubmit={handleCategorySubmit} className="space-y-3 text-sm">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Nombre</label>
                    <input
                      value={categoryForm.name}
                      onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value, slug: prev.slug || normaliseCategorySlug(event.target.value) }))}
                      className="w-full rounded-xl bg-white border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                      placeholder="Ej. Pizzas, Burgers, Postres"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Slug</label>
                    <input
                      value={categoryForm.slug}
                      onChange={(event) => setCategoryForm((prev) => ({ ...prev, slug: event.target.value }))}
                      className="w-full rounded-xl bg-white border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                      placeholder="pizzas"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Icono</label>
                    <select
                      value={categoryForm.iconName}
                      onChange={(event) => setCategoryForm((prev) => ({ ...prev, iconName: event.target.value }))}
                      className="w-full rounded-xl bg-white border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                    >
                      {['Utensils', 'Flame', 'Coffee', 'Pizza', 'Sparkles', 'Soup', 'Sandwich', 'Wine'].map((icon) => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Imagen</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCategoryImageUpload}
                      className="w-full rounded-xl bg-white border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] file:mr-3 file:rounded-md file:border-0 file:bg-[#FF4E00] file:text-white file:px-2 file:py-1.5"
                    />
                    {categoryForm.imageUrl && !categoryForm.imageUrl.startsWith('https://images.unsplash.com') && (
                      <p className="mt-1 text-[10px] text-emerald-600 font-bold">Imagen cargada correctamente</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button type="submit" className="flex-1 rounded-xl bg-[#FF4E00] hover:bg-[#E64600] text-white font-black px-4 py-2.5 transition">
                      {editingCategoryId ? 'Guardar cambios' : 'Añadir categoría'}
                    </button>
                    {editingCategoryId && (
                      <button type="button" onClick={resetCategoryForm} className="rounded-xl bg-stone-100 text-stone-700 px-4 py-2.5 font-semibold">
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="bg-white border border-[#eadcc7] rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#f0e2d5] flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Categorías actuales</span>
                  <span className="text-xs font-bold text-stone-700">{categoryList.length}</span>
                </div>

                <div className="divide-y divide-[#f3e8dd]">
                  {categoryList.length === 0 ? (
                    <div className="p-6 text-sm text-stone-600 text-center">No hay categorías creadas todavía.</div>
                  ) : (
                    categoryList.map((category) => (
                      <div key={category.id} className="p-3 flex items-center gap-3 hover:bg-[#fff7f2] transition">
                        <img src={category.imageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80'} alt={category.name} className="w-14 h-14 rounded-xl object-cover border border-[#e9dac8]" />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-stone-900 text-sm truncate">{category.name}</div>
                          <div className="text-[11px] text-stone-500 uppercase tracking-wider">{category.slug}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => startEditCategory(category)} className="p-2 rounded-lg bg-stone-800 text-stone-300 hover:text-white transition">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => removeCategory(category.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
