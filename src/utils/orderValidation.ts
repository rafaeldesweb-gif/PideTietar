export type OrderItemBusinessReference = {
  product?: { businessId?: string } | null;
  businessId?: string;
};

export function isSingleBusinessOrder(
  businessId: string,
  items: OrderItemBusinessReference[],
): boolean {
  if (!businessId || !Array.isArray(items) || items.length === 0) {
    return false;
  }

  const uniqueBusinessIds = new Set<string>();

  for (const item of items) {
    const itemBusinessId = item.product?.businessId ?? item.businessId;

    if (!itemBusinessId) {
      return false;
    }

    uniqueBusinessIds.add(itemBusinessId);
  }

  return uniqueBusinessIds.size === 1 && uniqueBusinessIds.has(businessId);
}
