'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getWarehouseSummary,
  getWarehouseUpdates,
  submitWarehouseUpdate,
} from '@/lib/api';
import { formatAppDateTime } from '@/lib/dates';
import type {
  WarehousePeriod,
  WarehouseSummaryResponse,
  WarehouseUpdateRecord,
} from '@/lib/types';

const EMPTY_FORM = {
  empty_in: '',
  full_in: '',
  full_out: '',
  exit_full: '',
  remaining_full: '',
  remaining_empty: '',
  notes: '',
};

function parseCount(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n < 0 ? undefined : n;
}

function formatUpdateSummary(update: WarehouseUpdateRecord): string {
  const parts: string[] = [];
  if (update.empty_in) parts.push(`+${update.empty_in} boş`);
  if (update.full_in) parts.push(`+${update.full_in} dolu`);
  if (update.full_out) parts.push(`−${update.full_out} dolu`);
  parts.push(`→ ${update.remaining_full} dolu qaldı`);
  return parts.join(', ');
}

export default function WarehouseSection() {
  const [summary, setSummary] = useState<WarehouseSummaryResponse | null>(null);
  const [history, setHistory] = useState<WarehouseUpdateRecord[]>([]);
  const [historyPeriod, setHistoryPeriod] = useState<WarehousePeriod>('week');
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mismatchWarning, setMismatchWarning] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

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
      const data = await getWarehouseUpdates(historyPeriod);
      const items = Array.isArray(data) ? data : (data.updates ?? []);
      setHistory(items);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPeriod]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    await Promise.all([loadSummary(), loadHistory()]);
    setLoading(false);
  }, [loadSummary, loadHistory]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const previousFull = summary?.warehouse.full_count ?? 0;
  const calculatedFull = useMemo(() => {
    const fullIn = parseCount(form.full_in) ?? 0;
    const fullOut = parseCount(form.full_out) ?? 0;
    return previousFull + fullIn - fullOut;
  }, [form.full_in, form.full_out, previousFull]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const remainingFull = parseCount(form.remaining_full);
    if (remainingFull === undefined) {
      setError('«Anbarda qalan dolu» mütləqdir');
      return;
    }

    setError('');
    setSuccess('');
    setMismatchWarning('');
    setSubmitting(true);

    try {
      const payload = {
        empty_in: parseCount(form.empty_in),
        full_in: parseCount(form.full_in),
        full_out: parseCount(form.full_out),
        exit_full: parseCount(form.exit_full),
        remaining_full: remainingFull,
        remaining_empty: parseCount(form.remaining_empty),
        notes: form.notes.trim() || undefined,
      };

      const result = await submitWarehouseUpdate(payload);
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              warehouse: result.stock,
              last_update: result.update,
            }
          : {
              warehouse: result.stock,
              customers: { total_active_bidons: 0, customer_count: 0 },
              last_update: result.update,
            }
      );

      setForm(EMPTY_FORM);
      setSuccess('Anbar yeniləndi');
      if (result.calculation?.mismatch) {
        setMismatchWarning(
          'Hesablanan dolu ilə «yerdə qaldı» uyğun gəlmir — qeyd yoxlanılsın.'
        );
      }
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Göndərmə uğursuz oldu');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !summary) {
    return <p className="courier-empty courier-panel courier-panel--padded">Yüklənir...</p>;
  }

  return (
    <div className="warehouse-layout">
      {summary && (
        <div className="warehouse-summary">
          <SummaryCard
            title="Anbarda dolu"
            value={summary.warehouse.full_count}
            icon="🟢"
            color="#10b981"
          />
          <SummaryCard
            title="Anbarda boş"
            value={summary.warehouse.empty_count}
            icon="⚪"
            color="#6b7280"
          />
          <SummaryCard
            title="Müştəridə aktiv"
            value={summary.customers.total_active_bidons}
            icon="👥"
            color="#3b82f6"
            subtitle={`${summary.customers.customer_count} müştəri`}
          />
        </div>
      )}

      {summary?.warehouse.updated_at && (
        <p className="warehouse-meta">
          Son yeniləmə:{' '}
          {formatAppDateTime(summary.warehouse.updated_at, {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {summary.warehouse.updated_by_name && ` · ${summary.warehouse.updated_by_name}`}
        </p>
      )}

      <form onSubmit={handleSubmit} className="courier-panel courier-panel--padded">
        <h2 className="courier-section-title">Su doldurma qeydi</h2>
        <p className="warehouse-form-hint">
          WhatsApp mesajı əvəzinə rəqəmləri buraya daxil edin. Hazırkı anbar dolu:{' '}
          <strong>{previousFull}</strong>
        </p>

        <div className="warehouse-form__grid">
          <NumberField
            label="Anbara boş"
            value={form.empty_in}
            onChange={(v) => setForm({ ...form, empty_in: v })}
            placeholder="8"
          />
          <NumberField
            label="Anbara dolu"
            value={form.full_in}
            onChange={(v) => setForm({ ...form, full_in: v })}
            placeholder="23"
          />
          <NumberField
            label="Anbardan götürülən dolu"
            value={form.full_out}
            onChange={(v) => setForm({ ...form, full_out: v })}
            placeholder="7"
          />
          <NumberField
            label="Maşında dolu (opsional)"
            value={form.exit_full}
            onChange={(v) => setForm({ ...form, exit_full: v })}
            placeholder="30"
          />
          <NumberField
            label="Anbarda qalan dolu *"
            value={form.remaining_full}
            onChange={(v) => setForm({ ...form, remaining_full: v })}
            placeholder="17"
            required
          />
          <NumberField
            label="Anbarda qalan boş (opsional)"
            value={form.remaining_empty}
            onChange={(v) => setForm({ ...form, remaining_empty: v })}
            placeholder={String(summary?.warehouse.empty_count ?? '')}
          />
          <label className="courier-form-label warehouse-form__notes">
            Qeyd
            <textarea
              className="courier-form-input warehouse-form__textarea"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Əlavə qeyd..."
            />
          </label>
        </div>

        {(form.full_in || form.full_out) && (
          <p className="warehouse-calc-hint">
            Hesablanan dolu: {previousFull} + {parseCount(form.full_in) ?? 0} −{' '}
            {parseCount(form.full_out) ?? 0} = <strong>{calculatedFull}</strong>
          </p>
        )}

        {error && <p className="courier-error-box">{error}</p>}
        {success && <p className="warehouse-success-box">{success}</p>}
        {mismatchWarning && <p className="warehouse-warn-box">{mismatchWarning}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="courier-btn courier-btn--primary"
          style={{ marginTop: '16px', opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? 'Göndərilir...' : 'Anbarı yenilə'}
        </button>
      </form>

      <div className="courier-panel courier-panel--padded">
        <div className="warehouse-history__head">
          <h2 className="courier-section-title" style={{ margin: 0 }}>
            Mənim qeydlərim
          </h2>
          <div className="courier-toolbar warehouse-history__periods">
            {(['today', 'week', 'month'] as WarehousePeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setHistoryPeriod(p)}
                className={`courier-period-btn ${historyPeriod === p ? 'is-active' : ''}`}
              >
                {p === 'today' ? 'Bu gün' : p === 'week' ? 'Həftə' : 'Ay'}
              </button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <p className="courier-empty">Yüklənir...</p>
        ) : history.length === 0 ? (
          <p className="courier-empty">Bu dövrdə qeyd yoxdur</p>
        ) : (
          <ul className="warehouse-history__list">
            {history.map((item, i) => (
              <li key={item.id ?? i} className="warehouse-history__item">
                <div>
                  <p className="warehouse-history__summary">{formatUpdateSummary(item)}</p>
                  <p className="warehouse-history__meta">
                    {item.created_at &&
                      formatAppDateTime(item.created_at, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    {item.exit_full != null && ` · Maşında: ${item.exit_full}`}
                    {item.notes && ` · ${item.notes}`}
                  </p>
                </div>
                <div className="warehouse-history__counts">
                  <span>{item.remaining_full} dolu</span>
                  {item.remaining_empty != null && (
                    <span className="cell-muted">{item.remaining_empty} boş</span>
                  )}
                </div>
              </li>
            ))}
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
