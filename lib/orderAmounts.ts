/** Sifarişdə `price` — ümumi məbləğ (₼), ədəd başına qiymət deyil. */
export function orderTotal(order: {
  price?: number | string | null;
}): number {
  return Number(order.price ?? 0) || 0;
}

export function orderUnitPrice(order: {
  price?: number | string | null;
  bidons_count?: number | null;
}): number {
  const count = Number(order.bidons_count) || 0;
  const total = orderTotal(order);
  if (count <= 0) return total;
  return total / count;
}

/** Tarixçə/gəlir: tamamlanmışda ödənilən, yoxdursa sifariş cəmi. */
export function orderRevenue(order: {
  price?: number | string | null;
  amount_paid?: number | string | null;
}): number {
  if (order.amount_paid != null && order.amount_paid !== '') {
    return Number(order.amount_paid) || 0;
  }
  return orderTotal(order);
}

export function parseAmount(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0;
  return Number(value) || 0;
}

export function orderRemainingDue(price: number, amountPaid: number): number {
  return Math.max(0, price - amountPaid);
}
