import type { DateFilterPeriod, ExpensePeriod, HistoryPeriod } from './types';

export const APP_TIMEZONE = 'Asia/Baku';

export type DateRange = {
  startDate: string;
  endDate: string;
};

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
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    return { year: get('year'), month: get('month'), day: get('day') };
  } catch {
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
  }
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

export function formatInputDate(parts: DateParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function todayInputDate(): string {
  return formatInputDate(getAppDateParts(new Date()));
}

export function yesterdayInputDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatInputDate(getAppDateParts(d));
}

export function daysAgoInputDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatInputDate(getAppDateParts(d));
}

export function isDateInAppRange(
  dateStr: string | undefined,
  startDate: string,
  endDate: string
): boolean {
  if (!dateStr || !startDate || !endDate) return false;
  const d = parseAppDate(dateStr);
  if (Number.isNaN(d.getTime())) return false;

  const dp = getAppDateParts(d);
  const sp = getAppDateParts(parseAppDate(startDate));
  const ep = getAppDateParts(parseAppDate(endDate));
  const key = (p: DateParts) => p.year * 10000 + p.month * 100 + p.day;

  const dKey = key(dp);
  return dKey >= key(sp) && dKey <= key(ep);
}

export function getEffectiveDateRange(
  period: HistoryPeriod | DateFilterPeriod,
  customRange?: DateRange
): DateRange {
  if (period === 'custom' && customRange?.startDate && customRange?.endDate) {
    return {
      startDate: customRange.startDate,
      endDate: customRange.endDate,
    };
  }
  if (period === 'yesterday') {
    const y = yesterdayInputDate();
    return { startDate: y, endDate: y };
  }
  const today = todayInputDate();
  return { startDate: today, endDate: today };
}

export function matchesHistoryFilter(
  dateStr: string | undefined,
  period: HistoryPeriod | DateFilterPeriod,
  customRange?: DateRange
): boolean {
  if (!dateStr) return false;
  const range = getEffectiveDateRange(period, customRange);
  return isDateInAppRange(dateStr, range.startDate, range.endDate);
}

export function formatDateRangeLabel(range: DateRange): string {
  if (range.startDate === range.endDate) return range.startDate;
  return `${range.startDate} — ${range.endDate}`;
}

/** @deprecated use matchesHistoryFilter */
export function matchesAppPeriod(
  dateStr: string | undefined,
  period: HistoryPeriod | ExpensePeriod
): boolean {
  return matchesHistoryFilter(dateStr, period);
}

export function formatAppDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = parseAppDate(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleDateString('az-AZ', { timeZone: APP_TIMEZONE });
  } catch {
    return d.toLocaleDateString('az-AZ');
  }
}

export function formatAppDateTime(
  dateStr?: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!dateStr) return '';
  const d = parseAppDate(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString('az-AZ', { timeZone: APP_TIMEZONE, ...options });
  } catch {
    return d.toLocaleString('az-AZ', options);
  }
}
