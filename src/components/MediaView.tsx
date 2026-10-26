import { isVideoUrl } from '../utils/mediaUpload';

// Muestra una imagen o un vídeo dentro del espacio asignado, siempre completa
// (object-contain) sin recortar los bordes. Soporta data URLs y http(s).
// - Las imágenes se cargan de forma diferida (loading="lazy").
// - Los vídeos se reproducen automáticamente, en silencio y en bucle, silenciados
//   y sin audio, para que no molesten en las galerías.
export const MediaView: React.FC<{
  src: string | undefined | null;
  alt?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  /** 'contain' (por defecto): se ve completo en el espacio. 'cover': llena el espacio recortando bordes (útil en círculos). */
  fit?: 'contain' | 'cover';
}> = ({ src, alt, className, width, height, style, fit = 'contain' }) => {
  if (!src) return null;

  const baseClasses =
    'object-center bg-[#fffaf4] border border-[#eadcc7]';
  const containClasses = 'object-contain';
  const coverClasses = 'object-cover';

  if (isVideoUrl(src)) {
    return (
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster=""
        width={width}
        height={height}
        style={style}
        className={`${baseClasses} ${
          fit === 'cover' ? coverClasses : containClasses
        } ${className || ''}`}
      >
        <source src={src} type="video/webm" />
        Tu navegador no soporta la reproducción de vídeo.
      </video>
    );
  }

  return (
    <img
      src={src}
      alt={alt || 'Vista previa'}
      loading="lazy"
      width={width}
      height={height}
      style={style}
      className={`${baseClasses} ${
        fit === 'cover' ? coverClasses : containClasses
      } ${className || ''}`}
    />
  );
};

export default MediaView;
