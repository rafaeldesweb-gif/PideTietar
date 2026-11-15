// Subida directa de un medio a Supabase Storage.
//
// El formulario guarda sólo la URL pública resultante: así el JSON de guardado
// no arrastra base64 (el servidor limita el cuerpo a 2 MB) y la imagen queda
// cacheada con una URL versionada.
import { apiFetch } from '../context/AppContext';

interface UploadMediaOptions {
  dataUrl: string;
  entityType: 'USER' | 'BUSINESS' | 'PRODUCT' | 'CATEGORY';
  entityId: string;
  fieldName: string;
  originalName?: string;
}

export const uploadMediaAsset = async ({
  dataUrl,
  entityType,
  entityId,
  fieldName,
  originalName,
}: UploadMediaOptions): Promise<string> => {
  if (!dataUrl.startsWith('data:')) return dataUrl;

  const data = await apiFetch('/media', {
    method: 'POST',
    body: JSON.stringify({
      entityType,
      entityId,
      fieldName,
      dataUrl,
      originalName,
    }),
  });

  const asset = (data as { asset?: { public_url?: string; publicUrl?: string } } | null)?.asset;
  const url = asset?.public_url || asset?.publicUrl;
  if (!url) throw new Error('El servidor no devolvió la dirección del archivo subido.');
  return url;
};
