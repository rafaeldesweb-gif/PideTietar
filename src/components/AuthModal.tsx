import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProjectLogo } from './ProjectLogo';
import { 
  X, Mail, CheckCircle2, ShieldAlert, KeyRound, 
  Send, User, Phone, MapPin, Sparkles, LogOut, Check,
  ArrowLeft, Eye, EyeOff, Lock, ShoppingBag
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    logout, 
    sendGmailVerificationCode, 
    verifyEmailWithGmailCode, 
    verificationSent, 
    generatedCode,
    loginAs,
    showNotification,
    setCourierProfile,
    updateCurrentUserProfile,
    businesses,
    localities
  } = useApp();

  const [isRegisterMode, setIsRegisterMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'CLIENT' | 'PLATFORM_COURIER'>('CLIENT');
  
  // Form inputs matching Image 4
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone || '');
  const [emailInput, setEmailInput] = useState(currentUser?.email || 'rafaeldesweb@gmail.com');
  const [password, setPassword] = useState('');

  // Gmail verification code
  const [inputCode, setInputCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const courierProfile = currentUser?.courierProfile || {
    businessIds: [],
    localityIds: [],
    isOnline: false,
    confirmation: 'PENDING' as const
  };

  const toggleCourierBusiness = (businessId: string) => {
    if (!currentUser || (currentUser.role !== 'PLATFORM_COURIER' && currentUser.role !== 'BUSINESS_COURIER')) return;
    const next = courierProfile.businessIds.includes(businessId)
      ? courierProfile.businessIds.filter(id => id !== businessId)
      : [...courierProfile.businessIds, businessId];
    setCourierProfile({ ...courierProfile, businessIds: next });
  };

  const toggleCourierLocality = (localityId: string) => {
    if (!currentUser || (currentUser.role !== 'PLATFORM_COURIER' && currentUser.role !== 'BUSINESS_COURIER')) return;
    const next = courierProfile.localityIds.includes(localityId)
      ? courierProfile.localityIds.filter(id => id !== localityId)
      : [...courierProfile.localityIds, localityId];
    setCourierProfile({ ...courierProfile, localityIds: next });
  };

  const confirmCourierRole = (confirmation: 'BUSINESS_EMAIL' | 'SUPERADMIN') => {
    if (!currentUser || (currentUser.role !== 'PLATFORM_COURIER' && currentUser.role !== 'BUSINESS_COURIER')) return;
    setCourierProfile({ ...courierProfile, confirmation, isOnline: true });
    updateCurrentUserProfile({ isEmailVerified: true });
    showNotification(
      confirmation === 'BUSINESS_EMAIL'
        ? 'Permiso de repartidor confirmado por el correo del negocio.'
        : 'Permiso de repartidor confirmado por Superadministrador.',
      'success'
    );
  };

  const openClientVerificationLink = () => {
    const targetEmail = (currentUser?.email || emailInput || '').trim();
    if (!targetEmail) {
      showNotification('Introduce un correo electrónico para crear la verificación.', 'error');
      return;
    }

    const subject = encodeURIComponent('Verifica tu cuenta en PideTietar');
    const body = encodeURIComponent(
      `Hola ${currentUser?.name || fullName || 'usuario'},\n\n` +
      `Confirma tu cuenta en PideTietar usando este enlace:\n` +
      `https://www.pidetietar.es/verify?email=${encodeURIComponent(targetEmail)}&role=CLIENT\n\n` +
      `Si no has creado esta cuenta, puedes ignorar este correo.`
    );

    window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
    showNotification('Se abrió tu cliente de correo para confirmar el email del cliente.', 'info');
  };

  const confirmClientEmail = () => {
    if (!currentUser) return;
    updateCurrentUserProfile({ isEmailVerified: true });
    showNotification('¡Correo verificado correctamente! Ya puedes seguir usando PideTietar.', 'success');
  };

  const handleSendCode = async () => {
    setIsVerifying(true);
    await sendGmailVerificationCode();
    setIsVerifying(false);
  };

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setIsVerifying(true);
    const ok = await verifyEmailWithGmailCode(inputCode);
    setIsVerifying(false);
    if (ok) {
      setInputCode('');
    }
  };

  const handleSubmitAuth = (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedUser = (emailInput || '').trim();
    const normalizedPassword = (password || '').trim();

    if (!normalizedUser) {
      showNotification('Introduce un correo electrónico o nombre de usuario válido', 'error');
      return;
    }

    if (normalizedUser.toLowerCase() === 'rafaadmin' && normalizedPassword === '13021999') {
      loginAs('SUPERADMIN', 'rafaeldesweb@gmail.com', {
        name: 'RafaAdmin',
        email: 'rafaeldesweb@gmail.com',
        password: '13021999',
      });
      showNotification('Acceso concedido al superadministrador RafaAdmin.', 'success');
      onClose();
      return;
    }

    if (!normalizedPassword && !isRegisterMode) {
      showNotification('Introduce la contraseña para iniciar sesión.', 'error');
      return;
    }

    if (isRegisterMode) {
      const finalName = (fullName || 'Nuevo cliente').trim() || 'Nuevo cliente';
      const role = selectedRole;
      const registeredUser = role === 'CLIENT'
        ? {
            name: finalName,
            email: normalizedUser,
            password: normalizedPassword || 'cliente123',
            phone: phoneNumber || undefined,
            isEmailVerified: false,
          }
        : {
            name: finalName,
            email: normalizedUser,
            password: normalizedPassword || 'repartidor123',
            phone: phoneNumber || undefined,
            isEmailVerified: false,
            courierProfile: {
              businessIds: [],
              localityIds: [],
              isOnline: false,
              confirmation: 'PENDING' as const,
            },
          };

      loginAs(role, normalizedUser, registeredUser);
      showNotification(
        role === 'CLIENT'
          ? `Cuenta creada para ${finalName}. Revisa tu correo para verificar tu cuenta.`
          : `Solicitud enviada para ${finalName}. La confirmación la realizará el Superadmin antes de activar tu panel de repartidor.`,
        'success'
      );
      onClose();
      return;
    }

    const finalName = (fullName || 'Nuevo cliente').trim() || 'Nuevo cliente';
    loginAs('CLIENT', normalizedUser, {
      name: finalName,
      email: normalizedUser,
      password: normalizedPassword || 'cliente123',
      isEmailVerified: true,
    });
    showNotification(`Sesión iniciada como ${normalizedUser}`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4">
      <div className="relative h-[100dvh] w-full max-w-md overflow-hidden border border-stone-800 bg-[#121214] text-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-3xl">
        
        {/* Top bar with back to menu and close (Matching Image 4) */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-800 bg-[#121214]/95 px-4 pb-2 pt-[calc(var(--safe-area-top)+0.75rem)] backdrop-blur sm:px-5 sm:pt-5">
          <button
            onClick={onClose}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-stone-400 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al MENÚ</span>
          </button>
          
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[calc(100dvh-74px)] space-y-5 overflow-y-auto p-4 pb-[calc(var(--safe-area-bottom)+1rem)] pt-3 sm:max-h-[85vh] sm:p-6 sm:pt-2">
          
          {currentUser ? (
            /* Logged in state with Profile & Gmail Verification */
            <div className="space-y-5">
              
              {/* Profile Card */}
              <div className="flex items-center space-x-3.5 p-4 rounded-2xl bg-stone-900 border border-stone-800">
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                  alt={currentUser.name}
                  className="block w-14 h-14 rounded-full object-cover object-center border-2 border-[#FF4E00] bg-stone-100"
                  style={{ borderRadius: '9999px' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate text-sm">
                    {currentUser.name}
                  </div>
                  <div className="text-xs text-stone-400 flex items-center space-x-1 truncate">
                    <Mail className="w-3 h-3 text-[#FF4E00]" />
                    <span>{currentUser.email}</span>
                  </div>
                  <div className="text-[11px] font-bold text-[#FF4E00] mt-0.5">
                    Rol: {currentUser.role}
                  </div>
                </div>
              </div>

              {(currentUser.role === 'PLATFORM_COURIER' || currentUser.role === 'BUSINESS_COURIER') && (
                <div className="p-4 rounded-2xl border border-[#FF4E00]/30 bg-[#FF4E00]/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-[#FF4E00]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-200">
                        Confirmación repartidor
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${courierProfile.confirmation === 'PENDING' ? 'bg-amber-500/15 text-amber-300 border-amber-400/20' : courierProfile.confirmation === 'BUSINESS_EMAIL' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20' : 'bg-sky-500/15 text-sky-300 border-sky-400/20'}`}>
                      {courierProfile.confirmation === 'PENDING' ? 'Pendiente' : courierProfile.confirmation === 'BUSINESS_EMAIL' ? 'Correo negocio' : 'Superadmin'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] text-stone-300">Selecciona las zonas donde vas a entregar:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {localities.map((loc) => (
                        <label key={loc.id} className="flex items-center justify-between rounded-xl bg-stone-900/50 border border-stone-700 px-3 py-2 text-xs text-stone-200 cursor-pointer">
                          <span>{loc.name}</span>
                          <input
                            type="checkbox"
                            checked={courierProfile.localityIds.includes(loc.id)}
                            onChange={() => toggleCourierLocality(loc.id)}
                            className="h-4 w-4 accent-[#FF4E00]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] text-stone-300">Indica a qué locales te vinculas:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {businesses.map((biz) => (
                        <label key={biz.id} className="flex items-center justify-between rounded-xl bg-stone-900/50 border border-stone-700 px-3 py-2 text-xs text-stone-200 cursor-pointer">
                          <span className="truncate pr-2">{biz.name}</span>
                          <input
                            type="checkbox"
                            checked={courierProfile.businessIds.includes(biz.id)}
                            onChange={() => toggleCourierBusiness(biz.id)}
                            className="h-4 w-4 accent-[#FF4E00]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => confirmCourierRole('BUSINESS_EMAIL')}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition cursor-pointer"
                    >
                      Confirmar por correo del negocio
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmCourierRole('SUPERADMIN')}
                      className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold transition cursor-pointer"
                    >
                      Confirmar por Superadmin
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCourierProfile({ ...courierProfile, isOnline: !courierProfile.isOnline })}
                    className={`w-full px-3 py-2 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                      courierProfile.isOnline
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                    }`}
                  >
                    {courierProfile.isOnline ? 'Estoy en línea y activo' : 'Estoy fuera de línea'}
                  </button>
                </div>
              )}

              {/* Email verification */}
              <div className="p-4 rounded-2xl border border-stone-800 bg-stone-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                      Verificación de email
                    </span>
                  </div>
                  {currentUser.isEmailVerified ? (
                    <span className="inline-flex items-center space-x-1 text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verificado</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      <ShieldAlert className="w-3 h-3" />
                      <span>Pendiente</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-400">
                  {currentUser.role === 'CLIENT'
                    ? 'Confirma tu cuenta con el enlace enviado a tu mismo email registrado.'
                    : 'Para activar tu acceso como repartidor, la verificación debe confirmarla el Superadmin.'}
                </p>

                {currentUser.role === 'CLIENT' ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={openClientVerificationLink}
                      className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer border border-stone-700"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#FF4E00]" />
                      <span>Enviar enlace de verificación</span>
                    </button>
                    {currentUser.isEmailVerified ? null : (
                      <button
                        type="button"
                        onClick={confirmClientEmail}
                        className="w-full py-2.5 px-4 bg-[#FF4E00] hover:bg-[#A32300] text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Confirmar correo verificado
                      </button>
                    )}
                  </div>
                ) : verificationSent ? (
                  <form onSubmit={handleConfirmCode} className="space-y-2.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Código 6 dígitos"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        className="flex-1 px-3 py-2 text-center text-lg font-mono font-bold tracking-widest rounded-xl border border-stone-700 bg-stone-800 text-white focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                      />
                      <button
                        type="submit"
                        disabled={isVerifying || inputCode.length < 6}
                        className="px-4 py-2 bg-[#FF4E00] hover:bg-[#A32300] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Validar
                      </button>
                    </div>
                    {generatedCode && (
                      <p className="text-[11px] text-stone-500">
                        Código enviado a tu Gmail: <span className="font-mono font-bold text-[#FF4E00]">{generatedCode}</span>
                      </p>
                    )}
                  </form>
                ) : (
                  <button
                    onClick={handleSendCode}
                    disabled={isVerifying}
                    className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer border border-stone-700"
                  >
                    <Send className="w-3.5 h-3.5 text-[#FF4E00]" />
                    <span>{currentUser.isEmailVerified ? 'Volver a Enviar Código por Gmail' : 'Enviar Código a Gmail'}</span>
                  </button>
                )}
              </div>

              {/* Fast switch roles for testing */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                  Cambiar Rol Activo
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => { loginAs('CLIENT'); onClose(); }}
                    className="p-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-left font-semibold text-stone-300"
                  >
                    🛒 Modo Cliente
                  </button>
                  <button
                    onClick={() => { loginAs('BUSINESS_ADMIN'); onClose(); }}
                    className="p-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-left font-semibold text-[#FF4E00]"
                  >
                    🍳 Admin Cocina
                  </button>
                  <button
                    onClick={() => { loginAs('PLATFORM_COURIER'); onClose(); }}
                    className="p-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-left font-semibold text-teal-400"
                  >
                    🛵 Repartidor
                  </button>
                  <button
                    onClick={() => { loginAs('SUPERADMIN', 'rafaeldesweb@gmail.com'); onClose(); }}
                    className="p-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-left font-semibold text-amber-400"
                  >
                    👑 Superadmin
                  </button>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full py-3 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-xl flex items-center justify-center space-x-2 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>

            </div>
          ) : (
            /* Registration / Login Form (Matching Image 4) */
            <div className="space-y-4">
              
              {/* Brand header */}
              <div className="space-y-3">
                <div className="flex justify-center">
                  <ProjectLogo variant="full" className="h-12 w-auto max-w-[220px]" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-white tracking-tight">
                    {isRegisterMode ? 'REGÍSTRATE' : 'INICIA SESIÓN'}
                  </h2>
                  <p className="text-xs text-stone-400">
                    {isRegisterMode
                      ? 'Crea tu cuenta para pedir y consultar el estado de tus pedidos.'
                      : 'Introduce tus credenciales para acceder a tus pedidos y ventajas Club+.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitAuth} className="space-y-3.5 pt-2">

                <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-1">
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-bold uppercase tracking-wide">
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(true)}
                      className={`rounded-lg px-3 py-2 transition ${isRegisterMode ? 'bg-[#FF4E00] text-white' : 'text-stone-400 hover:text-white'}`}
                    >
                      Registro
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(false)}
                      className={`rounded-lg px-3 py-2 transition ${!isRegisterMode ? 'bg-[#FF4E00] text-white' : 'text-stone-400 hover:text-white'}`}
                    >
                      Acceso
                    </button>
                  </div>
                </div>
                
                {isRegisterMode && (
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Rafael Santos"
                      className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-stone-800 bg-[#1a1a1e] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                    />
                  </div>
                )}

                {isRegisterMode && (
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">
                      Tipo de cuenta
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('CLIENT')}
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold transition ${selectedRole === 'CLIENT' ? 'bg-[#FF4E00] text-white border-[#FF4E00]' : 'bg-stone-900 text-stone-300 border-stone-700 hover:bg-stone-800'}`}
                      >
                        Cliente
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRole('PLATFORM_COURIER')}
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold transition ${selectedRole === 'PLATFORM_COURIER' ? 'bg-[#FF4E00] text-white border-[#FF4E00]' : 'bg-stone-900 text-stone-300 border-stone-700 hover:bg-stone-800'}`}
                      >
                        Repartidor
                      </button>
                    </div>
                  </div>
                )}

                {isRegisterMode && (
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">
                      Número de teléfono
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+34 600 000 000"
                      className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-stone-800 bg-[#1a1a1e] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-stone-800 bg-[#1a1a1e] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Contraseña (mín. 8 caracteres)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-4 pr-10 py-3 text-xs sm:text-sm rounded-xl border border-stone-800 bg-[#1a1a1e] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Big White Button with Black Text (Exact Match to Image 4) */}
                <button
                  type="submit"
                  className="mt-3 w-full rounded-xl bg-white py-3.5 text-xs font-black uppercase tracking-wider text-stone-950 shadow-lg transition hover:bg-stone-200 cursor-pointer"
                >
                  {isRegisterMode ? 'CREAR CUENTA' : 'INICIAR SESIÓN'}
                </button>

              </form>



            </div>
          )}

        </div>
      </div>
    </div>
  );
};
