import { STORAGE_KEYS } from './storage';
import type {
  CompleteOrderPayload,
  ExpensePeriod,
  ExpensesResponse,
  HistoryPeriod,
  Notification,
  Order,
  OrderNote,
  User,
} from './types';

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://api.suman.khamsacraft.az'
    : 'http://localhost:5001');

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const token =
    auth && typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEYS.token)
      : null;

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { error?: string }).error || res.statusText,
      res.status
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (
    contentType.includes('spreadsheet') ||
    contentType.includes('octet-stream') ||
    contentType.includes('excel') ||
    contentType.includes('vnd.openxmlformats')
  ) {
    return res.blob() as Promise<T>;
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function login(
  email: string,
  password: string,
  license_code: string
) {
  return api<{ message: string; token: string; user: User }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        license_code: license_code.trim(),
      }),
    },
    false
  );
}

export async function getOrders(params?: { status?: Order['status'] }) {
  const query = params?.status
    ? `?${new URLSearchParams({ status: params.status }).toString()}`
    : '';
  return api<Order[]>(`/api/orders${query}`);
}

export async function getCompletedOrders() {
  return getOrders({ status: 'completed' });
}

export async function getOrder(id: number) {
  return api<Order>(`/api/orders/${id}`);
}

export async function startOrder(id: number) {
  return api<Order>(`/api/orders/${id}/start`, { method: 'PUT' });
}

export async function completeOrder(id: number, data: CompleteOrderPayload) {
  return api<Order>(`/api/orders/${id}/complete`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getNotifications() {
  return api<Notification[]>('/api/notifications');
}

export async function markNotificationRead(id: number) {
  return api(`/api/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return api('/api/notifications/read-all', { method: 'PATCH' });
}

export async function exportCourierHistory(
  courierId: number,
  period: HistoryPeriod,
  startDate?: string,
  endDate?: string
) {
  const params = new URLSearchParams({ period });
  if (period === 'custom' && startDate && endDate) {
    params.set('startDate', startDate);
    params.set('endDate', endDate);
  }
  return api<Blob>(
    `/api/orders/courier/${courierId}/export?${params.toString()}`
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function getOrderNotes(orderId: number) {
  return api<OrderNote[]>(`/api/orders/${orderId}/notes`);
}

export async function postOrderNote(orderId: number, body: string) {
  return api<OrderNote>(`/api/orders/${orderId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function getExpenses(period: ExpensePeriod) {
  return api<ExpensesResponse>(`/api/expenses?period=${period}`);
}

export async function createExpense(data: {
  amount: number;
  description: string;
  category: string;
}) {
  return api<ExpensesResponse>('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
