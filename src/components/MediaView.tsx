import { useState } from 'react';
import { isVideoUrl } from '../utils/mediaUpload';

const DEFAULT_LOGO =
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=80';

// Muestra una imagen o un vídeo dentro del espacio asignado, siempre completa
// (object-contain) sin recortar los bordes. Soporta data URLs y http(s).
// - Si `src` está vacío, muestra `defaultSrc` (por defecto el logo de PideTietar).
// - Si la carga falla, muestra `defaultSrc` automáticamente.
// - Las imágenes se cargan de forma diferida (loading="lazy").
// - Los vídeos se reproducen automáticamente, en silencio y en bucle.
export const MediaView: React.FC<{
  src: string | undefined | null;
  defaultSrc?: string;
  alt?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  /** 'contain' (por defecto): se ve completo en el espacio. 'cover': llena el espacio recortando bordes (útil en círculos). */
  fit?: 'contain' | 'cover';
  /** Muestra un estado de carga mientras se descarga el medio. */
  showLoading?: boolean;
}> = ({
  src,
  defaultSrc = DEFAULT_LOGO,
  alt,
  className,
  width,
  height,
  style,
  fit = 'contain',
  showLoading = false,
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const effectiveSrc = src || defaultSrc;

  if (!effectiveSrc) return null;

  const baseClasses =
    'object-center bg-[#fffaf4] border border-[#eadcc7]';
  const containClasses = 'object-contain';
  const coverClasses = 'object-cover';

  if (isVideoUrl(effectiveSrc)) {
    return (
      <div
        className="relative w-full h-full overflow-hidden"
        style={style}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster=""
          width={width}
          height={height}
          onLoadedData={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          className={`${baseClasses} ${
            fit === 'cover' ? coverClasses : containClasses
          } ${className || ''}`}
        >
          <source src={effectiveSrc} type="video/webm" />
          Tu navegador no soporta la reproducción de vídeo.
        </video>
        {error && (
          <MediaView
            src={defaultSrc}
            alt={alt || 'Vista previa'}
            className={className}
            width={width}
            height={height}
            fit={fit}
            showLoading={showLoading}
          />
        )}
        {showLoading && loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-100/80 dark:bg-stone-800/80">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 animate-pulse">
              Cargando…
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={style}
    >
      <img
        src={effectiveSrc}
        alt={alt || 'Vista previa'}
        loading="lazy"
        width={width}
        height={height}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        className={`${baseClasses} ${
          fit === 'cover' ? coverClasses : containClasses
        } ${className || ''}`}
      />
      {error && (
        <MediaView
          src={defaultSrc}
          alt={alt || 'Vista previa'}
          className={className}
          width={width}
          height={height}
          fit={fit}
          showLoading={showLoading}
        />
      )}
      {showLoading && loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100/80 dark:bg-stone-800/80">
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400 animate-pulse">
            Cargando…
          </span>
        </div>
      )}
    </div>
  );
};

export default MediaView;
