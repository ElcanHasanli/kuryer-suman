export interface User {
  id: number;
  name: string;
  role: string;
  email?: string;
  license_code?: string;
}

export interface OrderNote {
  id?: number;
  body: string;
  author_role: string;
  author_name: string;
  created_at?: string;
}

export interface Order {
  id: number;
  name: string;
  address: string;
  bidons_count: number;
  price: number;
  status: string;
  courier_id: number;
  payment_type?: string;
  empty_bidons_returned?: number;
  full_bidons_given?: number;
  completed_at?: string;
  notes?: OrderNote[];
}

export interface Expense {
  id?: number;
  amount: number;
  description: string;
  category: string;
  created_at?: string;
}

export type ExpensePeriod = 'today' | 'week' | 'month';

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
