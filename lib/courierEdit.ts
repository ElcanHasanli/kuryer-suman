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

export function orderLoadErrorMessage(err: unknown, fallback = 'Sifariş yüklənmədi'): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'ORDER_NOT_FOUND':
        return 'Sifariş tapılmadı';
      case 'ORDER_NOT_VISIBLE':
        return 'Sifariş artıq kuryer panelində görünmür (köhnə və ya müddət bitib)';
      case 'NOT_YOUR_ORDER':
        return 'Bu sifariş sizə təyin olunmayıb';
      case 'EDIT_WINDOW_EXPIRED':
        return '24 saatlıq düzəliş müddəti bitib';
      case 'ORDER_ALREADY_PAID':
        return 'Sifariş tam ödənilib — redaktə mümkün deyil';
    }
    if (err.status === 403) {
      return 'Bu sifarişə giriş icazəsi yoxdur';
    }
    if (err.status === 404) {
      return 'Sifariş tapılmadı və ya artıq kuryer panelində görünmür';
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function completionErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'EDIT_WINDOW_EXPIRED':
        return '24 saatlıq düzəliş müddəti bitib';
      case 'ORDER_ALREADY_PAID':
      case 'ORDER_LOCKED':
        return 'Sifariş tam ödənilib — redaktə mümkün deyil';
      case 'NOT_YOUR_ORDER':
        return 'Bu sifariş sizə təyin olunmayıb';
      case 'ORDER_NOT_VISIBLE':
        return 'Sifariş artıq redaktə üçün görünmür';
      case 'AMOUNT_EXCEEDS_ORDER':
        return 'Ödənilən məbləğ sifariş qiymətindən böyük ola bilməz';
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
