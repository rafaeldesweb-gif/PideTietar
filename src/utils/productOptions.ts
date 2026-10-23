import { CartItemOptionSelected, OptionGroup, Product, ProductExtraIngredient } from '../types';

export const EXTRAS_GROUP_NAME = 'Añade extras';
export const MEAT_DONENESS_GROUP_NAME = 'Punto de la carne';
export const DEFAULT_MEAT_DONENESS = 'Al punto';

const MEAT_DONENESS_OPTIONS = [
  { id: 'meat-punto-menos', name: 'Punto menos', priceCents: 0 },
  { id: 'meat-al-punto', name: 'Al punto', priceCents: 0 },
  { id: 'meat-punto-mas', name: 'Punto más', priceCents: 0 },
  { id: 'meat-muy-hecha', name: 'Muy hecha', priceCents: 0 },
];

const normalizeGroupName = (name: string) => name.trim().toLowerCase();

const hasGroupNamed = (groups: OptionGroup[], name: string) =>
  groups.some((group) => normalizeGroupName(group.name) === normalizeGroupName(name));

export const isBurgerProduct = (product: Product): boolean => {
  const searchable = `${product.name} ${product.categoryId}`.toLowerCase();
  return /hamburgues|burger/.test(searchable);
};

const normalizeExtras = (product: Product) => {
  const rawValue = product.additionalIngredients as unknown;
  const rawExtras = Array.isArray(rawValue)
    ? (rawValue as Array<ProductExtraIngredient | string>)
    : [];
  const seen = new Set<string>();

  return rawExtras
    .map((extra, index) => {
      const name = typeof extra === 'string' ? extra : extra?.name;
      const rawPrice = typeof extra === 'string' ? 0 : extra?.priceCents;
      const priceCents = Number(rawPrice);

      return {
        id: `extra-${index}`,
        name: String(name || '').trim(),
        priceCents: Number.isFinite(priceCents) && priceCents > 0 ? Math.round(priceCents) : 0,
      };
    })
    .filter((extra) => {
      if (!extra.name || seen.has(extra.name)) return false;
      seen.add(extra.name);
      return true;
    });
};

/**
 * Devuelve los grupos que debe mostrar la ficha del producto:
 * - los grupos configurados por el negocio
 * - un grupo multiselección con los ingredientes adicionales y su precio
 * - el punto de la carne para hamburguesas
 */
export const buildEffectiveOptionGroups = (product: Product): OptionGroup[] => {
  const configuredGroups = Array.isArray(product.optionGroups) ? product.optionGroups : [];
  const groups = [...configuredGroups];
  const extras = normalizeExtras(product);

  if (extras.length > 0 && !hasGroupNamed(groups, EXTRAS_GROUP_NAME)) {
    groups.push({
      id: 'synthetic-additional-ingredients',
      name: EXTRAS_GROUP_NAME,
      required: false,
      minChoices: 0,
      maxChoices: extras.length,
      options: extras,
    });
  }

  if (isBurgerProduct(product) && !hasGroupNamed(groups, MEAT_DONENESS_GROUP_NAME)) {
    groups.push({
      id: 'synthetic-meat-doneness',
      name: MEAT_DONENESS_GROUP_NAME,
      required: true,
      minChoices: 1,
      maxChoices: 1,
      options: MEAT_DONENESS_OPTIONS.map((option) => ({ ...option })),
    });
  }

  return groups;
};

export const getDefaultSelectedOptions = (product: Product): CartItemOptionSelected[] => {
  const defaults: CartItemOptionSelected[] = [];

  buildEffectiveOptionGroups(product).forEach((group) => {
    if (!group.required || group.options.length === 0) return;

    const preferredOption =
      group.id === 'synthetic-meat-doneness'
        ? group.options.find((option) => option.name === DEFAULT_MEAT_DONENESS)
        : undefined;
    const selected = preferredOption || group.options[0];

    defaults.push({
      groupName: group.name,
      optionName: selected.name,
      priceCents: selected.priceCents,
    });
  });

  return defaults;
};
