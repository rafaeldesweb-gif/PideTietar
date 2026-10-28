import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MediaView } from './MediaView';
import { MEDIA_ACCEPT, processMediaFile, processMediaUrl } from '../utils/mediaUpload';

interface AvatarEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Editor mínimo de avatar: desde el avatar de la cabecera sólo puede
 * cambiarse la foto de ese usuario. El resto de los datos de la cuenta del
 * propietario vive en el formulario "Datos del negocio"; el perfil completo
 * de otros roles sigue en el modal de acceso.
 */
export const AvatarEditorModal: React.FC<AvatarEditorModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateCurrentUserProfile, showNotification } = useApp();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [urlText, setUrlText] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAvatarUrl(currentUser?.avatarUrl || '');
      setUrlText('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const media = await processMediaFile(file);
      setAvatarUrl(media.dataUrl);
      setUrlText('');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo leer el archivo del avatar.', 'error');
    }
  };

  const handleUrlPaste = async () => {
    const text = urlText.trim();
    if (!text) return;
    try {
      const media = await processMediaUrl(text);
      setAvatarUrl(media.dataUrl);
      setUrlText('');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo procesar la dirección web.', 'error');
    }
  };

  const handleSave = async () => {
    if (!currentUser || saving) return;
    setSaving(true);
    try {
      const { password: _ignoredPassword, ...restUser } = currentUser;
      void _ignoredPassword;
      const saved = await updateCurrentUserProfile({
        ...restUser,
        avatarUrl: avatarUrl.trim() || currentUser.avatarUrl,
      });
      if (saved) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-stone-900">Mi avatar</h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
            <MediaView
              src={avatarUrl || DEFAULT_AVATAR}
              alt="Vista previa del avatar"
              className="block h-16 w-16 rounded-full border-2 border-[#e7d5c7] bg-stone-100"
              style={{ borderRadius: '9999px' }}
              fit="cover"
            />
            <div className="min-w-0 flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept={MEDIA_ACCEPT}
                onChange={handleFileChange}
                className="text-xs text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#FF4E00] file:px-2 file:py-1.5 file:text-white"
              />
              <input
                type="text"
                placeholder="Pega aquí una URL de avatar…"
                value={urlText}
                onChange={(event) => setUrlText(event.target.value)}
                onBlur={handleUrlPaste}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleUrlPaste();
                  }
                }}
                className="mt-1 w-full rounded-xl bg-[#fffaf4] border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] shadow-inner text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl bg-stone-100 text-stone-700 px-4 py-2 font-semibold">
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#FF4E00] text-white px-4 py-2 font-semibold hover:bg-[#E64600] disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};
