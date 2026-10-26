import React, { useState, useEffect } from 'react';
import { MediaView } from './MediaView';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

// Componente que carga una imagen o vídeo solo cuando entra al viewport.
// Mientras no es visible, muestra un placeholder (skeleton o logo por defecto).
// Ideal para galerías de comercios, productos y categorías.
export const LazyMediaView: React.FC<{
  src: string | undefined | null;
  defaultSrc?: string;
  alt?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  fit?: 'contain' | 'cover';
  /** Si es true, solo carga cuando entra al viewport. */
  lazy?: boolean;
  /** Mensaje del skeleton mientras carga. */
  skeletonLabel?: string;
}> = ({
  src,
  defaultSrc,
  alt,
  className,
  width,
  height,
  style,
  fit = 'contain',
  lazy = true,
  skeletonLabel = 'Cargando imagen…',
}) => {
  const [ref, isIntersecting] = useIntersectionObserver();
  const [shouldRender, setShouldRender] = useState(!lazy);

  useEffect(() => {
    if (isIntersecting) {
      setShouldRender(true);
    }
  }, [isIntersecting]);

  // Contenedor con altura fija para evitar layout shift
  const heightStyle = height ? { height, minHeight: height } : undefined;

  if (!shouldRender) {
    return (
      <div
        ref={ref}
        className={`w-full h-full overflow-hidden bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center ${className || ''}`}
        style={heightStyle ? { ...style, ...heightStyle } : style}
      >
        <span className="text-[10px] text-stone-400 dark:text-stone-500 animate-pulse">
          {skeletonLabel}
        </span>
      </div>
    );
  }

  return (
    <div ref={ref} className={`w-full h-full overflow-hidden ${className || ''}`} style={heightStyle ? { ...style, ...heightStyle } : style}>
      <MediaView
        src={src}
        defaultSrc={defaultSrc}
        alt={alt}
        fit={fit}
        width={width}
        height={height}
        showLoading
      />
    </div>
  );
};

export default LazyMediaView;
