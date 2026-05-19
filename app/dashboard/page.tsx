'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function CourierDashboard() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [stats, setStats] = useState({
    pendingOrders: 0,
    completedToday: 0,
    totalDelivered: 0,
  });

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get all orders
        const ordersRes = await fetch('http://localhost:5001/api/orders', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const ordersData = await ordersRes.json();

        // Filter orders for this courier
        const courierOrders = ordersData.filter((o: any) => o.courier_id === user?.id);
        const pending = courierOrders.filter((o: any) => o.status !== 'completed');
        const completed = courierOrders.filter((o: any) => o.status === 'completed');

        setOrders(pending);
        setCompletedOrders(completed);

        setStats({
          pendingOrders: pending.length,
          completedToday: completed.length,
          totalDelivered: completed.length,
        });
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token && user?.id) {
      fetchData();
    }
  }, [token, user?.id]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleUpdateOrder = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`http://localhost:5001/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        // Refresh orders
        const ordersRes = await fetch('http://localhost:5001/api/orders', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const ordersData = await ordersRes.json();
        const courierOrders = ordersData.filter((o: any) => o.courier_id === user?.id);
        const pending = courierOrders.filter((o: any) => o.status !== 'completed');
        const completed = courierOrders.filter((o: any) => o.status === 'completed');

        setOrders(pending);
        setCompletedOrders(completed);
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Error updating order:', err);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Sidebar */}
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
        {/* Logo */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>💧</div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px 0', color: '#1f2937' }}>
            SuMan
          </h1>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
            Kuryer Panel
          </p>
        </div>

        {/* User Info */}
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
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, wordBreak: 'break-all' }}>
            {user.email}
          </p>
        </div>

        {/* Navigation */}
        <nav style={{ marginBottom: '32px' }}>
          {[
            { id: 'orders', label: '📦 Sifarişlər' },
            { id: 'completed', label: '✅ Tamamlanan' },
            { id: 'history', label: '📈 Tarixçə' },
          ].map((item) => (
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
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== item.id) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout Button */}
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
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fecaca';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fee2e2';
          }}
        >
          🚪 Çıxış
        </button>
      </aside>

      {/* Main Content */}
      <main
        style={{
          marginLeft: '280px',
          flex: 1,
          padding: '32px',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: '#1f2937' }}>
            {activeTab === 'orders' && 'Gözləyən Sifarişlər'}
            {activeTab === 'completed' && 'Tamamlanan Sifarişlər'}
            {activeTab === 'history' && 'Tarixçə'}
          </h1>
        </div>

        {/* Stats */}
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

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse' as const,
                  fontSize: '13px',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                      Müştəri
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                      Ünvan
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                      Bidon
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                      Qiymət
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                      Əməliyyat
                    </th>
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
                        Gözləyən sifariş yoxdur
                      </td>
                    </tr>
                  ) : (
                    orders.map((order: any) => (
                      <tr
                        key={order.id}
                        style={{ borderBottom: '1px solid #e5e7eb' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{ padding: '12px 16px', color: '#1f2937', fontWeight: '500' }}>
                          {order.name}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '12px' }}>
                          {order.address}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#1f2937' }}>
                          {order.bidons_count}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#1f2937', fontWeight: '600' }}>
                          ₼{order.price ? order.price.toFixed(2) : '0.00'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => setSelectedOrder(order)}
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
          </div>
        )}

        {/* Completed Tab */}
        {activeTab === 'completed' && (
          <div>
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse' as const,
                  fontSize: '13px',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                      Müştəri
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                      Ödəniş
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                      Boş Bidon
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                      Dolu Bidon
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                      Tarix
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                        Tamamlanan sifariş yoxdur
                      </td>
                    </tr>
                  ) : (
                    completedOrders.map((order: any) => (
                      <tr key={order.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px 16px', color: '#1f2937', fontWeight: '500' }}>
                          {order.name}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#1f2937' }}>
                          {order.payment_type || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#1f2937' }}>
                          {order.empty_bidons_returned}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#1f2937' }}>
                          {order.full_bidons_given}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '12px' }}>
                          {order.completed_at ? new Date(order.completed_at).toLocaleDateString('az-AZ') : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              color: '#6b7280',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            📊 Tarixçə funksiyası hazırlanır...
          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setSelectedOrder(null)}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1f2937' }}>
                Sifariş Detallı
              </h2>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Müştəri</p>
                <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#1f2937' }}>
                  {selectedOrder.name}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Ünvan</p>
                <p style={{ fontSize: '14px', margin: 0, color: '#1f2937' }}>
                  {selectedOrder.address}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Bidon Sayı</p>
                <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#1f2937' }}>
                  {selectedOrder.bidons_count}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Qiymət</p>
                <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#1f2937' }}>
                  ₼{selectedOrder.price ? selectedOrder.price.toFixed(2) : '0.00'}
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginTop: '24px',
                }}
              >
                <button
                  onClick={() => setSelectedOrder(null)}
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
                <button
                  onClick={() => handleUpdateOrder(selectedOrder.id, 'completed')}
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
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
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
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
            {value}
          </p>
        </div>
        <div style={{ fontSize: '28px' }}>{icon}</div>
      </div>
    </div>
  );
}