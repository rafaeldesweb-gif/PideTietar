import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, Users, Store, DollarSign, 
  MapPin, AlertCircle, BarChart3, CheckCircle2, 
  Settings, RefreshCw, Trash2, Plus
} from 'lucide-react';
import { CATEGORIES } from '../data/mockData';
import { Business, Locality } from '../types';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface AdminDashboardProps {
  onNavigateToBusiness?: (bizId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateToBusiness }) => {
  const { 
    businesses, 
    orders, 
    updateBusinessShift,
    localities,
    addLocality,
    deleteLocality,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    createUserAccount,
    showNotification
  } = useApp();


  const totalGrossVolumeCents = orders.reduce((acc, o) => acc + o.totalCents, 0);
  const totalPlatformCommissionsCents = orders.reduce((acc, o) => acc + o.platformFeeCents, 0);

  // Forms State
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneZip, setNewZoneZip] = useState('');

  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);

  const [newBusinessForm, setNewBusinessForm] = useState({
    name: '',
    legalName: '',
    cif: '',
    accountNumber: '',
    category: '',
    localityId: '',
    phone: '',
    email: '',
    address: '',
    managerName: '',
    managerDni: '',
    bannerUrl: '',
    adminUsername: '',
    adminEmail: '',
    adminPassword: '',
    adminRole: 'BUSINESS_ADMIN' as 'BUSINESS_ADMIN' | 'BUSINESS_COURIER' | 'PLATFORM_COURIER',
    schedule: [
      { dayOfWeek: 1, openTime: '12:00', closeTime: '23:00', isOpen: true },
      { dayOfWeek: 2, openTime: '12:00', closeTime: '23:00', isOpen: true },
      { dayOfWeek: 3, openTime: '12:00', closeTime: '23:00', isOpen: true },
      { dayOfWeek: 4, openTime: '12:00', closeTime: '23:00', isOpen: true },
      { dayOfWeek: 5, openTime: '12:00', closeTime: '00:00', isOpen: true },
      { dayOfWeek: 6, openTime: '12:00', closeTime: '00:00', isOpen: true },
      { dayOfWeek: 0, openTime: '12:00', closeTime: '23:00', isOpen: true },
    ]
  });

  const handleScheduleChange = (dayIndex: number, field: string, value: any) => {
    const newSchedule = [...newBusinessForm.schedule];
    newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
    setNewBusinessForm({...newBusinessForm, schedule: newSchedule});
  };

  const resetBusinessForm = () => {
    setNewBusinessForm({
      name: '', legalName: '', cif: '', accountNumber: '', category: '', localityId: '', phone: '', email: '', address: '', managerName: '', managerDni: '', bannerUrl: '',
      adminUsername: '',
      adminEmail: '',
      adminPassword: '',
      adminRole: 'BUSINESS_ADMIN',
      schedule: [
        { dayOfWeek: 1, openTime: '12:00', closeTime: '23:00', isOpen: true },
        { dayOfWeek: 2, openTime: '12:00', closeTime: '23:00', isOpen: true },
        { dayOfWeek: 3, openTime: '12:00', closeTime: '23:00', isOpen: true },
        { dayOfWeek: 4, openTime: '12:00', closeTime: '23:00', isOpen: true },
        { dayOfWeek: 5, openTime: '12:00', closeTime: '00:00', isOpen: true },
        { dayOfWeek: 6, openTime: '12:00', closeTime: '00:00', isOpen: true },
        { dayOfWeek: 0, openTime: '12:00', closeTime: '23:00', isOpen: true },
      ]
    });
  };

  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName || !newZoneZip) return;
    addLocality({
      name: newZoneName,
      postalCode: newZoneZip,
      active: true,
      coordinates: { lat: 40.3, lng: -4.6 }, // Default mock coords
    });
    showNotification('Zona añadida correctamente', 'success');
    setNewZoneName('');
    setNewZoneZip('');
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessForm.name || !newBusinessForm.localityId) return;

    if (!newBusinessForm.adminUsername.trim() || !newBusinessForm.adminEmail.trim() || !newBusinessForm.adminPassword.trim()) {
      showNotification('Debes asignar usuario, email y contraseña al nuevo negocio.', 'error');
      return;
    }

    if (newBusinessForm.adminPassword.trim().length < 8) {
      showNotification('La contraseña del usuario del negocio debe tener al menos 8 caracteres.', 'error');
      return;
    }

    const createdBusiness = createBusiness({
      ...newBusinessForm,
      category: newBusinessForm.category || 'Restaurante',
      rating: 5.0,
      reviewCount: 0,
      estimatedTimeMin: 20,
      estimatedTimeMax: 40,
      deliveryFeeCents: 250,
      minOrderCents: 1000,
      bannerUrl: newBusinessForm.bannerUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80',
      logoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&auto=format&fit=crop&q=80',
      isShiftOpen: false,
      deliveryModes: ['PLATFORM_COURIER', 'PICKUP'],
      deliveryRadiusKm: 10,
      status: 'APPROVED',
      schedule: newBusinessForm.schedule,
    });

    const accountCreated = await createUserAccount({
      username: newBusinessForm.adminUsername.trim(),
      fullName: `${newBusinessForm.managerName.trim() || newBusinessForm.name.trim()} (${newBusinessForm.name.trim()})`,
      email: newBusinessForm.adminEmail.trim(),
      password: newBusinessForm.adminPassword.trim(),
      role: newBusinessForm.adminRole,
    });

    if (!accountCreated) {
      showNotification(
        `El negocio ${createdBusiness.name} se creó, pero no se pudo crear su usuario asignado.`,
        'error',
      );
      return;
    }

    showNotification(
      `Negocio ${createdBusiness.name} creado y usuario ${newBusinessForm.adminUsername.trim()} asignado.`,
      'success',
    );
    resetBusinessForm();
    setShowBusinessForm(false);
  };

  const startEditingBusiness = (business: Business) => {
    setEditingBusinessId(business.id);
    setShowBusinessForm(true);
    setNewBusinessForm({
      name: business.name,
      legalName: business.legalName,
      cif: business.cif,
      accountNumber: business.accountNumber || '',
      category: business.category || '',
      localityId: business.localityId,
      phone: business.phone,
      email: business.email,
      address: business.address,
      managerName: business.managerName || '',
      managerDni: business.managerDni || '',
      bannerUrl: business.bannerUrl || '',
      adminUsername: '',
      adminEmail: '',
      adminPassword: '',
      adminRole: 'BUSINESS_ADMIN',
      schedule: business.schedule?.length ? business.schedule : newBusinessForm.schedule,
    });
  };

  const handleSaveBusinessEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusinessId) return;

    const saved = await updateBusiness(editingBusinessId, {
      name: newBusinessForm.name,
      legalName: newBusinessForm.legalName,
      cif: newBusinessForm.cif,
      accountNumber: newBusinessForm.accountNumber,
      category: newBusinessForm.category,
      localityId: newBusinessForm.localityId,
      phone: newBusinessForm.phone,
      email: newBusinessForm.email,
      address: newBusinessForm.address,
      managerName: newBusinessForm.managerName,
      managerDni: newBusinessForm.managerDni,
      bannerUrl: newBusinessForm.bannerUrl,
      schedule: newBusinessForm.schedule,
    });

    if (saved) {
      setEditingBusinessId(null);
      resetBusinessForm();
      setShowBusinessForm(false);
    }
  };

  const handleDeleteBusiness = async (business: Business) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar el negocio "${business.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    await deleteBusiness(business.id);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">
              Superadministración PideTiétar
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Supervisión global de las localidades del Valle del Tiétar, comisiones y conciliación financiera
          </p>
        </div>
        <div className="text-right text-xs text-stone-400 font-mono">
          rafaeldesweb@gmail.com
        </div>
      </div>

      {/* METRICS SECTION */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold font-serif text-stone-900 dark:text-stone-100 uppercase tracking-wide">
          Métricas Financieras
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800">
            <div className="text-xs font-semibold text-stone-400">Volumen Bruto Gestionado (GMV)</div>
            <div className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-100 mt-1">
              {(totalGrossVolumeCents / 100).toFixed(2)}€
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Total pedidos pagados vía Stripe/PayPal</p>
          </div>

          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800">
            <div className="text-xs font-semibold text-stone-400">Ingresos Plataforma PideTiétar</div>
            <div className="text-2xl font-bold font-serif text-[#FF4E00] mt-1">
              {(totalPlatformCommissionsCents / 100).toFixed(2)}€
            </div>
            <p className="text-[11px] text-stone-500 mt-1">5% productos + 20% reparto</p>
          </div>

          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800">
            <div className="text-xs font-semibold text-stone-400">Comercios Homologados</div>
            <div className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-100 mt-1">
              {businesses.length}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">100% operativos en el valle</p>
          </div>
        </div>
      </div>

      {/* LOCALITIES SECTION */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 space-y-6 shadow-xs">
        <h2 className="text-base font-bold font-serif text-stone-900 dark:text-stone-100">
          Zonas y Localidades de Reparto
        </h2>
        
        {/* Add Zone */}
        <form onSubmit={handleAddZone} className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-2xl border border-stone-100 flex items-end space-x-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-500 mb-1">Nombre Localidad</label>
            <input 
              type="text" 
              required 
              value={newZoneName}
              onChange={e => setNewZoneName(e.target.value)}
              className="field-ink w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder:text-gray-400"
              placeholder="Ej. Cenicientos"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-semibold text-stone-500 mb-1">C. Postal</label>
            <input 
              type="text" 
              required 
              value={newZoneZip}
              onChange={e => setNewZoneZip(e.target.value)}
              className="field-ink w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder:text-gray-400"
              placeholder="28941"
            />
          </div>
          <button type="submit" className="bg-stone-900 text-white rounded-xl px-6 py-2 text-sm font-semibold hover:bg-stone-800 flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Añadir</span>
          </button>
        </form>

        {/* List Zones */}
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {localities.map(loc => (
            <div key={loc.id} className="py-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">{loc.name}</h3>
                <p className="text-xs text-stone-500">CP: {loc.postalCode} • {businesses.filter(b => b.localityId === loc.id).length} comercios</p>
              </div>
              <button
                onClick={() => {
                  deleteLocality(loc.id);
                  showNotification('Localidad eliminada', 'success');
                }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar localidad"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* BUSINESSES SECTION */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 space-y-6 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold font-serif text-stone-900 dark:text-stone-100">
            Gestión de Comercios y Negocios
          </h2>
          <button 
            onClick={() => {
              if (showBusinessForm) {
                setShowBusinessForm(false);
                setEditingBusinessId(null);
                resetBusinessForm();
                return;
              }
              setEditingBusinessId(null);
              resetBusinessForm();
              setShowBusinessForm(true);
            }} 
            className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{showBusinessForm ? 'Cerrar Formulario' : 'Registrar Nuevo Comercio'}</span>
          </button>
        </div>

        {/* Add Business */}
        {showBusinessForm && (
        <form onSubmit={editingBusinessId ? handleSaveBusinessEdit : handleCreateBusiness} className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-2xl border border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Nombre Comercial</label>
            <input required value={newBusinessForm.name} onChange={e => setNewBusinessForm({...newBusinessForm, name: e.target.value})} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400" placeholder="Ej. El Buen Sabor" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Razón Social</label>
            <input required value={newBusinessForm.legalName} onChange={e => setNewBusinessForm({...newBusinessForm, legalName: e.target.value})} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400" placeholder="Ej. El Buen Sabor S.L." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">CIF / NIF</label>
            <input required value={newBusinessForm.cif} onChange={e => setNewBusinessForm({...newBusinessForm, cif: e.target.value})} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400" placeholder="Ej. B12345678" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Localidad</label>
            <select required value={newBusinessForm.localityId} onChange={e => setNewBusinessForm({...newBusinessForm, localityId: e.target.value})} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black">
              <option value="" className="text-stone-400">Seleccionar...</option>
              {localities.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Dirección</label>
            <input required value={newBusinessForm.address} onChange={e => setNewBusinessForm({...newBusinessForm, address: e.target.value})} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400" placeholder="Calle Mayor 12" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Teléfono</label>
            <input required type="tel" value={newBusinessForm.phone} onChange={e => setNewBusinessForm({...newBusinessForm, phone: e.target.value})} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400" placeholder="Ej. 600 000 000" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Email</label>
            <input required type="email" value={newBusinessForm.email} onChange={e => setNewBusinessForm({...newBusinessForm, email: e.target.value})} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400" placeholder="Ej. contacto@empresa.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Nombre del Responsable</label>
            <input required value={newBusinessForm.managerName} onChange={e => setNewBusinessForm({...newBusinessForm, managerName: e.target.value})} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400" placeholder="Ej. Juan Pérez" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">DNI/NIE</label>
            <input required value={newBusinessForm.managerDni} onChange={e => setNewBusinessForm({...newBusinessForm, managerDni: e.target.value})} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400" placeholder="Ej. 12345678A" />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-500 mb-1">Número de cuenta para transferencias</label>
            <input required value={newBusinessForm.accountNumber} onChange={e => setNewBusinessForm({...newBusinessForm, accountNumber: e.target.value})} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400" placeholder="ES12 3456 7890 1234 5678 9012" />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-500 mb-1">Foto para Banner</label>
            <input required type="file" accept="image/*" onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                const url = URL.createObjectURL(file);
                setNewBusinessForm({...newBusinessForm, bannerUrl: url});
              }
            }} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-stone-100 file:text-[#FF4E00] hover:file:bg-stone-200" />
          </div>

          <div className="col-span-full pt-2">
            <label className="block text-xs font-semibold text-stone-500 mb-2">Horario de Apertura Semanal</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {newBusinessForm.schedule.map((day, idx) => (
                <div key={day.dayOfWeek} className="flex flex-col space-y-2 bg-white dark:bg-stone-950 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                  <div className="w-full">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={day.isOpen} onChange={e => handleScheduleChange(idx, 'isOpen', e.target.checked)} className="accent-[#FF4E00]" />
                      <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{DAYS[day.dayOfWeek]}</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="time" value={day.openTime} disabled={!day.isOpen} onChange={e => handleScheduleChange(idx, 'openTime', e.target.value)} className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded px-2 py-1 text-sm outline-none disabled:opacity-50 dark:text-stone-300 text-black w-full" />
                    <span className="text-stone-400">-</span>
                    <input type="time" value={day.closeTime} disabled={!day.isOpen} onChange={e => handleScheduleChange(idx, 'closeTime', e.target.value)} className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded px-2 py-1 text-sm outline-none disabled:opacity-50 dark:text-stone-300 text-black w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!editingBusinessId && (
            <>
              <div className="col-span-full border-t border-stone-200 pt-4">
                <h3 className="text-sm font-bold text-stone-800">Cuenta asignada del negocio</h3>
                <p className="mt-1 text-xs text-stone-500">
                  El Superadmin crea aquí el usuario, contraseña y rol que usará el negocio.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Usuario de acceso</label>
                <input required value={newBusinessForm.adminUsername} onChange={e => setNewBusinessForm({...newBusinessForm, adminUsername: e.target.value})} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400" placeholder="ej. elpensionista_admin" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Email de acceso</label>
                <input required type="email" value={newBusinessForm.adminEmail} onChange={e => setNewBusinessForm({...newBusinessForm, adminEmail: e.target.value})} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400" placeholder="ej. admin@negocio.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Contraseña inicial</label>
                <input required type="password" minLength={8} value={newBusinessForm.adminPassword} onChange={e => setNewBusinessForm({...newBusinessForm, adminPassword: e.target.value})} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400" placeholder="Mínimo 8 caracteres" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Rol asignado</label>
                <select value={newBusinessForm.adminRole} onChange={e => setNewBusinessForm({...newBusinessForm, adminRole: e.target.value as 'BUSINESS_ADMIN' | 'BUSINESS_COURIER' | 'PLATFORM_COURIER'})} className="w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black">
                  <option value="BUSINESS_ADMIN">Admin Comercio</option>
                  <option value="BUSINESS_COURIER">Repartidor del Negocio</option>
                  <option value="PLATFORM_COURIER">Repartidor Plataforma</option>
                </select>
              </div>
            </>
          )}
          
          <div className="col-span-full pt-4">
            <button type="submit" className="w-full bg-[#FF4E00] text-white rounded-xl px-6 py-3 text-sm font-bold hover:bg-[#E64600] flex items-center justify-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>{editingBusinessId ? 'Guardar Cambios del Comercio' : 'Guardar Comercio y Crear Usuario'}</span>
            </button>
            {editingBusinessId && (
              <button
                type="button"
                onClick={() => {
                  setEditingBusinessId(null);
                  resetBusinessForm();
                  setShowBusinessForm(false);
                }}
                className="mt-2 w-full rounded-xl border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
        )}

        <div className="overflow-x-auto pt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800 text-stone-400 uppercase font-semibold">
                <th className="pb-3">Comercio</th>
                <th className="pb-3">Localidad</th>
                <th className="pb-3">CIF</th>
                <th className="pb-3">Estado Turno</th>
                <th className="pb-3">Catálogo Base</th>
                <th className="pb-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {businesses.map(biz => (
                <tr key={biz.id} className="text-stone-700 dark:text-stone-300">
                  <td className="py-3 font-semibold text-stone-900 dark:text-stone-100">
                    {biz.name}
                  </td>
                  <td className="py-3">
                    {localities.find(l => l.id === biz.localityId)?.name || biz.localityId}
                  </td>
                  <td className="py-3 font-mono">{biz.cif || '-'}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      biz.isShiftOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {biz.isShiftOpen ? 'Abierto' : 'Cerrado'}
                    </span>
                  </td>
                  <td className="py-3">
                     <button
                       onClick={() => {
                         if (onNavigateToBusiness) {
                           onNavigateToBusiness(biz.id);
                         } else {
                           showNotification(`El enlace supersecreto de ${biz.name} es: /store/${biz.id}?admin=true`, 'info');
                         }
                       }}
                       className="text-white bg-stone-800 px-3 py-1 rounded-lg hover:bg-stone-700"
                     >
                       Enlace Admin
                     </button>
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button
                        onClick={() => startEditingBusiness(biz)}
                        className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteBusiness(biz)}
                        className="text-xs text-red-600 hover:underline font-semibold cursor-pointer"
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={() => {
                          updateBusinessShift(biz.id, !biz.isShiftOpen);
                          showNotification(biz.isShiftOpen ? `Turno de ${biz.name} forzado a cerrado` : `Turno de ${biz.name} forzado a abierto`, 'success');
                        }}
                        className="text-xs text-[#FF4E00] hover:underline font-semibold cursor-pointer"
                      >
                        {biz.isShiftOpen ? 'Forzar Cierre' : 'Abrir Turno'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
