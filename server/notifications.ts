import { db, now } from './db.js'
import { getOrder } from './orders.js'
import {
  customerConfirmationText,
  sendOrderNotifications,
  whatsappUrl,
  type OrderNotifyResult,
} from './whatsapp.js'

type NotifiableOrder = NonNullable<ReturnType<typeof getOrder>>

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

type NotificationRow = {
  id: number
  type: string
  title: string
  body: string
  order_id: number | null
  order_number: string | null
  phone: string | null
  read: number
  whatsapp_sent: number
  whatsapp_error: string | null
  whatsapp_text: string | null
  created_at: string
}

function mapNotification(row: NotificationRow): AdminNotification {
  return {
    id: Number(row.id),
    type: String(row.type),
    title: String(row.title),
    body: String(row.body),
    orderId: row.order_id == null ? null : Number(row.order_id),
    orderNumber: row.order_number ? String(row.order_number) : null,
    phone: row.phone ? String(row.phone) : null,
    read: Number(row.read) === 1,
    whatsappSent: Number(row.whatsapp_sent) === 1,
    whatsappError: row.whatsapp_error ? String(row.whatsapp_error) : null,
    whatsappUrl:
      row.phone && row.whatsapp_text ? whatsappUrl(String(row.phone), String(row.whatsapp_text)) : null,
    createdAt: String(row.created_at),
  }
}

export function listAdminNotifications(limit = 40) {
  const rows = db
    .prepare('SELECT * FROM admin_notifications ORDER BY created_at DESC, id DESC LIMIT ?')
    .all(Math.min(Math.max(limit, 1), 100)) as NotificationRow[]
  return rows.map(mapNotification)
}

export function unreadNotificationsCount() {
  const row = db
    .prepare('SELECT COUNT(*) AS c FROM admin_notifications WHERE read = 0')
    .get() as { c: number }
  return Number(row.c)
}

export function markNotificationRead(id: number) {
  return (
    db.prepare('UPDATE admin_notifications SET read = 1 WHERE id = ?').run(id).changes > 0
  )
}

export function markAllNotificationsRead() {
  return db.prepare('UPDATE admin_notifications SET read = 1 WHERE read = 0').run().changes
}

/** Called right after an order is committed. Never throws into the checkout flow. */
export function createNewOrderNotification(order: NotifiableOrder) {
  try {
    const confirmation = customerConfirmationText(order)
    const title = 'طلب جديد يحتاج تجهيز'
    const body = `${order.orderNumber} — ${order.customer.name} — ${order.customer.governorate} — ${Math.round(order.total).toLocaleString('en-US')} ج.م`
    const result = db
      .prepare(
        `INSERT OR IGNORE INTO admin_notifications
          (type, title, body, order_id, order_number, phone, read, whatsapp_sent, whatsapp_error, whatsapp_text, created_at)
         VALUES ('new_order', ?, ?, ?, ?, ?, 0, 0, NULL, ?, ?)`,
      )
      .run(title, body, order.id, order.orderNumber, order.customer.phone, confirmation, now())

    const id = Number(result.lastInsertRowid)
    if (id > 0) {
      void sendOrderNotifications(order)
        .then((outcome) => {
          db.prepare(
            'UPDATE admin_notifications SET whatsapp_sent = ?, whatsapp_error = ? WHERE id = ?',
          ).run(outcome.customerSent || outcome.adminSent ? 1 : 0, outcome.error, id)
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'فشل إرسال واتساب'
          db.prepare('UPDATE admin_notifications SET whatsapp_error = ? WHERE id = ?').run(message, id)
        })
    }
    return id
  } catch (error) {
    /* Notification failure must never fail a committed order. */
    console.error('[SNEAKERX NOTIFICATION]', error)
    return 0
  }
}

/** Manual retry from the admin panel after keys are configured. */
export async function resendOrderWhatsApp(order: NotifiableOrder): Promise<OrderNotifyResult> {
  const outcome = await sendOrderNotifications(order)
  db.prepare(
    `UPDATE admin_notifications
        SET whatsapp_sent = ?, whatsapp_error = ?
      WHERE order_id = ? AND type = 'new_order'`,
  ).run(outcome.customerSent || outcome.adminSent ? 1 : 0, outcome.error, order.id)
  return outcome
}
