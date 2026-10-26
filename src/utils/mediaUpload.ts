// Utilidad de subida de medios (fotos y vídeos) para las fichas del negocio.
//
// Requisitos:
//   - Fotos: jpeg, jpg, png y gif.
//   - Vídeos: solo mp4, máximo 2 segundos.
//   - El tamaño se ajusta automáticamente para que el medio se vea completo
//     dentro del espacio asignado (object-contain).
//
// Nota: el servidor limita el cuerpo JSON a ~2 MB, así que los archivos se
// convierten a data URL y se reescala/recodifica antes de enviarlos.

const MAX_WIDTH = 1280;
const JPEG_QUALITY = 0.82;
// Margen por debajo del límite del servidor (~1.048.576 caracteres).
const MAX_DATA_URL_LENGTH = 900_000;
// Duración máxima permitida para un vídeo (segundos).
const MAX_VIDEO_DURATION_SECONDS = 2;
// Vídeo recodificado: 720p, ~1.2 Mbps, sin audio, para que quepa en el JSON.
const VIDEO_MAX_WIDTH = 720;
const VIDEO_BITRATE_KBPS = 1200;

type MediaType = 'image' | 'video';

export interface ProcessedMedia {
  type: MediaType;
  dataUrl: string;
  originalName: string;
  mimeType: string;
}

const readAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.readAsDataURL(blob);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('La imagen seleccionada no se puede abrir.'));
    image.src = src;
  });

const loadVideo = (src: string): Promise<HTMLVideoElement> =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error('El vídeo seleccionado no se puede abrir.'));
    video.src = src;
  });

export const imageMimeType = (file: File): string => {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.gif')) return 'image/gif';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  return file.type || 'image/jpeg';
};

export const videoMimeType = (file: File): string => {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.mp4')) return 'video/mp4';
  if (lowerName.endsWith('.webm')) return 'video/webm';
  return file.type || 'video/mp4';
};

const isVideoExtension = (file: File): boolean =>
  ['.mp4', '.webm'].some((ext) => file.name.toLowerCase().endsWith(ext));

const isImageExtension = (file: File): boolean =>
  ['.jpg', '.jpeg', '.png', '.gif'].some((ext) => file.name.toLowerCase().endsWith(ext));

export const isAllowedFile = (file: File): boolean => {
  const name = file.name.toLowerCase();
  return (
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.gif') ||
    name.endsWith('.mp4')
  );
};

const scaleToDataUrl = async (
  src: string,
  width: number,
  height: number,
  mimeType: string,
): Promise<string> => {
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, MAX_WIDTH / width);
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no permite convertir el archivo.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(await loadImage(src), 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL(mimeType, JPEG_QUALITY);
};

// Recodifica un vídeo a WebM con los primeros 2 segundos (o menos) para que
// quepa en el límite de la petición JSON y se reproduzca en bucle.
const recodeVideoToWebM = async (
  file: File,
): Promise<string> => {
  const original = await readAsDataUrl(file);
  const video = await loadVideo(original);

  if (video.duration > MAX_VIDEO_DURATION_SECONDS) {
    // Recortamos a los primeros 2 segundos.
    video.currentTime = 0;
  }

  if (!('MediaRecorder' in window) || !window.MediaRecorder) {
    // Fallback: aceptamos el MP4 original si dura <= 2 s y es liviano.
    if (video.duration > MAX_VIDEO_DURATION_SECONDS) {
      throw new Error(
        'El vídeo supera los 2 segundos. Elige uno más corto o recórtalo.',
      );
    }
    if (original.length > MAX_DATA_URL_LENGTH) {
      throw new Error(
        'El vídeo pesa demasiado. Elige uno más corto o de menor resolución.',
      );
    }
    return original;
  }

  const maxDuration = Math.min(video.duration, MAX_VIDEO_DURATION_SECONDS);
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_MAX_WIDTH;
  canvas.height = Math.max(
    1,
    Math.round((VIDEO_MAX_WIDTH * video.videoHeight) / Math.max(1, video.videoWidth)),
  );
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no puede procesar el vídeo.');

  const stream = canvas.captureStream(30);
  // bits por segundo ≈ bitrate_kbps * 1000. MediaRecorder acepta bitsPerSecond.
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm; codecs=vp9',
    bitsPerSecond: VIDEO_BITRATE_KBPS * 1000,
  });

  const chunks: BlobPart[] = [];
  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size) chunks.push(event.data);
  };

  await new Promise<void>((resolve, reject) => {
    mediaRecorder.onstop = () => resolve();
    mediaRecorder.onerror = () => reject(new Error('No se pudo codificar el vídeo.'));

    mediaRecorder.start();
    let played = false;
    video.onseeked = () => {
      if (!played) {
        played = true;
        // Dibujamos frames mientras avanzamos el tiempo hasta maxDuration.
        const interval = setInterval(() => {
          if (video.currentTime >= maxDuration - 0.05) {
            clearInterval(interval);
            mediaRecorder.stop();
          } else {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            video.currentTime += 0.033; // ~30 fps
          }
        }, 33);
      }
    };
    video.currentTime = 0;
  });

  const blob = new Blob(chunks, { type: 'video/webm' });
  const dataUrl = await readAsDataUrl(blob);

  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error(
      'El vídeo sigue pesando demasiado aunque se recodifique. Prueba con otro.',
    );
  }

  return dataUrl;
};

export const processMediaFile = async (file: File): Promise<ProcessedMedia> => {
  if (!isAllowedFile(file)) {
    throw new Error(
      'Solo se aceptan fotos (jpeg, jpg, png, gif) y vídeos (mp4).',
    );
  }

  if (isVideoExtension(file)) {
    const dataUrl = await recodeVideoToWebM(file);
    return {
      type: 'video',
      dataUrl,
      originalName: file.name,
      mimeType: 'video/webm',
    };
  }

  const mimeType = imageMimeType(file);
  const original = await readAsDataUrl(file);

  // Si ya cabe en el límite se envía tal cual (conserva transparencia y animación GIF).
  if (original.length <= MAX_DATA_URL_LENGTH) {
    return {
      type: 'image',
      dataUrl: original,
      originalName: file.name,
      mimeType,
    };
  }

  // Las imágenes pesadas se reescala.
  const image = await loadImage(original);
  const scaled = await scaleToDataUrl(
    original,
    image.naturalWidth,
    image.naturalHeight,
    mimeType,
  );

  if (scaled.length > MAX_DATA_URL_LENGTH) {
    throw new Error(
      'La imagen sigue pesando demasiado aunque se reescale. Prueba con otra.',
    );
  }

  return {
    type: 'image',
    dataUrl: scaled,
    originalName: file.name,
    mimeType,
  };
};

// Extensiones aceptadas por el input de archivos.
export const MEDIA_ACCEPT =
  '.jpg,.jpeg,.png,.gif,.mp4,image/jpeg,image/jpg,image/png,image/gif,video/mp4';

export const isMediaUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('data:') || /^https?:\/\/\S+$/i.test(url);
};

export const isVideoUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  return (
    url.startsWith('data:video/') ||
    url.toLowerCase().endsWith('.mp4') ||
    url.toLowerCase().endsWith('.webm')
  );
};

export const isImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  return (
    url.startsWith('data:image/') ||
    url.toLowerCase().endsWith('.jpg') ||
    url.toLowerCase().endsWith('.jpeg') ||
    url.toLowerCase().endsWith('.png') ||
    url.toLowerCase().endsWith('.gif')
  );
};
