import type { Order } from '../types';

// Solo se usa para el corte visual del historial; la autorización sigue en la API.
export function getSessionStartedAt(token: string): string | undefined {
  try {
    const payload = JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')));
    const timestamp = Number(payload.iat);
    return Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp).toISOString() : undefined;
  } catch {
    return undefined;
  }
}

export function getCourierSessionHistory(orders: Order[], courierId: string, sessionStartedAt?: string): Order[] {
  const startedAt = Date.parse(sessionStartedAt || '');
  if (!Number.isFinite(startedAt)) return [];

  return orders.filter((order) => {
    if (order.deliveryType !== 'DELIVERY' || order.status !== 'DELIVERED' || order.courierId !== courierId) return false;
    const delivery = [...(order.statusHistory || [])].reverse().find((entry) => entry.status === 'DELIVERED');
    const deliveredAt = Date.parse(delivery?.timestamp || order.updatedAt);
    return Number.isFinite(deliveredAt) && deliveredAt >= startedAt;
  });
}
