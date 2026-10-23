// El servidor limita las imágenes del formulario a ~1 MB de texto (y la
// petición JSON a 2 MB), así que una foto de móvil directa (3-6 MB) siempre se
// rechazaba. Aquí se reescala antes de enviarla.
const MAX_WIDTH = 1280;
const JPEG_QUALITY = 0.82;
// Margen por debajo del límite del servidor (~1.048.576 caracteres).
const MAX_DATA_URL_LENGTH = 900_000;

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('La imagen seleccionada no se puede abrir.'));
    image.src = src;
  });

const scaleToDataUrl = async (src: string, width: number, height: number) => {
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, MAX_WIDTH / width);
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no permite convertir la imagen.');

  // Fondo blanco: JPEG no admite transparencia y se verían bandas negras.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(await loadImage(src), 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
};

export const fileToDataUrl = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen.');
  }

  const original = await readAsDataUrl(file);

  // Si ya cabe en el límite se envía tal cual (así se conserva la
  // transparencia de PNG y GIF).
  if (original.length <= MAX_DATA_URL_LENGTH) return original;

  const image = await loadImage(original);
  const scaled = await scaleToDataUrl(original, image.naturalWidth, image.naturalHeight);

  if (scaled.length > MAX_DATA_URL_LENGTH) {
    throw new Error('La imagen sigue pesando demasiado aunque se reescale. Prueba con otra.');
  }

  return scaled;
};
