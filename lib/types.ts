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
  notes?: string;
  payment_type?: PaymentType | null;
  amount_paid?: number | string | null;
  is_paid?: boolean;
  paid_at?: string | null;
  empty_bidons_returned?: number;
  full_bidons_given?: number | null;
  completed_at?: string;
  created_at?: string;
  surname?: string;
  customer_phone?: string;
}

export interface CompleteOrderPayload {
  payment_type: PaymentType;
  amount_paid: number;
  empty_bidons_returned: number;
  full_bidons_given: number;
  notes?: string;
}

export interface Notification {
  id: number;
  message: string;
  read: boolean;
  created_at: string;
  order_id?: number;
}

export type HistoryPeriod = 'today' | 'week' | 'month' | 'custom';
