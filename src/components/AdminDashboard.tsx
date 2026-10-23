import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, Users, Store, DollarSign, 
  MapPin, AlertCircle, BarChart3, CheckCircle2, 
  Settings, RefreshCw, Trash2, Plus, Bike, Pencil, X,
  Eye, EyeOff
} from 'lucide-react';
import { CATEGORIES } from '../data/mockData';
import { Business, Locality, User } from '../types';
import {
  FieldError,
  FieldErrors,
  fieldClass,
  firstErrorMessage,
  toBusinessFieldErrors,
  toCourierFieldErrors,
} from './FormErrors';
import { fileToDataUrl } from '../utils/imageUpload';
import { normalizeDni, validateCourierContact } from '../utils/courierValidation';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const IBAN_REGEX = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/;

const normalizeIban = (value: string) =>
  value.replace(/\s+/g, '').toUpperCase();

const maskIban = (value?: string) => {
  const clean = normalizeIban(value || '');
  if (!clean) return 'Sin IBAN';
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 4)} **** **** ${clean.slice(-4)}`;
};

const assignedBusinessIds = (courier: User): string[] => {
  const fromProfile = courier.courierProfile?.businessIds || [];
  if (fromProfile.length) return fromProfile;
  return courier.businessId ? [courier.businessId] : [];
};

// Validación compartida por el alta y la edición del repartidor.
const validateCourierBanking = (
  role: User['role'],
  businessIds: string[],
  accountNumber: string,
): FieldErrors => {
  const errors: FieldErrors = {};
  if (role === 'BUSINESS_COURIER' && businessIds.length === 0) {
    errors.businessIds = 'Selecciona al menos un negocio para el repartidor.';
  }
  const cleanIban = normalizeIban(accountNumber);
  if (cleanIban && !IBAN_REGEX.test(cleanIban)) {
    errors.accountNumber =
      'El IBAN no es válido. Ejemplo: ES91 2100 0418 4502 0005 1332.';
  }
  return errors;
};

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
    refreshBusinesses,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    createUserAccount,
    listCouriers,
    setCourierConfirmation,
    updateCourierDetails,
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

  // Errores campo a campo devueltos por el servidor (clave camelCase del form).
  const [businessFormErrors, setBusinessFormErrors] = useState<FieldErrors>({});

  const handleScheduleChange = (dayIndex: number, field: string, value: any) => {
    const newSchedule = [...newBusinessForm.schedule];
    newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
    setNewBusinessForm({...newBusinessForm, schedule: newSchedule});
  };

  const resetBusinessForm = () => {
    setBusinessFormErrors({});
    setNewBusinessForm({
      name: '', legalName: '', cif: '', accountNumber: '', category: '', localityId: '', phone: '', email: '', address: '', managerName: '', managerDni: '', bannerUrl: '',
      adminUsername: '',
      adminEmail: '',
      adminPassword: '',
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

  // Nota: antes había un botón "Generar usuario y clave" que inventaba un
  // usuario y una contraseña aleatorios. Se ha retirado a petición: el único
  // usuario que se crea es el que el superadmin escribe en el formulario, y la
  // clave que él asigna. Aquí no se genera nada por su cuenta.

  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName || !newZoneZip) return;
    addLocality({
      name: newZoneName,
      postalCode: newZoneZip,
      active: true,
      coordinates: { lat: 0, lng: 0 },
    });
    showNotification('Zona añadida correctamente', 'success');
    setNewZoneName('');
    setNewZoneZip('');
  };

  // --- Repartidores -------------------------------------------------------
  const [couriers, setCouriers] = useState<User[]>([]);
  const [couriersLoading, setCouriersLoading] = useState(false);
  // El formulario de alta se despliega con el botón "Actualizar" de la
  // cabecera, en vez de ocupar sitio permanentemente.
  const [showCourierForm, setShowCourierForm] = useState(false);
  const [showCourierPassword, setShowCourierPassword] = useState(false);
  // Los negocios se recargan del servidor al entrar para que la lista coincida
  // siempre con la base de datos; así el alta de repartidor y la edición/borrado
  // de comercios no trabajan con datos obsoletos.
  const [businessesLoading, setBusinessesLoading] = useState(true);
  const [courierForm, setCourierForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    dni: '',
    role: 'PLATFORM_COURIER' as 'PLATFORM_COURIER' | 'BUSINESS_COURIER',
    businessIds: [] as string[],
    accountNumber: '',
  });
  const [courierFormErrors, setCourierFormErrors] = useState<FieldErrors>({});
  const [courierSubmitting, setCourierSubmitting] = useState(false);

  // Edición de negocios e IBAN de un repartidor (sólo superadmin).
  const [editingCourier, setEditingCourier] = useState<User | null>(null);
  const [courierEditForm, setCourierEditForm] = useState({
    businessIds: [] as string[],
    phone: '',
    address: '',
    dni: '',
    accountNumber: '',
  });
  const [courierEditErrors, setCourierEditErrors] = useState<FieldErrors>({});
  const [courierEditSaving, setCourierEditSaving] = useState(false);

  const refreshCouriers = async () => {
    setCouriersLoading(true);
    const rows = await listCouriers();
    setCouriers(rows);
    setCouriersLoading(false);
  };

  const refreshBusinessCatalog = async () => {
    setBusinessesLoading(true);
    const rows = await refreshBusinesses();
    setBusinessesLoading(false);
    return rows;
  };

  // Quita de una selección los IDs que ya no existen en el servidor. Sólo se
  // aplica si la recarga fue correcta: si falló, se conserva lo que hubiera.
  const keepExistingBusinessIds = (ids: string[], rows: Business[] | null) =>
    rows ? ids.filter((id) => rows.some((business) => business.id === id)) : ids;

  useEffect(() => {
    void refreshCouriers();
    void refreshBusinessCatalog();
    // Sólo al montar el panel: los cambios se refrescan tras crear o confirmar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCourierForm = () => {
    const next = !showCourierForm;
    setShowCourierForm(next);
    setShowCourierPassword(false);
    setCourierFormErrors({});

    if (next) {
      // Al abrir el formulario se consulta el servidor: los checkboxes deben
      // enseñar negocios reales, no los que quedaron cacheados en el navegador.
      void refreshCouriers();
      void refreshBusinessCatalog().then((rows) => {
        setCourierForm((previous) => ({
          ...previous,
          businessIds: keepExistingBusinessIds(previous.businessIds, rows),
        }));
      });
    }
  };

  const toggleCourierBusiness = (businessId: string) => {
    setCourierForm((previous) => ({
      ...previous,
      businessIds: previous.businessIds.includes(businessId)
        ? previous.businessIds.filter((id) => id !== businessId)
        : [...previous.businessIds, businessId],
    }));
    setCourierFormErrors((previous) => ({
      ...previous,
      businessIds: '',
    }));
  };

  const handleCreateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: FieldErrors = {};

    if (!courierForm.fullName.trim()) {
      errors.fullName = 'El nombre es obligatorio.';
    }
    if (!courierForm.username.trim()) {
      errors.username = 'El usuario es obligatorio.';
    } else if (!/^[a-zA-Z0-9._-]{3,64}$/.test(courierForm.username.trim())) {
      errors.username =
        'El usuario debe tener entre 3 y 64 caracteres y sólo admite letras, números, punto, guion bajo o guion.';
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
    Object.assign(
      errors,
      validateCourierBanking(
        courierForm.role,
        courierForm.businessIds,
        courierForm.accountNumber,
      ),
    );

    setCourierFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCourierSubmitting(true);
    const ok = await createUserAccount(
      {
        fullName: courierForm.fullName.trim(),
        username: courierForm.username.trim(),
        email: courierForm.email.trim(),
        password: courierForm.password,
        phone: courierForm.phone.trim(),
        address: courierForm.address.trim(),
        dni: normalizeDni(courierForm.dni),
        role: courierForm.role,
        // `businessId` se conserva como negocio de referencia (el primero).
        businessId: courierForm.businessIds[0],
        courierBusinessIds: courierForm.businessIds,
        accountNumber: normalizeIban(courierForm.accountNumber) || undefined,
        courierConfirmation: 'PENDING',
      },
      // Si el backend rechaza un campo (por ejemplo, un negocio que ya no
      // existe), se marca ese campo concreto en el formulario.
      (serverErrors) => setCourierFormErrors(toCourierFieldErrors(serverErrors)),
    );
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
        role: 'PLATFORM_COURIER',
        businessIds: [],
        accountNumber: '',
      });
      setCourierFormErrors({});
      setShowCourierPassword(false);
      await refreshCouriers();
    }
  };

  const handleCourierConfirmation = async (
    courier: User,
    confirmation: 'PENDING' | 'SUPERADMIN',
  ) => {
    const ok = await setCourierConfirmation(courier.id, confirmation);
    if (ok) await refreshCouriers();
  };

  const openCourierEdit = (courier: User) => {
    setEditingCourier(courier);
    setCourierEditForm({
      businessIds: assignedBusinessIds(courier),
      phone: courier.phone || '',
      address: courier.address || '',
      dni: courier.dni || '',
      accountNumber: courier.accountNumber || '',
    });
    setCourierEditErrors({});
    // La lista de checkboxes debe venir del servidor, igual que en el alta.
    void refreshBusinessCatalog().then((rows) => {
      setCourierEditForm((previous) => ({
        ...previous,
        businessIds: keepExistingBusinessIds(previous.businessIds, rows),
      }));
    });
  };

  const closeCourierEdit = () => {
    if (courierEditSaving) return;
    setEditingCourier(null);
    setCourierEditErrors({});
  };

  const toggleCourierEditBusiness = (businessId: string) => {
    setCourierEditForm((previous) => ({
      ...previous,
      businessIds: previous.businessIds.includes(businessId)
        ? previous.businessIds.filter((id) => id !== businessId)
        : [...previous.businessIds, businessId],
    }));
    setCourierEditErrors((previous) => ({
      ...previous,
      businessIds: '',
    }));
  };

  const handleSaveCourierDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourier) return;

    const errors = {
      ...validateCourierContact(courierEditForm),
      ...validateCourierBanking(
        editingCourier.role,
        courierEditForm.businessIds,
        courierEditForm.accountNumber,
      ),
    };
    setCourierEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCourierEditSaving(true);
    const ok = await updateCourierDetails(
      editingCourier.id,
      {
        courierBusinessIds: courierEditForm.businessIds,
        phone: courierEditForm.phone.trim(),
        address: courierEditForm.address.trim(),
        dni: normalizeDni(courierEditForm.dni),
        accountNumber: normalizeIban(courierEditForm.accountNumber),
      },
      (serverErrors) => setCourierEditErrors(toCourierFieldErrors(serverErrors)),
    );
    setCourierEditSaving(false);

    if (ok) {
      setEditingCourier(null);
      await refreshCouriers();
    }
  };

  // Antes se guardaba URL.createObjectURL(file), un enlace blob que sólo
  // existe en la pestaña abierta: al recargar la app la imagen desaparecía y
  // el servidor la rechazaba. Ahora se convierte en un data URL real, y si la
  // foto pesa demasiado se reescala antes de enviarla.
  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setBusinessFormErrors((prev) => ({ ...prev, bannerUrl: '' }));
      setNewBusinessForm((prev) => ({ ...prev, bannerUrl: dataUrl }));
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'No se pudo cargar la imagen del banner.',
        'error',
      );
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusinessFormErrors({});

    // Comprobaciones del cliente, con el mismo criterio que el servidor y con
    // el campo marcado, para no depender sólo del rechazo del backend.
    const localErrors: FieldErrors = {};
    if (!newBusinessForm.name.trim()) localErrors.name = 'El nombre del negocio es obligatorio.';
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

    const createdBusiness = await createBusiness(
      {
        ...newBusinessForm,
        category: newBusinessForm.category || CATEGORIES[0].id,
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

    showNotification(
      `Negocio ${createdBusiness.name} creado y acceso asignado a ${newBusinessForm.adminUsername.trim()} (rol BUSINESS_ADMIN).`,
      'success',
    );
    resetBusinessForm();
    setShowBusinessForm(false);
  };

  const startEditingBusiness = (business: Business) => {
    // Si la zona guardada ya no existe (por ejemplo, se borró la localidad) el
    // select se queda vacío y se pide elegir una válida antes de guardar.
    const localityStillExists = localities.some((loc) => loc.id === business.localityId);

    setEditingBusinessId(business.id);
    setShowBusinessForm(true);
    setBusinessFormErrors(
      localityStillExists
        ? {}
        : { localityId: 'La zona de este negocio ya no existe. Selecciona una zona válida.' },
    );
    setNewBusinessForm({
      name: business.name,
      legalName: business.legalName,
      cif: business.cif,
      accountNumber: business.accountNumber || '',
      category: business.category || '',
      localityId: localityStillExists ? business.localityId : '',
      phone: business.phone,
      email: business.email,
      address: business.address,
      managerName: business.managerName || '',
      managerDni: business.managerDni || '',
      bannerUrl: business.bannerUrl || '',
      adminUsername: '',
      // El acceso del propietario es opcional al editar. Dejar el email
      // prellenado hacía que el formulario creyera que se quería cambiar el
      // acceso y bloqueara el guardado hasta rellenar usuario y clave.
      adminEmail: '',
      adminPassword: '',
      schedule: business.schedule?.length ? business.schedule : newBusinessForm.schedule,
    });
  };

  const handleSaveBusinessEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusinessId) return;
    setBusinessFormErrors({});

    // Si se rellena algo del acceso hay que rellenarlo entero: si no, la
    // cuenta del propietario se quedaría sin tocar sin explicación.
    const filledOwnerFields = [
      newBusinessForm.adminUsername.trim(),
      newBusinessForm.adminEmail.trim(),
      newBusinessForm.adminPassword.trim(),
    ].filter(Boolean).length;

    if (filledOwnerFields > 0 && filledOwnerFields < 3) {
      const partialErrors: FieldErrors = {};
      if (!newBusinessForm.adminUsername.trim()) partialErrors.adminUsername = 'Falta el usuario de acceso.';
      if (!newBusinessForm.adminEmail.trim()) partialErrors.adminEmail = 'Falta el email de acceso.';
      if (!newBusinessForm.adminPassword.trim()) partialErrors.adminPassword = 'Falta la clave de acceso.';
      setBusinessFormErrors(partialErrors);
      showNotification('Para cambiar el acceso del propietario hacen falta usuario, email y clave.', 'error');
      return;
    }

    // Las credenciales del propietario sólo se tocan si el superadmin
    // rellena los tres campos; si no, la cuenta existente queda intacta.
    const hasOwnerCredentials = filledOwnerFields === 3;

    const saved = await updateBusiness(
      editingBusinessId,
      {
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
      },
      hasOwnerCredentials
        ? {
            username: newBusinessForm.adminUsername.trim(),
            fullName: `${newBusinessForm.managerName.trim() || newBusinessForm.name.trim()} (${newBusinessForm.name.trim()})`,
            email: newBusinessForm.adminEmail.trim(),
            password: newBusinessForm.adminPassword.trim(),
          }
        : null,
      (errors) => setBusinessFormErrors(toBusinessFieldErrors(errors)),
    );

    if (saved) {
      if (hasOwnerCredentials) {
        showNotification('Acceso administrador creado/actualizado para el negocio.', 'success');
      }

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
          {localities.length === 0 && (
            <p className="py-4 text-xs text-stone-400">
              Todavía no hay zonas. Añade la primera para poder registrar comercios.
            </p>
          )}
          {localities.map(loc => (
            <div key={loc.id} className="py-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">{loc.name}</h3>
                <p className="text-xs text-stone-500">CP: {loc.postalCode} • {businesses.filter(b => b.localityId === loc.id).length} comercios</p>
              </div>
              <button
                onClick={() => deleteLocality(loc.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar localidad"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* COURIERS SECTION */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 space-y-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold font-serif text-stone-900 dark:text-stone-100">
              <Bike className="w-5 h-5 text-[#FF4E00]" />
              Repartidores
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Crea la cuenta del repartidor y confírmala para que pueda entrar en su panel de reparto.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleCourierForm}
            aria-expanded={showCourierForm}
            title={showCourierForm
              ? 'Ocultar el formulario de nuevo repartidor'
              : 'Mostrar el formulario de nuevo repartidor'}
            className="flex items-center space-x-2 rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {couriersLoading || businessesLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : showCourierForm ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>Actualizar</span>
          </button>
        </div>

        {showCourierForm && (
        <form
          onSubmit={handleCreateCourier}
          className="grid gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-800/50 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Nombre completo</label>
            <input
              value={courierForm.fullName}
              onChange={(e) => setCourierForm({ ...courierForm, fullName: e.target.value })}
              className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(courierFormErrors.fullName))}
              placeholder="Ej. Marcos Ruiz"
            />
            <FieldError message={courierFormErrors.fullName} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Usuario de acceso</label>
            <input
              value={courierForm.username}
              onChange={(e) => setCourierForm({ ...courierForm, username: e.target.value })}
              className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(courierFormErrors.username))}
              placeholder="ej. marcos.ruiz"
            />
            <FieldError message={courierFormErrors.username} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Email</label>
            <input
              type="email"
              value={courierForm.email}
              onChange={(e) => setCourierForm({ ...courierForm, email: e.target.value })}
              className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(courierFormErrors.email))}
              placeholder="repartidor@pidetietar.es"
            />
            <FieldError message={courierFormErrors.email} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Clave inicial</label>
            <div className="relative">
              <input
                type={showCourierPassword ? 'text' : 'password'}
                value={courierForm.password}
                onChange={(e) => setCourierForm({ ...courierForm, password: e.target.value })}
                className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 pr-10 text-sm text-black placeholder-stone-400', Boolean(courierFormErrors.password))}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowCourierPassword((previous) => !previous)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                title={showCourierPassword ? 'Ocultar la clave' : 'Mostrar la clave'}
                aria-label={showCourierPassword ? 'Ocultar la clave' : 'Mostrar la clave'}
              >
                {showCourierPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <FieldError message={courierFormErrors.password} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Teléfono</label>
            <input
              type="tel"
              value={courierForm.phone}
              onChange={(e) => setCourierForm({ ...courierForm, phone: e.target.value })}
              className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(courierFormErrors.phone))}
              placeholder="+34 600 000 000"
            />
            <FieldError message={courierFormErrors.phone} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">DNI / NIE</label>
            <input
              value={courierForm.dni}
              onChange={(e) => setCourierForm({ ...courierForm, dni: e.target.value.toUpperCase() })}
              className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400 uppercase', Boolean(courierFormErrors.dni))}
              placeholder="12345678Z"
            />
            <p className="mt-1 text-[10px] text-stone-400">
              DNI (8 dígitos + letra) o NIE (X/Y/Z + 7 dígitos + letra).
            </p>
            <FieldError message={courierFormErrors.dni} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Tipo de repartidor</label>
            <select
              value={courierForm.role}
              onChange={(e) => setCourierForm({ ...courierForm, role: e.target.value as 'PLATFORM_COURIER' | 'BUSINESS_COURIER', businessIds: [] })}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-black outline-none focus:border-[#FF4E00]"
            >
              <option value="PLATFORM_COURIER">Plataforma (todo el valle)</option>
              <option value="BUSINESS_COURIER">De uno o varios negocios</option>
            </select>
          </div>
          <div className="sm:col-span-1 lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-stone-500">Dirección</label>
            <input
              value={courierForm.address}
              onChange={(e) => setCourierForm({ ...courierForm, address: e.target.value })}
              className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(courierFormErrors.address))}
              placeholder="Calle, número, código postal y localidad"
              autoComplete="street-address"
            />
            <FieldError message={courierFormErrors.address} />
          </div>
          {courierForm.role === 'BUSINESS_COURIER' ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-stone-500">
                Negocios que cubre <span className="font-normal text-stone-400">(uno o varios)</span>
              </label>
              <div className="grid max-h-44 gap-1 overflow-y-auto rounded-xl border border-stone-200 bg-white p-2 sm:grid-cols-2 lg:grid-cols-3">
                {businesses.map((biz) => (
                  <label
                    key={biz.id}
                    className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs text-stone-700 transition hover:bg-stone-50"
                  >
                    <input
                      type="checkbox"
                      checked={courierForm.businessIds.includes(biz.id)}
                      onChange={() => toggleCourierBusiness(biz.id)}
                      className="mt-0.5 h-4 w-4 accent-[#FF4E00]"
                    />
                    <span>
                      <span className="block font-semibold text-stone-800">{biz.name}</span>
                      <span className="block text-[10px] text-stone-400">
                        {localities.find((loc) => loc.id === biz.localityId)?.name || 'Sin localidad'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {businesses.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No hay negocios creados todavía.
                </p>
              )}
              <FieldError message={courierFormErrors.businessIds} />
            </div>
          ) : (
            <p className="rounded-xl bg-sky-50 px-4 py-2 text-xs text-sky-800 sm:col-span-2 lg:col-span-3 dark:bg-sky-950/40 dark:text-sky-300">
              El repartidor de plataforma cubre todos los negocios del valle.
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">
              Cuenta bancaria (IBAN){' '}
              <span className="font-normal text-stone-400">opcional</span>
            </label>
            <input
              value={courierForm.accountNumber}
              onChange={(e) => setCourierForm({ ...courierForm, accountNumber: e.target.value })}
              className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(courierFormErrors.accountNumber))}
              placeholder="ES91 2100 0418 4502 0005 1332"
            />
            <p className="mt-1 text-[10px] text-stone-400">
              Para las transferencias del informe diario. Después sólo lo puede cambiar el superadmin.
            </p>
            <FieldError message={courierFormErrors.accountNumber} />
          </div>
          <div className="col-span-full pt-1">
            <button
              type="submit"
              disabled={courierSubmitting}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-[#FF4E00] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#E64600] disabled:opacity-60 sm:w-auto"
            >
              <Plus className="h-5 w-5" />
              <span>{courierSubmitting ? 'Creando cuenta...' : 'Crear cuenta de repartidor'}</span>
            </button>
          </div>
        </form>
        )}

        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {couriers.length === 0 ? (
            <p className="py-4 text-xs text-stone-400">
              {couriersLoading ? 'Cargando repartidores...' : 'Todavía no hay repartidores creados.'}
            </p>
          ) : (
            couriers.map((courier) => {
              const confirmation = courier.courierProfile?.confirmation || 'PENDING';
              const assignedIds = assignedBusinessIds(courier);
              const assignedNames = assignedIds
                .map((bizId) => businesses.find((biz) => biz.id === bizId)?.name)
                .filter(Boolean)
                .join(', ');
              const confirmationLabel =
                confirmation === 'SUPERADMIN'
                  ? 'Confirmado por superadmin'
                  : confirmation === 'BUSINESS_EMAIL'
                    ? 'Confirmado por el negocio'
                    : 'Pendiente';
              const badgeClass =
                confirmation === 'SUPERADMIN'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : confirmation === 'BUSINESS_EMAIL'
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300'
                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300';

              return (
                <div key={courier.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-stone-900 dark:text-white">{courier.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
                        {confirmationLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {courier.email} ·{' '}
                      {courier.role === 'PLATFORM_COURIER'
                        ? 'Repartidor de plataforma'
                        : `Repartidor de ${assignedNames || 'sin negocio asignado'}`}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {courier.phone || 'Sin teléfono'} ·{' '}
                      {courier.dni ? `DNI/NIE ${courier.dni}` : 'Sin DNI/NIE'}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {courier.address || 'Sin dirección'}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {courier.accountNumber
                        ? `IBAN ${maskIban(courier.accountNumber)}`
                        : 'Sin IBAN configurado'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openCourierEdit(courier)}
                      className="flex items-center space-x-1.5 rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>Editar</span>
                    </button>
                    {confirmation === 'PENDING' ? (
                      <button
                        type="button"
                        onClick={() => void handleCourierConfirmation(courier, 'SUPERADMIN')}
                        className="flex items-center space-x-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Confirmar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleCourierConfirmation(courier, 'PENDING')}
                        className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                      >
                        Retirar confirmación
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* BUSINESSES SECTION */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 space-y-6 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold font-serif text-stone-900 dark:text-stone-100">
              Gestión de Comercios y Negocios
            </h2>
            {businessesLoading && (
              <p className="mt-1 text-xs text-stone-400">
                Sincronizando comercios con el servidor...
              </p>
            )}
          </div>
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
            <input required value={newBusinessForm.name} onChange={e => setNewBusinessForm({...newBusinessForm, name: e.target.value})} className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(businessFormErrors.name))} placeholder="Ej. El Buen Sabor" />
            <FieldError message={businessFormErrors.name} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Razón Social</label>
            <input required={!editingBusinessId} value={newBusinessForm.legalName} onChange={e => setNewBusinessForm({...newBusinessForm, legalName: e.target.value})} className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(businessFormErrors.legalName))} placeholder="Ej. El Buen Sabor S.L." />
            <FieldError message={businessFormErrors.legalName} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">CIF / NIF</label>
            <input required value={newBusinessForm.cif} onChange={e => setNewBusinessForm({...newBusinessForm, cif: e.target.value})} className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(businessFormErrors.cif))} placeholder="Ej. B12345678" />
            <p className="mt-1 text-[11px] text-stone-400">Letra + 7 dígitos + control, 8 dígitos + letra o NIE (X/Y/Z…).</p>
            <FieldError message={businessFormErrors.cif} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Categoría</label>
            <select
              required
              value={newBusinessForm.category}
              onChange={e => setNewBusinessForm({...newBusinessForm, category: e.target.value})}
              className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black', Boolean(businessFormErrors.category))}
            >
              <option value="" className="text-stone-400">Seleccionar...</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <FieldError message={businessFormErrors.category} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Localidad</label>
            <select required value={newBusinessForm.localityId} onChange={e => setNewBusinessForm({...newBusinessForm, localityId: e.target.value})} className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black', Boolean(businessFormErrors.localityId))}>
              <option value="" className="text-stone-400">Seleccionar...</option>
              {localities.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            {localities.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-600">
                Añade una zona en «Zonas y Localidades de Reparto» antes de guardar el comercio.
              </p>
            )}
            <FieldError message={businessFormErrors.localityId} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Dirección</label>
            <input required value={newBusinessForm.address} onChange={e => setNewBusinessForm({...newBusinessForm, address: e.target.value})} className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(businessFormErrors.address))} placeholder="Calle Mayor 12" />
            <FieldError message={businessFormErrors.address} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Teléfono</label>
            <input required type="tel" value={newBusinessForm.phone} onChange={e => setNewBusinessForm({...newBusinessForm, phone: e.target.value})} className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(businessFormErrors.phone))} placeholder="Ej. 600 000 000" />
            <FieldError message={businessFormErrors.phone} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Email</label>
            <input required type="email" value={newBusinessForm.email} onChange={e => setNewBusinessForm({...newBusinessForm, email: e.target.value})} className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(businessFormErrors.email))} placeholder="Ej. contacto@empresa.com" />
            <FieldError message={businessFormErrors.email} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Nombre del Responsable</label>
            <input required={!editingBusinessId} value={newBusinessForm.managerName} onChange={e => setNewBusinessForm({...newBusinessForm, managerName: e.target.value})} className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(businessFormErrors.managerName))} placeholder="Ej. Juan Pérez" />
            <FieldError message={businessFormErrors.managerName} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">DNI/NIE del Responsable</label>
            <input required={!editingBusinessId} value={newBusinessForm.managerDni} onChange={e => setNewBusinessForm({...newBusinessForm, managerDni: e.target.value})} className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400 uppercase', Boolean(businessFormErrors.managerDni))} placeholder="Ej. 12345678Z" />
            <p className="mt-1 text-[11px] text-stone-400">8 dígitos y la letra (12345678Z) o NIE (X1234567L).</p>
            <FieldError message={businessFormErrors.managerDni} />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-500 mb-1">Número de cuenta para transferencias (IBAN)</label>
            <input value={newBusinessForm.accountNumber} onChange={e => setNewBusinessForm({...newBusinessForm, accountNumber: e.target.value})} className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(businessFormErrors.accountNumber))} placeholder="ES91 2100 0418 4502 0005 1332" />
            <p className="mt-1 text-[11px] text-stone-400">Opcional. Formato IBAN: ES + 20 dígitos (sin espacios ni letras).</p>
            <FieldError message={businessFormErrors.accountNumber} />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-500 mb-1">Foto para Banner</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              className={fieldClass(
                'w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-stone-100 file:text-[#FF4E00] hover:file:bg-stone-200',
                Boolean(businessFormErrors.bannerUrl),
              )}
            />
            <FieldError message={businessFormErrors.bannerUrl} />
            {newBusinessForm.bannerUrl && (
              <img
                src={newBusinessForm.bannerUrl}
                alt="Vista previa del banner"
                className="mt-2 h-20 w-full rounded-xl object-cover"
              />
            )}
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

          <>
            <div className="col-span-full border-t border-stone-200 pt-4">
              <h3 className="text-sm font-bold text-stone-800">Acceso administrador del negocio</h3>
              <p className="mt-1 text-xs text-stone-500">
                {editingBusinessId
                  ? 'Déjalo en blanco para conservar el acceso actual. Si quieres cambiarlo, rellena usuario, email y clave.'
                  : 'El usuario y la clave que escribas aquí son los únicos que se crean para este negocio (rol BUSINESS_ADMIN). No se genera nada automáticamente: el propietario podrá cambiar su clave desde su perfil.'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Usuario de acceso</label>
              <input required={!editingBusinessId} value={newBusinessForm.adminUsername} onChange={e => setNewBusinessForm({...newBusinessForm, adminUsername: e.target.value})} className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(businessFormErrors.adminUsername))} placeholder={editingBusinessId ? 'Sin cambios' : 'ej. elpensionista_admin'} />
              <FieldError message={businessFormErrors.adminUsername} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Email de acceso</label>
              <input required={!editingBusinessId} type="email" value={newBusinessForm.adminEmail} onChange={e => setNewBusinessForm({...newBusinessForm, adminEmail: e.target.value})} className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(businessFormErrors.adminEmail))} placeholder={editingBusinessId ? 'Sin cambios' : 'ej. admin@negocio.com'} />
              <FieldError message={businessFormErrors.adminEmail} />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-500 mb-1">Clave inicial</label>
              <input required={!editingBusinessId} type="password" minLength={editingBusinessId ? undefined : 8} value={newBusinessForm.adminPassword} onChange={e => setNewBusinessForm({...newBusinessForm, adminPassword: e.target.value})} className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(businessFormErrors.adminPassword))} placeholder={editingBusinessId ? 'Sin cambios' : 'Mínimo 8 caracteres'} />
              <FieldError message={businessFormErrors.adminPassword} />
            </div>
          </>
          
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
                        disabled={businessesLoading}
                        className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteBusiness(biz)}
                        disabled={businessesLoading}
                        className="text-xs text-red-600 hover:underline font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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
              {businesses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-stone-400">
                    {businessesLoading
                      ? 'Cargando comercios...'
                      : 'No hay comercios registrados. Crea el primero con el botón de arriba.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingCourier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-stone-900">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 p-5 dark:border-stone-800">
              <div>
                <h2 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                  Editar repartidor
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  {editingCourier.name} · {editingCourier.email}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCourierEdit}
                disabled={courierEditSaving}
                className="rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50 dark:hover:bg-stone-800"
                title="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourierDetails} className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-500">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={courierEditForm.phone}
                    onChange={(e) =>
                      setCourierEditForm((previous) => ({
                        ...previous,
                        phone: e.target.value,
                      }))
                    }
                    className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(courierEditErrors.phone))}
                    placeholder="+34 600 000 000"
                  />
                  <FieldError message={courierEditErrors.phone} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-500">
                    DNI / NIE
                  </label>
                  <input
                    value={courierEditForm.dni}
                    onChange={(e) =>
                      setCourierEditForm((previous) => ({
                        ...previous,
                        dni: e.target.value.toUpperCase(),
                      }))
                    }
                    className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400 uppercase', Boolean(courierEditErrors.dni))}
                    placeholder="12345678Z"
                  />
                  <FieldError message={courierEditErrors.dni} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-stone-500">
                    Dirección
                  </label>
                  <input
                    value={courierEditForm.address}
                    onChange={(e) =>
                      setCourierEditForm((previous) => ({
                        ...previous,
                        address: e.target.value,
                      }))
                    }
                    className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(courierEditErrors.address))}
                    placeholder="Calle, número, código postal y localidad"
                    autoComplete="street-address"
                  />
                  <FieldError message={courierEditErrors.address} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-500">
                  Negocios asignados{' '}
                  {editingCourier.role === 'PLATFORM_COURIER' && (
                    <span className="font-normal text-stone-400">(informativo)</span>
                  )}
                </label>
                <div className="grid max-h-52 gap-1 overflow-y-auto rounded-xl border border-stone-200 bg-white p-2 sm:grid-cols-2 dark:border-stone-700 dark:bg-stone-800/50">
                  {businesses.map((biz) => (
                    <label
                      key={biz.id}
                      className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs text-stone-700 transition hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      <input
                        type="checkbox"
                        checked={courierEditForm.businessIds.includes(biz.id)}
                        onChange={() => toggleCourierEditBusiness(biz.id)}
                        className="mt-0.5 h-4 w-4 accent-[#FF4E00]"
                      />
                      <span>
                        <span className="block font-semibold text-stone-800 dark:text-stone-200">
                          {biz.name}
                        </span>
                        <span className="block text-[10px] text-stone-400">
                          {localities.find((loc) => loc.id === biz.localityId)?.name || 'Sin localidad'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {editingCourier.role === 'PLATFORM_COURIER' && (
                  <p className="mt-1 text-[10px] text-stone-400">
                    El repartidor de plataforma cubre todo el valle; esta lista es sólo informativa.
                  </p>
                )}
                <FieldError message={courierEditErrors.businessIds} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-500">
                  Cuenta bancaria (IBAN){' '}
                  <span className="font-normal text-stone-400">opcional</span>
                </label>
                <input
                  value={courierEditForm.accountNumber}
                  onChange={(e) =>
                    setCourierEditForm((previous) => ({
                      ...previous,
                      accountNumber: e.target.value,
                    }))
                  }
                  className={fieldClass('w-full bg-white border border-stone-200 outline-none focus:border-[#FF4E00] rounded-xl px-4 py-2 text-sm text-black placeholder-stone-400', Boolean(courierEditErrors.accountNumber))}
                  placeholder="ES91 2100 0418 4502 0005 1332"
                />
                <p className="mt-1 text-[10px] text-stone-400">
                  Déjalo vacío para quitar la cuenta. Sólo el superadmin puede modificar este dato.
                </p>
                <FieldError message={courierEditErrors.accountNumber} />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCourierEdit}
                  disabled={courierEditSaving}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={courierEditSaving}
                  className="rounded-xl bg-[#FF4E00] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#E64600] disabled:opacity-60"
                >
                  {courierEditSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
