import { Router } from 'express'
import { z } from 'zod'
import { db, now, orderNumber } from '../db.js'
import { ApiError, asyncHandler } from '../http.js'
import {
  FREE_SHIPPING_THRESHOLD,
  GOVERNORATES,
  SHIPPING_FEE,
  getProductBySlug,
  listCategories,
  listProducts,
  shippingFor,
  type Product,
} from '../catalog.js'
import { getOrder } from '../orders.js'
import { createNewOrderNotification } from '../notifications.js'
import { reconcileOrder } from '../finance.js'
import { askAiAssistant, isAiEnabled, type AssistantRequest } from '../ai.js'
import { createStockAlert } from '../stock-alerts.js'
import {
  applyReferral,
  awardPoints,
  couponView,
  ensureAccount,
  isValidEgyptPhone,
  logAnalyticsEvent,
  loyaltyHistory,
  loyaltyStats,
  normalizePhone,
  POINTS_EARN_RATE,
  POINTS_VALUE,
  MIN_REDEEM_POINTS,
  previewRedemption,
  redeemPoints,
  validateCoupon,
} from '../rewards.js'

export const publicRouter = Router()

const productQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  gender: z.enum(['men', 'women', 'unisex', 'all']).optional(),
  category: z.string().trim().max(80).optional(),
  collection: z.enum(['new', 'featured', 'best']).optional(),
  size: z.string().trim().max(6).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  color: z.string().trim().max(30).optional(),
  onSale: z.enum(['true', 'false']).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'best', 'featured', 'rating']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(48).optional(),
  inStock: z.enum(['true', 'false']).optional(),
})

publicRouter.get('/config', (_req, res) => {
  res.json({
    currency: 'EGP',
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    shippingFee: SHIPPING_FEE,
    governorates: GOVERNORATES,
    paymentMethods: [
      { id: 'cod', name: 'الدفع عند الاستلام', available: true },
      { id: 'card', name: 'بطاقة بنكية', available: false, note: 'قريبًا بعد تفعيل بوابة الدفع' },
    ],
    assistantMode: isAiEnabled() ? 'ai' : 'rules',
  })
})

publicRouter.get('/categories', (_req, res) => {
  res.json({ categories: listCategories() })
})

publicRouter.get('/products', (req, res, next) => {
  try {
    const parsed = productQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw new ApiError(400, 'فلاتر البحث غير صحيحة', parsed.error.flatten())
    }
    const q = parsed.data
    const result = listProducts({
      search: q.search,
      gender: q.gender === 'all' ? undefined : q.gender,
      category: q.category,
      collection: q.collection,
      size: q.size,
      minPrice: q.minPrice,
      maxPrice: q.maxPrice,
      color: q.color,
      onSale: q.onSale === 'true',
      minRating: q.minRating,
      sort: q.sort,
      page: q.page,
      limit: q.limit ?? 12,
      inStock: q.inStock === 'true',
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

publicRouter.get('/products/:slug', (req, res, next) => {
  try {
    const product = getProductBySlug(req.params.slug)
    if (!product) throw new ApiError(404, 'المنتج غير موجود')
    const related = listProducts({
      category: product.category?.slug,
      limit: 4,
      sort: 'featured',
    }).items.filter((p) => p.id !== product.id)
    if (related.length < 4) {
      const more = listProducts({ limit: 8, sort: 'best' }).items.filter(
        (p) => p.id !== product.id && !related.some((r) => r.id === p.id),
      )
      related.push(...more.slice(0, 4 - related.length))
    }
    res.json({ product, related: related.slice(0, 4) })
  } catch (error) {
    next(error)
  }
})

const orderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل').max(90),
    phone: z
      .string()
      .trim()
      .transform(normalizePhone)
      .refine((v) => /^01[0125][0-9]{8}$/.test(v), 'رقم الهاتف غير صحيح (11 رقمًا يبدأ بـ 01)'),
    email: z
      .union([z.string().trim().email('البريد الإلكتروني غير صحيح'), z.literal('')])
      .optional(),
    governorate: z.string().refine((v) => GOVERNORATES.includes(v), 'اختر محافظة صحيحة'),
    city: z.string().trim().min(2, 'أدخل المدينة أو المنطقة').max(90),
    address: z.string().trim().min(10, 'العنوان التفصيلي قصير جدًا').max(500),
    notes: z.string().trim().max(400).optional(),
  }),
  paymentMethod: z.literal('cod', { errorMap: () => ({ message: 'طريقة الدفع غير متاحة' }) }),
  couponCode: z.string().trim().max(40).optional(),
  redeemPoints: z.coerce.number().int().min(0).max(100000).optional(),
  referralCode: z.string().trim().max(40).optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        size: z.string().trim().min(1).max(6),
        color: z.string().trim().min(1).max(60),
        qty: z.number().int().min(1).max(10),
      }),
    )
    .min(1, 'السلة فارغة')
    .max(30),
})

type OrderItemInput = z.infer<typeof orderSchema>['items'][number]

publicRouter.post('/orders', (req, res, next) => {
  try {
    const parsed = orderSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ApiError(400, 'بيانات الطلب غير صحيحة', parsed.error.flatten())
    }
    const { customer, items, couponCode, redeemPoints: redeemRequest, referralCode } = parsed.data

    // aggregate identical lines so stock is validated once per variant
    const aggregated = new Map<string, OrderItemInput>()
    for (const item of items) {
      const key = `${item.productId}|${item.size}|${item.color}`
      const existing = aggregated.get(key)
      if (existing) existing.qty = Math.min(existing.qty + item.qty, 10)
      else aggregated.set(key, { ...item })
    }

    type Line = {
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
      variantId: number
      cost: number
    }

    db.exec('BEGIN IMMEDIATE')
    try {
      const lines: Line[] = []
      for (const item of aggregated.values()) {
        const product = db
          .prepare('SELECT * FROM products WHERE id = ?')
          .get(item.productId) as Record<string, unknown> | undefined
        if (!product) throw new ApiError(400, 'أحد المنتجات لم يعد متوفرًا')
        const variant = db
          .prepare('SELECT * FROM variants WHERE product_id = ? AND size = ? AND color = ?')
          .get(item.productId, item.size, item.color) as Record<string, unknown> | undefined
        if (!variant) throw new ApiError(400, 'المقاس أو اللون المختار غير متوفر')
        if (Number(variant.stock) < item.qty) {
          throw new ApiError(
            409,
            `الكمية المتاحة من ${String(product.name)} مقاس ${item.size} هي ${variant.stock} فقط`,
          )
        }
        const colors = JSON.parse(String(product.colors || '[]')) as {
          name: string
          hex: string
          accent: string
        }[]
        const color = colors.find((c) => c.name === item.color)
        const images = JSON.parse(String(product.images || '[]')) as string[]
        lines.push({
          productId: Number(product.id),
          slug: String(product.slug),
          name: String(product.name),
          size: item.size,
          color: item.color,
          colorHex: color?.hex ?? '#E9E3D3',
          accentHex: color?.accent ?? '#1A1E25',
          image: images[0] ?? null,
          price: Number(product.price),
          qty: item.qty,
          variantId: Number(variant.id),
          cost: Number(variant.cost_price ?? product.cost_price ?? 0),
        })
      }

      const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0)
      const coupon = couponCode ? validateCoupon(couponCode, subtotal) : null
      const redeemed =
        redeemRequest && redeemRequest > 0
          ? redeemPoints(customer.phone, redeemRequest, subtotal)
          : null
      const discount = Math.min(
        subtotal,
        (coupon?.discount ?? 0) + (redeemed?.value ?? 0),
      )
      const shipping = shippingFor(subtotal)
      const total = Math.max(subtotal - discount + shipping, 0)
      const pointsEarned = Math.floor(total / POINTS_EARN_RATE)
      const timestamp = now()

      let customerId: number
      const existingCustomer = db
        .prepare('SELECT id FROM customers WHERE phone = ?')
        .get(customer.phone) as { id: number } | undefined
      if (existingCustomer) {
        customerId = existingCustomer.id
        db.prepare(
          `UPDATE customers SET name = ?, email = ?, governorate = ?, city = ?, address = ?, updated_at = ? WHERE id = ?`,
        ).run(
          customer.name,
          customer.email || null,
          customer.governorate,
          customer.city,
          customer.address,
          timestamp,
          customerId,
        )
      } else {
        const result = db
          .prepare(
            `INSERT INTO customers (name, phone, email, governorate, city, address, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            customer.name,
            customer.phone,
            customer.email || null,
            customer.governorate,
            customer.city,
            customer.address,
            timestamp,
            timestamp,
          )
        customerId = Number(result.lastInsertRowid)
      }

      let number = orderNumber()
      for (let i = 0; i < 5; i++) {
        const exists = db.prepare('SELECT 1 FROM orders WHERE order_number = ?').get(number)
        if (!exists) break
        number = orderNumber()
      }

      const orderResult = db
        .prepare(
          `INSERT INTO orders
            (order_number, customer_id, customer_name, phone, email, governorate, city, address, notes,
             payment_method, subtotal, shipping, discount, coupon_code, points_redeemed, points_earned,
             total, status, restocked, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'cod', ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
        )
        .run(
          number,
          customerId,
          customer.name,
          customer.phone,
          customer.email || null,
          customer.governorate,
          customer.city,
          customer.address,
          customer.notes || null,
          subtotal,
          shipping,
          discount,
          coupon?.coupon.code ?? null,
          redeemed?.points ?? 0,
          pointsEarned,
          total,
          timestamp,
          timestamp,
        )
      const orderId = Number(orderResult.lastInsertRowid)

      const insertItem = db.prepare(
        `INSERT INTO order_items
          (order_id, product_id, product_slug, name, size, color, color_hex, accent_hex, image, price, qty, cost_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      const decrement = db.prepare(
        'UPDATE variants SET stock = stock - ? WHERE id = ? AND stock >= ?',
      )
      for (const line of lines) {
        insertItem.run(
          orderId,
          line.productId,
          line.slug,
          line.name,
          line.size,
          line.color,
          line.colorHex,
          line.accentHex,
          line.image,
          line.price,
          line.qty,
          line.cost,
        )
        const stockResult = decrement.run(line.qty, line.variantId, line.qty)
        if (Number(stockResult.changes) === 0) {
          throw new ApiError(409, 'نفدت الكمية أثناء إتمام الطلب، حاول مرة أخرى')
        }
      }

      if (coupon) {
        db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(
          coupon.coupon.id,
        )
      }
      ensureAccount(customer.phone)
      if (redeemed) {
        awardPoints(customer.phone, -redeemed.points, 'redeem', {
          orderId,
          note: `استخدام نقاط في الطلب ${number}`,
        })
      }
      if (pointsEarned > 0) {
        awardPoints(customer.phone, pointsEarned, 'earn', {
          orderId,
          note: `نقاط الطلب ${number}`,
        })
      }
      applyReferral(customer.phone, referralCode, orderId)
      reconcileOrder(orderId)

      db.exec('COMMIT')
      const createdOrder = getOrder(orderId)
      if (createdOrder) createNewOrderNotification(createdOrder)
      const account = ensureAccount(customer.phone)
      res.status(201).json({
        order: createdOrder,
        rewards: {
          pointsEarned,
          pointsBalance: account.points,
          referralCode: account.referralCode,
        },
      })
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  } catch (error) {
    next(error)
  }
})

publicRouter.get(
  '/orders/:orderNumber',
  asyncHandler(async (req, res) => {
    const phone = normalizePhone(String(req.query.phone ?? ''))
    if (!isValidEgyptPhone(phone)) {
      throw new ApiError(400, 'أدخل رقم الهاتف المستخدم في الطلب')
    }
    const row = db
      .prepare('SELECT id, phone FROM orders WHERE order_number = ?')
      .get(String(req.params.orderNumber).toUpperCase()) as
      | { id: number; phone: string }
      | undefined
    if (!row || row.phone !== phone) {
      throw new ApiError(404, 'لم نجد طلبًا مطابقًا لهذه البيانات')
    }
    res.json({ order: getOrder(row.id) })
  }),
)

publicRouter.post(
  '/newsletter',
  asyncHandler(async (req, res) => {
    const schema = z.object({ email: z.string().trim().email('البريد الإلكتروني غير صحيح') })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, 'أدخل بريدًا إلكترونيًا صحيحًا')
    const email = parsed.data.email.toLowerCase()
    try {
      db.prepare('INSERT INTO subscribers (email, created_at) VALUES (?, ?)').run(email, now())
    } catch {
      return res.json({ ok: true, alreadySubscribed: true })
    }
    res.json({ ok: true })
  }),
)

publicRouter.post('/stock-alerts', (req, res, next) => {
  try {
    const schema = z.object({
      variantId: z.coerce.number().int().min(1),
      phone: z.string().trim().min(8).max(20),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, 'بيانات التنبيه غير صحيحة')
    const result = createStockAlert(parsed.data)
    res.status(201).json({
      ok: true,
      ...result,
      message: result.alreadySubscribed
        ? 'حدّثنا طلبك — هنبعت لك تنبيه أول ما المقاس يرجع.'
        : 'تم تسجيل تنبيه التوفر — هنبعت لك رسالة أول ما المقاس يرجع.',
    })
  } catch (error) {
    next(error)
  }
})

/* --------------------------- coupons & loyalty --------------------------- */

const couponSchema = z.object({
  code: z.string().trim().min(2).max(40),
  subtotal: z.coerce.number().min(0).max(1000000),
})

publicRouter.post('/coupons/validate', (req, res, next) => {
  try {
    const parsed = couponSchema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, 'بيانات الكوبون غير صحيحة')
    const result = validateCoupon(parsed.data.code, parsed.data.subtotal)
    res.json({ coupon: couponView(result.coupon), discount: result.discount })
  } catch (error) {
    next(error)
  }
})

const phoneSchema = z.object({
  phone: z.string().trim().min(6).max(20).transform(normalizePhone),
})

publicRouter.post('/loyalty/lookup', (req, res, next) => {
  try {
    const parsed = phoneSchema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, 'أدخل رقم هاتف صحيح')
    const account = ensureAccount(parsed.data.phone)
    res.json({
      account: { ...account, ...loyaltyStats(account) },
      history: loyaltyHistory(account.phone),
      program: {
        earnRate: POINTS_EARN_RATE,
        valuePerPoint: POINTS_VALUE,
        minRedeem: MIN_REDEEM_POINTS,
        redeemRatio: 0.3,
      },
    })
  } catch (error) {
    next(error)
  }
})

publicRouter.post('/loyalty/preview', (req, res, next) => {
  try {
    const parsed = phoneSchema
      .extend({ subtotal: z.coerce.number().min(0).max(1000000) })
      .safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, 'أدخل رقم هاتف صحيح')
    const preview = previewRedemption(parsed.data.phone, parsed.data.subtotal)
    const account = ensureAccount(parsed.data.phone)
    res.json({ ...preview, ...loyaltyStats(account) })
  } catch (error) {
    next(error)
  }
})

/* ------------------------------- analytics ------------------------------- */

const analyticsSchema = z.object({
  name: z.string().trim().regex(/^[a-z0-9_]{3,40}$/),
  path: z.string().trim().max(200).optional(),
  payload: z.record(z.unknown()).optional(),
})

publicRouter.post('/analytics', (req, res) => {
  const parsed = analyticsSchema.safeParse(req.body)
  if (!parsed.success) return res.json({ ok: false })
  logAnalyticsEvent(parsed.data.name, parsed.data.path ?? null, parsed.data.payload ?? null)
  res.json({ ok: true })
})

/* --------------------------- shopping assistant -------------------------- */

const USE_CASE_LABEL: Record<string, string> = {
  running: 'الجري',
  court: 'الكورت',
  lifestyle: 'اللايف ستايل',
  basketball: 'الباسكتبول',
  trail: 'الترايل',
}

const COLOR_LABEL: Record<string, string> = {
  Volt: 'ليموني',
  Bone: 'كريمي',
  Obsidian: 'أسود',
  Ember: 'أحمر',
  Ice: 'أزرق',
  Clay: 'طيني',
  Moss: 'أخضر',
  Chrome: 'فضي',
}

const COLOR_HINTS: { pattern: RegExp; names: string[] }[] = [
  { pattern: /أبيض|ابيض|white|بون|bone/i, names: ['Bone', 'Chrome'] },
  { pattern: /أسود|اسود|black|obsidian/i, names: ['Obsidian'] },
  { pattern: /أحمر|احمر|red|ember/i, names: ['Ember'] },
  { pattern: /أزرق|ازرق|blue|ice/i, names: ['Ice', 'Chrome'] },
  { pattern: /أخضر|اخضر|green|moss/i, names: ['Moss'] },
  { pattern: /كريمي|بيج|cream|beige|clay|بني|brown/i, names: ['Bone', 'Clay'] },
  { pattern: /أصفر|اصفر|yellow|ليموني|volt/i, names: ['Volt'] },
  { pattern: /فضي|رمادي|silver|grey|gray|chrome/i, names: ['Chrome'] },
]

const USE_CASE_HINTS: { pattern: RegExp; slug: string }[] = [
  { pattern: /جري|ركض|run/i, slug: 'running' },
  { pattern: /كورت|كلاسيك|court/i, slug: 'court' },
  { pattern: /سلة|باسكت|basket/i, slug: 'basketball' },
  { pattern: /ترايل|جبل|trail/i, slug: 'trail' },
  { pattern: /يومي|لايف|كاجوال|lifestyle/i, slug: 'lifestyle' },
]

function parseAssistantQuery(query: string) {
  const text = query.trim()
  if (!text) return {}
  const result: { budget?: number; useCase?: string; color?: string; gender?: string } = {}
  const budgetMatch = text.match(/(\d{3,6})/)
  if (budgetMatch) result.budget = Number(budgetMatch[1])
  for (const hint of USE_CASE_HINTS) {
    if (hint.pattern.test(text)) {
      result.useCase = hint.slug
      break
    }
  }
  for (const hint of COLOR_HINTS) {
    if (hint.pattern.test(text)) {
      result.color = hint.names[0]
      break
    }
  }
  if (/حريمي|نساء|بنات|women/i.test(text)) result.gender = 'women'
  else if (/رجالي|رجال|men/i.test(text)) result.gender = 'men'
  return result
}

const assistantSchema = z.object({
  query: z.string().trim().max(200).optional(),
  budget: z.coerce.number().min(0).max(100000).optional(),
  useCase: z.enum(['running', 'court', 'lifestyle', 'basketball', 'trail']).optional(),
  color: z.string().trim().max(30).optional(),
  gender: z.enum(['men', 'women', 'unisex']).optional(),
  size: z.string().trim().max(6).optional(),
})

publicRouter.post('/assistant/recommend', async (req, res, next) => {
  try {
    const parsed = assistantSchema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, 'بيانات المساعد غير صحيحة')
    const input = parsed.data
    const parsedQuery = parseAssistantQuery(input.query ?? '')
    const budget = input.budget ?? parsedQuery.budget
    const useCase = input.useCase ?? parsedQuery.useCase
    const gender = input.gender ?? parsedQuery.gender
    const colorInput = input.color ?? parsedQuery.color
    const size = input.size
    const colorNames = colorInput
      ? COLOR_HINTS.find((hint) => hint.pattern.test(colorInput))?.names ??
        (Object.keys(COLOR_LABEL).includes(colorInput) ? [colorInput] : null)
      : null

    const catalog = listProducts({ limit: 48 }).items
    const aiRequest: AssistantRequest = {
      query: input.query,
      budget,
      useCase,
      gender,
      color: colorInput,
      colorNames,
      size,
    }
    const ai = await askAiAssistant(aiRequest, catalog)
    if (ai) {
      return res.json({
        picks: ai.picks,
        message: ai.message,
        interpreted: { budget, useCase, gender, color: colorInput, size },
        source: 'ai',
      })
    }

    const scored = catalog
      .map((product) => {
        let score = product.rating * 3
        const reasons: string[] = []

        if (useCase) {
          if (product.category?.slug === useCase) {
            score += 45
            reasons.push(`مصمم لـ${USE_CASE_LABEL[useCase] ?? useCase}`)
          } else {
            score -= 10
          }
        }
        if (gender) {
          if (product.gender === gender) {
            score += 18
            reasons.push(gender === 'women' ? 'تصميم حريمي' : 'تصميم رجالي')
          } else if (product.gender === 'unisex') {
            score += 8
            reasons.push('يونيسكس يناسب الجميع')
          } else {
            score -= 35
          }
        }
        if (budget != null) {
          if (product.price <= budget) {
            score += 30
            reasons.push('داخل ميزانيتك')
          } else if (product.price <= budget * 1.12) {
            score += 8
            reasons.push('قريب من ميزانيتك')
          } else {
            score -= 45
          }
        }
        if (colorNames) {
          const match = product.colors.find((color) => colorNames.includes(color.name))
          if (match) {
            score += 22
            reasons.push(`متوفر بلون ${COLOR_LABEL[match.name] ?? match.name}`)
          } else {
            score -= 12
          }
        }
        if (size) {
          const stock = product.variants
            .filter((variant) => variant.size === size)
            .reduce((sum, variant) => sum + variant.stock, 0)
          if (stock > 0) {
            score += 15
            reasons.push(`متوفر مقاس ${size}`)
          } else {
            score -= 30
          }
        }
        if (product.bestSeller) {
          score += 6
          reasons.push('من الأكثر مبيعًا')
        }
        if (product.isNew) score += 4
        if (product.comparePrice && product.comparePrice > product.price) score += 3
        if (product.totalStock === 0) score -= 120

        return { product, score, reasons: reasons.slice(0, 3) }
      })
      .sort((a, b) => b.score - a.score)

    const picks = scored.filter((item) => item.product.totalStock > 0).slice(0, 3)
    const summaryParts: string[] = []
    if (useCase) summaryParts.push(USE_CASE_LABEL[useCase] ?? useCase)
    if (gender) summaryParts.push(gender === 'women' ? 'حريمي' : 'رجالي')
    if (budget != null) summaryParts.push(`تحت ${Math.round(budget).toLocaleString('en-US')} ج.م`)
    if (colorInput) summaryParts.push(colorInput)

    res.json({
      picks,
      message: picks.length
        ? `أفضل ${picks.length} اختيارات${summaryParts.length ? ` لـ ${summaryParts.join(' و ')}` : ''} — كلها متاحة للدفع عند الاستلام.`
        : 'مفيش اختيار مطابق بالكامل — جرّب ترفع الميزانية شوية أو تشيل فلتر اللون.',
      interpreted: { budget, useCase, gender, color: colorInput, size },
      source: 'rules',
    })
  } catch (error) {
    next(error)
  }
})

/* --------------------------- personalised picks -------------------------- */

publicRouter.get('/recommendations', (req, res, next) => {
  try {
    const slugs = String(req.query.slugs ?? '')
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean)
      .slice(0, 8)
    const limit = Math.min(Math.max(Number(req.query.limit) || 4, 1), 8)
    const all = listProducts({ limit: 48 }).items
    const seeds = slugs
      .map((slug) => getProductBySlug(slug))
      .filter((product): product is Product => Boolean(product))

    if (seeds.length === 0) {
      return res.json({
        items: all.filter((product) => product.bestSeller).slice(0, limit),
        basis: 'اختيارات الدار',
        reasons: {},
      })
    }

    const seen = new Set(slugs)
    const categories = new Set(seeds.map((product) => product.category?.slug).filter(Boolean))
    const colorNames = new Set(seeds.flatMap((product) => product.colors.map((color) => color.name)))
    const genders = new Set(seeds.map((product) => product.gender))
    const average = seeds.reduce((sum, product) => sum + product.price, 0) / seeds.length

    const scored = all
      .filter((product) => !seen.has(product.slug) && product.totalStock > 0)
      .map((product) => {
        let score = product.rating * 2
        const reasons: string[] = []
        if (product.category && categories.has(product.category.slug)) {
          score += 30
          reasons.push('من نفس الفئة')
        }
        const sharedColor = product.colors.find((color) => colorNames.has(color.name))
        if (sharedColor) {
          score += 12
          reasons.push(`لون ${COLOR_LABEL[sharedColor.name] ?? sharedColor.name} مشابه`)
        }
        if (genders.has(product.gender) || product.gender === 'unisex') score += 8
        if (Math.abs(product.price - average) <= average * 0.3) {
          score += 14
          reasons.push('في نفس نطاق السعر')
        }
        if (product.bestSeller) {
          score += 7
          reasons.push('من الأكثر مبيعًا')
        }
        if (product.isNew) score += 3
        return { product, score, reasons: reasons.slice(0, 2) }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    res.json({
      items: scored.map((item) => item.product),
      basis: 'مبني على مشاهداتك ومفضلتك',
      reasons: Object.fromEntries(
        scored.map((item) => [item.product.slug, item.reasons[0] ?? 'اختيار قريب لذوقك']),
      ),
    })
  } catch (error) {
    next(error)
  }
})

