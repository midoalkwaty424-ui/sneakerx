import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiRequestError, errorMessage } from '../lib/api'
import { track, itemPayload } from '../lib/analytics'
import type { Product } from '../lib/types'
import { GENDER_LABEL, MAX_QTY_PER_ITEM } from '../lib/constants'
import { cx, discountPercent, formatEGP } from '../lib/format'
import { colorPrimaryImage } from '../lib/product-visuals'
import { usePageMeta } from '../hooks/usePageMeta'
import { useCart } from '../store/cart'
import { useShop, toShopItem } from '../store/shop'
import { useToast } from '../store/toast'
import { useAssistant } from '../store/assistant'
import { PageError, PageLoader } from '../components/ui/PageLoader'
import { ProductGallery } from '../components/commerce/ProductGallery'
import { ProductCard } from '../components/commerce/ProductCard'
import { StockAlertForm } from '../components/commerce/StockAlertForm'
import { QuantityStepper } from '../components/commerce/QuantityStepper'
import { RecentlyViewed } from '../components/home/RecentlyViewed'
import { SizeGuide } from '../components/product/SizeGuide'
import { TryOn } from '../components/product/TryOn'
import { Icon } from '../components/ui/Icon'
import { Reveal } from '../components/ui/Reveal'
import { askAboutProductLink, sizeHelpLink } from '../lib/whatsapp'
import { tryOnVisual } from '../lib/tryOn'
import { productJsonLd } from '../lib/seo'

const SECTIONS = [
  { id: 'details', label: 'التفاصيل والخامات' },
  { id: 'fit', label: 'المقاس والراحة' },
  { id: 'shipping', label: 'الشحن والاسترجاع' },
] as const

function colorSizes(product: Product, color: string) {
  return product.sizes.map((item) => ({
    size: item.size,
    stock: product.variants
      .filter((variant) => variant.size === item.size && variant.color === color)
      .reduce((sum, variant) => sum + variant.stock, 0),
  }))
}

function firstAvailable(product: Product, color: string) {
  return colorSizes(product, color).find((item) => item.stock > 0)?.size ?? product.sizes[0]?.size ?? ''
}

export default function ProductPage() {
  const { slug = '' } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [colorIndex, setColorIndex] = useState(0)
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)
  const [openSection, setOpenSection] = useState<string>('details')
  const [tryOnOpen, setTryOnOpen] = useState(false)
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const { addItem, openCart } = useCart()
  const { toast } = useToast()
  const { toggleWishlist, toggleCompare, isWishlisted, isCompared, addRecent } = useShop()
  const { openAssistant } = useAssistant()

  usePageMeta(
    product ? `${product.name} — SNEAKERX` : 'SNEAKERX — المنتج',
    product ? `${product.subtitle} — ${product.description.slice(0, 150)}` : undefined,
    product
      ? {
          canonical: `/product/${product.slug}`,
          image: product.images[0],
          jsonLd: productJsonLd(product),
        }
      : undefined,
  )

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    setNotFound(false)
    const controller = new AbortController()
    api
      .product(slug, controller.signal)
      .then((result) => {
        setProduct(result.product)
        setRelated(result.related)
        setColorIndex(0)
        setQty(1)
        const color = result.product.colors[0]
        setSize(color ? firstAvailable(result.product, color.name) : '')
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (err instanceof ApiRequestError && err.status === 404) setNotFound(true)
        else setError(errorMessage(err))
        setLoading(false)
      })
    return controller
  }, [slug])

  useEffect(() => {
    const controller = load()
    return () => controller.abort()
  }, [load])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [slug])

  const color = product?.colors[colorIndex] ?? product?.colors[0]
  const tryOn = useMemo(() => (product ? tryOnVisual(product) : null), [product])
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
  const soldOut = product ? product.totalStock === 0 : false
  const wishlisted = product ? isWishlisted(product.slug) : false
  const compared = product ? isCompared(product.slug) : false

  useEffect(() => {
    if (!product) return
    addRecent(toShopItem(product))
  }, [product, addRecent])

  useEffect(() => {
    if (!product) return
    track('view_item', {
      currency: 'EGP',
      value: product.price,
      items: [itemPayload(product)],
    })
  }, [product])

  const changeColor = (index: number) => {
    if (!product) return
    const nextColor = product.colors[index]
    if (!nextColor) return
    setColorIndex(index)
    const available = colorSizes(product, nextColor.name).filter((item) => item.stock > 0)
    if (!available.some((item) => item.size === size)) {
      setSize(available[0]?.size ?? product.sizes[0]?.size ?? '')
      setQty(1)
    }
  }

  const changeSize = (nextSize: string) => {
    setSize(nextSize)
    setQty(1)
  }

  const addToCart = () => {
    if (!product || !color || !size || selectedStock === 0) return
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
      qty: Math.min(qty, selectedStock),
    })
    toast(`تمت إضافة ${product.name} — مقاس ${size} إلى السلة`)
    track('add_to_cart', {
      currency: 'EGP',
      value: product.price * Math.min(qty, selectedStock),
      items: [{ ...itemPayload(product), item_variant: color.name, quantity: Math.min(qty, selectedStock) }],
    })
    openCart()
  }

  const toggleWishlistItem = () => {
    if (!product) return
    const added = toggleWishlist(toShopItem(product))
    if (added) track('add_to_wishlist', { currency: 'EGP', value: product.price, items: [itemPayload(product)] })
    toast(
      added ? `أضفنا ${product.name} إلى المفضلة` : `أزلنا ${product.name} من المفضلة`,
    )
  }

  const toggleCompareItem = () => {
    if (!product) return
    const result = toggleCompare(toShopItem(product))
    if (result.full) {
      toast('المقارنة تستحمل 3 قطع فقط — أزل قطعة أولًا', 'error')
      return
    }
    toast(result.added ? 'أضفنا القطعة إلى المقارنة' : 'أزلنا القطعة من المقارنة')
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.name, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast('تم نسخ رابط القطعة')
      }
    } catch {
      toast('تعذر مشاركة الرابط', 'error')
    }
  }

  if (loading) {
    return (
      <div className="pt-[6rem]">
        <PageLoader label="LOADING THE PIECE" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="pt-[6rem]">
        <PageError
          title="القطعة غير موجودة"
          message="ربما تم حذفها أو تغيّر رابطها. تصفح الدروب الحالي للعثور على بديل."
        />
        <div className="flex justify-center pb-20">
          <Link to="/shop" className="btn btn-volt">
            تصفح المتجر
            <Icon name="arrow-left" size={15} />
          </Link>
        </div>
      </div>
    )
  }

  if (error || !product || !color) {
    return (
      <div className="pt-[6rem]">
        <PageError message={error || 'تعذر تحميل المنتج'} onRetry={() => load()} />
      </div>
    )
  }

  return (
    <div className="page-enter pt-[6.4rem] md:pt-[7.4rem]">
      <div className="container-x">
        <nav className="flex flex-wrap items-center gap-2 py-5 text-[10px] text-muted" aria-label="مسار التنقل">
          <Link to="/" className="transition hover:text-bone">
            الرئيسية
          </Link>
          <span className="text-line">/</span>
          <Link to="/shop" className="transition hover:text-bone">
            المتجر
          </Link>
          <span className="text-line">/</span>
          <Link
            to={`/shop?gender=${product.gender}`}
            className="transition hover:text-bone"
          >
            {GENDER_LABEL[product.gender]}
          </Link>
          <span className="text-line">/</span>
          <span className="text-bone/80">{product.name}</span>
        </nav>

        <div className="grid gap-10 pb-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductGallery product={product} color={color} onShare={share} />

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: 'truck' as const, label: 'شحن 2–5 أيام' },
                { icon: 'shield' as const, label: 'دفع عند الاستلام' },
                { icon: 'refresh' as const, label: 'استرجاع 14 يوم' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-center gap-2 rounded-lg border border-line/70 bg-ink2/60 px-2 py-2.5 text-[9px] text-muted"
                >
                  <Icon name={item.icon} size={12} className="text-volt/80" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-volt" />
              <span className="eyebrow">
                {product.category?.name ?? 'SNEAKERX'} / {GENDER_LABEL[product.gender]} — DROP 001
              </span>
            </div>

            <h1 className="display text-[clamp(2.6rem,5vw,4.8rem)]">{product.name}</h1>
            <p className="mt-3 max-w-lg text-sm leading-7 text-muted">{product.subtitle}</p>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-volt">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Icon
                      key={index}
                      name="star"
                      size={12}
                      filled={index < Math.round(product.rating)}
                      className={index < Math.round(product.rating) ? 'text-volt' : 'text-line'}
                    />
                  ))}
                </span>
                <span className="font-mono text-bone">{product.rating.toFixed(1)}</span>
                <span>({product.reviewCount} تقييم)</span>
              </span>
              <span className="h-3 w-px bg-line" />
              <span className={cx('flex items-center gap-1.5', soldOut ? 'text-flare' : 'text-volt')}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {soldOut ? 'نفدت الكمية' : selectedStock > 0 ? 'متوفر الآن' : 'هذا المقاس غير متوفر'}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-3 border-b border-line pb-6">
              <span className="font-display text-3xl font-bold tracking-tight">
                {formatEGP(product.price)}
              </span>
              {product.comparePrice && (
                <span className="font-mono text-sm text-muted line-through">
                  {formatEGP(product.comparePrice)}
                </span>
              )}
              {discount > 0 && (
                <span className="rounded-full bg-flare/15 px-2.5 py-1 font-mono text-[10px] text-flare">
                  وفّر {formatEGP((product.comparePrice ?? 0) - product.price)}
                </span>
              )}
              <span className="ms-auto text-[10px] text-muted">السعر شامل الضريبة</span>
            </div>

            <p className="mt-6 text-[13px] leading-7 text-bone/60">{product.description}</p>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-medium text-bone/85">
                  اللون: <span className="text-muted">{color.name}</span>
                </h2>
                <span className="font-mono text-[9px] text-muted">
                  {String(colorIndex + 1).padStart(2, '0')} / {String(product.colors.length).padStart(2, '0')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {product.colors.map((option, index) => (
                  <button
                    key={option.name}
                    type="button"
                    onClick={() => changeColor(index)}
                    className={cx(
                      'relative grid h-8 w-8 place-items-center rounded-full border-2 transition',
                      colorIndex === index ? 'border-volt' : 'border-transparent hover:border-bone/30',
                    )}
                    aria-label={`لون ${option.name}`}
                    aria-pressed={colorIndex === index}
                    title={option.name}
                  >
                    <span
                      className="h-6 w-6 rounded-full border border-bone/20"
                      style={{ backgroundColor: option.hex }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-medium text-bone/85">
                  المقاس {size && <span className="font-mono text-muted">/ {size}</span>}
                </h2>
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                  className="link-line text-[10px] text-muted transition hover:text-bone"
                  data-size-guide-open
                >
                  دليل المقاسات
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {sizes.map((item) => {
                  const unavailable = item.stock === 0
                  return (
                    <button
                      key={item.size}
                      type="button"
                      onClick={() => changeSize(item.size)}
                      className={cx(
                        'relative rounded-lg border py-2.5 font-mono text-xs transition',
                        size === item.size
                          ? 'border-volt bg-volt text-ink'
                          : unavailable
                            ? 'border-line/60 text-muted/50 line-through hover:border-ice/40'
                            : 'border-line text-bone/75 hover:border-bone/40 hover:text-bone',
                      )}
                      aria-pressed={size === item.size}
                      title={unavailable ? 'نفد — اضغط لتسجيل تنبيه' : `متوفر (${item.stock})`}
                    >
                      {item.size}
                    </button>
                  )
                })}
              </div>
              {size && selectedStock > 0 && selectedStock <= 5 && (
                <p className="mt-2 text-[10px] text-flare">
                  آخر {selectedStock} قطع متاحة من هذا المقاس — لا تنتظر كثيرًا.
                </p>
              )}
              {product && color && size && selectedStock === 0 && selectedVariant && (
                <div className="mt-3">
                  <StockAlertForm
                    productId={product.id}
                    variantId={selectedVariant.id}
                    productName={product.name}
                    size={size}
                  />
                </div>
              )}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <QuantityStepper value={Math.min(qty, maxQty)} onChange={setQty} max={maxQty} />
              <button
                type="button"
                onClick={addToCart}
                disabled={soldOut || !size || selectedStock === 0}
                className="btn btn-volt h-11 flex-1"
              >
                {soldOut || selectedStock === 0 ? (
                  soldOut ? 'نفدت الكمية' : 'اختر مقاسًا متوفرًا'
                ) : (
                  <>
                    أضف إلى السلة
                    <span className="font-mono text-[10px] opacity-60">
                      {formatEGP(product.price * Math.min(qty, maxQty))}
                    </span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTryOnOpen(true)
                  track('tryon_open', { item_id: product.slug })
                }}
                className="flex h-10 items-center justify-center gap-2 rounded-full border border-ice/35 bg-ice/[0.07] text-[11px] text-ice transition hover:bg-ice/15"
                data-tryon-open
              >
                <Icon name="eye" size={14} />
                جرّب على الكاميرا
              </button>
              <button
                type="button"
                onClick={() => openAssistant(`عايز حاجة زي ${product.name} في حدود ${product.price} ج.م`)}
                className="flex h-10 items-center justify-center gap-2 rounded-full border border-volt/35 bg-volt/[0.07] text-[11px] text-volt transition hover:bg-volt/15"
                data-assistant-product
              >
                <Icon name="sparkle" size={14} />
                اسأل المساعد
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={toggleWishlistItem}
                aria-pressed={wishlisted}
                className={cx(
                  'flex h-10 items-center justify-center gap-2 rounded-full border text-[11px] transition',
                  wishlisted
                    ? 'border-flare/45 bg-flare/10 text-flare'
                    : 'border-line text-muted hover:border-bone/35 hover:text-bone',
                )}
              >
                <Icon name="heart" size={14} filled={wishlisted} />
                {wishlisted ? 'في المفضلة' : 'أضف للمفضلة'}
              </button>
              <button
                type="button"
                onClick={toggleCompareItem}
                aria-pressed={compared}
                className={cx(
                  'flex h-10 items-center justify-center gap-2 rounded-full border text-[11px] transition',
                  compared
                    ? 'border-volt/50 bg-volt/10 text-volt'
                    : 'border-line text-muted hover:border-bone/35 hover:text-bone',
                )}
              >
                <Icon name="compare" size={14} />
                {compared ? 'في المقارنة' : 'أضف للمقارنة'}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-muted">
              <span className="flex items-center gap-2">
                <Icon name="bag" size={12} />
                اطلب الآن وادفع عند الاستلام — شحن مجاني فوق 2,500 ج.م.
              </span>
              <a
                href={askAboutProductLink(product)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[#25d366] transition hover:underline"
              >
                <Icon name="whatsapp" size={12} />
                اسأل عن القطعة
              </a>
              <a
                href={sizeHelpLink()}
                target="_blank"
                rel="noreferrer"
                className="text-muted underline decoration-line underline-offset-4 transition hover:text-bone"
              >
                مساعدة في المقاس
              </a>
            </div>

            <div className="mt-8 border-t border-line">
              {SECTIONS.map((section) => {
                const open = openSection === section.id
                return (
                  <div key={section.id} className="border-b border-line">
                    <button
                      type="button"
                      onClick={() => setOpenSection(open ? '' : section.id)}
                      className="flex w-full items-center justify-between py-4 text-start text-sm font-medium"
                      aria-expanded={open}
                    >
                      {section.label}
                      <Icon
                        name="plus"
                        size={15}
                        className={cx('text-muted transition-transform duration-300', open && 'rotate-45')}
                      />
                    </button>
                    <div
                      className={cx(
                        'grid transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)]',
                        open ? 'grid-rows-[1fr] pb-4 opacity-100' : 'grid-rows-[0fr] opacity-0',
                      )}
                    >
                      <div className="overflow-hidden">
                        {section.id === 'details' && (
                          <ul className="space-y-2 text-[12px] leading-6 text-muted">
                            <li>• تشطيب premium بخامات مهوّاة ومقاومة للماء الخفيف.</li>
                            <li>• نعل أوسط Nitro Foam لارتداد أعلى ووزن أخف.</li>
                            <li>• قاعدة مطاطية بنقشة قبضة محسّنة للأسفلت المصري.</li>
                            <li>• بطانة داخلية مزدوجة لمنع الاحتكاك في المشاوير الطويلة.</li>
                          </ul>
                        )}
                        {section.id === 'fit' && (
                          <div className="space-y-2 text-[12px] leading-6 text-muted">
                            <p>
                              المقاس مظبوط (true to size). لو بين مقاسين أو تحب مساحة إضافية، اختر
                              المقاس الأكبر.
                            </p>
                            <p>القطعة تُقاس بمقاس المرأة والرجل القياسي المصري.</p>
                          </div>
                        )}
                        {section.id === 'shipping' && (
                          <div className="space-y-2 text-[12px] leading-6 text-muted">
                            <p>الشحن لكل محافظات مصر خلال 2–5 أيام عمل، والدفع عند الاستلام.</p>
                            <p>
                              استبدال أو استرجاع خلال 14 يومًا بشرط عدم الاستخدام خارج المنزل
                              والحفاظ على العلبة.
                            </p>
                            <Link to="/policies#shipping" className="inline-block text-volt underline underline-offset-4">
                              اقرأ سياسة الشحن الكاملة
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-[9px] text-muted">
              <span className="rounded-full border border-line px-2.5 py-1">SKU / {product.slug.toUpperCase()}</span>
              <span className="rounded-full border border-line px-2.5 py-1">
                {product.variants.length} VARIANT
              </span>
              <span className="rounded-full border border-line px-2.5 py-1">LIMITED RUN</span>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="border-t border-line py-14">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-volt" />
                  <span className="eyebrow">COMPLETE THE LOOK</span>
                </div>
                <h2 className="display text-[clamp(2rem,4.4vw,4rem)]">
                  YOU MIGHT <span className="display-italic lowercase text-volt">also like</span>
                </h2>
              </div>
              <Link to="/shop" className="btn btn-ghost btn-sm">
                كل القطع
                <Icon name="arrow-left" size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item, index) => (
                <Reveal key={item.id} delay={index * 60}>
                  <ProductCard product={item} index={index} />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        <RecentlyViewed excludeSlug={product.slug} />
      </div>

      <SizeGuide
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        sizes={product.sizes.map((item) => item.size)}
      />

      <TryOn
        open={tryOnOpen}
        onClose={() => setTryOnOpen(false)}
        productName={product?.name ?? ''}
        image={tryOn?.src ?? ''}
        blend={tryOn?.blend ?? 'normal'}
        colorName={color?.name}
        colorHex={color?.hex}
      />
    </div>
  )
}
