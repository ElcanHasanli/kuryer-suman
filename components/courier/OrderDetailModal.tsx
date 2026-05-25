'use client';

import { useEffect, useState } from 'react';
import {
  ApiError,
  completeOrder,
  getOrder,
  postOrderNote,
  startOrder,
} from '@/lib/api';
import { orderTotal, orderUnitPrice } from '@/lib/orderAmounts';
import type { CompleteOrderPayload, Order, OrderNote, PaymentType } from '@/lib/types';
import { authorRoleLabel, parseOrderNotes } from '@/lib/types';

interface OrderDetailModalProps {
  orderId: number;
  onClose: () => void;
  onUpdated: () => void;
}

function customerName(order: Order) {
  return order.name || order.customer_name || '—';
}

export default function OrderDetailModal({
  orderId,
  onClose,
  onUpdated,
}: OrderDetailModalProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [emptyBidons, setEmptyBidons] = useState('0');
  const [fullBidons, setFullBidons] = useState('');
  const [notes, setNotes] = useState('');
  const [orderNotes, setOrderNotes] = useState<OrderNote[]>([]);
  const [noteBody, setNoteBody] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  const refreshOrder = async () => {
    const data = await getOrder(orderId);
    setOrder(data);
    setOrderNotes(parseOrderNotes(data.notes));
    return data;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getOrder(orderId);
        if (!cancelled) {
          setOrder(data);
          setOrderNotes(parseOrderNotes(data.notes));
          const total = orderTotal(data);
          setAmountPaid(total > 0 ? String(total) : '');
          setFullBidons(String(data.bidons_count ?? data.full_bidons_given ?? 0));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Sifariş yüklənmədi');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const handleStart = async () => {
    setSubmitting(true);
    setError('');
    try {
      const updated = await startOrder(orderId);
      setOrder(updated);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xəta baş verdi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteBody.trim()) return;
    setNoteSubmitting(true);
    setError('');
    try {
      await postOrderNote(orderId, noteBody.trim());
      await refreshOrder();
      setNoteBody('');
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Qeyd əlavə edilmədi');
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const payload: CompleteOrderPayload = {
      payment_type: paymentType,
      amount_paid: paymentType === 'credit' ? 0 : parseFloat(amountPaid) || 0,
      empty_bidons_returned: parseInt(emptyBidons, 10) || 0,
      full_bidons_given: parseInt(fullBidons, 10) || 0,
      notes: notes.trim() || undefined,
    };
    try {
      await completeOrder(orderId, payload);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tamamlama uğursuz oldu');
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel: Record<string, string> = {
    pending: 'Gözləyir',
    assigned: 'Təyin edilib',
    in_progress: 'Yoldadır',
    completed: 'Tamamlanıb',
  };

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
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px', color: '#1f2937' }}>
          Sifariş #{orderId}
        </h2>

        {loading && <p style={{ color: '#6b7280' }}>Yüklənir...</p>}

        {error && (
          <div
            style={{
              marginBottom: '12px',
              padding: '10px',
              backgroundColor: '#fef2f2',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        {order && !showCompleteForm && (
          <>
            <DetailRow label="Müştəri" value={customerName(order)} />
            <DetailRow label="Ünvan" value={order.address} />
            <DetailRow label="Bidon" value={String(order.bidons_count)} />
            <DetailRow
              label="Ədəd qiyməti"
              value={`₼${orderUnitPrice(order).toFixed(2)}`}
            />
            <DetailRow label="Cəmi" value={`₼${orderTotal(order).toFixed(2)}`} />
            <DetailRow
              label="Status"
              value={statusLabel[order.status] || order.status}
            />
            {typeof order.notes === 'string' && order.notes && (
              <DetailRow label="Qeyd" value={order.notes} />
            )}

            <div style={{ marginTop: '16px', marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>
                Qeydlər
              </p>
              {orderNotes.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>Qeyd yoxdur</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {orderNotes.map((note, i) => (
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
              onChange={(e) => setNoteBody(e.target.value)}
              rows={2}
              style={{ ...inputStyle, minHeight: '56px', resize: 'vertical', marginBottom: '8px' }}
            />
            <button
              type="button"
              onClick={handleAddNote}
              disabled={noteSubmitting || !noteBody.trim()}
              style={{
                ...btnPrimary,
                flex: 'none',
                width: '100%',
                marginBottom: '16px',
                opacity: noteSubmitting || !noteBody.trim() ? 0.5 : 1,
              }}
            >
              {noteSubmitting ? 'Göndərilir...' : 'Qeyd əlavə et'}
            </button>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '8px',
                flexWrap: 'wrap',
              }}
            >
              <button type="button" onClick={onClose} style={btnSecondary}>
                Bağla
              </button>
              {order.status === 'assigned' && (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={submitting}
                  style={btnPrimary}
                >
                  {submitting ? '...' : '▶ Başladım'}
                </button>
              )}
              {order.status === 'in_progress' && (
                <button
                  type="button"
                  onClick={() => setShowCompleteForm(true)}
                  style={btnPrimary}
                >
                  ✅ Tamamladım
                </button>
              )}
            </div>
          </>
        )}

        {order && showCompleteForm && (
          <form onSubmit={handleComplete}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: 0 }}>
              {customerName(order)} — {order.address}
            </p>

            <label style={labelStyle}>
              Ödəniş növü
              <select
                value={paymentType}
                onChange={(e) => {
                  const type = e.target.value as PaymentType;
                  setPaymentType(type);
                  if (type === 'credit') {
                    setAmountPaid('0');
                  } else if (order) {
                    setAmountPaid(String(orderTotal(order)));
                  }
                }}
                style={inputStyle}
              >
                <option value="cash">Nağd</option>
                <option value="card">Kart</option>
                <option value="credit">Nisyə (borc)</option>
              </select>
            </label>

            <label style={labelStyle}>
              Ödənilən məbləğ (₼)
              <input
                type="number"
                step="0.01"
                min="0"
                value={paymentType === 'credit' ? '0' : amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                style={{
                  ...inputStyle,
                  ...(paymentType === 'credit'
                    ? { backgroundColor: '#f3f4f6', color: '#6b7280' }
                    : {}),
                }}
                disabled={paymentType === 'credit'}
                required
              />
              {paymentType === 'credit' && (
                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>
                  Nisyədə pul ödənilmir — borc müştəriyə yazılır
                </span>
              )}
            </label>

            <label style={labelStyle}>
              Qaytarılan boş bidon
              <input
                type="number"
                min="0"
                value={emptyBidons}
                onChange={(e) => setEmptyBidons(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Verilən dolu bidon
              <input
                type="number"
                min="0"
                value={fullBidons}
                onChange={(e) => setFullBidons(e.target.value)}
                style={inputStyle}
                required
              />
            </label>

            <label style={labelStyle}>
              Qeyd
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
                placeholder="İstəyə bağlı"
              />
            </label>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setShowCompleteForm(false)}
                style={btnSecondary}
                disabled={submitting}
              >
                Geri
              </button>
              <button type="submit" disabled={submitting} style={btnPrimary}>
                {submitting ? 'Göndərilir...' : 'Təsdiqlə'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ fontSize: '14px', margin: 0, color: '#1f2937', fontWeight: 500 }}>{value}</p>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '14px',
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '6px',
  padding: '10px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  fontSize: '14px',
  boxSizing: 'border-box',
};

const btnSecondary: React.CSSProperties = {
  flex: 1,
  padding: '10px 16px',
  backgroundColor: '#e5e7eb',
  color: '#1f2937',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '13px',
};

const btnPrimary: React.CSSProperties = {
  flex: 1,
  padding: '10px 16px',
  backgroundColor: '#10b981',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '13px',
};
