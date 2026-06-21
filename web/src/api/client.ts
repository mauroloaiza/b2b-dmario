const BASE = import.meta.env.VITE_API_URL ?? '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? res.statusText), { status: res.status, body });
  }
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  signIn: (email: string, password: string) =>
    req<{ user: User }>('/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  signOut: () =>
    req('/auth/sign-out', {
      method: 'POST',
      headers: { Origin: window.location.origin },
      body: JSON.stringify({}),
    }),
  getSession: () => req<{ user: User } | null>('/auth/get-session'),
};

// ── Catalog ───────────────────────────────────────────────────────────────────
export const catalogApi = {
  list: () => req<{ data: Product[] }>('/catalog').then(r => r.data),
};

// ── Client ────────────────────────────────────────────────────────────────────
export const clientsApi = {
  me: () => req<ClientMe>('/me'),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const ordersApi = {
  preview: (body: PreviewReq) =>
    req<PreviewRes>('/orders/preview', { method: 'POST', body: JSON.stringify(body) }),
  create: (body: PreviewReq) =>
    req<Order>('/orders', { method: 'POST', body: JSON.stringify(body) }),
  list: (page = 1, limit = 20, status?: string) =>
    req<PaginatedOrders>(`/orders?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`),
  repeat: (orderId: string) =>
    req<Order>(`/orders/${orderId}/repeat`, { method: 'POST' }),
};

// ── Invoices ──────────────────────────────────────────────────────────────────
export const invoicesApi = {
  me: (status?: string) =>
    req<PaginatedInvoices>(`/invoices/me${status ? `?status=${status}` : ''}`),
  pay: (invoiceId: string) =>
    req<{ checkoutUrl: string }>(`/invoices/${invoiceId}/pay`, { method: 'POST' }),
};

// ── KAM ───────────────────────────────────────────────────────────────────────
export const kamApi = {
  dashboard: () => req<KamDashboard>('/kam/dashboard'),
  clients: (page = 1, limit = 50, status?: string, segment?: string) =>
    req<KamClients>(`/kam/clients?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}${segment ? `&segment=${segment}` : ''}`),
  commissions: (year: number, month?: number) =>
    req<KamCommissions>(`/kam/commissions?year=${year}${month ? `&month=${month}` : ''}`),
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'aliado' | 'kam';
  clientId?: string;
  vendorId?: string;
}

export interface Product {
  id: string;
  ref: string;
  name: string;
  line: string;
  priceMayo: number;
  packSize: number;
  stock: number;
  badge?: 'TOP' | 'NUEVO' | 'PREMIUM' | 'BAJO' | 'AGOTADO' | null;
  imageUrl?: string;
  active: boolean;
}

export interface ClientMe {
  id: string;
  code: string;
  name: string;
  city: string;
  segment: 'A' | 'B' | 'C';
  creditLimit: number;
  creditUsed: number;
  creditAvailable: number;
  status: string;
  ytd: number;
  vendor?: { name: string; email: string };
}

export interface PreviewReq {
  paymentTerm: 'contado' | 'pronto_pago' | 'credito90';
  items: { productId: string; qty: number }[];
}

export interface PreviewRes {
  paymentTerm: string;
  subtotal: number;
  discount: number;
  total: number;
  items: { productId: string; ref: string; name: string; qty: number; unitPrice: number; lineTotal: number }[];
  cupoCheck?: { available: number; required: number; ok: boolean };
}

export interface Order {
  id: string;
  code: string;
  paymentTerm: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  createdAt: string;
  items: PreviewRes['items'];
}

export interface PaginatedOrders {
  meta: { total: number; page: number; pages: number };
  data: Order[];
}

export interface Invoice {
  id: string;
  amount: number;
  dueDate: string;
  status: 'pendiente' | 'vencida' | 'pagada';
  paidAt?: string;
  daysOverdue?: number;
  wompiRef?: string;
}

export interface PaginatedInvoices {
  meta: { total: number; page: number };
  data: Invoice[];
}

export interface KamDashboard {
  vendor: { id: string; name: string; zone: string };
  meta: number;
  ytdReal: number;
  cumplimiento: number;
  totalClients: number;
  activeClients: number;
  riskClients: number;
  top80: { clientCount: number; ofTotal: number };
  cupoAlerts: { clientId: string; name: string; creditUsed: number; creditLimit: number; usedPct: number }[];
  overdueInvoices: number;
}

export interface KamClients {
  meta: { total: number; page: number; pages: number };
  data: {
    id: string; code: string; name: string; city: string;
    segment: string; status: string;
    creditLimit: number; creditUsed: number; creditAvailable: number; creditUsedPct: number;
    ytd: number; lastOrderAt?: string;
  }[];
}

export interface KamCommissions {
  period: string;
  totalInvoicesPaid: number;
  totalVolume: number;
  totalCommission: number;
  rows: { invoiceId: string; clientName: string; amount: number; commission: number; paidAt: string; onTime: boolean }[];
}
