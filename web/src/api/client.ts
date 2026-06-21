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
  role: 'aliado' | 'kam' | 'admin';
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

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  stats: () => req<AdminStats>('/admin/stats'),
  // products
  listProducts: (page = 1, limit = 30, line?: string, active?: boolean) =>
    req<{ meta: PaginatedMeta; data: Product[] }>(
      `/admin/products?page=${page}&limit=${limit}${line ? `&line=${line}` : ''}${active != null ? `&active=${active}` : ''}`
    ),
  createProduct: (dto: Partial<Product> & { ref: string; name: string; line: string; priceMayo: number; packSize: number; stock: number }) =>
    req<Product>('/admin/products', { method: 'POST', body: JSON.stringify(dto) }),
  updateProduct: (id: string, dto: Partial<Product>) =>
    req<Product>(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  // clients
  listClients: (page = 1, limit = 30, status?: string, segment?: string) =>
    req<{ meta: PaginatedMeta; data: AdminClient[] }>(
      `/admin/clients?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}${segment ? `&segment=${segment}` : ''}`
    ),
  updateClient: (id: string, dto: Partial<{ creditLimit: number; status: string; segment: string; vendorId: string }>) =>
    req<AdminClient>(`/admin/clients/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  // orders
  listOrders: (page = 1, limit = 30, status?: string, clientId?: string) =>
    req<{ meta: PaginatedMeta; data: AdminOrder[] }>(
      `/admin/orders?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}${clientId ? `&clientId=${clientId}` : ''}`
    ),
  updateOrderStatus: (id: string, status: string) =>
    req<AdminOrder>(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  // vendors
  listVendors: () => req<AdminVendor[]>('/admin/vendors'),
  // intelligence & treasury
  intelligence: () => req<IntelligenceData>('/admin/intelligence'),
  treasury:     () => req<TreasuryData>('/admin/treasury'),
};

export interface PaginatedMeta { total: number; page: number; pages: number; }

export interface AdminStats {
  totalProducts: number;
  activeProducts: number;
  totalClients: number;
  totalOrders: number;
  totalRevenue: number;
  clientsByStatus: Record<string, number>;
  ordersByStatus: Record<string, number>;
}

export interface AdminClient {
  id: string; code: string; name: string; city: string;
  segment: string; status: string;
  creditLimit: number; creditUsed: number;
  ytd: number; lastOrderAt?: string;
  address?: string;
  vendor?: { id: string; name: string; zone: string };
}

export interface AdminOrder {
  id: string; code: string; status: string; paymentTerm: string;
  subtotal: number; discount: number; total: number; createdAt: string;
  client: { id: string; name: string; city: string };
  vendor?: { name: string };
  items: { qty: number; unitPrice: number; lineTotal: number; ref: string; name: string }[];
}

export interface AdminVendor { id: string; name: string; zone: string; }

export interface IntelligenceData {
  totalRevenue: number;
  top20Count: number;
  top20Revenue: number;
  topClients: {
    id: string; code: string; name: string; city: string;
    segment: string; status: string; ytd: number;
    creditLimit: number; creditUsed: number;
    vendor: { name: string } | null;
  }[];
  citySales: { city: string; sales: number }[];
  segmentation: { counts: Record<string, number>; revenue: Record<string, number> };
  vendorScoreboard: {
    id: string; name: string; zone: string;
    meta: number; real: number;
    clientsCount: number; activeCount: number; pct: number;
  }[];
}

export interface TreasuryData {
  totalCxC: number;
  vencida: number;
  dso: number;
  aging: { bucket: string; label: string; amount: number; count: number; min: number; max: number }[];
  topDeudores: { id: string; name: string; city: string; vendorName: string; due: number; oldest: number }[];
}

export interface KamCommissions {
  period: string;
  totalInvoicesPaid: number;
  totalVolume: number;
  totalCommission: number;
  rows: { invoiceId: string; clientName: string; amount: number; commission: number; paidAt: string; onTime: boolean }[];
}
