import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import type { Order } from '../lib/types'
import { isValidPhone, normalizePhone } from '../lib/format'
import { usePageMeta } from '../hooks/usePageMeta'
import { OrderDetails } from '../components/commerce/OrderDetails'
import { Icon } from '../components/ui/Icon'

export default function TrackOrder() {
  usePageMeta(
    'تتبع طلبك — SNEAKERX',
    'تابع حالة طلبك من SNEAKERX باستخدام رقم الطلب ورقم الهاتف. شحن لكل محافظات مصر والدفع عند الاستلام.',
  )
  const [searchParams] = useSearchParams()
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') ?? '')
  const [phone, setPhone] = useState(searchParams.get('phone') ?? '')
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setOrderNumber(searchParams.get('order') ?? '')
    setPhone(searchParams.get('phone') ?? '')
  }, [searchParams])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setOrder(null)
    if (!orderNumber.trim()) {
      setError('أدخل رقم الطلب')
      return
    }
    if (!isValidPhone(phone)) {
      setError('أدخل رقم الهاتف الصحيح المستخدم في الطلب')
      return
    }
    setLoading(true)
    try {
      const result = await api.order(orderNumber.trim().toUpperCase(), normalizePhone(phone))
      setOrder(result.order)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-enter pt-[6.6rem] md:pt-[7.6rem]">
      <div className="container-x">
        <header className="border-b border-line pb-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-volt" />
            <span className="eyebrow">ORDER TRACKING / SUPPORT</span>
          </div>
          <h1 className="display text-[clamp(2.8rem,6vw,5.8rem)]">
            TRACK <span className="display-italic lowercase text-volt">your order</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
            ادخل برقم الطلب ورقم الهاتف اللي استخدمته وقت الشراء. هتلاقي رقم الطلب في صفحة التأكيد أو
            في رسالة واتساب تأكيد الطلب.
          </p>
        </header>

        <div className="grid gap-8 py-8 lg:grid-cols-[360px_1fr] lg:gap-12">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <form onSubmit={submit} className="panel p-5" noValidate>
              <h2 className="mb-5 text-sm font-semibold">بيانات الطلب</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="orderNumber" className="label">
                    رقم الطلب <span className="text-flare">*</span>
                  </label>
                  <input
                    id="orderNumber"
                    value={orderNumber}
                    onChange={(event) => setOrderNumber(event.target.value)}
                    placeholder="SX-26-XXXXXX"
                    className="field font-mono uppercase"
                    dir="ltr"
                    autoComplete="off"
                    aria-invalid={Boolean(error && !orderNumber.trim())}
                  />
                  <p className="mt-1.5 text-[9px] text-muted">يبدأ بـ SX- ويظهر بعد تأكيد الطلب.</p>
                </div>
                <div>
                  <label htmlFor="trackPhone" className="label">
                    رقم الهاتف <span className="text-flare">*</span>
                  </label>
                  <input
                    id="trackPhone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="field"
                    dir="ltr"
                    inputMode="tel"
                    autoComplete="tel"
                    aria-invalid={Boolean(error && !isValidPhone(phone))}
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-flare/30 bg-flare/[0.06] px-3 py-2.5 text-[11px] leading-5 text-flare">
                  <Icon name="cancel" size={13} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-volt mt-5 w-full">
                {loading ? <span className="spinner" /> : <Icon name="search" size={15} />}
                {loading ? 'جارٍ البحث...' : 'تتبع الطلب'}
              </button>
            </form>

            <div className="mt-4 rounded-xl border border-line bg-ink2/60 p-4 text-[10px] leading-5 text-muted">
              محتاج مساعدة؟ كلمنا على{' '}
              <a href="mailto:care@sneakerx.store" className="text-bone underline underline-offset-4">
                care@sneakerx.store
              </a>{' '}
              أو راجع{' '}
              <Link to="/policies#shipping" className="text-bone underline underline-offset-4">
                سياسة الشحن
              </Link>
              .
            </div>
          </aside>

          <main>
            {order ? (
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-bold">تفاصيل الطلب</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setOrder(null)
                      setOrderNumber('')
                      setPhone('')
                      setError('')
                    }}
                    className="btn btn-ghost btn-sm"
                  >
                    <Icon name="refresh" size={13} />
                    البحث برقم آخر
                  </button>
                </div>
                <OrderDetails order={order} />
              </div>
            ) : (
              <div className="grid min-h-[40vh] place-items-center rounded-2xl border border-line bg-ink2 px-6 text-center">
                <div className="max-w-sm">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-line text-muted">
                    <Icon name="orders" size={26} />
                  </span>
                  <h2 className="mt-5 font-display text-xl font-bold">حالة طلبك هتظهر هنا</h2>
                  <p className="mt-2 text-xs leading-6 text-muted">
                    بعد البحث، هتشوف مراحل الطلب من المراجعة لحد التوصيل، مع تفاصيل القطع والعنوان.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
