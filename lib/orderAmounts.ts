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

export function orderRevenue(order: {
  price?: number | string | null;
  amount_paid?: number | string | null;
  total_collected?: number | string | null;
  debt_paid_at_completion?: number | string | null;
  payment_type?: string | null;
}): number {
  const collected = totalCollectedFromOrder(order);
  if (collected > 0) return collected;
  return orderTotal(order);
}

export function parseAmount(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0;
  return Number(value) || 0;
}

export function orderRemainingDue(price: number, amountPaid: number): number {
  return Math.max(0, price - amountPaid);
}

/** Müştərinin cari borcu — `customer_debt` və ya köhnə `debt` sahəsi */
export function customerDebtAmount(order: {
  customer_debt?: number | string | null;
  debt?: number | string | null;
}): number {
  if (order.customer_debt != null && order.customer_debt !== '') {
    return parseAmount(order.customer_debt);
  }
  return parseAmount(order.debt);
}

export function maxCompletionPayment(price: number, customerDebt: number): number {
  return Math.round((price + customerDebt) * 100) / 100;
}

/** Kuryerdən alınan ümumi məbləğdən sifarişə gedən hissə */
export function orderPaymentFromCollection(totalCollected: number, price: number): number {
  return Math.min(totalCollected, price);
}

/** Kuryerdən alınan ümumi məbləğdən köhnə borca gedən hissə */
export function debtPaidFromCollection(
  totalCollected: number,
  price: number,
  customerDebt: number
): number {
  const excess = Math.max(0, totalCollected - price);
  return Math.min(excess, customerDebt);
}

/** Sifarişdə ödənilməyən qalıq (ümumi məbləğdən) */
export function orderShortfallFromCollection(totalCollected: number, price: number): number {
  return Math.max(0, price - totalCollected);
}

/** Tamamlanmış sifarişdə kuryerin aldığı ümumi məbləğ */
export function totalCollectedFromOrder(order: {
  total_collected?: number | string | null;
  amount_paid?: number | string | null;
  debt_paid_at_completion?: number | string | null;
  payment_type?: string | null;
}): number {
  if (order.total_collected != null && order.total_collected !== '') {
    return parseAmount(order.total_collected);
  }
  const debtPaid = parseAmount(order.debt_paid_at_completion);
  if (debtPaid > 0) {
    return parseAmount(order.amount_paid) + debtPaid;
  }
  if (order.payment_type === 'credit') return 0;
  return parseAmount(order.amount_paid);
}

/** 1 bidon qiyməti × verilən dolu bidon sayı */
export function priceFromUnitAndBidons(unitPrice: number, bidonCount: number): number {
  if (bidonCount <= 0 || unitPrice <= 0) return 0;
  return Math.round(unitPrice * bidonCount * 100) / 100;
}
