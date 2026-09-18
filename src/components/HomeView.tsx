import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, Star, Clock, Bike, Store, ArrowRight, 
  Sparkles, CheckCircle2, ChevronRight, AlertCircle, 
  Filter, Utensils, Flame, ChevronLeft
} from 'lucide-react';
import { CATEGORIES } from '../data/mockData';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterOpenOnly, setFilterOpenOnly] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto rotate banner slides
  const bannerSlides = [
    {
      id: 'slide-burger',
      tag: 'OFERTA ESPECIAL',
      title: 'Special Offer Burger',
      discount: 'UP TO 50% OFF',
      description: 'Hamburguesas gourmet elaboradas con carne 100% IGP Ternera de Ávila y quesos artesanales del Tiétar.',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
      ctaText: 'Pedir Ahora con Descuento',
      bgColor: 'from-[#1A0600] via-[#330c00] to-[#FF4E00]'
    },
    {
      id: 'slide-asado',
      tag: 'TRADICIÓN DEL VALLE',
      title: 'Asados & Chuletones',
      discount: 'LEÑA DE ENCINA',
      description: 'Carnes a la brasa con denominación de origen y raciones típicas de nuestros asadores locales.',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      ctaText: 'Ver Asadores Abiertos',
      bgColor: 'from-[#180e03] via-[#2d1b06] to-[#A32300]'
    },
    {
      id: 'slide-pizza',
      tag: 'PIZZAS ARTESANAS',
      title: 'Pizzas al Horno de Piedra',
      discount: 'ENVÍO GRATIS CLUB+',
      description: 'Masa madre fermentada durante 48 horas con ingredientes frescos traídos directamente de la huerta.',
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
      ctaText: 'Explorar Pizzerías',
      bgColor: 'from-[#0b1712] via-[#10291e] to-[#046A38]'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % bannerSlides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [bannerSlides.length]);

  // Filter businesses by locality and optional search / category
  const filteredBusinesses = businesses.filter(biz => {
    const matchesLocality = biz.localityId === selectedLocality.id;
    const matchesCat = !selectedCategory || biz.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      biz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      biz.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOpen = !filterOpenOnly || biz.isShiftOpen;

    return matchesLocality && matchesCat && matchesSearch && matchesOpen;
  });

  // Featured products from open businesses
  const featuredProducts = products.filter(p => {
    const biz = businesses.find(b => b.id === p.businessId);
    return biz && biz.localityId === selectedLocality.id && p.isAvailable;
  });

  return (
    <div className="space-y-8 pb-16">
      
      {/* 1. HERO PROMOTIONAL BANNER CAROUSEL (Matching Image 1 & 2) */}
      <section className="relative overflow-hidden rounded-3xl bg-[#140600] text-white shadow-2xl border border-stone-800">
        <div className="relative min-h-[300px] sm:min-h-[360px] flex items-center p-6 sm:p-10 lg:p-12">
          
          {/* Slide Content */}
          <div className="relative z-10 max-w-xl space-y-3.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#FF4E00]/20 border border-[#FF4E00]/40 text-[#F5BB00] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{bannerSlides[activeSlide].tag}</span>
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl sm:text-5xl font-black font-serif tracking-tight leading-none text-white">
                {bannerSlides[activeSlide].title}
              </h1>
              <div className="text-2xl sm:text-4xl font-black font-sans text-[#FF4E00] tracking-tight">
                {bannerSlides[activeSlide].discount}
              </div>
            </div>

            <p className="text-stone-300 text-xs sm:text-sm max-w-md line-clamp-2 leading-relaxed">
              {bannerSlides[activeSlide].description}
            </p>

            {/* Quick Search bar */}
            <div className="pt-2 flex items-center max-w-md gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Buscar comida en ${selectedLocality.name}...`}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md text-white placeholder-stone-400 border border-white/20 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-2.5 rounded-xl bg-white/20 text-white text-xs font-bold"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Slide Visual Graphic Background (Burger with flying toppings / Pizza) */}
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-1/2 flex items-center justify-end overflow-hidden pointer-events-none opacity-40 sm:opacity-90">
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img
                src={bannerSlides[activeSlide].image}
                alt={bannerSlides[activeSlide].title}
                className="w-64 sm:w-84 h-64 sm:h-84 object-cover rounded-full shadow-2xl border-4 border-[#FF4E00]/30 animate-in zoom-in-95 duration-700"
              />
            </div>
          </div>

          {/* Carousel Pagination Dots (Matching Image 1 & 2) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 z-20">
            {bannerSlides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setActiveSlide(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  activeSlide === idx 
                    ? 'w-6 h-2 bg-[#FF4E00]' 
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
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
        <div className="flex items-center space-x-4 sm:space-x-6 overflow-x-auto pb-3 pt-1 scrollbar-none">
          
          {/* "ALL" Circular button (Matching Image 1 & 2 yellow active ring) */}
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex flex-col items-center space-y-2 shrink-0 group cursor-pointer"
          >
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all p-1 ${
              selectedCategory === null
                ? 'ring-3 ring-[#F5BB00] shadow-md shadow-[#F5BB00]/30 scale-105'
                : 'ring-1 ring-stone-200 dark:ring-stone-700 hover:ring-stone-400'
            }`}>
              <div className="w-full h-full rounded-full bg-[#F5BB00] flex items-center justify-center text-stone-950 font-black shadow-inner">
                <Utensils className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
              </div>
            </div>
            <span className={`text-xs font-bold tracking-tight whitespace-nowrap ${
              selectedCategory === null 
                ? 'text-[#FF4E00] dark:text-[#F5BB00]' 
                : 'text-stone-700 dark:text-stone-300 group-hover:text-stone-950 dark:group-hover:text-white'
            }`}>
              Todos
            </span>
          </button>

          {/* Categories with real food photos */}
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                className="flex flex-col items-center space-y-2 shrink-0 group cursor-pointer"
              >
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all p-1 ${
                  isSelected
                    ? 'ring-3 ring-[#FF4E00] shadow-md shadow-[#FF4E00]/30 scale-105'
                    : 'ring-1 ring-stone-200 dark:ring-stone-700 hover:ring-stone-400'
                }`}>
                  <div className="w-full h-full rounded-full overflow-hidden relative shadow-inner">
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition" />
                  </div>
                </div>
                <span className={`text-xs font-bold tracking-tight whitespace-nowrap ${
                  isSelected 
                    ? 'text-[#FF4E00]' 
                    : 'text-stone-700 dark:text-stone-300 group-hover:text-stone-950 dark:group-hover:text-white'
                }`}>
                  {cat.name}
                </span>
              </button>
            );
          })}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredProducts.slice(0, 3).map(prod => {
              const biz = businesses.find(b => b.id === prod.businessId);
              return (
                <div
                  key={prod.id}
                  className="bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200/90 dark:border-stone-800 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                      {(prod.priceCents / 100).toFixed(2)}€
                    </div>
                    {biz && (
                      <div className="absolute bottom-2.5 left-2.5 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs text-stone-800 dark:text-stone-200 text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-xs">
                        {biz.name}
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 line-clamp-1">
                        {prod.name}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-1">
                        {prod.description}
                      </p>
                    </div>

                    <button
                      onClick={() => openProductCustomizer(prod, prod.businessId)}
                      className="w-full mt-2 py-2.5 px-3 bg-[#FF4E00]/10 hover:bg-[#FF4E00] text-[#A32300] dark:text-[#FF4E00] hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <span>Personalizar y Añadir</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
                        <span>Abierto y recibiendo comandas</span>
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
