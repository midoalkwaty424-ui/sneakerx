import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { useShop, type ShopItem } from '../store/shop'
import { useToast } from '../store/toast'
import { cx, discountPercent, formatEGP } from '../lib/format'
import { ProductVisual } from '../components/commerce/ProductVisual'
import { Icon } from '../components/ui/Icon'
import { Reveal } from '../components/ui/Reveal'

export default function Wishlist() {
  usePageMeta('المفضلة — SNEAKERX', 'القطع التي حفظتها في SNEAKERX.')
  const { wishlist, toggleWishlist, toggleCompare, isCompared } = useShop()
  const { toast } = useToast()

  return (
    <div className="page-enter pt-[6.4rem] md:pt-[7.4rem]">
      <div className="container-x pb-20">
        <header className="border-b border-line pb-8 pt-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-flare" />
            <span className="eyebrow">SAVED FOR LATER — {String(wishlist.length).padStart(2, '0')} PIECES</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <h1 className="display text-[clamp(2.8rem,7vw,6.4rem)]">
              YOUR <span className="display-italic lowercase text-flare">wishlist</span>
            </h1>
            <p className="max-w-sm text-[12px] leading-6 text-muted">
              محفوظة على جهازك، من غير حساب. ارجع لها في أي وقت وقارن بينها قبل ما تقرر.
            </p>
          </div>
        </header>

        {wishlist.length === 0 ? (
          <EmptyWishlist />
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
            {wishlist.map((item, index) => (
              <Reveal key={item.slug} delay={index * 40}>
                <WishlistCard
                  item={item}
                  compared={isCompared(item.slug)}
                  onRemove={() => {
                    toggleWishlist(item)
                    toast(`أزلنا ${item.name} من المفضلة`)
                  }}
                  onCompare={() => {
                    const result = toggleCompare(item)
                    if (result.full) toast('المقارنة تستحمل 3 قطع فقط', 'error')
                    else toast(result.added ? 'أضفنا القطعة إلى المقارنة' : 'أزلنا القطعة من المقارنة')
                  }}
                />
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-ink2/60 p-5">
          <div className="flex items-center gap-3 text-[12px] text-muted">
            <Icon name="shield" size={16} className="text-volt" />
            المفضلة محفوظة محليًا على المتصفح — بدون تسجيل.
          </div>
          <Link to="/shop" className="btn btn-ghost btn-sm">
            كمّل تسوقك
            <Icon name="arrow-left" size={13} />
          </Link>
        </div>
      </div>
    </div>
  )
}

function WishlistCard({
  item,
  compared,
  onRemove,
  onCompare,
}: {
  item: ShopItem
  compared: boolean
  onRemove: () => void
  onCompare: () => void
}) {
  const discount = discountPercent(item.price, item.comparePrice ?? null)

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-ink2 transition-colors duration-500 hover:border-bone/25">
      <Link to={`/product/${item.slug}`} className="block" data-cursor-label="عرض">
        <div className="relative aspect-[4/3.35] overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#161a21_0%,#0b0d11_70%)]">
          <ProductVisual
            image={item.image}
            alt={item.name}
            fit="cover"
            sizes="(min-width: 1280px) 24vw, (min-width: 768px) 33vw, 50vw"
            className="transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.07]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/5 to-ink/25" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            {discount > 0 ? (
              <span className="rounded-full border border-flare/40 bg-flare/15 px-2 py-1 font-mono text-[9px] font-bold text-flare backdrop-blur">
                -{discount}%
              </span>
            ) : (
              <span />
            )}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3.5">
        <Link to={`/product/${item.slug}`} className="min-w-0">
          <h3 className="truncate font-display text-[0.98rem] font-bold tracking-tight">{item.name}</h3>
          <p className="mt-0.5 truncate text-[10px] text-muted">{item.subtitle ?? 'SNEAKERX'}</p>
        </Link>
        <div className="mt-auto flex items-end justify-between pt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[12px] font-medium">{formatEGP(item.price)}</span>
            {item.comparePrice && (
              <span className="font-mono text-[9px] text-muted line-through">
                {formatEGP(item.comparePrice)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onRemove}
          className="grid h-8 w-8 place-items-center rounded-full border border-flare/40 bg-ink/70 text-flare backdrop-blur transition hover:bg-flare hover:text-ink"
          aria-label={`إزالة ${item.name} من المفضلة`}
        >
          <Icon name="heart" size={13} filled />
        </button>
        <button
          type="button"
          onClick={onCompare}
          className={cx(
            'grid h-8 w-8 place-items-center rounded-full border bg-ink/70 backdrop-blur transition',
            compared
              ? 'border-volt/60 text-volt'
              : 'border-bone/20 text-bone/70 hover:border-bone/45 hover:text-bone',
          )}
          aria-label={`مقارنة ${item.name}`}
          aria-pressed={compared}
        >
          <Icon name="compare" size={13} />
        </button>
      </div>
    </div>
  )
}

function EmptyWishlist() {
  return (
    <div className="mt-8 grid place-items-center rounded-3xl border border-dashed border-line bg-ink2/40 px-6 py-20 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full border border-line bg-ink text-flare">
        <Icon name="heart" size={26} />
      </span>
      <h2 className="mt-5 display text-[clamp(1.8rem,4vw,2.8rem)]">لسه مفيش قطع محفوظة</h2>
      <p className="mt-2 max-w-sm text-[12px] leading-6 text-muted">
        دوس على القلب في أي قطعة وهتلاقيها هنا. المفضلة بتفضل محفوظة على جهازك.
      </p>
      <Link to="/shop" className="btn btn-volt btn-sm mt-6">
        ابدأ من الدروب
        <Icon name="arrow-left" size={13} />
      </Link>
    </div>
  )
}
