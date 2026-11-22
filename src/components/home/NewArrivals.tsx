import { Link } from 'react-router-dom'
import type { Product } from '../../lib/types'
import { ProductCard } from '../commerce/ProductCard'
import { Icon } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'

export function NewArrivals({ products }: { products: Product[] }) {
  return (
    <section className="section-pad relative border-t border-line/60">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(241,238,229,.018),transparent_40%)]" />
      <div className="container-x relative">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-volt" />
              <span className="eyebrow">FRESH OFF THE LINE — WEEK 06</span>
            </div>
            <h2 className="display text-[clamp(2.8rem,6.4vw,6.4rem)]">
              NEW <span className="display-italic lowercase text-volt">arrivals</span>
            </h2>
          </div>
          <div className="flex items-center gap-6 pb-2">
            <p className="hidden max-w-xs text-sm leading-7 text-muted md:block">
              كل أسبوع، قطعة جديدة تدخل المخزن وتخرج من المخزن. لا تنتظر كثيرًا.
            </p>
            <Link to="/shop?collection=new" className="btn btn-ghost btn-sm shrink-0">
              عرض الكل
              <Icon name="arrow-left" size={14} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.length === 0
            ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
            : products.map((product, index) => (
                <Reveal key={product.id} delay={index * 70}>
                  <ProductCard product={product} index={index} priority={index < 2} />
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  )
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink2">
      <div className="aspect-[4/3.35] animate-pulse bg-ink3" />
      <div className="space-y-3 p-5">
        <div className="h-2 w-20 animate-pulse rounded-full bg-ink3" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-ink3" />
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-ink3" />
      </div>
    </div>
  )
}
