import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Menu, X, Sun, Moon, ShoppingBag, MapPin, 
  UserCheck, ShieldCheck, ChevronDown, CheckCircle2,
  Calendar, Mail, CreditCard, Sparkles, AlertCircle
} from 'lucide-react';
import { LOCALITIES } from '../data/mockData';
import { UserRole } from '../types';

interface HeaderProps {
  currentView: string;
  setCurrentView: (v: string) => void;
  openCart: () => void;
  openAuthModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  openCart,
  openAuthModal,
}) => {
  const { 
    isDarkMode, 
    toggleDarkMode, 
    currentUser, 
    loginAs, 
    logout, 
    selectedLocality, 
    setSelectedLocality,
    cart,
    userSubscription
  } = useApp();

  const [localityMenuOpen, setLocalityMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const cartItemsCount = cart ? cart.items.reduce((acc, i) => acc + i.quantity, 0) : 0;

  const roles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'CLIENT', label: 'Cliente', desc: 'Pedir y explorar locales' },
    { role: 'BUSINESS_ADMIN', label: 'Admin Comercio', desc: 'Asador & Burger El Tiétar' },
    { role: 'BUSINESS_EMPLOYEE', label: 'Cocinero/Caja', desc: 'Turno de cocina' },
    { role: 'PLATFORM_COURIER', label: 'Repartidor Plataforma', desc: 'Entregas y ruta en mapa' },
    { role: 'PLATFORM_ADMIN', label: 'Admin Plataforma', desc: 'Supervisión y comercios' },
    { role: 'SUPERADMIN', label: 'Superadministrador', desc: 'rafaeldesweb@gmail.com' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 sm:space-x-6">
            <button 
              id="brand-logo-btn"
              onClick={() => setCurrentView('home')}
              className="flex items-center space-x-2 text-left group cursor-pointer"
            >
              {/* Minimalist delivery courier on scooter logo */}
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#FF4E00] to-[#A32300] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  {/* Courier rider icon with backpack & scooter */}
                  <path d="M12 2a2 2 0 100 4 2 2 0 000-4zm-4 7a2 2 0 012-2h4a2 2 0 012 2v2h1a1 1 0 011 1v1a2 2 0 01-2 2h-1v2h2a1 1 0 011 1v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a1 1 0 011-1h2v-2H6a2 2 0 01-2-2v-1a1 1 0 011-1h1V9zm6 7v-4h-4v4h4z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-xl sm:text-2xl font-serif tracking-tight text-stone-900 dark:text-stone-100">
                    Pide<span className="text-[#FF4E00]">Tiétar</span>
                  </span>
                  {userSubscription === 'PRO_MONTHLY' && (
                    <span className="bg-[#F5BB00]/20 text-[#A32300] dark:text-[#F5BB00] text-[10px] font-bold px-1.5 py-0.5 rounded-sm border border-[#F5BB00]/40">
                      CLUB+
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:block">
                  Todo el valle a tu puerta
                </p>
              </div>
            </button>

            {/* Locality Selector Dropdown */}
            <div className="relative">
              <button
                id="locality-selector-btn"
                onClick={() => setLocalityMenuOpen(!localityMenuOpen)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-medium transition cursor-pointer border border-stone-200 dark:border-stone-700"
              >
                <MapPin className="w-3.5 h-3.5 text-[#FF4E00]" />
                <span className="max-w-[110px] sm:max-w-none truncate">{selectedLocality.name}</span>
                <ChevronDown className="w-3 h-3 text-stone-500" />
              </button>

              {localityMenuOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Localidades del Tiétar
                  </div>
                  {LOCALITIES.map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => {
                        setSelectedLocality(loc);
                        setLocalityMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer ${
                        selectedLocality.id === loc.id ? 'text-[#FF4E00] font-semibold bg-[#FF4E00]/5' : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <span>{loc.name}</span>
                      <span className="text-xs text-stone-400">{loc.postalCode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setCurrentView('home')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                currentView === 'home'
                  ? 'text-[#FF4E00] bg-orange-50 dark:bg-orange-950/40'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              Comercios
            </button>
            <button
              onClick={() => setCurrentView('orders')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                currentView === 'orders'
                  ? 'text-[#FF4E00] bg-orange-50 dark:bg-orange-950/40'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              Mis Pedidos
            </button>
            <button
              onClick={() => setCurrentView('subscriptions')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                currentView === 'subscriptions'
                  ? 'text-[#FF4E00] bg-orange-50 dark:bg-orange-950/40'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F5BB00]" />
              <span>Suscripciones</span>
            </button>
            {currentUser && (currentUser.role === 'BUSINESS_ADMIN' || currentUser.role === 'BUSINESS_EMPLOYEE' || currentUser.role === 'SUPERADMIN') && (
              <button
                onClick={() => setCurrentView('business-dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  currentView === 'business-dashboard'
                    ? 'text-[#FF4E00] bg-orange-50 dark:bg-orange-950/40'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                Panel Negocio
              </button>
            )}
            {currentUser && (currentUser.role === 'PLATFORM_COURIER' || currentUser.role === 'BUSINESS_COURIER' || currentUser.role === 'SUPERADMIN') && (
              <button
                onClick={() => setCurrentView('courier-dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  currentView === 'courier-dashboard'
                    ? 'text-[#FF4E00] bg-orange-50 dark:bg-orange-950/40'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                Panel Repartidor
              </button>
            )}
            {currentUser && (currentUser.role === 'PLATFORM_ADMIN' || currentUser.role === 'SUPERADMIN') && (
              <button
                onClick={() => setCurrentView('admin-dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1 ${
                  currentView === 'admin-dashboard'
                    ? 'text-[#FF4E00] bg-orange-50 dark:bg-orange-950/40'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>Superadmin</span>
              </button>
            )}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Cambiar modo claro y oscuro"
              className="p-2 rounded-full text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Shopping Cart Button */}
            <button
              id="cart-trigger-btn"
              onClick={openCart}
              aria-label="Ver cesta de compra"
              className="relative p-2 rounded-full bg-[#FF4E00]/10 hover:bg-[#FF4E00]/20 text-[#A32300] dark:text-[#FF4E00] transition cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#A32300] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-stone-900 shadow-xs">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* Role Simulator Switcher */}
            <div className="relative">
              <button
                id="role-switch-btn"
                onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer border border-stone-200 dark:border-stone-700"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#FF4E00]" />
                <span className="hidden sm:inline">Rol:</span>
                <span className="text-[#A32300] dark:text-amber-400 font-bold max-w-[80px] truncate">
                  {currentUser ? currentUser.role : 'Invitado'}
                </span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {roleSwitcherOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-stone-100 dark:border-stone-800">
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      Simulador de Roles (Multi-Usuario)
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Cambia de vista para probar permisos de inmediato
                    </p>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/50">
                    {roles.map(r => (
                      <button
                        key={r.role}
                        onClick={() => {
                          loginAs(r.role);
                          setRoleSwitcherOpen(false);
                          if (r.role === 'BUSINESS_ADMIN' || r.role === 'BUSINESS_EMPLOYEE') setCurrentView('business-dashboard');
                          else if (r.role === 'PLATFORM_COURIER') setCurrentView('courier-dashboard');
                          else if (r.role === 'PLATFORM_ADMIN' || r.role === 'SUPERADMIN') setCurrentView('admin-dashboard');
                          else setCurrentView('home');
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-50 dark:hover:bg-stone-800 flex items-start space-x-2 ${
                          currentUser?.role === r.role ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-[#FF4E00] mt-1 shrink-0" />
                        <div>
                          <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center space-x-1">
                            <span>{r.label}</span>
                            {currentUser?.role === r.role && <CheckCircle2 className="w-3 h-3 text-[#FF4E00]" />}
                          </div>
                          <div className="text-[11px] text-stone-500">{r.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Auth Action */}
            {currentUser ? (
              <button
                id="user-profile-btn"
                onClick={openAuthModal}
                className="flex items-center space-x-2 p-1 rounded-full hover:ring-2 hover:ring-[#FF4E00] transition"
              >
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-stone-200 dark:border-stone-700"
                />
              </button>
            ) : (
              <button
                id="login-trigger-btn"
                onClick={openAuthModal}
                className="bg-[#FF4E00] hover:bg-[#A32300] text-white text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg transition shadow-xs"
              >
                Entrar
              </button>
            )}

            {/* Mobile Nav Button */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="p-2 md:hidden text-stone-700 dark:text-stone-300"
            >
              {mobileNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {mobileNavOpen && (
        <div className="md:hidden border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 pt-3 pb-6 space-y-2">
          <button
            onClick={() => { setCurrentView('home'); setMobileNavOpen(false); }}
            className="w-full text-left py-2 text-stone-800 dark:text-stone-200 font-medium"
          >
            Comercios del Valle
          </button>
          <button
            onClick={() => { setCurrentView('orders'); setMobileNavOpen(false); }}
            className="w-full text-left py-2 text-stone-800 dark:text-stone-200 font-medium"
          >
            Mis Pedidos
          </button>
          <button
            onClick={() => { setCurrentView('subscriptions'); setMobileNavOpen(false); }}
            className="w-full text-left py-2 text-stone-800 dark:text-stone-200 font-medium flex items-center justify-between"
          >
            <span>Suscripciones PideTiétar Club</span>
            <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">Desde 6.99€</span>
          </button>
          {currentUser && (currentUser.role === 'BUSINESS_ADMIN' || currentUser.role === 'SUPERADMIN') && (
            <button
              onClick={() => { setCurrentView('business-dashboard'); setMobileNavOpen(false); }}
              className="w-full text-left py-2 text-stone-800 dark:text-stone-200 font-medium"
            >
              Panel de Negocio (Kanban & Turno)
            </button>
          )}
          {currentUser && (currentUser.role === 'PLATFORM_COURIER' || currentUser.role === 'SUPERADMIN') && (
            <button
              onClick={() => { setCurrentView('courier-dashboard'); setMobileNavOpen(false); }}
              className="w-full text-left py-2 text-stone-800 dark:text-stone-200 font-medium"
            >
              Panel de Repartidor
            </button>
          )}
          {currentUser && (currentUser.role === 'PLATFORM_ADMIN' || currentUser.role === 'SUPERADMIN') && (
            <button
              onClick={() => { setCurrentView('admin-dashboard'); setMobileNavOpen(false); }}
              className="w-full text-left py-2 text-stone-800 dark:text-stone-200 font-medium text-[#FF4E00]"
            >
              Superadministrador Tiétar
            </button>
          )}
        </div>
      )}
    </header>
  );
};
