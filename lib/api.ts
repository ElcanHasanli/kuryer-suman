const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export async function getUsers(token: string) {
  const res = await fetch(`${API_URL}/users`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function getOrders(token: string) {
  const res = await fetch(`${API_URL}/orders`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function createOrder(token: string, data: any) {
  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error('Failed to create order');
  return res.json();
}

export async function updateOrder(token: string, id: number, data: any) {
  const res = await fetch(`${API_URL}/orders/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error('Failed to update order');
  return res.json();
}

export async function getCouriers(token: string) {
  const res = await fetch(`${API_URL}/couriers`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Failed to fetch couriers');
  return res.json();
}