import { db, now } from './db.js'
import { ApiError } from './http.js'
import { isValidEgyptPhone, normalizePhone } from './rewards.js'

export type StockAlertStatus = 'pending' | 'ready' | 'notified'

type AlertRow = Record<string, unknown> & {
  id: number
  productId: number
  variantId: number
  phone: string
  size: string
  color: string | null
  status: StockAlertStatus
  notifiedAt: string | null
  createdAt: string
  productName: string
  productSlug: string
  stock: number
}

export type StockAlertView = {
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

function mapAlert(row: AlertRow): StockAlertView {
  const message = `أهلًا! ${row.productName} مقاس ${row.size} رجع متوفر دلوقتي في SNEAKERX. تتحجز لك؟`
  return {
    id: Number(row.id),
    productId: Number(row.productId),
    variantId: Number(row.variantId),
    phone: String(row.phone),
    size: String(row.size),
    color: String(row.color ?? ''),
    status: row.status,
    notifiedAt: row.notifiedAt ? String(row.notifiedAt) : null,
    createdAt: String(row.createdAt),
    productName: String(row.productName),
    productSlug: String(row.productSlug),
    stock: Number(row.stock),
    whatsappUrl: `https://wa.me/${encodeURIComponent(String(row.phone))}?text=${encodeURIComponent(message)}`,
  }
}

const ALERT_SELECT = `
  SELECT sa.id, sa.product_id AS productId, sa.variant_id AS variantId, sa.phone,
         sa.size, sa.color, sa.status, sa.notified_at AS notifiedAt, sa.created_at AS createdAt,
         p.name AS productName, p.slug AS productSlug, v.stock
  FROM stock_alerts sa
  JOIN products p ON p.id = sa.product_id
  JOIN variants v ON v.id = sa.variant_id
`

/** Creates (or refreshes) a notification request for an out-of-stock variant. */
export function createStockAlert(input: { variantId: number; phone: string }) {
  const phone = normalizePhone(String(input.phone ?? ''))
  if (!isValidEgyptPhone(phone)) {
    throw new ApiError(400, 'أدخل رقم هاتف مصري صحيح')
  }

  const variant = db
    .prepare(
      `SELECT v.id, v.product_id AS productId, v.size, v.color, v.stock, p.slug
       FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?`,
    )
    .get(input.variantId) as
    | { id: number; productId: number; size: string; color: string | null; stock: number; slug: string }
    | undefined

  if (!variant) throw new ApiError(404, 'المقاس المطلوب غير موجود')
  if (Number(variant.stock) > 0) {
    throw new ApiError(409, 'المقاس متوفر بالفعل — تقدر تضيفه للسلة دلوقتي')
  }

  const existing = db
    .prepare('SELECT id FROM stock_alerts WHERE variant_id = ? AND phone = ?')
    .get(variant.id, phone) as { id: number } | undefined

  if (existing) {
    db.prepare(
      `UPDATE stock_alerts
       SET status = 'pending', notified_at = NULL, created_at = ?, product_id = ?, size = ?, color = ?
       WHERE id = ?`,
    ).run(now(), variant.productId, variant.size, variant.color, existing.id)
    return { id: Number(existing.id), alreadySubscribed: true }
  }

  const result = db
    .prepare(
      `INSERT INTO stock_alerts
       (product_id, variant_id, phone, size, color, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(variant.productId, variant.id, phone, variant.size, variant.color, now())

  return { id: Number(result.lastInsertRowid), alreadySubscribed: false }
}

/**
 * Called after any stock increase. Moves waiting subscribers into the "ready"
 * bucket so the admin can contact them from /admin/stock-alerts.
 */
export function markAlertsReady(variantId: number, stock: number) {
  if (Number(stock) <= 0) return 0
  const result = db
    .prepare(
      `UPDATE stock_alerts SET status = 'ready'
       WHERE variant_id = ? AND status = 'pending'`,
    )
    .run(variantId)
  return Number(result.changes)
}

export function listStockAlerts(status?: StockAlertStatus) {
  const where = status ? 'WHERE sa.status = ?' : ''
  const rows = db
    .prepare(`${ALERT_SELECT} ${where} ORDER BY sa.status DESC, sa.created_at DESC`)
    .all(...(status ? [status] : [])) as AlertRow[]
  return rows.map(mapAlert)
}

export function markStockAlertNotified(id: number) {
  const result = db
    .prepare(
      `UPDATE stock_alerts SET status = 'notified', notified_at = ? WHERE id = ? AND status = 'ready'`,
    )
    .run(now(), id)
  if (Number(result.changes) === 0) throw new ApiError(404, 'التنبيه غير موجود أو لم يصبح جاهزًا بعد')
  return { ok: true }
}

export function deleteStockAlert(id: number) {
  const result = db.prepare('DELETE FROM stock_alerts WHERE id = ?').run(id)
  if (Number(result.changes) === 0) throw new ApiError(404, 'التنبيه غير موجود')
  return { ok: true }
}
