import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import { track } from '../lib/analytics'
import type { Order, OrderRewards } from '../lib/types'
import { usePageMeta } from '../hooks/usePageMeta'
import { OrderDetails } from '../components/commerce/OrderDetails'
import { PageError, PageLoader } from '../components/ui/PageLoader'
import { Icon } from '../components/ui/Icon'
import { formatEGP, formatNumber } from '../lib/format'
import { confirmOrderLink } from '../lib/whatsapp'

type LocationState = { order?: Order; rewards?: OrderRewards } | null

export default function OrderSuccess() {
  usePageMeta(
    'تم تأكيد طلبك — SNEAKERX',
    'شكرًا لطلبك من SNEAKERX. يمكنك متابعة حالة الطلب برقم الطلب ورقم الهاتف.',
  )
  const { orderNumber = '' } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const phone = searchParams.get('phone') ?? ''
  const stateOrder = (location.state as LocationState)?.order
  const rewards = (location.state as LocationState)?.rewards
  const [order, setOrder] = useState<Order | null>(
    stateOrder && stateOrder.orderNumber === orderNumber ? stateOrder : null,
  )
  const [loading, setLoading] = useState(!order)
  const [error, setError] = useState('')

  useEffect(() => {
    if (order || !orderNumber) return
    if (!phone) {
      setError('للعرض مرة أخرى، أدخل رقم الطلب ورقم الهاتف في صفحة تتبع الطلب.')
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    api
      .order(orderNumber, phone)
      .then((result) => {
        if (active) {
          setOrder(result.order)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(errorMessage(err))
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [order, orderNumber, phone])

  if (loading) {
    return (
      <div className="pt-[7rem]">
        <PageLoader label="CONFIRMING ORDER" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="pt-[7rem]">
        <PageError
          title="لم نتمكن من عرض الطلب"
          message={error || 'تأكد من رقم الطلب ورقم الهاتف ثم حاول مرة أخرى.'}
        />
        <div className="flex flex-wrap justify-center gap-3 pb-20">
          <Link to={`/track?order=${encodeURIComponent(orderNumber)}`} className="btn btn-volt">
            تتبع الطلب
            <Icon name="arrow-left" size={15} />
          </Link>
          <Link to="/shop" className="btn btn-ghost">
            العودة للمتجر
          </Link>
        </div>
      </div>
    )
  }

  const pointsEarned = rewards?.pointsEarned ?? order.pointsEarned ?? 0

  return (
    <div className="page-enter pt-[6.6rem] md:pt-[7.6rem]">
      <div className="container-x">
        <header className="relative overflow-hidden rounded-[1.5rem] border border-volt/20 bg-[radial-gradient(circle_at_20%_20%,rgba(217,255,67,.12),transparent_55%)] p-6 md:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(241,238,229,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(241,238,229,.8) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              maskImage: 'radial-gradient(circle at 70% 50%, black, transparent 70%)',
            }}
          />
          <div className="relative flex flex-wrap items-center gap-6">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-volt text-ink">
              <Icon name="check" size={28} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="eyebrow eyebrow-volt mb-2">ORDER CONFIRMED / شكرًا ليك</p>
              <h1 className="display text-[clamp(2.4rem,5.2vw,4.8rem)]">
                YOUR <span className="display-italic lowercase text-volt">order</span> IS IN.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-bone/65">
                استلمنا طلبك <span className="font-mono text-bone">{order.orderNumber}</span> بنجاح.
                هنكلمك على <span className="font-mono text-bone" dir="ltr">{order.customer.phone}</span>{' '}
                لتأكيد التفاصيل قبل الشحن.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-ink2/70 px-5 py-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted">TOTAL / COD</p>
              <p className="mt-1 font-display text-2xl font-bold">{formatEGP(order.total)}</p>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap gap-3">
            <Link to="/shop" className="btn btn-volt btn-sm">
              متابعة التسوق
              <Icon name="arrow-left" size={14} />
            </Link>
            <Link
              to={`/track?order=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(
                order.customer.phone,
              )}`}
              className="btn btn-ghost btn-sm"
            >
              تتبع الطلب
              <Icon name="truck" size={14} />
            </Link>
            <a
              href={confirmOrderLink(order)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
              data-whatsapp-confirm
            >
              <Icon name="whatsapp" size={14} />
              أكّد على واتساب
            </a>
          </div>
        </header>

        {(pointsEarned > 0 || order.discount > 0) && (
          <section className="mt-5 grid gap-3 sm:grid-cols-2" data-order-rewards>
            <div className="rounded-2xl border border-volt/25 bg-volt/[0.07] p-5">
              <p className="eyebrow mb-2 !text-[9px]">SNEAKERX REWARDS</p>
              {pointsEarned > 0 ? (
                <>
                  <p className="font-display text-xl font-bold text-volt">
                    +{formatNumber(pointsEarned)} نقطة
                  </p>
                  <p className="mt-1 text-xs leading-6 text-bone/75">
                    أضفناها لرصيدك
                    {typeof rewards?.pointsBalance === 'number'
                      ? ` — رصيدك الحالي ${formatNumber(rewards.pointsBalance)} نقطة`
                      : ''}
                    . النقطة = 1 ج.م عند الاستبدال.
                  </p>
                </>
              ) : (
                <p className="text-xs text-bone/75">نقاط الطلب بتتضاف بعد تأكيد الشحن.</p>
              )}
              {rewards?.referralCode && (
                <p className="mt-2 text-[10px] text-muted">
                  كود الإحالة بتاعك:{' '}
                  <span className="font-mono tracking-widest text-bone">{rewards.referralCode}</span>
                </p>
              )}
              <Link to="/loyalty" className="link-line mt-3 inline-block text-[11px] text-volt">
                افتح صفحة المكافآت
              </Link>
            </div>
            <div className="rounded-2xl border border-line bg-ink2 p-5">
              <p className="eyebrow mb-2 !text-[9px]">ORDER SAVINGS</p>
              <dl className="space-y-1.5 text-xs">
                {order.couponCode && (
                  <div className="flex justify-between">
                    <dt className="text-muted">كوبون {order.couponCode}</dt>
                    <dd className="font-mono text-volt">مطبّق</dd>
                  </div>
                )}
                {order.pointsRedeemed ? (
                  <div className="flex justify-between">
                    <dt className="text-muted">نقاط مستخدمة</dt>
                    <dd className="font-mono text-volt">{formatNumber(order.pointsRedeemed)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-muted">إجمالي الخصم</dt>
                  <dd className="font-mono text-volt">−{formatEGP(order.discount)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-1.5">
                  <dt className="text-muted">الإجمالي المدفوع عند الاستلام</dt>
                  <dd className="font-mono font-bold">{formatEGP(order.total)}</dd>
                </div>
              </dl>
            </div>
          </section>
        )}

        <div className="py-8">
          <OrderDetails order={order} />
        </div>
      </div>
    </div>
  )
}
