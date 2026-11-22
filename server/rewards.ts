import crypto from 'node:crypto'
import { db, now } from './db.js'
import { ApiError } from './http.js'

/** 1 point is worth 1 EGP at checkout. Customers earn 1 point per 20 EGP. */
export const POINTS_EARN_RATE = 20
export const POINTS_VALUE = 1
export const MIN_REDEEM_POINTS = 100
export const REDEEM_RATIO = 0.3
export const REFERRAL_BONUS_REFERRER = 150
export const REFERRAL_BONUS_FRIEND = 75

export type LoyaltyAccount = {
  id: number
  phone: string
  points: number
  lifetimePoints: number
  referralCode: string
  referredBy: string | null
  createdAt: string
}

export type CouponRow = {
  id: number
  code: string
  kind: 'percent' | 'fixed'
  value: number
  min_subtotal: number
  max_discount: number | null
  max_uses: number
  used_count: number
  active: number
  expires_at: string | null
  created_at: string
}

export function normalizePhone(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[\s\-()]/g, '')
}

export function isValidEgyptPhone(value: string) {
  return /^01[0125][0-9]{8}$/.test(value)
}

function mapAccount(row: Record<string, unknown>): LoyaltyAccount {
  return {
    id: Number(row.id),
    phone: String(row.phone),
    points: Number(row.points ?? 0),
    lifetimePoints: Number(row.lifetime_points ?? 0),
    referralCode: String(row.referral_code),
    referredBy: row.referred_by ? String(row.referred_by) : null,
    createdAt: String(row.created_at),
  }
}

function uniqueReferralCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = `SX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
    const exists = db
      .prepare('SELECT 1 FROM loyalty_accounts WHERE referral_code = ?')
      .get(code)
    if (!exists) return code
  }
  return `SX-${Date.now().toString(36).toUpperCase().slice(-6)}`
}

/**
 * Returns the loyalty account for a phone, creating it lazily. When a demo
 * database already contains delivered orders we backfill the points so the
 * loyalty page is useful straight away.
 */
export function ensureAccount(phoneInput: string): LoyaltyAccount {
  const phone = normalizePhone(phoneInput)
  if (!isValidEgyptPhone(phone)) {
    throw new ApiError(400, 'أدخل رقم هاتف مصري صحيح (11 رقمًا يبدأ بـ 01)')
  }
  const existing = db.prepare('SELECT * FROM loyalty_accounts WHERE phone = ?').get(phone) as
    | Record<string, unknown>
    | undefined
  if (existing) return mapAccount(existing)

  const delivered = db
    .prepare(
      "SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE phone = ? AND status = 'delivered'",
    )
    .get(phone) as { total: number }
  const backfill = Math.floor(Number(delivered.total) / POINTS_EARN_RATE)
  const timestamp = now()
  const result = db
    .prepare(
      `INSERT INTO loyalty_accounts
        (phone, points, lifetime_points, referral_code, referred_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`,
    )
    .run(phone, backfill, backfill, uniqueReferralCode(), timestamp, timestamp)
  if (backfill > 0) {
    db.prepare(
      `INSERT INTO loyalty_events (phone, order_id, kind, points, note, created_at)
       VALUES (?, NULL, 'earn', ?, ?, ?)`,
    ).run(phone, backfill, 'نقاط الطلبات السابقة', timestamp)
  }
  const row = db.prepare('SELECT * FROM loyalty_accounts WHERE id = ?').get(
    Number(result.lastInsertRowid),
  ) as Record<string, unknown>
  return mapAccount(row)
}

export function loyaltyHistory(phone: string, limit = 20) {
  return db
    .prepare(
      `SELECT id, order_id AS orderId, kind, points, note, created_at AS createdAt
       FROM loyalty_events WHERE phone = ? ORDER BY id DESC LIMIT ?`,
    )
    .all(normalizePhone(phone), limit) as {
    id: number
    orderId: number | null
    kind: string
    points: number
    note: string | null
    createdAt: string
  }[]
}

export function loyaltyStats(account: LoyaltyAccount) {
  const orders = db
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS spent
       FROM orders WHERE phone = ? AND status != 'cancelled'`,
    )
    .get(account.phone) as { count: number; spent: number }
  return {
    ordersCount: Number(orders.count),
    totalSpent: Number(orders.spent),
  }
}

export function awardPoints(
  phoneInput: string,
  points: number,
  kind: 'earn' | 'redeem' | 'referral' | 'adjust',
  options: { orderId?: number | null; note?: string } = {},
) {
  if (!Number.isFinite(points) || points === 0) return ensureAccount(phoneInput)
  const phone = normalizePhone(phoneInput)
  ensureAccount(phone)
  const timestamp = now()
  if (points > 0) {
    db.prepare(
      `UPDATE loyalty_accounts
       SET points = points + ?, lifetime_points = lifetime_points + ?, updated_at = ?
       WHERE phone = ?`,
    ).run(points, points, timestamp, phone)
  } else {
    db.prepare(
      'UPDATE loyalty_accounts SET points = MAX(points + ?, 0), updated_at = ? WHERE phone = ?',
    ).run(points, timestamp, phone)
  }
  db.prepare(
    `INSERT INTO loyalty_events (phone, order_id, kind, points, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(phone, options.orderId ?? null, kind, points, options.note ?? null, timestamp)
  const row = db.prepare('SELECT * FROM loyalty_accounts WHERE phone = ?').get(phone) as Record<
    string,
    unknown
  >
  return mapAccount(row)
}

export function previewRedemption(phoneInput: string, subtotal: number) {
  const account = ensureAccount(phoneInput)
  const maxByOrder = Math.floor(Math.max(subtotal, 0) * REDEEM_RATIO)
  const raw = Math.min(account.points, maxByOrder)
  const canRedeem = raw >= MIN_REDEEM_POINTS
  return {
    points: account.points,
    lifetimePoints: account.lifetimePoints,
    referralCode: account.referralCode,
    minRedeem: MIN_REDEEM_POINTS,
    valuePerPoint: POINTS_VALUE,
    maxRedeem: canRedeem ? raw : 0,
    canRedeem,
    earnRate: POINTS_EARN_RATE,
  }
}

export function couponDescription(coupon: Pick<CouponRow, 'kind' | 'value'>) {
  return coupon.kind === 'percent'
    ? `خصم ${coupon.value}% على الطلب`
    : `خصم ${Math.round(coupon.value)} ج.م على الطلب`
}

export function couponView(row: CouponRow) {
  return {
    id: Number(row.id),
    code: String(row.code),
    kind: row.kind,
    value: Number(row.value),
    minSubtotal: Number(row.min_subtotal),
    maxDiscount: row.max_discount == null ? null : Number(row.max_discount),
    maxUses: Number(row.max_uses),
    usedCount: Number(row.used_count),
    active: Boolean(row.active),
    expiresAt: row.expires_at,
    description: couponDescription(row),
  }
}

export function findCoupon(codeInput: string) {
  const code = codeInput.trim().toUpperCase()
  return db.prepare('SELECT * FROM coupons WHERE code = ?').get(code) as CouponRow | undefined
}

export function validateCoupon(codeInput: string, subtotal: number) {
  const code = codeInput.trim().toUpperCase()
  if (!code) throw new ApiError(400, 'أدخل كود الخصم')
  const coupon = findCoupon(code)
  if (!coupon || !coupon.active) throw new ApiError(404, 'كود الخصم غير صحيح')
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    throw new ApiError(400, 'انتهت صلاحية كود الخصم')
  }
  if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
    throw new ApiError(409, 'تم استهلاك هذا الكود بالكامل')
  }
  if (subtotal < coupon.min_subtotal) {
    throw new ApiError(
      400,
      `الحد الأدنى لاستخدام الكود هو ${Math.round(coupon.min_subtotal).toLocaleString('en-US')} ج.م`,
    )
  }
  const raw =
    coupon.kind === 'percent'
      ? (subtotal * Number(coupon.value)) / 100
      : Number(coupon.value)
  const capped = coupon.max_discount ? Math.min(raw, Number(coupon.max_discount)) : raw
  const discount = Math.max(0, Math.round(Math.min(capped, subtotal)))
  if (discount <= 0) throw new ApiError(400, 'هذا الكود لا ينطبق على هذا الطلب')
  return { coupon, discount }
}

export function redeemPoints(phoneInput: string, requested: number, subtotal: number) {
  const phone = normalizePhone(phoneInput)
  const account = ensureAccount(phone)
  const preview = previewRedemption(phone, subtotal)
  const points = Math.floor(Math.max(0, requested))
  if (points < MIN_REDEEM_POINTS) {
    throw new ApiError(400, `الحد الأدنى لاستخدام النقاط هو ${MIN_REDEEM_POINTS} نقطة`)
  }
  if (points > preview.maxRedeem || points > account.points) {
    throw new ApiError(409, 'عدد النقاط المطلوب أكبر من رصيدك أو من الحد المسموح لهذا الطلب')
  }
  return { points, value: points * POINTS_VALUE }
}

export function applyReferral(phoneInput: string, codeInput?: string | null, orderId?: number) {
  if (!codeInput) return null
  const phone = normalizePhone(phoneInput)
  const code = codeInput.trim().toUpperCase()
  if (!code) return null
  const referrer = db
    .prepare('SELECT * FROM loyalty_accounts WHERE referral_code = ?')
    .get(code) as Record<string, unknown> | undefined
  if (!referrer || String(referrer.phone) === phone) return null

  const previousOrders = db
    .prepare('SELECT COUNT(*) AS c FROM orders WHERE phone = ? AND id != ?')
    .get(phone, orderId ?? -1) as { c: number }
  if (previousOrders.c > 0) return null

  const account = ensureAccount(phone)
  if (account.referredBy) return null
  db.prepare('UPDATE loyalty_accounts SET referred_by = ?, updated_at = ? WHERE phone = ?').run(
    code,
    now(),
    phone,
  )
  awardPoints(phone, REFERRAL_BONUS_FRIEND, 'referral', {
    orderId,
    note: `مكافأة إحالة صديق (${code})`,
  })
  awardPoints(String(referrer.phone), REFERRAL_BONUS_REFERRER, 'referral', {
    orderId,
    note: `أحلت صديقًا جديدًا (${phone})`,
  })
  return {
    referrerPoints: REFERRAL_BONUS_REFERRER,
    friendPoints: REFERRAL_BONUS_FRIEND,
  }
}

/**
 * Reverses the loyalty side of a cancelled order: earned points are removed,
 * redeemed points are returned, and the coupon use is released. The caller is
 * responsible for only calling this once per order (cancelled is terminal).
 */
export function reverseOrderRewards(order: {
  id: number
  orderNumber: string
  phone: string
  pointsEarned: number
  pointsRedeemed: number
  couponCode: string | null
}) {
  const phone = normalizePhone(order.phone)
  if (order.pointsEarned > 0) {
    awardPoints(phone, -order.pointsEarned, 'adjust', {
      orderId: order.id,
      note: `خصم نقاط الطلب الملغي ${order.orderNumber}`,
    })
    db.prepare(
      'UPDATE loyalty_accounts SET lifetime_points = MAX(lifetime_points - ?, 0) WHERE phone = ?',
    ).run(order.pointsEarned, phone)
  }
  if (order.pointsRedeemed > 0) {
    awardPoints(phone, order.pointsRedeemed, 'adjust', {
      orderId: order.id,
      note: `استرجاع نقاط الطلب الملغي ${order.orderNumber}`,
    })
  }
  if (order.couponCode) {
    db.prepare(
      'UPDATE coupons SET used_count = MAX(used_count - 1, 0) WHERE code = ?',
    ).run(order.couponCode)
  }
}

export function logAnalyticsEvent(name: string, path: string | null, payload: unknown) {
  try {
    db.prepare(
      'INSERT INTO analytics_events (name, path, payload, created_at) VALUES (?, ?, ?, ?)',
    ).run(
      name.slice(0, 40),
      path ? path.slice(0, 200) : null,
      payload ? JSON.stringify(payload).slice(0, 2000) : null,
      now(),
    )
  } catch {
    /* analytics must never break the storefront */
  }
}
