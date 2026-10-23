import { Order, User } from '../types';

export const canViewOrdersPage = (currentUser: User | null): boolean => {
  if (!currentUser) return false;

  return ['CLIENT', 'PLATFORM_COURIER', 'BUSINESS_COURIER', 'SUPERADMIN', 'BUSINESS_ADMIN'].includes(currentUser.role);
};

export const filterOrdersForCurrentUser = (orders: Order[], currentUser: User | null): Order[] => {
  if (!currentUser) return [];

  if (currentUser.role === 'SUPERADMIN') {
    return orders;
  }

  if (currentUser.role === 'BUSINESS_ADMIN') {
    return orders.filter(order => order.businessId === currentUser.businessId);
  }

  const isCourier = currentUser.role === 'PLATFORM_COURIER' || currentUser.role === 'BUSINESS_COURIER';
  const normalizedEmail = (value?: string) => String(value || '').trim().toLowerCase();

  return orders.filter((order) => {
    // Los pedidos antiguos no tienen customer_id. Se comparan también por
    // email para que el cliente pueda seguir viéndolos tras la migración.
    const isCustomerOrder =
      order.customerId === currentUser.id ||
      (!!currentUser.email &&
        normalizedEmail(order.customerEmail) === normalizedEmail(currentUser.email));
    const isAssignedCourierOrder = isCourier && order.courierId === currentUser.id;

    return isCustomerOrder || isAssignedCourierOrder;
  });
};
