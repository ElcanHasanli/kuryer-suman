export type UserRole = 'admin' | 'courier';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  company_id?: number;
  company_name?: string;
}

export type OrderStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';
export type PaymentType = 'cash' | 'card' | 'credit';
export type OrderType = 'delivery' | 'pickup';

export interface OrderExtra {
  type: string;
  label: string;
  amount: number | string;
  quantity?: number;
}

export interface Order {
  id: number;
  customer_id?: number;
  courier_id?: number;
  name?: string;
  customer_name?: string;
  address: string;
  bidons_count: number;
  /** Sifarişin ümumi məbləği (₼), ədəd başına deyil */
  price: number;
  /** Su vahid qiyməti (2.50, 3.00) */
  unit_price?: number | string | null;
  /** Pompa, dispenser, cərimə və s. */
  extras?: OrderExtra[];
  /** Müştəri artıq ödəyib */
  is_prepaid?: boolean;
  /** Əvvəlcədən ödənilmiş məbləğ */
  prepaid_amount?: number | string | null;
  /** Tamamlamada sifariş üçün qalan: price - prepaid_amount */
  order_due?: number | string | null;
  status: OrderStatus;
  order_type?: OrderType;
  /** Planlaşdırılmış tarix (YYYY-MM-DD, Asia/Baku) */
  scheduled_date?: string;
  /** Siyahıda mətn; detalda V2 massiv ola bilər */
  notes?: string | OrderNote[];
  payment_type?: PaymentType | null;
  amount_paid?: number | string | null;
  /** Tamamlama zamanı köhnə borcdan ödənilən (request/response) */
  debt_paid?: number | string | null;
  is_paid?: boolean;
  paid_at?: string | null;
  /** Bu sifarişdə ödənilməmiş qalıq */
  remaining_amount?: number | string | null;
  /** Müştərinin ümumi borcu */
  debt?: number | string | null;
  /** Müştərinin cari ümumi borcu (AZN) — API join */
  customer_debt?: number | string | null;
  /** Sifariş ödənişi inputunun max-ı (= order_due) */
  max_order_payment?: number | string | null;
  /** Borc ödənişi inputunun max-ı (= customer_debt) */
  max_debt_payment?: number | string | null;
  /** Ümumi max: order_due + customer_debt */
  max_completion_payment?: number | string | null;
  /** Tamamlama zamanı köhnə borcdan ödənilən hissə */
  debt_paid_at_completion?: number | string | null;
  /** Kuryerin aldığı ümumi məbləğ (sifariş + köhnə borc) */
  total_collected?: number | string | null;
  empty_bidons_returned?: number;
  full_bidons_given?: number | null;
  completed_at?: string;
  created_at?: string;
  assigned_at?: string;
  updated_at?: string;
  surname?: string;
  customer_phone?: string;
  customer_phone2?: string;
  customer_display_name?: string;
  customer_address?: string;
  whatsapp_url?: string;
  whatsapp_url_phone2?: string;
  /** 24 saatlıq düzəliş pəncərəsi — yalnız kuryer */
  courier_editable?: boolean;
  courier_editable_until?: string;
}

export interface CompleteOrderPayload {
  payment_type: PaymentType;
  /** Yalnız sifariş qiyməti / qalan hissəsi */
  amount_paid: number;
  /** Yalnız köhnə müştəri borcu */
  debt_paid?: number;
  empty_bidons_returned: number;
  full_bidons_given: number;
  notes?: string;
}

export interface CompletePickupPayload {
  empty_bidons_returned: number;
  notes?: string;
}

export interface UpdateCompletionPayload extends CompleteOrderPayload {
  price?: number;
}

export interface UpdatePickupCompletionPayload extends CompletePickupPayload {}

export interface Notification {
  id: number;
  message: string;
  read: boolean;
  created_at: string;
  order_id?: number;
  type?: string;
}

export type DateFilterPeriod =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'custom';

/** @deprecated use DateFilterPeriod */
export type ExpensePeriod = DateFilterPeriod;

export type HistoryPeriod = Exclude<DateFilterPeriod, 'yesterday'>;

export type WarehousePeriod = DateFilterPeriod;

export interface OrderNote {
  id?: number;
  body: string;
  author_role: string;
  author_name: string;
  created_at?: string;
}

export interface Expense {
  id?: number;
  amount: number;
  description: string;
  category: string;
  created_at?: string;
}

export interface ExpensesResponse {
  expenses: Expense[];
  totalExpenses: number;
}

export interface WarehouseStock {
  full_count: number;
  empty_count: number;
  updated_at?: string;
  updated_by_name?: string;
}

export interface WarehouseUpdateRecord {
  id?: number;
  empty_in?: number;
  full_in?: number;
  full_out?: number;
  exit_full?: number;
  remaining_full: number;
  remaining_empty?: number;
  notes?: string;
  created_at?: string;
}

export interface WarehouseSummaryResponse {
  warehouse: WarehouseStock;
  customers: {
    total_active_bidons: number;
    customer_count: number;
  };
  last_update?: WarehouseUpdateRecord;
}

export interface WarehouseUpdatePayload {
  empty_in?: number;
  full_in?: number;
  full_out?: number;
  exit_full?: number;
  remaining_full: number;
  remaining_empty?: number;
  notes?: string;
}

export interface WarehouseUpdateResult {
  stock: WarehouseStock;
  update: WarehouseUpdateRecord;
  calculation?: {
    mismatch?: boolean;
  };
}

export const EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'fuel', label: 'Yanacaq' },
  { value: 'maintenance', label: 'Təmir' },
  { value: 'food', label: 'Yemək' },
  { value: 'other', label: 'Digər' },
];

export function expenseCategoryLabel(category: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export function authorRoleLabel(role: string): string {
  if (role === 'admin') return 'Admin';
  if (role === 'courier') return 'Kuryer';
  return role;
}

export function parseOrderNotes(
  notes: Order['notes'] | OrderNote[] | undefined
): OrderNote[] {
  if (Array.isArray(notes)) return notes;
  return [];
}
