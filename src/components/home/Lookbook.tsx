import { Link } from 'react-router-dom'
import type { Product } from '../../lib/types'
import { formatEGP } from '../../lib/format'
import { colorPrimaryImage } from '../../lib/product-visuals'
import { ProductVisual } from '../commerce/ProductVisual'
import { Icon } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'

export function Lookbook({ products }: { products: Product[] }) {
  const picks = products.filter((product) => product.images.length > 0).slice(0, 5)
  if (picks.length === 0) return null

  const [hero, ...rest] = picks

  return (
    <section id="lookbook" className="section-pad relative overflow-hidden border-t border-line/60">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_8%,rgba(217,255,67,.05),transparent_42%)]" />
      <div className="container-x relative">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-volt" />
              <span className="eyebrow">LOOKBOOK — VOL. 01 / CAIRO</span>
            </div>
            <h2 className="display text-[clamp(2.8rem,6.4vw,6.4rem)]">
              STREET <span className="display-italic lowercase text-volt">editorial</span>
            </h2>
            <p className="mt-4 max-w-md text-[12px] leading-7 text-muted">
              خمس قطع، خمس لحظات. صور من الدروب الأول في شوارع القاهرة — كل لقطة بتوديك
              للمنتج مباشرة.
            </p>
          </div>
          <Link to="/shop" className="btn btn-ghost btn-sm">
            تسوق اللوك
            <Icon name="arrow-left" size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:grid-rows-2 md:gap-3">
          <LookbookTile
            product={hero}
            index={0}
            className="col-span-2 row-span-2 min-h-[320px] md:min-h-0"
            large
          />
          {rest.map((product, index) => (
            <LookbookTile
              key={product.id}
              product={product}
              index={index + 1}
              className="min-h-[150px] md:min-h-0"
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[9px] text-muted">
          <span className="font-mono uppercase tracking-[0.18em]">
            PHOTOGRAPHY / SNEAKERX STUDIO — DUBAI & CAIRO
          </span>
          <span className="font-mono uppercase tracking-[0.18em]">05 LOOKS / DROP 001</span>
        </div>
      </div>
    </section>
  )
}

function LookbookTile({
  product,
  index,
  className,
  large = false,
}: {
  product: Product
  index: number
  className?: string
  large?: boolean
}) {
  return (
    <Reveal className={className} delay={index * 70}>
      <Link
        to={`/product/${product.slug}`}
        className="group relative block h-full w-full overflow-hidden rounded-2xl border border-line bg-ink2"
        data-cursor-label="عرض اللوك"
      >
        <ProductVisual
          image={colorPrimaryImage(product, product.colors[0])}
          base={product.colors[0]?.hex}
          accent={product.colors[0]?.accent}
          alt={`${product.name} — lookbook`}
          fit="cover"
          sizes={large ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 50vw'}
          className="h-full w-full transition-transform duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.06]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-ink/20" />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-bone/10" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className="rounded-full border border-bone/20 bg-ink/55 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-bone/75 backdrop-blur">
            LOOK {String(index + 1).padStart(2, '0')}
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-bone/20 bg-ink/55 text-bone/70 backdrop-blur transition-all duration-300 group-hover:border-volt group-hover:bg-volt group-hover:text-ink">
            <Icon name="arrow-up-right" size={13} />
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-volt">
              {product.category?.name ?? 'SNEAKERX'}
            </p>
            <h3
              className={
                large
                  ? 'mt-1.5 font-display text-[clamp(1.8rem,3.4vw,3.2rem)] font-bold leading-none tracking-tight'
                  : 'mt-1 truncate font-display text-[0.95rem] font-bold tracking-tight'
              }
            >
              {product.name}
            </h3>
            {large && (
              <p className="mt-2 max-w-xs text-[11px] leading-5 text-bone/60">{product.subtitle}</p>
            )}
          </div>
          <span className="font-mono text-[10px] text-bone/80">{formatEGP(product.price)}</span>
        </div>
      </Link>
    </Reveal>
  )
}
