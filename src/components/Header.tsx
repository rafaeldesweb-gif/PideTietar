import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Menu, X, ShoppingBag, MapPin,
  UserCheck, ShieldCheck, ChevronDown, CheckCircle2,
  Calendar, Mail, CreditCard, AlertCircle, LogOut
} from 'lucide-react';
import { ProjectLogo } from './ProjectLogo';
import { UserRole } from '../types';
import { canViewOrdersPage } from '../utils/orderVisibility';

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
    currentUser, 
    loginAs, 
    logout, 
    selectedLocality, 
    setSelectedLocality,
    localities,
    cart,
    userSubscription
  } = useApp();

  const [localityMenuOpen, setLocalityMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const cartItemsCount = cart ? cart.items.reduce((acc, i) => acc + i.quantity, 0) : 0;
  const canAccessCourierPanel = !!currentUser && (currentUser.role === 'PLATFORM_COURIER' || currentUser.role === 'BUSINESS_COURIER') && currentUser.isEmailVerified && (currentUser.courierProfile?.confirmation === 'SUPERADMIN' || currentUser.courierProfile?.confirmation === 'BUSINESS_EMAIL');
  const canSeeOrdersPage = canViewOrdersPage(currentUser);

  const roles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'CLIENT', label: 'Cliente', desc: 'Pedir y explorar locales' },
    { role: 'BUSINESS_ADMIN', label: 'Admin Comercio', desc: 'Asador & Burger El Tiétar' },
    { role: 'PLATFORM_COURIER', label: 'Repartidor Plataforma', desc: 'Entregas y ruta en mapa' },
    { role: 'SUPERADMIN', label: 'Superadministrador', desc: 'rafaeldesweb@gmail.com' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 text-stone-900 shadow-xs backdrop-blur-md transition-colors dark:border-stone-800 dark:bg-stone-900/95 dark:text-stone-100">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-2 sm:h-16">
          <div className="relative min-w-0 shrink-0">
            <button
              id="locality-selector-btn"
              onClick={() => setLocalityMenuOpen(!localityMenuOpen)}
              className="flex max-w-[150px] items-center gap-1.5 rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1.5 text-left text-[11px] font-medium text-stone-800 transition hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 sm:max-w-[190px] sm:text-sm"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#FF4E00]" />
              <span className="truncate">{selectedLocality.name}</span>
              <ChevronDown className="h-3 w-3 shrink-0 text-stone-500" />
            </button>

            {localityMenuOpen && (
              <div className="absolute left-0 z-50 mt-2 w-56 rounded-xl border border-stone-200 bg-white py-2 shadow-xl dark:border-stone-800 dark:bg-stone-900">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  Localidades del Tiétar
                </div>
                {localities.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => {
                      setSelectedLocality(loc);
                      setLocalityMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-800 ${
                      selectedLocality.id === loc.id ? 'bg-[#FF4E00]/5 font-semibold text-[#FF4E00]' : 'text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <span>{loc.name}</span>
                    <span className="text-[10px] text-stone-400">{loc.postalCode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            id="brand-logo-btn"
            onClick={() => setCurrentView('home')}
            className="flex h-full min-w-0 shrink-0 flex-1 items-center justify-center self-stretch p-0 text-left"
          >
            <ProjectLogo variant="full" className="my-0 block h-full max-h-14 w-auto max-w-[200px] py-0 sm:max-h-16 sm:max-w-[280px]" />
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
            <button
              id="cart-trigger-btn"
              onClick={openCart}
              aria-label="Ver cesta de compra"
              className="relative rounded-full bg-[#FF4E00]/10 p-2 text-[#A32300] transition hover:bg-[#FF4E00]/20 dark:text-[#FF4E00]"
            >
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#A32300] text-[10px] font-bold text-white dark:border-stone-900">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {canSeeOrdersPage && (
              <button
                id="orders-trigger-btn"
                onClick={() => setCurrentView('orders')}
                className="hidden rounded-full border border-stone-200 bg-stone-100 px-3 py-1.5 text-[11px] font-semibold text-stone-700 transition hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 sm:inline-flex"
              >
                {currentUser?.role === 'SUPERADMIN' ? 'Seguimiento' : (currentUser?.role === 'BUSINESS_ADMIN' ? 'Pedidos del negocio' : 'Mis pedidos')}
              </button>
            )}

            {currentUser && (currentUser.role === 'BUSINESS_ADMIN' || currentUser.role === 'SUPERADMIN') && (
              <button
                id="business-dashboard-btn"
                onClick={() => setCurrentView('business-dashboard')}
                className="hidden rounded-full border border-[#ffd7c2] bg-[#fff2eb] px-3 py-1.5 text-[11px] font-semibold text-[#A32300] transition hover:bg-[#ffe6d6] sm:inline-flex"
              >
                {currentUser.role === 'SUPERADMIN' ? 'Panel de pedidos' : 'Panel negocio'}
              </button>
            )}

            {currentUser?.role === 'SUPERADMIN' && (
              <button
                id="admin-dashboard-btn"
                onClick={() => setCurrentView('admin-dashboard')}
                className="hidden rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 sm:inline-flex"
              >
                Superadmin
              </button>
            )}

            <div className="relative hidden sm:block">
              <button
                id="role-switch-btn"
                onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              >
                <UserCheck className="h-3.5 w-3.5 text-[#FF4E00]" />
                <span className="text-[#A32300] dark:text-amber-400">{currentUser ? currentUser.role : 'Invitado'}</span>
                <ChevronDown className="h-3 w-3 text-stone-400" />
              </button>

              {roleSwitcherOpen && (
                <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-stone-200 bg-white py-2 shadow-2xl dark:border-stone-800 dark:bg-stone-900">
                  <div className="border-b border-stone-100 px-3 py-1.5 dark:border-stone-800">
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">Simulador de Roles</p>
                  </div>
                  <div className="max-h-72 divide-y divide-stone-100 overflow-y-auto dark:divide-stone-800/50">
                    {roles.map((r) => (
                      <button
                        key={r.role}
                        onClick={() => {
                          loginAs(r.role);
                          setRoleSwitcherOpen(false);
                          if (r.role === 'BUSINESS_ADMIN') setCurrentView('business-dashboard');
                          else if (r.role === 'PLATFORM_COURIER') setCurrentView('courier-dashboard');
                          else if (r.role === 'SUPERADMIN') setCurrentView('admin-dashboard');
                          else setCurrentView('home');
                        }}
                        className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-stone-50 dark:hover:bg-stone-800 ${
                          currentUser?.role === r.role ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''
                        }`}
                      >
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#FF4E00]" />
                        <div>
                          <div className="flex items-center gap-1 font-semibold text-stone-800 dark:text-stone-200">
                            <span>{r.label}</span>
                            {currentUser?.role === r.role && <CheckCircle2 className="h-3 w-3 text-[#FF4E00]" />}
                          </div>
                          <div className="text-[11px] text-stone-500">{r.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {currentUser ? (
              <>
                <button
                  id="user-profile-btn"
                  onClick={openAuthModal}
                  className="hidden items-center gap-2 rounded-full p-1 transition hover:ring-2 hover:ring-[#FF4E00] sm:flex"
                  aria-label="Ver perfil"
                >
                  <img
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                    alt={currentUser.name}
                    className="h-9 w-9 rounded-full border-2 border-stone-200 object-cover dark:border-stone-700"
                  />
                </button>
                <button
                  id="logout-btn"
                  type="button"
                  onClick={() => {
                    logout();
                    setCurrentView('home');
                    setRoleSwitcherOpen(false);
                    setMobileNavOpen(false);
                  }}
                  className="hidden items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70 sm:inline-flex"
                  aria-label="Cerrar sesión"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                id="login-trigger-btn"
                onClick={openAuthModal}
                className="hidden rounded-lg bg-[#FF4E00] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#A32300] sm:inline-flex"
              >
                Entrar
              </button>
            )}

            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="rounded-lg p-2 text-stone-700 dark:text-stone-300 md:hidden"
              aria-label="Abrir menú"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileNavOpen && (
        <div className="border-t border-stone-200 bg-white px-4 pb-6 pt-3 dark:border-stone-800 dark:bg-stone-900 md:hidden">
          <div className="space-y-2">
            <button onClick={() => { setCurrentView('home'); setMobileNavOpen(false); }} className="w-full py-2 text-left text-sm font-medium text-stone-800 dark:text-stone-200">Comercios del Valle</button>
            {canSeeOrdersPage && (
              <button onClick={() => { setCurrentView('orders'); setMobileNavOpen(false); }} className="w-full py-2 text-left text-sm font-medium text-stone-800 dark:text-stone-200">
                {currentUser?.role === 'SUPERADMIN' ? 'Seguimiento de pedidos' : (currentUser?.role === 'BUSINESS_ADMIN' ? 'Pedidos del negocio' : 'Mis Pedidos')}
              </button>
            )}
            {currentUser && (currentUser.role === 'BUSINESS_ADMIN' || currentUser.role === 'SUPERADMIN') && (
              <button onClick={() => { setCurrentView('business-dashboard'); setMobileNavOpen(false); }} className="w-full py-2 text-left text-sm font-medium text-stone-800 dark:text-stone-200">
                {currentUser.role === 'SUPERADMIN' ? 'Panel de control de pedidos' : 'Panel de Negocio'}
              </button>
            )}
            {canAccessCourierPanel && (
              <button onClick={() => { setCurrentView('courier-dashboard'); setMobileNavOpen(false); }} className="w-full py-2 text-left text-sm font-medium text-stone-800 dark:text-stone-200">Panel de Repartidor</button>
            )}
            {currentUser && currentUser.role === 'SUPERADMIN' && (
              <button onClick={() => { setCurrentView('admin-dashboard'); setMobileNavOpen(false); }} className="w-full py-2 text-left text-sm font-medium text-[#FF4E00]">Superadministrador</button>
            )}
            {currentUser ? (
              <>
                <button
                  onClick={() => { openAuthModal(); setMobileNavOpen(false); }}
                  className="w-full py-2 text-left text-sm font-medium text-stone-800 dark:text-stone-200"
                >
                  Mi perfil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setCurrentView('home');
                    setMobileNavOpen(false);
                  }}
                  className="flex w-full items-center gap-2 py-2 text-left text-sm font-semibold text-red-600 dark:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </>
            ) : (
              <button
                onClick={() => { openAuthModal(); setMobileNavOpen(false); }}
                className="w-full rounded-lg bg-[#FF4E00] px-3 py-2.5 text-sm font-semibold text-white"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
