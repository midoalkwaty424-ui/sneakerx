import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FREE_SHIPPING_THRESHOLD } from '../../lib/constants'
import { cx, formatEGP } from '../../lib/format'
import { useCart } from '../../store/cart'
import { useRewards } from '../../store/rewards'
import { useBodyLock } from '../../hooks/useBodyLock'
import { ProductVisual } from '../commerce/ProductVisual'
import { QuantityStepper } from '../commerce/QuantityStepper'
import { CouponField } from '../commerce/CouponField'
import { Icon } from '../ui/Icon'

export function CartDrawer() {
  const { items, isOpen, closeCart, subtotal, shipping, total, count, setQty, removeItem } = useCart()
  const { couponDiscountFor } = useRewards()
  const navigate = useNavigate()
  useBodyLock(isOpen)
  const couponDiscount = couponDiscountFor(subtotal)
  const grandTotal = Math.max(total - couponDiscount, 0)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, closeCart])

  const remaining = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0)
  const progress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[135]" role="dialog" aria-modal="true" aria-label="سلة المشتريات">
          <motion.button
            type="button"
            aria-label="إغلاق السلة"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeCart}
            className="absolute inset-0 h-full w-full bg-black/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 left-0 flex w-full max-w-[440px] flex-col border-e border-line bg-ink2 shadow-[30px_0_80px_rgba(0,0,0,.6)]"
          >
            <div className="grain" />
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div>
                <p className="eyebrow mb-1">YOUR BAG</p>
                <h2 className="text-lg font-semibold">
                  حقيبتك <span className="font-mono text-sm text-volt">({count})</span>
                </h2>
              </div>
              <button onClick={closeCart} className="icon-btn" aria-label="إغلاق السلة">
                <Icon name="close" size={18} />
              </button>
            </div>

            {items.length > 0 && (
              <div className="border-b border-line/70 px-6 py-4">
                <p className="mb-2 text-[11px] text-muted">
                  {remaining > 0 ? (
                    <>
                      أضف بقيمة <span className="text-volt">{formatEGP(remaining)}</span> للحصول على شحن
                      مجاني
                    </>
                  ) : (
                    <span className="text-volt">مبروك — شحن مجاني على هذا الطلب</span>
                  )}
                </p>
                <div className="h-1 overflow-hidden rounded-full bg-ink3">
                  <motion.div
                    className="h-full rounded-full bg-volt"
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto overscroll-contain px-6">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-5 py-16 text-center">
                  <span className="grid h-20 w-20 place-items-center rounded-full border border-line text-muted">
                    <Icon name="bag" size={32} />
                  </span>
                  <div>
                    <p className="mb-1 text-base font-medium">حقيبتك فارغة</p>
                    <p className="text-xs text-muted">الـ DROP الجديد في انتظارك</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      closeCart()
                      navigate('/shop')
                    }}
                    className="btn btn-volt btn-sm"
                  >
                    تسوق الآن
                    <Icon name="arrow-left" size={14} />
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-line/70">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.li
                        key={item.key}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -30, height: 0 }}
                        transition={{ duration: 0.28 }}
                        className="flex gap-4 py-5"
                      >
                        <Link
                          to={`/product/${item.slug}`}
                          onClick={closeCart}
                          className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-ink3 p-1"
                          aria-label={`عرض ${item.name}`}
                        >
                          <ProductVisual
                            image={item.image}
                            base={item.colorHex}
                            accent={item.accentHex}
                            alt={item.name}
                            fit="cover"
                            sizes="96px"
                            className="h-full w-full transition-transform duration-500 hover:scale-110"
                            artClassName="transition-transform duration-500 hover:scale-110"
                          />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link
                                to={`/product/${item.slug}`}
                                onClick={closeCart}
                                className="block truncate text-sm font-semibold hover:text-volt"
                              >
                                {item.name}
                              </Link>
                              <p className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                                <span className="inline-flex items-center gap-1">
                                  <span
                                    className="h-2 w-2 rounded-full border border-bone/20"
                                    style={{ background: item.colorHex }}
                                  />
                                  {item.color}
                                </span>
                                <span className="h-3 w-px bg-line" />
                                مقاس {item.size}
                              </p>
                            </div>
                            <button
                              onClick={() => removeItem(item.key)}
                              className="text-muted transition hover:text-flare"
                              aria-label={`حذف ${item.name} من السلة`}
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                          <div className="mt-auto flex items-center justify-between pt-3">
                            <QuantityStepper
                              value={item.qty}
                              onChange={(qty) => setQty(item.key, qty)}
                              compact
                            />
                            <span className="font-mono text-sm">
                              {formatEGP(item.price * item.qty)}
                            </span>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-line bg-ink/40 px-6 pb-6 pt-5">
                <CouponField subtotal={subtotal} compact className="mb-4" />
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted">
                    <dt>المجموع الفرعي</dt>
                    <dd className="font-mono text-bone">{formatEGP(subtotal)}</dd>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-volt">
                      <dt>خصم الكوبون</dt>
                      <dd className="font-mono">−{formatEGP(couponDiscount)}</dd>
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
                    <dd className="font-display text-xl font-bold">{formatEGP(grandTotal)}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => {
                    closeCart()
                    navigate('/checkout')
                  }}
                  className="btn btn-volt mt-5 w-full"
                  data-cursor-label="إتمام"
                >
                  إتمام الطلب
                  <Icon name="arrow-left" size={16} />
                </button>
                <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-muted">
                  <Icon name="shield" size={12} />
                  دفع عند الاستلام — بياناتك مشفّرة وآمنة
                </div>
                <button
                  type="button"
                  onClick={closeCart}
                  className="mt-3 w-full text-center text-xs text-muted underline decoration-line underline-offset-4 transition hover:text-bone"
                >
                  متابعة التسوق
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
