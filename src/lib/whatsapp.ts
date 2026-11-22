import type { Order, Product } from './types'

/** Store WhatsApp number from VITE_WHATSAPP_NUMBER (international format, digits only). */
const RAW_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || '201000000000'

export const WHATSAPP_NUMBER = RAW_NUMBER.replace(/[^0-9]/g, '')

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export function supportLink(context = 'عايز مساعدة في اختيار سنيكر مناسب') {
  return whatsappLink(`مرحبًا SNEAKERX 👋\n${context}`)
}

export function orderMessage(order: Order) {
  const lines = order.items
    .map((item) => `• ${item.name} — مقاس ${item.size} — ${item.color} × ${item.qty}`)
    .join('\n')
  return [
    'مرحبًا SNEAKERX 👋',
    `أؤكد طلبي رقم ${order.orderNumber}`,
    lines,
    `الإجمالي: ${Math.round(order.total).toLocaleString('en-US')} ج.م (الدفع عند الاستلام)`,
    `المحافظة: ${order.customer.governorate} — ${order.customer.city}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function confirmOrderLink(order: Order) {
  return whatsappLink(orderMessage(order))
}

export function shareProductLink(product: Pick<Product, 'slug' | 'name' | 'price'>) {
  const url = `${window.location.origin}/product/${product.slug}`
  return whatsappLink(
    `شوف الـ ${product.name} من SNEAKERX — ${Math.round(product.price).toLocaleString(
      'en-US',
    )} ج.م\n${url}`,
  )
}

export function askAboutProductLink(product: Pick<Product, 'name' | 'slug'>) {
  const url = `${window.location.origin}/product/${product.slug}`
  return whatsappLink(`مرحبًا SNEAKERX 👋\nعندي سؤال عن ${product.name}\n${url}`)
}

export function sizeHelpLink() {
  return whatsappLink('مرحبًا SNEAKERX 👋\nمحتاج مساعدة في تحديد المقاس المناسب')
}
