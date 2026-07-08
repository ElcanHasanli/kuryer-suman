import * as XLSX from 'xlsx';
import { formatAppDate, formatAppDateTime, parseAppDate } from './dates';
import type { DateRange } from './dates';
import { orderRevenue, orderTotal, parseAmount } from './orderAmounts';
import type { Expense, Order } from './types';
import { expenseCategoryLabel, parseOrderNotes } from './types';
import {
  formatPaidForExcel,
  getOrderStatusLabel,
  getOrderTypeLabel,
  getPaymentTypeLabel,
  customerDisplayName,
  customerOrderAddress,
} from './utils';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function customerName(order: Order): string {
  return customerDisplayName(order);
}

function orderNotesText(order: Order): string {
  if (!order.notes) return '';
  if (typeof order.notes === 'string') return order.notes.trim();
  return parseOrderNotes(order.notes)
    .map((n) => n.body.trim())
    .filter(Boolean)
    .join('; ');
}

function formatExportDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  return formatAppDateTime(dateStr, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

  const sortedOrders = [...orders].sort((a, b) => {
    const ta = a.completed_at ? parseAppDate(a.completed_at).getTime() : 0;
    const tb = b.completed_at ? parseAppDate(b.completed_at).getTime() : 0;
    return tb - ta;
  });

  const sortedExpenses = [...expenses].sort((a, b) => {
    const ta = a.created_at ? parseAppDate(a.created_at).getTime() : 0;
    const tb = b.created_at ? parseAppDate(b.created_at).getTime() : 0;
    return tb - ta;
  });

  const totalRevenue = round2(sortedOrders.reduce((sum, o) => sum + orderRevenue(o), 0));
  const totalExpenses = round2(
    sortedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  );

  const workbook = XLSX.utils.book_new();

  const summaryRows: (string | number)[][] = [
    ['Kuryer', courierName],
    [
      'Tarix aralığı',
      dateRange.startDate === dateRange.endDate
        ? dateRange.startDate
        : `${dateRange.startDate} — ${dateRange.endDate}`,
    ],
    ['Yüklənmə tarixi', formatExportDateTime(exportedAt.toISOString())],
    [],
    ['Sifariş sayı', sortedOrders.length],
    ['Ümumi gəlir (₼)', totalRevenue],
    ['Ümumi xərc (₼)', totalExpenses],
    ['Xalis (₼)', round2(totalRevenue - totalExpenses)],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 22 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Xülasə');

  const orderRows: (string | number)[][] = [
    [
      'Tarix',
      'Müştəri',
      'Telefon',
      'Ünvan',
      'Növ',
      'Status',
      'Qiymət (₼)',
      'Ödənilən (₼)',
      'Ödəniş növü',
      'Ödənilib',
      'Qeyd',
      'Verilən dolu bidon',
      'Götürülən boş bidon',
    ],
  ];

  for (const order of sortedOrders) {
    orderRows.push([
      formatExportDateTime(order.completed_at),
      customerName(order),
      order.customer_phone || '—',
      customerOrderAddress(order),
      getOrderTypeLabel(order.order_type),
      getOrderStatusLabel(order.status),
      round2(orderTotal(order)),
      round2(orderRevenue(order)),
      getPaymentTypeLabel(order.payment_type),
      formatPaidForExcel(order.is_paid),
      orderNotesText(order) || '—',
      order.full_bidons_given ?? order.bidons_count ?? 0,
      order.empty_bidons_returned ?? 0,
    ]);
  }

  if (sortedOrders.length === 0) {
    orderRows.push(['—', 'Sifariş yoxdur', '—', '—', '—', '—', 0, 0, '—', '—', '—', 0, 0]);
  }

  const ordersSheet = XLSX.utils.aoa_to_sheet(orderRows);
  ordersSheet['!cols'] = [
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
    { wch: 30 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 28 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Sifarişlər');

  const expenseRows: (string | number)[][] = [
    ['Tarix', 'Kateqoriya', 'Təsvir', 'Məbləğ (₼)'],
  ];

  for (const expense of sortedExpenses) {
    expenseRows.push([
      formatExportDateTime(expense.created_at),
      expenseCategoryLabel(expense.category),
      expense.description,
      round2(Number(expense.amount) || 0),
    ]);
  }

  if (sortedExpenses.length === 0) {
    expenseRows.push(['—', '—', 'Xərc qeydi yoxdur', 0]);
  }

  const expensesSheet = XLSX.utils.aoa_to_sheet(expenseRows);
  expensesSheet['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 32 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Xərclər');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
