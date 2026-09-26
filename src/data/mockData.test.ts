import test from 'node:test';
import assert from 'node:assert/strict';

import { getTopRatedProductsByBusiness, getTopRatedProductsForLocality } from './mockData.ts';

test('returns one best-rated product per business for a locality', () => {
  const products = [
    { id: 'p1', businessId: 'biz-1', categoryId: 'hamburguesas', rating: 4.9, salesCount: 120, isAvailable: true },
    { id: 'p2', businessId: 'biz-1', categoryId: 'patatas-raciones', rating: 4.4, salesCount: 90, isAvailable: true },
    { id: 'p3', businessId: 'biz-2', categoryId: 'pizzas', rating: 4.8, salesCount: 140, isAvailable: true },
    { id: 'p4', businessId: 'biz-3', categoryId: 'tapas-carnes', rating: 4.7, salesCount: 110, isAvailable: true },
    { id: 'p5', businessId: 'biz-4', categoryId: 'postres', rating: 5.0, salesCount: 200, isAvailable: true },
  ] as any;

  const bestByBusiness = getTopRatedProductsByBusiness(products, 'sotillo', 10);

  assert.equal(bestByBusiness.length, 4);
  assert.deepEqual(bestByBusiness.map((product) => product.businessId).sort(), ['biz-1', 'biz-2', 'biz-3', 'biz-4']);
  assert.equal(bestByBusiness[0].id, 'p5');
});

test('sorts locality products by rating and keeps the top 4 candidates for star dishes', () => {
  const products = [
    { id: 'a', businessId: 'biz-1', categoryId: 'hamburguesas', rating: 4.2, salesCount: 80, isAvailable: true },
    { id: 'b', businessId: 'biz-2', categoryId: 'pizzas', rating: 4.9, salesCount: 150, isAvailable: true },
    { id: 'c', businessId: 'biz-3', categoryId: 'tapas-carnes', rating: 4.6, salesCount: 115, isAvailable: true },
    { id: 'd', businessId: 'biz-4', categoryId: 'postres', rating: 4.7, salesCount: 125, isAvailable: true },
  ] as any;

  const topFour = getTopRatedProductsForLocality(products, 'sotillo', 4);

  assert.equal(topFour.length, 4);
  assert.deepEqual(topFour.map((product) => product.id), ['b', 'd', 'c', 'a']);
});
