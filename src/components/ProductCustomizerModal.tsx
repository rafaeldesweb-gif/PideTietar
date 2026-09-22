import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Plus, Minus, Check, AlertCircle, ShoppingBag, 
  Trash2, RefreshCw 
} from 'lucide-react';
import { Product, CartItemOptionSelected } from '../types';

interface ProductModalProps {
  product: Product | null;
  businessId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductCustomizerModal: React.FC<ProductModalProps> = ({
  product,
  businessId,
  isOpen,
  onClose
}) => {
  const { addToCart, cart, clearCart, showNotification } = useApp();

  if (!isOpen || !product || !businessId) return null;

  const [quantity, setQuantity] = useState(1);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<CartItemOptionSelected[]>(() => {
    // Select default required options if any
    const defaults: CartItemOptionSelected[] = [];
    if (product.optionGroups) {
      product.optionGroups.forEach(grp => {
        if (grp.required && grp.options.length > 0) {
          defaults.push({
            groupName: grp.name,
            optionName: grp.options[0].name,
            priceCents: grp.options[0].priceCents
          });
        }
      });
    }
    return defaults;
  });
  const [customerNote, setCustomerNote] = useState('');
  const [conflictPromptOpen, setConflictPromptOpen] = useState(false);

  // Toggle removable ingredient
  const toggleRemovable = (ing: string) => {
    setRemovedIngredients(prev => 
      prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]
    );
  };

  // Toggle single option for a group
  const selectOption = (groupName: string, optionName: string, priceCents: number, isMulti: boolean) => {
    setSelectedOptions(prev => {
      if (!isMulti) {
        // Replace group selection
        const withoutGroup = prev.filter(o => o.groupName !== groupName);
        return [...withoutGroup, { groupName, optionName, priceCents }];
      } else {
        // Toggle multi
        const exists = prev.some(o => o.groupName === groupName && o.optionName === optionName);
        if (exists) {
          return prev.filter(o => !(o.groupName === groupName && o.optionName === optionName));
        } else {
          return [...prev, { groupName, optionName, priceCents }];
        }
      }
    });
  };

  // Calculate unit price with options
  const unitOptionsCents = selectedOptions.reduce((acc, o) => acc + o.priceCents, 0);
  const finalUnitPriceCents = product.priceCents + unitOptionsCents;
  const totalPriceCents = finalUnitPriceCents * quantity;

  const handleAdd = (forceClear = false) => {
    if (forceClear) {
      clearCart();
    }

    const res = addToCart({
      product,
      quantity,
      removedIngredients,
      selectedOptions,
      customerNote: customerNote.trim() || undefined,
      itemPriceCents: finalUnitPriceCents
    }, businessId);

    if (res.conflict) {
      setConflictPromptOpen(true);
      return;
    }

    if (res.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Image */}
        <div className="relative h-48 sm:h-56 w-full shrink-0">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Customizer Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Conflict prompt if cart belongs to another business */}
          {conflictPromptOpen && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <AlertCircle className="w-4 h-4" />
                <span>¿Deseas vaciar tu cesta actual?</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Tu cesta contiene productos de otro comercio. En PideTiétar, cada pedido pertenece a un único local para garantizar el reparto directo.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setConflictPromptOpen(false); handleAdd(true); }}
                  className="px-3 py-1.5 bg-[#FF4E00] text-white rounded-lg text-xs font-bold"
                >
                  Vaciar cesta y añadir este plato
                </button>
                <button
                  onClick={() => setConflictPromptOpen(false)}
                  className="px-3 py-1.5 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">
              {product.name}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {product.description}
            </p>
            <div className="mt-2 text-base font-mono font-bold text-[#A32300] dark:text-[#FF4E00]">
              {(finalUnitPriceCents / 100).toFixed(2)}€
            </div>
          </div>

          {/* Removable Ingredients */}
          {product.removableIngredients && product.removableIngredients.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                ¿Deseas quitar algún ingrediente?
              </label>
              <div className="flex flex-wrap gap-2">
                {product.removableIngredients.map(ing => {
                  const isRemoved = removedIngredients.includes(ing);
                  return (
                    <button
                      key={ing}
                      onClick={() => toggleRemovable(ing)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center space-x-1.5 cursor-pointer ${
                        isRemoved 
                          ? 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                          : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {isRemoved && <X className="w-3.5 h-3.5 text-red-500" />}
                      <span>{isRemoved ? `Sin ${ing}` : `Quitar ${ing}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Option Groups (Variants, sauces, extras) */}
          {product.optionGroups && product.optionGroups.map(grp => {
            const isMulti = grp.maxChoices > 1;
            return (
              <div key={grp.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    {grp.name}
                  </label>
                  <span className="text-[11px] text-stone-400">
                    {grp.required ? 'Obligatorio' : 'Opcional'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {grp.options.map(opt => {
                    const isSelected = selectedOptions.some(
                      o => o.groupName === grp.name && o.optionName === opt.name
                    );

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => selectOption(grp.name, opt.name, opt.priceCents, isMulti)}
                        className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'border-[#FF4E00] bg-orange-50/50 dark:bg-orange-950/20 text-[#A32300] dark:text-[#FF4E00]'
                            : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-[#FF4E00] bg-[#FF4E00] text-white' : 'border-stone-400'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </div>
                          <span>{opt.name}</span>
                        </div>

                        {opt.priceCents > 0 && (
                          <span className="font-mono text-stone-500 font-semibold">
                            +{(opt.priceCents / 100).toFixed(2)}€
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Customer Note */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
              Instrucciones para la cocina (máx. 250 car.)
            </label>
            <textarea
              value={customerNote}
              maxLength={250}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Ejemplo: Por favor bien tostado o la salsa en envase aparte..."
              className="w-full text-xs p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF4E00]"
              rows={2}
            />
          </div>

        </div>

        {/* Modal Footer with Quantity and Add Button */}
        <div className="p-4 sm:p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 bg-white dark:bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-stone-900 dark:text-stone-100 text-sm min-w-5 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => handleAdd(false)}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-[#FF4E00] to-[#A32300] hover:from-[#e04500] hover:to-[#8c1e00] text-white font-bold rounded-xl text-sm transition shadow-md flex items-center justify-between cursor-pointer"
          >
            <span>Añadir a la cesta</span>
            <span className="font-mono text-base">{(totalPriceCents / 100).toFixed(2)}€</span>
          </button>
        </div>

      </div>
    </div>
  );
};
