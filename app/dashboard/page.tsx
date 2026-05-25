'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  getOrders,
  getOrder,
  updateOrder,
  postOrderNote,
  getExpenses,
  createExpense,
} from '@/lib/api';
import type { Order, OrderNote, Expense, ExpensePeriod } from '@/lib/types';
import {
  EXPENSE_CATEGORIES,
  expenseCategoryLabel,
  authorRoleLabel,
} from '@/lib/types';

type TabId = 'orders' | 'completed' | 'expenses' | 'history';

export default function CourierDashboard() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderNotes, setOrderNotes] = useState<OrderNote[]>([]);
  const [noteBody, setNoteBody] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [historyPeriod, setHistoryPeriod] = useState<ExpensePeriod>('today');
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    description: '',
    category: 'fuel',
  });
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [expenseError, setExpenseError] = useState('');

  const [stats, setStats] = useState({
    pendingOrders: 0,
    completedToday: 0,
    totalDelivered: 0,
  });

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  const refreshOrders = useCallback(async () => {
    if (!token || !user?.id) return;
    const ordersData: Order[] = await getOrders(token);
    const courierOrders = ordersData.filter((o) => o.courier_id === user.id);
    const pending = courierOrders.filter((o) => o.status !== 'completed');
    const completed = courierOrders.filter((o) => o.status === 'completed');
    const today = new Date().toDateString();
    const completedToday = completed.filter(
      (o) => o.completed_at && new Date(o.completed_at).toDateString() === today
    ).length;

    setOrders(pending);
    setCompletedOrders(completed);
    setStats({
      pendingOrders: pending.length,
      completedToday,
      totalDelivered: completed.length,
    });
  }, [token, user?.id]);

  const loadExpenses = useCallback(
    async (period: ExpensePeriod) => {
      if (!token) return;
      setExpensesLoading(true);
      try {
        const data = await getExpenses(token, period);
        setExpenses(data.expenses ?? []);
        setTotalExpenses(data.totalExpenses ?? 0);
      } catch (err) {
        console.error(err);
        setExpenses([]);
        setTotalExpenses(0);
      } finally {
        setExpensesLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    const init = async () => {
      try {
        await refreshOrders();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token && user?.id) init();
  }, [token, user?.id, refreshOrders]);

  useEffect(() => {
    if (activeTab === 'expenses') loadExpenses('today');
    if (activeTab === 'history') loadExpenses(historyPeriod);
  }, [activeTab, historyPeriod, loadExpenses]);

  useEffect(() => {
    const loadOrderDetail = async () => {
      if (!selectedOrder || !token) return;
      setOrderDetailLoading(true);
      setNoteBody('');
      try {
        const detail = await getOrder(token, selectedOrder.id);
        setSelectedOrder(detail);
        setOrderNotes(detail.notes ?? []);
      } catch (err) {
        console.error(err);
        setOrderNotes([]);
      } finally {
        setOrderDetailLoading(false);
      }
    };
    loadOrderDetail();
  }, [selectedOrder?.id, token]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleUpdateOrder = async (orderId: number, status: string) => {
    if (!token) return;
    try {
      await updateOrder(token, orderId, { status });
      await refreshOrders();
      setSelectedOrder(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async () => {
    if (!token || !selectedOrder || !noteBody.trim()) return;
    setNoteSubmitting(true);
    try {
      await postOrderNote(token, selectedOrder.id, noteBody.trim());
      const detail = await getOrder(token, selectedOrder.id);
      setSelectedOrder(detail);
      setOrderNotes(detail.notes ?? []);
      setNoteBody('');
    } catch (err) {
      console.error(err);
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const amount = parseFloat(expenseForm.amount);
    if (!amount || amount <= 0) {
      setExpenseError('Düzgün məbləğ daxil edin');
      return;
    }
    if (!expenseForm.description.trim()) {
      setExpenseError('Təsvir daxil edin');
      return;
    }

    setExpenseError('');
    setExpenseSubmitting(true);
    try {
      const data = await createExpense(token, {
        amount,
        description: expenseForm.description.trim(),
        category: expenseForm.category,
      });
      setExpenses(data.expenses ?? []);
      setTotalExpenses(data.totalExpenses ?? 0);
      setExpenseForm({ amount: '', description: '', category: 'fuel' });
    } catch (err) {
      setExpenseError(err instanceof Error ? err.message : 'Xəta baş verdi');
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const userDisplayId = user.license_code || user.email || '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <aside
        style={{
          width: '280px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          padding: '24px 20px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          position: 'fixed',
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>💧</div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px 0', color: '#1f2937' }}>
            SuMan
          </h1>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>Kuryer Panel</p>
        </div>

        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '24px',
            borderLeft: '3px solid #10b981',
          }}
        >
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase' }}>
            Daxil olmuş:
          </p>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', margin: '0 0 2px 0' }}>
            {user.name}
          </p>
          {userDisplayId && (
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, wordBreak: 'break-all' }}>
              {userDisplayId}
            </p>
          )}
        </div>

        <nav style={{ marginBottom: '32px' }}>
          {(
            [
              { id: 'orders' as const, label: '📦 Sifarişlər' },
              { id: 'completed' as const, label: '✅ Tamamlanan' },
              { id: 'expenses' as const, label: '💰 Əlavə xərclər' },
              { id: 'history' as const, label: '📈 Tarixçə' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                width: '100%',
                padding: '11px 14px',
                marginBottom: '6px',
                backgroundColor: activeTab === item.id ? '#f3f4f6' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                borderLeft: activeTab === item.id ? '3px solid #10b981' : '3px solid transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === item.id ? '600' : '500',
                color: activeTab === item.id ? '#1f2937' : '#6b7280',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '11px 14px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          🚪 Çıxış
        </button>
      </aside>

      <main style={{ marginLeft: '280px', flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: '#1f2937' }}>
            {activeTab === 'orders' && 'Gözləyən Sifarişlər'}
            {activeTab === 'completed' && 'Tamamlanan Sifarişlər'}
            {activeTab === 'expenses' && 'Əlavə xərclər'}
            {activeTab === 'history' && 'Tarixçə'}
          </h1>
        </div>

        {(activeTab === 'orders' || activeTab === 'completed') && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '32px',
            }}
          >
            <StatCard title="Gözləyən" value={stats.pendingOrders} icon="⏳" color="#f59e0b" />
            <StatCard title="Bugün Tamamlanan" value={stats.completedToday} icon="✅" color="#10b981" />
            <StatCard title="Toplam Çatdırılmış" value={stats.totalDelivered} icon="🚚" color="#3b82f6" />
          </div>
        )}

        {activeTab === 'orders' && (
          <OrdersTable
            loading={loading}
            orders={orders}
            emptyMessage="Gözləyən sifariş yoxdur"
            onSelect={setSelectedOrder}
          />
        )}

        {activeTab === 'completed' && (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Müştəri', 'Ödəniş', 'Boş Bidon', 'Dolu Bidon', 'Tarix', ''].map((h) => (
                    <th
                      key={h}
                      style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {completedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                      Tamamlanan sifariş yoxdur
                    </td>
                  </tr>
                ) : (
                  completedOrders.map((order) => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '500' }}>{order.name}</td>
                      <td style={{ padding: '12px 16px' }}>{order.payment_type || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>{order.empty_bidons_returned}</td>
                      <td style={{ padding: '12px 16px' }}>{order.full_bidons_given}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '12px' }}>
                        {order.completed_at
                          ? new Date(order.completed_at).toLocaleDateString('az-AZ')
                          : '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#e5e7eb',
                            color: '#1f2937',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          Qeydlər
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div style={{ display: 'grid', gap: '24px', maxWidth: '720px' }}>
            <ExpenseForm
              form={expenseForm}
              onChange={setExpenseForm}
              onSubmit={handleCreateExpense}
              submitting={expenseSubmitting}
              error={expenseError}
            />
            <ExpensesList
              expenses={expenses}
              total={totalExpenses}
              loading={expensesLoading}
              title="Bugünkü xərclər"
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div style={{ maxWidth: '720px' }}>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(
                [
                  { id: 'today' as const, label: 'Bu gün' },
                  { id: 'week' as const, label: 'Həftə' },
                  { id: 'month' as const, label: 'Ay' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setHistoryPeriod(p.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: historyPeriod === p.id ? '#10b981' : 'white',
                    color: historyPeriod === p.id ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <ExpensesList
              expenses={expenses}
              total={totalExpenses}
              loading={expensesLoading}
              title="Xərclər tarixçəsi"
            />
          </div>
        )}

        {selectedOrder && (
          <OrderModal
            order={selectedOrder}
            notes={orderNotes}
            loading={orderDetailLoading}
            noteBody={noteBody}
            onNoteBodyChange={setNoteBody}
            onAddNote={handleAddNote}
            noteSubmitting={noteSubmitting}
            onClose={() => setSelectedOrder(null)}
            onComplete={
              selectedOrder.status !== 'completed'
                ? () => handleUpdateOrder(selectedOrder.id, 'completed')
                : undefined
            }
          />
        )}
      </main>
    </div>
  );
}

function OrdersTable({
  loading,
  orders,
  emptyMessage,
  onSelect,
}: {
  loading: boolean;
  orders: Order[];
  emptyMessage: string;
  onSelect: (o: Order) => void;
}) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {['Müştəri', 'Ünvan', 'Bidon', 'Qiymət', 'Əməliyyat'].map((h) => (
              <th
                key={h}
                style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                Yüklənir...
              </td>
            </tr>
          ) : orders.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontWeight: '500' }}>{order.name}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '12px' }}>
                  {order.address}
                </td>
                <td style={{ padding: '12px 16px' }}>{order.bidons_count}</td>
                <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                  ₼{order.price ? Number(order.price).toFixed(2) : '0.00'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={() => onSelect(order)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    Təfərrüat
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ExpenseForm({
  form,
  onChange,
  onSubmit,
  submitting,
  error,
}: {
  form: { amount: string; description: string; category: string };
  onChange: (f: typeof form) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string;
}) {
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      }}
    >
      <h2 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0' }}>Yeni xərc</h2>
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
            onChange={(e) => onChange({ ...form, amount: e.target.value })}
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
            onChange={(e) => onChange({ ...form, description: e.target.value })}
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
            onChange={(e) => onChange({ ...form, category: e.target.value })}
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
      {error && (
        <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '12px' }}>{error}</p>
      )}
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
          fontWeight: '600',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? 'Əlavə edilir...' : 'Xərc əlavə et'}
      </button>
    </form>
  );
}

function ExpensesList({
  expenses,
  total,
  loading,
  title,
}: {
  expenses: Expense[];
  total: number;
  loading: boolean;
  title: string;
}) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>{title}</h2>
        <span style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
          Cəmi: ₼{Number(total).toFixed(2)}
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
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>{exp.description}</p>
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
              <span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>
                ₼{Number(exp.amount).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderModal({
  order,
  notes,
  loading,
  noteBody,
  onNoteBodyChange,
  onAddNote,
  noteSubmitting,
  onClose,
  onComplete,
}: {
  order: Order;
  notes: OrderNote[];
  loading: boolean;
  noteBody: string;
  onNoteBodyChange: (v: string) => void;
  onAddNote: () => void;
  noteSubmitting: boolean;
  onClose: () => void;
  onComplete?: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Sifariş detallı</h2>

        <DetailRow label="Müştəri" value={order.name} />
        <DetailRow label="Ünvan" value={order.address} />
        <DetailRow label="Bidon sayı" value={String(order.bidons_count)} />
        <DetailRow
          label="Qiymət"
          value={`₼${order.price ? Number(order.price).toFixed(2) : '0.00'}`}
        />

        <div style={{ marginTop: '20px', marginBottom: '12px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: '0 0 8px 0' }}>
            Qeydlər
          </p>
          {loading ? (
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>Yüklənir...</p>
          ) : notes.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>Qeyd yoxdur</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
              {notes.map((note, i) => (
                <div
                  key={note.id ?? i}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${note.author_role === 'admin' ? '#3b82f6' : '#10b981'}`,
                  }}
                >
                  <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#6b7280' }}>
                    <strong>{note.author_name}</strong>
                    {' · '}
                    {authorRoleLabel(note.author_role)}
                    {note.created_at &&
                      ` · ${new Date(note.created_at).toLocaleString('az-AZ', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`}
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>{note.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <textarea
          placeholder="Qeyd yazın (məs. problem baş verdi)..."
          value={noteBody}
          onChange={(e) => onNoteBodyChange(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            fontSize: '14px',
            resize: 'vertical',
            boxSizing: 'border-box',
            marginBottom: '8px',
          }}
        />
        <button
          type="button"
          onClick={onAddNote}
          disabled={noteSubmitting || !noteBody.trim()}
          style={{
            padding: '8px 14px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: noteSubmitting || !noteBody.trim() ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            opacity: noteSubmitting || !noteBody.trim() ? 0.5 : 1,
            marginBottom: '20px',
          }}
        >
          {noteSubmitting ? 'Göndərilir...' : 'Qeyd əlavə et'}
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: onComplete ? '1fr 1fr' : '1fr', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              backgroundColor: '#e5e7eb',
              color: '#1f2937',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
            }}
          >
            Bağla
          </button>
          {onComplete && (
            <button
              onClick={onComplete}
              style={{
                padding: '10px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
              }}
            >
              ✅ Tamamla
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>{label}</p>
      <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>{value}</p>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e5e7eb',
        borderTop: `3px solid ${color}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 8px 0', fontWeight: '500' }}>
            {title}
          </p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', margin: 0 }}>{value}</p>
        </div>
        <div style={{ fontSize: '28px' }}>{icon}</div>
      </div>
    </div>
  );
}
