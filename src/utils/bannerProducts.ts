import type { Product } from '../types';

export const BANNER_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
export const INITIAL_BANNER_RATING = 4.5;

export const getBannerRating = (product: Product): number =>
  Number.isFinite(product.rating) && (product.rating ?? 0) > 0
    ? product.rating!
    : INITIAL_BANNER_RATING;

// Sorteo reproducible: todos los visitantes ven la misma selección semanal.
const weeklyDraw = (id: string, period: number): number => {
  let hash = 2166136261;
  for (const char of `${period}:${id}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  return hash >>> 0;
};

export const selectBannerProducts = (products: Product[], now = Date.now()): Product[] => {
  const period = Math.floor(now / BANNER_PERIOD_MS);
  const score = getBannerRating;
  return products
    .filter((product) => product.isAvailable && !product.isSoldOut)
    .slice()
    .sort((a, b) => score(b) - score(a)
      || weeklyDraw(a.id, period) - weeklyDraw(b.id, period)
      || a.id.localeCompare(b.id))
    .slice(0, 10);
};
