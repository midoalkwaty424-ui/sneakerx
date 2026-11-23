import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../../lib/types'
import { cx, discountPercent, formatEGP } from '../../lib/format'
import { colorPrimaryImage, thumbImage } from '../../lib/product-visuals'
import { gsap, isFinePointer, prefersReducedMotion } from '../../lib/gsap'
import { isCompactDevice } from '../../hooks/useCompactDevice'
import { ProductVisual } from '../commerce/ProductVisual'
import { Icon } from '../ui/Icon'
import { Magnetic } from '../ui/Magnetic'
import { XMonolith } from '../three/XMonolith'

const FALLBACK = { hex: '#E9E3D3', accent: '#D9FF43', name: 'Bone' }

export function Hero({ featured }: { featured?: Product }) {
  const [colorIndex, setColorIndex] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)
  const shoeRef = useRef<HTMLDivElement>(null)
  const visualRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const color = featured?.colors[colorIndex] ?? featured?.colors[0] ?? FALLBACK
  const discount = featured ? discountPercent(featured.price, featured.comparePrice) : 0

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const context = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
      tl.fromTo('.hero-line', { yPercent: 115, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.15, stagger: 0.1 })
        .fromTo('.hero-fade', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.09 }, 0.45)
        .fromTo('.hero-visual', { scale: 0.82, opacity: 0, rotate: -5 }, { scale: 1, opacity: 1, rotate: 0, duration: 1.5, ease: 'power4.out' }, 0.25)
        .fromTo('.hero-float', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0.9)
        .fromTo('.hero-scroll', { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.2)

      // The intro overlay sits on top of the hero. Start the hero right away so
      // the page is already alive when the overlay is scrolled away.
      tl.play()

      if (!prefersReducedMotion() && !isCompactDevice()) {
        gsap.to(visualRef.current, {
          yPercent: 12,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        })
      }

      return () => {
        tl.kill()
      }
    }, section)
    return () => context.revert()
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || !isFinePointer() || prefersReducedMotion()) return
    let raf = 0
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      targetX = event.clientX / window.innerWidth - 0.5
      targetY = event.clientY / window.innerHeight - 0.5
      glowRef.current?.style.setProperty('--lx', `${event.clientX}px`)
      glowRef.current?.style.setProperty('--ly', `${event.clientY}px`)
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        currentX += (targetX - currentX) * 0.07
        currentY += (targetY - currentY) * 0.07
        gsap.set(shoeRef.current, {
          rotateY: currentX * 14,
          rotateX: -currentY * 9,
          x: currentX * 34,
          y: currentY * 22,
          transformPerspective: 1100,
        })
        gsap.set('.hero-float', {
          x: (index: number) => currentX * (index + 1) * 18,
          y: (index: number) => currentY * (index + 1) * 14,
        })
      })
    }

    section.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      section.removeEventListener('pointermove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100svh] overflow-hidden pb-8 pt-[8.2rem] md:pt-[9rem]"
      aria-label="SNEAKERX — الإصدار الأول"
    >
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0"
        style={{
          '--lx': '52%',
          '--ly': '42%',
          background:
            'radial-gradient(600px circle at var(--lx) var(--ly), rgba(217,255,67,.10), transparent 58%), radial-gradient(900px circle at 25% 55%, rgba(169,199,255,.06), transparent 62%)',
        } as React.CSSProperties}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(241,238,229,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(241,238,229,.7) 1px, transparent 1px)',
          backgroundSize: '90px 90px',
          maskImage: 'radial-gradient(circle at 45% 50%, black 5%, transparent 68%)',
        }}
        aria-hidden="true"
      />

      <div className="container-x relative z-10 flex min-h-[calc(100svh-10rem)] flex-col">
        <div className="grid flex-1 items-center gap-y-6 lg:grid-cols-12 lg:gap-x-6">
          <div className="relative z-20 lg:col-span-6 lg:self-end">
            <div className="hero-fade mb-5 flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-volt" />
              <span className="eyebrow !text-bone/60">DROP 001 — NEW SEASON / 2026</span>
              <span className="hidden h-px w-16 bg-bone/20 sm:block" />
            </div>

            <h1 className="display text-[clamp(3.5rem,8.2vw,8.6rem)]">
              <span className="block overflow-hidden pb-[0.04em]">
                <span className="hero-line block">OUTRUN</span>
              </span>
              <span className="block overflow-hidden pb-[0.06em]">
                <span className="hero-line flex items-baseline gap-[0.12em]">
                  THE
                  <em className="display-italic lowercase text-volt text-[0.82em]">ordinary</em>
                </span>
              </span>
            </h1>
          </div>

          <div className="relative order-first lg:order-none lg:col-span-6 lg:row-span-2 lg:self-center">
            <div ref={visualRef} className="hero-visual relative mx-auto w-full max-w-[560px] lg:max-w-none">
              <div className="pointer-events-none absolute inset-[-14%] z-0 overflow-hidden">
                <XMonolith />
              </div>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="h-[70%] w-[70%] rounded-full border border-bone/[0.07]" />
                <div className="absolute h-[88%] w-[88%] rounded-full border border-bone/[0.04]" />
                <div className="absolute h-[55%] w-[55%] rounded-full bg-volt/[0.06] blur-3xl" />
              </div>
              <div
                ref={shoeRef}
                className="relative z-10 will-change-transform"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {featured ? (
                  <div className="relative overflow-hidden rounded-[2rem] border border-bone/10 bg-ink2 shadow-[0_45px_120px_rgba(0,0,0,.65)]">
                    <div className="relative aspect-[4/3.35]">
                      <ProductVisual
                        image={thumbImage(colorPrimaryImage(featured, color))}
                        base={color.hex}
                        accent={color.accent}
                        alt={`${featured.name} — ${color.name}`}
                        priority
                        fit="cover"
                        sizes="(min-width: 1024px) 48vw, 92vw"
                        className="h-full w-full"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/5 to-ink/30"
                        aria-hidden="true"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-bone/10"
                        aria-hidden="true"
                      />
                      <span className="absolute left-4 top-4 rounded-full border border-bone/20 bg-ink/60 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-bone/75 backdrop-blur">
                        DROP 001 / CAMPAIGN
                      </span>
                      <span className="absolute bottom-4 left-4 font-mono text-[9px] uppercase tracking-[0.2em] text-bone/60">
                        SNEAKERX — 2026
                      </span>
                    </div>
                  </div>
                ) : (
                  <ProductVisual
                    image={null}
                    base={color.hex}
                    accent={color.accent}
                    alt={`SNEAKERX X-01 AERO — ${color.name}`}
                    className="w-full drop-shadow-[0_45px_60px_rgba(0,0,0,.6)]"
                    priority
                  />
                )}
              </div>

              <div className="hero-float absolute -top-2 right-[3%] z-20 hidden rounded-full border border-bone/15 bg-ink/50 px-3.5 py-2 font-mono text-[9px] tracking-[0.14em] text-bone/70 backdrop-blur-md sm:block">
                {featured?.name ?? 'X-01 AERO'} / 001
              </div>
              <div className="hero-float absolute bottom-[22%] left-[-2%] z-20 hidden flex-col gap-1 rounded-xl border border-volt/25 bg-volt/[0.07] px-4 py-3 backdrop-blur-md sm:flex">
                <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-volt/80">
                  NITRO FOAM
                </span>
                <span className="font-display text-lg font-bold leading-none text-volt">+32%</span>
                <span className="text-[9px] text-bone/50">ارتداد أكبر</span>
              </div>
              <div className="hero-float absolute -bottom-2 right-[2%] z-20 hidden font-mono text-[9px] tracking-[0.2em] text-muted sm:block">
                30.0444° N / 31.2357° E
              </div>

              <div className="relative z-20 mt-2 flex items-center justify-center gap-4">
                <div className="flex items-center gap-2 rounded-full border border-line bg-ink/60 px-3 py-2 backdrop-blur">
                  <span className="font-mono text-[8px] uppercase tracking-wider text-muted">Color</span>
                  {(featured?.colors ?? [FALLBACK]).map((option, index) => (
                    <button
                      key={option.name}
                      type="button"
                      onClick={() => setColorIndex(index)}
                      className={cx(
                        'h-4 w-4 rounded-full border transition',
                        colorIndex === index
                          ? 'scale-125 border-volt'
                          : 'border-bone/25 hover:scale-110',
                      )}
                      style={{ backgroundColor: option.hex }}
                      aria-label={`اختيار لون ${option.name}`}
                      aria-pressed={colorIndex === index}
                    />
                  ))}
                  <span className="ms-1 text-[10px] text-bone/70">{color.name}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-20 lg:col-span-6 lg:self-start">
            <p className="hero-fade max-w-md text-[0.92rem] leading-7 text-bone/65">
              سنيكرز بتصميم سينمائي وتقنيات نعل من الجيل القادم. إصدارات محدودة، خامات مختارة،
              وتجربة شراء بلا تعقيد — من القاهرة لكل مصر.
            </p>
            <div className="hero-fade mt-7 flex flex-wrap items-center gap-3">
              <Magnetic strength={0.2}>
                <Link to="/shop" className="btn btn-volt btn-lg group" data-cursor-label="تسوق">
                  تسوق الدروب
                  <Icon
                    name="arrow-left"
                    size={16}
                    className="transition-transform duration-300 group-hover:-translate-x-1"
                  />
                </Link>
              </Magnetic>
              <Link
                to={
                  featured
                    ? `/product/${featured.slug}`
                    : '/shop?collection=featured'
                }
                className="btn btn-ghost btn-lg group"
                data-cursor-label="اكتشف"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-bone/10 transition group-hover:bg-volt group-hover:text-ink">
                  <Icon name="play" size={9} filled />
                </span>
                اكتشف {featured?.name ?? 'X-01'}
              </Link>
            </div>

            {featured && (
              <div className="hero-fade mt-5 flex items-baseline gap-3">
                <span className="font-mono text-sm text-bone">{formatEGP(featured.price)}</span>
                {featured.comparePrice && (
                  <span className="font-mono text-xs text-muted line-through">
                    {formatEGP(featured.comparePrice)}
                  </span>
                )}
                {discount > 0 && (
                  <span className="rounded-full bg-flare/15 px-2 py-0.5 font-mono text-[9px] text-flare">
                    -{discount}%
                  </span>
                )}
                <span className="text-[10px] text-muted">السعر شامل الضريبة</span>
              </div>
            )}

            <dl className="hero-fade mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-5">
              {[
                { k: '300', v: 'زوج لكل لون' },
                { k: '14D', v: 'استرجاع مجاني' },
                { k: 'COD', v: 'دفع عند الاستلام' },
              ].map((item) => (
                <div key={item.k}>
                  <dt className="font-display text-xl font-bold tracking-tight">{item.k}</dt>
                  <dd className="mt-1 text-[10px] text-muted">{item.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="hero-scroll mt-8 flex items-center justify-between gap-4 border-t border-line/60 pt-4">
          <div className="flex items-center gap-3">
            <span className="scroll-cue-line relative h-8 w-px overflow-hidden bg-bone/15" />
            <span className="eyebrow">Scroll to explore</span>
          </div>
          <span className="font-mono text-[10px] text-muted">01 / 06</span>
          <Link
            to="/#story"
            className="hidden items-center gap-2 text-[11px] text-muted transition hover:text-bone sm:flex"
          >
            قصة SneakerX
            <Icon name="arrow-up-right" size={12} />
          </Link>
        </div>
      </div>
    </section>
  )
}
