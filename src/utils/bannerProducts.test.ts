import test from 'node:test';
import assert from 'node:assert/strict';
import { BANNER_PERIOD_MS, getBannerRating, selectBannerProducts } from './bannerProducts';
import type { Product } from '../types';

const product = (id: string, extra: Partial<Product> = {}): Product => ({
  id, businessId: `business-${id}`, localityId: `locality-${id}`,
  categoryId: 'categoria', name: id, description: '', priceCents: 100,
  taxPercentage: 10, imageUrl: '', isAvailable: true, ...extra,
});

test('banner global: ordena por puntuación y completa hasta diez', () => {
  const products = Array.from({ length: 20 }, (_, i) => product(String(i)));
  products.push(product('mejor', { rating: 5, ratingCount: 2 }));
  products.push(product('segundo', { rating: 4.8, ratingCount: 3 }));
  products.push(product('agotado', { rating: 5, ratingCount: 4, isSoldOut: true }));
  const selected = selectBannerProducts(products, 0);
  assert.equal(selected.length, 10);
  assert.deepEqual(selected.slice(0, 2).map((item) => item.id), ['mejor', 'segundo']);
  assert.ok(!selected.some((item) => item.id === 'agotado'));
  assert.equal(new Set(selected.map((item) => item.localityId)).size, 10);
});

test('el sorteo es estable durante siete días y cambia al renovar el periodo', () => {
  const products = Array.from({ length: 30 }, (_, i) => product(String(i), { rating: 5, ratingCount: 1 }));
  const ids = (now: number) => selectBannerProducts(products, now).map((item) => item.id);
  assert.deepEqual(ids(0), ids(BANNER_PERIOD_MS - 1));
  assert.deepEqual(ids(0), selectBannerProducts([...products].reverse(), 0).map((item) => item.id));
  assert.notDeepEqual(ids(0), ids(BANNER_PERIOD_MS));
});

test('publica los primeros productos sin necesitar ventas ni valoraciones', () => {
  assert.deepEqual(selectBannerProducts([], 0), []);
  assert.deepEqual(selectBannerProducts([product('primero')], 0).map((item) => item.id), ['primero']);
});

test('usa la puntuación inicial para mostrar y ordenar productos sin reseñas', () => {
  const initial = product('inicial', { rating: 0, ratingCount: 0 });
  const rated = product('valorado', { rating: 4, ratingCount: 2 });
  assert.equal(getBannerRating(initial), 4.5);
  assert.equal(getBannerRating(product('previo', { rating: 4.9 })), 4.9);
  assert.deepEqual(selectBannerProducts([rated, initial], 0).map((item) => item.id), ['inicial', 'valorado']);
});
