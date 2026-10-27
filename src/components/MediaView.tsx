import { useState } from 'react';
import { isVideoUrl } from '../utils/mediaUpload';
import brandLogo from '../assets/logo.png';

// El tamaño se aplica al contenedor para no cubrir otros controles durante la carga.
export const MediaView: React.FC<{
  src: string | undefined | null;
  defaultSrc?: string;
  alt?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  fit?: 'contain' | 'cover';
  showLoading?: boolean;
}> = ({ src, defaultSrc = brandLogo, alt, className, width, height, style, fit = 'contain', showLoading = false }) => {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [loadedSource, setLoadedSource] = useState('');
  const effectiveSrc = [src, defaultSrc, brandLogo].find((source) => source && !failedSources.includes(source));
  if (!effectiveSrc) return null;
  const mediaClass = `block h-full w-full object-center ${fit === 'cover' ? 'object-cover' : 'object-contain'}`;
  const onLoad = () => setLoadedSource(effectiveSrc);
  const onError = () => setFailedSources((previous) => [...previous, effectiveSrc]);
  return (
    <div className={`relative overflow-hidden bg-[#fffaf4] ${className || 'h-full w-full'}`} style={{ width, height, ...style }}>
      {isVideoUrl(effectiveSrc) ? (
        <video key={effectiveSrc} src={effectiveSrc} autoPlay muted loop playsInline preload="metadata" onLoadedData={onLoad} onError={onError} className={mediaClass} style={{ borderRadius: 'inherit' }} />
      ) : (
        <img key={effectiveSrc} src={effectiveSrc} alt={alt || 'Vista previa'} loading="lazy" onLoad={onLoad} onError={onError} className={mediaClass} style={{ borderRadius: 'inherit' }} />
      )}
      {showLoading && loadedSource !== effectiveSrc && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-100/80 dark:bg-stone-800/80">
          <span className="animate-pulse text-xs font-bold text-stone-500 dark:text-stone-400">Cargando…</span>
        </div>
      )}
    </div>
  );
};

export default MediaView;
