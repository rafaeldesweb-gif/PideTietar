import React, { useState } from 'react';
import { Edit3, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BusinessCategory } from '../types';
import { MediaView } from './MediaView';
import {
  MEDIA_ACCEPT,
  isMediaUrl,
  processMediaFile,
  processMediaUrl,
} from '../utils/mediaUpload';

interface CategoryManagerModalProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_CATEGORY_IMAGE =
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80';

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  open,
  onClose,
}) => {
  const {
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
    showNotification,
  } = useApp();
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    name: '',
    slug: '',
    iconName: 'Utensils',
    imageUrl: DEFAULT_CATEGORY_IMAGE,
  });
  // Texto pegado para URL de imagen de categoría.
  const [categoryImageUrlText, setCategoryImageUrlText] = useState('');

  const normaliseCategorySlug = (value: string): string =>
    value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'categoria';

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryForm({
      id: '',
      name: '',
      slug: '',
      iconName: 'Utensils',
      imageUrl: DEFAULT_CATEGORY_IMAGE,
    });
  };

  const close = () => {
    resetCategoryForm();
    onClose();
  };

  const handleCategorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanedName = categoryForm.name.trim();
    const nextSlug = categoryForm.slug.trim() || normaliseCategorySlug(cleanedName);

    if (!cleanedName) {
      showNotification('Escribe un nombre para la categoría.', 'error');
      return;
    }

    if (editingCategoryId) {
      const ok = await updateCategory(editingCategoryId, {
        name: cleanedName,
        slug: nextSlug,
        iconName: categoryForm.iconName,
        imageUrl: categoryForm.imageUrl,
      });
      if (!ok) return;
      showNotification('Categoría actualizada.', 'success');
    } else {
      const created = await createCategory({
        name: cleanedName,
        slug: nextSlug,
        iconName: categoryForm.iconName,
        imageUrl: categoryForm.imageUrl,
      });
      if (!created) return;
      showNotification('Categoría añadida.', 'success');
    }

    resetCategoryForm();
  };

  const startEditCategory = (category: BusinessCategory) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      id: category.id,
      name: category.name,
      slug: category.slug,
      iconName: category.iconName || 'Utensils',
      imageUrl: category.imageUrl || DEFAULT_CATEGORY_IMAGE,
    });
  };

  const removeCategory = async (category: BusinessCategory) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar la categoría "${category.name}"?`,
    );
    if (!confirmed) return;

    const ok = await deleteCategory(category.id);
    if (!ok) return;
    if (editingCategoryId === category.id) {
      resetCategoryForm();
    }
    showNotification('Categoría eliminada.', 'success');
  };

  const handleCategoryImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const media = await processMediaFile(file);
      setCategoryForm((previous) => ({ ...previous, imageUrl: media.dataUrl }));
    } catch {
      showNotification('No se pudo leer el archivo de la categoría.', 'error');
    }
  };

  const handleCategoryUrlPaste = async (
    urlText: string,
    setUrlText: (v: string) => void,
  ) => {
    const url = urlText.trim();
    if (!url) return;
    if (!isMediaUrl(url)) {
      showNotification('Introduce una dirección web válida (http/https) o un archivo de datos.', 'error');
      return;
    }
    try {
      const media = await processMediaUrl(url);
      setCategoryForm((previous) => ({ ...previous, imageUrl: media.dataUrl }));
      setUrlText('');
    } catch {
      showNotification('No se pudo procesar la dirección web.', 'error');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-[28px] w-full max-w-5xl p-5 shadow-2xl max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
              SUPERADMIN
            </div>
            <h3 className="text-2xl font-black text-stone-900 mt-1">
              Gestión de categorías
            </h3>
          </div>
          <button
            type="button"
            onClick={close}
            className="text-stone-500 hover:text-stone-900"
            aria-label="Cerrar gestión de categorías"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-5">
          <div className="bg-[#fffaf5] border border-[#eadcc7] rounded-2xl p-4 shadow-sm">
            <div className="mb-4">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                {editingCategoryId ? 'Editar categoría' : 'Añadir nueva categoría'}
              </div>
              <h4 className="mt-1 text-lg font-black text-stone-900">
                {editingCategoryId
                  ? 'Actualiza la categoría'
                  : 'Crea una nueva categoría'}
              </h4>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">
                  Nombre
                </label>
                <input
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                      slug:
                        previous.slug ||
                        normaliseCategorySlug(event.target.value),
                    }))
                  }
                  className="w-full rounded-xl bg-white border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                  placeholder="Ej. Pizzas, Burgers, Postres"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">
                  Slug
                </label>
                <input
                  value={categoryForm.slug}
                  onChange={(event) =>
                    setCategoryForm((previous) => ({
                      ...previous,
                      slug: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl bg-white border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                  placeholder="pizzas"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">
                  Icono
                </label>
                <select
                  value={categoryForm.iconName}
                  onChange={(event) =>
                    setCategoryForm((previous) => ({
                      ...previous,
                      iconName: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl bg-white border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
                >
                  {['Utensils', 'Flame', 'Coffee', 'Pizza', 'Sparkles', 'Soup', 'Sandwich', 'Wine'].map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-600 mb-1">
                  Imagen
                </label>
                <input
                  type="file"
                  accept={MEDIA_ACCEPT}
                  onChange={handleCategoryImageUpload}
                  className="w-full rounded-xl bg-white border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] file:mr-3 file:rounded-md file:border-0 file:bg-[#FF4E00] file:text-white file:px-2 file:py-1.5"
                />
                <input
                  type="text"
                  placeholder="Pega aquí una URL de imagen…"
                  value={categoryImageUrlText}
                  onChange={(e) => setCategoryImageUrlText(e.target.value)}
                  onBlur={() => handleCategoryUrlPaste(categoryImageUrlText, setCategoryImageUrlText)}
                  className="w-full rounded-xl bg-white border border-[#e6d7c5] px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF4E00] mt-1 text-xs"
                />
                <MediaView
                  src={categoryForm.imageUrl || undefined}
                  alt={categoryForm.name}
                  className="mt-2 w-14 h-14 rounded-xl border border-[#e9dac8]"
                  showLoading
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#FF4E00] hover:bg-[#E64600] text-white font-black px-4 py-2.5 transition"
                >
                  {editingCategoryId ? 'Guardar cambios' : 'Añadir categoría'}
                </button>
                {editingCategoryId && (
                  <button
                    type="button"
                    onClick={resetCategoryForm}
                    className="rounded-xl bg-stone-100 text-stone-700 px-4 py-2.5 font-semibold"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="@container min-w-0 bg-white border border-[#eadcc7] rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#f0e2d5] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                Categorías actuales
              </span>
              <span className="text-xs font-bold text-stone-700">
                {categories.length}
              </span>
            </div>

            <div className="divide-y divide-[#f3e8dd]">
              {categories.length === 0 ? (
                <div className="p-6 text-sm text-stone-600 text-center">
                  No hay categorías creadas todavía.
                </div>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="grid grid-cols-[3.5rem_minmax(0,1fr)] @min-[360px]:grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 p-3 hover:bg-[#fff7f2] transition"
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-xl">
                    <MediaView
                      src={category.imageUrl || DEFAULT_CATEGORY_IMAGE}
                      alt={category.name}
                      className="w-14 h-14 rounded-xl border border-[#e9dac8]"
                    />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-stone-900 text-sm leading-snug break-words">
                        {category.name}
                      </div>
                      <div className="mt-1 text-[11px] text-stone-500 uppercase tracking-wider break-all">
                        {category.slug}
                      </div>
                    </div>
                    <div className="col-start-2 @min-[360px]:col-start-3 @min-[360px]:row-start-1 flex items-center justify-self-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEditCategory(category)}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center p-0 rounded-lg bg-stone-800 text-stone-300 hover:text-white transition"
                        aria-label={`Editar ${category.name}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCategory(category)}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center p-0 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition"
                        aria-label={`Eliminar ${category.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
