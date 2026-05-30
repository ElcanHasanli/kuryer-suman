import * as XLSX from 'xlsx';
import { formatAppDate, formatAppDateTime, parseAppDate } from './dates';
import type { DateRange } from './dates';
import { orderRevenue } from './orderAmounts';
import type { Expense, Order } from './types';
import { parseOrderNotes } from './types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function customerName(order: Order): string {
  const name = order.name || order.customer_name || '—';
  const surname = order.surname ? ` ${order.surname}` : '';
  return `${name}${surname}`.trim();
}

function paymentLabel(type?: string | null): string {
  const map: Record<string, string> = {
    cash: 'Nağd',
    card: 'Kart',
    credit: 'Nisyə',
  };
  return type ? map[type] || type : '—';
}

function orderNotesText(order: Order): string {
  if (!order.notes) return '';
  if (typeof order.notes === 'string') return order.notes.trim();
  return parseOrderNotes(order.notes)
    .map((n) => n.body.trim())
    .filter(Boolean)
    .join('; ');
}

export function buildExportFilename(
  courierName: string,
  range: DateRange,
  exportedAt = new Date()
): string {
  const exportDate = exportedAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Baku' });
  const safeName =
    courierName
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, ' ')
      .slice(0, 40) || 'kuryer';
  const rangePart = `${range.startDate} - ${range.endDate}`;
  return `${safeName} - ${rangePart} - ${exportDate}.xlsx`;
}

export function buildHistoryExportBlob(options: {
  courierName: string;
  dateRange: DateRange;
  orders: Order[];
  expenses: Expense[];
  exportedAt?: Date;
}): Blob {
  const { courierName, dateRange, orders, expenses, exportedAt = new Date() } = options;
  const rows: (string | number)[][] = [];

  rows.push(['Kuryer', courierName]);
  rows.push([
    'Tarix aralığı',
    dateRange.startDate === dateRange.endDate
      ? dateRange.startDate
      : `${dateRange.startDate} — ${dateRange.endDate}`,
  ]);
  rows.push(['Yüklənmə tarixi', formatAppDate(exportedAt.toISOString())]);
  rows.push([]);

  rows.push(['— Yerinə yetirilmiş sifarişlər —']);
  rows.push([
    'Tarix',
    'Müştəri',
    'Alınan (₼)',
    'Ödəniş',
    'Qeyd',
    'Verilən dolu bidon',
    'Götürülən boş bidon',
  ]);

  const sortedOrders = [...orders].sort((a, b) => {
    const ta = a.completed_at ? parseAppDate(a.completed_at).getTime() : 0;
    const tb = b.completed_at ? parseAppDate(b.completed_at).getTime() : 0;
    return tb - ta;
  });

  for (const order of sortedOrders) {
    rows.push([
      order.completed_at ? formatAppDate(order.completed_at) : '—',
      customerName(order),
      round2(orderRevenue(order)),
      paymentLabel(order.payment_type),
      orderNotesText(order) || '—',
      order.full_bidons_given ?? order.bidons_count ?? 0,
      order.empty_bidons_returned ?? 0,
    ]);
  }

  if (sortedOrders.length === 0) {
    rows.push(['—', 'Sifariş yoxdur', 0, '—', '—', 0, 0]);
  }

  rows.push([]);
  rows.push(['— Xərclər —']);
  rows.push(['Tarix', 'Təsvir', 'Məbləğ (₼)']);

  const sortedExpenses = [...expenses].sort((a, b) => {
    const ta = a.created_at ? parseAppDate(a.created_at).getTime() : 0;
    const tb = b.created_at ? parseAppDate(b.created_at).getTime() : 0;
    return tb - ta;
  });

  for (const expense of sortedExpenses) {
    rows.push([
      expense.created_at
        ? formatAppDateTime(expense.created_at, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—',
      expense.description,
      round2(Number(expense.amount) || 0),
    ]);
  }

  if (sortedExpenses.length === 0) {
    rows.push(['—', 'Xərc qeydi yoxdur', 0]);
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [
    { wch: 16 },
    { wch: 24 },
    { wch: 12 },
    { wch: 10 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Tarixçə');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
