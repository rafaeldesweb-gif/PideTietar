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

/** Ordena por categoría y conserva el orden recibido dentro de cada grupo. */
export const sortProductsByCategory = (
  products: Product[],
  categories: BusinessCategory[],
): Product[] => {
  // Un Map evita recorrer todas las categorías por cada producto.
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  return products
    .map((product, index) => {
      const category = categoryById.get(product.categoryId);
      const categoryValues = [category?.name, category?.slug, category?.id, product.categoryId]
        .map(normalizeCategoryValue)
        .filter(Boolean);
      let rank: number = PRODUCT_CATEGORY_ORDER.length;
      for (const value of categoryValues) {
        const found = categoryOrderByName.get(value);
        if (found !== undefined) {
          rank = found;
          break;
        }
      }
      return { product, index, rank };
    })
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ product }) => product);
};
