import React, { useState } from 'react';
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
import { ErrorPage, LoadingPage } from './components/ErrorAndLoading';
import { ProjectLogo } from './components/ProjectLogo';
import { Business, Product } from './types';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

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

  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const activeSelectedBusiness = selectedBusiness
    ? businesses.find((business) => business.id === selectedBusiness.id) ?? selectedBusiness
    : null;

  // Modals state
  const [cartOpen, setCartOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(true);
  const [customizerProduct, setCustomizerProduct] = useState<Product | null>(null);
  const [customizerBizId, setCustomizerBizId] = useState<string | null>(null);
  const canAccessCourierDashboard = !!currentUser && (currentUser.role === 'PLATFORM_COURIER' || currentUser.role === 'BUSINESS_COURIER') && currentUser.isEmailVerified && (currentUser.courierProfile?.confirmation === 'SUPERADMIN' || currentUser.courierProfile?.confirmation === 'BUSINESS_EMAIL');

  const handleOpenProductCustomizer = (prod: Product, bizId: string) => {
    setCustomizerProduct(prod);
    setCustomizerBizId(bizId);
  };

  const handleSelectBusiness = (biz: Business) => {
    setSelectedBusiness(biz);
    setCurrentView('business-detail');
  };

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans transition-colors duration-200">
      
      {/* Global Notifications Toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className={`flex items-center space-x-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold max-w-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : notification.type === 'error'
              ? 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100'
              : 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
          }`}>
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-amber-600 shrink-0" />}
            <span className="flex-1">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Header & Navbar */}
      <Header
        currentView={currentView}
        setCurrentView={(view) => {
          setSelectedBusiness(null);
          setCurrentView(view);
        }}
        openCart={() => setCartOpen(true)}
        openAuthModal={() => setAuthModalOpen(true)}
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
            {currentView === 'home' && (
              <HomeView
                onSelectBusiness={handleSelectBusiness}
                openProductCustomizer={handleOpenProductCustomizer}
              />
            )}

            {currentView === 'business-detail' && activeSelectedBusiness && (
              <BusinessDetailView
                business={activeSelectedBusiness}
                onBack={() => {
                  setSelectedBusiness(null);
                  setCurrentView('home');
                }}
                openProductCustomizer={handleOpenProductCustomizer}
              />
            )}

            {currentView === 'orders' && <OrdersView />}

            {currentView === 'business-dashboard' && <BusinessDashboard initialBusinessId={selectedBusiness?.id} />}

            {currentView === 'courier-dashboard' && canAccessCourierDashboard && <CourierDashboard />}

            {currentView === 'admin-dashboard' && <AdminDashboard onNavigateToBusiness={(bizId) => {
              setSelectedBusiness(businesses.find(b => b.id === bizId) || null);
              setCurrentView('business-dashboard');
            }} />}
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
      />

      {/* Auth & Gmail Verification Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 py-8 transition-colors mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center space-x-2">
            <ProjectLogo variant="badge" className="h-7 w-auto max-w-[120px]" />
            <span className="font-bold text-stone-800 dark:text-stone-200">PideTiétar</span>
            <span>• Valle del Tiétar (Ávila)</span>
          </div>

          <div className="flex items-center space-x-4">
            <span>Verificación Gmail activa</span>
            <span>Google Calendar Sync</span>
            <span>Stripe & PayPal Verified</span>
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
