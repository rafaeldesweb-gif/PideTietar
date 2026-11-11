import React, { useEffect, useRef, useState } from 'react';
import { useApp, setSessionToken } from '../context/AppContext';
import { ProjectLogo } from './ProjectLogo';
import { MediaView } from './MediaView';
import { GeoapifyAddressInput } from './GeoapifyAddressInput';
import {
  MEDIA_ACCEPT,
  isMediaUrl,
  processMediaFile,
  processMediaUrl,
} from '../utils/mediaUpload';
import { SensitiveInput } from './SensitiveInput';
import { verifyAddress, type AddressVerificationResult } from '../services/addressValidation';
import { getBrowserDeviceId } from '../utils/browserSession';
import {
  openTermsInNewTab,
  TERMS_ACCEPTED_MESSAGE,
  TERMS_CLIENT_ANCHOR,
  PRIVACY_POLICY_ANCHOR,
  COOKIE_POLICY_ANCHOR,
  TERMS_VERSION,
} from '../data/legalTerms';
import { extractFieldErrors, FieldError, fieldClass, type FieldErrors } from './FormErrors';
import { 
  X, LogOut, ArrowLeft, Loader2
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// `npm run dev` sólo levanta la interfaz: si el backend no está arrancado
// (npm run server) el proxy de vite devuelve un 502/504 sin cuerpo. Como no
// llega ningún JSON, el mensaje genérico haría creer al usuario que su
// contraseña es la que falla, así que se distingue explícitamente.
const isBackendUnreachable = (status: number, data: any): boolean =>
  status >= 500 || !data || Object.keys(data).length === 0;

const backendDownMessage =
  'No hay conexión con el servidor. Arranca el backend con «npm run server» en otra terminal.';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    logout, 
    loginAs,
    updateCurrentUserProfile,
    showNotification,
    localities,
  } = useApp();

  const [isRegisterMode, setIsRegisterMode] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [passwordChangeIdentifier, setPasswordChangeIdentifier] = useState('');
  const [passwordChangeCurrentPassword, setPasswordChangeCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [verificationSending, setVerificationSending] = useState(false);
  const [profileFullName, setProfileFullName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  // Texto pegado para URL del avatar.
  const [profileAvatarUrlText, setProfileAvatarUrlText] = useState('');
  
  // Form inputs: siempre vacíos al abrir, sin recordar datos previos.
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [localityId, setLocalityId] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [registerFieldErrors, setRegisterFieldErrors] = useState<FieldErrors>({});
  const [addressVerification, setAddressVerification] = useState<AddressVerificationResult | null>(null);
  const [addressVerificationLoading, setAddressVerificationLoading] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const authSubmissionPending = useRef(false);
  const addressVerificationInput = useRef({ address: addressInput, localityId, isOpen });
  addressVerificationInput.current = { address: addressInput, localityId, isOpen };

  // Resetea TODOS los campos del formulario cada vez que se abre el modal,
  // para que nunca queden datos residuales de sesiones o aperturas previas.
  // Limpia tanto al abrir como al cerrar por seguridad.
  useEffect(() => {
    setFullName('');
    setPhoneNumber('');
    setAddressInput('');
    setEmailInput('');
    setPassword('');
    setLocalityId('');
    setTermsAccepted(false);
    setRegisterFieldErrors({});
    setAddressVerification(null);
    setAddressVerificationLoading(false);
    setRequiresEmailVerification(false);
    setVerificationCodeInput('');
    setIsRegisterMode(true);
    // Campos de perfil y cambio de contraseña también vacíos.
    setProfileFullName('');
    setProfileEmail('');
    setProfilePhone('');
    setProfileNewPassword('');
    setProfileAvatarUrl('');
    setProfileAvatarUrlText('');
    setRequiresPasswordChange(false);
    setPasswordChangeIdentifier('');
    setPasswordChangeCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  }, [isOpen]);

  useEffect(() => {
    const handleTermsMessage = (event: MessageEvent<{ type?: string; anchor?: string; accepted?: boolean }>) => {
      if (
        event.origin !== window.location.origin ||
        event.data?.type !== TERMS_ACCEPTED_MESSAGE ||
        event.data.anchor !== TERMS_CLIENT_ANCHOR
      ) {
        return;
      }
      setTermsAccepted(event.data.accepted === true);
    };

    window.addEventListener('message', handleTermsMessage);
    return () => window.removeEventListener('message', handleTermsMessage);
  }, []);

  const clearPasswordChangeFlow = () => {
    setRequiresPasswordChange(false);
    setPasswordChangeIdentifier('');
    setPasswordChangeCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const completeLogin = (data: any, normalizedUser: string, finalName: string) => {
    setSessionToken(data?.token);

    const user = data.user || {
      name: finalName,
      email: normalizedUser,
      isEmailVerified: true,
    };

    loginAs(user.role || 'CLIENT', user.email || '', {
      id: user.id,
      username: user.username,
      name: user.name || finalName,
      email: user.email || normalizedUser,
      password: undefined,
      phone: user.phone || undefined,
      address: user.address || '',
      dni: user.dni || '',
      accountNumber: user.accountNumber || undefined,
      avatarUrl: user.avatarUrl || '',
      isEmailVerified: Boolean(user.isEmailVerified),
      businessId: user.businessId || undefined,
      courierProfile: user.courierProfile,
    });
    setRequiresEmailVerification(false);
    setVerificationCodeInput('');
    showNotification(`Sesión iniciada como ${user.name || normalizedUser}`, 'success');
    onClose();
  };

  const verifyCurrentAddress = async (announce = true): Promise<boolean> => {
    if (!addressInput.trim() || !localityId) return false;

    setAddressVerificationLoading(true);
    try {
      const result = await verifyAddress(addressInput, localityId);
      if (!addressVerificationInput.current.isOpen ||
          addressVerificationInput.current.address !== addressInput ||
          addressVerificationInput.current.localityId !== localityId) return false;
      setAddressVerification(result);

      if (result.configured && !result.verified && !result.streetVerified) {
        setRegisterFieldErrors((previous) => ({
          ...previous,
          address: result.message,
        }));
        if (announce) showNotification(result.message, result.streetVerified ? 'info' : 'error');
        return false;
      }

      setRegisterFieldErrors((previous) => {
        const next = { ...previous };
        delete next.address;
        return next;
      });
      if (announce) {
        showNotification(result.message, result.verified ? 'success' : 'info');
      }
      return true;
    } catch (error) {
      if (!addressVerificationInput.current.isOpen ||
          addressVerificationInput.current.address !== addressInput ||
          addressVerificationInput.current.localityId !== localityId) return false;
      const message = error instanceof Error
        ? error.message
        : 'No se pudo verificar la dirección.';
      setAddressVerification({
        configured: true,
        available: false,
        checked: false,
        verified: false,
        message,
      });
      setRegisterFieldErrors((previous) => ({ ...previous, address: message }));
      if (announce) showNotification(message, 'error');
      return false;
    } finally {
      setAddressVerificationLoading(false);
    }
  };

  const handleSendVerification = async () => {
    const cleanEmail = emailInput.trim();
    if (!cleanEmail) {
      showNotification('Introduce el correo de la cuenta que quieres verificar.', 'error');
      return;
    }

    setVerificationSending(true);
    try {
      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || 'No se pudo enviar el correo de verificación.');
      if (data?.code) setVerificationCodeInput(String(data.code));
      showNotification(
        data?.sent
          ? 'Código enviado. Revisa el correo de la cuenta.'
          : `Código generado para pruebas locales: ${data.code}`,
        data?.sent ? 'success' : 'info',
      );
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo enviar el correo de verificación.', 'error');
    } finally {
      setVerificationSending(false);
    }
  };

  const handleVerifyAndLogin = async () => {
    const cleanEmail = emailInput.trim();
    const cleanCode = verificationCodeInput.trim();
    if (!cleanEmail || !cleanCode) {
      showNotification('Introduce el correo y el código de verificación.', 'error');
      return;
    }

    try {
      const verifyResponse = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
      });
      const verifyData = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) throw new Error(verifyData?.message || 'El código de verificación no es válido.');

      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: password.trim(), deviceId: getBrowserDeviceId() }),
      });
      const loginData = await loginResponse.json().catch(() => ({}));
      if (!loginResponse.ok) throw new Error(loginData?.message || 'La cuenta se verificó, pero no se pudo iniciar sesión.');

      completeLogin(loginData, cleanEmail, (fullName || 'Usuario').trim() || 'Usuario');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo verificar la cuenta.', 'error');
    }
  };

  if (!isOpen) return null;

  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authSubmissionPending.current) return;

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

    if (isRegisterMode && !addressInput.trim()) {
      showNotification('La dirección es obligatoria para crear la cuenta.', 'error');
      return;
    }

    if (isRegisterMode && !localityId) {
      showNotification('Selecciona una localidad para crear la cuenta.', 'error');
      return;
    }

    if (isRegisterMode && !termsAccepted) {
      showNotification('Debes aceptar los Términos y condiciones para crear la cuenta.', 'error');
      return;
    }

    const finalName = (fullName || 'Nuevo cliente').trim() || 'Nuevo cliente';

    authSubmissionPending.current = true;
    setAuthSubmitting(true);
    try {
      if (isRegisterMode) {
        if (!(await verifyCurrentAddress(true))) return;

        const payload = {
          username: normalizedUser.split('@')[0] || finalName,
          fullName: finalName,
          email: normalizedUser,
          password: normalizedPassword,
          phone: phoneNumber || undefined,
          address: addressInput.trim() || undefined,
          localityId,
          role: 'CLIENT' as const,
          termsAccepted: true,
          termsVersion: TERMS_VERSION,
        };

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, deviceId: getBrowserDeviceId() }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          // Pinta los errores por campo devueltos por el servidor (address,
          // localityId, email...) y deja el mensaje general para la notificación.
          setRegisterFieldErrors(extractFieldErrors(data));
          throw new Error(
            data?.message ||
              (isBackendUnreachable(response.status, data)
                ? backendDownMessage
                : 'No se pudo registrar el usuario'),
          );
        }

        // El backend devuelve un token firmado; sin él las siguientes
        // peticiones no podrían identificar a este usuario.
        setSessionToken(data?.token);

        const registeredUser = {
          id: data?.user?.id,
          username: data?.user?.username || payload.username,
          name: finalName,
          email: normalizedUser,
          password: undefined,
          phone: phoneNumber || undefined,
          address: data?.user?.address || addressInput.trim(),
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
          deviceId: getBrowserDeviceId(),
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
        if (data?.code === 'EMAIL_NOT_VERIFIED') {
          setRequiresEmailVerification(true);
          setIsRegisterMode(false);
          showNotification('Verifica primero el correo de la cuenta para activarla.', 'error');
          return;
        }
        throw new Error(
          data?.message ||
            (isBackendUnreachable(response.status, data)
              ? backendDownMessage
              : 'Credenciales incorrectas'),
        );
      }

      completeLogin(data, normalizedUser, finalName);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo completar la operación', 'error');
    } finally {
      authSubmissionPending.current = false;
      setAuthSubmitting(false);
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

  const handleAvatarFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const media = await processMediaFile(file);
      setProfileAvatarUrl(media.dataUrl);
      showNotification('Foto preparada. Pulsa «Guardar cambios» para guardarla.', 'info');
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'No se pudo procesar el archivo.',
        'error',
      );
    } finally {
      event.target.value = '';
    }
  };

  const handleAvatarUrlPaste = async (urlText: string, setUrlText: (v: string) => void) => {
    const url = urlText.trim();
    if (!url) return;
    if (!isMediaUrl(url)) {
      showNotification('Introduce una dirección web válida (http/https) o un archivo de datos.', 'error');
      return;
    }
    try {
      const media = await processMediaUrl(url);
      setProfileAvatarUrl(media.dataUrl);
      setUrlText('');
      showNotification('Foto preparada. Pulsa «Guardar cambios» para guardarla.', 'info');
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'No se pudo procesar la dirección web.',
        'error',
      );
    }
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
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
      showNotification('Introduce un correo electrónico válido en el perfil.', 'error');
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
                  <MediaView
                    src={profileAvatarUrl || currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                    alt={currentUser.name}
                    className="block h-14 w-14 rounded-full border-2 border-[#FF4E00] bg-stone-100 object-center"
                    style={{ borderRadius: '9999px' }}
                    fit="contain"
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
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept={MEDIA_ACCEPT}
                      onChange={handleAvatarFileSelected}
                      className="w-full rounded-xl border border-stone-800 bg-[#1a1a1e] px-3 py-2 text-xs text-stone-200 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FF4E00] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Pega aquí una URL de avatar…"
                      value={profileAvatarUrlText}
                      onChange={(e) => setProfileAvatarUrlText(e.target.value)}
                      onBlur={() => handleAvatarUrlPaste(profileAvatarUrlText, setProfileAvatarUrlText)}
                      className="w-full rounded-xl border border-stone-800 bg-[#1a1a1e] px-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                    />
                  </div>
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

                {/* La cuenta bancaria NO se pide aquí: es un dato del negocio
                    (businesses.account_number), que se recoge en el alta y lo
                    edita el propio usuario del negocio para conectar la
                    pasarela de pago. Los clientes no manejan cobros. */}

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-300">Nueva contraseña (opcional)</label>
                  <SensitiveInput
                    type="password"
                    value={profileNewPassword}
                    onChange={(event) => setProfileNewPassword(event.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-xl border border-stone-800 bg-[#1a1a1e] px-4 py-3 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] sm:text-sm"
                    toggleClassName="text-stone-400 hover:bg-white/10 hover:text-white"
                    toggleLabel="contraseña"
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

                {isRegisterMode && (
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">
                      Dirección de entrega
                    </label>
                    <GeoapifyAddressInput
                      value={addressInput}
                      localityId={localityId}
                      onChange={(value) => {
                        setAddressInput(value);
                        setAddressVerification(null);
                        setRegisterFieldErrors((previous) => ({ ...previous, address: '' }));
                      }}
                      hasError={Boolean(registerFieldErrors.address) && !addressVerification?.streetVerified}
                    />
                    {(addressVerification?.verified || (addressVerification && !addressVerification.configured)) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {addressVerification?.checked && addressVerification.verified && (
                          <span className="text-[11px] font-semibold text-[#8bca60]">
                            Dirección confirmada
                          </span>
                        )}
                        {addressVerification && !addressVerification.configured && (
                          <span className="text-[11px] text-amber-300">
                            Verificación no disponible. Dirección sin confirmar.
                          </span>
                        )}
                      </div>
                    )}
                    {addressVerification?.streetVerified && !addressVerification.verified && (
                      <p role="status" className="mt-2 text-xs text-amber-300">
                        {addressVerification.message}
                      </p>
                    )}
                    {registerFieldErrors.address && !addressVerification?.streetVerified && (
                      <FieldError message={registerFieldErrors.address} />
                    )}
                    {addressVerification?.checked && (
                      <p className="mt-2 text-[10px] text-stone-400">
                        Powered by{' '}
                        <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer" className="underline">Geoapify</a>
                        {' · '}
                        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">© OpenStreetMap contributors</a>
                      </p>
                    )}
                  </div>
                )}

                {isRegisterMode && (
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">
                      Localidad
                    </label>
                    <select
                      required
                      value={localityId}
                      onChange={(e) => {
                        setLocalityId(e.target.value);
                        setAddressVerification(null);
                        setRegisterFieldErrors((previous) => ({ ...previous, address: '', localityId: '' }));
                      }}
                      className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-stone-800 bg-[#1a1a1e] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                    >
                      <option value="">Selecciona una localidad…</option>
                      {localities.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    {isRegisterMode ? 'Correo electrónico' : 'Correo electrónico o usuario'}
                  </label>
                  <input
                    // En registro sí pedimos email; en acceso aceptamos también
                    // el nombre de usuario (el backend resuelve username||email),
                    // y type="email" bloquearía el envío al escribir un usuario.
                    type={isRegisterMode ? 'email' : 'text'}
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={isRegisterMode ? 'tu@email.com' : 'tu@email.com o usuario'}
                    className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-stone-800 bg-[#1a1a1e] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Contraseña (mín. 8 caracteres)
                  </label>
                  <SensitiveInput
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-10 py-3 text-xs sm:text-sm rounded-xl border border-stone-800 bg-[#1a1a1e] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                    toggleClassName="text-stone-400 hover:bg-white/10 hover:text-white"
                    toggleLabel="contraseña"
                  />
                </div>

                {requiresEmailVerification && !isRegisterMode && (
                  <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5">
                    <p className="text-xs leading-5 text-amber-100">
                      Esta cuenta está pendiente de activación. Envía el código al correo y verifícalo para poder entrar.
                    </p>
                    <button
                      type="button"
                      onClick={handleSendVerification}
                      disabled={verificationSending}
                      className="w-full rounded-xl border border-amber-300/60 px-3 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-300/10 disabled:opacity-60"
                    >
                      {verificationSending ? 'Enviando código…' : 'ENVIAR CÓDIGO DE VERIFICACIÓN'}
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={verificationCodeInput}
                      onChange={(event) => setVerificationCodeInput(event.target.value.replace(/\D/g, ''))}
                      placeholder="Código de 6 dígitos"
                      className="w-full rounded-xl border border-stone-800 bg-[#1a1a1e] px-4 py-3 text-center text-sm font-bold tracking-[0.3em] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyAndLogin}
                      className="w-full rounded-xl bg-amber-300 py-3 text-xs font-black uppercase tracking-wider text-stone-950 transition hover:bg-amber-200"
                    >
                      VERIFICAR Y ACTIVAR CUENTA
                    </button>
                  </div>
                )}

                {isRegisterMode && (
                  <label className="flex items-start gap-3 rounded-xl border border-stone-800 bg-stone-900/50 p-3 text-xs text-stone-300">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                      required
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF4E00]"
                    />
                    <span className="leading-5">
                      Acepto los{' '}
                      <a
                        href={TERMS_CLIENT_ANCHOR}
                        onClick={(event) => openTermsInNewTab(event, TERMS_CLIENT_ANCHOR)}
                        className="font-bold text-[#ff8a5c] underline decoration-[#ff4e00] underline-offset-2 hover:text-white"
                      >
                        Términos y condiciones para clientes
                      </a>{' '}
                      y la{' '}
                      <a
                        href={PRIVACY_POLICY_ANCHOR}
                        onClick={(event) => openTermsInNewTab(event, PRIVACY_POLICY_ANCHOR)}
                        className="font-bold text-[#ff8a5c] underline decoration-[#ff4e00] underline-offset-2 hover:text-white"
                      >
                        Política de privacidad
                      </a>{' '}
                      de PideTiétar.
                    </span>
                  </label>
                )}

                {/* Big White Button with Black Text (Exact Match to Image 4) */}
                <button
                  type="submit"
                  disabled={authSubmitting}
                  aria-busy={authSubmitting}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-xs font-black uppercase tracking-wider text-stone-950 shadow-lg transition hover:bg-stone-200 cursor-pointer disabled:cursor-wait disabled:opacity-60"
                >
                  {authSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {authSubmitting
                    ? addressVerificationLoading ? 'VERIFICANDO DIRECCIÓN…' : isRegisterMode ? 'CREANDO CUENTA…' : 'INICIANDO SESIÓN…'
                    : isRegisterMode ? 'CREAR CUENTA' : 'INICIAR SESIÓN'}
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
                        <SensitiveInput
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                          className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-stone-800 bg-[#1a1a1e] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                          toggleClassName="text-stone-400 hover:bg-white/10 hover:text-white"
                          toggleLabel="contraseña"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-300 mb-1">
                          Confirmar nueva contraseña
                        </label>
                        <SensitiveInput
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Repite la nueva contraseña"
                          className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-stone-800 bg-[#1a1a1e] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                          toggleClassName="text-stone-400 hover:bg-white/10 hover:text-white"
                          toggleLabel="contraseña"
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
