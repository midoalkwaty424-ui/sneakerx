import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../../lib/types'
import { itemPayload, track } from '../../lib/analytics'
import { cx, discountPercent, formatEGP } from '../../lib/format'
import { sceneAllowed } from '../../lib/scene'
import { useDocumentVisible, useSceneVisibility } from '../../hooks/useSceneVisibility'
import { useDeferredScene } from '../../hooks/useDeferredScene'
import { QuickView } from '../commerce/QuickView'
import { Icon } from '../ui/Icon'
import { VaultPhotoCollage } from './VaultPhotoCollage'
import type { VaultDragState } from '../three/SneakerVaultScene'

const VaultScene = lazy(() => import('../three/SneakerVaultScene'))

const MAX_ITEMS = 8

type FallbackProps = {
  items: Product[]
  onOpen: (product: Product) => void
}

function VaultFallback({ items, onOpen }: FallbackProps) {
  return (
    <div
      data-vault-fallback
      className="absolute inset-0 z-0 flex items-center justify-center px-4"
    >
      <div className="flex w-full max-w-5xl snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pt-16 [scrollbar-width:none] md:pt-32 [&::-webkit-scrollbar]:hidden">
        {items.length === 0
          ? [0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-[292px] w-[216px] shrink-0 animate-pulse rounded-2xl border border-line bg-ink2/70 md:w-[238px]"
              />
            ))
          : items.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onOpen(product)}
                className="group relative w-[216px] shrink-0 snap-center overflow-hidden rounded-2xl border border-line bg-ink2 p-1.5 text-start transition hover:border-volt/50 md:w-[238px]"
                data-cursor-label="معاينة"
              >
                <span className="block aspect-[512/592] overflow-hidden rounded-[18px] bg-ink3">
                  <VaultPhotoCollage product={product} />
                </span>
                <span className="block p-3">
                  <span className="block truncate font-display text-sm font-bold">
                    {product.name}
                  </span>
                  <span className="mt-1 block font-mono text-[11px] text-volt">
                    {formatEGP(product.price)}
                  </span>
                </span>
              </button>
            ))}
      </div>
    </div>
  )
}

export function SneakerVault({ products }: { products: Product[] }) {
  const { ref, mounted, visible } = useSceneVisibility<HTMLElement>('360px')
  const documentVisible = useDocumentVisible()
  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<VaultDragState>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startRotation: 0,
    rotation: 0,
  })
  const viewed = useRef(false)
  const lastFocus = useRef(-1)

  const deferred3d = useDeferredScene()
  const [can3d, setCan3d] = useState(false)
  const [compact, setCompact] = useState(false)
  const [ready, setReady] = useState(false)
  const items = useMemo(
    () => products.slice(0, compact ? 5 : MAX_ITEMS),
    [products, compact],
  )
  const itemsLength = useRef(items.length)
  const [active, setActive] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [quick, setQuick] = useState<Product | null>(null)

  const safeActive = items.length ? active % items.length : 0
  const product = items[safeActive]

  useEffect(() => {
    setCan3d(deferred3d && sceneAllowed())
  }, [deferred3d])

  useEffect(() => {
    itemsLength.current = items.length
    setActive(0)
  }, [items.length])

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const sync = () => setCompact(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!visible || viewed.current) return
    viewed.current = true
    track('vault_view', { items: items.length, mode: ready ? '3d' : 'fallback' })
  }, [visible, items.length, ready])

  useEffect(() => {
    if (!ready || !product || lastFocus.current === safeActive) return
    lastFocus.current = safeActive
    track('vault_focus', { ...itemPayload(product), index: safeActive })
  }, [ready, product, safeActive])

  /* Pointer drag → ring rotation. Runs on the stage so the overlay stays usable. */
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    let pointerActive = false
    let decided = false
    let startX = 0
    let startY = 0
    let startRotation = 0
    let moved = false

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      pointerActive = true
      decided = false
      moved = false
      startX = event.clientX
      startY = event.clientY
      startRotation = dragRef.current.rotation
      dragRef.current.moved = false
      dragRef.current.active = true
      setDragging(true)
    }

    const onMove = (event: PointerEvent) => {
      if (!pointerActive) return
      const dx = event.clientX - startX
      const dy = event.clientY - startY

      if (!decided) {
        if (Math.abs(dx) < 7) return
        if (Math.abs(dy) > Math.abs(dx) * 1.4) {
          pointerActive = false
          dragRef.current.active = false
          setDragging(false)
          return
        }
        decided = true
      }

      moved = true
      dragRef.current.moved = true
      dragRef.current.rotation = startRotation + dx * 0.006
    }

    const finish = () => {
      if (!pointerActive) {
        setDragging(false)
        return
      }
      pointerActive = false
      dragRef.current.active = false
      setDragging(false)

      const count = itemsLength.current
      if (count < 1 || !moved) return
      const step = (Math.PI * 2) / count
      const raw = -dragRef.current.rotation / step
      const index = ((Math.round(raw) % count) + count) % count
      setActive(index)
    }

    stage.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)

    return () => {
      stage.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [can3d, mounted, ready])

  const go = (direction: number) => {
    if (items.length < 2) return
    setActive((index) => (index + direction + items.length) % items.length)
  }

  const openProduct = (index: number) => {
    const target = items[index]
    if (!target) return
    setActive(index)
    track('vault_quick_view', { ...itemPayload(target), index })
    setQuick(target)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      go(1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      go(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActive(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActive(Math.max(items.length - 1, 0))
    }
  }

  const total = String(items.length).padStart(2, '0')
  const current = String(items.length ? safeActive + 1 : 0).padStart(2, '0')
  const discount = product ? discountPercent(product.price, product.comparePrice) : 0

  return (
    <section
      id="vault"
      ref={ref}
      data-vault
      aria-roledescription="معرض ثلاثي الأبعاد"
      aria-label="خزانة الدروب — معرض سنيكرز تفاعلي"
      onKeyDown={onKeyDown}
      className="relative isolate overflow-hidden border-y border-line/60 bg-ink"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 85% at 50% 38%, #12161d 0%, #07080a 64%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(241,238,229,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(241,238,229,.7) 1px, transparent 1px)',
          backgroundSize: '96px 96px',
          maskImage: 'radial-gradient(ellipse at 50% 45%, black 10%, transparent 72%)',
        }}
        aria-hidden="true"
      />

      <div className="relative h-[100svh] min-h-[560px] max-h-[1120px] md:min-h-[740px]">
        {(!ready || !can3d) && (
          <VaultFallback
            key="vault-fallback"
            items={items}
            onOpen={(item) => openProduct(items.indexOf(item))}
          />
        )}

        {can3d && mounted && items.length > 0 && (
          <div
            key="vault-stage"
            ref={stageRef}
            data-vault-stage
            className={cx(
              'absolute inset-0 z-0 overflow-hidden transition-opacity duration-500',
              dragging ? 'cursor-grabbing' : 'cursor-grab',
            )}
            style={{ opacity: ready ? 1 : 0 }}
          >
            <Suspense fallback={null}>
              <VaultScene
                products={items}
                active={safeActive}
                compact={compact}
                paused={!visible || !documentVisible}
                dragRef={dragRef}
                onSelect={setActive}
                onOpen={openProduct}
                onReady={() => setReady(true)}
              />
            </Suspense>
          </div>
        )}

        <div className="pointer-events-none relative z-10 flex h-full flex-col justify-between gap-6 container-x pb-6 pt-14 md:pb-10 md:pt-24">
          <header className="flex items-start justify-between gap-6">
            <div className="max-w-xl">
              <div className="mb-4 flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-volt" />
                <span className="eyebrow eyebrow-volt">THE VAULT — 3D SHOWROOM</span>
              </div>
              <h2 className="display text-[clamp(2.5rem,5.6vw,5.6rem)]">
                خزانة{' '}
                <span className="display-italic lowercase text-volt">الدروب.</span>
              </h2>
              <p className="mt-4 max-w-sm text-[11px] leading-6 text-bone/55 md:text-xs md:leading-7">
                معرض ثلاثي الأبعاد للقطع المختارة. اسحب الحلقة أفقيًا، أوقفها على القطعة،
                واضغط عليها لفتح المعاينة السريعة — نفس السلة ونفس الدفع عند الاستلام.
              </p>
            </div>

            <div className="hidden shrink-0 text-end md:block">
              <p
                className="font-mono text-[11px] text-bone/70"
                data-vault-index={safeActive}
              >
                {current} / {total}
              </p>
              <p className="eyebrow mt-2">ARCHIVE / 2026</p>
              <p className="mt-6 max-w-[13rem] text-[10px] leading-5 text-muted">
                {product?.category?.name ?? 'LIMITED RUN'} — {product?.totalStock ?? 0} زوج متاح
              </p>
            </div>
          </header>

          <div className="flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-end">
            <div className="pointer-events-none hidden flex-col gap-2 md:order-2 md:flex">
              <span className="eyebrow flex items-center gap-2">
                <Icon name="motion" size={13} />
                اسحب للدوران
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                DRAG / ARROWS / TAP TO OPEN
              </span>
              <div className="mt-3 flex items-center gap-1.5">
                {items.map((item, index) => (
                  <span
                    key={item.id}
                    className={cx(
                      'h-1 rounded-full transition-all duration-300',
                      index === safeActive ? 'w-6 bg-volt' : 'w-2 bg-bone/20',
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="pointer-events-auto w-full rounded-2xl border border-line bg-ink2/85 p-4 backdrop-blur-xl md:order-1 md:max-w-md md:p-5">
              {product ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="eyebrow eyebrow-volt">
                        {product.category?.name ?? 'SNEAKERX'} /{' '}
                        {product.gender === 'women' ? 'WOMEN' : product.gender === 'men' ? 'MEN' : 'UNISEX'}
                      </p>
                      <p className="display mt-1.5 truncate text-2xl leading-tight">
                        {product.name}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-muted">{product.subtitle}</p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted">
                        <span className="flex items-center gap-1">
                          <Icon name="star" size={11} filled className="text-volt" />
                          {product.rating.toFixed(1)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {product.colors.slice(0, 4).map((color) => (
                            <span
                              key={color.name}
                              className="h-2.5 w-2.5 rounded-full border border-bone/25"
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            />
                          ))}
                          <span>{product.colors.length} ألوان</span>
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-end">
                      <p className="font-mono text-sm text-volt">{formatEGP(product.price)}</p>
                      {product.comparePrice && product.comparePrice > product.price ? (
                        <p className="mt-0.5 font-mono text-[10px] text-muted line-through">
                          {formatEGP(product.comparePrice)}
                        </p>
                      ) : null}
                      {discount > 0 && (
                        <p className="mt-1 font-mono text-[9px] text-flare">−{discount}%</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      to={`/product/${product.slug}`}
                      className="btn btn-volt h-9 flex-1 !py-2 text-[11px]"
                    >
                      اكتشف القطعة
                      <Icon name="arrow-left" size={13} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => openProduct(safeActive)}
                      className="btn btn-ghost h-9 !py-2 text-[11px]"
                      data-vault-open
                    >
                      <Icon name="zoom-in" size={13} />
                      معاينة
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => go(-1)}
                        className="icon-btn"
                        aria-label="القطعة السابقة"
                        data-vault-prev
                      >
                        <Icon name="arrow-right" size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => go(1)}
                        className="icon-btn"
                        aria-label="القطعة التالية"
                        data-vault-next
                      >
                        <Icon name="arrow-left" size={15} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2 py-1">
                  <div className="h-3 w-24 animate-pulse rounded bg-bone/10" />
                  <div className="h-6 w-40 animate-pulse rounded bg-bone/10" />
                  <div className="h-3 w-32 animate-pulse rounded bg-bone/5" />
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {product ? `${product.name} — ${formatEGP(product.price)}` : ''}
        </p>
      </div>

      <QuickView product={quick} onClose={() => setQuick(null)} />
    </section>
  )
}
