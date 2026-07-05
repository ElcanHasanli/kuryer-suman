'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import OrderDetailModal from '@/components/courier/OrderDetailModal';
import DateFilterBar from '@/components/courier/DateFilterBar';
import ExpensesSection from '@/components/courier/ExpensesSection';
import WarehouseSection from '@/components/courier/WarehouseSection';
import {
  downloadBlob,
  getExpenses,
  getNotifications,
  getCompletedOrders,
  getOrders,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api';
import { formatEditTimeRemaining, isCourierEditable } from '@/lib/courierEdit';
import {
  getEffectiveDateRange,
  matchesHistoryFilter,
  todayInputDate,
  yesterdayInputDate,
} from '@/lib/dates';
import type { DateRange } from '@/lib/dates';
import { buildExportFilename, buildHistoryExportBlob } from '@/lib/exportHistory';
import { orderRevenue, orderTotal, parseAmount } from '@/lib/orderAmounts';
import type { DateFilterPeriod, ExpensesResponse, Notification, Order } from '@/lib/types';
import { getOrderStatusLabel, getOrderTypeLabel, getPaymentTypeLabel, isPickupOrder } from '@/lib/utils';

type TabId = 'orders' | 'completed' | 'warehouse' | 'expenses' | 'history' | 'notifications';

const NAV_ITEMS: {
  id: TabId;
  label: string;
  short: string;
  icon: string;
}[] = [
  { id: 'orders', label: '📦 Aktiv sifarişlər', short: 'Sifariş', icon: '📦' },
  { id: 'completed', label: '✅ Tamamlanan', short: 'Bitmiş', icon: '✅' },
  { id: 'warehouse', label: '💧 Su doldurma', short: 'Anbar', icon: '💧' },
  { id: 'expenses', label: '💰 Əlavə xərclər', short: 'Xərc', icon: '💰' },
  { id: 'history', label: '📈 Tarixçə', short: 'Tarix', icon: '📈' },
  { id: 'notifications', label: '🔔 Bildirişlər', short: 'Bildir', icon: '🔔' },
];

const PAGE_TITLES: Record<TabId, string> = {
  orders: 'Aktiv Sifarişlər',
  completed: 'Tamamlanan Sifarişlər',
  warehouse: 'Su doldurma',
  expenses: 'Əlavə xərclər',
  history: 'Tarixçə',
  notifications: 'Bildirişlər',
};

function customerName(order: Order) {
  return order.name || order.customer_name || '—';
}

function statusLabel(status: string) {
  return getOrderStatusLabel(status);
}

function paymentLabel(type?: string | null) {
  return getPaymentTypeLabel(type);
}

function paymentSummary(order: Order) {
  if (isPickupOrder(order)) return getOrderTypeLabel('pickup');
  const label = paymentLabel(order.payment_type);
  if (order.payment_type === 'credit') return label;
  const paid = parseAmount(order.amount_paid);
  const total = orderTotal(order);
  const remaining = parseAmount(order.remaining_amount);
  if (!order.is_paid && remaining > 0) {
    return `${label} · ₼${paid.toFixed(2)} / ₼${total.toFixed(2)}`;
  }
  return `${label} · ₼${paid.toFixed(2)}`;
}

function OrderTypeBadge({ order }: { order: Order }) {
  const pickup = isPickupOrder(order);
  return (
    <span className={`order-type-badge order-type-badge--${pickup ? 'pickup' : 'delivery'}`}>
      {pickup ? '📦 Boş bidon' : '💧 Çatdırılma'}
    </span>
  );
}

function isToday(dateStr?: string) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function CourierDashboard() {
  const { user, token, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('orders');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderEditMode, setOrderEditMode] = useState(false);
  const [historyPeriod, setHistoryPeriod] = useState<DateFilterPeriod>('today');
  const [historyCustomStart, setHistoryCustomStart] = useState(yesterdayInputDate());
  const [historyCustomEnd, setHistoryCustomEnd] = useState(todayInputDate());
  const [exporting, setExporting] = useState(false);

  const historyCustomRange: DateRange = {
    startDate: historyCustomStart,
    endDate: historyCustomEnd,
  };

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [ordersData, completedData, notifData] = await Promise.all([
        getOrders(),
        getCompletedOrders().catch(() => [] as Order[]),
        getNotifications().catch(() => [] as Notification[]),
      ]);
      const active = ordersData.filter((o) => o.status !== 'completed');
      const completed =
        completedData.length > 0
          ? completedData
          : ordersData.filter((o) => o.status === 'completed');
      setActiveOrders(active);
      setCompletedOrders(completed);
      setNotifications(notifData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user && user.role !== 'courier') {
      logout();
      router.replace('/login');
    }
  }, [isAuthenticated, user, router, logout]);

  useEffect(() => {
    if (token && user?.role === 'courier') {
      refresh();
    }
  }, [token, user?.role, refresh]);

  useEffect(() => {
    setMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const completedToday = completedOrders.filter((o) => isToday(o.completed_at)).length;

  const historyOrders = completedOrders.filter((o) =>
    matchesHistoryFilter(o.completed_at, historyPeriod, historyCustomRange)
  );

  const historyRevenue = historyOrders.reduce((sum, o) => sum + orderRevenue(o), 0);

  const selectTab = (tab: TabId) => {
    setActiveTab(tab);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleMarkRead = async (id: number) => {
    await markNotificationRead(id);
    refresh();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    refresh();
  };

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const dateRange = getEffectiveDateRange(historyPeriod, historyCustomRange);
      const expensesData = await getExpenses().catch(
        () => ({ expenses: [], totalExpenses: 0 }) as ExpensesResponse
      );
      const allExpenses = expensesData.expenses ?? [];
      const filteredExpenses = allExpenses.filter((exp) =>
        matchesHistoryFilter(exp.created_at, historyPeriod, historyCustomRange)
      );
      const blob = buildHistoryExportBlob({
        courierName: user.name,
        dateRange,
        orders: historyOrders,
        expenses: filteredExpenses,
      });
      downloadBlob(blob, buildExportFilename(user.name, dateRange));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Export uğursuz oldu');
    } finally {
      setExporting(false);
    }
  };

  if (!user) return null;

  const renderNav = (variant: 'sidebar' | 'mobile') =>
    NAV_ITEMS.map((item) => {
      const isActive = activeTab === item.id;
      const badge = item.id === 'notifications' ? unreadCount : 0;
      return (
        <button
          key={`${variant}-${item.id}`}
          type="button"
          onClick={() => selectTab(item.id)}
          className={`courier-nav__item ${isActive ? 'is-active' : ''}`}
        >
          <span>{variant === 'sidebar' ? item.label : `${item.icon} ${item.short}`}</span>
          {badge > 0 && <span className="courier-nav__badge">{badge}</span>}
        </button>
      );
    });

  return (
    <div className="courier-app">
      <div
        className={`courier-sidebar-backdrop ${menuOpen ? 'is-visible' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />

      <aside className={`courier-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="courier-sidebar__brand">
          <div className="courier-sidebar__logo">💧</div>
          <h1 className="courier-sidebar__title">SuMan</h1>
          <p className="courier-sidebar__subtitle">Kuryer Panel</p>
        </div>

        <div className="courier-user-box">
          <p className="courier-user-box__label">Daxil olmuş:</p>
          <p className="courier-user-box__name">{user.name}</p>
          {user.company_name && (
            <p className="courier-user-box__company">{user.company_name}</p>
          )}
          <p className="courier-user-box__email">{user.email}</p>
        </div>

        <nav className="courier-nav courier-nav--desktop-only">{renderNav('sidebar')}</nav>

        <button
          type="button"
          onClick={handleLogout}
          className="courier-btn courier-btn--danger courier-btn--block courier-sidebar__logout"
        >
          🚪 Çıxış
        </button>
      </aside>

      <main className="courier-main">
        <div className="courier-topbar">
          <button
            type="button"
            className="courier-btn courier-topbar__menu"
            onClick={() => setMenuOpen(true)}
            aria-label="Menyu"
          >
            ☰
          </button>
          <h1 className="courier-topbar__title">{PAGE_TITLES[activeTab]}</h1>
          <button type="button" className="courier-btn" onClick={() => refresh()}>
            ↻
          </button>
        </div>

        <header className="courier-page-header">
          <h1 className="courier-page-header__title">{PAGE_TITLES[activeTab]}</h1>
          <button type="button" className="courier-btn" onClick={() => refresh()}>
            ↻ Yenilə
          </button>
        </header>

        {activeTab !== 'notifications' && activeTab !== 'warehouse' && (
          <div className="courier-stats">
            <StatCard title="Aktiv" value={activeOrders.length} icon="📦" color="#f59e0b" />
            <StatCard title="Bugün tamamlanan" value={completedToday} icon="✅" color="#10b981" />
            <StatCard title="Son 24 saat" value={completedOrders.length} icon="🚚" color="#3b82f6" />
            {activeTab === 'history' && (
              <StatCard
                title="Seçilmiş dövr gəliri"
                value={`₼${historyRevenue.toFixed(2)}`}
                icon="💰"
                color="#8b5cf6"
              />
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <OrdersList
            orders={activeOrders}
            loading={loading}
            emptyText="Aktiv sifariş yoxdur"
            showStatus
            onOpen={(id) => setSelectedOrderId(id)}
          />
        )}

        {activeTab === 'completed' && (
          <OrdersList
            orders={completedOrders}
            loading={loading}
            emptyText="Son 24 saatda tamamlanan sifariş yoxdur"
            completed
            onOpen={(id) => {
              setOrderEditMode(false);
              setSelectedOrderId(id);
            }}
            onEdit={(id) => {
              setOrderEditMode(true);
              setSelectedOrderId(id);
            }}
          />
        )}

        {activeTab === 'warehouse' && <WarehouseSection />}

        {activeTab === 'expenses' && (
          <ExpensesSection period="today" showForm title="Bugünkü xərclər" />
        )}

        {activeTab === 'history' && (
          <div>
            <div className="courier-toolbar courier-toolbar--export">
              <DateFilterBar
                period={historyPeriod}
                onPeriodChange={setHistoryPeriod}
                customStartDate={historyCustomStart}
                customEndDate={historyCustomEnd}
                onCustomStartChange={setHistoryCustomStart}
                onCustomEndChange={setHistoryCustomEnd}
              />
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="courier-btn courier-btn--primary courier-toolbar__spacer"
              >
                {exporting ? 'Export...' : '📥 Excel'}
              </button>
            </div>
            <OrdersList
              orders={historyOrders}
              loading={loading}
              emptyText="Bu dövrdə sifariş yoxdur"
              completed
            />
            <h2 className="courier-section-title courier-section-title--spaced">
              Əlavə xərclər (tarixçə)
            </h2>
            <ExpensesSection
              period={historyPeriod}
              customRange={historyCustomRange}
              title="Seçilmiş dövr"
            />
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="courier-panel">
            {unreadCount > 0 && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="courier-btn"
                  style={{ border: 'none', color: '#10b981', padding: 0 }}
                >
                  Hamısını oxunmuş et
                </button>
              </div>
            )}
            {notifications.length === 0 ? (
              <p className="courier-empty">Bildiriş yoxdur</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-list__item ${n.read ? '' : 'notif-list__item--unread'}`}
                >
                  <div>
                    <p className="notif-list__message">{n.message}</p>
                    <p className="notif-list__time">
                      {new Date(n.created_at).toLocaleString('az-AZ')}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      className="courier-btn"
                      style={{ flexShrink: 0, fontSize: '11px' }}
                    >
                      Oxundu
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {selectedOrderId !== null && (
          <OrderDetailModal
            orderId={selectedOrderId}
            onClose={() => {
              setSelectedOrderId(null);
              setOrderEditMode(false);
            }}
            onUpdated={refresh}
            initialEditMode={orderEditMode}
          />
        )}
      </main>

      <nav className="courier-bottom-nav" aria-label="Əsas naviqasiya">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const badge = item.id === 'notifications' ? unreadCount : 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={`courier-bottom-nav__item ${isActive ? 'is-active' : ''}`}
            >
              <span className="courier-bottom-nav__wrap">
                <span className="courier-bottom-nav__icon">{item.icon}</span>
                {badge > 0 && <span className="courier-bottom-nav__badge">{badge}</span>}
              </span>
              <span>{item.short}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function OrdersList({
  orders,
  loading,
  emptyText,
  showStatus,
  completed,
  onOpen,
  onEdit,
}: {
  orders: Order[];
  loading: boolean;
  emptyText: string;
  showStatus?: boolean;
  completed?: boolean;
  onOpen?: (id: number) => void;
  onEdit?: (id: number) => void;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return <p className="courier-empty courier-panel courier-panel--padded">Yüklənir...</p>;
  }

  if (orders.length === 0) {
    return <p className="courier-empty courier-panel courier-panel--padded">{emptyText}</p>;
  }

  return (
    <div className="courier-panel">
      <div className="orders-table-wrap">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Müştəri</th>
              <th>Ünvan</th>
              {!completed && <th>Növ</th>}
              {!completed && <th>Bidon</th>}
              {!completed && <th>Cəmi (₼)</th>}
              {showStatus && <th>Status</th>}
              {completed && <th>Ödəniş</th>}
              {completed && <th>Boş / Dolu</th>}
              {completed && <th>Tarix</th>}
              {completed && onEdit && <th>Düzəliş</th>}
              {onOpen && <th>Əməliyyat</th>}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="cell-strong">
                  {customerName(order)}
                </td>
                <td className="cell-muted">{order.address}</td>
                {!completed && (
                  <td>
                    <OrderTypeBadge order={order} />
                  </td>
                )}
                {!completed && <td>{order.bidons_count}</td>}
                {!completed && (
                  <td className="cell-strong">
                    {isPickupOrder(order) ? '—' : `₼${orderTotal(order).toFixed(2)}`}
                  </td>
                )}
                {showStatus && <td>{statusLabel(order.status)}</td>}
                {completed && <td>{paymentSummary(order)}</td>}
                {completed && (
                  <td>
                    {isPickupOrder(order)
                      ? `${order.empty_bidons_returned ?? 0} boş`
                      : `${order.empty_bidons_returned ?? 0} / ${order.full_bidons_given ?? order.bidons_count}`}
                  </td>
                )}
                {completed && (
                  <td className="cell-muted">
                    {order.completed_at
                      ? new Date(order.completed_at).toLocaleDateString('az-AZ')
                      : '—'}
                  </td>
                )}
                {completed && onEdit && (
                  <td>
                    {isCourierEditable(order) ? (
                      <span className="courier-edit-badge">
                        {formatEditTimeRemaining(order.courier_editable_until, now) ?? '—'}
                      </span>
                    ) : (
                      <span className="cell-muted">—</span>
                    )}
                  </td>
                )}
                {onOpen && (
                  <td>
                    <div className="orders-table__actions">
                      <button
                        type="button"
                        onClick={() => onOpen(order.id)}
                        className="courier-btn courier-btn--primary"
                      >
                        Aç
                      </button>
                      {onEdit && isCourierEditable(order) && (
                        <button
                          type="button"
                          onClick={() => onEdit(order.id)}
                          className="courier-btn"
                        >
                          Düzəlt
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="orders-cards">
        {orders.map((order) => (
          <article key={order.id} className="order-card">
            <div className="order-card__head">
              <h3 className="order-card__name">{customerName(order)}</h3>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <OrderTypeBadge order={order} />
                {showStatus && (
                  <span className="courier-btn" style={{ fontSize: '11px', padding: '4px 8px' }}>
                    {statusLabel(order.status)}
                  </span>
                )}
              </div>
            </div>
            <dl className="order-card__meta">
              <div>
                <dt>Ünvan</dt>
                <dd>{order.address}</dd>
              </div>
              {!completed && (
                <>
                  <div>
                    <dt>Bidon</dt>
                    <dd>{order.bidons_count}</dd>
                  </div>
                  {!isPickupOrder(order) && (
                    <div>
                      <dt>Cəmi</dt>
                      <dd>₼{orderTotal(order).toFixed(2)}</dd>
                    </div>
                  )}
                </>
              )}
              {completed && (
                <>
                  <div>
                    <dt>Ödəniş</dt>
                    <dd>{paymentSummary(order)}</dd>
                  </div>
                  <div>
                    <dt>{isPickupOrder(order) ? 'Götürülən boş' : 'Boş / Dolu'}</dt>
                    <dd>
                      {isPickupOrder(order)
                        ? `${order.empty_bidons_returned ?? 0} boş`
                        : `${order.empty_bidons_returned ?? 0} / ${order.full_bidons_given ?? order.bidons_count}`}
                    </dd>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <dt>Tarix</dt>
                    <dd>
                      {order.completed_at
                        ? new Date(order.completed_at).toLocaleDateString('az-AZ')
                        : '—'}
                    </dd>
                  </div>
                  {onEdit && isCourierEditable(order) && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <dt>Düzəlişə qalan</dt>
                      <dd className="courier-edit-badge">
                        {formatEditTimeRemaining(order.courier_editable_until, now) ?? '—'}
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
            {(onOpen || onEdit) && (
              <div className="order-card__actions">
                {onOpen && (
                  <button
                    type="button"
                    onClick={() => onOpen(order.id)}
                    className="courier-btn courier-btn--primary courier-btn--block"
                  >
                    Aç
                  </button>
                )}
                {onEdit && isCourierEditable(order) && (
                  <button
                    type="button"
                    onClick={() => onEdit(order.id)}
                    className="courier-btn courier-btn--block"
                  >
                    ✏️ Düzəlt
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
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
    <div className="courier-stat-card" style={{ ['--stat-color' as string]: color }}>
      <div className="courier-stat-card__row">
        <div>
          <p className="courier-stat-card__label">{title}</p>
          <p className="courier-stat-card__value">{value}</p>
        </div>
        <div className="courier-stat-card__icon">{icon}</div>
      </div>
    </div>
  );
}
