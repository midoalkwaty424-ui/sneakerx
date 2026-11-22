import { db } from './db.js'

export function getOrder(orderId: number) {
  const order = db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .get(orderId) as Record<string, unknown> | undefined
  if (!order) return null
  const items = db
    .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id')
    .all(orderId) as Record<string, unknown>[]
  return {
    id: Number(order.id),
    orderNumber: String(order.order_number),
    status: String(order.status),
    paymentMethod: String(order.payment_method),
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    discount: Number(order.discount),
    couponCode: order.coupon_code ? String(order.coupon_code) : null,
    pointsRedeemed: Number(order.points_redeemed ?? 0),
    pointsEarned: Number(order.points_earned ?? 0),
    total: Number(order.total),
    notes: order.notes ? String(order.notes) : '',
    restocked: Number(order.restocked),
    createdAt: String(order.created_at),
    updatedAt: String(order.updated_at),
    customer: {
      id: Number(order.customer_id),
      name: String(order.customer_name),
      phone: String(order.phone),
      email: order.email ? String(order.email) : '',
      governorate: String(order.governorate),
      city: String(order.city),
      address: String(order.address),
    },
    items: items.map((item) => ({
      id: Number(item.id),
      productId: item.product_id == null ? null : Number(item.product_id),
      slug: item.product_slug ? String(item.product_slug) : null,
      name: String(item.name),
      size: String(item.size),
      color: item.color ? String(item.color) : '',
      colorHex: item.color_hex ? String(item.color_hex) : null,
      accentHex: item.accent_hex ? String(item.accent_hex) : null,
      image: item.image ? String(item.image) : null,
      price: Number(item.price),
      qty: Number(item.qty),
    })),
  }
}

export function orderListRow(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    orderNumber: String(row.order_number),
    customerName: String(row.customer_name),
    phone: String(row.phone),
    governorate: String(row.governorate),
    city: String(row.city),
    total: Number(row.total),
    status: String(row.status),
    itemsCount: Number(row.items_count ?? 0),
    createdAt: String(row.created_at),
  }
}
