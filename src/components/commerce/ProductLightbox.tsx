import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cx } from '../../lib/format'
import { prefersReducedMotion } from '../../lib/gsap'
import { useBodyLock } from '../../hooks/useBodyLock'
import { Icon } from '../ui/Icon'
import { ProductVisual } from './ProductVisual'

type ProductLightboxProps = {
  open: boolean
  images: string[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  alt: string
  base?: string
  accent?: string
  labels: string[]
}

export function ProductLightbox({
  open,
  images,
  index,
  onIndexChange,
  onClose,
  alt,
  base,
  accent,
  labels,
}: ProductLightboxProps) {
  useBodyLock(open)
  const touchStart = useRef<number | null>(null)
  const [dragX, setDragX] = useState(0)

  const go = useCallback(
    (step: number) => {
      if (images.length < 2) return
      onIndexChange((index + step + images.length) % images.length)
    },
    [images.length, index, onIndexChange],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') go(-1)
      if (event.key === 'ArrowLeft') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, go])

  useEffect(() => {
    if (!open) setDragX(0)
  }, [open])

  const current = images[index] ?? images[0] ?? null
  const label = labels[index] ?? labels[0] ?? 'VIEW'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[150] flex flex-col bg-ink/97 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label="عرض الصور بالحجم الكامل"
          data-lightbox
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-volt" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone/70">
                {label} — {String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-muted sm:inline">
                ← → SWIPE · ESC CLOSE
              </span>
              <button
                type="button"
                onClick={onClose}
                className="icon-btn h-10 w-10 border-bone/15 bg-bone/[0.04] hover:border-volt/40"
                aria-label="إغلاق العرض"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          </div>

          <div
            className="relative min-h-0 flex-1 overflow-hidden"
            onTouchStart={(event) => {
              touchStart.current = event.touches[0]?.clientX ?? null
            }}
            onTouchMove={(event) => {
              if (touchStart.current === null) return
              const delta = (event.touches[0]?.clientX ?? 0) - touchStart.current
              setDragX(Math.max(-120, Math.min(120, delta)))
            }}
            onTouchEnd={() => {
              if (Math.abs(dragX) > 48) go(dragX > 0 ? -1 : 1)
              setDragX(0)
              touchStart.current = null
            }}
          >
            <motion.div
              key={`${current ?? 'fallback'}-${index}`}
              initial={{ opacity: 0, scale: prefersReducedMotion() ? 1 : 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center px-4 pb-4 sm:px-10"
              style={{ x: dragX }}
            >
              <ProductVisual
                image={current}
                base={base}
                accent={accent}
                alt={alt}
                priority
                fit="contain"
                sizes="100vw"
                className="max-h-full max-w-full select-none object-contain"
              />
            </motion.div>

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(217,255,67,.05),transparent_60%)]" />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-bone/15 bg-ink/70 text-bone/80 backdrop-blur transition hover:border-volt/50 hover:text-volt sm:left-6"
                  aria-label="الصورة السابقة"
                >
                  <Icon name="chevron-left" size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-bone/15 bg-ink/70 text-bone/80 backdrop-blur transition hover:border-volt/50 hover:text-volt sm:right-6"
                  aria-label="الصورة التالية"
                >
                  <Icon name="chevron-left" size={18} className="rotate-180" />
                </button>
              </>
            )}
          </div>

          <div className="shrink-0 px-4 pb-5 pt-3 sm:px-6">
            <div className="no-scrollbar flex items-center justify-center gap-2 overflow-x-auto">
              {images.map((image, thumbIndex) => (
                <button
                  key={`${image}-${thumbIndex}`}
                  type="button"
                  onClick={() => onIndexChange(thumbIndex)}
                  className={cx(
                    'relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-ink2 transition sm:h-16 sm:w-16',
                    thumbIndex === index
                      ? 'border-volt opacity-100'
                      : 'border-bone/12 opacity-55 hover:border-bone/30 hover:opacity-90',
                  )}
                  aria-label={`عرض ${labels[thumbIndex] ?? thumbIndex + 1}`}
                  aria-pressed={thumbIndex === index}
                >
                  <ProductVisual
                    image={image}
                    base={base}
                    accent={accent}
                    alt=""
                    fit="cover"
                    className="h-full w-full"
                  />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
