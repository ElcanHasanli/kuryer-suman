'use client';

import {
  formatDateRangeLabel,
  getEffectiveDateRange,
  todayInputDate,
} from '@/lib/dates';
import type { DateRange } from '@/lib/dates';
import type { DateFilterPeriod } from '@/lib/types';

const FILTER_OPTIONS: { id: DateFilterPeriod; label: string }[] = [
  { id: 'yesterday', label: 'Dünən' },
  { id: 'today', label: 'Bu gün' },
  { id: 'custom', label: 'Tarix aralığı' },
];

interface DateFilterBarProps {
  period: DateFilterPeriod;
  onPeriodChange: (period: DateFilterPeriod) => void;
  customStartDate: string;
  customEndDate: string;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
}

export default function DateFilterBar({
  period,
  onPeriodChange,
  customStartDate,
  customEndDate,
  onCustomStartChange,
  onCustomEndChange,
}: DateFilterBarProps) {
  const customRange: DateRange = {
    startDate: customStartDate,
    endDate: customEndDate,
  };
  const effectiveRange = getEffectiveDateRange(period, customRange);

  return (
    <div className="date-filter">
      <div className="courier-toolbar date-filter__periods">
        {FILTER_OPTIONS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPeriodChange(p.id)}
            className={`courier-period-btn ${period === p.id ? 'is-active' : ''}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="courier-date-range courier-panel courier-panel--padded">
          <label className="courier-form-label" style={{ marginBottom: 0 }}>
            Başlanğıc
            <input
              className="courier-form-input"
              type="date"
              value={customStartDate}
              max={customEndDate}
              onChange={(e) => onCustomStartChange(e.target.value)}
            />
          </label>
          <label className="courier-form-label" style={{ marginBottom: 0 }}>
            Bitmə
            <input
              className="courier-form-input"
              type="date"
              value={customEndDate}
              min={customStartDate}
              max={todayInputDate()}
              onChange={(e) => onCustomEndChange(e.target.value)}
            />
          </label>
        </div>
      )}
      <p className="courier-range-label">
        Seçilmiş dövr: {formatDateRangeLabel(effectiveRange)}
      </p>
    </div>
  );
}

export { FILTER_OPTIONS };
