import { parseAmount } from './orderAmounts';
import type { Order, OrderType } from './types';

export function isPickupOrder(order: Pick<Order, 'order_type'>): boolean {
  return order.order_type === 'pickup';
}

export function getOrderTypeLabel(orderType?: OrderType | string | null): string {
  switch (orderType) {
    case 'pickup':
      return 'Boş bidon götürmə';
    case 'delivery':
      return 'Su çatdırılması';
    default:
      return 'Su çatdırılması';
  }
}

export function formatScheduledDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('az-AZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return new Date(dateStr).toLocaleDateString('az-AZ');
}

export function getPaymentTypeLabel(paymentType?: string | null): string {
  switch ((paymentType || '').toLowerCase()) {
    case 'cash':
      return 'Nağd';
    case 'card':
      return 'Kart';
    case 'credit':
      return 'Nisyə';
    default:
      return '—';
  }
}

export function formatPaidForExcel(isPaid?: boolean): string {
  if (typeof isPaid !== 'boolean') return '—';
  return isPaid ? 'hə' : 'yox';
}

export function getOrderPaidLabel(order: Pick<Order, 'is_paid' | 'payment_type' | 'remaining_amount'>): string {
  if (order.is_paid) return 'Ödənilib';
  if (order.payment_type === 'credit') return 'Borc';
  if (parseAmount(order.remaining_amount) > 0) return 'Borc';
  return 'Borc';
}

export function getOrderStatusLabel(status?: string): string {
  switch ((status || '').toLowerCase()) {
    case 'pending':
      return 'Gözləyir';
    case 'assigned':
      return 'Təyin edilib';
    case 'in_progress':
      return 'Çatdırılır';
    case 'completed':
      return 'Tamamlandı';
    default:
      return status || '—';
  }
}

export function formatMoneyAz(amount: number): string {
  return `₼${amount.toFixed(2)}`;
}
