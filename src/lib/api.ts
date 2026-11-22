import type {
  AdminAnalytics,
  AdminCouponInput,
  AdminCustomer,
  AdminLoyalty,
  AdminLoyaltyAccount,
  AdminNotification,
  AdminStats,
  AdminUser,
  CostRow,
  Expense,
  ExpenseInput,
  FinanceOptions,
  FinanceReport,
  LedgerEntry,
  Purchase,
  PurchaseInput,
  Supplier,
  AssistantResult,
  Category,
  Coupon,
  InventoryRow,
  LoyaltyLookup,
  LoyaltyPreview,
  Order,
  OrderRewards,
  OrderSummary,
  Product,
  ProductInput,
  ProductList,
  Recommendations,
  StockAlert,
  StoreConfig,
} from './types'

const BASE = '/api'
/** Mirrors the httpOnly admin cookie so the login page can skip a needless 401 probe. */
const ADMIN_SESSION_KEY = 'sneakerx.admin.session.v1'

export class ApiRequestError extends Error {
  status: number
  details?: unknown
  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof FormData
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  })
  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  if (!response.ok) {
    const payload = data as { error?: string; details?: unknown } | null
    throw new ApiRequestError(
      payload?.error || 'حدث خطأ في الاتصال بالسيرفر',
      response.status,
      payload?.details,
    )
  }
  return data as T
}

function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export type ProductQuery = {
  search?: string
  gender?: string
  category?: string
  collection?: string
  size?: string
  minPrice?: number | string
  maxPrice?: number | string
  color?: string
  onSale?: boolean
  minRating?: number
  sort?: string
  page?: number
  limit?: number
  inStock?: boolean
}

export const api = {
  config: () => request<StoreConfig>('/config'),
  categories: () => request<{ categories: Category[] }>('/categories'),
  products: (query: ProductQuery = {}, signal?: AbortSignal) =>
    request<ProductList>(`/products${qs(query)}`, signal ? { signal } : {}),
  product: (slug: string, signal?: AbortSignal) =>
    request<{ product: Product; related: Product[] }>(
      `/products/${encodeURIComponent(slug)}`,
      signal ? { signal } : {},
    ),
  createOrder: (payload: {
    customer: {
      name: string
      phone: string
      email?: string
      governorate: string
      city: string
      address: string
      notes?: string
    }
    paymentMethod: 'cod'
    couponCode?: string
    redeemPoints?: number
    referralCode?: string
    items: { productId: number; size: string; color: string; qty: number }[]
  }) =>
    request<{ order: Order; rewards?: OrderRewards }>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  validateCoupon: (code: string, subtotal: number) =>
    request<{ coupon: Coupon; discount: number }>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    }),
  loyaltyLookup: (phone: string) =>
    request<LoyaltyLookup>('/loyalty/lookup', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  loyaltyPreview: (phone: string, subtotal: number) =>
    request<LoyaltyPreview>('/loyalty/preview', {
      method: 'POST',
      body: JSON.stringify({ phone, subtotal }),
    }),
  track: (name: string, path: string, payload?: Record<string, unknown>) =>
    request<{ ok: boolean }>('/analytics', {
      method: 'POST',
      body: JSON.stringify({ name, path, payload }),
    }),
  assistant: (input: {
    query?: string
    budget?: number
    useCase?: string
    color?: string
    gender?: string
    size?: string
  }) =>
    request<AssistantResult>('/assistant/recommend', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  recommendations: (slugs: string[], limit = 4, signal?: AbortSignal) =>
    request<Recommendations>(
      `/recommendations${qs({ slugs: slugs.join(','), limit })}`,
      signal ? { signal } : {},
    ),
  order: (orderNumber: string, phone: string) =>
    request<{ order: Order }>(
      `/orders/${encodeURIComponent(orderNumber)}?phone=${encodeURIComponent(phone)}`,
    ),
  subscribe: (email: string) =>
    request<{ ok: boolean; alreadySubscribed?: boolean }>('/newsletter', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  createStockAlert: (variantId: number, phone: string) =>
    request<{ ok: boolean; id: number; alreadySubscribed: boolean; message: string }>(
      '/stock-alerts',
      { method: 'POST', body: JSON.stringify({ variantId, phone }) },
    ),

  admin: {
    notifications: (limit = 40) =>
      request<{
        notifications: AdminNotification[]
        unread: number
        whatsappConfigured: boolean
      }>(`/admin/notifications?limit=${limit}`),
    unreadNotifications: () => request<{ count: number }>('/admin/notifications/unread'),
    markNotificationRead: (id: number) =>
      request<{ ok: boolean }>(`/admin/notifications/${id}/read`, { method: 'PATCH' }),
    markAllNotificationsRead: () =>
      request<{ ok: boolean; updated: number }>('/admin/notifications/read-all', {
        method: 'PATCH',
      }),
    resendOrderWhatsApp: (id: number) =>
      request<{ ok: boolean; customerSent: boolean; adminSent: boolean; error: string | null }>(
        `/admin/notifications/${id}/whatsapp`,
        { method: 'POST' },
      ),
    hasAdminSession: () => localStorage.getItem(ADMIN_SESSION_KEY) === '1',
    clearAdminSession: () => localStorage.removeItem(ADMIN_SESSION_KEY),
    login: async (email: string, password: string) => {
      const result = await request<{ admin: AdminUser }>('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem(ADMIN_SESSION_KEY, '1')
      return result
    },
    logout: async () => {
      try {
        return await request<{ ok: boolean }>('/admin/logout', { method: 'POST' })
      } finally {
        localStorage.removeItem(ADMIN_SESSION_KEY)
      }
    },
    me: () => request<{ admin: AdminUser }>('/admin/me'),
    stats: () => request<AdminStats>('/admin/stats'),
    products: () => request<{ products: Product[] }>('/admin/products'),
    product: (id: number) => request<{ product: Product }>(`/admin/products/${id}`),
    createProduct: (input: ProductInput) =>
      request<{ product: Product }>('/admin/products', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    updateProduct: (id: number, input: ProductInput) =>
      request<{ product: Product }>(`/admin/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    deleteProduct: (id: number) =>
      request<{ ok: boolean }>(`/admin/products/${id}`, { method: 'DELETE' }),
    categories: () => request<{ categories: Category[] }>('/admin/categories'),
    createCategory: (input: { name: string; slug: string; gender: string }) =>
      request<{ id: number }>('/admin/categories', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    updateCategory: (id: number, input: { name: string; slug: string; gender: string }) =>
      request<{ ok: boolean }>(`/admin/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    deleteCategory: (id: number) =>
      request<{ ok: boolean }>(`/admin/categories/${id}`, { method: 'DELETE' }),
    orders: (params: { status?: string; search?: string } = {}) =>
      request<{ orders: OrderSummary[] }>(`/admin/orders${qs(params)}`),
    order: (id: number) => request<{ order: Order }>(`/admin/orders/${id}`),
    updateOrderStatus: (id: number, status: string) =>
      request<{ order: Order }>(`/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    customers: () => request<{ customers: AdminCustomer[] }>('/admin/customers'),
    customer: (id: number) =>
      request<{ customer: AdminCustomer; orders: OrderSummary[] }>(`/admin/customers/${id}`),
    inventory: (low = false) => request<{ inventory: InventoryRow[] }>(`/admin/inventory${low ? '?low=true' : ''}`),
    updateStock: (id: number, stock: number) =>
      request<{ ok: boolean; stock: number }>(`/admin/variants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock }),
      }),
    stockAlerts: (status?: string) =>
      request<{ alerts: StockAlert[] }>(`/admin/stock-alerts${status ? `?status=${status}` : ''}`),
    markStockAlertNotified: (id: number) =>
      request<{ ok: boolean }>(`/admin/stock-alerts/${id}/notified`, { method: 'PATCH' }),
    deleteStockAlert: (id: number) =>
      request<{ ok: boolean }>(`/admin/stock-alerts/${id}`, { method: 'DELETE' }),
    upload: (file: File) => {
      const body = new FormData()
      body.append('image', file)
      return request<{ url: string }>('/admin/upload', { method: 'POST', body })
    },
    coupons: () => request<{ coupons: Coupon[] }>('/admin/coupons'),
    createCoupon: (input: AdminCouponInput) =>
      request<{ coupon: Coupon }>('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    updateCoupon: (id: number, input: Partial<AdminCouponInput>) =>
      request<{ coupon: Coupon }>(`/admin/coupons/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deleteCoupon: (id: number) =>
      request<{ ok: boolean }>(`/admin/coupons/${id}`, { method: 'DELETE' }),
    loyalty: () => request<AdminLoyalty>('/admin/loyalty'),
    adjustPoints: (phone: string, points: number, note?: string) =>
      request<{ account: AdminLoyaltyAccount }>(
        `/admin/loyalty/${encodeURIComponent(phone)}/adjust`,
        { method: 'POST', body: JSON.stringify({ points, note }) },
      ),
    analytics: (days = 14) => request<AdminAnalytics>(`/admin/analytics?days=${days}`),

    finance: (params: {
      from?: string
      to?: string
      type?: string
      search?: string
      limit?: number
      offset?: number
    } = {}) => request<FinanceReport>(`/admin/finance${qs(params)}`),
    financeOptions: () => request<FinanceOptions>('/admin/finance/options'),
    financeCsvUrl: (params: { from?: string; to?: string; type?: string; search?: string } = {}) =>
      `${BASE}/admin/finance/export${qs(params)}`,
    expenses: () => request<{ expenses: Expense[] }>('/admin/finance/expenses'),
    createExpense: (input: ExpenseInput) =>
      request<{ expense: Expense }>('/admin/finance/expenses', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    deleteExpense: (id: number) =>
      request<{ ok: boolean }>(`/admin/finance/expenses/${id}`, { method: 'DELETE' }),
    purchases: () => request<{ purchases: Purchase[] }>('/admin/finance/purchases'),
    createPurchase: (input: PurchaseInput) =>
      request<{ purchase: Purchase }>('/admin/finance/purchases', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    deletePurchase: (id: number) =>
      request<{ ok: boolean }>(`/admin/finance/purchases/${id}`, { method: 'DELETE' }),
    suppliers: () => request<{ suppliers: Supplier[] }>('/admin/finance/suppliers'),
    createSupplier: (input: { name: string; phone?: string; email?: string; notes?: string }) =>
      request<{ supplier: Supplier }>('/admin/finance/suppliers', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    deleteSupplier: (id: number) =>
      request<{ ok: boolean }>(`/admin/finance/suppliers/${id}`, { method: 'DELETE' }),
    costs: () => request<{ costs: CostRow[] }>('/admin/finance/costs'),
    updateCost: (input: { variantId?: number; productId?: number; costPrice: number }) =>
      request<{ ok: boolean; costPrice: number }>('/admin/finance/costs', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    createAdjustment: (input: {
      date: string
      description: string
      amount: number
      reference?: string
    }) =>
      request<{ ok: boolean }>('/admin/finance/adjustments', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    deleteLedgerEntry: (id: number) =>
      request<{ ok: boolean }>(`/admin/finance/ledger/${id}`, { method: 'DELETE' }),
  },
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiRequestError) return error.message
  if (error instanceof Error) return error.message
  return 'حدث خطأ غير متوقع'
}
