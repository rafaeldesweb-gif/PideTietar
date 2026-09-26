import test from 'node:test';
import assert from 'node:assert/strict';
import { filterOrdersForCurrentUser } from './orderVisibility';
import { Order, User } from '../types';

const buildOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'ord-1',
  orderNumber: '#PT-1001',
  businessId: 'biz-1',
  businessName: 'La Bodeguita',
  customerId: 'client-1',
  customerName: 'Ana',
  customerPhone: '600000001',
  customerEmail: 'ana@test.com',
  deliveryType: 'DELIVERY',
  items: [],
  subtotalCents: 1000,
  deliveryFeeCents: 200,
  platformFeeCents: 100,
  businessPayoutCents: 900,
  courierPayoutCents: 150,
  tipCents: 0,
  totalCents: 1200,
  status: 'PAID',
  statusHistory: [],
  paymentMethod: 'STRIPE',
  paymentStatus: 'PAID',
  deliveryPin: '1234',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'client-1',
  name: 'Cliente',
  email: 'cliente@test.com',
  password: '1234',
  phone: '600000001',
  role: 'CLIENT',
  isEmailVerified: true,
  createdAt: new Date().toISOString(),
  avatarUrl: '',
  subscriptionPlan: 'FREE',
  subscriptionStatus: 'active',
  addresses: [],
  ...overrides,
});

test('returns client orders by customerId', () => {
  const orders = [
    buildOrder({ customerId: 'client-1', id: 'o-client' }),
    buildOrder({ customerId: 'client-2', id: 'o-other' }),
  ];

  const result = filterOrdersForCurrentUser(orders, buildUser({ id: 'client-1' }));

  assert.deepEqual(result.map((o) => o.id), ['o-client']);
});

test('returns all orders for SUPERADMIN', () => {
  const orders = [
    buildOrder({ id: 'o-1', customerId: 'a', businessId: 'biz-1' }),
    buildOrder({ id: 'o-2', customerId: 'b', businessId: 'biz-2' }),
  ];

  const result = filterOrdersForCurrentUser(
    orders,
    buildUser({ id: 'admin-1', role: 'SUPERADMIN' }),
  );

  assert.deepEqual(result.map((o) => o.id), ['o-1', 'o-2']);
});

test('returns courier orders by courierId and keeps the client view visible for courier sessions', () => {
  const orders = [
    buildOrder({ customerId: 'client-2', courierId: 'courier-9', id: 'o-assigned' }),
    buildOrder({ customerId: 'client-1', courierId: 'other-courier', id: 'o-client-own' }),
    buildOrder({ customerId: 'client-3', courierId: 'courier-7', id: 'o-other' }),
  ];

  const result = filterOrdersForCurrentUser(orders, buildUser({ id: 'courier-9', role: 'PLATFORM_COURIER' }));

  assert.deepEqual(result.map((o) => o.id), ['o-assigned']);
});
