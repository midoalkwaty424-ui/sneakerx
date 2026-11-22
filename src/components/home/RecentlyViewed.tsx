import { Link } from 'react-router-dom'
import { formatEGP } from '../../lib/format'
import { useShop } from '../../store/shop'
import { ProductVisual } from '../commerce/ProductVisual'
import { Icon } from '../ui/Icon'

type RecentlyViewedProps = {
  /** Hide the product currently being viewed (used on product pages). */
  excludeSlug?: string
}

export function RecentlyViewed({ excludeSlug }: RecentlyViewedProps = {}) {
  const { recent, clearRecent } = useShop()
  const items = excludeSlug ? recent.filter((item) => item.slug !== excludeSlug) : recent
  if (items.length === 0) return null

  return (
    <section className="border-t border-line/60 py-12 md:py-16">
      <div className="container-x">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-ice" />
              <span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span>
            </div>
            <h2 className="display text-[clamp(1.8rem,4.2vw,3.2rem)]">
              RECENTLY <span className="display-italic lowercase text-ice">viewed</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={clearRecent}
            className="flex items-center gap-2 text-[10px] text-muted transition hover:text-flare"
          >
            <Icon name="trash" size={12} />
            مسح السجل
          </button>
        </div>

        <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
          {items.map((item) => (
            <Link
              key={item.slug}
              to={`/product/${item.slug}`}
              className="group w-[168px] shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-ink2 transition-colors hover:border-bone/25 sm:w-[196px]"
              data-cursor-label="عرض"
            >
              <div className="relative aspect-[4/3.35] overflow-hidden">
                <ProductVisual
                  image={item.image}
                  alt={item.name}
                  fit="cover"
                  sizes="196px"
                  className="h-full w-full transition-transform duration-700 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium">{item.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted">{formatEGP(item.price)}</p>
                </div>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-muted transition group-hover:border-volt group-hover:bg-volt group-hover:text-ink">
                  <Icon name="arrow-left" size={11} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
