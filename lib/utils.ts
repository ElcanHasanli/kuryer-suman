import { parseAmount } from './orderAmounts';
import type { Order } from './types';

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
