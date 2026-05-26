'use client';

import { useCallback, useEffect, useState } from 'react';
import { createExpense, getExpenses } from '@/lib/api';
import { formatAppDateTime, matchesAppPeriod } from '@/lib/dates';
import type { Expense, ExpensePeriod } from '@/lib/types';
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from '@/lib/types';

interface ExpensesSectionProps {
  period: ExpensePeriod;
  showForm?: boolean;
  title?: string;
}

export default function ExpensesSection({
  period,
  showForm = false,
  title = 'Xərclər',
}: ExpensesSectionProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ amount: '', description: '', category: 'fuel' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExpenses('month');
      const all = data.expenses ?? [];
      const filtered = all.filter((exp) => matchesAppPeriod(exp.created_at, period));
      setExpenses(filtered);
      setTotalExpenses(filtered.reduce((sum, exp) => sum + Number(exp.amount), 0));
    } catch {
      setExpenses([]);
      setTotalExpenses(0);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setError('Düzgün məbləğ daxil edin');
      return;
    }
    if (!form.description.trim()) {
      setError('Təsvir daxil edin');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await createExpense({
        amount,
        description: form.description.trim(),
        category: form.category,
      });
      setForm({ amount: '', description: '', category: 'fuel' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xəta baş verdi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="expenses-layout">
      {showForm && (
        <form onSubmit={handleSubmit} className="courier-panel courier-panel--padded">
          <h2 className="courier-section-title">Yeni xərc</h2>
          <div className="expenses-form__grid">
            <label className="courier-form-label" style={{ marginBottom: 0 }}>
              Məbləğ (₼)
              <input
                className="courier-form-input"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </label>
            <label className="courier-form-label" style={{ marginBottom: 0 }}>
              Təsvir
              <input
                className="courier-form-input"
                type="text"
                placeholder="Məs: Yanacaq"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </label>
            <label className="courier-form-label" style={{ marginBottom: 0 }}>
              Kateqoriya
              <select
                className="courier-form-select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && <p className="courier-error-box" style={{ marginTop: '12px' }}>{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="courier-btn courier-btn--primary"
            style={{ marginTop: '16px', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Əlavə edilir...' : 'Xərc əlavə et'}
          </button>
        </form>
      )}

      <div className="courier-panel courier-panel--padded">
        <div className="expenses-list__head">
          <h2 className="courier-section-title" style={{ margin: 0 }}>
            {title}
          </h2>
          <span className="expenses-list__total">Cəmi: ₼{Number(totalExpenses).toFixed(2)}</span>
        </div>
        {loading ? (
          <p className="courier-empty">Yüklənir...</p>
        ) : expenses.length === 0 ? (
          <p className="courier-empty">Xərc qeydi yoxdur</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {expenses.map((exp, i) => (
              <li key={exp.id ?? i} className="expense-item">
                <div>
                  <p className="expense-item__title">{exp.description}</p>
                  <p className="expense-item__meta">
                    {expenseCategoryLabel(exp.category)}
                    {exp.created_at &&
                      ` · ${formatAppDateTime(exp.created_at, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`}
                  </p>
                </div>
                <span className="expense-item__amount">₼{Number(exp.amount).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
