import { BusinessCategory, Product } from '../types';

/**
 * Orden solicitado para mostrar los productos en la carta y en el dashboard.
 * Se normalizan tildes, separadores y ampersands para aceptar los nombres y
 * slugs equivalentes que ya existan en el catálogo.
 */
const PRODUCT_CATEGORY_ORDER = [
  ['entrantes'],
  ['platos fuertes'],
  ['comida rapida'],
  ['extras'],
  ['postres'],
  ['bebidas y zumos', 'bebidas'],
  ['cocteles'],
  ['cafeces', 'cafes', 'cafe'],
  ['bolleria'],
] as const;

const categoryOrderByName = new Map<string, number>(
  PRODUCT_CATEGORY_ORDER.flatMap((aliases, index) =>
    aliases.map((alias) => [alias, index] as const),
  ),
);

const normalizeCategoryValue = (value: string | undefined): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getCategoryRank = (product: Product, categories: BusinessCategory[]): number => {
  const category = categories.find((item) => item.id === product.categoryId);
  const categoryValues = [category?.name, category?.slug, category?.id, product.categoryId]
    .map(normalizeCategoryValue)
    .filter(Boolean);

  for (const value of categoryValues) {
    const rank = categoryOrderByName.get(value);
    if (rank !== undefined) return rank;
  }

  return PRODUCT_CATEGORY_ORDER.length;
};

/** Ordena por categoría y conserva el orden recibido dentro de cada grupo. */
export const sortProductsByCategory = (
  products: Product[],
  categories: BusinessCategory[],
): Product[] =>
  products
    .map((product, index) => ({
      product,
      index,
      rank: getCategoryRank(product, categories),
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ product }) => product);
