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
  status: OrderStatus;
  /** Siyahıda mətn; detalda V2 massiv ola bilər */
  notes?: string | OrderNote[];
  payment_type?: PaymentType | null;
  amount_paid?: number | string | null;
  is_paid?: boolean;
  paid_at?: string | null;
  empty_bidons_returned?: number;
  full_bidons_given?: number | null;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  assigned_at?: string;
  surname?: string;
  customer_phone?: string;
  /** 24 saatlıq düzəliş pəncərəsi — yalnız kuryer */
  courier_editable?: boolean;
  courier_editable_until?: string;
}

export interface CompleteOrderPayload {
  payment_type: PaymentType;
  amount_paid: number;
  empty_bidons_returned: number;
  full_bidons_given: number;
  notes?: string;
}

export interface UpdateCompletionPayload extends CompleteOrderPayload {
  price?: number;
}

export interface Notification {
  id: number;
  message: string;
  read: boolean;
  created_at: string;
  order_id?: number;
  type?: string;
}

export type DateFilterPeriod = 'yesterday' | 'today' | 'custom';

export type HistoryPeriod = DateFilterPeriod;

export type ExpensePeriod = DateFilterPeriod;

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

export type WarehousePeriod = DateFilterPeriod;

export interface WarehouseStock {
  full_count: number;
  empty_count: number;
  updated_at?: string;
  updated_by_name?: string;
}

export interface WarehouseCustomersSummary {
  total_active_bidons: number;
  customer_count: number;
}

export interface WarehouseUpdateRecord {
  id?: number;
  empty_in?: number;
  full_in?: number;
  full_out?: number;
  exit_full?: number | null;
  remaining_full: number;
  remaining_empty?: number | null;
  notes?: string | null;
  created_at?: string;
  courier_name?: string;
}

export interface WarehouseSummaryResponse {
  warehouse: WarehouseStock;
  customers: WarehouseCustomersSummary;
  last_update?: WarehouseUpdateRecord | null;
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

export interface WarehouseCalculation {
  mismatch?: boolean;
  expected_full?: number;
  previous_full?: number;
}

export interface WarehouseUpdateResponse {
  stock: WarehouseStock;
  update: WarehouseUpdateRecord;
  calculation: WarehouseCalculation;
}
