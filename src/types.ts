// Types for PideTiétar Delivery Platform

export type UserRole = 
  | 'CLIENT' 
  | 'BUSINESS_ADMIN' 
  | 'PLATFORM_COURIER' 
  | 'BUSINESS_COURIER' 
  | 'SUPERADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: UserRole;
  businessId?: string; // If bound to a business
  isEmailVerified: boolean;
  addresses: Address[];
  createdAt: string;
  avatarUrl?: string;
  subscriptionPlan?: 'FREE' | 'PRO_MONTHLY' | 'PREMIUM_PARTNER';
  subscriptionStatus?: 'active' | 'inactive' | 'past_due';
  courierProfile?: {
    businessIds: string[];
    localityIds: string[];
    isOnline: boolean;
    confirmation: 'PENDING' | 'BUSINESS_EMAIL' | 'SUPERADMIN';
  };
}

export interface Address {
  id: string;
  label: string; // e.g. 'Casa', 'Trabajo'
  street: string;
  locality: string;
  postalCode: string;
  coordinates: { lat: number; lng: number };
  reference?: string;
  isDefault?: boolean;
}

export interface Locality {
  id: string;
  name: string;
  postalCode: string;
  coordinates: { lat: number; lng: number };
  active: boolean;
  coverImage?: string;
}

export interface BusinessCategory {
  id: string;
  name: string;
  slug: string;
  iconName: string;
  imageUrl?: string;
}

export interface BusinessHours {
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  openTime: string; // "13:00"
  closeTime: string; // "23:30"
  isOpen: boolean;
}

export interface Business {
  id: string;
  name: string;
  legalName: string;
  cif: string;
  category: string;
  localityId: string;
  address: string;
  phone: string;
  email: string;
  coordinates: { lat: number; lng: number };
  rating: number;
  reviewCount: number;
  estimatedTimeMin: number;
  estimatedTimeMax: number;
  deliveryFeeCents: number;
  minOrderCents: number;
  bannerUrl: string;
  logoUrl: string;
  isShiftOpen: boolean; // Active operational shift
  deliveryModes: ('OWN_COURIER' | 'PLATFORM_COURIER' | 'PICKUP')[];
  deliveryRadiusKm: number;
  status: 'APPROVED' | 'PENDING' | 'SUSPENDED';
  schedule: BusinessHours[];
  featuredProducts?: Product[];
  managerName?: string;
  managerDni?: string;
}

export interface Allergen {
  id: string;
  name: string;
  icon: string;
}

export interface Option {
  id: string;
  name: string;
  priceCents: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  required: boolean;
  minChoices: number;
  maxChoices: number;
  options: Option[];
}

export interface ProductExtraIngredient {
  name: string;
  priceCents: number;
}

export interface Product {
  id: string;
  businessId: string;
  localityId?: string;
  categoryId: string;
  name: string;
  description: string;
  tag?: string;
  ingredients?: string[];
  priceCents: number; // Stored in cents (e.g., 850 = 8.50€)
  taxPercentage: number;
  imageUrl: string;
  isAvailable: boolean;
  isSoldOut?: boolean;
  removableIngredients?: string[];
  additionalIngredients?: ProductExtraIngredient[];
  optionGroups?: OptionGroup[];
  allergens?: string[];
  salesCount?: number;
  rating?: number;
  ratingCount?: number;
}

export interface CartItemOptionSelected {
  groupName: string;
  optionName: string;
  priceCents: number;
}

export interface CartItem {
  cartItemId: string; // Unique instance ID
  product: Product;
  quantity: number;
  removedIngredients: string[];
  selectedOptions: CartItemOptionSelected[];
  customerNote?: string;
  itemPriceCents: number;
}

export interface Cart {
  businessId: string;
  items: CartItem[];
  customerNote?: string;
}

export type OrderStatus = 
  | 'PENDING_PAYMENT' 
  | 'PAID' 
  | 'NEW' 
  | 'ACCEPTED' 
  | 'PREPARING' 
  | 'READY' 
  | 'ASSIGNED' 
  | 'PICKED_UP' 
  | 'DELIVERED' 
  | 'CANCELLED' 
  | 'REJECTED' 
  | 'REFUNDED';

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  changedByRole: string;
}

export interface OrderItemSnapshot {
  productId: string;
  productName: string;
  unitPriceCents: number;
  taxPercentage: number;
  quantity: number;
  removedIngredients: string[];
  selectedOptions: CartItemOptionSelected[];
  customerNote?: string;
  totalCents: number;
}

export interface Order {
  id: string;
  orderNumber: string; // User-facing readable ID e.g. #PT-7824
  businessId: string;
  businessName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryType: 'DELIVERY' | 'PICKUP';
  deliveryAddress?: Address;
  scheduledTime?: string; // or 'ASAP'
  items: OrderItemSnapshot[];
  
  // Ledger breakdown in cents
  subtotalCents: number;
  deliveryFeeCents: number;
  platformFeeCents: number; // 5% subtotal + 20% delivery
  businessPayoutCents: number;
  courierPayoutCents: number;
  tipCents: number;
  totalCents: number;

  status: OrderStatus;
  statusHistory: OrderStatusHistoryItem[];
  
  paymentMethod: 'STRIPE' | 'PAYPAL' | 'CASH_ON_DELIVERY';
  paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED';
  paymentTransactionId?: string;

  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  deliveryPin: string; // e.g. "4921" for secure proof of delivery

  calendarEventId?: string; // Synced to Google Calendar
  gmailNotifiedAt?: string;
  reviewRequested?: boolean;
  reviewScore?: number;
  reviewedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: string;
  businessId: string;
  openedAt: string;
  closedAt?: string;
  openedByUserId: string;
  closedByUserId?: string;
  totalOrders: number;
  totalSalesCents: number;
  totalPlatformCommissionCents: number;
  totalDeliveryCostCents: number;
  isActive: boolean;
}

export interface Courier {
  id: string;
  userId: string;
  name: string;
  phone: string;
  vehicleType: 'PATINETE' | 'BICICLETA' | 'MOTO' | 'COCHE';
  isAvailable: boolean;
  type: 'PLATFORM' | 'BUSINESS_BOUND';
  boundBusinessId?: string;
  currentLocalityId: string;
  todayDeliveriesCount: number;
  todayEarningsCents: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'FREE' | 'PRO_MONTHLY' | 'PREMIUM_PARTNER';
  priceEur: number;
  interval: 'month';
  description: string;
  features: string[];
  stripePriceId?: string;
  paypalPlanId?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  details: string;
  timestamp: string;
}
