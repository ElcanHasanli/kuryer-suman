'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DateFilterBar from '@/components/courier/DateFilterBar';
import { useAuth } from '@/context/AuthContext';
import {
  ApiError,
  getWarehouseSummary,
  getWarehouseUpdates,
  submitWarehouseUpdate,
} from '@/lib/api';
import { formatAppDateTime, todayInputDate, yesterdayInputDate } from '@/lib/dates';
import type { DateRange } from '@/lib/dates';
import type {
  DateFilterPeriod,
  WarehouseInfo,
  WarehouseSummaryResponse,
  WarehouseUpdateRecord,
} from '@/lib/types';

const EMPTY_FORM = {
  entry_full: '',
  entry_empty: '',
  exit_full: '',
};

const FALLBACK_WAREHOUSES: WarehouseInfo[] = [
  { code: 'novxani', name: 'Novxanı' },
  { code: 'azadliq', name: 'Azadlıq' },
];

function parseCount(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n < 0 ? undefined : n;
}

function warehouseLabel(wh: WarehouseInfo): string {
  return wh.name || wh.code;
}

function normalizeWarehouses(summary: WarehouseSummaryResponse | null): WarehouseInfo[] {
  if (summary?.warehouses?.length) return summary.warehouses;
  if (summary?.default_warehouse) return [summary.default_warehouse];
  if (summary?.warehouse) {
    return [
      {
        id: summary.warehouse.id,
        code: summary.warehouse.code || 'default',
        name: summary.warehouse.name || 'Anbar',
        full_count: summary.warehouse.full_count,
        empty_count: summary.warehouse.empty_count,
        updated_at: summary.warehouse.updated_at,
        updated_by_name: summary.warehouse.updated_by_name,
      },
    ];
  }
  return FALLBACK_WAREHOUSES;
}

function takenFullFromUpdate(update: WarehouseUpdateRecord): number | null {
  if (update.taken_full != null) return update.taken_full;
  if (update.entry_full != null && update.exit_full != null) {
    return update.exit_full - update.entry_full;
  }
  if (update.full_out != null) return update.full_out;
  return null;
}

function formatUpdateSummary(update: WarehouseUpdateRecord): string {
  const parts: string[] = [];
  const name = update.warehouse_name || update.warehouse_code;
  if (name) parts.push(name);

  if (update.entry_full != null || update.entry_empty != null || update.exit_full != null) {
    if (update.entry_full != null) parts.push(`girdi: ${update.entry_full} dolu`);
    if (update.entry_empty != null) parts.push(`${update.entry_empty} boş`);
    if (update.exit_full != null) parts.push(`çıxdı: ${update.exit_full} dolu`);
    const taken = takenFullFromUpdate(update);
    if (taken != null) parts.push(`götürülən: ${taken}`);
    return parts.join(' · ');
  }

  // Köhnə format
  if (update.empty_in) parts.push(`+${update.empty_in} boş`);
  if (update.full_in) parts.push(`+${update.full_in} dolu`);
  if (update.full_out) parts.push(`−${update.full_out} dolu`);
  if (update.exit_full) parts.push(`maşın: ${update.exit_full} dolu`);
  if (update.remaining_full != null) parts.push(`→ ${update.remaining_full} dolu qaldı`);
  return parts.join(', ') || 'Qeyd';
}

function warehouseErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'EXIT_LESS_THAN_ENTRY') {
      return 'Dolu çıxış, dolu girişdən az ola bilməz';
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Göndərmə uğursuz oldu';
}

export default function WarehouseSection() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<WarehouseSummaryResponse | null>(null);
  const [history, setHistory] = useState<WarehouseUpdateRecord[]>([]);
  const [historyPeriod, setHistoryPeriod] = useState<DateFilterPeriod>('today');
  const [customStartDate, setCustomStartDate] = useState(yesterdayInputDate());
  const [customEndDate, setCustomEndDate] = useState(todayInputDate());
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedCode, setSelectedCode] = useState<string>('');

  const customRange: DateRange = useMemo(
    () => ({ startDate: customStartDate, endDate: customEndDate }),
    [customStartDate, customEndDate]
  );

  const warehouses = useMemo(() => normalizeWarehouses(summary), [summary]);

  const defaultCode = useMemo(() => {
    return (
      summary?.default_warehouse?.code ||
      user?.default_warehouse?.code ||
      warehouses[0]?.code ||
      ''
    );
  }, [summary, user, warehouses]);

  useEffect(() => {
    if (!selectedCode && defaultCode) {
      setSelectedCode(defaultCode);
    } else if (
      selectedCode &&
      warehouses.length > 0 &&
      !warehouses.some((w) => w.code === selectedCode)
    ) {
      setSelectedCode(defaultCode);
    }
  }, [defaultCode, selectedCode, warehouses]);

  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => w.code === selectedCode) ?? null,
    [warehouses, selectedCode]
  );

  const loadSummary = useCallback(async () => {
    try {
      const data = await getWarehouseSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anbar məlumatı yüklənmədi');
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params =
        historyPeriod === 'custom'
          ? {
              period: 'custom' as const,
              startDate: customRange.startDate,
              endDate: customRange.endDate,
            }
          : { period: historyPeriod };
      const data = await getWarehouseUpdates(params);
      const items = Array.isArray(data) ? data : (data.updates ?? []);
      setHistory(items);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPeriod, customRange.startDate, customRange.endDate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadSummary();
      setLoading(false);
    })();
  }, [loadSummary]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const entryFull = parseCount(form.entry_full) ?? 0;
  const entryEmpty = parseCount(form.entry_empty) ?? 0;
  const exitFull = parseCount(form.exit_full) ?? 0;
  const takenFull = exitFull - entryFull;
  const showTakenPreview =
    form.entry_full.trim() !== '' && form.exit_full.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const entryFullVal = parseCount(form.entry_full);
    const entryEmptyVal = parseCount(form.entry_empty);
    const exitFullVal = parseCount(form.exit_full);

    if (
      entryFullVal === undefined ||
      entryEmptyVal === undefined ||
      exitFullVal === undefined
    ) {
      setError('Bütün sahələri doldurun');
      return;
    }

    if (exitFullVal < entryFullVal) {
      setError('Dolu çıxış, dolu girişdən az ola bilməz');
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const payload = {
        warehouse_code: selectedCode || undefined,
        entry_full: entryFullVal,
        entry_empty: entryEmptyVal,
        exit_full: exitFullVal,
      };

      const result = await submitWarehouseUpdate(payload);

      setSummary((prev) => {
        const stock = result.stock || result.warehouse;
        const next: WarehouseSummaryResponse = {
          ...(prev ?? {}),
          warehouses: result.warehouses ?? prev?.warehouses,
          default_warehouse:
            result.default_warehouse ?? prev?.default_warehouse ?? null,
          last_update: result.update,
        };
        if (stock) next.warehouse = stock;
        return next;
      });

      setForm(EMPTY_FORM);
      const taken =
        result.calculation?.taken_full ??
        takenFullFromUpdate(result.update) ??
        exitFullVal - entryFullVal;
      setSuccess(`Qeyd edildi · Götürülən dolu: ${taken}`);
      await Promise.all([loadSummary(), loadHistory()]);
    } catch (err) {
      setError(warehouseErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !summary) {
    return <p className="courier-empty courier-panel courier-panel--padded">Yüklənir...</p>;
  }

  return (
    <div className="warehouse-layout">
      {warehouses.length > 0 && (
        <div className="warehouse-summary">
          {warehouses.map((wh) => (
            <SummaryCard
              key={wh.code}
              title={warehouseLabel(wh)}
              value={wh.full_count ?? 0}
              icon={wh.code === selectedCode ? '📍' : '🟢'}
              color={wh.code === selectedCode ? '#2563eb' : '#10b981'}
              subtitle={
                wh.empty_count != null
                  ? `${wh.empty_count} boş${wh.code === defaultCode ? ' · default' : ''}`
                  : wh.code === defaultCode
                    ? 'Default anbar'
                    : undefined
              }
            />
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="courier-panel courier-panel--padded">
        <h2 className="courier-section-title">Su doldurma qeydi</h2>
        <p className="warehouse-form-hint">
          Anbara girib çıxanda rəqəmləri daxil edin. Götürülən dolu avtomatik
          hesablanır.
        </p>

        <label className="courier-form-label">
          Anbar
          <select
            className="courier-form-select"
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            required
          >
            {warehouses.map((wh) => (
              <option key={wh.code} value={wh.code}>
                {warehouseLabel(wh)}
                {wh.code === defaultCode ? ' (default)' : ''}
              </option>
            ))}
          </select>
        </label>

        {selectedWarehouse && (
          <p className="warehouse-meta" style={{ marginTop: 0 }}>
            Seçilmiş: <strong>{warehouseLabel(selectedWarehouse)}</strong>
            {selectedWarehouse.full_count != null &&
              ` · ${selectedWarehouse.full_count} dolu`}
            {selectedWarehouse.empty_count != null &&
              ` / ${selectedWarehouse.empty_count} boş`}
          </p>
        )}

        <div className="warehouse-form__grid warehouse-form__grid--simple">
          <NumberField
            label="Neçə dolu ilə girdiniz"
            value={form.entry_full}
            onChange={(v) => setForm({ ...form, entry_full: v })}
            placeholder="10"
            required
          />
          <NumberField
            label="Neçə boş ilə girdiniz"
            value={form.entry_empty}
            onChange={(v) => setForm({ ...form, entry_empty: v })}
            placeholder="5"
            required
          />
          <NumberField
            label="Neçə dolu ilə çıxdınız"
            value={form.exit_full}
            onChange={(v) => setForm({ ...form, exit_full: v })}
            placeholder="20"
            required
          />
        </div>

        {showTakenPreview && (
          <p
            className={`warehouse-calc-hint${takenFull < 0 ? ' warehouse-calc-hint--error' : ''}`}
          >
            {takenFull < 0 ? (
              <>Dolu çıxış, dolu girişdən az ola bilməz</>
            ) : (
              <>
                Götürüləcək dolu: <strong>{takenFull}</strong>
                <span style={{ display: 'block', marginTop: 4, color: '#6b7280' }}>
                  {exitFull} − {entryFull} = {takenFull}
                  {entryEmpty > 0 ? ` · boş girdi: ${entryEmpty}` : ''}
                </span>
              </>
            )}
          </p>
        )}

        {error && <p className="courier-error-box">{error}</p>}
        {success && <p className="warehouse-success-box">{success}</p>}

        <button
          type="submit"
          disabled={submitting || takenFull < 0}
          className="courier-btn courier-btn--primary"
          style={{ marginTop: '16px', opacity: submitting || takenFull < 0 ? 0.6 : 1 }}
        >
          {submitting ? 'Göndərilir...' : 'Qeyd et'}
        </button>
      </form>

      <div className="courier-panel courier-panel--padded">
        <h2 className="courier-section-title">Mənim qeydlərim</h2>
        <DateFilterBar
          period={historyPeriod}
          onPeriodChange={setHistoryPeriod}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomStartChange={setCustomStartDate}
          onCustomEndChange={setCustomEndDate}
        />

        {historyLoading ? (
          <p className="courier-empty">Yüklənir...</p>
        ) : history.length === 0 ? (
          <p className="courier-empty">Bu dövrdə qeyd yoxdur</p>
        ) : (
          <ul className="warehouse-history__list">
            {history.map((item, i) => {
              const taken = takenFullFromUpdate(item);
              return (
                <li key={item.id ?? i} className="warehouse-history__item">
                  <div>
                    <p className="warehouse-history__summary">
                      {formatUpdateSummary(item)}
                    </p>
                    <p className="warehouse-history__meta">
                      {item.created_at &&
                        formatAppDateTime(item.created_at, {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      {item.notes && ` · ${item.notes}`}
                    </p>
                  </div>
                  <div className="warehouse-history__counts">
                    {taken != null ? (
                      <span>+{taken} dolu</span>
                    ) : item.remaining_full != null ? (
                      <span>{item.remaining_full} dolu</span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="warehouse-summary-card" style={{ ['--stat-color' as string]: color }}>
      <div className="warehouse-summary-card__row">
        <div>
          <p className="warehouse-summary-card__label">{title}</p>
          <p className="warehouse-summary-card__value">{value}</p>
          {subtitle && <p className="warehouse-summary-card__sub">{subtitle}</p>}
        </div>
        <span className="warehouse-summary-card__icon">{icon}</span>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="courier-form-label" style={{ marginBottom: 0 }}>
      {label}
      <input
        className="courier-form-input"
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}
