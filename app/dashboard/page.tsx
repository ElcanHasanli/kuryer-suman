'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import OrderDetailModal from '@/components/courier/OrderDetailModal';
import {
  downloadBlob,
  exportCourierHistory,
  getNotifications,
  getCompletedOrders,
  getOrders,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api';
import { orderRevenue, orderTotal } from '@/lib/orderAmounts';
import type { HistoryPeriod, Notification, Order } from '@/lib/types';

type TabId = 'orders' | 'completed' | 'history' | 'notifications';

function customerName(order: Order) {
  return order.name || order.customer_name || '—';
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'Gözləyir',
    assigned: 'Təyin edilib',
    in_progress: 'Yoldadır',
    completed: 'Tamamlanıb',
  };
  return map[status] || status;
}

function paymentLabel(type?: string | null) {
  const map: Record<string, string> = {
    cash: 'Nağd',
    card: 'Kart',
    credit: 'Nisyə',
  };
  return type ? map[type] || type : '—';
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
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>('week');
  const [exporting, setExporting] = useState(false);

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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const completedToday = completedOrders.filter((o) => isToday(o.completed_at)).length;

  const historyOrders = completedOrders.filter((o) => {
    if (!o.completed_at) return false;
    const d = new Date(o.completed_at);
    const now = new Date();
    if (historyPeriod === 'today') return isToday(o.completed_at);
    if (historyPeriod === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    if (historyPeriod === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return d >= monthAgo;
    }
    return true;
  });

  const historyRevenue = historyOrders.reduce((sum, o) => sum + orderRevenue(o), 0);

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
    if (!user?.id) return;
    setExporting(true);
    try {
      const blob = await exportCourierHistory(user.id, historyPeriod);
      downloadBlob(blob, `tarixce-${historyPeriod}.xlsx`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Export uğursuz oldu');
    } finally {
      setExporting(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <aside style={sidebarStyle}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>💧</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px', color: '#1f2937' }}>SuMan</h1>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>Kuryer Panel</p>
        </div>

        <div style={userBoxStyle}>
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase' }}>
            Daxil olmuş:
          </p>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937', margin: '0 0 2px' }}>{user.name}</p>
          {user.company_name && (
            <p style={{ fontSize: '12px', color: '#059669', margin: '0 0 4px', fontWeight: 500 }}>
              {user.company_name}
            </p>
          )}
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, wordBreak: 'break-all' }}>{user.email}</p>
        </div>

        <nav style={{ marginBottom: '32px' }}>
          {(
            [
              { id: 'orders' as const, label: '📦 Aktiv sifarişlər' },
              { id: 'completed' as const, label: '✅ Tamamlanan' },
              { id: 'history' as const, label: '📈 Tarixçə' },
              { id: 'notifications' as const, label: '🔔 Bildirişlər', badge: unreadCount },
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
                fontWeight: activeTab === item.id ? 600 : 500,
                color: activeTab === item.id ? '#1f2937' : '#6b7280',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{item.label}</span>
              {'badge' in item && item.badge > 0 && (
                <span
                  style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <button onClick={handleLogout} style={logoutBtnStyle}>
          🚪 Çıxış
        </button>
      </aside>

      <main style={mainStyle}>
        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: '#1f2937' }}>
            {activeTab === 'orders' && 'Aktiv Sifarişlər'}
            {activeTab === 'completed' && 'Tamamlanan Sifarişlər'}
            {activeTab === 'history' && 'Tarixçə'}
            {activeTab === 'notifications' && 'Bildirişlər'}
          </h1>
          <button
            onClick={() => refresh()}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            ↻ Yenilə
          </button>
        </header>

        {activeTab !== 'notifications' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '20px',
              marginBottom: '32px',
            }}
          >
            <StatCard title="Aktiv" value={activeOrders.length} icon="📦" color="#f59e0b" />
            <StatCard title="Bugün tamamlanan" value={completedToday} icon="✅" color="#10b981" />
            <StatCard title="Ümumi tamamlanan" value={completedOrders.length} icon="🚚" color="#3b82f6" />
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
          <OrdersTable
            orders={activeOrders}
            loading={loading}
            emptyText="Aktiv sifariş yoxdur"
            showStatus
            onOpen={(id) => setSelectedOrderId(id)}
          />
        )}

        {activeTab === 'completed' && (
          <OrdersTable
            orders={completedOrders}
            loading={loading}
            emptyText="Tamamlanan sifariş yoxdur"
            completed
          />
        )}

        {activeTab === 'history' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {(['today', 'week', 'month'] as HistoryPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setHistoryPeriod(p)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: historyPeriod === p ? '2px solid #10b981' : '1px solid #e5e7eb',
                    background: historyPeriod === p ? '#ecfdf5' : 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: historyPeriod === p ? 600 : 400,
                  }}
                >
                  {p === 'today' ? 'Bu gün' : p === 'week' ? 'Həftə' : 'Ay'}
                </button>
              ))}
              <button
                onClick={handleExport}
                disabled={exporting}
                style={{
                  marginLeft: 'auto',
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: exporting ? 'wait' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {exporting ? 'Export...' : '📥 Excel'}
              </button>
            </div>
            <OrdersTable orders={historyOrders} loading={loading} emptyText="Bu dövrdə sifariş yoxdur" completed />
          </div>
        )}

        {activeTab === 'notifications' && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            {unreadCount > 0 && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    fontSize: '13px',
                    color: '#10b981',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Hamısını oxunmuş et
                </button>
              </div>
            )}
            {notifications.length === 0 ? (
              <p style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>Bildiriş yoxdur</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: n.read ? 'white' : '#f0fdf4',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>{n.message}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9ca3af' }}>
                      {new Date(n.created_at).toLocaleString('az-AZ')}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      style={{
                        flexShrink: 0,
                        padding: '6px 10px',
                        fontSize: '11px',
                        border: '1px solid #10b981',
                        color: '#10b981',
                        background: 'white',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
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
            onClose={() => setSelectedOrderId(null)}
            onUpdated={refresh}
          />
        )}
      </main>
    </div>
  );
}

function OrdersTable({
  orders,
  loading,
  emptyText,
  showStatus,
  completed,
  onOpen,
}: {
  orders: Order[];
  loading: boolean;
  emptyText: string;
  showStatus?: boolean;
  completed?: boolean;
  onOpen?: (id: number) => void;
}) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <th style={thStyle}>Müştəri</th>
            <th style={thStyle}>Ünvan</th>
            {!completed && <th style={thStyle}>Bidon</th>}
            {!completed && <th style={thStyle}>Cəmi (₼)</th>}
            {showStatus && <th style={thStyle}>Status</th>}
            {completed && <th style={thStyle}>Ödəniş</th>}
            {completed && <th style={thStyle}>Boş / Dolu</th>}
            {completed && <th style={thStyle}>Tarix</th>}
            {onOpen && <th style={thStyle}>Əməliyyat</th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                Yüklənir...
              </td>
            </tr>
          ) : orders.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                {emptyText}
              </td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={tdStyle}>{customerName(order)}</td>
                <td style={{ ...tdStyle, fontSize: '12px', color: '#6b7280' }}>{order.address}</td>
                {!completed && <td style={tdStyle}>{order.bidons_count}</td>}
                {!completed && (
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    ₼{orderTotal(order).toFixed(2)}
                  </td>
                )}
                {showStatus && <td style={tdStyle}>{statusLabel(order.status)}</td>}
                {completed && <td style={tdStyle}>{paymentLabel(order.payment_type)}</td>}
                {completed && (
                  <td style={tdStyle}>
                    {order.empty_bidons_returned ?? 0} / {order.full_bidons_given ?? order.bidons_count}
                  </td>
                )}
                {completed && (
                  <td style={{ ...tdStyle, fontSize: '12px', color: '#6b7280' }}>
                    {order.completed_at
                      ? new Date(order.completed_at).toLocaleDateString('az-AZ')
                      : '—'}
                  </td>
                )}
                {onOpen && (
                  <td style={tdStyle}>
                    <button
                      onClick={() => onOpen(order.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      Aç
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
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
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 8px', fontWeight: 500 }}>{title}</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937', margin: 0 }}>{value}</p>
        </div>
        <div style={{ fontSize: '28px' }}>{icon}</div>
      </div>
    </div>
  );
}

const sidebarStyle: React.CSSProperties = {
  width: '280px',
  backgroundColor: '#ffffff',
  borderRight: '1px solid #e5e7eb',
  padding: '24px 20px',
  position: 'fixed',
  height: '100vh',
  overflowY: 'auto',
};

const mainStyle: React.CSSProperties = {
  marginLeft: '280px',
  flex: 1,
  padding: '32px',
  overflowY: 'auto',
};

const userBoxStyle: React.CSSProperties = {
  padding: '12px 16px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  marginBottom: '24px',
  borderLeft: '3px solid #10b981',
};

const logoutBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  backgroundColor: '#fee2e2',
  color: '#dc2626',
  border: '1px solid #fecaca',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#6b7280',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  color: '#1f2937',
};
