import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { track } from '../../lib/analytics'
import { cx } from '../../lib/format'
import { sceneAllowed } from '../../lib/scene'
import { useDocumentVisible, useSceneVisibility } from '../../hooks/useSceneVisibility'
import { useDeferredScene } from '../../hooks/useDeferredScene'
import type { Product } from '../../lib/types'
import { Icon } from '../ui/Icon'
import { VaultPhotoCollage } from './VaultPhotoCollage'

const DropPortalScene = lazy(() => import('../three/DropPortalScene'))

const MAX_ITEMS = 8
const FALLBACK_DEPTH = [
  { z: -110, rotate: -16, opacity: 0.35 },
  { z: -50, rotate: -8, opacity: 0.6 },
  { z: 0, rotate: 0, opacity: 1 },
  { z: -50, rotate: 8, opacity: 0.6 },
  { z: -110, rotate: 16, opacity: 0.35 },
]

function PortalFallback({ items }: { items: Product[] }) {
  return (
    <div data-drop-portal-fallback className="absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 flex items-center justify-center gap-2 px-4 md:gap-5"
        style={{ perspective: '900px' }}
        aria-hidden="true"
      >
        {items.length === 0
          ? [0, 1, 2, 3, 4].map((index) => (
              <div
                key={index}
                className="h-[210px] w-[140px] shrink-0 animate-pulse rounded-2xl border border-line bg-ink2/70 md:h-[280px] md:w-[190px]"
              />
            ))
          : items.slice(0, 5).map((product, index) => {
              const depth = FALLBACK_DEPTH[index] ?? FALLBACK_DEPTH[4]
              return (
                <div
                  key={product.id}
                  className="relative w-[clamp(112px,15vw,190px)] shrink-0 md:w-[clamp(140px,15vw,210px)]"
                  style={{
                    transform: `translateZ(${depth.z}px) rotateY(${depth.rotate}deg)`,
                    opacity: depth.opacity,
                  }}
                >
                  <div className="aspect-[512/592]">
                    <VaultPhotoCollage product={product} />
                  </div>
                </div>
              )
            })}
      </div>
    </div>
  )
}

/** Cinematic bridge between the hero and the 3D Vault, built from real product photos. */
export function DropPortal({ products }: { products: Product[] }) {
  const items = useMemo(() => products.slice(0, MAX_ITEMS), [products])
  const { ref, mounted, visible } = useSceneVisibility<HTMLElement>('260px')
  const documentVisible = useDocumentVisible()
  const progressRef = useRef(0)
  const viewed = useRef(false)

  const deferred3d = useDeferredScene()
  const [can3d, setCan3d] = useState(false)
  const [compact, setCompact] = useState(false)
  const [ready, setReady] = useState(false)

  const markReady = useCallback(() => setReady(true), [])

  useEffect(() => {
    setCan3d(deferred3d && sceneAllowed())
  }, [deferred3d])

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const sync = () => setCompact(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const update = () => {
      const node = ref.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      const span = window.innerHeight + rect.height
      const raw = (window.innerHeight - rect.top) / Math.max(span, 1)
      progressRef.current = Math.max(0, Math.min(1, raw))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [ref])

  useEffect(() => {
    if (!visible || viewed.current) return
    viewed.current = true
    track('portal_view', { items: items.length, mode: ready ? '3d' : 'fallback' })
  }, [visible, items.length, ready])

  return (
    <section
      ref={ref}
      id="drop-portal"
      data-drop-portal
      aria-label="بوابة الدروب — انتقال بصري لخزنة الدروب"
      className="relative isolate overflow-hidden border-y border-line/60 bg-ink"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(90% 120% at 50% 50%, rgba(217,255,67,0.07) 0%, rgba(7,8,10,0) 55%), radial-gradient(70% 90% at 80% 50%, rgba(169,199,255,0.05), transparent 60%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(241,238,229,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(241,238,229,.7) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 8%, transparent 72%)',
        }}
        aria-hidden="true"
      />

      <div className="relative h-[430px] md:h-[520px]">
        {(!ready || !can3d) && <PortalFallback items={items} />}

        {can3d && mounted && items.length > 0 && (
          <div
            key="drop-portal-stage"
            data-drop-portal-stage
            className="absolute inset-0 z-0 transition-opacity duration-700"
            style={{ opacity: ready ? 1 : 0 }}
            aria-hidden="true"
          >
            <Suspense fallback={null}>
              <DropPortalScene
                products={items}
                progressRef={progressRef}
                compact={compact}
                paused={!visible || !documentVisible}
                onReady={markReady}
              />
            </Suspense>
          </div>
        )}

        <div className="pointer-events-none relative z-10 flex h-full items-center container-x">
          <div className="max-w-sm rounded-2xl border border-line/60 bg-ink/70 p-5 backdrop-blur-md md:p-7">
            <div className="mb-3 flex items-center gap-3">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-volt" />
              <span className="eyebrow eyebrow-volt">THE PORTAL / 001</span>
            </div>
            <h2 className="display text-[clamp(2rem,4.4vw,3.9rem)] leading-[0.98]">
              ادخل <span className="display-italic lowercase text-volt">البُعد</span> التالي.
            </h2>
            <p className="mt-4 max-w-xs text-[11px] leading-6 text-bone/60 md:text-xs md:leading-7">
              ثمانية تصاميم تتحرك حولك في مساحة ثلاثية الأبعاد. تمرّر للدخول، ثم أنهِ الرحلة عند خزنة الدروب.
            </p>
            <a
              href="#vault"
              data-drop-portal-enter
              onClick={() => track('portal_enter', { items: items.length })}
              className={cx('btn btn-volt btn-sm mt-5 pointer-events-auto')}
            >
              اكتشف الخزنة
              <Icon name="arrow-left" size={14} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
