import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import { track } from '../lib/analytics'
import type { LoyaltyPreview, StoreConfig } from '../lib/types'
import {
  FREE_SHIPPING_THRESHOLD,
  GOVERNORATES,
  SHIPPING_FEE,
} from '../lib/constants'
import { cx, formatEGP, formatNumber, isValidPhone, normalizePhone } from '../lib/format'
import { usePageMeta } from '../hooks/usePageMeta'
import { useCart } from '../store/cart'
import { useRewards } from '../store/rewards'
import { useToast } from '../store/toast'
import { ProductVisual } from '../components/commerce/ProductVisual'
import { CouponField } from '../components/commerce/CouponField'
import { Icon } from '../components/ui/Icon'

type FormState = {
  name: string
  phone: string
  email: string
  governorate: string
  city: string
  address: string
  notes: string
}

type FieldErrors = Partial<Record<keyof FormState, string>>

const EMPTY: FormState = {
  name: '',
  phone: '',
  email: '',
  governorate: '',
  city: '',
  address: '',
  notes: '',
}

const FIELDS: { key: keyof FormState; label: string; placeholder: string }[] = [
  { key: 'name', label: 'الاسم بالكامل', placeholder: 'مثال: أحمد محمود' },
  { key: 'phone', label: 'رقم الهاتف', placeholder: '01xxxxxxxxx' },
]

function validate(form: FormState, governorates: string[]): FieldErrors {
  const errors: FieldErrors = {}
  if (form.name.trim().length < 3) errors.name = 'الاسم يجب أن يكون 3 أحرف على الأقل'
  if (!isValidPhone(form.phone)) errors.phone = 'رقم غير صحيح — 11 رقمًا يبدأ بـ 010/011/012/015'
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'البريد الإلكتروني غير صحيح'
  }
  if (!governorates.includes(form.governorate)) errors.governorate = 'اختر المحافظة'
  if (form.city.trim().length < 2) errors.city = 'أدخل المدينة أو المنطقة'
  if (form.address.trim().length < 10) errors.address = 'أدخل عنوانًا تفصيليًا (10 أحرف على الأقل)'
  return errors
}

export default function Checkout() {
  usePageMeta(
    'إتمام الطلب — SNEAKERX',
    'أكمل طلبك من SNEAKERX: دفع عند الاستلام، شحن لكل محافظات مصر، واسترجاع خلال 14 يومًا.',
  )
  const { items, subtotal, clearCart } = useCart()
  const {
    coupon,
    couponDiscountFor,
    referralCode,
    rememberPhone,
    removeCoupon,
    phone: savedPhone,
    clearReferral,
  } = useRewards()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [config, setConfig] = useState<StoreConfig | null>(null)
  const [form, setForm] = useState<FormState>(() => ({ ...EMPTY, phone: savedPhone }))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loyalty, setLoyalty] = useState<LoyaltyPreview | null>(null)
  const [pointsBusy, setPointsBusy] = useState(false)
  const [usePoints, setUsePoints] = useState(false)

  useEffect(() => {
    let active = true
    api
      .config()
      .then((result) => {
        if (active) setConfig(result)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const governorates = config?.governorates?.length ? config.governorates : GOVERNORATES
  const shipping = useMemo(() => {
    if (subtotal === 0) return 0
    return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
  }, [subtotal])
  const couponDiscount = couponDiscountFor(subtotal)
  const pointsDiscount = usePoints && loyalty?.canRedeem ? loyalty.maxRedeem : 0
  const discount = Math.min(subtotal, couponDiscount + pointsDiscount)
  const total = Math.max(subtotal - discount + shipping, 0)
  const remaining = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0)

  useEffect(() => {
    track('begin_checkout', {
      value: subtotal,
      currency: 'EGP',
      items: items.map((item) => ({
        item_id: item.slug,
        item_name: item.name,
        price: item.price,
        quantity: item.qty,
      })),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Loyalty preview: debounced so typing a phone does not spam the API. */
  useEffect(() => {
    const clean = normalizePhone(form.phone)
    if (!isValidPhone(clean) || subtotal <= 0) {
      setLoyalty(null)
      setUsePoints(false)
      return
    }
    let active = true
    const timer = window.setTimeout(() => {
      setPointsBusy(true)
      api
        .loyaltyPreview(clean, subtotal)
        .then((preview) => {
          if (!active) return
          setLoyalty(preview)
          if (!preview.canRedeem) setUsePoints(false)
        })
        .catch(() => {
          if (active) setLoyalty(null)
        })
        .finally(() => {
          if (active) setPointsBusy(false)
        })
    }, 900)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [form.phone, subtotal])

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError('')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitError('')
    const nextErrors = validate(form, governorates)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
      first?.focus()
      return
    }
    if (items.length === 0) {
      setSubmitError('السلة فارغة — أضف قطعة قبل إتمام الطلب')
      return
    }
    setSubmitting(true)
    const cleanPhone = normalizePhone(form.phone)
    try {
      const result = await api.createOrder({
        customer: {
          name: form.name.trim(),
          phone: cleanPhone,
          email: form.email.trim() || undefined,
          governorate: form.governorate,
          city: form.city.trim(),
          address: form.address.trim(),
          notes: form.notes.trim() || undefined,
        },
        paymentMethod: 'cod',
        couponCode: couponDiscount > 0 && coupon ? coupon.code : undefined,
        redeemPoints: pointsDiscount > 0 ? pointsDiscount : undefined,
        referralCode: referralCode || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          size: item.size,
          color: item.color,
          qty: item.qty,
        })),
      })
      rememberPhone(cleanPhone)
      removeCoupon()
      clearReferral()
      track('purchase', {
        transaction_id: result.order.orderNumber,
        value: result.order.total,
        currency: 'EGP',
        coupon: result.order.couponCode ?? '',
        items: result.order.items.map((item) => ({
          item_id: item.slug ?? '',
          item_name: item.name,
          price: item.price,
          quantity: item.qty,
        })),
      })
      clearCart()
      toast('تم إنشاء طلبك بنجاح')
      navigate(
        `/order/${result.order.orderNumber}?phone=${encodeURIComponent(cleanPhone)}`,
        { state: { order: result.order, rewards: result.rewards }, replace: true },
      )
    } catch (error) {
      setSubmitError(errorMessage(error))
      toast(errorMessage(error), 'error')
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="page-enter pt-[7rem]">
        <div className="container-x">
          <div className="grid min-h-[56vh] place-items-center rounded-2xl border border-line bg-ink2 px-6 text-center">
            <div>
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-line text-muted">
                <Icon name="bag" size={30} />
              </span>
              <h1 className="mt-6 font-display text-2xl font-bold">السلة فارغة</h1>
              <p className="mt-2 text-sm text-muted">أضف قطعة واحدة على الأقل قبل إتمام الطلب.</p>
              <Link to="/shop" className="btn btn-volt mt-6">
                تسوق الآن
                <Icon name="arrow-left" size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter pt-[6.6rem] md:pt-[7.6rem]">
      <div className="container-x">
        <header className="border-b border-line pb-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-volt" />
            <span className="eyebrow">SECURE CHECKOUT / COD ONLY</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="display text-[clamp(2.8rem,6vw,5.6rem)]">
              CHECK<span className="display-italic lowercase text-volt">out</span>
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-muted">
              {['السلة', 'البيانات', 'التأكيد'].map((step, index) => (
                <span key={step} className="flex items-center gap-2">
                  {index > 0 && <span className="h-px w-6 bg-line" />}
                  <span
                    className={cx(
                      'flex items-center gap-1.5 rounded-full border px-2.5 py-1',
                      index === 1
                        ? 'border-volt/40 bg-volt/10 text-volt'
                        : 'border-line text-muted',
                    )}
                  >
                    <span className="font-mono text-[9px]">0{index + 1}</span>
                    {step}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </header>

        <form onSubmit={submit} noValidate className="grid gap-8 py-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-10">
          <div className="space-y-6">
            <section className="panel p-5 md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-volt font-mono text-xs font-bold text-ink">
                  01
                </span>
                <div>
                  <h2 className="text-sm font-semibold">معلومات التواصل</h2>
                  <p className="text-[10px] text-muted">سنستخدمها لتأكيد الطلب وتحديث الشحن</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {FIELDS.map((field) => (
                  <div key={field.key}>
                    <label htmlFor={field.key} className="label">
                      {field.label} {field.key !== 'email' && <span className="text-flare">*</span>}
                    </label>
                    <input
                      id={field.key}
                      value={form[field.key]}
                      onChange={(event) => update(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      className="field"
                      aria-invalid={Boolean(errors[field.key])}
                      autoComplete={field.key === 'phone' ? 'tel' : 'name'}
                      inputMode={field.key === 'phone' ? 'tel' : undefined}
                      dir={field.key === 'phone' ? 'ltr' : undefined}
                    />
                    {errors[field.key] && <p className="error-text">{errors[field.key]}</p>}
                  </div>
                ))}

                <div>
                  <label htmlFor="email" className="label">
                    البريد الإلكتروني <span className="text-muted">(اختياري)</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => update('email', event.target.value)}
                    placeholder="you@example.com"
                    className="field"
                    dir="ltr"
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                  />
                  {errors.email && <p className="error-text">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="governorate" className="label">
                    المحافظة <span className="text-flare">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="governorate"
                      value={form.governorate}
                      onChange={(event) => update('governorate', event.target.value)}
                      className="field appearance-none pe-9"
                      aria-invalid={Boolean(errors.governorate)}
                      autoComplete="address-level1"
                    >
                      <option value="" disabled className="bg-ink2">
                        اختر المحافظة
                      </option>
                      {governorates.map((governorate) => (
                        <option key={governorate} value={governorate} className="bg-ink2">
                          {governorate}
                        </option>
                      ))}
                    </select>
                    <Icon
                      name="chevron-down"
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                    />
                  </div>
                  {errors.governorate && <p className="error-text">{errors.governorate}</p>}
                </div>
              </div>
            </section>

            <section className="panel p-5 md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-volt font-mono text-xs font-bold text-ink">
                  02
                </span>
                <div>
                  <h2 className="text-sm font-semibold">عنوان التوصيل</h2>
                  <p className="text-[10px] text-muted">الشحن متاح لكل محافظات مصر الـ27</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <label htmlFor="city" className="label">
                    المدينة / المنطقة <span className="text-flare">*</span>
                  </label>
                  <input
                    id="city"
                    value={form.city}
                    onChange={(event) => update('city', event.target.value)}
                    placeholder="مثال: مدينة نصر"
                    className="field"
                    aria-invalid={Boolean(errors.city)}
                    autoComplete="address-level2"
                  />
                  {errors.city && <p className="error-text">{errors.city}</p>}
                </div>

                <div>
                  <label htmlFor="address" className="label">
                    العنوان التفصيلي <span className="text-flare">*</span>
                  </label>
                  <textarea
                    id="address"
                    value={form.address}
                    onChange={(event) => update('address', event.target.value)}
                    placeholder="الشارع، رقم المبنى، الدور، الشقة، وأي علامة مميزة تساعد المندوب"
                    rows={3}
                    className="field resize-none"
                    aria-invalid={Boolean(errors.address)}
                    autoComplete="street-address"
                  />
                  {errors.address && <p className="error-text">{errors.address}</p>}
                </div>

                <div>
                  <label htmlFor="notes" className="label">
                    ملاحظات الطلب <span className="text-muted">(اختياري)</span>
                  </label>
                  <textarea
                    id="notes"
                    value={form.notes}
                    onChange={(event) => update('notes', event.target.value)}
                    placeholder="مثال: الاتصال قبل التوصيل، أو وقت مناسب للتسليم"
                    rows={2}
                    maxLength={400}
                    className="field resize-none"
                  />
                </div>
              </div>
            </section>

            <section className="panel p-5 md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-volt font-mono text-xs font-bold text-ink">
                  03
                </span>
                <div>
                  <h2 className="text-sm font-semibold">طريقة الدفع</h2>
                  <p className="text-[10px] text-muted">الدفع عند الاستلام فقط في هذه النسخة</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-volt/40 bg-volt/[0.06] p-4">
                  <input type="radio" name="payment" value="cod" checked readOnly className="mt-1 accent-volt" />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon name="truck" size={15} className="text-volt" />
                      الدفع عند الاستلام (COD)
                    </span>
                    <span className="mt-1 block text-[11px] leading-5 text-muted">
                      افحص القطعة عند وصولها وادفع للمندوب. لا حاجة لبطاقة بنكية.
                    </span>
                  </span>
                  <span className="rounded-full bg-volt px-2 py-0.5 font-mono text-[9px] font-bold text-ink">
                    ACTIVE
                  </span>
                </label>

                <div className="flex items-start gap-3 rounded-xl border border-line bg-ink3/40 p-4 opacity-60">
                  <input type="radio" name="payment" value="card" disabled className="mt-1" />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon name="credit-card" size={15} />
                      بطاقة بنكية / محفظة إلكترونية
                    </span>
                    <span className="mt-1 block text-[11px] text-muted">
                      غير متاح حاليًا — سيُفعّل بعد ربط بوابة الدفع.
                    </span>
                  </span>
                  <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] text-muted">
                    SOON
                  </span>
                </div>
              </div>
            </section>

            {submitError && (
              <div className="flex items-start gap-3 rounded-xl border border-flare/30 bg-flare/[0.07] px-4 py-3 text-xs leading-6 text-flare">
                <Icon name="cancel" size={15} className="mt-0.5 shrink-0" />
                <p>{submitError}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 rounded-xl border border-line/70 bg-ink2/50 p-3 text-center">
              {[
                { icon: 'shield' as const, label: 'دفع عند الاستلام' },
                { icon: 'truck' as const, label: 'شحن 27 محافظة' },
                { icon: 'refresh' as const, label: 'استرجاع 14 يوم' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1.5">
                  <Icon name={item.icon} size={15} className="text-volt/85" />
                  <span className="text-[9px] leading-4 text-muted">{item.label}</span>
                </div>
              ))}
            </div>

            <button type="submit" disabled={submitting} className="btn btn-volt btn-lg w-full">
              {submitting ? (
                <>
                  <span className="spinner" />
                  جارٍ تأكيد الطلب...
                </>
              ) : (
                <>
                  تأكيد الطلب — {formatEGP(total)}
                  <Icon name="arrow-left" size={16} />
                </>
              )}
            </button>

            <p className="text-center text-[10px] leading-5 text-muted">
              بتأكيد الطلب أنت توافق على{' '}
              <Link to="/policies#terms" className="text-bone underline underline-offset-4">
                الشروط والأحكام
              </Link>{' '}
              و{' '}
              <Link to="/policies#returns" className="text-bone underline underline-offset-4">
                سياسة الاسترجاع
              </Link>
              . الدفع عند الاستلام — يُحصّل المبلغ مع مندوب التوصيل.
            </p>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-line p-5">
                <h2 className="text-sm font-semibold">ملخص الطلب</h2>
                <span className="font-mono text-[10px] text-muted">
                  {items.length} LINE{items.length > 1 ? 'S' : ''}
                </span>
              </div>

              <ul className="max-h-[340px] divide-y divide-line/70 overflow-y-auto px-5">
                {items.map((item) => (
                  <li key={item.key} className="flex items-center gap-3 py-4">
                    <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-line bg-ink3 p-1">
                      <ProductVisual
                        image={item.image}
                        base={item.colorHex}
                        accent={item.accentHex}
                        alt={item.name}
                        fit="cover"
                        sizes="64px"
                        className="h-full w-full"
                      />
                      <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-volt px-1 font-mono text-[9px] font-bold text-ink">
                        {item.qty}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{item.name}</p>
                      <p className="mt-1 text-[10px] text-muted">
                        {item.color} / مقاس {item.size}
                      </p>
                    </div>
                    <span className="font-mono text-xs">{formatEGP(item.price * item.qty)}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-line p-5">
                <CouponField subtotal={subtotal} compact className="mb-4" />

                {referralCode && (
                  <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-ice/30 bg-ice/10 px-3 py-2.5">
                    <p className="text-[10px] leading-5 text-bone/85">
                      كود إحالة مطبّق: <span className="font-mono text-ice">{referralCode}</span>
                      <span className="block text-muted">مكافأة للطرفين بعد أول طلب.</span>
                    </p>
                    <button
                      type="button"
                      className="text-[10px] text-muted underline-offset-4 hover:text-bone hover:underline"
                      onClick={clearReferral}
                    >
                      إزالة
                    </button>
                  </div>
                )}

                {pointsBusy && (
                  <div className="mb-4 flex items-center gap-2 text-[10px] text-muted">
                    <span className="spinner" /> بنتحقق من رصيد نقاطك…
                  </div>
                )}

                {loyalty && !pointsBusy && (
                  <div className="mb-4 rounded-xl border border-volt/25 bg-volt/[0.06] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold text-bone">
                          عندك {formatNumber(loyalty.points)} نقطة
                        </p>
                        <p className="mt-0.5 text-[10px] leading-5 text-muted">
                          {loyalty.canRedeem
                            ? `تقدر تستبدل حتى ${formatNumber(loyalty.maxRedeem)} نقطة = ${formatEGP(
                                loyalty.maxRedeem,
                              )} خصم على الطلب ده.`
                            : `تحتاج ${loyalty.minRedeem} نقطة على الأقل لبدء الاستبدال.`}
                        </p>
                      </div>
                      {loyalty.canRedeem && (
                        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[10px] font-medium">
                          <input
                            type="checkbox"
                            checked={usePoints}
                            onChange={(event) => setUsePoints(event.target.checked)}
                            className="accent-volt"
                            data-use-points
                          />
                          استخدمها
                        </label>
                      )}
                    </div>
                  </div>
                )}

                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-muted">
                    <dt>المجموع الفرعي</dt>
                    <dd className="font-mono text-bone">{formatEGP(subtotal)}</dd>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-volt">
                      <dt>خصم الكوبون {coupon ? `(${coupon.code})` : ''}</dt>
                      <dd className="font-mono">−{formatEGP(couponDiscount)}</dd>
                    </div>
                  )}
                  {pointsDiscount > 0 && (
                    <div className="flex justify-between text-volt">
                      <dt>خصم النقاط</dt>
                      <dd className="font-mono">−{formatEGP(pointsDiscount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between text-muted">
                    <dt>الشحن</dt>
                    <dd className={cx('font-mono', shipping === 0 ? 'text-volt' : 'text-bone')}>
                      {shipping === 0 ? 'مجاني' : formatEGP(shipping)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-line pt-3">
                    <dt className="text-base font-semibold">الإجمالي</dt>
                    <dd className="font-display text-xl font-bold">{formatEGP(total)}</dd>
                  </div>
                </dl>

                {remaining > 0 ? (
                  <div className="mt-4 rounded-lg border border-line bg-ink3/50 px-3 py-2.5">
                    <p className="text-[10px] text-muted">
                      أضف بقيمة <span className="text-volt">{formatEGP(remaining)}</span> للحصول على شحن
                      مجاني
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink">
                      <div
                        className="h-full rounded-full bg-volt"
                        style={{ width: `${Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-volt/25 bg-volt/[0.06] px-3 py-2.5 text-[10px] text-volt">
                    <Icon name="check" size={12} />
                    شحن مجاني مفعّل على هذا الطلب
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 text-[10px] text-muted">
                  <Icon name="shield" size={12} className="text-volt/80" />
                  بياناتك محفوظة بشكل آمن ولا تُشارك مع أي طرف.
                </div>
              </div>
            </section>

            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="mt-3 flex w-full items-center justify-center gap-2 text-[11px] text-muted transition hover:text-bone"
            >
              <Icon name="arrow-right" size={13} />
              متابعة التسوق
            </button>
          </aside>
        </form>
      </div>
    </div>
  )
}
