import { db, now } from './db.js'

export const EXPENSE_CATEGORIES = [
  { id: 'marketing', label: 'تسويق وإعلانات' },
  { id: 'rent', label: 'إيجار' },
  { id: 'salaries', label: 'رواتب وأجور' },
  { id: 'shipping', label: 'شحن وتوصيل' },
  { id: 'packaging', label: 'تغليف' },
  { id: 'utilities', label: 'مرافق' },
  { id: 'software', label: 'برامج وأدوات' },
  { id: 'other', label: 'أخرى' },
] as const

export const LEDGER_CATEGORIES = [
  { id: 'sales', label: 'مبيعات' },
  { id: 'discount', label: 'خصومات' },
  { id: 'shipping', label: 'شحن محصّل' },
  { id: 'cogs', label: 'تكلفة البضاعة المباعة' },
  { id: 'expense', label: 'مصروفات' },
  { id: 'purchase', label: 'مشتريات' },
  { id: 'adjustment', label: 'قيود يدوية' },
] as const

type EntryInput = {
  date: string
  kind: string
  category: string
  subcategory?: string
  description: string
  amount: number
  cash?: boolean
  profit?: boolean
  sourceType: string
  sourceId?: number | null
  reference?: string
}

/** Idempotent by design: each source/kind pair can only be posted once. */
export function postEntry(entry: EntryInput) {
  const sourceId = entry.sourceId ?? null
  if (sourceId !== null) {
    const exists = db
      .prepare(
        'SELECT 1 FROM ledger_entries WHERE source_type = ? AND source_id = ? AND kind = ?',
      )
      .get(entry.sourceType, sourceId, entry.kind)
    if (exists) return false
  }

  db.prepare(
    `INSERT INTO ledger_entries
      (entry_date, kind, category, subcategory, description, amount, cash, profit,
       source_type, source_id, reference, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    entry.date.slice(0, 10),
    entry.kind,
    entry.category,
    entry.subcategory ?? '',
    entry.description,
    Math.round(Number(entry.amount) * 100) / 100,
    entry.cash === false ? 0 : 1,
    entry.profit === false ? 0 : 1,
    entry.sourceType,
    sourceId,
    entry.reference ?? '',
    now(),
  )
  return true
}

function cogsForOrder(items: Record<string, unknown>[]) {
  return items.reduce((total, item) => {
    const cost = Number(item.cost_price ?? 0)
    return total + Number(item.qty) * cost
  }, 0)
}

/** Rebuilds an order's revenue, discount, shipping and COGS entries without duplicates. */
export function reconcileOrder(orderId: number) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as
    | Record<string, unknown>
    | undefined
  if (!order) {
    db.prepare("DELETE FROM ledger_entries WHERE source_type = 'order' AND source_id = ?").run(
      orderId,
    )
    return
  }

  const items = db
    .prepare('SELECT qty, cost_price FROM order_items WHERE order_id = ?')
    .all(orderId) as Record<string, unknown>[]
  const number = String(order.order_number)
  const subtotal = Number(order.subtotal)
  const discount = Number(order.discount)
  const shipping = Number(order.shipping)
  const revenue = subtotal - discount
  const cogs = cogsForOrder(items)
  const created = String(order.created_at).slice(0, 10)
  const updated = String(order.updated_at).slice(0, 10)
  const cancelled = String(order.status) === 'cancelled'

  postEntry({
    date: created,
    kind: 'sale',
    category: 'sales',
    description: `مبيعات طلب ${number}`,
    amount: subtotal,
    sourceType: 'order',
    sourceId: orderId,
    reference: number,
  })
  if (discount > 0) {
    postEntry({
      date: created,
      kind: 'discount',
      category: 'discount',
      description: `خصم طلب ${number}`,
      amount: -discount,
      sourceType: 'order',
      sourceId: orderId,
      reference: number,
    })
  }
  if (shipping > 0) {
    postEntry({
      date: created,
      kind: 'shipping',
      category: 'shipping',
      description: `شحن محصّل — طلب ${number}`,
      amount: shipping,
      sourceType: 'order',
      sourceId: orderId,
      reference: number,
    })
  }
  postEntry({
    date: created,
    kind: 'cogs',
    category: 'cogs',
    description: `تكلفة البضاعة المباعة — طلب ${number}`,
    amount: -cogs,
    cash: false,
    sourceType: 'order',
    sourceId: orderId,
    reference: number,
  })

  if (cancelled) {
    postEntry({
      date: updated,
      kind: 'sale_reversal',
      category: 'sales',
      description: `إلغاء طلب ${number} — عكس المبيعات`,
      amount: -subtotal,
      sourceType: 'order',
      sourceId: orderId,
      reference: number,
    })
    if (discount > 0) {
      postEntry({
        date: updated,
        kind: 'discount_reversal',
        category: 'discount',
        description: `إلغاء طلب ${number} — عكس الخصم`,
        amount: discount,
        sourceType: 'order',
        sourceId: orderId,
        reference: number,
      })
    }
    if (shipping > 0) {
      postEntry({
        date: updated,
        kind: 'shipping_reversal',
        category: 'shipping',
        description: `إلغاء طلب ${number} — عكس الشحن`,
        amount: -shipping,
        sourceType: 'order',
        sourceId: orderId,
        reference: number,
      })
    }
    postEntry({
      date: updated,
      kind: 'cogs_reversal',
      category: 'cogs',
      description: `إلغاء طلب ${number} — عكس التكلفة`,
      amount: cogs,
      cash: false,
      sourceType: 'order',
      sourceId: orderId,
      reference: number,
    })
  }
}

export function reconcileExpense(expenseId: number) {
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId) as
    | Record<string, unknown>
    | undefined
  if (!row) {
    db.prepare("DELETE FROM ledger_entries WHERE source_type = 'expense' AND source_id = ?").run(
      expenseId,
    )
    return
  }
  postEntry({
    date: String(row.expense_date),
    kind: 'expense',
    category: 'expense',
    subcategory: String(row.category),
    description: String(row.description),
    amount: -Number(row.amount),
    sourceType: 'expense',
    sourceId: expenseId,
    reference: String(row.reference ?? ''),
  })
}

export function reconcilePurchase(purchaseId: number) {
  const row = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId) as
    | Record<string, unknown>
    | undefined
  if (!row) {
    db.prepare("DELETE FROM ledger_entries WHERE source_type = 'purchase' AND source_id = ?").run(
      purchaseId,
    )
    return
  }
  postEntry({
    date: String(row.purchase_date),
    kind: 'purchase',
    category: 'purchase',
    description: `مشتريات${row.reference ? ` — ${String(row.reference)}` : ''}`,
    amount: -Number(row.total),
    cash: true,
    /* Stock purchases move cash, but only hit P&L as COGS when units are sold. */
    profit: false,
    sourceType: 'purchase',
    sourceId: purchaseId,
    reference: String(row.reference ?? ''),
  })
}

/** Called at boot and after every finance write. Keeps the ledger complete and safe to re-run. */
export function reconcileAll() {
  /* Derived entries are rebuilt from source records so flag/category fixes apply to old data too. */
  db.exec(`
    DELETE FROM ledger_entries
    WHERE source_type IN ('order', 'expense', 'purchase');
  `)
  const ids = (sql: string) =>
    (db.prepare(sql).all() as { id: number }[]).map((row) => Number(row.id))
  for (const id of ids('SELECT id FROM orders')) reconcileOrder(id)
  for (const id of ids('SELECT id FROM expenses')) reconcileExpense(id)
  for (const id of ids('SELECT id FROM purchases')) reconcilePurchase(id)
}

export type FinanceQuery = {
  from?: string
  to?: string
  type?: string
  search?: string
  limit?: number
  offset?: number
}

function normalisedRange(query: FinanceQuery) {
  const today = new Date().toISOString().slice(0, 10)
  const from = /^\d{4}-\d{2}-\d{2}$/.test(query.from ?? '') ? query.from! : today.slice(0, 8) + '01'
  const to = /^\d{4}-\d{2}-\d{2}$/.test(query.to ?? '') ? query.to! : today
  return from <= to ? { from, to } : { from: to, to: from }
}

function ledgerWhere(from: string, to: string, type?: string, search?: string) {
  const conditions = ['date(entry_date) BETWEEN ? AND ?']
  const params: (string | number)[] = [from, to]
  if (type && type !== 'all' && LEDGER_CATEGORIES.some((item) => item.id === type)) {
    conditions.push('category = ?')
    params.push(type)
  }
  if (search) {
    conditions.push('(description LIKE ? OR reference LIKE ? OR source_type LIKE ?)')
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  return { sql: conditions.join(' AND '), params }
}

function mapEntry(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    date: String(row.entry_date),
    kind: String(row.kind),
    category: String(row.category),
    subcategory: String(row.subcategory ?? ''),
    description: String(row.description),
    amount: Number(row.amount),
    cash: Boolean(row.cash),
    profit: Boolean(row.profit),
    sourceType: String(row.source_type),
    sourceId: row.source_id == null ? null : Number(row.source_id),
    reference: String(row.reference ?? ''),
    createdAt: String(row.created_at),
  }
}

export function getFinanceReport(query: FinanceQuery = {}) {
  const { from, to } = normalisedRange(query)
  const days = Math.min(
    366,
    Math.max(
      1,
      Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1,
    ),
  )

  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN category = 'sales' THEN amount ELSE 0 END), 0) AS sales,
         COALESCE(SUM(CASE WHEN category = 'discount' THEN amount ELSE 0 END), 0) AS discounts,
         COALESCE(SUM(CASE WHEN category = 'shipping' THEN amount ELSE 0 END), 0) AS shipping,
         COALESCE(SUM(CASE WHEN category = 'cogs' THEN amount ELSE 0 END), 0) AS cogs,
         COALESCE(SUM(CASE WHEN category = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
         COALESCE(SUM(CASE WHEN category = 'purchase' THEN amount ELSE 0 END), 0) AS purchases,
         COALESCE(SUM(CASE WHEN category = 'adjustment' THEN amount ELSE 0 END), 0) AS adjustments,
         COALESCE(SUM(CASE WHEN profit = 1 THEN amount ELSE 0 END), 0) AS netProfit,
         COALESCE(SUM(CASE WHEN cash = 1 THEN amount ELSE 0 END), 0) AS cashFlow,
         COALESCE(SUM(CASE WHEN cash = 1 AND amount > 0 THEN amount ELSE 0 END), 0) AS cashIn,
         COALESCE(SUM(CASE WHEN cash = 1 AND amount < 0 THEN -amount ELSE 0 END), 0) AS cashOut
       FROM ledger_entries WHERE date(entry_date) BETWEEN ? AND ?`,
    )
    .get(from, to) as Record<string, number>

  const num = (key: string) => Number(totals[key] ?? 0)
  const revenue = num('sales') + num('discounts') + num('shipping')
  const grossProfit = revenue + num('cogs')
  const netProfit = num('netProfit')

  const operational = db
    .prepare(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(oi.qty), 0) AS units
       FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.status != 'cancelled' AND date(o.created_at) BETWEEN ? AND ?`,
    )
    .get(from, to) as { orders: number; units: number }

  const inventoryCost = Number(
    (
      db
        .prepare(
          `SELECT COALESCE(SUM(pi.line_total), 0) AS value
           FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id
           WHERE date(p.purchase_date) <= ?`,
        )
        .get(to) as { value: number }
    ).value,
  )
  const cumulativeCogs = Number(
    (
      db
        .prepare("SELECT COALESCE(SUM(amount), 0) AS value FROM ledger_entries WHERE category = 'cogs' AND date(entry_date) <= ?")
        .get(to) as { value: number }
    ).value,
  )

  const dailyRows = db
    .prepare(
      `SELECT date(entry_date) AS day,
              COALESCE(SUM(CASE WHEN category IN ('sales', 'discount', 'shipping') THEN amount ELSE 0 END), 0) AS revenue,
              COALESCE(SUM(CASE WHEN category = 'cogs' THEN amount ELSE 0 END), 0) AS cogs,
              COALESCE(SUM(CASE WHEN category = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
              COALESCE(SUM(CASE WHEN category = 'purchase' THEN amount ELSE 0 END), 0) AS purchases,
              COALESCE(SUM(CASE WHEN cash = 1 THEN amount ELSE 0 END), 0) AS cash,
              COALESCE(SUM(CASE WHEN profit = 1 THEN amount ELSE 0 END), 0) AS profit
       FROM ledger_entries WHERE date(entry_date) BETWEEN ? AND ?
       GROUP BY day ORDER BY day`,
    )
    .all(from, to) as Record<string, string | number>[]
  const dailyMap = new Map(dailyRows.map((row) => [String(row.day), row]))
  const series = Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.parse(`${from}T00:00:00Z`) + index * 86400000)
      .toISOString()
      .slice(0, 10)
    const row = dailyMap.get(date)
    return {
      day: date,
      revenue: Number(row?.revenue ?? 0),
      cogs: Number(row?.cogs ?? 0),
      expenses: Number(row?.expenses ?? 0),
      purchases: Number(row?.purchases ?? 0),
      cash: Number(row?.cash ?? 0),
      profit: Number(row?.profit ?? 0),
    }
  })

  const expenseCategories = (
    db
      .prepare(
        `SELECT subcategory AS category, COALESCE(SUM(-amount), 0) AS amount
         FROM ledger_entries
         WHERE category = 'expense' AND date(entry_date) BETWEEN ? AND ? AND subcategory != ''
         GROUP BY subcategory ORDER BY amount DESC`,
      )
      .all(from, to) as { category: string; amount: number }[]
  ).map((row) => ({ ...row, amount: Number(row.amount) }))

  const productRows = db
    .prepare(
      `SELECT oi.product_id AS productId, oi.name, oi.product_slug AS slug,
              SUM(oi.qty) AS qty,
              SUM(CASE WHEN o.subtotal > 0 THEN oi.qty * oi.price * (1 - o.discount / o.subtotal)
                       ELSE oi.qty * oi.price END) AS revenue,
              SUM(oi.qty * COALESCE(oi.cost_price, p.cost_price, 0)) AS cost
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.status != 'cancelled' AND date(o.created_at) BETWEEN ? AND ?
       GROUP BY oi.product_id ORDER BY revenue - cost DESC LIMIT 8`,
    )
    .all(from, to) as {
    productId: number | null
    name: string
    slug: string | null
    qty: number
    revenue: number
    cost: number
  }[]
  const topProducts = productRows.map((row) => ({
    ...row,
    revenue: Number(row.revenue),
    cost: Number(row.cost),
    profit: Number(row.revenue) - Number(row.cost),
  }))

  const where = ledgerWhere(from, to, query.type, query.search)
  const ledgerCount = Number(
    (
      db
        .prepare(`SELECT COUNT(*) AS c FROM ledger_entries WHERE ${where.sql}`)
        .get(...where.params) as { c: number }
    ).c,
  )
  const limit = Math.min(Math.max(query.limit ?? 100, 1), 500)
  const offset = Math.max(query.offset ?? 0, 0)
  const ledger = (
    db
      .prepare(
        `SELECT * FROM ledger_entries WHERE ${where.sql}
         ORDER BY entry_date DESC, id DESC LIMIT ? OFFSET ?`,
      )
      .all(...where.params, limit, offset) as Record<string, unknown>[]
  ).map(mapEntry)

  return {
    range: { from, to, days },
    summary: {
      sales: num('sales'),
      discounts: num('discounts'),
      shippingIncome: num('shipping'),
      revenue,
      cogs: num('cogs'),
      grossProfit,
      expenses: -num('expenses'),
      purchases: -num('purchases'),
      adjustments: num('adjustments'),
      netProfit,
      margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      cashIn: num('cashIn'),
      cashOut: num('cashOut'),
      cashFlow: num('cashFlow'),
      inventoryValue: Math.max(0, Math.round((inventoryCost + cumulativeCogs) * 100) / 100),
      orders: Number(operational.orders),
      unitsSold: Number(operational.units),
    },
    series,
    expenseCategories,
    topProducts,
    ledger,
    ledgerCount,
    ledgerLimit: limit,
    ledgerOffset: offset,
  }
}

export function listSuppliers() {
  return (
    db.prepare('SELECT id, name, phone, email, notes, created_at AS createdAt FROM suppliers ORDER BY name').all() as {
      id: number
      name: string
      phone: string | null
      email: string | null
      notes: string
      createdAt: string
    }[]
  ).map((row) => ({ ...row, phone: row.phone ?? '', email: row.email ?? '' }))
}

export function listExpenses(limit = 200) {
  return db
    .prepare(
      `SELECT e.id, e.category, e.description, e.amount, e.expense_date AS date,
              e.payment_method AS paymentMethod, e.reference, e.created_at AS createdAt
       FROM expenses e
       ORDER BY e.expense_date DESC, e.id DESC LIMIT ?`,
    )
    .all(Math.min(limit, 500))
}

export function listPurchases(limit = 200) {
  const purchases = db
    .prepare(
      `SELECT p.id, p.reference, p.purchase_date AS date, p.shipping, p.discount, p.total,
              p.notes, p.created_at AS createdAt, p.supplier_id AS supplierId,
              s.name AS supplierName
       FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id
       ORDER BY p.purchase_date DESC, p.id DESC LIMIT ?`,
    )
    .all(Math.min(limit, 500)) as Record<string, unknown>[]
  const items = db
    .prepare(
      `SELECT pi.id, pi.purchase_id AS purchaseId, pi.variant_id AS variantId,
              pi.product_id AS productId, pi.name, pi.sku, pi.qty, pi.unit_cost AS unitCost,
              pi.line_total AS lineTotal
       FROM purchase_items pi ORDER BY pi.id`,
    )
    .all() as Record<string, unknown>[]
  return purchases.map((purchase) => ({
    ...purchase,
    items: items.filter((item) => Number(item.purchaseId) === Number(purchase.id)),
  }))
}

export function listCosts() {
  return db
    .prepare(
      `SELECT p.id AS productId, p.name, p.slug, p.price, p.cost_price AS productCost,
              v.id AS variantId, v.size, v.color, v.sku, v.stock, v.cost_price AS variantCost
       FROM products p JOIN variants v ON v.product_id = p.id
       ORDER BY p.name ASC, CAST(v.size AS REAL) ASC, v.color ASC`,
    )
    .all()
}

export function removeLedgerFor(sourceType: string, sourceId: number) {
  db.prepare('DELETE FROM ledger_entries WHERE source_type = ? AND source_id = ?').run(
    sourceType,
    sourceId,
  )
}
