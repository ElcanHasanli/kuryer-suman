import type { OrderExtra } from '@/lib/types';
import { extrasTotal, parseAmount } from '@/lib/orderAmounts';

export function PrepaidBadge() {
  return <span className="order-prepaid-badge">Ödənilib</span>;
}

export function OrderExtrasList({
  extras,
  variant = 'detail',
}: {
  extras?: OrderExtra[];
  variant?: 'detail' | 'inline';
}) {
  if (!extras?.length) return null;

  if (variant === 'inline') {
    return (
      <span className="order-extras-inline">
        {extras.map((extra, i) => {
          const total = parseAmount(extra.amount) * (extra.quantity ?? 1);
          return (
            <span key={`${extra.type}-${i}`} className="order-extras-inline__item">
              {extra.label}: ₼{total.toFixed(2)}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <div className="order-extras-list">
      {extras.map((extra, i) => {
        const qty = extra.quantity ?? 1;
        const total = parseAmount(extra.amount) * qty;
        return (
          <div key={`${extra.type}-${i}`} className="order-extras-list__row">
            <span>{extra.label}</span>
            <span>
              {qty > 1 ? `${qty} × ` : ''}₼{total.toFixed(2)}
            </span>
          </div>
        );
      })}
      <div className="order-extras-list__total">
        <span>Əlavələr cəmi</span>
        <span>₼{extrasTotal(extras).toFixed(2)}</span>
      </div>
    </div>
  );
}
