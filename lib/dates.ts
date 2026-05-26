import type { ExpensePeriod, HistoryPeriod } from './types';

export const APP_TIMEZONE = 'Asia/Baku';

/** API/DB often sends timestamps without timezone — treat as UTC. */
export function parseAppDate(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T00:00:00Z`);
  }
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?$/.test(dateStr)) {
    return new Date(`${dateStr.replace(' ', 'T')}Z`);
  }
  return new Date(dateStr);
}

type DateParts = { year: number; month: number; day: number };

export function getAppDateParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function isSameAppDay(a: Date, b: Date): boolean {
  const pa = getAppDateParts(a);
  const pb = getAppDateParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

export function isTodayInApp(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = parseAppDate(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return isSameAppDay(d, new Date());
}

export function matchesAppPeriod(
  dateStr: string | undefined,
  period: HistoryPeriod | ExpensePeriod
): boolean {
  if (!dateStr) return false;
  const d = parseAppDate(dateStr);
  if (Number.isNaN(d.getTime())) return false;

  const now = new Date();
  if (period === 'today') return isSameAppDay(d, now);
  if (period === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }
  if (period === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return d >= monthAgo;
  }
  return true;
}

export function formatAppDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = parseAppDate(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('az-AZ', { timeZone: APP_TIMEZONE });
}

export function formatAppDateTime(
  dateStr?: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!dateStr) return '';
  const d = parseAppDate(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('az-AZ', { timeZone: APP_TIMEZONE, ...options });
}
