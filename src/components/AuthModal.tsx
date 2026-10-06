import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProjectLogo } from './ProjectLogo';
import { 
  X, LogOut, ArrowLeft, Eye, EyeOff
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    logout, 
    loginAs,
    updateCurrentUserProfile,
    showNotification,
  } = useApp();

  const [isRegisterMode, setIsRegisterMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [passwordChangeIdentifier, setPasswordChangeIdentifier] = useState('');
  const [passwordChangeCurrentPassword, setPasswordChangeCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [profileFullName, setProfileFullName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAccountNumber, setProfileAccountNumber] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  
  // Form inputs matching Image 4
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone || '');
  const [emailInput, setEmailInput] = useState(currentUser?.email || 'rafaeldesweb@gmail.com');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    setProfileFullName(currentUser.name || '');
    setProfileEmail(currentUser.email || '');
    setProfilePhone(currentUser.phone || '');
    setProfileAccountNumber(currentUser.accountNumber || '');
    setProfileNewPassword('');
    setProfileAvatarUrl(currentUser.avatarUrl || '');
  }, [isOpen, currentUser]);

  const clearPasswordChangeFlow = () => {
    setRequiresPasswordChange(false);
    setPasswordChangeIdentifier('');
    setPasswordChangeCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  if (!isOpen) return null;

  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedUser = (emailInput || '').trim();
    const normalizedPassword = (password || '').trim();

    if (!normalizedUser) {
      showNotification('Introduce un correo electrónico o nombre de usuario válido', 'error');
      return;
    }

    if (!normalizedPassword && !isRegisterMode) {
      showNotification('Introduce la contraseña para iniciar sesión.', 'error');
      return;
    }

    if (isRegisterMode && !normalizedPassword) {
      showNotification('La contraseña es obligatoria para crear la cuenta.', 'error');
      return;
    }

    if (isRegisterMode && normalizedPassword.length < 8) {
      showNotification('La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }

    const finalName = (fullName || 'Nuevo cliente').trim() || 'Nuevo cliente';

    try {
      if (isRegisterMode) {
        const payload = {
          username: normalizedUser.split('@')[0] || finalName,
          fullName: finalName,
          email: normalizedUser,
          password: normalizedPassword,
          phone: phoneNumber || undefined,
          role: 'CLIENT' as const,
        };

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.message || 'No se pudo registrar el usuario');
        }

        const registeredUser = {
          id: data?.user?.id,
          username: data?.user?.username || payload.username,
          name: finalName,
          email: normalizedUser,
          password: undefined,
          phone: phoneNumber || undefined,
          avatarUrl: data?.user?.avatarUrl || '',
          isEmailVerified: Boolean(data?.user?.isEmailVerified),
        };

        loginAs('CLIENT', normalizedUser, registeredUser);
        showNotification(
          `Cuenta creada para ${finalName}. Revisa tu correo para verificar tu cuenta.`,
          'success'
        );
        onClose();
        return;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedUser,
          password: normalizedPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data?.code === 'PASSWORD_CHANGE_REQUIRED') {
          setRequiresPasswordChange(true);
          setPasswordChangeIdentifier(
            String(data?.identifier || normalizedUser).trim(),
          );
          setPasswordChangeCurrentPassword(normalizedPassword);
          showNotification(
            data?.message || 'Debes cambiar tu contraseña antes de iniciar sesión.',
            'error',
          );
          return;
        }
        throw new Error(data?.message || 'Credenciales incorrectas');
      }

      const user = data.user || {
        name: finalName,
        email: normalizedUser,
        password: normalizedPassword,
        isEmailVerified: true,
      };

      loginAs(user.role || 'CLIENT', normalizedUser, {
        id: user.id,
        username: user.username,
        name: user.name || finalName,
        email: user.email || normalizedUser,
        password: undefined,
        phone: user.phone || undefined,
        accountNumber: user.accountNumber || undefined,
        avatarUrl: user.avatarUrl || '',
        isEmailVerified: Boolean(user.isEmailVerified),
        courierProfile: user.courierProfile,
      });
      showNotification(`Sesión iniciada como ${user.name || normalizedUser}`, 'success');
      onClose();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo completar la operación', 'error');
    }
  };

  const handlePasswordChangeSubmit = async () => {
    if (!passwordChangeIdentifier || !passwordChangeCurrentPassword) {
      showNotification('No se pudo identificar la sesión a actualizar. Vuelve a iniciar sesión.', 'error');
      return;
    }

    const cleanNewPassword = newPassword.trim();
    const cleanConfirmPassword = confirmNewPassword.trim();
    if (!cleanNewPassword) {
      showNotification('Introduce una nueva contraseña.', 'error');
      return;
    }
    if (cleanNewPassword.length < 8) {
      showNotification('La nueva contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }
    if (cleanNewPassword !== cleanConfirmPassword) {
      showNotification('La confirmación no coincide con la nueva contraseña.', 'error');
      return;
    }
    if (cleanNewPassword === passwordChangeCurrentPassword) {
      showNotification('La nueva contraseña debe ser diferente a la actual.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: passwordChangeIdentifier,
          currentPassword: passwordChangeCurrentPassword,
          newPassword: cleanNewPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'No se pudo actualizar la contraseña');
      }

      setPassword('');
      clearPasswordChangeFlow();
      showNotification(
        data?.message || 'Contraseña actualizada correctamente. Inicia sesión de nuevo.',
        'success',
      );
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'No se pudo actualizar la contraseña',
        'error',
      );
    }
  };

  const handleAvatarFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Selecciona un archivo de imagen válido.', 'error');
      event.target.value = '';
      return;
    }

    const maxFileBytes = 1024 * 1024 * 1.5;
    if (file.size > maxFileBytes) {
      showNotification('La imagen no puede superar 1.5MB.', 'error');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        showNotification('No se pudo leer la imagen seleccionada.', 'error');
        return;
      }
      setProfileAvatarUrl(result);
      showNotification('Foto de perfil cargada desde archivo.', 'success');
    };
    reader.onerror = () => {
      showNotification('No se pudo procesar el archivo de imagen.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    const cleanName = profileFullName.trim();
    const cleanEmail = profileEmail.trim();
    const cleanPassword = profileNewPassword.trim();

    if (!cleanName) {
      showNotification('El nombre es obligatorio.', 'error');
      return;
    }
    if (!cleanEmail) {
      showNotification('El correo es obligatorio.', 'error');
      return;
    }
    if (cleanPassword && cleanPassword.length < 8) {
      showNotification('La nueva contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }

    const updated = await updateCurrentUserProfile({
      name: cleanName,
      email: cleanEmail,
      phone: profilePhone.trim(),
      accountNumber: profileAccountNumber.trim(),
      password: cleanPassword || undefined,
      avatarUrl: profileAvatarUrl || undefined,
    });

    if (updated) {
      setProfileNewPassword('');
    }
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
            <div className="space-y-5">
              <div className="rounded-2xl border border-stone-800 bg-stone-900 p-4">
                <div className="flex items-center space-x-3.5">
                  <img
                    src={profileAvatarUrl || currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                    alt={currentUser.name}
                    className="block h-14 w-14 rounded-full border-2 border-[#FF4E00] bg-stone-100 object-cover object-center"
                    style={{ borderRadius: '9999px' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">{currentUser.name}</div>
                    <div className="mt-0.5 truncate text-[11px] font-bold text-[#FF4E00]">
                      Rol: {currentUser.role}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-300">Foto de perfil (archivo)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileSelected}
                    className="w-full rounded-xl border border-stone-800 bg-[#1a1a1e] px-3 py-2 text-xs text-stone-200 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FF4E00] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-300">Nombre completo</label>
                  <input
                    type="text"
                    value={profileFullName}
                    onChange={(event) => setProfileFullName(event.target.value)}
                    className="w-full rounded-xl border border-stone-800 bg-[#1a1a1e] px-4 py-3 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] sm:text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-300">Correo electrónico</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(event) => setProfileEmail(event.target.value)}
                    className="w-full rounded-xl border border-stone-800 bg-[#1a1a1e] px-4 py-3 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] sm:text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-300">Teléfono</label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(event) => setProfilePhone(event.target.value)}
                    className="w-full rounded-xl border border-stone-800 bg-[#1a1a1e] px-4 py-3 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] sm:text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-300">Cuenta bancaria (opcional)</label>
                  <input
                    type="text"
                    value={profileAccountNumber}
                    onChange={(event) => setProfileAccountNumber(event.target.value)}
                    className="w-full rounded-xl border border-stone-800 bg-[#1a1a1e] px-4 py-3 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] sm:text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-300">Nueva contraseña (opcional)</label>
                  <input
                    type="password"
                    value={profileNewPassword}
                    onChange={(event) => setProfileNewPassword(event.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-xl border border-stone-800 bg-[#1a1a1e] px-4 py-3 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] sm:text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveProfile}
                className="w-full rounded-xl bg-[#FF4E00] py-3 text-xs font-bold text-white transition hover:bg-[#E04600]"
              >
                Guardar cambios
              </button>

              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="flex w-full items-center justify-center space-x-2 rounded-xl bg-red-500/10 py-3 text-xs font-bold text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
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
                      onClick={() => {
                        setIsRegisterMode(true);
                        clearPasswordChangeFlow();
                      }}
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

                {requiresPasswordChange && !isRegisterMode && (
                  <div className="mt-4 space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5">
                    <p className="text-xs text-amber-200">
                      Por seguridad, esta cuenta debe cambiar su contraseña antes de iniciar sesión.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-300 mb-1">
                          Nueva contraseña
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                          className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-stone-800 bg-[#1a1a1e] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-300 mb-1">
                          Confirmar nueva contraseña
                        </label>
                        <input
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Repite la nueva contraseña"
                          className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-stone-800 bg-[#1a1a1e] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handlePasswordChangeSubmit}
                        className="w-full rounded-xl bg-amber-300 py-3 text-xs font-black uppercase tracking-wider text-stone-950 transition hover:bg-amber-200 cursor-pointer"
                      >
                        ACTUALIZAR CONTRASEÑA
                      </button>
                    </div>
                  </div>
                )}

              </form>



            </div>
          )}

        </div>
      </div>
    </div>
  );
};
