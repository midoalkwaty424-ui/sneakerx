import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcryptjs'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import { seedCategories, seedProducts, seedOrders } from './seed-data.js'
import { hydrateColorPhotos } from './color-photos.js'

dotenv.config()

const dbPath = path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/sneakerx.db')
fs.mkdirSync(path.dirname(dbPath), { recursive: true })

export const db = new DatabaseSync(dbPath)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    gender TEXT NOT NULL DEFAULT 'unisex',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    price REAL NOT NULL,
    compare_price REAL,
    gender TEXT NOT NULL DEFAULT 'unisex',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    featured INTEGER NOT NULL DEFAULT 0,
    is_new INTEGER NOT NULL DEFAULT 0,
    best_seller INTEGER NOT NULL DEFAULT 0,
    rating REAL NOT NULL DEFAULT 4.8,
    review_count INTEGER NOT NULL DEFAULT 0,
    colors TEXT NOT NULL DEFAULT '[]',
    images TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    stock INTEGER NOT NULL DEFAULT 0,
    UNIQUE(product_id, size, color)
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    governorate TEXT,
    city TEXT,
    address TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    governorate TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    payment_method TEXT NOT NULL DEFAULT 'cod',
    subtotal REAL NOT NULL,
    shipping REAL NOT NULL,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    restocked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER,
    product_slug TEXT,
    name TEXT NOT NULL,
    size TEXT NOT NULL,
    color TEXT,
    color_hex TEXT,
    accent_hex TEXT,
    image TEXT,
    price REAL NOT NULL,
    qty INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL DEFAULT 'percent',
    value REAL NOT NULL,
    min_subtotal REAL NOT NULL DEFAULT 0,
    max_discount REAL,
    max_uses INTEGER NOT NULL DEFAULT 0,
    used_count INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS loyalty_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL UNIQUE,
    points INTEGER NOT NULL DEFAULT 0,
    lifetime_points INTEGER NOT NULL DEFAULT 0,
    referral_code TEXT NOT NULL UNIQUE,
    referred_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS loyalty_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    order_id INTEGER,
    kind TEXT NOT NULL,
    points INTEGER NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT,
    payload TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stock_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    size TEXT NOT NULL,
    color TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    notified_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(variant_id, phone)
  );

  /* --------------------------- finance / ledger -------------------------- */

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    reference TEXT NOT NULL DEFAULT '',
    purchase_date TEXT NOT NULL,
    shipping REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES variants(id) ON DELETE SET NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sku TEXT NOT NULL DEFAULT '',
    qty INTEGER NOT NULL,
    unit_cost REAL NOT NULL,
    line_total REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    expense_date TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    reference TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date TEXT NOT NULL,
    kind TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    cash INTEGER NOT NULL DEFAULT 1,
    profit INTEGER NOT NULL DEFAULT 1,
    source_type TEXT NOT NULL,
    source_id INTEGER,
    reference TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  /* Real-time alerts for the store owner (new orders, delivery updates). */
  CREATE TABLE IF NOT EXISTS admin_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    order_id INTEGER,
    order_number TEXT,
    phone TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    whatsapp_sent INTEGER NOT NULL DEFAULT 0,
    whatsapp_error TEXT,
    whatsapp_text TEXT,
    created_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_notifications_order
    ON admin_notifications(type, order_id) WHERE order_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read, created_at);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_source
    ON ledger_entries(source_type, source_id, kind) WHERE source_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(entry_date);
  CREATE INDEX IF NOT EXISTS idx_ledger_category ON ledger_entries(category);
  CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
  CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);

  CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);
  CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_loyalty_phone ON loyalty_accounts(phone);
  CREATE INDEX IF NOT EXISTS idx_loyalty_events_phone ON loyalty_events(phone);
  CREATE INDEX IF NOT EXISTS idx_analytics_name ON analytics_events(name);
  CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_stock_alerts_status ON stock_alerts(status);
  CREATE INDEX IF NOT EXISTS idx_stock_alerts_variant ON stock_alerts(variant_id);
`)

/* Additive migrations for databases created before the growth/loyalty release. */
function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`)
  }
}

ensureColumn('orders', 'coupon_code', 'coupon_code TEXT')
ensureColumn('orders', 'points_redeemed', 'points_redeemed INTEGER NOT NULL DEFAULT 0')
ensureColumn('orders', 'points_earned', 'points_earned INTEGER NOT NULL DEFAULT 0')
ensureColumn('products', 'cost_price', 'cost_price REAL NOT NULL DEFAULT 0')
ensureColumn('variants', 'cost_price', 'cost_price REAL NOT NULL DEFAULT 0')
ensureColumn('order_items', 'cost_price', 'cost_price REAL NOT NULL DEFAULT 0')

export const now = () => new Date().toISOString()

/** Demo-only cost basis, used so the accounting sample has realistic margins. */
export function demoCostRatio(slug: string) {
  const ratios: Record<string, number> = {
    'x01-aero': 0.58,
    'vanta-runner': 0.61,
    'court-900': 0.55,
    'nova-high': 0.63,
    'halo-knit': 0.56,
    'apex-trail': 0.64,
    'lumen-flow': 0.59,
    'phase-02': 0.6,
    'orbit-low': 0.57,
    'vector-elite': 0.62,
  }
  return ratios[slug] ?? 0.6
}

export function makeSku(slug: string, size: string, color: string) {
  const clean = (s: string) =>
    s
      .normalize('NFKD')
      .replace(/[^\w]+/g, '')
      .toUpperCase()
      .slice(0, 8)
  return `SX-${clean(slug)}-${clean(color)}-${clean(size)}`
}

function createAdmin() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM admin_users').get() as { c: number }
  if (count.c > 0) return
  const email = (process.env.ADMIN_EMAIL || 'admin@sneakerx.store').toLowerCase()
  const password = process.env.ADMIN_PASSWORD || 'SneakerX@2026'
  db.prepare(
    'INSERT INTO admin_users (email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(email, 'مدير SneakerX', bcrypt.hashSync(password, 10), 'admin', now())
}

/**
 * Seeds the store catalog. By default it also creates fake customers, orders and
 * finance samples for local development. Production boot uses `activity: false`
 * so a fresh database starts with a real, empty operations dashboard.
 */
export function seedDemoData(options: { activity?: boolean } = {}) {
  const activity = options.activity !== false
  const tx = () => db.exec('BEGIN IMMEDIATE')
  tx()
  try {
    db.exec(`
      DELETE FROM admin_notifications;
      DELETE FROM order_items;
      DELETE FROM orders;
      DELETE FROM customers;
      DELETE FROM variants;
      DELETE FROM products;
      DELETE FROM categories;
      DELETE FROM subscribers;
      DELETE FROM loyalty_events;
      DELETE FROM loyalty_accounts;
      DELETE FROM analytics_events;
      DELETE FROM stock_alerts;
      DELETE FROM ledger_entries;
      DELETE FROM purchase_items;
      DELETE FROM purchases;
      DELETE FROM expenses;
      DELETE FROM suppliers;
    `)

    const insertCategory = db.prepare(
      'INSERT INTO categories (name, slug, gender, created_at) VALUES (?, ?, ?, ?)',
    )
    const categoryIds = new Map<string, number>()
    for (const c of seedCategories) {
      const r = insertCategory.run(c.name, c.slug, c.gender, now())
      categoryIds.set(c.slug, Number(r.lastInsertRowid))
    }

    const insertProduct = db.prepare(`
      INSERT INTO products
        (slug, name, subtitle, description, price, compare_price, cost_price, gender, category_id,
         featured, is_new, best_seller, rating, review_count, colors, images, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertVariant = db.prepare(
      'INSERT INTO variants (product_id, size, color, sku, stock, cost_price) VALUES (?, ?, ?, ?, ?, ?)',
    )

    const products = seedProducts.map((p) => {
      const createdAt = new Date(Date.now() - p.daysAgo * 86400000).toISOString()
      const unitCost = Math.round(p.price * demoCostRatio(p.slug))
      const result = insertProduct.run(
        p.slug,
        p.name,
        p.subtitle,
        p.description,
        p.price,
        p.comparePrice ?? null,
        unitCost,
        p.gender,
        categoryIds.get(p.category) ?? null,
        p.featured ? 1 : 0,
        p.isNew ? 1 : 0,
        p.bestSeller ? 1 : 0,
        0,
        0,
        JSON.stringify(p.colors),
        JSON.stringify(p.images),
        createdAt,
        createdAt,
      )
      const id = Number(result.lastInsertRowid)
      for (const size of p.sizes) {
        for (const color of p.colors) {
          const stock = p.stock[size] ?? 6
          insertVariant.run(
            id,
            size,
            color.name,
            makeSku(p.slug, size, color.name),
            stock,
            unitCost,
          )
        }
      }
      return { ...p, id, unitCost }
    })

    if (activity) {
    const insertCustomer = db.prepare(`
      INSERT INTO customers (name, phone, email, governorate, city, address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertOrder = db.prepare(`
      INSERT INTO orders
        (order_number, customer_id, customer_name, phone, email, governorate, city, address, notes,
         payment_method, subtotal, shipping, discount, total, status, restocked, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'cod', ?, ?, 0, ?, ?, 0, ?, ?)
    `)
    const insertItem = db.prepare(`
      INSERT INTO order_items
        (order_id, product_id, product_slug, name, size, color, color_hex, accent_hex, image, price, qty, cost_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
    `)

    for (const o of seedOrders) {
      const product = products.find((p) => p.slug === o.productSlug)!
      const color = product.colors[0]
      const createdAt = new Date(Date.now() - o.daysAgo * 86400000 - 3600000).toISOString()
      const customerResult = insertCustomer.run(
        o.customer.name,
        o.customer.phone,
        o.customer.email ?? null,
        o.customer.governorate,
        o.customer.city,
        o.customer.address,
        createdAt,
        createdAt,
      )
      const subtotal = product.price * o.qty
      const shipping = subtotal >= 2500 ? 0 : 75
      const total = subtotal + shipping
      const orderResult = insertOrder.run(
        o.orderNumber,
        Number(customerResult.lastInsertRowid),
        o.customer.name,
        o.customer.phone,
        o.customer.email ?? null,
        o.customer.governorate,
        o.customer.city,
        o.customer.address,
        null,
        subtotal,
        shipping,
        total,
        o.status,
        createdAt,
        createdAt,
      )
      insertItem.run(
        Number(orderResult.lastInsertRowid),
        product.id,
        product.slug,
        product.name,
        o.size,
        color.name,
        color.hex,
        color.accent,
        product.price,
        o.qty,
        product.unitCost,
      )
    }
    }

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function seedCoupons() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM coupons').get() as { c: number }
  if (count.c > 0) return
  const insert = db.prepare(
    `INSERT INTO coupons
      (code, kind, value, min_subtotal, max_discount, max_uses, used_count, active, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
  )
  const nowValue = now()
  const inSixMonths = new Date(Date.now() + 180 * 86400000).toISOString()
  insert.run('WELCOME10', 'percent', 10, 0, 600, 0, null, nowValue)
  insert.run('SX500', 'fixed', 500, 4000, null, 0, null, nowValue)
  insert.run('FIRST15', 'percent', 15, 0, 800, 150, inSixMonths, nowValue)
}

/** Explicit dev-only helper: call from `server/seed.ts` when a full sample is wanted. */
export function seedFinanceDemoData() {
  /* Always backfill costs for databases created before the accounting release. */
  const products = db.prepare('SELECT id, slug, price FROM products').all() as {
    id: number
    slug: string
    price: number
  }[]
  const setProductCost = db.prepare('UPDATE products SET cost_price = ? WHERE id = ? AND cost_price = 0')
  const setVariantCost = db.prepare(
    'UPDATE variants SET cost_price = ? WHERE product_id = ? AND cost_price = 0',
  )
  for (const product of products) {
    const unitCost = Math.round(product.price * demoCostRatio(product.slug))
    setProductCost.run(unitCost, product.id)
    setVariantCost.run(unitCost, product.id)
  }
  db.prepare(
    `UPDATE order_items SET cost_price =
       COALESCE((SELECT cost_price FROM products WHERE id = order_items.product_id), 0)
     WHERE cost_price = 0`,
  ).run()

  const marker = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM suppliers) + (SELECT COUNT(*) FROM expenses)
             + (SELECT COUNT(*) FROM purchases) AS c`,
    )
    .get() as { c: number }
  if (marker.c > 0) return

  const day = (daysAgo: number) =>
    new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10)
  const timestamp = now()

  const supplierResult = db
    .prepare('INSERT INTO suppliers (name, phone, email, notes, created_at) VALUES (?, ?, ?, ?, ?)')
    .run('MN للاستيراد', '+20 100 111 2233', 'supply@mn-example.com', 'مورد رئيسي للأحذية الرياضية', timestamp)
  const supplierId = Number(supplierResult.lastInsertRowid)

  const expenseRows: [string, string, number, number, string][] = [
    ['marketing', 'حملة إعلانات إنستغرام وتيك توك', 4200, 2, 'FB-2206'],
    ['rent', 'إيجار المخزن — يونيو', 6500, 5, 'RENT-06'],
    ['salaries', 'رواتب فريق التشغيل', 9800, 9, 'PAY-09'],
    ['packaging', 'علب وتغليف', 1750, 14, 'PKG-014'],
    ['shipping', 'شحن مرتجعات ومكالمات', 890, 19, 'SHP-019'],
    ['utilities', 'كهرباء وإنترنت المكتب', 640, 24, 'UTL-024'],
    ['other', 'صيانة وتكاليف متنوعة', 480, 28, 'MISC-028'],
  ]
  const insertExpense = db.prepare(
    `INSERT INTO expenses (category, description, amount, expense_date, payment_method, reference, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  for (const [category, description, amount, daysAgo, reference] of expenseRows) {
    insertExpense.run(category, description, amount, day(daysAgo), 'cash', reference, timestamp)
  }

  const insertPurchase = db.prepare(
    `INSERT INTO purchases (supplier_id, reference, purchase_date, shipping, discount, total, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const insertPurchaseItem = db.prepare(
    `INSERT INTO purchase_items (purchase_id, variant_id, product_id, name, sku, qty, unit_cost, line_total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const addStock = db.prepare('UPDATE variants SET stock = stock + ? WHERE id = ?')
  const purchasePlan: [string, number, number, number, number][] = [
    ['x01-aero', 26, 24, 18, 150],
    ['halo-knit', 21, 30, 12, 0],
    ['court-900', 11, 20, 9, 100],
  ]
  for (const [slug, daysAgo, qty, unitCost, shipping] of purchasePlan) {
    const product = products.find((p) => p.slug === slug)
    if (!product) continue
    const variants = db
      .prepare('SELECT id, sku FROM variants WHERE product_id = ? ORDER BY id LIMIT 2')
      .all(product.id) as { id: number; sku: string }[]
    if (variants.length === 0) continue
    const firstQty = qty
    const secondQty = Math.max(1, Math.round(qty * 0.6))
    const total = (firstQty + secondQty) * unitCost + shipping
    const result = insertPurchase.run(
      supplierId,
      `PO-${slug.toUpperCase().slice(0, 4)}-${daysAgo}`,
      day(daysAgo),
      shipping,
      0,
      total,
      'مشتريات تجريبية لتوضيح دورة المخزون والتكلفة',
      timestamp,
    )
    const purchaseId = Number(result.lastInsertRowid)
    for (const [index, variant] of variants.entries()) {
      const lineQty = index === 0 ? firstQty : secondQty
      insertPurchaseItem.run(
        purchaseId,
        variant.id,
        product.id,
        slug.toUpperCase(),
        variant.sku,
        lineQty,
        unitCost,
        lineQty * unitCost,
      )
      addStock.run(lineQty, variant.id)
      db.prepare('UPDATE variants SET cost_price = ? WHERE id = ?').run(unitCost, variant.id)
    }
  }
}

function backfillColorPhotos() {
  const rows = db.prepare('SELECT id, colors FROM products').all() as {
    id: number
    colors: string
  }[]
  const update = db.prepare('UPDATE products SET colors = ? WHERE id = ?')
  for (const row of rows) {
    const next = hydrateColorPhotos(row.colors)
    if (next !== row.colors) update.run(next, row.id)
  }
}

export function ensureDatabase() {
  createAdmin()
  seedCoupons()
  const count = db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }
  /* Fresh installs start with products only — no fake orders, customers or finance samples. */
  if (count.c === 0) seedDemoData({ activity: false })
  backfillColorPhotos()
}

export function orderNumber() {
  const y = new Date().getFullYear().toString().slice(-2)
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6)
  return `SX-${y}-${rand}`
}
