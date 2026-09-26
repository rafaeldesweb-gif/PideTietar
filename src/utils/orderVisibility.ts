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

  return orders.filter((order) => {
    const isCustomerOrder = order.customerId === currentUser.id;
    const isAssignedCourierOrder = isCourier && order.courierId === currentUser.id;

    return isCustomerOrder || isAssignedCourierOrder;
  });
};
