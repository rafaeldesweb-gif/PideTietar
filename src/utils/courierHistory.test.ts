import test from 'node:test';
import assert from 'node:assert/strict';
import { getCourierSessionHistory, getSessionStartedAt } from './courierHistory';
import type { Order } from '../types';

const startedAt = '2026-11-07T10:00:00.000Z';
const order = (id: string, courierId: string, deliveredAt: string): Order => ({
  id, courierId, status: 'DELIVERED', deliveryType: 'DELIVERY',
  createdAt: '2026-11-06T12:00:00.000Z', updatedAt: '2026-11-07T12:00:00.000Z',
  statusHistory: [{ status: 'DELIVERED', timestamp: deliveredAt, changedByRole: 'PLATFORM_COURIER' }],
} as Order);

test('el historial muestra solo entregas propias completadas desde el inicio de sesión', () => {
  const orders = [order('anterior', 'yo', '2026-11-07T09:00:00Z'), order('actual', 'yo', '2026-11-07T11:00:00Z'), order('otro', 'otro', '2026-11-07T11:00:00Z')];
  assert.deepEqual(getCourierSessionHistory(orders, 'yo', startedAt).map((item) => item.id), ['actual']);
  // La valoración de un pedido antiguo cambia updatedAt, pero no lo incorpora.
  assert.deepEqual(getCourierSessionHistory(orders, 'yo', '2026-11-07T11:30:00Z'), []);
  assert.equal(orders.length, 3);
});

test('la restauración usa el mismo inicio del token; un nuevo login reinicia el historial', () => {
  const token = `${Buffer.from(JSON.stringify({ iat: Date.parse(startedAt) })).toString('base64url')}.firma`;
  assert.equal(getSessionStartedAt(token), startedAt);
  assert.equal(getSessionStartedAt('inválido'), undefined);
  assert.deepEqual(getCourierSessionHistory([order('actual', 'yo', '2026-11-07T11:00:00Z')], 'yo', '2026-11-07T12:00:00Z'), []);
  assert.deepEqual(getCourierSessionHistory([], 'yo'), []);
});
