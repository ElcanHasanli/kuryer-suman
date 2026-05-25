import type { ExpensePeriod } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function login(license_code: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_code, password }),
  });

  if (!res.ok) throw new Error('Giriş uğursuz oldu');
  return res.json();
}

export async function getOrders(token: string) {
  const res = await fetch(`${API_URL}/orders`, {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error('Sifarişlər yüklənmədi');
  return res.json();
}

export async function getOrder(token: string, id: number) {
  const res = await fetch(`${API_URL}/orders/${id}`, {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error('Sifariş yüklənmədi');
  return res.json();
}

export async function getOrderNotes(token: string, id: number) {
  const res = await fetch(`${API_URL}/orders/${id}/notes`, {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error('Qeydlər yüklənmədi');
  return res.json();
}

export async function postOrderNote(token: string, id: number, body: string) {
  const res = await fetch(`${API_URL}/orders/${id}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify({ body }),
  });

  if (!res.ok) throw new Error('Qeyd əlavə edilmədi');
  return res.json();
}

export async function updateOrder(token: string, id: number, data: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/orders/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error('Sifariş yenilənmədi');
  return res.json();
}

export async function getExpenses(token: string, period: ExpensePeriod) {
  const res = await fetch(`${API_URL}/expenses?period=${period}`, {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error('Xərclər yüklənmədi');
  return res.json();
}

export async function createExpense(
  token: string,
  data: { amount: number; description: string; category: string }
) {
  const res = await fetch(`${API_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error('Xərc əlavə edilmədi');
  return res.json();
}
