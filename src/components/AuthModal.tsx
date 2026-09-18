import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Mail, CheckCircle2, ShieldAlert, KeyRound, 
  Send, User, Phone, MapPin, Sparkles, LogOut, Check,
  ArrowLeft, Eye, EyeOff, Lock
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
    showNotification
  } = useApp();

  const [isRegisterMode, setIsRegisterMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form inputs matching Image 4
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone || '');
  const [emailInput, setEmailInput] = useState(currentUser?.email || 'rafaeldesweb@gmail.com');
  const [password, setPassword] = useState('');

  // Gmail verification code
  const [inputCode, setInputCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

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
    if (!emailInput.trim()) {
      showNotification('Introduce un correo electrónico válido', 'error');
      return;
    }
    
    // Auto login
    loginAs('CLIENT', emailInput);
    showNotification(
      isRegisterMode 
        ? `¡Cuenta creada para ${fullName || emailInput}! Bienvenido a PideTiétar.`
        : `Sesión iniciada como ${emailInput}`,
      'success'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#121214] text-white rounded-3xl shadow-2xl border border-stone-800 overflow-hidden">
        
        {/* Top bar with back to menu and close (Matching Image 4) */}
        <div className="flex items-center justify-between p-5 pb-2">
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
        <div className="p-6 pt-2 space-y-5 max-h-[85vh] overflow-y-auto">
          
          {currentUser ? (
            /* Logged in state with Profile & Gmail Verification */
            <div className="space-y-5">
              
              {/* Profile Card */}
              <div className="flex items-center space-x-3.5 p-4 rounded-2xl bg-stone-900 border border-stone-800">
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#FF4E00]"
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

              {/* Gmail Identity Verification */}
              <div className="p-4 rounded-2xl border border-stone-800 bg-stone-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                      Verificación Gmail
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
                  Código oficial de seguridad enviado por Gmail para verificar tu identidad en el Tiétar.
                </p>

                {verificationSent ? (
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
              
              {/* Header text matching Image 4 */}
              <div className="space-y-1">
                <div className="text-xs font-black tracking-widest text-emerald-400 uppercase">
                  LA BODEGUITA
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  {isRegisterMode ? 'REGÍSTRATE' : 'INICIA SESIÓN'}
                </h2>
                <p className="text-xs text-stone-400">
                  {isRegisterMode
                    ? 'Crea tu cuenta para pedir y consultar el estado de tus pedidos.'
                    : 'Introduce tus credenciales para acceder a tus pedidos y ventajas Club+.'}
                </p>
              </div>

              <form onSubmit={handleSubmitAuth} className="space-y-3.5 pt-2">
                
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
                  className="w-full mt-3 py-3.5 bg-white hover:bg-stone-200 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg cursor-pointer"
                >
                  {isRegisterMode ? 'CREAR CUENTA' : 'INICIAR SESIÓN'}
                </button>

              </form>

              {/* Bottom toggle link (Matching Image 4) */}
              <div className="text-center pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(!isRegisterMode)}
                  className="text-xs text-stone-400 hover:text-white transition font-medium"
                >
                  {isRegisterMode ? (
                    <>¿Ya tienes cuenta? <strong className="text-white underline">Inicia sesión</strong></>
                  ) : (
                    <>¿No tienes cuenta? <strong className="text-white underline">Regístrate</strong></>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
