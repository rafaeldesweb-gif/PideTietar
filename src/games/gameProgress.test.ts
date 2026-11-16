import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mergeCompletedLevels,
  normalizeCompletedLevels,
  parseCompletedLevels,
  withCompletedLevel,
} from './gameProgress';

test('normaliza la lista de niveles completados', () => {
  assert.deepEqual(normalizeCompletedLevels([3, 1, 2, 2], 10), [1, 2, 3]);
  // Fuera del catálogo, decimales, ceros y basura se descartan.
  assert.deepEqual(normalizeCompletedLevels([0, 1, 11, '4', 2.5, null, 'x'], 10), [1, 4]);
  assert.deepEqual(normalizeCompletedLevels(undefined, 10), []);
  assert.deepEqual(normalizeCompletedLevels('1,2', 10), []);
  assert.deepEqual(normalizeCompletedLevels([1, 2], 0), [1]);
});

test('lee el progreso guardado en la pestaña', () => {
  assert.deepEqual(parseCompletedLevels('1,3,3,20', 12), [1, 3]);
  assert.deepEqual(parseCompletedLevels('', 12), []);
  assert.deepEqual(parseCompletedLevels(null, 12), []);
});

test('fusiona el avance local con el del servidor sin perder niveles', () => {
  assert.deepEqual(mergeCompletedLevels([1, 2], [2, 3, 4], 10), [1, 2, 3, 4]);
  assert.deepEqual(mergeCompletedLevels([], [1, 2], 10), [1, 2]);
  // Un servidor caído o una respuesta rara no borra el avance local.
  assert.deepEqual(mergeCompletedLevels([1, 2], null, 10), [1, 2]);
  assert.deepEqual(mergeCompletedLevels([1], [1, 99], 10), [1]);
});

test('añade un nivel completado en orden y sin duplicados', () => {
  assert.deepEqual(withCompletedLevel([1, 2], 3, 10), [1, 2, 3]);
  assert.deepEqual(withCompletedLevel([1, 2], 2, 10), [1, 2]);
  assert.deepEqual(withCompletedLevel([], 4, 10), [4]);
});
