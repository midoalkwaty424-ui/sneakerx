import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { track, itemPayload } from '../../lib/analytics'
import { MAX_QTY_PER_ITEM } from '../../lib/constants'
import { cx, discountPercent, formatEGP } from '../../lib/format'
import { colorPrimaryImage, thumbImage } from '../../lib/product-visuals'
import type { Product } from '../../lib/types'
import { useBodyLock } from '../../hooks/useBodyLock'
import { useAssistant } from '../../store/assistant'
import { useCart } from '../../store/cart'
import { toShopItem, useShop } from '../../store/shop'
import { useToast } from '../../store/toast'
import { ProductVisual } from './ProductVisual'
import { QuantityStepper } from './QuantityStepper'
import { StockAlertForm } from './StockAlertForm'
import { Icon } from '../ui/Icon'

type QuickViewProps = {
  product: Product | null
  onClose: () => void
}

function colorSizes(product: Product, color: string) {
  return product.sizes.map((item) => ({
    size: item.size,
    stock: product.variants
      .filter((variant) => variant.size === item.size && variant.color === color)
      .reduce((sum, variant) => sum + variant.stock, 0),
  }))
}

export function QuickView({ product, onClose }: QuickViewProps) {
  useBodyLock(Boolean(product))
  const [colorIndex, setColorIndex] = useState(0)
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)
  const { addItem, openCart } = useCart()
  const { toast } = useToast()
  const { toggleWishlist, toggleCompare, isWishlisted, isCompared } = useShop()
  const { openAssistant } = useAssistant()

  useEffect(() => {
    if (!product) return
    setColorIndex(0)
    setQty(1)
    const first = colorSizes(product, product.colors[0]?.name ?? '').find((item) => item.stock > 0)
    setSize(first?.size ?? product.sizes[0]?.size ?? '')
  }, [product])

  useEffect(() => {
    if (!product) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [product, onClose])

  useEffect(() => {
    if (!product) return
    track('view_item', { currency: 'EGP', value: product.price, items: [itemPayload(product)] })
  }, [product])

  const color = product?.colors[colorIndex] ?? product?.colors[0]
  const sizes = useMemo(
    () => (product && color ? colorSizes(product, color.name) : []),
    [product, color],
  )
  const selectedStock = sizes.find((item) => item.size === size)?.stock ?? 0
  const selectedVariant = product?.variants.find(
    (variant) => variant.size === size && variant.color === color?.name,
  )
  const maxQty = Math.max(Math.min(selectedStock, MAX_QTY_PER_ITEM), 1)
  const discount = product ? discountPercent(product.price, product.comparePrice) : 0

  const addToCart = () => {
    if (!product || !color || !size || selectedStock === 0) return
    const quantity = Math.min(qty, selectedStock)
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      size,
      color: color.name,
      colorHex: color.hex,
      accentHex: color.accent,
      image: colorPrimaryImage(product, color),
      price: product.price,
      qty: quantity,
    })
    toast(`أضفنا ${product.name} — مقاس ${size} للسلة`)
    track('add_to_cart', {
      currency: 'EGP',
      value: product.price * quantity,
      items: [{ ...itemPayload(product), item_variant: color.name, quantity }],
    })
    onClose()
    openCart()
  }

  return createPortal(
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed inset-0 z-[130]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-quick-view
        >
          <button
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-label="إغلاق المعاينة السريعة"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 end-0 w-full max-w-2xl overflow-y-auto border-s border-line bg-ink2 p-5 sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-label={`معاينة ${product.name}`}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="eyebrow eyebrow-volt mb-1">QUICK VIEW / {product.category?.name ?? 'SNEAKERX'}</p>
                <p className="font-mono text-[9px] text-muted">معاينة سريعة بدون مغادرة المتجر</p>
              </div>
              <button onClick={onClose} className="icon-btn" aria-label="إغلاق">
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="aspect-square overflow-hidden rounded-2xl border border-line bg-ink3 p-3">
                <ProductVisual
                  image={thumbImage(colorPrimaryImage(product, color))}
                  alt={`${product.name} — ${color?.name ?? ''}`}
                  className="h-full w-full"
                  priority
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {product.isNew && <span className="chip !py-1 !text-[9px]">جديد</span>}
                  {discount > 0 && (
                    <span className="rounded-full bg-flare/15 px-2 py-1 font-mono text-[9px] text-flare">
                      −{discount}%
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[10px] text-muted">
                    <Icon name="star" size={11} filled className="text-volt" />
                    {product.rating.toFixed(1)} ({product.reviewCount})
                  </span>
                </div>
                <h2 className="display mt-3 text-3xl leading-tight">{product.name}</h2>
                <p className="mt-1 text-[11px] text-muted">{product.subtitle}</p>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold text-volt">
                    {formatEGP(product.price)}
                  </span>
                  {product.comparePrice && product.comparePrice > product.price && (
                    <span className="text-xs text-muted line-through">
                      {formatEGP(product.comparePrice)}
                    </span>
                  )}
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-[10px] text-muted">
                    اللون: <span className="text-bone">{color?.name}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((option, index) => (
                      <button
                        key={option.name}
                        type="button"
                        onClick={() => {
                          setColorIndex(index)
                          setQty(1)
                          const available = colorSizes(product, option.name).find((item) => item.stock > 0)
                          setSize(available?.size ?? product.sizes[0]?.size ?? '')
                        }}
                        className={cx(
                          'grid h-8 w-8 place-items-center rounded-full border-2 transition',
                          colorIndex === index ? 'border-volt' : 'border-transparent hover:border-bone/30',
                        )}
                        aria-label={`لون ${option.name}`}
                        aria-pressed={colorIndex === index}
                      >
                        <span
                          className="h-6 w-6 rounded-full border border-bone/20"
                          style={{ backgroundColor: option.hex }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] text-muted">المقاس</p>
                    <Link to="/policies#sizes" onClick={onClose} className="link-line text-[9px] text-muted">
                      دليل المقاسات
                    </Link>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {sizes.map((item) => (
                      <button
                        key={item.size}
                        type="button"
                        onClick={() => {
                          setSize(item.size)
                          setQty(1)
                        }}
                        className={cx(
                          'rounded-lg border py-2 font-mono text-[11px] transition',
                          size === item.size
                            ? 'border-volt bg-volt text-ink'
                            : item.stock === 0
                              ? 'border-line/60 text-muted/50 line-through hover:border-ice/40'
                              : 'border-line text-bone/75 hover:border-bone/40',
                        )}
                        aria-pressed={size === item.size}
                        title={item.stock === 0 ? 'نفد — سجّل تنبيه' : `متوفر (${item.stock})`}
                      >
                        {item.size}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedStock === 0 && selectedVariant && (
                  <div className="mt-4">
                    <StockAlertForm
                      productId={product.id}
                      variantId={selectedVariant.id}
                      productName={product.name}
                      size={size}
                      compact
                    />
                  </div>
                )}

                <div className="mt-5 flex items-center gap-2">
                  <QuantityStepper value={Math.min(qty, maxQty)} onChange={setQty} max={maxQty} compact />
                  <button
                    type="button"
                    onClick={addToCart}
                    disabled={selectedStock === 0}
                    className="btn btn-volt h-10 flex-1 !py-2 text-xs"
                    data-quick-view-add
                  >
                    {selectedStock === 0 ? 'المقاس غير متوفر' : 'أضف إلى السلة'}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Link
                    to={`/product/${product.slug}`}
                    onClick={onClose}
                    className="btn btn-ghost h-9 !py-2 text-[10px]"
                  >
                    التفاصيل
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const added = toggleWishlist(toShopItem(product))
                      toast(added ? 'أضفنا القطعة للمفضلة' : 'أزلنا القطعة من المفضلة')
                    }}
                    className={cx(
                      'flex h-9 items-center justify-center gap-1 rounded-full border text-[10px] transition',
                      isWishlisted(product.slug)
                        ? 'border-flare/45 bg-flare/10 text-flare'
                        : 'border-line text-muted hover:text-bone',
                    )}
                  >
                    <Icon name="heart" size={12} filled={isWishlisted(product.slug)} />
                    المفضلة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const result = toggleCompare(toShopItem(product))
                      if (result.full) toast('المقارنة تستحمل 3 قطع فقط', 'error')
                      else toast(result.added ? 'أضفنا القطعة للمقارنة' : 'أزلنا القطعة من المقارنة')
                    }}
                    className={cx(
                      'flex h-9 items-center justify-center gap-1 rounded-full border text-[10px] transition',
                      isCompared(product.slug)
                        ? 'border-volt/50 bg-volt/10 text-volt'
                        : 'border-line text-muted hover:text-bone',
                    )}
                  >
                    <Icon name="compare" size={12} />
                    قارن
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    openAssistant(`عايز حاجة زي ${product.name} في حدود ${product.price} ج.م`)
                  }}
                  className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-full border border-volt/30 bg-volt/[0.06] text-[10px] text-volt transition hover:bg-volt/15"
                >
                  <Icon name="sparkle" size={12} />
                  اسأل المساعد عن بدائل
                </button>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
