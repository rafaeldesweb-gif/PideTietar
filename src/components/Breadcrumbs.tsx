import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Migas de pan para navegación. No altera la lógica de rutas ni de negocio;
 * solo muestra el camino actual: Inicio > Categoría > Negocio > Producto.
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav className="mb-3 flex items-center gap-1 text-[11px] text-stone-500" aria-label="Ruta de navegación">
      <ol className="flex items-center gap-1" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="w-3 h-3" aria-hidden="true" />
              )}
              {isLast ? (
                <span className="text-stone-900 font-semibold">{item.label}</span>
              ) : (
                <a
                  href={item.href || '#'}
                  className="hover:text-[#FF4E00] underline underline-offset-2 transition-colors"
                  onClick={(e) => {
                    // Navegación por hash sin recargar (SPA)
                    if (item.href && item.href.startsWith('#')) {
                      e.preventDefault();
                      window.location.hash = item.href;
                    }
                  }}
                >
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export const homeBreadcrumb: BreadcrumbItem = { label: 'Inicio', href: '#' };
export const categoriesBreadcrumb: BreadcrumbItem = { label: 'Categorías', href: '#categorias' };
