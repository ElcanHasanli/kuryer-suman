import { Capacitor, CapacitorHttp } from '@capacitor/core';
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

/** Production API — mobil tətbiqdə həmişə bu istifadə olunur */
export const PRODUCTION_API_URL = 'https://api.suman.khamsacraft.az';

function resolveApiBase(): string {
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    return PRODUCTION_API_URL;
  }
  return (
    process.env.NEXT_PUBLIC_API_URL ??
    (process.env.NODE_ENV === 'production' ? PRODUCTION_API_URL : 'http://localhost:5001')
  );
}

const API = resolveApiBase();

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function buildHeaders(
  options: RequestInit,
  token: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  if (options.headers) {
    const extra = new Headers(options.headers);
    extra.forEach((value, key) => {
      headers[key] = value;
    });
  }
  return headers;
}

function parseErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const msg = (data as { error?: string }).error;
    if (msg) return msg;
  }
  return fallback;
}

async function nativeRequest(
  url: string,
  method: HttpMethod,
  headers: Record<string, string>,
  body?: string,
  responseType: 'json' | 'blob' = 'json'
): Promise<{ status: number; data: unknown }> {
  try {
    const response = await CapacitorHttp.request({
      url,
      method,
      headers,
      data: body ? JSON.parse(body) : undefined,
      responseType: responseType === 'blob' ? 'blob' : 'json',
    });
    return { status: response.status, data: response.data };
  } catch {
    throw new ApiError(
      'Şəbəkə xətası — internet və ya server əlçatan deyil',
      0
    );
  }
}

function blobFromNativeData(data: unknown): Blob {
  if (data instanceof Blob) return data;
  if (typeof data === 'string') {
    return new Blob([data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }
  if (data instanceof ArrayBuffer) {
    return new Blob([data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }
  return new Blob([JSON.stringify(data ?? '')], { type: 'application/octet-stream' });
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

  const url = `${API}${path}`;
  const method = (options.method || 'GET').toUpperCase() as HttpMethod;
  const headers = buildHeaders(options, token);
  const body =
    typeof options.body === 'string' ? options.body : undefined;

  const wantsBlob =
    path.includes('/export') ||
    (typeof options.headers === 'object' &&
      options.headers !== null &&
      'Accept' in options.headers);

  if (Capacitor.isNativePlatform()) {
    const { status, data } = await nativeRequest(
      url,
      method,
      headers,
      body,
      wantsBlob ? 'blob' : 'json'
    );

    if (status >= 400) {
      throw new ApiError(parseErrorMessage(data, `HTTP ${status}`), status);
    }

    if (status === 204) return undefined as T;
    if (wantsBlob) return blobFromNativeData(data) as T;
    return data as T;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers, body });
  } catch {
    throw new ApiError(
      'Şəbəkə xətası — internet və ya server əlçatan deyil',
      0
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(parseErrorMessage(err, res.statusText), res.status);
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

  if (res.status === 204) return undefined as T;

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

export async function registerPushDeviceToken(token: string, platform: string) {
  return api<{ message: string }>('/api/notifications/device-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
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
  const params = new URLSearchParams({ period, timezone: 'Asia/Baku' });
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
  return api<ExpensesResponse>(`/api/expenses?period=${period}&timezone=Asia/Baku`);
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
