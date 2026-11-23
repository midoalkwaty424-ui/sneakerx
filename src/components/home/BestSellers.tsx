import { Link } from 'react-router-dom'
import type { Product } from '../../lib/types'
import { formatEGP } from '../../lib/format'
import { colorPrimaryImage, thumbImage } from '../../lib/product-visuals'
import { ProductVisual } from '../commerce/ProductVisual'
import { Icon } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'

export function BestSellers({ products }: { products: Product[] }) {
  return (
    <section className="section-pad border-t border-line/60">
      <div className="container-x">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-volt" />
              <span className="eyebrow">MOST WANTED — RANKED BY YOU</span>
            </div>
            <h2 className="display text-[clamp(2.8rem,6.4vw,6.4rem)]">
              BEST <span className="display-italic lowercase text-volt">sellers</span>
            </h2>
          </div>
          <Link to="/shop?collection=best" className="btn btn-ghost btn-sm">
            القائمة الكاملة
            <Icon name="arrow-left" size={14} />
          </Link>
        </div>

        <div className="border-t border-line">
          {products.length === 0
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse border-b border-line bg-ink2/40" />
              ))
            : products.map((product, index) => (
                <Reveal key={product.id} delay={index * 60}>
                  <Link
                    to={`/product/${product.slug}`}
                    className="group grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 border-b border-line px-3 py-4 transition-colors duration-300 hover:bg-volt hover:text-ink sm:gap-3 md:grid-cols-[3rem_7rem_1fr_9rem_8rem_3rem] md:gap-6 md:px-5 md:py-5"
                    data-cursor-label="عرض"
                  >
                    <span className="hidden font-display text-lg font-bold text-muted transition group-hover:text-ink/50 md:block md:text-2xl">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="relative h-16 w-[4.5rem] overflow-hidden rounded-lg border border-bone/10 bg-ink3 transition-colors group-hover:border-ink/25 sm:h-20 sm:w-[5.5rem] md:h-24 md:w-28">
                      <ProductVisual
                        image={thumbImage(colorPrimaryImage(product, product.colors[0]))}
                        base={product.colors[0]?.hex}
                        accent={product.colors[0]?.accent}
                        alt={product.name}
                        fit="cover"
                        sizes="112px"
                        className="h-full w-full transition-transform duration-500 group-hover:scale-110"
                        artClassName="p-1 transition-transform duration-500 group-hover:scale-110"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-base font-bold tracking-tight md:text-xl">
                        {product.name}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted transition group-hover:text-ink/60">
                        <span>{product.category?.name}</span>
                        <span className="h-2.5 w-px bg-current opacity-30" />
                        <span>{product.colors.length} ألوان</span>
                        <span className="h-2.5 w-px bg-current opacity-30" />
                        <span>{product.sizes.length} مقاس</span>
                      </span>
                    </span>
                    <span className="hidden items-center gap-1 font-mono text-xs text-muted transition group-hover:text-ink/70 md:flex">
                      <Icon name="star" size={11} filled />
                      {product.rating.toFixed(1)}
                      <span className="text-[10px] opacity-60">({product.reviewCount})</span>
                    </span>
                    <span className="font-mono text-sm font-medium">{formatEGP(product.price)}</span>
                    <span className="hidden h-10 w-10 place-items-center justify-self-end rounded-full border border-line transition-all duration-300 group-hover:rotate-45 group-hover:border-ink group-hover:bg-ink group-hover:text-volt md:grid">
                      <Icon name="arrow-up-right" size={16} />
                    </span>
                  </Link>
                </Reveal>
              ))}
        </div>

        <div className="mt-8 flex items-center justify-between text-[10px] text-muted">
          <span className="font-mono uppercase tracking-[0.16em]">Ranked by units sold</span>
          <span className="font-mono">05 / 06</span>
        </div>
      </div>
    </section>
  )
}
