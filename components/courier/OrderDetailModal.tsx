'use client';

import type { ReactNode } from 'react';
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
  orderLoadErrorMessage,
} from '@/lib/courierEdit';
import {
  customerDebtAmount,
  debtPaidFromCollection,
  extrasTotal,
  maxCompletionPayment,
  orderDueAmount,
  orderShortfallFromCollection,
  orderTotal,
  orderUnitPrice,
  parseAmount,
  prepaidAmountFromOrder,
  priceFromBidonsAndExtras,
  priceFromUnitAndBidons,
  totalCollectedFromOrder,
} from '@/lib/orderAmounts';
import type {
  CompleteOrderPayload,
  CompletePickupPayload,
  Order,
  OrderNote,
  PaymentType,
  UpdateCompletionPayload,
  UpdatePickupCompletionPayload,
} from '@/lib/types';
import { authorRoleLabel, parseOrderNotes } from '@/lib/types';
import {
  formatScheduledDate,
  getOrderTypeLabel,
  getPaymentTypeLabel,
  isPickupOrder,
  customerDisplayName,
  customerOrderAddress,
} from '@/lib/utils';
import { CustomerPhoneBlock } from '@/components/courier/CustomerPhone';
import { OrderExtrasList, PrepaidBadge } from '@/components/courier/OrderExtras';

interface OrderDetailModalProps {
  orderId: number;
  onClose: () => void;
  onUpdated: () => void;
  initialEditMode?: boolean;
}

function fillCompletionForm(order: Order, setters: {
  setPaymentType: (v: PaymentType) => void;
  setAmountPaid: (v: string) => void;
  setEmptyBidons: (v: string) => void;
  setFullBidons: (v: string) => void;
  setNotes: (v: string) => void;
  setPrice: (v: string) => void;
}): boolean {
  const unit = orderUnitPrice(order);
  const bidons = order.full_bidons_given ?? order.bidons_count ?? 0;
  const stored = parseAmount(order.price);
  const calculated = priceFromBidonsAndExtras(unit, bidons, order.extras);
  const priceManual = Math.abs(stored - calculated) > 0.009;
  const prepaid = prepaidAmountFromOrder(order);
  const due = orderDueAmount(stored > 0 ? stored : calculated, prepaid);

  setters.setPaymentType((order.payment_type as PaymentType) || 'cash');
  setters.setEmptyBidons(String(order.empty_bidons_returned ?? 0));
  setters.setFullBidons(String(bidons));
  setters.setNotes(typeof order.notes === 'string' ? order.notes : '');
  setters.setPrice(String(stored > 0 ? stored : calculated));
  const collected = totalCollectedFromOrder(order);
  setters.setAmountPaid(
    String(
      collected > 0
        ? collected
        : due > 0
          ? due
          : ''
    )
  );
  return priceManual;
}

function fillPickupForm(order: Order, setters: {
  setEmptyBidons: (v: string) => void;
  setNotes: (v: string) => void;
}) {
  setters.setEmptyBidons(
    String(order.empty_bidons_returned ?? order.bidons_count ?? 0)
  );
  setters.setNotes(typeof order.notes === 'string' ? order.notes : '');
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
  const [priceManual, setPriceManual] = useState(false);
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
    if (isPickupOrder(data)) {
      fillPickupForm(data, { setEmptyBidons, setNotes });
      setPriceManual(false);
    } else {
      const manual = fillCompletionForm(data, {
        setPaymentType,
        setAmountPaid,
        setEmptyBidons,
        setFullBidons,
        setNotes,
        setPrice,
      });
      setPriceManual(edit ? manual : false);
    }
    setIsEditMode(edit);
    setShowCompleteForm(true);
  };

  const syncPriceFromBidons = (bidonCount: number, syncAmountPaid: boolean) => {
    if (!order) return;
    const calculated = priceFromBidonsAndExtras(orderUnitPrice(order), bidonCount, order.extras);
    setPrice(String(calculated));
    if (syncAmountPaid && paymentType !== 'credit') {
      const due = orderDueAmount(calculated, prepaidAmountFromOrder(order));
      setAmountPaid(String(due));
    }
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
          } else if (isPickupOrder(data)) {
            fillPickupForm(data, { setEmptyBidons, setNotes });
          } else {
            const bidons = data.bidons_count ?? 0;
            const calculated = priceFromBidonsAndExtras(orderUnitPrice(data), bidons, data.extras);
            const prepaid = prepaidAmountFromOrder(data);
            const due = orderDueAmount(calculated, prepaid);
            setFullBidons(String(bidons));
            setPrice(String(calculated));
            setAmountPaid(due > 0 ? String(due) : '');
            setPriceManual(false);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(orderLoadErrorMessage(err));
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

    try {
      if (order && isPickupOrder(order)) {
        const payload: CompletePickupPayload = {
          empty_bidons_returned: parseInt(emptyBidons, 10) || 0,
          notes: notes.trim() || undefined,
        };
        if (isEditMode) {
          await updateOrderCompletion(orderId, payload as UpdatePickupCompletionPayload);
        } else {
          await completeOrder(orderId, payload);
        }
      } else {
        const bidonCount = parseInt(fullBidons, 10) || 0;
        const unit = orderUnitPrice(order!);
        const orderPrice = isEditMode
          ? priceManual
            ? parseFloat(price) || 0
            : priceFromUnitAndBidons(unit, bidonCount)
          : priceFromUnitAndBidons(unit, bidonCount);
        const customerDebt = customerDebtAmount(order!);
        const prepaid = prepaidAmountFromOrder(order!);
        const maxPayable =
          order!.max_completion_payment != null && order!.max_completion_payment !== ''
            ? parseAmount(order!.max_completion_payment)
            : maxCompletionPayment(orderPrice, customerDebt, prepaid);
        const totalCollected =
          paymentType === 'credit' ? 0 : parseFloat(amountPaid) || 0;

        if (paymentType !== 'credit' && totalCollected > maxPayable + 0.009) {
          setError(
            `Ödənilən məbləğ maksimum ₼${maxPayable.toFixed(2)} ola bilər (sifariş + köhnə borc)`
          );
          setSubmitting(false);
          return;
        }

        const payload: CompleteOrderPayload = {
          payment_type: paymentType,
          amount_paid: totalCollected,
          empty_bidons_returned: parseInt(emptyBidons, 10) || 0,
          full_bidons_given: bidonCount,
          notes: notes.trim() || undefined,
        };
        if (isEditMode) {
          const patch: UpdateCompletionPayload = { ...payload };
          if (priceManual) {
            patch.price = parseFloat(price) || 0;
          }
          await updateOrderCompletion(orderId, patch);
        } else {
          await completeOrder(orderId, payload);
        }
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
    in_progress: 'Çatdırılır',
    completed: 'Tamamlandı',
  };

  const editRemaining =
    order && isCourierEditable(order)
      ? formatEditTimeRemaining(order.courier_editable_until, now)
      : null;

  const unitPrice = order ? orderUnitPrice(order) : 0;
  const bidonCount = parseInt(fullBidons, 10) || 0;
  const formOrderPrice = order
    ? isEditMode && priceManual
      ? parseFloat(price) || 0
      : priceFromBidonsAndExtras(unitPrice, bidonCount, order.extras)
    : 0;
  const prepaidAmount = order ? prepaidAmountFromOrder(order) : 0;
  const formOrderDue = orderDueAmount(formOrderPrice, prepaidAmount);
  const formAmountPaid =
    paymentType === 'credit' ? 0 : parseFloat(amountPaid) || 0;
  const customerDebt = order ? customerDebtAmount(order) : 0;
  const maxPayable = maxCompletionPayment(formOrderPrice, customerDebt, prepaidAmount);
  const formDebtPaidPreview = debtPaidFromCollection(
    formAmountPaid,
    formOrderDue,
    customerDebt
  );
  const formOrderShortfall = orderShortfallFromCollection(
    formAmountPaid,
    formOrderDue
  );
  const isPickup = order ? isPickupOrder(order) : false;

  return (
    <div className="courier-modal-overlay" onClick={onClose}>
      <div className="courier-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="courier-modal__title">
          {isPickup
            ? isEditMode
              ? `Boş bidon düzəlt #${orderId}`
              : `Boş bidon götürmə #${orderId}`
            : isEditMode
              ? `Sifarişi düzəlt #${orderId}`
              : `Sifariş #${orderId}`}
        </h2>

        {loading && <p className="courier-empty">Yüklənir...</p>}

        {error && <div className="courier-error-box">{error}</div>}

        {order && editRemaining && !showCompleteForm && (
          <p className="courier-edit-window">
            Düzəlişə qalan: <strong>{editRemaining}</strong>
          </p>
        )}

        {order && order.status === 'completed' && !isCourierEditable(order) && !showCompleteForm && (
          <p className="courier-form-hint" style={{ marginTop: 0 }}>
            {!isPickup && order.is_paid
              ? 'Sifariş tam ödənilib — redaktə mümkün deyil'
              : 'Düzəliş müddəti bitib'}
          </p>
        )}

        {order && !showCompleteForm && (
          <>
            <DetailRow label="Müştəri" value={customerDisplayName(order)} />
            <DetailRow label="Ünvan" value={customerOrderAddress(order)} />
            <DetailRow label="Telefon" value={<CustomerPhoneBlock order={order} />} />
            <DetailRow
              label="Növ"
              value={getOrderTypeLabel(order.order_type)}
            />
            {order.scheduled_date && (
              <DetailRow
                label="Planlaşdırılan tarix"
                value={formatScheduledDate(order.scheduled_date)}
              />
            )}
            {isPickup ? (
              <>
                <DetailRow
                  label="Gözlənilən boş bidon"
                  value={String(order.bidons_count)}
                />
              </>
            ) : (
              <>
                <DetailRow label="Bidon" value={String(order.bidons_count)} />
                <DetailRow
                  label="Ədəd qiyməti"
                  value={`₼${orderUnitPrice(order).toFixed(2)}`}
                />
                {order.extras && order.extras.length > 0 && (
                  <DetailRow
                    label="Əlavələr"
                    value={<OrderExtrasList extras={order.extras} />}
                  />
                )}
                <DetailRow label="Cəmi" value={`₼${orderTotal(order).toFixed(2)}`} />
                {order.is_prepaid && (
                  <DetailRow
                    label="Ödəniş statusu"
                    value={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <PrepaidBadge />
                        {prepaidAmountFromOrder(order) > 0 && (
                          <span>₼{prepaidAmountFromOrder(order).toFixed(2)} əvvəlcədən ödənilib</span>
                        )}
                      </span>
                    }
                  />
                )}
                {customerDebtAmount(order) > 0 && (
                  <DetailRow
                    label="Müştəri borcu"
                    value={`₼${customerDebtAmount(order).toFixed(2)}`}
                  />
                )}
              </>
            )}
            <DetailRow
              label="Status"
              value={statusLabel[order.status] || order.status}
            />
            {order.status === 'completed' && isPickup && (
              <>
                <DetailRow
                  label="Götürülən boş bidon"
                  value={String(order.empty_bidons_returned ?? 0)}
                />
                {order.completed_at && (
                  <DetailRow
                    label="Tamamlanma"
                    value={new Date(order.completed_at).toLocaleString('az-AZ')}
                  />
                )}
              </>
            )}
            {order.status === 'completed' && !isPickup && (
              <>
                {order.is_prepaid && prepaidAmountFromOrder(order) > 0 && (
                  <DetailRow
                    label="Əvvəlcədən ödənilib"
                    value={`₼${prepaidAmountFromOrder(order).toFixed(2)}`}
                  />
                )}
                <DetailRow label="Ödəniş" value={getPaymentTypeLabel(order.payment_type)} />
                <DetailRow
                  label="Sifarişə ödənilən"
                  value={
                    order.payment_type === 'credit'
                      ? 'Nisyə (borc)'
                      : `₼${parseAmount(order.amount_paid).toFixed(2)}`
                  }
                />
                {parseAmount(order.debt_paid_at_completion) > 0 && (
                  <DetailRow
                    label="Köhnə borcdan ödənilən"
                    value={`₼${parseAmount(order.debt_paid_at_completion).toFixed(2)}`}
                  />
                )}
                {totalCollectedFromOrder(order) > 0 && order.payment_type !== 'credit' && (
                  <DetailRow
                    label="Ümumi alınan"
                    value={`₼${totalCollectedFromOrder(order).toFixed(2)}`}
                  />
                )}
                {parseAmount(order.remaining_amount) > 0 && !order.is_paid && (
                  <DetailRow
                    label="Sifarişdə qalan"
                    value={`₼${parseAmount(order.remaining_amount).toFixed(2)}`}
                  />
                )}
                {customerDebtAmount(order) > 0 && (
                  <DetailRow
                    label="Müştəri borcu"
                    value={`₼${customerDebtAmount(order).toFixed(2)}`}
                  />
                )}
                {order.is_paid && (
                  <DetailRow label="Ödəniş statusu" value="Tam ödənilib" />
                )}
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
                  {isPickup ? '📦 Götürdüm' : '✅ Tamamladım'}
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
              {isEditMode
                ? isPickup
                  ? 'Götürülən boş bidon məlumatını düzəldin'
                  : 'Tamamlama məlumatlarını düzəldin'
                : `${customerDisplayName(order)} — ${customerOrderAddress(order)}`}
            </p>
            {isEditMode && editRemaining && (
              <p className="courier-edit-window" style={{ marginTop: 0 }}>
                Düzəlişə qalan: <strong>{editRemaining}</strong>
              </p>
            )}

            {isPickup ? (
              <>
                <label className="courier-form-label">
                  Götürülən boş bidon
                  <input
                    className="courier-form-input"
                    type="number"
                    min="0"
                    value={emptyBidons}
                    onChange={(e) => setEmptyBidons(e.target.value)}
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
              </>
            ) : (
              <>
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
                    const count = parseInt(fullBidons, 10) || 0;
                    const calculated = priceFromBidonsAndExtras(
                      orderUnitPrice(order),
                      count,
                      order.extras
                    );
                    const currentPrice =
                      isEditMode && priceManual ? parseFloat(price) || calculated : calculated;
                    const due = orderDueAmount(currentPrice, prepaidAmountFromOrder(order));
                    setAmountPaid(String(due));
                  }
                }}
              >
                <option value="cash">Nağd</option>
                <option value="card">Kart</option>
                <option value="credit">Nisyə (borc)</option>
              </select>
            </label>

            {order && customerDebt > 0 && (
              <p className="courier-form-hint" style={{ margin: '0 0 12px' }}>
                Müştərinin köhnə borcu: <strong>₼{customerDebt.toFixed(2)}</strong>
                {maxPayable > formOrderDue && (
                  <>
                    {' '}
                    · Maks. ödəniş: <strong>₼{maxPayable.toFixed(2)}</strong>
                  </>
                )}
              </p>
            )}

            {order && prepaidAmount > 0 && (
              <p className="courier-form-hint" style={{ margin: '0 0 12px' }}>
                Əvvəlcədən ödənilib: <strong>₼{prepaidAmount.toFixed(2)}</strong>
                {' · '}
                Qalan sifariş məbləği: <strong>₼{formOrderDue.toFixed(2)}</strong>
              </p>
            )}

            {order && order.extras && order.extras.length > 0 && (
              <div style={{ margin: '0 0 12px' }}>
                <OrderExtrasList extras={order.extras} />
              </div>
            )}

            {order && (
              <p className="courier-form-hint" style={{ margin: '0 0 12px' }}>
                1 bidon = <strong>₼{unitPrice.toFixed(2)}</strong>
                {bidonCount > 0 && (
                  <>
                    {' '}
                    → {bidonCount} bidon ={' '}
                    <strong>
                      ₼{priceFromUnitAndBidons(unitPrice, bidonCount).toFixed(2)}
                    </strong>
                    {extrasTotal(order.extras) > 0 && (
                      <>
                        {' '}
                        + əlavələr{' '}
                        <strong>₼{extrasTotal(order.extras).toFixed(2)}</strong>
                        {' '}
                        = <strong>₼{formOrderPrice.toFixed(2)}</strong>
                      </>
                    )}
                  </>
                )}
              </p>
            )}

            {isEditMode ? (
              <label className="courier-form-label">
                Sifariş qiyməti (₼)
                <input
                  className="courier-form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setPriceManual(true);
                  }}
                  required
                />
                <span className="courier-form-hint">
                  {priceManual
                    ? 'Manual düzəliş — serverə göndərilir'
                    : 'Bidon sayına görə avtomatik hesablanır'}
                </span>
              </label>
            ) : (
              <p className="courier-form-hint" style={{ margin: '0 0 12px' }}>
                Hesablanan qiymət: <strong>₼{formOrderPrice.toFixed(2)}</strong>
                <span style={{ display: 'block', marginTop: '4px' }}>
                  Qiymət verilən bidon sayına görə avtomatik hesablanır
                </span>
              </p>
            )}

            <label className="courier-form-label">
              Ödənilən məbləğ (₼)
              <input
                className="courier-form-input"
                type="number"
                step="0.01"
                min="0"
                max={paymentType === 'credit' ? undefined : maxPayable || undefined}
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
              {paymentType === 'credit' && formOrderDue > 0 && (
                <span className="courier-debt-hint">
                  Qalan sifariş məbləği (₼{formOrderDue.toFixed(2)}) müştəri borcuna yazılacaq
                </span>
              )}
              {paymentType !== 'credit' && formDebtPaidPreview > 0 && (
                <span className="courier-debt-hint">
                  <strong>₼{formDebtPaidPreview.toFixed(2)}</strong> köhnə borcdan ödəniləcək
                </span>
              )}
              {paymentType !== 'credit' && formOrderShortfall > 0 && (
                <span className="courier-debt-hint courier-debt-hint--warn">
                  Qalan <strong>₼{formOrderShortfall.toFixed(2)}</strong> müştəri borcuna yazılacaq
                </span>
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
                onChange={(e) => {
                  const next = e.target.value;
                  setFullBidons(next);
                  const count = parseInt(next, 10) || 0;
                  if (!isEditMode || !priceManual) {
                    syncPriceFromBidons(count, true);
                    if (isEditMode) setPriceManual(false);
                  }
                }}
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
              </>
            )}

            <div className="courier-modal-actions">
              <button
                type="button"
                onClick={() => {
                  setShowCompleteForm(false);
                  setIsEditMode(false);
                  setPriceManual(false);
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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="courier-detail-row">
      <p className="courier-detail-row__label">{label}</p>
      <div className="courier-detail-row__value">{value}</div>
    </div>
  );
}
