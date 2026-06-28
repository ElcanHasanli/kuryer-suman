'use client';

import { useEffect, useState } from 'react';
import {
  ApiError,
  completeOrder,
  getOrder,
  postOrderNote,
  startOrder,
  updateOrderCompletion,
} from '@/lib/api';
import {
  completionErrorMessage,
  formatEditTimeRemaining,
  isCourierEditable,
} from '@/lib/courierEdit';
import { orderTotal, orderUnitPrice } from '@/lib/orderAmounts';
import type { CompleteOrderPayload, Order, OrderNote, PaymentType } from '@/lib/types';
import { authorRoleLabel, parseOrderNotes } from '@/lib/types';

interface OrderDetailModalProps {
  orderId: number;
  onClose: () => void;
  onUpdated: () => void;
  initialEditMode?: boolean;
}

function customerName(order: Order) {
  return order.name || order.customer_name || '—';
}

function paymentLabel(type?: string | null) {
  const map: Record<string, string> = {
    cash: 'Nağd',
    card: 'Kart',
    credit: 'Nisyə',
  };
  return type ? map[type] || type : '—';
}

function fillCompletionForm(order: Order, setters: {
  setPaymentType: (v: PaymentType) => void;
  setAmountPaid: (v: string) => void;
  setEmptyBidons: (v: string) => void;
  setFullBidons: (v: string) => void;
  setNotes: (v: string) => void;
  setPrice: (v: string) => void;
}) {
  const total = orderTotal(order);
  setters.setPaymentType((order.payment_type as PaymentType) || 'cash');
  setters.setAmountPaid(
    String(order.amount_paid != null && order.amount_paid !== '' ? order.amount_paid : total > 0 ? total : '')
  );
  setters.setEmptyBidons(String(order.empty_bidons_returned ?? 0));
  setters.setFullBidons(String(order.full_bidons_given ?? order.bidons_count ?? 0));
  setters.setNotes(typeof order.notes === 'string' ? order.notes : '');
  setters.setPrice(String(order.price ?? total));
}

export default function OrderDetailModal({
  orderId,
  onClose,
  onUpdated,
  initialEditMode = false,
}: OrderDetailModalProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [price, setPrice] = useState('');
  const [emptyBidons, setEmptyBidons] = useState('0');
  const [fullBidons, setFullBidons] = useState('');
  const [notes, setNotes] = useState('');
  const [orderNotes, setOrderNotes] = useState<OrderNote[]>([]);
  const [noteBody, setNoteBody] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const refreshOrder = async () => {
    const data = await getOrder(orderId);
    setOrder(data);
    setOrderNotes(parseOrderNotes(data.notes));
    return data;
  };

  const openCompletionForm = (edit: boolean, data: Order) => {
    fillCompletionForm(data, {
      setPaymentType,
      setAmountPaid,
      setEmptyBidons,
      setFullBidons,
      setNotes,
      setPrice,
    });
    setIsEditMode(edit);
    setShowCompleteForm(true);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getOrder(orderId);
        if (!cancelled) {
          setOrder(data);
          setOrderNotes(parseOrderNotes(data.notes));
          if (initialEditMode && isCourierEditable(data)) {
            openCompletionForm(true, data);
          } else {
            const total = orderTotal(data);
            setAmountPaid(total > 0 ? String(total) : '');
            setFullBidons(String(data.bidons_count ?? data.full_bidons_given ?? 0));
            setPrice(String(data.price ?? total));
          }
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
  }, [orderId, initialEditMode]);

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
      if (isEditMode) {
        await updateOrderCompletion(orderId, {
          ...payload,
          price: parseFloat(price) || 0,
        });
      } else {
        await completeOrder(orderId, payload);
      }
      onUpdated();
      onClose();
    } catch (err) {
      setError(completionErrorMessage(err, isEditMode ? 'Düzəliş uğursuz oldu' : 'Tamamlama uğursuz oldu'));
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

  const editRemaining =
    order && isCourierEditable(order)
      ? formatEditTimeRemaining(order.courier_editable_until, now)
      : null;

  return (
    <div className="courier-modal-overlay" onClick={onClose}>
      <div className="courier-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="courier-modal__title">
          {isEditMode ? `Sifarişi düzəlt #${orderId}` : `Sifariş #${orderId}`}
        </h2>

        {loading && <p className="courier-empty">Yüklənir...</p>}

        {error && <div className="courier-error-box">{error}</div>}

        {order && editRemaining && !showCompleteForm && (
          <p className="courier-edit-window">
            Düzəlişə qalan: <strong>{editRemaining}</strong>
          </p>
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
            {order.status === 'completed' && (
              <>
                <DetailRow label="Ödəniş" value={paymentLabel(order.payment_type)} />
                <DetailRow
                  label="Ödənilən"
                  value={
                    order.payment_type === 'credit'
                      ? 'Nisyə (borc)'
                      : `₼${Number(order.amount_paid ?? 0).toFixed(2)}`
                  }
                />
                <DetailRow
                  label="Boş / Dolu bidon"
                  value={`${order.empty_bidons_returned ?? 0} / ${order.full_bidons_given ?? order.bidons_count}`}
                />
                {order.completed_at && (
                  <DetailRow
                    label="Tamamlanma"
                    value={new Date(order.completed_at).toLocaleString('az-AZ')}
                  />
                )}
              </>
            )}
            {typeof order.notes === 'string' && order.notes && (
              <DetailRow label="Qeyd" value={order.notes} />
            )}

            <div className="courier-notes-block">
              <p className="courier-notes-block__title">Qeydlər</p>
              {orderNotes.length === 0 ? (
                <p className="courier-empty" style={{ padding: '8px 0' }}>
                  Qeyd yoxdur
                </p>
              ) : (
                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  {orderNotes.map((note, i) => (
                    <div
                      key={note.id ?? i}
                      className={`courier-note-item ${note.author_role === 'admin' ? 'courier-note-item--admin' : ''}`}
                    >
                      <p className="courier-note-item__meta">
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
                      <p className="courier-note-item__body">{note.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {order.status !== 'completed' && (
              <>
                <textarea
                  className="courier-form-textarea"
                  placeholder="Qeyd yazın (məs. problem baş verdi)..."
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  rows={2}
                  style={{ marginBottom: '8px' }}
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={noteSubmitting || !noteBody.trim()}
                  className="courier-btn courier-btn--primary courier-btn--block"
                  style={{
                    marginBottom: '16px',
                    opacity: noteSubmitting || !noteBody.trim() ? 0.5 : 1,
                  }}
                >
                  {noteSubmitting ? 'Göndərilir...' : 'Qeyd əlavə et'}
                </button>
              </>
            )}

            <div className="courier-modal-actions">
              <button type="button" onClick={onClose} className="courier-btn">
                Bağla
              </button>
              {order.status === 'assigned' && (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={submitting}
                  className="courier-btn courier-btn--primary"
                >
                  {submitting ? '...' : '▶ Başladım'}
                </button>
              )}
              {order.status === 'in_progress' && (
                <button
                  type="button"
                  onClick={() => openCompletionForm(false, order)}
                  className="courier-btn courier-btn--primary"
                >
                  ✅ Tamamladım
                </button>
              )}
              {order.status === 'completed' && isCourierEditable(order) && (
                <button
                  type="button"
                  onClick={() => openCompletionForm(true, order)}
                  className="courier-btn courier-btn--primary"
                >
                  ✏️ Düzəlt
                </button>
              )}
            </div>
          </>
        )}

        {order && showCompleteForm && (
          <form onSubmit={handleComplete}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: 0 }}>
              {isEditMode ? 'Tamamlama məlumatlarını düzəldin' : `${customerName(order)} — ${order.address}`}
            </p>
            {isEditMode && editRemaining && (
              <p className="courier-edit-window" style={{ marginTop: 0 }}>
                Düzəlişə qalan: <strong>{editRemaining}</strong>
              </p>
            )}

            <label className="courier-form-label">
              Ödəniş növü
              <select
                className="courier-form-select"
                value={paymentType}
                onChange={(e) => {
                  const type = e.target.value as PaymentType;
                  setPaymentType(type);
                  if (type === 'credit') {
                    setAmountPaid('0');
                  } else if (order) {
                    const paid = parseFloat(price) || orderTotal(order);
                    setAmountPaid(String(paid));
                  }
                }}
              >
                <option value="cash">Nağd</option>
                <option value="card">Kart</option>
                <option value="credit">Nisyə (borc)</option>
              </select>
            </label>

            {isEditMode && (
              <label className="courier-form-label">
                Sifariş qiyməti (₼)
                <input
                  className="courier-form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </label>
            )}

            <label className="courier-form-label">
              Ödənilən məbləğ (₼)
              <input
                className="courier-form-input"
                type="number"
                step="0.01"
                min="0"
                value={paymentType === 'credit' ? '0' : amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                style={
                  paymentType === 'credit'
                    ? { backgroundColor: '#f3f4f6', color: '#6b7280' }
                    : undefined
                }
                disabled={paymentType === 'credit'}
                required
              />
              {paymentType === 'credit' && (
                <span>Nisyədə pul ödənilmir — borc müştəriyə yazılır</span>
              )}
            </label>

            <label className="courier-form-label">
              Qaytarılan boş bidon
              <input
                className="courier-form-input"
                type="number"
                min="0"
                value={emptyBidons}
                onChange={(e) => setEmptyBidons(e.target.value)}
              />
            </label>

            <label className="courier-form-label">
              Verilən dolu bidon
              <input
                className="courier-form-input"
                type="number"
                min="0"
                value={fullBidons}
                onChange={(e) => setFullBidons(e.target.value)}
                required
              />
            </label>

            <label className="courier-form-label">
              Qeyd
              <textarea
                className="courier-form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="İstəyə bağlı"
              />
            </label>

            <div className="courier-modal-actions">
              <button
                type="button"
                onClick={() => {
                  setShowCompleteForm(false);
                  setIsEditMode(false);
                }}
                className="courier-btn"
                disabled={submitting}
              >
                Geri
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="courier-btn courier-btn--primary"
              >
                {submitting ? 'Göndərilir...' : isEditMode ? 'Yadda saxla' : 'Təsdiqlə'}
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
    <div className="courier-detail-row">
      <p className="courier-detail-row__label">{label}</p>
      <p className="courier-detail-row__value">{value}</p>
    </div>
  );
}
