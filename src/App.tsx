import React, { useEffect, useState } from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { BusinessDetailView } from './components/BusinessDetailView';
import { ProductCustomizerModal } from './components/ProductCustomizerModal';
import { CartDrawer } from './components/CartDrawer';
import { OrdersView } from './components/OrdersView';
import { BusinessDashboard } from './components/BusinessDashboard';
import { CourierDashboard } from './components/CourierDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { AvatarEditorModal } from './components/AvatarEditorModal';
import { ResetPasswordView } from './components/ResetPasswordView';
import { TermsAndConditionsView } from './components/TermsAndConditionsView';
import { ContactView } from './components/ContactView';
import { ErrorPage, LoadingPage } from './components/ErrorAndLoading';
import { ProjectLogo } from './components/ProjectLogo';
import { Business, Product } from './types';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { SeoHead } from './components/SeoHead';
import { Breadcrumbs, homeBreadcrumb, categoriesBreadcrumb } from './components/Breadcrumbs';

/** Token del enlace de recuperación si la URL trae #restablecer-clave?token=… */
const readResetTokenFromHash = (): string | null => {
  const hash = decodeURIComponent(window.location.hash || '');
  const match = hash.match(/#restablecer-clave\?(?:[^#]*&)?token=([0-9a-fA-F]+)/);
  return match ? match[1] : null;
};

const isTermsHash = (hash: string): boolean =>
  hash === '#terminos-y-condiciones' ||
  hash === '#terminos-repartidores' ||
  hash === '#terminos-clientes' ||
  hash === '#terminos-negocios' ||
  hash === '#politica-privacidad' ||
  hash === '#politica-cookies';

const isContactHash = (hash: string): boolean => hash === '#contacto';

const readInitialView = (): string =>
  isTermsHash(window.location.hash) ? 'terms' : isContactHash(window.location.hash) ? 'contact' : 'home';

export default function App() {
  const { 
    notification, 
    isLoading, 
    setIsLoading, 
    pageError, 
    setPageError,
    currentUser,
    businesses
  } = useApp();

  const [currentView, setCurrentView] = useState<string>(readInitialView);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const activeSelectedBusiness = selectedBusiness
    ? businesses.find((business) => business.id === selectedBusiness.id) ?? selectedBusiness
    : null;

  // Modals state
  const [cartOpen, setCartOpen] = useState(false);
  // El modal de acceso no abre de primeras: la portada es navegable sin sesión.
  // Se abre sólo bajo demanda (botón "Entrar") o al intentar finalizar una
  // compra anónima desde el carrito.
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [customizerProduct, setCustomizerProduct] = useState<Product | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(() => readResetTokenFromHash());
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  // El hash de la URL puede cambiar sin recargar la página (al pegar otro
  // enlace de recuperación en una pestaña ya abierta). Sin este listener el
  // modal seguiría mostrando el token antiguo y fallaría con "enlace no
  // válido": cada token nuevo emitido anula el anterior.
  useEffect(() => {
    const handleHashChange = () => {
      setResetToken(readResetTokenFromHash());
      if (isTermsHash(window.location.hash)) setCurrentView('terms');
      if (isContactHash(window.location.hash)) setCurrentView('contact');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // El avatar de la cabecera: el administrador de negocio edita sólo la foto
  // (sus datos completos están en "DATOS DEL NEGOCIO"); el resto de roles
  // conserva el modal de perfil completo.
  const handleAvatarButton = () => {
    if (currentUser?.role === 'BUSINESS_ADMIN') {
      setAvatarModalOpen(true);
      return;
    }
    setAuthModalOpen(true);
  };
  const [customizerBizId, setCustomizerBizId] = useState<string | null>(null);
  const canAccessCourierDashboard = !!currentUser && (currentUser.role === 'PLATFORM_COURIER' || currentUser.role === 'BUSINESS_COURIER') && currentUser.isEmailVerified && (currentUser.courierProfile?.confirmation === 'SUPERADMIN' || currentUser.courierProfile?.confirmation === 'BUSINESS_EMAIL');
  const canAccessBusinessDashboard = !!currentUser && (currentUser.role === 'BUSINESS_ADMIN' || currentUser.role === 'SUPERADMIN');
  const canAccessAdminDashboard = !!currentUser && currentUser.role === 'SUPERADMIN';

  const handleOpenProductCustomizer = (prod: Product, bizId: string) => {
    setCustomizerProduct(prod);
    setCustomizerBizId(bizId);
  };

  const handleSelectBusiness = (biz: Business) => {
    setSelectedBusiness(biz);
    setCurrentView('business-detail');
  };

  // Cada vez que se abra una "página" (cambio de vista), el scroll vuelve al inicio.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans transition-colors duration-200">
      
      {/* Global Notifications Toast (centrado en pantalla, por encima del modal) */}
      {notification && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[120] animate-in fade-in zoom-in-95 duration-200">
          <div className={`flex items-center space-x-2 px-5 py-4 rounded-2xl shadow-2xl border text-sm font-semibold max-w-md ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : notification.type === 'error'
              ? 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100'
              : 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
          }`}>
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
            {notification.type === 'info' && <Info className="w-5 h-5 text-amber-600 shrink-0" />}
            <span className="flex-1">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Header & Navbar */}
      <Header
        setCurrentView={(view) => {
          setSelectedBusiness(null);
          setCurrentView(view);
        }}
        openCart={() => setCartOpen(true)}
        openAuthModal={() => setAuthModalOpen(true)}
        onAvatarClick={handleAvatarButton}
      />

      {/* Main App Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-6">
        
        {isLoading ? (
          <LoadingPage message="Conectando con la red del Valle del Tiétar..." />
        ) : pageError ? (
          <ErrorPage
            errorMessage={pageError}
            onRetry={() => {
              setPageError(null);
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 500);
            }}
            onGoHome={() => {
              setPageError(null);
              setCurrentView('home');
            }}
          />
        ) : (
          <>
            {currentView === 'terms' && (
              <TermsAndConditionsView
                onBack={() => {
                  if (window.opener && !window.opener.closed) {
                    window.opener.focus();
                    window.close();
                    return;
                  }
                  window.history.back();
                  setCurrentView('home');
                }}
              />
            )}
            {currentView === 'contact' && (
              <ContactView
                onBack={() => {
                  window.history.replaceState(null, '', window.location.pathname + window.location.search);
                  setCurrentView('home');
                }}
              />
            )}
            {currentView === 'home' && (
              <>
                <SeoHead
                  title="PideTiétar"
                  description="Plataforma de delivery y comercio local en el Valle del Tiétar con gestión de pedidos, negocios, repartidores, pagos y sincronización."
                  type="website"
                />
                <Breadcrumbs items={[homeBreadcrumb]} />
                <HomeView
                  onSelectBusiness={handleSelectBusiness}
                  openProductCustomizer={handleOpenProductCustomizer}
                />
              </>
            )}

            {currentView === 'business-detail' && activeSelectedBusiness && (
              <>
                <SeoHead
                  title={activeSelectedBusiness.name}
                  description={`Conoce ${activeSelectedBusiness.name}, comercio del Valle del Tiétar. Carta, horarios y reparto a domicilio.`}
                  type="business"
                  image={activeSelectedBusiness.logoUrl || activeSelectedBusiness.bannerUrl}
                  url={`/negocio/${activeSelectedBusiness.id}`}
                  businessName={activeSelectedBusiness.name}
                />
                <Breadcrumbs
                  items={[
                    homeBreadcrumb,
                    { label: activeSelectedBusiness.name, href: `#negocio/${activeSelectedBusiness.id}` },
                  ]}
                />
                <BusinessDetailView
                  business={activeSelectedBusiness}
                  onBack={() => {
                    setSelectedBusiness(null);
                    setCurrentView('home');
                  }}
                  openProductCustomizer={handleOpenProductCustomizer}
                />
              </>
            )}

            {currentView === 'orders' && (
              <>
                <SeoHead
                  title="Mis pedidos"
                  description="Historial y estado de tus pedidos en PideTiétar."
                  type="website"
                />
                <OrdersView />
              </>
            )}

            {currentView === 'business-dashboard' && (
              <>
                <SeoHead
                  title="Panel de negocio"
                  description="Gestiona tu comercio, carta y pedidos desde el panel de negocio de PideTiétar."
                  type="website"
                />
                {canAccessBusinessDashboard ? (
                  <BusinessDashboard initialBusinessId={selectedBusiness?.id} />
                ) : (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-800">
                    No tienes permisos para abrir el dashboard de negocio con este usuario.
                  </div>
                )}
              </>
            )}

            {currentView === 'courier-dashboard' && (
              <>
                <SeoHead
                  title="Panel de repartidor"
                  description="Gestiona tus entregas y disponibilidad desde el panel de repartidor de PideTiétar."
                  type="website"
                />
                {canAccessCourierDashboard ? (
                  <CourierDashboard />
                ) : (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-800">
                    No tienes permisos para abrir el dashboard de repartidor con este usuario.
                  </div>
                )}
              </>
            )}

            {currentView === 'admin-dashboard' && (
              <>
                <SeoHead
                  title="Superadministración"
                  description="Panel de superadministración de PideTiétar: gestión de comercios, repartidores y categorías."
                  type="website"
                />
                {canAccessAdminDashboard ? (
                  <AdminDashboard onNavigateToBusiness={(bizId) => {
                    setSelectedBusiness(businesses.find(b => b.id === bizId) || null);
                    setCurrentView('business-dashboard');
                  }} />
                ) : (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-800">
                    Solo el usuario Superadmin puede acceder a este dashboard.
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Product Customizer Modal */}
      <ProductCustomizerModal
        product={customizerProduct}
        businessId={customizerBizId}
        isOpen={!!customizerProduct}
        onClose={() => {
          setCustomizerProduct(null);
          setCustomizerBizId(null);
        }}
      />

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onOrderSuccess={(orderId) => {
          setCurrentView('orders');
        }}
        openAuthModal={() => setAuthModalOpen(true)}
      />

      {/* Auth & Gmail Verification Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Editor de avatar desde la cabecera */}
      <AvatarEditorModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
      />

      {/* Enlace de recuperación de contraseña desde el superadmin */}
      {resetToken && (
        <ResetPasswordView
          token={resetToken}
          onClose={() => {
            setResetToken(null);
            history.replaceState(null, '', window.location.pathname + window.location.search);
          }}
          onSuccess={() => {
            setResetToken(null);
            history.replaceState(null, '', window.location.pathname + window.location.search);
            setAuthModalOpen(true);
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 py-8 transition-colors mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center space-x-2">
            <ProjectLogo variant="badge" className="h-7 w-auto max-w-[120px]" />
            <span className="font-bold text-stone-800 dark:text-stone-200">PideTiétar</span>
            <span>• Valle del Tiétar (Ávila)</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-y-2 space-x-4">
            <span>Verificación por correo</span>
            <span>Integración con Google Calendar</span>
            <span>Pagos en modo de prueba</span>
            <div className="flex items-center gap-1 text-[10px] text-stone-500 dark:text-stone-500">
              <a
                href="#contacto"
                className="font-semibold text-stone-700 underline underline-offset-2 hover:text-[#FF4E00] dark:text-stone-200"
              >
                Contáctame
              </a>
              <span className="text-stone-400">|</span>
              <a
                href="#terminos-clientes"
                className="font-semibold text-stone-700 underline underline-offset-2 hover:text-[#FF4E00] dark:text-stone-200"
              >
                Términos clientes
              </a>
              <span className="text-stone-400">|</span>
              <a
                href="#politica-privacidad"
                className="font-semibold text-stone-700 underline underline-offset-2 hover:text-[#FF4E00] dark:text-stone-200"
              >
                Privacidad
              </a>
              <span className="text-stone-400">|</span>
              <a
                href="#politica-cookies"
                className="font-semibold text-stone-700 underline underline-offset-2 hover:text-[#FF4E00] dark:text-stone-200"
              >
                Cookies
              </a>
            </div>
            <button
              onClick={() => {
                setPageError('Simulación intencionada de error del servidor para validar la página de error personalizada.');
              }}
              className="text-stone-400 hover:text-stone-600 underline text-[11px]"
            >
              Probar página de error
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
