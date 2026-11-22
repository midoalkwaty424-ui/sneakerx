import { Link } from 'react-router-dom'
import type { Order } from '../../lib/types'
import { STATUS_LABEL, STATUS_STEPS } from '../../lib/constants'
import { cx, formatDateTime, formatEGP } from '../../lib/format'
import { Icon } from '../ui/Icon'
import { ProductVisual } from './ProductVisual'

const STATUS_STYLE: Record<string, string> = {
  pending: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  confirmed: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
  packed: 'border-indigo-300/30 bg-indigo-300/10 text-indigo-200',
  shipped: 'border-ice/30 bg-ice/10 text-ice',
  delivered: 'border-volt/30 bg-volt/10 text-volt',
  cancelled: 'border-flare/30 bg-flare/10 text-flare',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium',
        STATUS_STYLE[status] ?? 'border-line bg-ink3 text-muted',
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export function OrderStatusTimeline({ status }: { status: string }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-flare/25 bg-flare/[0.06] px-4 py-3">
        <Icon name="cancel" size={16} className="text-flare" />
        <p className="text-xs text-flare">تم إلغاء هذا الطلب وإرجاع الكميات إلى المخزون.</p>
      </div>
    )
  }
  const activeIndex = Math.max(STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]), 0)
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label="حالة الطلب">
      {STATUS_STEPS.map((step, index) => {
        const done = index <= activeIndex
        return (
          <li key={step} className="flex flex-col gap-2">
            <span
              className={cx(
                'h-1 rounded-full transition-colors',
                done ? 'bg-volt' : 'bg-line',
              )}
            />
            <span
              className={cx(
                'text-center text-[9px] leading-4',
                done ? 'text-bone' : 'text-muted',
              )}
            >
              {STATUS_LABEL[step]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function OrderDetails({ order }: { order: Order }) {
  return (
    <div className="space-y-6">
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="eyebrow mb-1.5">ORDER NUMBER</p>
            <p className="font-mono text-lg font-medium tracking-wide">{order.orderNumber}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={order.status} />
            <span className="font-mono text-[10px] text-muted">{formatDateTime(order.createdAt)}</span>
          </div>
        </div>
        <div className="p-5">
          <OrderStatusTimeline status={order.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <section className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">القطع ({order.items.length})</h2>
              <span className="font-mono text-[10px] text-muted">PAYMENT / COD</span>
            </div>
            <ul className="divide-y divide-line/70">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-line bg-ink3 p-2">
                    <ProductVisual
                      image={item.image}
                      base={item.colorHex ?? '#E9E3D3'}
                      accent={item.accentHex ?? '#1A1E25'}
                      alt={item.name}
                      fit="cover"
                      sizes="80px"
                      className="h-full w-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.slug ? (
                      <Link
                        to={`/product/${item.slug}`}
                        className="block truncate text-sm font-medium transition hover:text-volt"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <span className="block truncate text-sm font-medium">{item.name}</span>
                    )}
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full border border-bone/20"
                          style={{ background: item.colorHex ?? '#555' }}
                        />
                        {item.color}
                      </span>
                      <span className="h-3 w-px bg-line" />
                      مقاس {item.size}
                      <span className="h-3 w-px bg-line" />
                      الكمية {item.qty}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm">
                    {formatEGP(item.price * item.qty)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-5">
            <h2 className="mb-4 text-sm font-semibold">عنوان التوصيل</h2>
            <dl className="grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted">الاسم</dt>
                <dd className="mt-1 text-bone/90">{order.customer.name}</dd>
              </div>
              <div>
                <dt className="text-muted">الهاتف</dt>
                <dd className="mt-1 font-mono text-bone/90" dir="ltr">
                  {order.customer.phone}
                </dd>
              </div>
              <div>
                <dt className="text-muted">المحافظة / المدينة</dt>
                <dd className="mt-1 text-bone/90">
                  {order.customer.governorate} — {order.customer.city}
                </dd>
              </div>
              <div>
                <dt className="text-muted">البريد الإلكتروني</dt>
                <dd className="mt-1 text-bone/90" dir="ltr">
                  {order.customer.email || '—'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">العنوان التفصيلي</dt>
                <dd className="mt-1 leading-6 text-bone/90">{order.customer.address}</dd>
              </div>
              {order.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-muted">ملاحظات</dt>
                  <dd className="mt-1 leading-6 text-bone/90">{order.notes}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <section className="panel p-5">
            <h2 className="mb-4 text-sm font-semibold">ملخص الدفع</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between text-muted">
                <dt>المجموع الفرعي</dt>
                <dd className="font-mono text-bone">{formatEGP(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>الشحن</dt>
                <dd className={cx('font-mono', order.shipping === 0 ? 'text-volt' : 'text-bone')}>
                  {order.shipping === 0 ? 'مجاني' : formatEGP(order.shipping)}
                </dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-muted">
                  <dt>خصم</dt>
                  <dd className="font-mono text-volt">- {formatEGP(order.discount)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="text-base font-semibold">الإجمالي</dt>
                <dd className="font-display text-xl font-bold">{formatEGP(order.total)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-ink3/60 px-3 py-2.5 text-[10px] text-muted">
              <Icon name="credit-card" size={13} />
              الدفع عند الاستلام — يُحصّل مع مندوب التوصيل
            </div>
          </section>

        </aside>
      </div>
    </div>
  )
}
