import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Star, Clock, Bike, Store, ArrowRight, 
  Sparkles, CheckCircle2, ChevronRight, AlertCircle, 
  Filter, Utensils, Flame, ChevronLeft
} from 'lucide-react';
import { CATEGORIES, getTopRatedProductsByBusiness, getTopRatedProductsForLocality } from '../data/mockData';
import { Business, Product } from '../types';

interface HomeViewProps {
  onSelectBusiness: (biz: Business) => void;
  openProductCustomizer: (prod: Product, bizId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onSelectBusiness, openProductCustomizer }) => {
  const { 
    businesses, 
    products, 
    selectedLocality, 
    userSubscription,
    currentUser
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterOpenOnly, setFilterOpenOnly] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    const container = categoryScrollRef.current;
    if (!container) return;

    const itemWidth = window.innerWidth >= 640 ? 92 : 70;
    const scrollAmount = Math.max(container.clientWidth * 0.72, itemWidth * 2);

    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const localityProducts = products.filter(
    (product) => product.localityId === selectedLocality.id && product.isAvailable,
  );

  const bannerSourceProducts = getTopRatedProductsByBusiness(
    localityProducts,
    selectedLocality.id,
    10,
  );

  const bannerSlides = bannerSourceProducts.length > 0
    ? bannerSourceProducts.map((product, index) => {
        const business = businesses.find((biz) => biz.id === product.businessId);
        const category = CATEGORIES.find((cat) => cat.id === product.categoryId);

        return {
          id: `slide-${product.id}`,
          tag: (category?.name || 'DESTACADO').toUpperCase(),
          title: product.name,
          discount: `${(product.rating ?? 4.5).toFixed(1)}★`,
          description: product.description,
          image: product.imageUrl,
          ctaText: business ? `Pedir de ${business.name}` : 'Pedir ahora',
          bgColor: ['from-[#1A0600] via-[#330c00] to-[#FF4E00]', 'from-[#180e03] via-[#2d1b06] to-[#A32300]', 'from-[#0b1712] via-[#10291e] to-[#046A38]'][index % 3]
        };
      })
    : [
        {
          id: 'slide-fallback-burger',
          tag: 'OFERTA ESPECIAL',
          title: 'Burger del Valle',
          discount: '4.9★',
          description: 'Hamburguesas gourmet elaboradas con carne 100% IGP Ternera de Ávila y quesos artesanales del Tiétar.',
          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
          ctaText: 'Pedir Ahora',
          bgColor: 'from-[#1A0600] via-[#330c00] to-[#FF4E00]'
        },
        {
          id: 'slide-fallback-asado',
          tag: 'TRADICIÓN DEL VALLE',
          title: 'Asados & Chuletones',
          discount: '4.8★',
          description: 'Carnes a la brasa con denominación de origen y raciones típicas de nuestros asadores locales.',
          image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
          ctaText: 'Ver Asadores',
          bgColor: 'from-[#180e03] via-[#2d1b06] to-[#A32300]'
        },
        {
          id: 'slide-fallback-pizza',
          tag: 'PIZZAS ARTESANAS',
          title: 'Pizzas al Horno de Piedra',
          discount: '4.7★',
          description: 'Masa madre fermentada durante 48 horas con ingredientes frescos traídos directamente de la huerta.',
          image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
          ctaText: 'Explorar Pizzerías',
          bgColor: 'from-[#0b1712] via-[#10291e] to-[#046A38]'
        }
      ];

  useEffect(() => {
    if (activeSlide >= bannerSlides.length) {
      setActiveSlide(0);
    }

    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [bannerSlides.length, activeSlide]);

  // Filter businesses by locality and optional search / category
  const filteredBusinesses = [...businesses.filter((biz) => {
    const matchesLocality = biz.localityId === selectedLocality.id;
    const matchesCat = !selectedCategory ||
      biz.category === selectedCategory ||
      products.some((p) => p.businessId === biz.id && p.categoryId === selectedCategory);
    const matchesOpen = !filterOpenOnly || biz.isShiftOpen;

    return matchesLocality && matchesCat && matchesOpen;
  })].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  const featuredProducts = getTopRatedProductsForLocality(
    localityProducts,
    selectedLocality.id,
    4,
  );

  return (
    <div className="space-y-8 pb-16">
      
      {/* 1. HERO PROMOTIONAL BANNER CAROUSEL (Matching Image 1 & 2) */}
      <section className="relative overflow-hidden rounded-3xl bg-[#140600] text-white shadow-2xl border border-stone-800">
        <div className="relative min-h-[300px] sm:min-h-[360px] overflow-hidden">
          <img
            src={bannerSlides[activeSlide].image}
            alt={bannerSlides[activeSlide].title}
            className="absolute inset-0 h-full w-full object-cover opacity-80 saturate-125 contrast-110"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a0802]/90 via-[#1a0802]/75 to-[#1a0802]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a0802]/80 via-transparent to-transparent" />

          <div className="relative z-10 h-full min-h-[300px] sm:min-h-[360px] p-4 sm:p-6 lg:p-8">
            <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6 lg:left-8 lg:top-8">
              <div className="inline-flex items-center space-x-2 rounded-full border border-[#FF4E00]/50 bg-[#1F0C06]/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5BB00] backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{bannerSlides[activeSlide].tag}</span>
              </div>
            </div>

            <div className="absolute bottom-5 left-4 max-w-[78%] sm:bottom-7 sm:left-6 sm:max-w-[60%] lg:bottom-8 lg:left-8 lg:max-w-[58%]">
              <div className="space-y-2 sm:space-y-3">
                <h1 className="text-3xl font-black font-serif leading-[0.95] tracking-tight text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.7)] sm:text-4xl lg:text-5xl">
                  {bannerSlides[activeSlide].title}
                </h1>
                <div className="text-2xl font-black tracking-tight text-[#FF4E00] drop-shadow-[0_4px_14px_rgba(0,0,0,0.6)] sm:text-3xl lg:text-4xl">
                  {bannerSlides[activeSlide].discount}
                </div>
                <p className="max-w-md text-[11px] leading-relaxed text-stone-200/95 sm:text-sm">
                  {bannerSlides[activeSlide].description}
                </p>
              </div>
            </div>

            <div className="pointer-events-none absolute right-4 top-4 h-36 w-36 sm:right-6 sm:top-6 sm:h-52 sm:w-52 lg:right-8 lg:top-8 lg:h-64 lg:w-64">
              <div className="relative h-full w-full">
                <img
                  src={bannerSlides[activeSlide].image}
                  alt={bannerSlides[activeSlide].title}
                  className="h-full w-full rounded-full border-4 border-[#FF4E00]/30 object-cover shadow-[0_0_40px_rgba(255,78,0,0.28)]"
                />
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center space-x-2">
            {bannerSlides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setActiveSlide(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  activeSlide === idx 
                    ? 'h-2 w-6 bg-[#FF4E00]' 
                    : 'h-2 w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Ir a diapositiva ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 2. CIRCULAR CATEGORY STRIP (Matching Image 1 & 2) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black font-serif text-stone-900 dark:text-stone-100 tracking-tight">
            Descubre Deliciosas Opciones Hoy
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            ¡Explora, elige y pide tus platos favoritos con un solo toque!
          </p>
        </div>

        {/* Circular category items container */}
        <div className="relative group/scroll">
          <button
            type="button"
            onClick={() => scrollCategories('left')}
            aria-label="Desplazar categorías a la izquierda"
            className="absolute -left-1 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-700 shadow-md backdrop-blur-sm transition hover:scale-105 dark:border-stone-700 dark:bg-stone-900/90 dark:text-stone-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            ref={categoryScrollRef}
            className="flex items-start gap-2 overflow-x-auto pb-3 pt-1 [scrollbar-width:none] scroll-smooth snap-x snap-mandatory px-6 sm:gap-3"
          >
            <button
              onClick={() => setSelectedCategory(null)}
              className="group flex w-[62px] shrink-0 snap-start cursor-pointer flex-col items-center gap-2 sm:w-[76px] lg:w-[82px]"
            >
              <div className={`flex h-[58px] w-[58px] items-center justify-center rounded-full p-1 transition-all sm:h-[68px] sm:w-[68px] lg:h-[74px] lg:w-[74px] ${
                selectedCategory === null
                  ? 'scale-105 ring-3 ring-[#F5BB00] shadow-md shadow-[#F5BB00]/30'
                  : 'ring-1 ring-stone-200 hover:ring-stone-400 dark:ring-stone-700'
              }`}>
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#F5BB00] font-black text-stone-950 shadow-inner">
                  <Utensils className="h-5 w-5 stroke-[2.5] sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
                </div>
              </div>
              <span className={`max-w-full truncate text-[9px] font-bold tracking-tight sm:text-[10px] lg:text-xs ${
                selectedCategory === null ? 'text-[#FF4E00] dark:text-[#F5BB00]' : 'text-stone-700 dark:text-stone-300'
              }`}>
                Todos
              </span>
            </button>

            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                  className="group flex w-[62px] shrink-0 snap-start cursor-pointer flex-col items-center gap-2 sm:w-[76px] lg:w-[82px]"
                >
                  <div className={`flex h-[58px] w-[58px] items-center justify-center rounded-full p-1 transition-all sm:h-[68px] sm:w-[68px] lg:h-[74px] lg:w-[74px] ${
                    isSelected
                      ? 'scale-105 ring-3 ring-[#FF4E00] shadow-md shadow-[#FF4E00]/30'
                      : 'ring-1 ring-stone-200 hover:ring-stone-400 dark:ring-stone-700'
                  }`}>
                    <div className="relative h-full w-full overflow-hidden rounded-full shadow-inner">
                      <img src={cat.imageUrl} alt={cat.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/10 transition group-hover:bg-transparent" />
                    </div>
                  </div>
                  <span className={`max-w-full truncate text-[9px] font-bold tracking-tight sm:text-[10px] lg:text-xs ${
                    isSelected ? 'text-[#FF4E00]' : 'text-stone-700 dark:text-stone-300'
                  }`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollCategories('right')}
            aria-label="Desplazar categorías a la derecha"
            className="absolute -right-1 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-700 shadow-md backdrop-blur-sm transition hover:scale-105 dark:border-stone-700 dark:bg-stone-900/90 dark:text-stone-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* 3. FEATURED LOCAL SPECIALTIES */}
      {featuredProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#FF4E00]" />
                <h2 className="text-lg sm:text-xl font-black font-serif text-stone-900 dark:text-stone-100">
                  Platos Estrella en {selectedLocality.name}
                </h2>
              </div>
              <p className="text-xs text-stone-500">
                Los más pedidos hoy en el Valle del Tiétar
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map(prod => {
              const biz = businesses.find(b => b.id === prod.businessId);
              return (
                <div
                  key={prod.id}
                  className="bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200/90 dark:border-stone-800 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div className="relative h-28 sm:h-32 lg:h-36 overflow-hidden">
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover transition duration-300"
                    />
                    <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                      {(prod.priceCents / 100).toFixed(2)}€
                    </div>
                    {biz && (
                      <div className="absolute bottom-2 left-2 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs text-stone-800 dark:text-stone-200 text-[10px] font-semibold px-2 py-1 rounded-md shadow-xs">
                        {biz.name}
                      </div>
                    )}
                  </div>

                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-[13px] text-stone-900 dark:text-stone-100 line-clamp-1">
                        {prod.name}
                      </h3>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 mt-1">
                        {prod.description}
                      </p>
                    </div>

                    <button
                      onClick={() => openProductCustomizer(prod, prod.businessId)}
                      className="w-full mt-1 py-2 px-2 bg-[#FF4E00]/10 hover:bg-[#FF4E00] text-[#A32300] dark:text-[#FF4E00] hover:text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <span>Ordenar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. RESTAURANTS NEAR YOU (Matching Image 1 & 2) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-serif text-stone-900 dark:text-stone-100">
              Restaurantes Cerca de Ti
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Comercios con fogones y hornos en marcha en {selectedLocality.name}
            </p>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setFilterOpenOnly(!filterOpenOnly)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 self-start transition cursor-pointer border ${
              filterOpenOnly
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{filterOpenOnly ? 'Solo Cocinas Abiertas' : 'Filtrar por Abiertos'}</span>
          </button>
        </div>

        {filteredBusinesses.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
            <Store className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
            <h3 className="font-bold text-stone-800 dark:text-stone-200 text-sm">
              No hay comercios disponibles con estos filtros en {selectedLocality.name}
            </h3>
            <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
              Prueba seleccionando otra localidad en la cabecera o restableciendo la categoría.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map(biz => (
              <div
                key={biz.id}
                onClick={() => onSelectBusiness(biz)}
                className="group bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200/90 dark:border-stone-800 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
              >
                {/* Banner & Open indicator */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={biz.bannerUrl}
                    alt={biz.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                  
                  {/* Status Indicator (Open vs Closed) */}
                  <div className="absolute top-3 left-3">
                    {biz.isShiftOpen ? (
                      <span className="inline-flex items-center space-x-1.5 bg-emerald-600/95 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span>Recibiendo pedidos</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 bg-stone-900/85 backdrop-blur-md text-stone-300 text-[11px] font-medium px-2.5 py-1 rounded-full">
                        <span>Turno cerrado</span>
                      </span>
                    )}
                  </div>

                  {/* Rating badge */}
                  <div className="absolute bottom-3 right-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md text-stone-900 dark:text-stone-100 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-xs">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{biz.rating}</span>
                    <span className="text-[10px] text-stone-400 font-normal">({biz.reviewCount})</span>
                  </div>
                </div>

                {/* Info details */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 group-hover:text-[#FF4E00] transition">
                        {biz.name}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {biz.address}
                      </p>
                    </div>
                  </div>

                  {/* Meta badges: time, delivery fee, min order */}
                  <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{biz.estimatedTimeMin}-{biz.estimatedTimeMax} min</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Bike className="w-3.5 h-3.5 text-stone-400" />
                      <span>
                        {userSubscription === 'PRO_MONTHLY' ? (
                          <span className="text-emerald-600 font-bold">0€ con Pro</span>
                        ) : (
                          `${(biz.deliveryFeeCents / 100).toFixed(2)}€ envío`
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400">Mín: </span>
                      <span className="font-semibold">{(biz.minOrderCents / 100).toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
