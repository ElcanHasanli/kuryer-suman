import type { Order } from '@/lib/types';

type PhoneOrder = Pick<
  Order,
  'customer_phone' | 'customer_phone2' | 'whatsapp_url' | 'whatsapp_url_phone2'
>;

function PhoneLink({
  phone,
  whatsappUrl,
}: {
  phone: string;
  whatsappUrl?: string;
}) {
  const href = whatsappUrl || `tel:${phone.replace(/\s/g, '')}`;
  const external = Boolean(whatsappUrl);

  return (
    <a
      href={href}
      className="courier-phone-link"
      {...(external
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
    >
      {phone}
    </a>
  );
}

export function CustomerPhone({
  order,
  showSecondary = true,
}: {
  order: PhoneOrder;
  showSecondary?: boolean;
}) {
  const primary = order.customer_phone;
  const secondary = showSecondary ? order.customer_phone2 : undefined;

  if (!primary && !secondary) {
    return <span className="cell-muted">—</span>;
  }

  return (
    <span className="courier-phone-inline">
      {primary && (
        <PhoneLink phone={primary} whatsappUrl={order.whatsapp_url} />
      )}
      {secondary && (
        <>
          {primary && <span className="courier-phone-sep"> · </span>}
          <PhoneLink
            phone={secondary}
            whatsappUrl={order.whatsapp_url_phone2}
          />
        </>
      )}
    </span>
  );
}

export function CustomerPhoneBlock({ order }: { order: PhoneOrder }) {
  const rows: { phone: string; whatsappUrl?: string }[] = [];

  if (order.customer_phone) {
    rows.push({ phone: order.customer_phone, whatsappUrl: order.whatsapp_url });
  }
  if (order.customer_phone2) {
    rows.push({
      phone: order.customer_phone2,
      whatsappUrl: order.whatsapp_url_phone2,
    });
  }

  if (rows.length === 0) {
    return <span className="cell-muted">—</span>;
  }

  return (
    <div className="courier-phone-list">
      {rows.map(({ phone, whatsappUrl }) => (
        <PhoneLink key={phone} phone={phone} whatsappUrl={whatsappUrl} />
      ))}
    </div>
  );
}
