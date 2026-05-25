'use client';

import { useCallback, useEffect, useState } from 'react';
import { createExpense, getExpenses } from '@/lib/api';
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
      const data = await getExpenses(period);
      setExpenses(data.expenses ?? []);
      setTotalExpenses(data.totalExpenses ?? 0);
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
      const data = await createExpense({
        amount,
        description: form.description.trim(),
        category: form.category,
      });
      setExpenses(data.expenses ?? []);
      setTotalExpenses(data.totalExpenses ?? 0);
      setForm({ amount: '', description: '', category: 'fuel' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xəta baş verdi');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'grid', gap: '24px', maxWidth: '720px' }}>
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px' }}>Yeni xərc</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Məbləğ (₼)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Təsvir
              </label>
              <input
                type="text"
                placeholder="Məs: Yanacaq"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Kateqoriya
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={inputStyle}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Əlavə edilir...' : 'Xərc əlavə et'}
          </button>
        </form>
      )}

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{title}</h2>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
            Cəmi: ₼{Number(totalExpenses).toFixed(2)}
          </span>
        </div>
        {loading ? (
          <p style={{ color: '#9ca3af', textAlign: 'center' }}>Yüklənir...</p>
        ) : expenses.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center' }}>Xərc qeydi yoxdur</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {expenses.map((exp, i) => (
              <li
                key={exp.id ?? i}
                style={{
                  padding: '12px 0',
                  borderBottom: i < expenses.length - 1 ? '1px solid #f3f4f6' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{exp.description}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                    {expenseCategoryLabel(exp.category)}
                    {exp.created_at &&
                      ` · ${new Date(exp.created_at).toLocaleString('az-AZ', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`}
                  </p>
                </div>
                <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                  ₼{Number(exp.amount).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
