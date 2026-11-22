import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColorOption, Product } from '../../lib/types'
import { cx, discountPercent } from '../../lib/format'
import { colorImages, thumbImage } from '../../lib/product-visuals'
import { prefersReducedMotion } from '../../lib/gsap'
import { ProductVisual } from './ProductVisual'
import { ProductLightbox } from './ProductLightbox'
import { Icon } from '../ui/Icon'

export const VIEW_LABELS = ['PROFILE', 'ANGLE / 02', 'DETAIL / 03', 'MACRO / 04']

type ProductGalleryProps = {
  product: Product
  color: ColorOption
  onShare: () => void
}

export function ProductGallery({ product, color, onShare }: ProductGalleryProps) {
  const images = useMemo(() => colorImages(product, color), [product, color])
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [motionOn, setMotionOn] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const touchStart = useRef<number | null>(null)

  const hasPhoto = images.length > 0
  const current = images[index] ?? images[0] ?? null
  const discount = discountPercent(product.price, product.comparePrice)

  useEffect(() => {
    setIndex(0)
    setLightbox(false)
  }, [product.slug, color.name, color.image])

  const go = useCallback(
    (step: number) => {
      if (images.length < 2) return
      setIndex((value) => (value + step + images.length) % images.length)
    },
    [images.length],
  )

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || motionOn) return
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    if (imgRef.current) imgRef.current.style.transformOrigin = `${x}% ${y}%`
  }

  const toggleMotion = () => {
    if (prefersReducedMotion()) return
    setMotionOn((value) => !value)
  }

  return (
    <div data-gallery>
      <div
        ref={stageRef}
        className="group/stage relative overflow-hidden rounded-[1.5rem] border border-line bg-[radial-gradient(circle_at_50%_42%,#1b212a_0%,#090b0f_72%)]"
        onPointerMove={onPointerMove}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setZoomed(true)
        }}
        onPointerLeave={() => {
          setZoomed(false)
          if (imgRef.current) imgRef.current.style.transformOrigin = '50% 50%'
        }}
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(event) => {
          if (touchStart.current === null) return
          const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStart.current
          if (Math.abs(delta) > 44) go(delta > 0 ? -1 : 1)
          touchStart.current = null
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(241,238,229,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(241,238,229,.06) 1px, transparent 1px)',
            backgroundSize: '58px 58px',
            maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 72%)',
          }}
        />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-volt/[0.07] blur-3xl" />

        <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-5">
          <div className="flex flex-wrap gap-1.5">
            {product.isNew && (
              <span className="rounded-full bg-volt px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-ink">
                New Drop
              </span>
            )}
            {product.bestSeller && (
              <span className="rounded-full border border-bone/20 bg-ink/60 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-bone/80 backdrop-blur">
                Best Seller
              </span>
            )}
            {discount > 0 && (
              <span className="rounded-full border border-flare/40 bg-flare/10 px-2.5 py-1 font-mono text-[9px] font-bold text-flare">
                -{discount}%
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-[9px] tracking-[0.16em] text-bone/40">
              VIEW / {String(index + 1).padStart(2, '0')} — {String(images.length || 1).padStart(2, '0')}
            </span>
            {hasPhoto && (
              <button
                type="button"
                onClick={() => setLightbox(true)}
                className="icon-btn h-8 w-8 border-bone/15 bg-ink/50 backdrop-blur transition hover:border-volt/50 hover:text-volt"
                aria-label="عرض الصورة بالحجم الكامل"
                data-gallery-open
              >
                <Icon name="fullscreen" size={13} />
              </button>
            )}
          </div>
        </div>

        {hasPhoto ? (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="relative z-10 block aspect-[4/3.35] w-full cursor-zoom-in overflow-hidden"
            aria-label={`تكبير صورة ${product.name}`}
            data-gallery-image
          >
            <ProductVisual
              imgRef={imgRef}
              image={current}
              base={color.hex}
              accent={color.accent}
              alt={`${product.name} — ${color.name} — ${VIEW_LABELS[index] ?? ''}`}
              priority
              fit="cover"
              sizes="(min-width: 1024px) 52vw, 92vw"
              className={cx(
                'h-full w-full object-cover',
                motionOn
                  ? 'kenburns'
                  : 'transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)]',
                !motionOn && zoomed && 'scale-[1.55]',
              )}
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/5 to-ink/35"
              aria-hidden="true"
            />
            <span className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full border border-bone/15 bg-ink/60 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.2em] text-bone/70 opacity-0 backdrop-blur transition-opacity duration-300 group-hover/stage:opacity-100">
              CLICK TO ZOOM
            </span>
          </button>
        ) : (
          <div className="relative z-10 aspect-[4/3.35] p-8 pt-16 sm:p-12 sm:pt-20">
            <ProductVisual
              image={null}
              base={color.hex}
              accent={color.accent}
              alt={`${product.name} — ${color.name}`}
              priority
              className="h-full w-full"
            />
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-bone/15 bg-ink/60 text-bone/80 opacity-0 backdrop-blur transition hover:border-volt/50 hover:text-volt group-hover/stage:opacity-100 md:grid"
              aria-label="الصورة السابقة"
            >
              <Icon name="chevron-left" size={16} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-bone/15 bg-ink/60 text-bone/80 opacity-0 backdrop-blur transition hover:border-volt/50 hover:text-volt group-hover/stage:opacity-100 md:grid"
              aria-label="الصورة التالية"
            >
              <Icon name="chevron-left" size={16} className="rotate-180" />
            </button>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-end justify-between gap-3 p-4 sm:p-5">
          <div className="flex gap-2">
            {(hasPhoto ? images : [null]).map((image, thumbIndex) => (
              <button
                key={`${image ?? 'fallback'}-${thumbIndex}`}
                type="button"
                onClick={() => setIndex(thumbIndex)}
                className={cx(
                  'relative grid h-12 w-12 place-items-center overflow-hidden rounded-lg border bg-ink/60 p-0.5 backdrop-blur transition sm:h-14 sm:w-14',
                  index === thumbIndex
                    ? 'border-volt'
                    : 'border-bone/15 opacity-65 hover:border-bone/35 hover:opacity-100',
                )}
                aria-label={`عرض ${VIEW_LABELS[thumbIndex] ?? thumbIndex + 1}`}
                aria-pressed={index === thumbIndex}
              >
                <ProductVisual
                  image={thumbImage(image)}
                  base={color.hex}
                  accent={color.accent}
                  alt=""
                  fit={hasPhoto ? 'cover' : 'contain'}
                  className="h-full w-full rounded-md"
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMotion}
              className={cx(
                'flex h-9 items-center gap-1.5 rounded-full border px-3 font-mono text-[9px] uppercase tracking-wider backdrop-blur transition',
                motionOn
                  ? 'border-volt/60 bg-volt/15 text-volt'
                  : 'border-bone/15 bg-ink/60 text-bone/60 hover:border-bone/35 hover:text-bone',
              )}
              aria-pressed={motionOn}
              aria-label="تشغيل حركة الصورة"
              data-motion-toggle
            >
              <Icon name="motion" size={12} />
              <span className="hidden sm:inline">{motionOn ? 'MOTION ON' : 'MOTION'}</span>
            </button>
            <button
              type="button"
              onClick={onShare}
              className="icon-btn h-9 w-9 border-bone/15 bg-ink/60 backdrop-blur"
              aria-label="مشاركة القطعة"
              title="مشاركة"
            >
              <Icon name="external" size={14} />
            </button>
          </div>
        </div>
      </div>

      <ProductLightbox
        open={lightbox}
        images={images}
        index={index}
        onIndexChange={setIndex}
        onClose={() => setLightbox(false)}
        alt={`${product.name} — ${color.name}`}
        base={color.hex}
        accent={color.accent}
        labels={VIEW_LABELS}
      />
    </div>
  )
}
