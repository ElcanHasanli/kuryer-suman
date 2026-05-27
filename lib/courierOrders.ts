import { isTodayInApp } from './dates';
import type { Order } from './types';

/** Assign / yenilənmə tarixi — köhnə gün sifarişlərini gizlətmək üçün. */
export function getOrderAssignmentDate(order: Order): string | undefined {
  return order.assigned_at ?? order.updated_at ?? order.created_at;
}

/** Kuryer aktiv siyahıda yalnız bu günün (Asia/Baku) tamamlanmamış sifarişlərini görür. */
export function isCourierActiveOrderVisible(order: Order): boolean {
  const dateStr = getOrderAssignmentDate(order);
  if (!dateStr) return true;
  return isTodayInApp(dateStr);
}

export function filterCourierActiveOrders(orders: Order[]): Order[] {
  return orders
    .filter((o) => o.status !== 'completed')
    .filter(isCourierActiveOrderVisible);
}
