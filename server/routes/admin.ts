import { Router } from 'express'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { z } from 'zod'
import { db, makeSku, now } from '../db.js'
import {
  ORDER_STATUSES,
  getProductById,
  listAllProducts,
  listCategories,
  mapProduct,
} from '../catalog.js'
import { clearAuthCookie, loginRateLimit, requireAdmin, setAuthCookie, signToken } from '../auth.js'
import { withColorPhotos } from '../color-photos.js'
import { ApiError, asyncHandler } from '../http.js'
import { getOrder, orderListRow } from '../orders.js'
import {
  listAdminNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  resendOrderWhatsApp,
  unreadNotificationsCount,
} from '../notifications.js'
import { isWhatsAppConfigured, sendStatusNotification } from '../whatsapp.js'
import {
  EXPENSE_CATEGORIES,
  LEDGER_CATEGORIES,
  getFinanceReport,
  listCosts,
  listExpenses,
  listPurchases,
  listSuppliers,
  postEntry,
  reconcileExpense,
  reconcileOrder,
  reconcilePurchase,
  removeLedgerFor,
} from '../finance.js'
import { awardPoints, couponView, ensureAccount, reverseOrderRewards } from '../rewards.js'
import {
  deleteStockAlert,
  listStockAlerts,
  markAlertsReady,
  markStockAlertNotified,
} from '../stock-alerts.js'

export const adminRouter = Router()

const loginSchema = z.object({
  email: z.string().trim().email('بريد إلكتروني غير صحيح'),
  password: z.string().min(1, 'أدخل كلمة المرور'),
})

adminRouter.post('/login', loginRateLimit, (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, 'بيانات الدخول غير صحيحة')
    const email = parsed.data.email.toLowerCase()
    const admin = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email) as
      | Record<string, unknown>
      | undefined
    if (!admin || !bcrypt.compareSync(parsed.data.password, String(admin.password_hash))) {
      throw new ApiError(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة')
    }
    const payload = {
      sub: String(admin.id),
      email: String(admin.email),
      name: String(admin.name),
      role: String(admin.role),
    }
    setAuthCookie(res, signToken(payload))
    res.json({ admin: { email: payload.email, name: payload.name, role: payload.role } })
  } catch (error) {
    next(error)
  }
})

adminRouter.use(requireAdmin)

adminRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

adminRouter.get('/me', (req, res) => {
  res.json({
    admin: {
      email: req.admin!.email,
      name: req.admin!.name,
      role: req.admin!.role,
    },
  })
})

adminRouter.get('/stats', (_req, res, next) => {
  try {
    const one = (sql: string, ...params: (string | number)[]) =>
      db.prepare(sql).get(...params) as Record<string, unknown>

    const revenue = Number(
      one("SELECT COALESCE(SUM(total), 0) AS v FROM orders WHERE status != 'cancelled'").v,
    )
    const orders = Number(one('SELECT COUNT(*) AS v FROM orders').v)
    const products = Number(one('SELECT COUNT(*) AS v FROM products').v)
    const customers = Number(one('SELECT COUNT(*) AS v FROM customers').v)
    const newOrders = Number(
      one("SELECT COUNT(*) AS v FROM orders WHERE status IN ('pending', 'confirmed')").v,
    )
    const subscribers = Number(one('SELECT COUNT(*) AS v FROM subscribers').v)
    const lowStock = Number(
      one('SELECT COUNT(*) AS v FROM variants WHERE stock > 0 AND stock <= 5').v,
    )
    const outOfStock = Number(one('SELECT COUNT(*) AS v FROM variants WHERE stock = 0').v)
    const loyaltyAccounts = Number(one('SELECT COUNT(*) AS v FROM loyalty_accounts').v)
    const loyaltyPoints = Number(one('SELECT COALESCE(SUM(points), 0) AS v FROM loyalty_accounts').v)
    const couponUses = Number(one('SELECT COALESCE(SUM(used_count), 0) AS v FROM coupons').v)

    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - 13)
    const rows = db
      .prepare(
        `SELECT substr(created_at, 1, 10) AS day,
                COALESCE(SUM(total), 0) AS revenue,
                COUNT(*) AS orders
         FROM orders WHERE status != 'cancelled' AND created_at >= ?
         GROUP BY day ORDER BY day`,
      )
      .all(since.toISOString()) as { day: string; revenue: number; orders: number }[]
    const seriesMap = new Map(rows.map((r) => [r.day, r]))
    const series: { day: string; revenue: number; orders: number }[] = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(since)
      d.setDate(since.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      const found = seriesMap.get(key)
      series.push({
        day: key,
        revenue: Number(found?.revenue ?? 0),
        orders: Number(found?.orders ?? 0),
      })
    }

    const statuses = db
      .prepare('SELECT status, COUNT(*) AS count FROM orders GROUP BY status')
      .all() as { status: string; count: number }[]

    const topProducts = db
      .prepare(
        `SELECT oi.product_id AS productId, oi.name, oi.product_slug AS slug,
                SUM(oi.qty) AS qty, SUM(oi.qty * oi.price) AS revenue
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE o.status != 'cancelled'
         GROUP BY oi.product_id ORDER BY qty DESC LIMIT 5`,
      )
      .all() as { productId: number; name: string; slug: string; qty: number; revenue: number }[]

    const lowStockItems = db
      .prepare(
        `SELECT v.id, v.size, v.color, v.stock, p.name, p.slug, p.id AS productId
         FROM variants v JOIN products p ON p.id = v.product_id
         WHERE v.stock <= 5 ORDER BY v.stock ASC, p.name ASC LIMIT 8`,
      )
      .all()

    const recentOrders = db
      .prepare(
        `SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
         FROM orders o ORDER BY o.created_at DESC LIMIT 6`,
      )
      .all()
      .map((r) => orderListRow(r as Record<string, unknown>))

    res.json({
      kpis: {
        revenue,
        orders,
        products,
        customers,
        newOrders,
        subscribers,
        lowStock,
        outOfStock,
        loyaltyAccounts,
        loyaltyPoints,
        couponUses,
      },
      series,
      statuses,
      topProducts,
      lowStockItems,
      recentOrders,
    })
  } catch (error) {
    next(error)
  }
})

/* ------------------------------ products ------------------------------ */

const colorSchema = z.object({
  name: z.string().trim().min(1).max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'كود اللون غير صحيح'),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'كود اللون الثانوي غير صحيح'),
  image: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
})

const productBaseSchema = z.object({
  name: z.string().trim().min(2).max(90),
  slug: z.string().trim().max(90).optional(),
  subtitle: z.string().trim().max(140).optional().default(''),
  description: z.string().trim().min(10).max(3000),
  price: z.coerce.number().positive().max(1000000),
  comparePrice: z.coerce.number().positive().max(1000000).nullable().optional(),
  gender: z.enum(['men', 'women', 'unisex']),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  featured: z.boolean().optional().default(false),
  isNew: z.boolean().optional().default(false),
  bestSeller: z.boolean().optional().default(false),
  rating: z.coerce.number().min(0).max(5).optional().default(4.8),
  reviewCount: z.coerce.number().int().min(0).max(100000).optional().default(0),
  colors: z.array(colorSchema).min(1, 'أضف لونًا واحدًا على الأقل').max(8),
  sizes: z
    .array(z.string().trim().regex(/^[0-9]{2}(\.5)?$/, 'مقاس غير صحيح'))
    .min(1, 'أضف مقاسًا واحدًا على الأقل')
    .max(20),
  images: z.array(z.string().trim().max(500)).max(6).optional().default([]),
  stock: z.coerce.number().int().min(0).max(9999).optional().default(5),
})

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function uniqueSlug(base: string, excludeId?: number) {
  let slug = base || `drop-${Date.now().toString(36)}`
  let suffix = 1
  while (true) {
    const row = db
      .prepare('SELECT id FROM products WHERE slug = ? AND id != ?')
      .get(slug, excludeId ?? -1) as { id: number } | undefined
    if (!row) return slug
    slug = `${base}-${++suffix}`
  }
}

adminRouter.get('/products', (_req, res) => {
  res.json({ products: listAllProducts() })
})

adminRouter.get('/products/:id', (req, res, next) => {
  try {
    const product = getProductById(Number(req.params.id))
    if (!product) throw new ApiError(404, 'المنتج غير موجود')
    res.json({ product })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/products', (req, res, next) => {
  try {
    const parsed = productBaseSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ApiError(400, 'بيانات المنتج غير صحيحة', parsed.error.flatten())
    }
    const p = parsed.data
    if (p.categoryId) {
      const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(p.categoryId)
      if (!cat) throw new ApiError(400, 'التصنيف غير موجود')
    }
    const slug = uniqueSlug(p.slug ? slugify(p.slug) : slugify(p.name))
    const timestamp = now()
    db.exec('BEGIN IMMEDIATE')
    try {
      const result = db
        .prepare(
          `INSERT INTO products
            (slug, name, subtitle, description, price, compare_price, gender, category_id,
             featured, is_new, best_seller, rating, review_count, colors, images, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          slug,
          p.name,
          p.subtitle ?? '',
          p.description,
          p.price,
          p.comparePrice ?? null,
          p.gender,
          p.categoryId ?? null,
          p.featured ? 1 : 0,
          p.isNew ? 1 : 0,
          p.bestSeller ? 1 : 0,
          p.rating ?? 4.8,
          p.reviewCount ?? 0,
          JSON.stringify(withColorPhotos(p.colors)),
          JSON.stringify(p.images ?? []),
          timestamp,
          timestamp,
        )
      const productId = Number(result.lastInsertRowid)
      const insertVariant = db.prepare(
        'INSERT INTO variants (product_id, size, color, sku, stock) VALUES (?, ?, ?, ?, ?)',
      )
      for (const size of p.sizes) {
        for (const color of p.colors) {
          insertVariant.run(
            productId,
            size,
            color.name,
            makeSku(slug, size, color.name),
            p.stock ?? 5,
          )
        }
      }
      db.exec('COMMIT')
      res.status(201).json({ product: getProductById(productId) })
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  } catch (error) {
    next(error)
  }
})

adminRouter.put('/products/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const existing = getProductById(id)
    if (!existing) throw new ApiError(404, 'المنتج غير موجود')
    const parsed = productBaseSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ApiError(400, 'بيانات المنتج غير صحيحة', parsed.error.flatten())
    }
    const p = parsed.data
    if (p.categoryId) {
      const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(p.categoryId)
      if (!cat) throw new ApiError(400, 'التصنيف غير موجود')
    }
    const slug = uniqueSlug(p.slug ? slugify(p.slug) : existing.slug, id)
    const timestamp = now()
    db.exec('BEGIN IMMEDIATE')
    try {
      db.prepare(
        `UPDATE products SET slug = ?, name = ?, subtitle = ?, description = ?, price = ?,
           compare_price = ?, gender = ?, category_id = ?, featured = ?, is_new = ?,
           best_seller = ?, rating = ?, review_count = ?, colors = ?, images = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        slug,
        p.name,
        p.subtitle ?? '',
        p.description,
        p.price,
        p.comparePrice ?? null,
        p.gender,
        p.categoryId ?? null,
        p.featured ? 1 : 0,
        p.isNew ? 1 : 0,
        p.bestSeller ? 1 : 0,
        p.rating ?? 4.8,
        p.reviewCount ?? 0,
        JSON.stringify(p.colors),
        JSON.stringify(p.images ?? []),
        timestamp,
        id,
      )

      const existingVariants = db
        .prepare('SELECT * FROM variants WHERE product_id = ?')
        .all(id) as Record<string, unknown>[]
      const map = new Map<string, Record<string, unknown>>()
      for (const v of existingVariants) map.set(`${v.size}|${v.color}`, v)
      const insert = db.prepare(
        'INSERT INTO variants (product_id, size, color, sku, stock) VALUES (?, ?, ?, ?, ?)',
      )
      const update = db.prepare(
        'UPDATE variants SET sku = ?, stock = ? WHERE id = ?',
      )
      const keepIds = new Set<number>()
      for (const size of p.sizes) {
        for (const color of p.colors) {
          const key = `${size}|${color.name}`
          const found = map.get(key)
          if (found) {
            keepIds.add(Number(found.id))
            update.run(makeSku(slug, size, color.name), Number(found.stock), Number(found.id))
            markAlertsReady(Number(found.id), Number(found.stock))
          } else {
            insert.run(id, size, color.name, makeSku(slug, size, color.name), p.stock ?? 5)
          }
        }
      }
      const remove = db.prepare('DELETE FROM variants WHERE id = ?')
      for (const v of existingVariants) {
        if (!keepIds.has(Number(v.id))) remove.run(Number(v.id))
      }
      db.exec('COMMIT')
      res.json({ product: getProductById(id) })
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/products/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id)
    if (Number(result.changes) === 0) throw new ApiError(404, 'المنتج غير موجود')
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

/* ----------------------------- categories ----------------------------- */

const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/, 'استخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطات'),
  gender: z.enum(['men', 'women', 'unisex']).optional().default('unisex'),
})

adminRouter.get('/categories', (_req, res) => {
  res.json({ categories: listCategories() })
})

adminRouter.post('/categories', (req, res, next) => {
  try {
    const parsed = categorySchema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, 'بيانات التصنيف غير صحيحة', parsed.error.flatten())
    const exists = db.prepare('SELECT 1 FROM categories WHERE slug = ?').get(parsed.data.slug)
    if (exists) throw new ApiError(409, 'هذا الـ slug مستخدم بالفعل')
    const result = db
      .prepare('INSERT INTO categories (name, slug, gender, created_at) VALUES (?, ?, ?, ?)')
      .run(parsed.data.name, parsed.data.slug, parsed.data.gender ?? 'unisex', now())
    res.status(201).json({ id: Number(result.lastInsertRowid), ...parsed.data })
  } catch (error) {
    next(error)
  }
})

adminRouter.put('/categories/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const parsed = categorySchema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, 'بيانات التصنيف غير صحيحة', parsed.error.flatten())
    const clash = db
      .prepare('SELECT 1 FROM categories WHERE slug = ? AND id != ?')
      .get(parsed.data.slug, id)
    if (clash) throw new ApiError(409, 'هذا الـ slug مستخدم بالفعل')
    const result = db
      .prepare('UPDATE categories SET name = ?, slug = ?, gender = ? WHERE id = ?')
      .run(parsed.data.name, parsed.data.slug, parsed.data.gender ?? 'unisex', id)
    if (Number(result.changes) === 0) throw new ApiError(404, 'التصنيف غير موجود')
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/categories/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const used = db.prepare('SELECT COUNT(*) AS c FROM products WHERE category_id = ?').get(id) as {
      c: number
    }
    if (used.c > 0) throw new ApiError(409, 'لا يمكن حذف تصنيف مرتبط بمنتجات')
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    if (Number(result.changes) === 0) throw new ApiError(404, 'التصنيف غير موجود')
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

/* ------------------------------- orders ------------------------------- */

adminRouter.get('/orders', (req, res, next) => {
  try {
    const status = String(req.query.status ?? '')
    const search = String(req.query.search ?? '').trim()
    const where: string[] = []
    const params: string[] = []
    if (status && status !== 'all' && ORDER_STATUSES.includes(status as never)) {
      where.push('o.status = ?')
      params.push(status)
    }
    if (search) {
      where.push('(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.phone LIKE ?)')
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const rows = db
      .prepare(
        `SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
         FROM orders o ${whereSql} ORDER BY o.created_at DESC LIMIT 200`,
      )
      .all(...params) as Record<string, unknown>[]
    res.json({ orders: rows.map(orderListRow) })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/orders/:id', (req, res, next) => {
  try {
    const order = getOrder(Number(req.params.id))
    if (!order) throw new ApiError(404, 'الطلب غير موجود')
    res.json({ order })
  } catch (error) {
    next(error)
  }
})

adminRouter.patch('/orders/:id/status', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const schema = z.object({ status: z.enum(ORDER_STATUSES) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, 'حالة الطلب غير صحيحة')
    const order = getOrder(id)
    if (!order) throw new ApiError(404, 'الطلب غير موجود')
    if (order.status === 'cancelled' && parsed.data.status !== 'cancelled') {
      throw new ApiError(409, 'لا يمكن تغيير حالة طلب ملغي')
    }
    db.exec('BEGIN IMMEDIATE')
    try {
      if (parsed.data.status === 'cancelled' && order.restocked === 0) {
        for (const item of order.items) {
          if (item.productId == null) continue
          db.prepare(
            'UPDATE variants SET stock = stock + ? WHERE product_id = ? AND size = ? AND color = ?',
          ).run(item.qty, item.productId, item.size, item.color)
          const restocked = db
            .prepare('SELECT id, stock FROM variants WHERE product_id = ? AND size = ? AND color = ?')
            .all(item.productId, item.size, item.color) as { id: number; stock: number }[]
          for (const variant of restocked) {
            markAlertsReady(Number(variant.id), Number(variant.stock))
          }
        }
        db.prepare('UPDATE orders SET restocked = 1 WHERE id = ?').run(id)
      }
      if (parsed.data.status === 'cancelled' && order.status !== 'cancelled') {
        reverseOrderRewards({
          id,
          orderNumber: order.orderNumber,
          phone: order.customer.phone,
          pointsEarned: order.pointsEarned ?? 0,
          pointsRedeemed: order.pointsRedeemed ?? 0,
          couponCode: order.couponCode ?? null,
        })
      }
      db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(
        parsed.data.status,
        now(),
        id,
      )
      reconcileOrder(id)
      db.exec('COMMIT')
      const updated = getOrder(id)
      if (updated) {
        void sendStatusNotification(updated, parsed.data.status).catch((error: unknown) =>
          console.error('[SNEAKERX WHATSAPP]', error),
        )
      }
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    res.json({ order: getOrder(id) })
  } catch (error) {
    next(error)
  }
})

/* ----------------------------- notifications -------------------------- */

adminRouter.get('/notifications', (req, res) => {
  const limit = Number(req.query.limit || 40)
  res.json({
    notifications: listAdminNotifications(limit),
    unread: unreadNotificationsCount(),
    whatsappConfigured: isWhatsAppConfigured(),
  })
})

adminRouter.get('/notifications/unread', (_req, res) => {
  res.json({ count: unreadNotificationsCount() })
})

adminRouter.patch('/notifications/read-all', (_req, res) => {
  res.json({ ok: true, updated: markAllNotificationsRead() })
})

adminRouter.patch('/notifications/:id/read', (req, res) => {
  const ok = markNotificationRead(Number(req.params.id))
  if (!ok) throw new ApiError(404, 'التنبيه غير موجود')
  res.json({ ok: true })
})

adminRouter.post(
  '/notifications/:id/whatsapp',
  asyncHandler(async (req, res) => {
    const row = db
      .prepare('SELECT order_id FROM admin_notifications WHERE id = ?')
      .get(Number(req.params.id)) as { order_id: number | null } | undefined
    if (!row?.order_id) throw new ApiError(404, 'التنبيه غير موجود')
    const order = getOrder(Number(row.order_id))
    if (!order) throw new ApiError(404, 'الطلب المرتبط غير موجود')
    const outcome = await resendOrderWhatsApp(order)
    res.json({ ok: outcome.customerSent || outcome.adminSent, ...outcome })
  }),
)

/* ------------------------------ customers ----------------------------- */

adminRouter.get('/customers', (_req, res) => {
  const customers = db
    .prepare(
      `SELECT c.id, c.name, c.phone, c.email, c.governorate, c.city, c.address, c.created_at AS createdAt,
              COUNT(o.id) AS ordersCount,
              COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) AS totalSpent,
              MAX(o.created_at) AS lastOrder
       FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
       GROUP BY c.id ORDER BY c.created_at DESC`,
    )
    .all()
  res.json({ customers })
})

adminRouter.get('/customers/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined
    if (!customer) throw new ApiError(404, 'العميل غير موجود')
    const orders = db
      .prepare(
        `SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
         FROM orders o WHERE o.customer_id = ? ORDER BY o.created_at DESC`,
      )
      .all(id)
      .map((r) => orderListRow(r as Record<string, unknown>))
    res.json({
      customer: {
        id: Number(customer.id),
        name: String(customer.name),
        phone: String(customer.phone),
        email: customer.email ? String(customer.email) : '',
        governorate: customer.governorate ? String(customer.governorate) : '',
        city: customer.city ? String(customer.city) : '',
        address: customer.address ? String(customer.address) : '',
        createdAt: String(customer.created_at),
      },
      orders,
    })
  } catch (error) {
    next(error)
  }
})

/* ------------------------------ inventory ----------------------------- */

adminRouter.get('/inventory', (req, res) => {
  const lowOnly = req.query.low === 'true'
  const rows = db
    .prepare(
      `SELECT v.id, v.size, v.color, v.sku, v.stock, p.name, p.slug, p.id AS productId
       FROM variants v JOIN products p ON p.id = v.product_id
       ${lowOnly ? 'WHERE v.stock <= 5' : ''}
       ORDER BY v.stock ASC, p.name ASC`,
    )
    .all()
  res.json({ inventory: rows })
})

adminRouter.patch('/variants/:id', (req, res, next) => {
  try {
    const schema = z.object({ stock: z.coerce.number().int().min(0).max(9999) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, 'قيمة المخزون غير صحيحة')
    const result = db
      .prepare('UPDATE variants SET stock = ? WHERE id = ?')
      .run(parsed.data.stock, Number(req.params.id))
    if (Number(result.changes) === 0) throw new ApiError(404, 'المتغير غير موجود')
    markAlertsReady(Number(req.params.id), parsed.data.stock)
    res.json({ ok: true, stock: parsed.data.stock })
  } catch (error) {
    next(error)
  }
})

/* ----------------------------- stock alerts ----------------------------- */

adminRouter.get('/stock-alerts', (req, res, next) => {
  try {
    const status = z.enum(['pending', 'ready', 'notified']).optional().safeParse(req.query.status)
    if (!status.success) throw new ApiError(400, 'حالة التنبيه غير صحيحة')
    res.json({ alerts: listStockAlerts(status.data) })
  } catch (error) {
    next(error)
  }
})

adminRouter.patch('/stock-alerts/:id/notified', (req, res, next) => {
  try {
    res.json(markStockAlertNotified(Number(req.params.id)))
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/stock-alerts/:id', (req, res, next) => {
  try {
    res.json(deleteStockAlert(Number(req.params.id)))
  } catch (error) {
    next(error)
  }
})

/* -------------------------------- growth ------------------------------- */

const couponInputSchema = z.object({
  code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()),
  kind: z.enum(['percent', 'fixed']),
  value: z.coerce.number().positive().max(1000000),
  minSubtotal: z.coerce.number().min(0).max(1000000).optional().default(0),
  maxDiscount: z.coerce.number().min(0).max(1000000).nullable().optional(),
  maxUses: z.coerce.number().int().min(0).max(1000000).optional().default(0),
  active: z.boolean().optional().default(true),
  expiresAt: z.string().trim().max(40).nullable().optional(),
})

adminRouter.get('/coupons', (_req, res) => {
  const rows = db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all()
  res.json({ coupons: rows.map((row) => couponView(row as never)) })
})

adminRouter.post('/coupons', (req, res, next) => {
  try {
    const parsed = couponInputSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ApiError(400, 'بيانات الكوبون غير صحيحة', parsed.error.flatten())
    }
    const c = parsed.data
    if (c.kind === 'percent' && c.value > 90) {
      throw new ApiError(400, 'نسبة الخصم يجب أن تكون 90% أو أقل')
    }
    const exists = db.prepare('SELECT 1 FROM coupons WHERE code = ?').get(c.code)
    if (exists) throw new ApiError(409, 'هذا الكود موجود بالفعل')
    const result = db
      .prepare(
        `INSERT INTO coupons
          (code, kind, value, min_subtotal, max_discount, max_uses, used_count, active, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      )
      .run(
        c.code,
        c.kind,
        c.value,
        c.minSubtotal ?? 0,
        c.maxDiscount ?? null,
        c.maxUses ?? 0,
        c.active === false ? 0 : 1,
        c.expiresAt || null,
        now(),
      )
    const row = db.prepare('SELECT * FROM coupons WHERE id = ?').get(Number(result.lastInsertRowid))
    res.status(201).json({ coupon: couponView(row as never) })
  } catch (error) {
    next(error)
  }
})

adminRouter.patch('/coupons/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined
    if (!existing) throw new ApiError(404, 'الكوبون غير موجود')
    const parsed = couponInputSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      throw new ApiError(400, 'بيانات الكوبون غير صحيحة', parsed.error.flatten())
    }
    const p = parsed.data
    if (p.code && p.code !== String(existing.code)) {
      const clash = db.prepare('SELECT 1 FROM coupons WHERE code = ? AND id != ?').get(p.code, id)
      if (clash) throw new ApiError(409, 'هذا الكود مستخدم في كوبون آخر')
    }
    const next = {
      code: p.code ?? String(existing.code),
      kind: p.kind ?? String(existing.kind),
      value: p.value ?? Number(existing.value),
      min_subtotal: p.minSubtotal ?? Number(existing.min_subtotal),
      max_discount:
        p.maxDiscount === undefined
          ? existing.max_discount == null
            ? null
            : Number(existing.max_discount)
          : p.maxDiscount,
      max_uses: p.maxUses ?? Number(existing.max_uses),
      active: p.active === undefined ? Number(existing.active) : p.active ? 1 : 0,
      expires_at:
        p.expiresAt === undefined
          ? existing.expires_at == null
            ? null
            : String(existing.expires_at)
          : p.expiresAt || null,
    }
    db.prepare(
      `UPDATE coupons SET code = ?, kind = ?, value = ?, min_subtotal = ?, max_discount = ?,
        max_uses = ?, active = ?, expires_at = ? WHERE id = ?`,
    ).run(
      next.code,
      next.kind,
      next.value,
      next.min_subtotal,
      next.max_discount,
      next.max_uses,
      next.active,
      next.expires_at,
      id,
    )
    const row = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id)
    res.json({ coupon: couponView(row as never) })
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/coupons/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM coupons WHERE id = ?').run(Number(req.params.id))
    if (Number(result.changes) === 0) throw new ApiError(404, 'الكوبون غير موجود')
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/loyalty', (_req, res) => {
  const accounts = db
    .prepare(
      `SELECT a.id, a.phone, a.points, a.lifetime_points AS lifetimePoints,
              a.referral_code AS referralCode, a.referred_by AS referredBy, a.created_at AS createdAt,
              (SELECT COUNT(*) FROM orders o WHERE o.phone = a.phone AND o.status != 'cancelled') AS ordersCount,
              (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.phone = a.phone AND o.status != 'cancelled') AS totalSpent
       FROM loyalty_accounts a ORDER BY a.lifetime_points DESC, a.created_at DESC`,
    )
    .all()
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS accounts, COALESCE(SUM(points), 0) AS points,
              COALESCE(SUM(lifetime_points), 0) AS lifetimePoints,
              COALESCE(SUM(CASE WHEN referred_by IS NOT NULL THEN 1 ELSE 0 END), 0) AS referred
       FROM loyalty_accounts`,
    )
    .get() as Record<string, unknown>
  res.json({
    accounts,
    summary: {
      accounts: Number(totals.accounts ?? 0),
      points: Number(totals.points ?? 0),
      lifetimePoints: Number(totals.lifetimePoints ?? 0),
      referred: Number(totals.referred ?? 0),
    },
  })
})

adminRouter.post('/loyalty/:phone/adjust', (req, res, next) => {
  try {
    const schema = z.object({
      points: z.coerce.number().int().min(-100000).max(100000),
      note: z.string().trim().max(160).optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success || parsed.data.points === 0) {
      throw new ApiError(400, 'أدخل عدد نقاط صحيح غير صفر')
    }
    const account = ensureAccount(String(req.params.phone))
    const updated = awardPoints(account.phone, parsed.data.points, 'adjust', {
      note: parsed.data.note || 'تعديل يدوي من لوحة التحكم',
    })
    res.json({ account: updated })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/analytics', (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 14, 1), 90)
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (days - 1))

  const totals = db
    .prepare(
      `SELECT name, COUNT(*) AS count FROM analytics_events
       WHERE created_at >= ? GROUP BY name ORDER BY count DESC`,
    )
    .all(since.toISOString()) as { name: string; count: number }[]

  const daily = db
    .prepare(
      `SELECT substr(created_at, 1, 10) AS day, name, COUNT(*) AS count
       FROM analytics_events WHERE created_at >= ?
       GROUP BY day, name ORDER BY day`,
    )
    .all(since.toISOString()) as { day: string; name: string; count: number }[]

  const seriesMap = new Map<string, Record<string, number>>()
  for (const row of daily) {
    const bucket = seriesMap.get(row.day) ?? {}
    bucket[row.name] = Number(row.count)
    seriesMap.set(row.day, bucket)
  }
  const series: { day: string; counts: Record<string, number> }[] = []
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since)
    d.setDate(since.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    series.push({ day: key, counts: seriesMap.get(key) ?? {} })
  }

  const count = (name: string) => totals.find((item) => item.name === name)?.count ?? 0
  const funnel = [
    { step: 'view_item', label: 'مشاهدة منتج', value: count('view_item') },
    { step: 'add_to_cart', label: 'إضافة للسلة', value: count('add_to_cart') },
    { step: 'begin_checkout', label: 'بدء الدفع', value: count('begin_checkout') },
    { step: 'purchase', label: 'إتمام الطلب', value: count('purchase') },
  ]

  res.json({ totals, series, funnel, days })
})

/* ------------------------------- finance -------------------------------- */

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ غير صحيح')
const expenseCategorySchema = z
  .string()
  .refine((value) => EXPENSE_CATEGORIES.some((item) => item.id === value), 'تصنيف المصروف غير صحيح')

adminRouter.get('/finance', (req, res) => {
  const report = getFinanceReport({
    from: String(req.query.from ?? ''),
    to: String(req.query.to ?? ''),
    type: String(req.query.type ?? ''),
    search: String(req.query.search ?? '').trim(),
    limit: Number(req.query.limit) || 100,
    offset: Number(req.query.offset) || 0,
  })
  res.json(report)
})

adminRouter.get('/finance/options', (_req, res) => {
  res.json({
    expenseCategories: EXPENSE_CATEGORIES,
    ledgerCategories: LEDGER_CATEGORIES,
    paymentMethods: [
      { id: 'cash', label: 'نقدًا' },
      { id: 'bank', label: 'تحويل بنكي' },
      { id: 'card', label: 'بطاقة' },
    ],
  })
})

adminRouter.get('/finance/export', (req, res) => {
  const report = getFinanceReport({
    from: String(req.query.from ?? ''),
    to: String(req.query.to ?? ''),
    type: String(req.query.type ?? ''),
    search: String(req.query.search ?? '').trim(),
    limit: 500,
    offset: 0,
  })
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
  const rows = [
    ['التاريخ', 'النوع', 'التصنيف', 'الوصف', 'المرجع', 'القيمة', 'يؤثر على النقد', 'يؤثر على الربح'],
    ...report.ledger.map((entry) => [
      entry.date,
      entry.kind,
      entry.category,
      entry.description,
      entry.reference,
      entry.amount,
      entry.cash ? 'نعم' : 'لا',
      entry.profit ? 'نعم' : 'لا',
    ]),
  ]
  const csv = `\uFEFF${rows.map((row) => row.map(cell).join(',')).join('\r\n')}`
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="sneakerx-ledger.csv"')
  res.send(csv)
})

adminRouter.get('/finance/expenses', (_req, res) => {
  res.json({ expenses: listExpenses() })
})

adminRouter.post('/finance/expenses', (req, res, next) => {
  try {
    const schema = z.object({
      category: expenseCategorySchema,
      description: z.string().trim().min(2).max(160),
      amount: z.coerce.number().positive().max(10000000),
      date: dateSchema,
      paymentMethod: z.enum(['cash', 'bank', 'card']).optional().default('cash'),
      reference: z.string().trim().max(60).optional().default(''),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      throw new ApiError(400, 'بيانات المصروف غير صحيحة', parsed.error.flatten())
    }
    const e = parsed.data
    db.exec('BEGIN IMMEDIATE')
    try {
      const result = db
        .prepare(
          `INSERT INTO expenses (category, description, amount, expense_date, payment_method, reference, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(e.category, e.description, e.amount, e.date, e.paymentMethod, e.reference ?? '', now())
      const id = Number(result.lastInsertRowid)
      reconcileExpense(id)
      db.exec('COMMIT')
      res.status(201).json({ expense: listExpenses().find((row) => Number((row as { id: number }).id) === id) })
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/finance/expenses/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    db.exec('BEGIN IMMEDIATE')
    try {
      removeLedgerFor('expense', id)
      const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
      if (Number(result.changes) === 0) throw new ApiError(404, 'المصروف غير موجود')
      db.exec('COMMIT')
      res.json({ ok: true })
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/finance/purchases', (_req, res) => {
  res.json({ purchases: listPurchases() })
})

adminRouter.post('/finance/purchases', (req, res, next) => {
  try {
    const schema = z.object({
      supplierId: z.coerce.number().int().positive().nullable().optional(),
      reference: z.string().trim().max(60).optional().default(''),
      date: dateSchema,
      shipping: z.coerce.number().min(0).max(1000000).optional().default(0),
      discount: z.coerce.number().min(0).max(1000000).optional().default(0),
      notes: z.string().trim().max(300).optional().default(''),
      items: z
        .array(
          z.object({
            variantId: z.coerce.number().int().positive(),
            qty: z.coerce.number().int().positive().max(10000),
            unitCost: z.coerce.number().positive().max(1000000),
          }),
        )
        .min(1, 'أضف صنفًا واحدًا على الأقل')
        .max(30),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      throw new ApiError(400, 'بيانات المشترى غير صحيحة', parsed.error.flatten())
    }
    const p = parsed.data
    if (p.supplierId) {
      const supplier = db.prepare('SELECT id FROM suppliers WHERE id = ?').get(p.supplierId)
      if (!supplier) throw new ApiError(400, 'المورد غير موجود')
    }
    const lines = p.items.map((item) => {
      const variant = db
        .prepare(
          `SELECT v.id, v.sku, v.product_id AS productId, p.name
           FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?`,
        )
        .get(item.variantId) as
        | { id: number; sku: string; productId: number; name: string }
        | undefined
      if (!variant) throw new ApiError(400, 'أحد المقاسات غير موجود')
      return { ...item, variant, lineTotal: item.qty * item.unitCost }
    })
    const total = Math.max(
      0,
      lines.reduce((sum, line) => sum + line.lineTotal, 0) + p.shipping - p.discount,
    )

    db.exec('BEGIN IMMEDIATE')
    try {
      const result = db
        .prepare(
          `INSERT INTO purchases
            (supplier_id, reference, purchase_date, shipping, discount, total, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(p.supplierId ?? null, p.reference ?? '', p.date, p.shipping, p.discount, total, p.notes ?? '', now())
      const purchaseId = Number(result.lastInsertRowid)
      const insertItem = db.prepare(
        `INSERT INTO purchase_items
          (purchase_id, variant_id, product_id, name, sku, qty, unit_cost, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      for (const line of lines) {
        insertItem.run(
          purchaseId,
          line.variant.id,
          line.variant.productId,
          line.variant.name,
          line.variant.sku,
          line.qty,
          line.unitCost,
          line.lineTotal,
        )
        db.prepare('UPDATE variants SET stock = stock + ?, cost_price = ? WHERE id = ?').run(
          line.qty,
          line.unitCost,
          line.variant.id,
        )
      }
      reconcilePurchase(purchaseId)
      db.exec('COMMIT')
      res.status(201).json({
        purchase: listPurchases().find((row) => Number((row as unknown as { id: number }).id) === purchaseId),
      })
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/finance/purchases/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    db.exec('BEGIN IMMEDIATE')
    try {
      const items = db
        .prepare('SELECT variant_id AS variantId, qty FROM purchase_items WHERE purchase_id = ?')
        .all(id) as { variantId: number | null; qty: number }[]
      for (const item of items) {
        if (item.variantId == null) continue
        db.prepare('UPDATE variants SET stock = MAX(stock - ?, 0) WHERE id = ?').run(
          item.qty,
          item.variantId,
        )
      }
      removeLedgerFor('purchase', id)
      const result = db.prepare('DELETE FROM purchases WHERE id = ?').run(id)
      if (Number(result.changes) === 0) throw new ApiError(404, 'المشتري غير موجود')
      db.exec('COMMIT')
      res.json({ ok: true })
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/finance/suppliers', (_req, res) => {
  res.json({ suppliers: listSuppliers() })
})

adminRouter.post('/finance/suppliers', (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().trim().min(2).max(80),
      phone: z.string().trim().max(40).optional().default(''),
      email: z.string().trim().max(100).optional().default(''),
      notes: z.string().trim().max(240).optional().default(''),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, 'بيانات المورد غير صحيحة', parsed.error.flatten())
    const s = parsed.data
    const result = db
      .prepare('INSERT INTO suppliers (name, phone, email, notes, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(s.name, s.phone || null, s.email || null, s.notes ?? '', now())
    res.status(201).json({ supplier: { id: Number(result.lastInsertRowid), ...s } })
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/finance/suppliers/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM suppliers WHERE id = ?').run(Number(req.params.id))
    if (Number(result.changes) === 0) throw new ApiError(404, 'المورد غير موجود')
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/finance/costs', (_req, res) => {
  res.json({ costs: listCosts() })
})

adminRouter.patch('/finance/costs', (req, res, next) => {
  try {
    const schema = z.object({
      variantId: z.coerce.number().int().positive().optional(),
      productId: z.coerce.number().int().positive().optional(),
      costPrice: z.coerce.number().min(0).max(1000000),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success || (!parsed.data.variantId && !parsed.data.productId)) {
      throw new ApiError(400, 'بيانات التكلفة غير صحيحة')
    }
    const { variantId, productId, costPrice } = parsed.data
    if (variantId) {
      const result = db.prepare('UPDATE variants SET cost_price = ? WHERE id = ?').run(costPrice, variantId)
      if (Number(result.changes) === 0) throw new ApiError(404, 'المتغير غير موجود')
    }
    if (productId) {
      const result = db.prepare('UPDATE products SET cost_price = ? WHERE id = ?').run(costPrice, productId)
      if (Number(result.changes) === 0) throw new ApiError(404, 'المنتج غير موجود')
      db.prepare('UPDATE variants SET cost_price = ? WHERE product_id = ?').run(costPrice, productId)
    }
    res.json({ ok: true, costPrice })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/finance/adjustments', (req, res, next) => {
  try {
    const schema = z.object({
      date: dateSchema,
      description: z.string().trim().min(2).max(160),
      amount: z.coerce.number().refine((value) => value !== 0, 'القيمة لا يمكن أن تكون صفرًا'),
      reference: z.string().trim().max(60).optional().default(''),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      throw new ApiError(400, 'بيانات القيد غير صحيحة', parsed.error.flatten())
    }
    const a = parsed.data
    postEntry({
      date: a.date,
      kind: a.amount > 0 ? 'income' : 'expense',
      category: 'adjustment',
      subcategory: a.amount > 0 ? 'income' : 'expense',
      description: a.description,
      amount: a.amount,
      sourceType: 'manual',
      reference: a.reference ?? '',
    })
    res.status(201).json({ ok: true })
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/finance/ledger/:id', (req, res, next) => {
  try {
    const result = db
      .prepare("DELETE FROM ledger_entries WHERE id = ? AND source_type = 'manual'")
      .run(Number(req.params.id))
    if (Number(result.changes) === 0) {
      throw new ApiError(409, 'لا يمكن حذف قيد مرتبط بعملية أخرى')
    }
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

/* -------------------------------- upload ------------------------------- */

const uploadsDir = path.resolve(process.cwd(), 'server/uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
}

/** Trust the file's magic bytes, not just the declared Content-Type. */
function isRealImage(buffer: Buffer, mime: string) {
  if (mime === 'image/jpeg') {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (mime === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  }
  if (mime === 'image/webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  }
  if (mime === 'image/avif') {
    return (
      buffer.subarray(4, 8).toString('ascii') === 'ftyp' &&
      ['avif', 'avis', 'mif1', 'msf1'].includes(buffer.subarray(8, 12).toString('ascii'))
    )
  }
  return false
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 10, parts: 12 },
  fileFilter: (_req, file, cb) => {
    if (!MIME_EXT[file.mimetype]) {
      return cb(new ApiError(400, 'يُسمح فقط بصور JPG أو PNG أو WebP أو AVIF'))
    }
    cb(null, true)
  },
})

adminRouter.post('/upload', upload.single('image'), (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, 'اختر صورة أولًا')
    if (!isRealImage(req.file.buffer, req.file.mimetype)) {
      throw new ApiError(400, 'الملف ليس صورة صحيحة')
    }
    const ext = MIME_EXT[req.file.mimetype] || '.jpg'
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`
    fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer, { mode: 0o644, flag: 'wx' })
    res.status(201).json({ url: `/uploads/${filename}` })
  } catch (error) {
    next(error)
  }
})

// expose a tiny helper for the error handler to recognise multer limits
export const uploadErrorHelper = (error: unknown) =>
  error instanceof multer.MulterError ? error : null

export const adminProductSchema = productBaseSchema
export type AdminProductInput = z.infer<typeof productBaseSchema>
export { mapProduct }
