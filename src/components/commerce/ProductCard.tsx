import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../../lib/types'
import { cx, discountPercent, formatEGP } from '../../lib/format'
import { GENDER_LABEL } from '../../lib/constants'
import { colorImages, thumbImage } from '../../lib/product-visuals'
import { toShopItem, useShop } from '../../store/shop'
import { useToast } from '../../store/toast'
import { ProductVisual } from './ProductVisual'
import { Icon } from '../ui/Icon'
import { TiltCard } from '../ui/TiltCard'

type ProductCardProps = {
  product: Product
  index?: number
  priority?: boolean
  onQuickView?: (product: Product) => void
}

export function ProductCard({ product, index = 0, priority = false, onQuickView }: ProductCardProps) {
  const [activeColor, setActiveColor] = useState(0)
  const color = product.colors[activeColor] ?? product.colors[0]
  const discount = discountPercent(product.price, product.comparePrice)
  const soldOut = product.totalStock === 0
  const [primary, secondary] = colorImages(product, color)
  const primaryThumb = thumbImage(primary)
  const secondaryThumb = thumbImage(secondary)
  const hasPhoto = Boolean(primaryThumb)
  const { toggleWishlist, toggleCompare, isWishlisted, isCompared } = useShop()
  const { toast } = useToast()
  const wishlisted = isWishlisted(product.slug)
  const compared = isCompared(product.slug)

  const onWishlist = () => {
    const added = toggleWishlist(toShopItem(product))
    toast(added ? `أضفنا ${product.name} للمفضلة` : `أزلنا ${product.name} من المفضلة`)
  }

  const onCompare = () => {
    const result = toggleCompare(toShopItem(product))
    if (result.full) toast('المقارنة تستحمل 3 قطع فقط', 'error')
    else toast(result.added ? 'أضفنا القطعة للمقارنة' : 'أزلنا القطعة من المقارنة')
  }

  return (
    <TiltCard intensity={5} className="h-full">
      <div
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-ink2 transition-colors duration-500 hover:border-bone/25"
        data-index={index}
      >
        <Link
          to={`/product/${product.slug}`}
          className="flex h-full flex-col"
          data-cursor-label="عرض"
        >
        <div className="relative aspect-[4/3.35] overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#161a21_0%,#0b0d11_70%)]">
          {hasPhoto ? (
            <div className="absolute inset-0 z-[4] overflow-hidden">
              <ProductVisual
                image={primaryThumb}
                base={color?.hex}
                accent={color?.accent}
                alt={`${product.name} — ${color?.name ?? ''}`}
                fit="cover"
                priority={priority}
                sizes="(min-width: 1280px) 24vw, (min-width: 768px) 33vw, 92vw"
                className="transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.07]"
              />
              {secondaryThumb && (
                <img
                  src={secondaryThumb}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.07] group-hover:opacity-100"
                />
              )}
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/5 to-ink/30"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-bone/10"
                aria-hidden="true"
              />
            </div>
          ) : (
            <>
              <div
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(241,238,229,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(241,238,229,.05) 1px, transparent 1px)',
                  backgroundSize: '48px 48px',
                }}
              />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-volt/0 blur-3xl transition-all duration-700 group-hover:bg-volt/10" />
              <ProductVisual
                image={null}
                base={color?.hex}
                accent={color?.accent}
                alt={`${product.name} — ${color?.name ?? ''}`}
                artClassName="relative z-[4] p-5 pb-8 transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-rotate-2 group-hover:scale-[1.07] md:p-7 md:pb-10"
                priority={priority}
              />
            </>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
            <div className="flex flex-wrap gap-1.5">
              {product.isNew && (
                <span className="rounded-full bg-volt px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-ink shadow-[0_4px_18px_rgba(217,255,67,.25)]">
                  New
                </span>
              )}
              {product.bestSeller && !product.isNew && (
                <span className="rounded-full border border-bone/20 bg-ink/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-bone/85 backdrop-blur">
                  Best Seller
                </span>
              )}
              {discount > 0 && (
                <span className="rounded-full border border-flare/40 bg-flare/15 px-2.5 py-1 font-mono text-[9px] font-bold text-flare backdrop-blur">
                  -{discount}%
                </span>
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between p-4 pt-0">
            <span className="rounded-full border border-bone/10 bg-ink/60 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-bone/70 backdrop-blur">
              {product.category?.name ?? 'SNEAKERX'}
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-bone/70">
              <Icon name="star" size={10} filled />
              {product.rating.toFixed(1)}
            </span>
          </div>

          {soldOut && (
            <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-ink/65 backdrop-blur-[2px]">
              <span className="rounded-full border border-bone/20 bg-ink/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/80">
                Sold Out
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col px-4 pb-4 pt-4 md:px-5 md:pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow mb-1.5 !text-[9px]">
                {GENDER_LABEL[product.gender]} — DROP 001
              </p>
              <h3 className="truncate font-display text-[1.02rem] font-bold tracking-tight md:text-[1.12rem]">
                {product.name}
              </h3>
              <p className="mt-0.5 truncate text-[11px] text-muted">{product.subtitle}</p>
            </div>
            <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-muted transition-all duration-300 group-hover:border-volt group-hover:bg-volt group-hover:text-ink">
              <Icon name="arrow-up-right" size={14} />
            </span>
          </div>

          <div className="mt-auto flex items-end justify-between pt-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[13px] font-medium">{formatEGP(product.price)}</span>
                {product.comparePrice && (
                  <span className="font-mono text-[10px] text-muted line-through">
                    {formatEGP(product.comparePrice)}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {product.colors.map((option, optionIndex) => (
                  <span
                    key={option.name}
                    onMouseEnter={() => setActiveColor(optionIndex)}
                    className={cx(
                      'h-3 w-3 rounded-full border transition-all duration-200',
                      activeColor === optionIndex
                        ? 'scale-125 border-volt'
                        : 'border-bone/25 hover:scale-110',
                    )}
                    style={{ backgroundColor: option.hex }}
                    title={option.name}
                    aria-hidden="true"
                  />
                ))}
                <span className="ms-1 text-[10px] text-muted">{color?.name}</span>
              </div>
            </div>
            <span className="font-mono text-[9px] text-muted">
              {product.sizes.length} SIZES
            </span>
          </div>
        </div>
        </Link>

        <div className="absolute right-3 top-3 z-30 flex flex-col gap-1.5 opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          {onQuickView && (
            <button
              type="button"
              onClick={() => onQuickView(product)}
              className="grid h-8 w-8 place-items-center rounded-full border border-ice/40 bg-ink/70 text-ice/80 backdrop-blur transition hover:border-ice hover:text-ice"
              aria-label={`معاينة سريعة ${product.name}`}
              data-quick-view-open
            >
              <Icon name="eye" size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={onWishlist}
            className={cx(
              'grid h-8 w-8 place-items-center rounded-full border backdrop-blur transition',
              wishlisted
                ? 'border-flare/50 bg-flare/15 text-flare'
                : 'border-bone/20 bg-ink/70 text-bone/70 hover:border-flare/50 hover:text-flare',
            )}
            aria-label={wishlisted ? `إزالة ${product.name} من المفضلة` : `إضافة ${product.name} للمفضلة`}
            aria-pressed={wishlisted}
            data-card-wishlist
          >
            <Icon name="heart" size={13} filled={wishlisted} />
          </button>
          <button
            type="button"
            onClick={onCompare}
            className={cx(
              'grid h-8 w-8 place-items-center rounded-full border backdrop-blur transition',
              compared
                ? 'border-volt/60 bg-volt/15 text-volt'
                : 'border-bone/20 bg-ink/70 text-bone/70 hover:border-volt/50 hover:text-volt',
            )}
            aria-label={compared ? `إزالة ${product.name} من المقارنة` : `إضافة ${product.name} للمقارنة`}
            aria-pressed={compared}
            data-card-compare
          >
            <Icon name="compare" size={13} />
          </button>
        </div>
      </div>
    </TiltCard>
  )
}
