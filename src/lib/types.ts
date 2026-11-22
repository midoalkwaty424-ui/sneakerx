export type ColorOption = {
  name: string
  hex: string
  accent: string
  image?: string | null
  images?: string[]
}

export type Variant = { id: number; size: string; color: string; sku: string; stock: number }

export type Product = {
  id: number
  slug: string
  name: string
  subtitle: string
  description: string
  price: number
  comparePrice: number | null
  gender: 'men' | 'women' | 'unisex'
  category: { id: number; name: string; slug: string } | null
  featured: boolean
  isNew: boolean
  bestSeller: boolean
  rating: number
  reviewCount: number
  colors: ColorOption[]
  images: string[]
  sizes: { size: string; stock: number }[]
  variants: Variant[]
  totalStock: number
  createdAt: string
}

export type Category = {
  id: number
  name: string
  slug: string
  gender: string
  productCount: number
}

export type ProductList = {
  items: Product[]
  total: number
  page: number
  pages: number
  priceRange: { min: number; max: number }
}

export type StoreConfig = {
  currency: string
  freeShippingThreshold: number
  shippingFee: number
  governorates: string[]
  paymentMethods: { id: string; name: string; available: boolean; note?: string }[]
  assistantMode: 'ai' | 'rules'
}

export type CartItem = {
  key: string
  productId: number
  slug: string
  name: string
  size: string
  color: string
  colorHex: string
  accentHex: string
  image: string | null
  price: number
  qty: number
}

export type OrderItem = {
  id: number
  productId: number | null
  slug: string | null
  name: string
  size: string
  color: string
  colorHex: string | null
  accentHex: string | null
  image: string | null
  price: number
  qty: number
}

export type Order = {
  id: number
  orderNumber: string
  status: string
  paymentMethod: string
  subtotal: number
  shipping: number
  discount: number
  couponCode?: string | null
  pointsRedeemed?: number
  pointsEarned?: number
  total: number
  notes: string
  restocked?: number
  createdAt: string
  updatedAt: string
  customer: {
    id?: number
    name: string
    phone: string
    email: string
    governorate: string
    city: string
    address: string
  }
  items: OrderItem[]
}

export type OrderSummary = {
  id: number
  orderNumber: string
  customerName: string
  phone: string
  governorate: string
  city: string
  total: number
  status: string
  itemsCount: number
  createdAt: string
}

export type AdminUser = { email: string; name: string; role: string }

export type AdminNotification = {
  id: number
  type: string
  title: string
  body: string
  orderId: number | null
  orderNumber: string | null
  phone: string | null
  read: boolean
  whatsappSent: boolean
  whatsappError: string | null
  whatsappUrl: string | null
  createdAt: string
}

export type AdminStats = {
  kpis: {
    revenue: number
    orders: number
    products: number
    customers: number
    newOrders: number
    subscribers: number
    lowStock: number
    outOfStock: number
    loyaltyAccounts?: number
    loyaltyPoints?: number
    couponUses?: number
  }
  series: { day: string; revenue: number; orders: number }[]
  statuses: { status: string; count: number }[]
  topProducts: { productId: number; name: string; slug: string; qty: number; revenue: number }[]
  lowStockItems: {
    id: number
    size: string
    color: string
    stock: number
    name: string
    slug: string
    productId: number
  }[]
  recentOrders: OrderSummary[]
}

export type AdminCustomer = {
  id: number
  name: string
  phone: string
  email: string | null
  governorate: string | null
  city: string | null
  address: string | null
  createdAt: string
  ordersCount: number
  totalSpent: number
  lastOrder: string | null
}

export type InventoryRow = {
  id: number
  size: string
  color: string
  sku: string
  stock: number
  name: string
  slug: string
  productId: number
}

export type StockAlertStatus = 'pending' | 'ready' | 'notified'

export type StockAlert = {
  id: number
  productId: number
  variantId: number
  phone: string
  size: string
  color: string
  status: StockAlertStatus
  notifiedAt: string | null
  createdAt: string
  productName: string
  productSlug: string
  stock: number
  whatsappUrl: string
}

export type ProductInput = {
  name: string
  slug?: string
  subtitle?: string
  description: string
  price: number
  comparePrice?: number | null
  gender: 'men' | 'women' | 'unisex'
  categoryId?: number | null
  featured?: boolean
  isNew?: boolean
  bestSeller?: boolean
  rating?: number
  reviewCount?: number
  colors: ColorOption[]
  sizes: string[]
  images: string[]
  stock?: number
}

/* ------------------------------- growth -------------------------------- */

export type Coupon = {
  id: number
  code: string
  kind: 'percent' | 'fixed'
  value: number
  minSubtotal: number
  maxDiscount: number | null
  maxUses: number
  usedCount: number
  active: boolean
  expiresAt: string | null
  description: string
}

export type AppliedCoupon = {
  code: string
  kind: 'percent' | 'fixed'
  value: number
  discount: number
  description: string
  minSubtotal: number
  maxDiscount: number | null
}

export type LoyaltyHistoryItem = {
  id: number
  orderId: number | null
  kind: 'earn' | 'redeem' | 'referral' | 'adjust'
  points: number
  note: string | null
  createdAt: string
}

export type LoyaltyAccount = {
  id: number
  phone: string
  points: number
  lifetimePoints: number
  referralCode: string
  referredBy?: string | null
  createdAt: string
  ordersCount: number
  totalSpent: number
}

export type LoyaltyProgram = {
  earnRate: number
  valuePerPoint: number
  minRedeem: number
  redeemRatio: number
}

export type LoyaltyLookup = {
  account: LoyaltyAccount
  history: LoyaltyHistoryItem[]
  program: LoyaltyProgram
}

export type LoyaltyPreview = {
  points: number
  lifetimePoints: number
  referralCode: string
  minRedeem: number
  valuePerPoint: number
  maxRedeem: number
  canRedeem: boolean
  earnRate: number
  ordersCount: number
  totalSpent: number
}

export type OrderRewards = {
  pointsEarned: number
  pointsBalance: number
  referralCode: string
}

export type AssistantPick = {
  product: Product
  score: number
  reasons: string[]
}

export type AssistantResult = {
  picks: AssistantPick[]
  message: string
  source?: 'ai' | 'rules'
  interpreted: {
    budget?: number
    useCase?: string
    gender?: string
    color?: string
    size?: string
  }
}

export type Recommendations = {
  items: Product[]
  basis: string
  reasons: Record<string, string>
}

export type AdminCouponInput = {
  code: string
  kind: 'percent' | 'fixed'
  value: number
  minSubtotal?: number
  maxDiscount?: number | null
  maxUses?: number
  active?: boolean
  expiresAt?: string | null
}

export type AdminLoyaltyAccount = {
  id: number
  phone: string
  points: number
  lifetimePoints: number
  referralCode: string
  referredBy: string | null
  createdAt: string
  ordersCount: number
  totalSpent: number
}

export type AdminLoyalty = {
  accounts: AdminLoyaltyAccount[]
  summary: {
    accounts: number
    points: number
    lifetimePoints: number
    referred: number
  }
}

export type AdminAnalytics = {
  totals: { name: string; count: number }[]
  series: { day: string; counts: Record<string, number> }[]
  funnel: { step: string; label: string; value: number }[]
  days: number
}

/* ------------------------------- finance -------------------------------- */

export type FinancePoint = {
  day: string
  revenue: number
  cogs: number
  expenses: number
  purchases: number
  cash: number
  profit: number
}

export type LedgerEntry = {
  id: number
  date: string
  kind: string
  category: string
  subcategory: string
  description: string
  amount: number
  cash: boolean
  profit: boolean
  sourceType: string
  sourceId: number | null
  reference: string
  createdAt: string
}

export type FinanceSummary = {
  sales: number
  discounts: number
  shippingIncome: number
  revenue: number
  cogs: number
  grossProfit: number
  expenses: number
  purchases: number
  adjustments: number
  netProfit: number
  margin: number
  cashIn: number
  cashOut: number
  cashFlow: number
  inventoryValue: number
  orders: number
  unitsSold: number
}

export type FinanceReport = {
  range: { from: string; to: string; days: number }
  summary: FinanceSummary
  series: FinancePoint[]
  expenseCategories: { category: string; amount: number }[]
  topProducts: {
    productId: number | null
    name: string
    slug: string | null
    qty: number
    revenue: number
    cost: number
    profit: number
  }[]
  ledger: LedgerEntry[]
  ledgerCount: number
  ledgerLimit: number
  ledgerOffset: number
}

export type Expense = {
  id: number
  category: string
  description: string
  amount: number
  date: string
  paymentMethod: string
  reference: string
  createdAt: string
}

export type PurchaseItem = {
  id: number
  purchaseId: number
  variantId: number
  productId: number
  name: string
  sku: string
  qty: number
  unitCost: number
  lineTotal: number
}

export type Purchase = {
  id: number
  reference: string
  date: string
  shipping: number
  discount: number
  total: number
  notes: string
  createdAt: string
  supplierId: number | null
  supplierName: string | null
  items: PurchaseItem[]
}

export type Supplier = {
  id: number
  name: string
  phone: string
  email: string
  notes: string
  createdAt: string
}

export type CostRow = {
  productId: number
  name: string
  slug: string
  price: number
  productCost: number
  variantId: number
  size: string
  color: string
  sku: string
  stock: number
  variantCost: number
}

export type FinanceOptions = {
  expenseCategories: { id: string; label: string }[]
  ledgerCategories: { id: string; label: string }[]
  paymentMethods: { id: string; label: string }[]
}

export type ExpenseInput = {
  category: string
  description: string
  amount: number
  date: string
  paymentMethod: string
  reference: string
}

export type PurchaseInput = {
  supplierId: number | null
  reference: string
  date: string
  shipping: number
  discount: number
  notes: string
  items: { variantId: number; qty: number; unitCost: number }[]
}
