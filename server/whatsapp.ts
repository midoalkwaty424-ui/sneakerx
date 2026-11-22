/**
 * WhatsApp delivery for order alerts.
 *
 * Two channels are supported:
 *  1. Cloud API (preferred) — set WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID.
 *     Optionally set WHATSAPP_ADMIN_NUMBER to also alert the owner on WhatsApp.
 *  2. Click-to-chat fallback — every notification carries a ready `wa.me` text,
 *     so the admin can deliver the confirmation manually when keys are absent.
 *
 * Delivery is always best-effort: a WhatsApp failure never fails the order.
 */

type OrderLike = {
  orderNumber: string
  total: number
  notes?: string | null
  customer: {
    name: string
    phone: string
    governorate: string
    city: string
    address?: string
  }
  items: { name: string; size: string; color?: string; qty: number }[]
}

type WaConfig = {
  token: string
  phoneNumberId: string
  apiVersion: string
  adminNumber: string
  customerEnabled: boolean
}

function digits(value: string) {
  return String(value || '').replace(/[^0-9]/g, '')
}

function config(): WaConfig {
  return {
    token: (process.env.WHATSAPP_ACCESS_TOKEN || '').trim(),
    phoneNumberId: (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
    apiVersion: (process.env.WHATSAPP_API_VERSION || 'v21.0').trim(),
    adminNumber: digits(process.env.WHATSAPP_ADMIN_NUMBER || ''),
    customerEnabled: (process.env.WHATSAPP_CUSTOMER_NOTIFY || 'true').toLowerCase() !== 'false',
  }
}

export function isWhatsAppConfigured() {
  const cfg = config()
  return Boolean(cfg.token && cfg.phoneNumberId)
}

/** Egyptian mobile numbers -> international format (20...), safe for the WhatsApp API. */
export function internationalPhone(phone: string) {
  const value = digits(phone)
  if (!value) return ''
  if (value.startsWith('20')) return value
  if (value.startsWith('01')) return `20${value.slice(1)}`
  return value
}

export function whatsappUrl(to: string, text: string) {
  return `https://wa.me/${internationalPhone(to)}?text=${encodeURIComponent(text)}`
}

function money(value: number) {
  return Math.round(value).toLocaleString('en-US')
}

function itemsList(order: OrderLike) {
  return order.items
    .map((item) => `• ${item.name}${item.color ? ` (${item.color})` : ''} — مقاس ${item.size} × ${item.qty}`)
    .join('\n')
}

/** The message the customer receives to confirm their COD order. */
export function customerConfirmationText(order: OrderLike) {
  return [
    `مرحبًا ${order.customer.name} 👋`,
    'تم استلام طلبك بنجاح في SNEAKERX ✅',
    `رقم الطلب: ${order.orderNumber}`,
    itemsList(order),
    `الإجمالي: ${money(order.total)} ج.م (الدفع عند الاستلام)`,
    `التوصيل: ${order.customer.governorate} — ${order.customer.city}`,
    'سنبدأ تجهيز الطلب فورًا ونتواصل معاك لتأكيد موعد التوصيل.',
    'شكرًا لثقتك بنا 🙌',
  ]
    .filter(Boolean)
    .join('\n')
}

/** The message the store owner receives the moment a new order lands. */
export function adminAlertText(order: OrderLike) {
  return [
    '🔔 طلب جديد يحتاج تجهيز',
    `رقم الطلب: ${order.orderNumber}`,
    `العميل: ${order.customer.name}`,
    `الهاتف: ${order.customer.phone}`,
    `العنوان: ${order.customer.governorate} — ${order.customer.city} — ${order.customer.address ?? ''}`,
    itemsList(order),
    `الإجمالي: ${money(order.total)} ج.م`,
    order.notes ? `ملاحظات: ${order.notes}` : '',
    'افتح لوحة التحكم لمراجعة الطلب وتحديث حالته.',
  ]
    .filter(Boolean)
    .join('\n')
}

const STATUS_TEXT: Record<string, string> = {
  confirmed: 'تم تأكيد طلبك وبدأنا تجهيزه ✅',
  packed: 'تم تجهيز طلبك وجاهز للشحن 📦',
  shipped: 'طلبك في الطريق إلى عنوانك 🚚',
  delivered: 'تم توصيل طلبك. شكرًا لتسوقك من SNEAKERX 🙌',
}

export function statusUpdateText(order: OrderLike, status: string) {
  const headline = STATUS_TEXT[status]
  if (!headline) return ''
  return [
    `مرحبًا ${order.customer.name} 👋`,
    headline,
    `رقم الطلب: ${order.orderNumber}`,
    `الإجمالي: ${money(order.total)} ج.م (الدفع عند الاستلام)`,
    'أي استفسار ردّ على هذه الرسالة.',
  ].join('\n')
}

export type SendResult = { ok: boolean; id?: string; error?: string }

/** Send one text message through the WhatsApp Cloud API. */
export async function sendWhatsApp(to: string, text: string): Promise<SendResult> {
  const cfg = config()
  const recipient = internationalPhone(to)
  if (!cfg.token || !cfg.phoneNumberId) {
    return { ok: false, error: 'WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID غير مُعدّة' }
  }
  if (!recipient || !text) return { ok: false, error: 'بيانات المستلم أو الرسالة غير كاملة' }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipient,
          type: 'text',
          text: { preview_url: false, body: text },
        }),
        signal: AbortSignal.timeout(8000),
      },
    )
    const payload = (await response.json().catch(() => ({}))) as {
      messages?: { id?: string }[]
      error?: { message?: string }
    }
    if (!response.ok) {
      return { ok: false, error: payload.error?.message || `WhatsApp HTTP ${response.status}` }
    }
    return { ok: true, id: payload.messages?.[0]?.id }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'فشل إرسال واتساب' }
  }
}

export type OrderNotifyResult = {
  configured: boolean
  customerSent: boolean
  adminSent: boolean
  error: string | null
}

/** Send the customer confirmation and (when configured) the owner's prep alert. */
export async function sendOrderNotifications(order: OrderLike): Promise<OrderNotifyResult> {
  const cfg = config()
  if (!isWhatsAppConfigured()) {
    return {
      configured: false,
      customerSent: false,
      adminSent: false,
      error: 'واتساب Cloud API غير مُعدّ — الرسالة جاهزة للإرسال اليدوي',
    }
  }

  const tasks: Promise<SendResult>[] = []
  if (cfg.customerEnabled) {
    tasks.push(sendWhatsApp(order.customer.phone, customerConfirmationText(order)))
  }
  if (cfg.adminNumber) {
    tasks.push(sendWhatsApp(cfg.adminNumber, adminAlertText(order)))
  }
  if (tasks.length === 0) {
    return {
      configured: true,
      customerSent: false,
      adminSent: false,
      error: 'إرسال واتساب معطّل من الإعدادات',
    }
  }

  const results = await Promise.all(tasks)
  const customerIndex = cfg.customerEnabled ? 0 : -1
  const adminIndex = cfg.customerEnabled && cfg.adminNumber ? 1 : cfg.adminNumber ? 0 : -1
  const failures = results
    .map((result, index) => (result.ok ? '' : `${index === adminIndex ? 'الأدمن' : 'العميل'}: ${result.error ?? 'فشل'}`))
    .filter(Boolean)

  return {
    configured: true,
    customerSent: customerIndex >= 0 ? results[customerIndex]?.ok === true : false,
    adminSent: adminIndex >= 0 ? results[adminIndex]?.ok === true : false,
    error: failures.length ? failures.join(' | ') : null,
  }
}

/** Best-effort delivery update to the customer when the admin changes an order status. */
export async function sendStatusNotification(order: OrderLike, status: string) {
  const text = statusUpdateText(order, status)
  if (!text || !isWhatsAppConfigured() || !config().customerEnabled) return null
  return sendWhatsApp(order.customer.phone, text)
}
