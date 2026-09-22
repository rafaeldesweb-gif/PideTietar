import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Store, Power, Clock, Plus, CheckCircle2, 
  FileText, Download, TrendingUp, AlertTriangle, 
  Check, ArrowRight, ChevronRight, Utensils,
  BookOpen, BarChart3, Users, Settings, LogOut,
  Printer, Volume2, VolumeX, Calendar, Search,
  Eye, Phone, MapPin, Sparkles, X, ShoppingBag,
  Flame, Bell, Coffee, Trash2, Edit3, Save, XCircle
} from 'lucide-react';
import { Order, OrderStatus, Product } from '../types';
import { LOCALITIES } from '../data/mockData';

export const BusinessDashboard: React.FC = () => {
  const { 
    currentUser, 
    businesses, 
    products,
    orders,
    selectedLocality,
    createBusiness,
    updateOrderStatus, 
    updateBusinessShift,
    toggleProductAvailability,
    addProductToBusiness,
    updateProductInBusiness,
    deleteProductFromBusiness,
    createManualOrder,
    showNotification,
    logout
  } = useApp();

  // Active business - defaults to the user's assigned business, or a zone business when selected
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(currentUser?.businessId || businesses[0]?.id || null);

  useEffect(() => {
    if (currentUser?.businessId) {
      setSelectedBusinessId(currentUser.businessId);
    }
  }, [currentUser?.businessId]);

  const business = businesses.find(b => b.id === selectedBusinessId) || businesses.find(b => b.id === currentUser?.businessId) || businesses[0];

  // Active view tab: 'orders' (default), 'menu', 'stats', 'team', 'settings'
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'stats' | 'team'>('orders');
  
  // Modals state
  const [selectedTicket, setSelectedTicket] = useState<Order | null>(null);
  const [shiftReportModal, setShiftReportModal] = useState(false);
  const [newOrderModal, setNewOrderModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPrintThermal, setAutoPrintThermal] = useState(true);

  // New manual order form state
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualDeliveryType, setManualDeliveryType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [manualTableNumber, setManualTableNumber] = useState('');
  const [manualSelectedItems, setManualSelectedItems] = useState<{ product: Product; quantity: number }[]>([]);

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
    allergens: ''
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newBusinessModalOpen, setNewBusinessModalOpen] = useState(false);
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
    estimatedTimeMax: '40'
  });

  // Filter orders for this specific business
  const businessOrders = orders.filter(o => o.businessId === business.id);
  const localBusinesses = businesses.filter(biz => biz.localityId === selectedLocality.id);

  // Kanban status columns matching Image 3 (NUEVOS, EN PREPARACIÓN, LISTOS, ENTREGADOS)
  const kanbanColumns = [
    {
      id: 'nuevos',
      title: 'NUEVOS',
      dotColor: 'bg-amber-500 shadow-amber-500/50',
      badgeColor: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
      statuses: ['PAID', 'NEW'] as OrderStatus[]
    },
    {
      id: 'preparacion',
      title: 'EN PREPARACIÓN',
      dotColor: 'bg-blue-500 shadow-blue-500/50',
      badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      statuses: ['ACCEPTED', 'PREPARING'] as OrderStatus[]
    },
    {
      id: 'listos',
      title: 'LISTOS',
      dotColor: 'bg-purple-500 shadow-purple-500/50',
      badgeColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      statuses: ['READY', 'ASSIGNED'] as OrderStatus[]
    },
    {
      id: 'entregados',
      title: 'ENTREGADOS',
      dotColor: 'bg-emerald-500 shadow-emerald-500/50',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      statuses: ['PICKED_UP', 'DELIVERED'] as OrderStatus[]
    }
  ];

  // Business metrics
  const totalSalesCents = businessOrders.reduce((acc, o) => acc + o.subtotalCents, 0);
  const totalPayoutCents = businessOrders.reduce((acc, o) => acc + o.businessPayoutCents, 0);
  const averageTicketCents = businessOrders.length > 0 ? Math.round(totalSalesCents / businessOrders.length) : 0;
  const activeUnfinishedOrders = businessOrders.filter(
    o => !['DELIVERED', 'CANCELLED', 'REJECTED', 'REFUNDED'].includes(o.status)
  );

  // Shift closing validation
  const handleToggleShift = () => {
    if (business.isShiftOpen) {
      if (activeUnfinishedOrders.length > 0) {
        showNotification(
          `Atención de cocina: Hay ${activeUnfinishedOrders.length} comanda(s) en preparación o pendientes. Complétalas antes del arqueo de turno.`,
          'error'
        );
        return;
      }
      setShiftReportModal(true);
      updateBusinessShift(business.id, false);
    } else {
      updateBusinessShift(business.id, true);
    }
  };

  // Submit manual in-store order
  const handleCreateManualOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualSelectedItems.length === 0) {
      showNotification('Debes seleccionar al menos un plato para la comanda', 'error');
      return;
    }

    const subtotalCents = manualSelectedItems.reduce((acc, item) => acc + (item.product.priceCents * item.quantity), 0);
    const tableInfo = manualTableNumber.trim() ? ` [Mesa/Barra: ${manualTableNumber.trim()}]` : '';

    createManualOrder({
      businessId: business.id,
      businessName: business.name,
      customerName: (manualCustomerName.trim() || 'Comensal Sala') + tableInfo,
      customerPhone: manualPhone.trim() || '+34 600 000 000',
      deliveryType: manualDeliveryType,
      items: manualSelectedItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        unitPriceCents: item.product.priceCents,
        taxPercentage: item.product.taxPercentage,
        quantity: item.quantity,
        removedIngredients: [],
        selectedOptions: [],
        customerNote: manualTableNumber ? `Mesa: ${manualTableNumber}` : '',
        totalCents: item.product.priceCents * item.quantity
      })),
      subtotalCents,
      deliveryFeeCents: 0,
      totalCents: subtotalCents,
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentStatus: 'PAID'
    });

    // Reset and close
    setManualCustomerName('');
    setManualPhone('');
    setManualTableNumber('');
    setManualSelectedItems([]);
    setNewOrderModal(false);
  };

  const addProductToManualTicket = (prod: Product) => {
    setManualSelectedItems(prev => {
      const existing = prev.find(i => i.product.id === prod.id);
      if (existing) {
        return prev.map(i => i.product.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product: prod, quantity: 1 }];
    });
  };

  const removeProductFromManualTicket = (prodId: string) => {
    setManualSelectedItems(prev => {
      const existing = prev.find(i => i.product.id === prodId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.product.id === prodId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.product.id !== prodId);
    });
  };

  // Products belonging to this restaurant
  const restaurantProducts = products.filter(p => p.businessId === business.id);

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
      allergens: ''
    });
    setEditingProductId(null);
  };

  const handleCatalogSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = catalogForm.name.trim();
    const trimmedDescription = catalogForm.description.trim();
    const normalizedPrice = Number(catalogForm.priceCents) || 0;

    if (!trimmedName || !trimmedDescription || normalizedPrice <= 0) {
      showNotification('Completa nombre, descripción y precio para guardar el producto.', 'error');
      return;
    }

    const parseExtraIngredient = (entry: string) => {
      const trimmed = entry.trim();
      if (!trimmed) return null;

      const match = trimmed.match(/^(.*?)(?:\s*[:\-]\s*|\s+)([0-9]+(?:[.,][0-9]+)?)$/);
      const name = match ? match[1].trim() : trimmed;
      const priceText = match ? match[2].replace(',', '.') : '0';
      const priceValue = Number(priceText) || 0;

      if (!name) return null;
      return { name, priceCents: Math.round(priceValue * 100) };
    };

    const payload = {
      name: trimmedName,
      description: trimmedDescription,
      tag: catalogForm.tag.trim(),
      ingredients: catalogForm.ingredients
        .split(',')
        .map(item => item.trim())
        .filter(Boolean),
      removableIngredients: catalogForm.removableIngredients
        .split(',')
        .map(item => item.trim())
        .filter(Boolean),
      additionalIngredients: catalogForm.additionalIngredients
        .split(',')
        .map(parseExtraIngredient)
        .filter(Boolean) as { name: string; priceCents: number }[],
      priceCents: Math.round(normalizedPrice * 100),
      imageUrl: catalogForm.imageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
      categoryId: catalogForm.categoryId,
      taxPercentage: 0,
      isAvailable: catalogForm.isAvailable,
      allergens: catalogForm.allergens
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
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
        .map(item => `${item.name}: ${(item.priceCents / 100).toFixed(2)}`)
        .join(', '),
      priceCents: (prod.priceCents / 100).toFixed(2),
      imageUrl: prod.imageUrl,
      categoryId: prod.categoryId,
      isAvailable: prod.isAvailable,
      allergens: (prod.allergens || []).join(', ')
    });
  };

  const handleCreateBusiness = (e: React.FormEvent) => {
    e.preventDefault();

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
      isShiftOpen: true,
      status: 'APPROVED'
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
      estimatedTimeMax: '40'
    });
    setNewBusinessModalOpen(false);
  };

  return (
    <div className="min-h-[85vh] bg-[#f7f4f1] text-stone-900 rounded-3xl border border-stone-200 shadow-[0_18px_45px_rgba(43,28,18,0.08)] overflow-hidden flex flex-col font-sans">
      
      {/* 1. TOP HEADER BAR (Matching Image 3) */}
      <header className="h-16 px-4 sm:px-6 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          {/* Burger Mascot Avatar / Logo */}
          <div className="w-9 h-9 rounded-xl bg-[#FF4E00] flex items-center justify-center text-white shadow-md shadow-[#FF4E00]/20 overflow-hidden">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C7.5 2 3.8 5.2 3.2 9.5h17.6C20.2 5.2 16.5 2 12 2zm-8.8 9.5c-.1.5-.2 1-.2 1.5 0 .5.4 1 1 1h16c.6 0 1-.5 1-1 0-.5-.1-1-.2-1.5H3.2zM4 16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2H4zm1 4c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2H5z"/>
            </svg>
          </div>

          <div className="flex items-center space-x-2.5">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-stone-900 uppercase font-serif">
              {business.name.toUpperCase()}
            </span>
            <div className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>COCINA EN LÍNEA</span>
            </div>
          </div>
        </div>

        {/* Right header items */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeTab === 'orders' ? 'text-[#FF4E00] bg-[#fff2eb] border border-[#ffd7c2]' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Comandas</span>
          </button>

          <button 
            onClick={() => setActiveTab('menu')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeTab === 'menu' ? 'text-[#FF4E00] bg-[#fff2eb] border border-[#ffd7c2]' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Carta Cocina</span>
          </button>

          {/* User profile avatar badge */}
          <div className="flex items-center space-x-2 pl-2 border-l border-[#e8ddd0]">
            <img
              src={currentUser?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
              alt="avatar"
              className="w-7 h-7 rounded-full object-cover border border-[#FF4E00]"
            />
          </div>

          {/* Quick Shift Status button */}
          <button
            onClick={handleToggleShift}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              business.isShiftOpen 
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
            title="Cambiar estado de servicio del local"
          >
            <Power className="w-3 h-3" />
            <span className="hidden md:inline">{business.isShiftOpen ? 'Servicio Abierto' : 'Servicio Cerrado'}</span>
          </button>
        </div>
      </header>

      {/* 2. BODY LAYOUT: SIDEBAR + MAIN KDS AREA (Matching Image 3) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* LEFT SIDEBAR (Matching Image 3) */}
        <aside className="w-full md:w-60 bg-[#faf7f4] border-r border-stone-200 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-5">
            
            {/* Sidebar Title & Terminal info */}
            <div>
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                PANEL DE CONTROL
              </div>
              <h2 className="text-lg font-black text-stone-900 tracking-tight mt-0.5">
                ADMINISTRADOR
              </h2>
              <div className="text-[11px] font-mono text-teal-400 mt-0.5 flex items-center space-x-1">
                <span>Terminal 01 // Online</span>
              </div>
            </div>

            {/* Profile badge card */}
            <div className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center space-x-2.5 shadow-sm">
              <img
                src={currentUser?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                alt="user"
                className="w-8 h-8 rounded-full object-cover border border-stone-700"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-stone-900 truncate">
                  {currentUser?.name.split(' ')[0].toLowerCase() || 'junior'}
                </div>
                <div className="inline-flex items-center space-x-1 text-[9px] font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>EN VIVO</span>
                </div>
              </div>
            </div>

            {/* Navigation List (Matching Image 3: PEDIDOS, GESTIÓN MENÚ, ESTADÍSTICAS, EQUIPO) */}
            <nav className="space-y-1.5">
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-[#fff2eb] text-stone-900 shadow-sm font-extrabold border border-[#ffd7c2]'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Utensils className={`w-4 h-4 ${activeTab === 'orders' ? 'text-stone-950' : 'text-stone-400'}`} />
                <span>PEDIDOS</span>
                {businessOrders.filter(o => ['PAID', 'NEW', 'ACCEPTED', 'PREPARING'].includes(o.status)).length > 0 && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-full bg-[#FF4E00] text-white">
                    {businessOrders.filter(o => ['PAID', 'NEW', 'ACCEPTED', 'PREPARING'].includes(o.status)).length}
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
                <BookOpen className={`w-4 h-4 ${activeTab === 'menu' ? 'text-stone-950' : 'text-stone-400'}`} />
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
                <BarChart3 className={`w-4 h-4 ${activeTab === 'stats' ? 'text-stone-950' : 'text-stone-400'}`} />
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
                <Users className={`w-4 h-4 ${activeTab === 'team' ? 'text-stone-950' : 'text-stone-400'}`} />
                <span>EQUIPO</span>
              </button>
            </nav>
          </div>

          {/* Bottom Settings & Logout */}
          <div className="pt-4 border-t border-[#e6dac8] space-y-1">
            <button
              onClick={() => setSettingsModal(true)}
              className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium text-stone-400 hover:text-white hover:bg-stone-800/60 transition flex items-center space-x-2"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>CONFIGURACIÓN</span>
            </button>

            <button
              onClick={() => {
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

        {/* 3. MAIN DASHBOARD CONTENT (Matching Image 3) */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-[#f5f3f0]">
          
          {/* TAB 1: ORDERS KANBAN (Exact Match to Image 3) */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Header Title + Stats + New Order Button */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    PANEL DE COCINA
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                    CONTROL DE PEDIDOS
                  </h1>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Gestión en tiempo real del flujo de comensales y comanda.
                  </p>
                </div>

                {/* Right Top Bar Metrics & Button (Matching Image 3) */}
                <div className="flex items-center space-x-3 sm:space-x-4">
                  
                  {/* PEDIDOS HOY */}
                  <div className="px-4 py-2.5 rounded-2xl bg-white border border-stone-200 min-w-[100px] text-center shadow-sm">
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      PEDIDOS HOY
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-stone-900 font-mono mt-0.5">
                      {businessOrders.length}
                    </div>
                  </div>

                  {/* TICKET PROMEDIO */}
                  <div className="px-4 py-2.5 rounded-2xl bg-white border border-stone-200 min-w-[120px] text-center shadow-sm">
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      TICKET PROMEDIO
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-0.5">
                      {(averageTicketCents / 100).toFixed(2)}€
                    </div>
                  </div>

                  {/* Button: + NUEVO PEDIDO (Matching Image 3) */}
                  <button
                    onClick={() => setNewOrderModal(true)}
                    className="px-4 sm:px-5 py-3 rounded-full bg-[#FF4E00] hover:bg-[#e94500] text-white font-black text-xs sm:text-sm tracking-wide transition shadow-lg flex items-center space-x-2 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>NUEVO PEDIDO</span>
                  </button>
                </div>
              </div>

              {/* 4 KANBAN COLUMNS (Matching Image 3) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kanbanColumns.map(col => {
                  const colOrders = businessOrders.filter(o => col.statuses.includes(o.status));

                  return (
                    <div 
                      key={col.id}
                      className="bg-white rounded-2xl border border-stone-200 p-3.5 flex flex-col min-h-[460px] shadow-sm"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`}></span>
                          <h3 className="text-xs font-black text-stone-800 tracking-wider">
                            {col.title}
                          </h3>
                        </div>
                        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${col.badgeColor}`}>
                          {colOrders.length}
                        </span>
                      </div>

                      {/* Column Content */}
                      <div className="space-y-3 flex-1 overflow-y-auto">
                        {colOrders.length === 0 ? (
                          <div className="h-44 rounded-xl border border-dashed border-[#e9dac8] bg-[#fffdfb] flex flex-col items-center justify-center text-stone-500">
                            <span className="text-[11px] font-bold tracking-widest uppercase">
                              SIN PEDIDOS
                            </span>
                          </div>
                        ) : (
                          colOrders.map(order => (
                            <div
                              key={order.id}
                              onClick={() => setSelectedTicket(order)}
                              className="bg-[#fffaf5] hover:bg-[#fff3ea] border border-[#eadcc7] hover:border-[#f0bea0] p-3.5 rounded-xl transition cursor-pointer space-y-2.5 shadow-sm group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-black text-xs text-[#FF4E00]">
                                  #{order.orderNumber}
                                </span>
                                <div className="flex items-center space-x-1 text-[10px] text-stone-500">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {new Date(order.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-stone-900 truncate max-w-[130px]">
                                  {order.customerName}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-[#fff1e8] text-[#A32300] border border-[#f4d3b8]">
                                  {order.deliveryType === 'DELIVERY' ? '🛵 Domicilio' : '🛍️ Recogida'}
                                </span>
                              </div>

                              <div className="text-[11px] text-stone-600 space-y-0.5 border-t border-[#f0e2d5] pt-2">
                                {order.items.slice(0, 3).map((item, idx) => (
                                  <div key={idx} className="flex justify-between truncate">
                                    <span className="truncate">
                                      <strong className="text-stone-900">{item.quantity}x</strong> {item.productName}
                                    </span>
                                  </div>
                                ))}
                                {order.items.length > 3 && (
                                  <div className="text-[10px] text-stone-500 italic">
                                    +{order.items.length - 3} platos más...
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-[#f0e2d5] flex items-center justify-between">
                                <span className="font-mono font-black text-xs text-stone-900">
                                  {(order.totalCents / 100).toFixed(2)}€
                                </span>

                                {/* Quick state change buttons right on the card */}
                                {col.id === 'nuevos' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateOrderStatus(order.id, 'PREPARING', 'Comanda aceptada en cocina');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer"
                                  >
                                    <span>Preparar</span>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                  </button>
                                )}

                                {col.id === 'preparacion' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateOrderStatus(order.id, 'READY', 'Comanda terminada en fogones');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer"
                                  >
                                    <span>Marcar Listo</span>
                                    <Check className="w-2.5 h-2.5" />
                                  </button>
                                )}

                                {col.id === 'listos' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateOrderStatus(order.id, 'PICKED_UP', 'Entregado al repartidor de ruta');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer"
                                  >
                                    <span>Salida</span>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                  </button>
                                )}

                                {col.id === 'entregados' && (
                                  <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
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

          {/* TAB 2: MENU MANAGEMENT (GESTIÓN MENÚ) */}
          {activeTab === 'menu' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    CARTA Y COCINA
                  </div>
                  <h2 className="text-2xl font-black text-stone-900">
                    Gestión de Platos y Stock
                  </h2>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Añade, edita o elimina platos del catálogo y activa o desactiva el stock desde la cocina.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewBusinessModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#FF4E00] hover:bg-[#E64600] text-white text-xs font-bold px-4 py-2.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Crear negocio nuevo
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
                <div className="bg-white rounded-2xl border border-[#eadcc7] overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-[#f0e2d5] flex items-center justify-between text-xs text-stone-600">
                    <span>Listado de Platos de {business.name}</span>
                    <span>{restaurantProducts.length} productos registrados</span>
                  </div>

                  <div className="divide-y divide-[#f3e8dd]">
                    {restaurantProducts.length === 0 ? (
                      <div className="p-6 text-center text-sm text-stone-600">
                        Aún no tienes productos en el catálogo de este negocio.
                      </div>
                    ) : (
                      restaurantProducts.map(prod => (
                        <div key={prod.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#fff7f2] transition">
                          <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                            <img 
                              src={prod.imageUrl} 
                              alt={prod.name}
                              className="w-12 h-12 rounded-xl object-cover border border-[#e9dac8]" 
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-stone-900 text-sm truncate">
                                {prod.name}
                              </div>
                              <div className="text-xs text-stone-600 line-clamp-1 max-w-md">
                                {prod.description}
                              </div>
                              <div className="font-mono font-bold text-xs text-[#FF4E00] mt-0.5">
                                {(prod.priceCents / 100).toFixed(2)}€
                              </div>
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
                              className="p-2 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 transition cursor-pointer"
                              aria-label="Eliminar producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="flex items-center space-x-3 pl-2 border-l border-stone-800">
                              <span className={`text-xs font-bold ${prod.isAvailable ? 'text-emerald-400' : 'text-stone-500'}`}>
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
                    <h3 className="text-sm font-bold text-stone-900">
                      {editingProductId ? 'Editar producto' : 'Añadir nuevo producto'}
                    </h3>
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

                  <form onSubmit={handleCatalogSubmit} className="space-y-3 text-sm">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Nombre</label>
                      <input
                        value={catalogForm.name}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="Ej. Hamburguesa Valleña"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Descripción</label>
                      <textarea
                        value={catalogForm.description}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="Describe el plato..."
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Etiqueta</label>
                      <input
                        value={catalogForm.tag}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, tag: e.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="Ej. Bestseller, Veggie, Top Ventas"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Precio en €</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={catalogForm.priceCents}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, priceCents: e.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Ingredientes</label>
                      <input
                        value={catalogForm.ingredients}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, ingredients: e.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="Lechuga, tomate, queso, bacon"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Ingredientes que se pueden quitar</label>
                      <input
                        value={catalogForm.removableIngredients}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, removableIngredients: e.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="Queso, cebolla, aguacate"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Ingredientes adicionales (Nombre: precio)</label>
                      <input
                        value={catalogForm.additionalIngredients}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, additionalIngredients: e.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="Bacon: 1.20, Huevo: 0.80, Salsa extra: 0.50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Subir una imagen del producto</label>
                      <input
                        value={catalogForm.imageUrl}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">Alérgenos</label>
                      <input
                        value={catalogForm.allergens}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, allergens: e.target.value }))}
                        className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner"
                        placeholder="Gluten, Lactosa..."
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 shadow-inner">
                      <span className="text-xs text-stone-300">Visible en la carta</span>
                      <button
                        type="button"
                        onClick={() => setCatalogForm(prev => ({ ...prev, isAvailable: !prev.isAvailable }))}
                        className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center cursor-pointer ${
                          catalogForm.isAvailable ? 'bg-emerald-600 justify-end' : 'bg-stone-700 justify-start'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white block" />
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF4E00] hover:bg-[#E64600] text-white font-bold text-xs uppercase py-3 transition cursor-pointer"
                    >
                      {editingProductId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editingProductId ? 'Guardar cambios' : 'Añadir producto'}
                    </button>
                  </form>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#eadcc7] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-stone-900">Negocios de la misma zona</h3>
                  <span className="text-[10px] uppercase tracking-wider text-stone-500">
                    {LOCALITIES.find(loc => loc.id === business.localityId)?.name || business.localityId}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {localBusinesses.map(item => {
                    const isSelected = item.id === business.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedBusinessId(item.id)}
                        className={`w-full text-left rounded-xl border p-3 transition cursor-pointer ${
                          isSelected
                            ? 'border-[#FF4E00] bg-[#fff2eb] shadow-sm'
                            : 'border-[#eadcc7] bg-[#fffaf5] hover:border-[#FF4E00]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-stone-900 text-sm">{item.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.isShiftOpen ? 'bg-emerald-500/10 text-emerald-700' : 'bg-stone-200 text-stone-700'}`}>
                            {item.isShiftOpen ? 'Abierto' : 'Cerrado'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 mt-1">{item.address}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ESTADÍSTICAS */}
          {activeTab === 'stats' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  MÉTRICAS DEL NEGOCIO
                </div>
                <h2 className="text-2xl font-black text-stone-900">
                  Rendimiento Operativo y Ventas
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-[#eadcc7] shadow-sm space-y-1">
                  <div className="text-xs text-stone-600 font-medium">Facturación Bruta Comandas</div>
                  <div className="text-3xl font-black text-stone-900 font-mono">
                    {(totalSalesCents / 100).toFixed(2)}€
                  </div>
                  <div className="text-[11px] text-emerald-600 flex items-center space-x-1 pt-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+18% comparado con el turno anterior</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#eadcc7] shadow-sm space-y-1">
                  <div className="text-xs text-stone-600 font-medium">Liquidación Neta Tras Plataforma</div>
                  <div className="text-3xl font-black text-emerald-700 font-mono">
                    {(totalPayoutCents / 100).toFixed(2)}€
                  </div>
                  <div className="text-[11px] text-stone-600 pt-1">
                    Comisión plataforma Tiétar: 5%
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#eadcc7] shadow-sm space-y-1">
                  <div className="text-xs text-stone-600 font-medium">Tiempo Medio Preparación</div>
                  <div className="text-3xl font-black text-[#FF4E00] font-mono">
                    18 min
                  </div>
                  <div className="text-[11px] text-stone-600 pt-1">
                    Objetivo: &lt; 25 min en hora punta
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#eadcc7] shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-stone-900">
                  Distribución Horaria de Pedidos en Sotillo de la Adrada
                </h3>
                <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
                  <div className="p-3 rounded-xl bg-[#fffaf5] border border-[#eadcc7]">
                    <div className="text-stone-600">13:00 - 15:30</div>
                    <div className="font-bold text-stone-900 mt-1">Almuerzos (35%)</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#fffaf5] border border-[#eadcc7]">
                    <div className="text-stone-600">19:30 - 21:00</div>
                    <div className="font-bold text-stone-900 mt-1">Tapeo (20%)</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#fff1e7] border border-[#f5c8a5]">
                    <div className="text-[#FF4E00] font-bold">21:00 - 23:30 (Pico)</div>
                    <div className="font-bold text-stone-900 mt-1">Cenas Fuertes (40%)</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#fffaf5] border border-[#eadcc7]">
                    <div className="text-stone-600">23:30 - 00:30</div>
                    <div className="font-bold text-stone-900 mt-1">Tardíos (5%)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EQUIPO */}
          {activeTab === 'team' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  PERSONAL DE TURNO
                </div>
                <h2 className="text-2xl font-black text-stone-900">
                  Equipo de Cocina y Sala
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Junior / Rafael', role: 'Jefe de Cocina & Gerente', status: 'Activo en Turno', avatar: currentUser?.avatarUrl },
                  { name: 'Carlos Martín', role: 'Segundo de Cocina / Plancha', status: 'Activo en Turno', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80' },
                  { name: 'Elena Gómez', role: 'Caja & Comandas Mostrador', status: 'Activo en Turno', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80' },
                  { name: 'Marcos R.', role: 'Repartidor de Ruta Valle', status: 'En Ruta', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80' }
                ].map((member, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white border border-[#eadcc7] flex items-center space-x-3 shadow-sm">
                    <img src={member.avatar} alt={member.name} className="w-11 h-11 rounded-full object-cover border border-[#e5d5c1]" />
                    <div>
                      <div className="font-bold text-stone-900 text-sm">{member.name}</div>
                      <div className="text-xs text-stone-600">{member.role}</div>
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>{member.status}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {newBusinessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#fffdfb] rounded-3xl max-w-2xl w-full p-6 border border-[#eadcc7] shadow-2xl space-y-5 text-stone-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#f0e2d5] pb-3">
              <div>
                <h3 className="font-bold text-lg text-stone-900">Crear negocio nuevo</h3>
                <p className="text-xs text-stone-600">Completa todos los datos del comercio y deja listo el catálogo inicial.</p>
              </div>
              <button onClick={() => setNewBusinessModalOpen(false)} className="text-stone-500 hover:text-stone-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-stone-600 block mb-1">Nombre del negocio</label>
                  <input value={newBusinessForm.name} onChange={(e) => setNewBusinessForm(prev => ({ ...prev, name: e.target.value }))} className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF4E00]" placeholder="Ej. La Bodeguita del Valle" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-stone-600 block mb-1">Razón social</label>
                  <input value={newBusinessForm.legalName} onChange={(e) => setNewBusinessForm(prev => ({ ...prev, legalName: e.target.value }))} className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF4E00]" placeholder="Ej. La Bodeguita del Valle SL" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-stone-600 block mb-1">CIF</label>
                  <input value={newBusinessForm.cif} onChange={(e) => setNewBusinessForm(prev => ({ ...prev, cif: e.target.value }))} className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF4E00]" placeholder="B12345678" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-stone-600 block mb-1">Categoría</label>
                  <select value={newBusinessForm.category} onChange={(e) => setNewBusinessForm(prev => ({ ...prev, category: e.target.value }))} className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF4E00]">
                    <option value="hamburguesas">Hamburguesas</option>
                    <option value="pizzas">Pizzas</option>
                    <option value="kioscos">Kioscos</option>
                    <option value="tapas">Tapas</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-stone-600 block mb-1">Zona</label>
                  <select value={newBusinessForm.localityId} onChange={(e) => setNewBusinessForm(prev => ({ ...prev, localityId: e.target.value }))} className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF4E00]">
                    {LOCALITIES.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-stone-600 block mb-1">Teléfono</label>
                  <input value={newBusinessForm.phone} onChange={(e) => setNewBusinessForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF4E00]" placeholder="+34 600 000 000" />
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-stone-600 block mb-1">Dirección</label>
                <input value={newBusinessForm.address} onChange={(e) => setNewBusinessForm(prev => ({ ...prev, address: e.target.value }))} className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF4E00]" placeholder="Calle Mayor 12, 05420 Sotillo de la Adrada" />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-stone-600 block mb-1">Email</label>
                <input value={newBusinessForm.email} onChange={(e) => setNewBusinessForm(prev => ({ ...prev, email: e.target.value }))} className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF4E00]" placeholder="contacto@negocio.es" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-stone-600 block mb-1">Gasto de envío (€)</label>
                  <input type="number" min="0" step="1" value={newBusinessForm.deliveryFeeCents} onChange={(e) => setNewBusinessForm(prev => ({ ...prev, deliveryFeeCents: e.target.value }))} className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF4E00]" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-stone-600 block mb-1">Tiempo estimado min</label>
                  <input type="number" min="1" value={newBusinessForm.estimatedTimeMin} onChange={(e) => setNewBusinessForm(prev => ({ ...prev, estimatedTimeMin: e.target.value }))} className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF4E00]" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-stone-600 block mb-1">Tiempo estimado max</label>
                  <input type="number" min="1" value={newBusinessForm.estimatedTimeMax} onChange={(e) => setNewBusinessForm(prev => ({ ...prev, estimatedTimeMax: e.target.value }))} className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF4E00]" />
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-stone-600 block mb-1">Banner del negocio</label>
                <input value={newBusinessForm.bannerUrl} onChange={(e) => setNewBusinessForm(prev => ({ ...prev, bannerUrl: e.target.value }))} className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF4E00]" placeholder="URL imagen banner" />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-stone-600 block mb-1">Logo del negocio</label>
                <input value={newBusinessForm.logoUrl} onChange={(e) => setNewBusinessForm(prev => ({ ...prev, logoUrl: e.target.value }))} className="w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF4E00]" placeholder="URL imagen logo" />
              </div>

              <button type="submit" className="w-full py-3 rounded-xl bg-[#FF4E00] hover:bg-[#E64600] text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer">
                Crear negocio
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: + NUEVO PEDIDO MANUAL (Comanda de Mesa / Teléfono) */}
      {newOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#121216] rounded-3xl max-w-xl w-full p-6 border border-stone-800 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="font-bold text-lg text-white">
                  + Nueva Comanda de Cocina
                </h3>
                <p className="text-xs text-stone-400">
                  Para pedidos telefónicos o comensales en barra/mesa
                </p>
              </div>
              <button 
                onClick={() => setNewOrderModal(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">Nombre Comensal</label>
                  <input
                    type="text"
                    value={manualCustomerName}
                    onChange={(e) => setManualCustomerName(e.target.value)}
                    placeholder="Ej. Juan Gómez"
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#FF4E00]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">Mesa o Referencia</label>
                  <input
                    type="text"
                    value={manualTableNumber}
                    onChange={(e) => setManualTableNumber(e.target.value)}
                    placeholder="Ej. Mesa 4 / Terraza"
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#FF4E00]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-2">Seleccionar Platos de la Carta</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {restaurantProducts.map(prod => (
                    <div 
                      key={prod.id}
                      onClick={() => addProductToManualTicket(prod)}
                      className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 cursor-pointer flex items-center justify-between text-xs transition"
                    >
                      <div className="truncate pr-2">
                        <div className="font-bold text-white truncate">{prod.name}</div>
                        <div className="text-stone-400">{(prod.priceCents / 100).toFixed(2)}€</div>
                      </div>
                      <Plus className="w-4 h-4 text-[#FF4E00] shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected items summary */}
              {manualSelectedItems.length > 0 && (
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                  <div className="text-xs font-bold text-stone-400 uppercase">Comanda en marcha</div>
                  {manualSelectedItems.map(item => (
                    <div key={item.product.id} className="flex items-center justify-between text-xs">
                      <span>{item.quantity}x {item.product.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">{((item.product.priceCents * item.quantity) / 100).toFixed(2)}€</span>
                        <button 
                          type="button" 
                          onClick={() => removeProductFromManualTicket(item.product.id)}
                          className="text-red-400 hover:text-red-300 font-bold px-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-stone-800 flex justify-between font-bold text-sm">
                    <span>Total Comanda:</span>
                    <span className="text-[#FF4E00] font-mono">
                      {(manualSelectedItems.reduce((acc, i) => acc + (i.product.priceCents * i.quantity), 0) / 100).toFixed(2)}€
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-white text-stone-950 font-black text-xs uppercase tracking-wider hover:bg-stone-200 transition cursor-pointer"
              >
                Enviar Directo a Cocina
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE TICKET & CAMBIO DE ESTADO */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#141418] rounded-3xl max-w-lg w-full p-6 border border-stone-800 shadow-2xl space-y-5 text-white animate-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <div className="font-mono font-black text-base text-[#FF4E00]">
                  Ticket #{selectedTicket.orderNumber}
                </div>
                <div className="text-xs text-stone-400">
                  {selectedTicket.customerName} ({selectedTicket.customerPhone})
                </div>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dishes list */}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              <div className="text-xs font-bold text-stone-400 uppercase">Detalle para Fogones</div>
              {selectedTicket.items.map((it, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-xs">
                  <div className="font-bold text-white text-sm">
                    {it.quantity}x {it.productName}
                  </div>
                  {it.removedIngredients.length > 0 && (
                    <div className="text-red-400 font-bold text-[11px] mt-0.5">
                      SIN: {it.removedIngredients.join(', ')}
                    </div>
                  )}
                  {it.selectedOptions.length > 0 && (
                    <div className="text-stone-400 text-[11px] mt-0.5">
                      {it.selectedOptions.map(o => o.optionName).join(' • ')}
                    </div>
                  )}
                  {it.customerNote && (
                    <div className="text-amber-400 italic text-[11px] mt-1 bg-amber-500/10 p-1.5 rounded-md">
                      Nota comensal: "{it.customerNote}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-stone-800 space-y-2">
              {selectedTicket.status === 'PAID' || selectedTicket.status === 'NEW' ? (
                <button
                  onClick={() => {
                    updateOrderStatus(selectedTicket.id, 'PREPARING', 'Comanda aceptada en cocina');
                    setSelectedTicket(null);
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl"
                >
                  Aceptar y Pasar a Preparación
                </button>
              ) : selectedTicket.status === 'PREPARING' || selectedTicket.status === 'ACCEPTED' ? (
                <button
                  onClick={() => {
                    updateOrderStatus(selectedTicket.id, 'READY', 'Comanda terminada en fogones');
                    setSelectedTicket(null);
                  }}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl"
                >
                  Marcar como LISTO para Reparto / Salida
                </button>
              ) : selectedTicket.status === 'READY' ? (
                <button
                  onClick={() => {
                    updateOrderStatus(selectedTicket.id, 'PICKED_UP', 'Entregado al repartidor');
                    setSelectedTicket(null);
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                >
                  Confirmar Salida con Repartidor
                </button>
              ) : null}

              {/* Thermal print button emulator */}
              <button
                onClick={() => {
                  showNotification(`Ticket #${selectedTicket.orderNumber} enviado a impresora térmica de cocina.`, 'success');
                }}
                className="w-full py-2.5 rounded-xl border border-stone-800 hover:bg-stone-800 text-xs font-semibold text-stone-300 flex items-center justify-center space-x-2"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Reimprimir Comanda Térmica (80mm)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: INFORME DE CIERRE DE TURNO */}
      {shiftReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#141418] rounded-3xl max-w-md w-full p-6 border border-stone-800 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-bold text-base text-white">
                Arqueo y Cierre de Turno de Cocina
              </h3>
              <button onClick={() => setShiftReportModal(false)} className="text-stone-400">✕</button>
            </div>

            <div className="space-y-2.5 text-xs text-stone-300">
              <div className="flex justify-between">
                <span>Establecimiento:</span>
                <strong className="text-white">{business.name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Responsable de caja:</span>
                <span>{currentUser?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Comandas procesadas:</span>
                <strong>{businessOrders.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Ventas brutas comensales:</span>
                <strong>{(totalSalesCents / 100).toFixed(2)}€</strong>
              </div>
              <div className="flex justify-between">
                <span>Comisión PideTiétar (5%):</span>
                <span>{((totalSalesCents * 0.05) / 100).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-stone-800 font-bold text-sm text-white">
                <span>Liquidación Neta Negocio:</span>
                <span className="text-emerald-400 font-mono">{(totalPayoutCents / 100).toFixed(2)}€</span>
              </div>
            </div>

            <button
              onClick={() => {
                showNotification('Informe de arqueo generado y remitido a contabilidad por Gmail.', 'success');
                setShiftReportModal(false);
              }}
              className="w-full py-3 bg-[#FF4E00] hover:bg-[#A32300] text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Descargar y Notificar por Gmail</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURACIÓN */}
      {settingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#141418] rounded-3xl max-w-md w-full p-6 border border-stone-800 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-bold text-base text-white">
                Configuración del Terminal
              </h3>
              <button onClick={() => setSettingsModal(false)} className="text-stone-400">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-900 border border-stone-800">
                <div>
                  <div className="font-bold text-white">Alerta Sonora Comanda</div>
                  <div className="text-stone-400 text-[11px]">Sonar timbre al entrar nuevo pedido</div>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2 rounded-lg ${soundEnabled ? 'bg-[#FF4E00] text-white' : 'bg-stone-800 text-stone-500'}`}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-900 border border-stone-800">
                <div>
                  <div className="font-bold text-white">Auto-impresión Térmica</div>
                  <div className="text-stone-400 text-[11px]">Imprimir comanda al ser aceptada</div>
                </div>
                <button
                  onClick={() => setAutoPrintThermal(!autoPrintThermal)}
                  className={`p-2 rounded-lg ${autoPrintThermal ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-500'}`}
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-900 border border-stone-800">
                <div>
                  <div className="font-bold text-white">Sincronización Google Calendar</div>
                  <div className="text-stone-400 text-[11px]">Planificación de turnos de cocina</div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                  Conectado
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                showNotification('Preferencias de cocina guardadas.', 'success');
                setSettingsModal(false);
              }}
              className="w-full py-2.5 bg-white text-stone-950 font-bold text-xs rounded-xl"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
