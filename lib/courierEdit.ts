import type { Order } from './types';
import { ApiError } from './api';

export function isCourierEditable(order: Order): boolean {
  return order.courier_editable === true;
}

export function formatEditTimeRemaining(until?: string, now = Date.now()): string | null {
  if (!until) return null;
  const ms = new Date(until).getTime() - now;
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours} saat ${minutes} dəq`;
  return `${minutes} dəq`;
}

export function completionErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.code === 'EDIT_WINDOW_EXPIRED') return '24 saatlıq düzəliş müddəti bitib';
    if (err.code === 'ORDER_ALREADY_PAID' || err.code === 'ORDER_LOCKED') {
      return 'Sifariş tam ödənilib — redaktə mümkün deyil';
    }
    if (err.code === 'AMOUNT_EXCEEDS_ORDER') {
      return 'Ödənilən məbləğ sifariş qiymətindən böyük ola bilməz';
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
