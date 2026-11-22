import { useCallback, useEffect, useRef } from 'react'
import { RealShoePhoto } from '../art/RealShoePhoto'
import { gsap, prefersReducedMotion } from '../../lib/gsap'

type CinematicIntroProps = {
  onFinish: () => void
}

const WORD = 'SNEAKERX'.split('')
const SCROLL_RATIO = 0.8
const SCROLL_MAX = 760
const FINISH_AT = 0.96

export function CinematicIntro({ onFinish }: CinematicIntroProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const shoeRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const finished = useRef(false)

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    onFinish()
  }, [onFinish])

  // The intro is dismissed purely by scrolling: the page stays scrollable and
  // the overlay fades/slides away as the user moves down the page.
  useEffect(() => {
    const root = rootRef.current
    const progress = progressRef.current
    if (!root) return

    let raf = 0
    let done = false
    let shortPageTimer: number | null = null

    const apply = () => {
      raf = 0
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      )

      // A page shorter than the viewport cannot be scrolled: don't trap the
      // visitor behind the overlay.
      if (maxScroll < 24) {
        if (shortPageTimer === null) {
          shortPageTimer = window.setTimeout(finish, 2200)
        }
        return
      }

      const distance = Math.max(
        24,
        Math.min(window.innerHeight * SCROLL_RATIO, SCROLL_MAX, maxScroll),
      )
      const raw = window.scrollY / distance
      const p = Math.min(Math.max(raw, 0), 1)
      const eased = p * p * (3 - 2 * p)
      root.style.opacity = (1 - eased).toFixed(3)
      root.style.transform = `translate3d(0, ${(-16 * eased).toFixed(2)}%, 0) scale(${(1 - 0.04 * eased).toFixed(3)})`
      if (progress) progress.style.transform = `scaleX(${Math.max(p, 0.02)})`
      if (p >= FINISH_AT && !done) {
        done = true
        finish()
      }
    }

    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(apply)
    }

    apply()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (raf) cancelAnimationFrame(raf)
      if (shortPageTimer !== null) window.clearTimeout(shortPageTimer)
    }
  }, [finish])

  // Entrance choreography. Runs once, on load, with no timers and no exits.
  useEffect(() => {
    const reduced = prefersReducedMotion()
    const root = rootRef.current
    const shoe = shoeRef.current
    const glow = glowRef.current
    const content = contentRef.current
    if (!root || !shoe || !content || !glow) return

    const context = gsap.context(() => {
      if (reduced) {
        gsap.set('.intro-letter, .intro-fade, .intro-meta', { opacity: 1, y: 0 })
        gsap.set(shoe, { opacity: 1, scale: 1, y: 0, rotate: 0 })
        gsap.set(glow, { opacity: 1 })
        gsap.set(progressRef.current, { scaleX: 0.02 })
        return
      }

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo(glow, { opacity: 0, scale: 0.75 }, { opacity: 1, scale: 1, duration: 1.6 }, 0)
        .fromTo(
          '.intro-flash',
          { opacity: 0 },
          { opacity: 0.55, duration: 0.28, yoyo: true, repeat: 1 },
          0.45,
        )
        .fromTo(
          '.intro-letter',
          { yPercent: 130, opacity: 0, rotate: 4 },
          { yPercent: 0, opacity: 1, rotate: 0, duration: 1.05, stagger: 0.055 },
          0.15,
        )
        .fromTo(
          shoe,
          { opacity: 0, scale: 0.72, y: 90, rotate: -10 },
          { opacity: 1, scale: 1, y: 0, rotate: 0, duration: 1.7, ease: 'power4.out' },
          0.55,
        )
        .fromTo(
          '.intro-fade',
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 1, stagger: 0.12 },
          1.3,
        )
        .fromTo(
          '.intro-meta',
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 },
          0.9,
        )
        .fromTo(progressRef.current, { scaleX: 0 }, { scaleX: 0.02, duration: 0.6 }, 0.6)
    }, root)

    return () => context.revert()
  }, [])

  useEffect(() => {
    const reduced = prefersReducedMotion()
    const canvas = canvasRef.current
    if (!canvas || reduced) return
    const context = canvas.getContext('2d')
    if (!context) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = 0
    let height = 0
    let raf = 0
    let mx = 0
    let my = 0

    const count = window.innerWidth < 700 ? 28 : 58
    const particles = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: 0.3 + Math.random() * 0.9,
      r: 0.5 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.0009,
      vy: -0.00025 - Math.random() * 0.0006,
    }))

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const onPointer = (event: PointerEvent) => {
      mx = event.clientX / window.innerWidth - 0.5
      my = event.clientY / window.innerHeight - 0.5
    }

    const draw = () => {
      context.clearRect(0, 0, width, height)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.y < -0.02) p.y = 1.02
        if (p.x < -0.02) p.x = 1.02
        if (p.x > 1.02) p.x = -0.02
        const px = p.x * width + mx * 40 * p.z
        const py = p.y * height + my * 30 * p.z
        context.beginPath()
        context.arc(px, py, p.r * p.z, 0, Math.PI * 2)
        context.fillStyle = `rgba(217,255,67,${0.12 + p.z * 0.22})`
        context.fill()
      }
      raf = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [])

  useEffect(() => {
    const reduced = prefersReducedMotion()
    const root = rootRef.current
    const shoe = shoeRef.current
    if (!root || !shoe || reduced) return
    let raf = 0
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX / window.innerWidth - 0.5
      targetY = event.clientY / window.innerHeight - 0.5
      root.style.setProperty('--lx', `${event.clientX}px`)
      root.style.setProperty('--ly', `${event.clientY}px`)
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        currentX += (targetX - currentX) * 0.08
        currentY += (targetY - currentY) * 0.08
        gsap.set(shoe, {
          rotateY: currentX * 16,
          rotateX: -currentY * 11,
          x: currentX * 38,
          y: currentY * 26,
          transformPerspective: 1100,
        })
        gsap.set('.intro-parallax', {
          x: (index: number) => currentX * (index + 1) * 22,
          y: (index: number) => currentY * (index + 1) * 16,
        })
      })
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-[180] overflow-hidden bg-ink will-change-[opacity,transform]"
      style={{ '--lx': '50%', '--ly': '45%' } as React.CSSProperties}
      aria-hidden="true"
    >
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 opacity-0"
        style={{
          background:
            'radial-gradient(620px circle at var(--lx) var(--ly), rgba(217,255,67,.14), transparent 62%), radial-gradient(900px circle at 50% 60%, rgba(169,199,255,.08), transparent 65%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(241,238,229,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(241,238,229,.5) 1px, transparent 1px)',
          backgroundSize: '88px 88px',
          maskImage: 'radial-gradient(circle at 50% 55%, black 10%, transparent 72%)',
        }}
      />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="intro-flash pointer-events-none absolute inset-0 bg-volt opacity-0" aria-hidden="true" />

      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-6 md:px-10">
        <span className="eyebrow intro-meta">EXPERIENCE 001 — CINEMATIC ENTRY</span>
        <span className="eyebrow intro-meta hidden sm:block">DROP 001 / CAIRO</span>
      </div>

      <div
        ref={contentRef}
        className="relative z-[5] flex h-full flex-col items-center justify-center px-4 pb-16 pt-20"
      >
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <div className="pulse-glow h-[52vmin] w-[52vmin] rounded-full border border-volt/10" />
          <div className="absolute h-[68vmin] w-[68vmin] rounded-full border border-bone/5" />
          <div className="absolute h-[84vmin] w-[84vmin] rounded-full border border-bone/[0.035]" />
          <span className="display display-outline absolute select-none text-[40vmin] leading-none opacity-30">
            X
          </span>
        </div>

        <div className="relative flex w-full max-w-[1240px] flex-col items-center">
          <h1 className="sr-only">SNEAKERX</h1>
          <div
            className="display flex select-none items-baseline justify-center gap-[0.01em] text-[clamp(2.8rem,11.5vw,10.5rem)] leading-[0.8] text-bone"
            aria-hidden="true"
          >
            {WORD.map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className={`intro-letter inline-block ${letter === 'X' ? 'text-volt' : ''}`}
                style={{ transformOrigin: '50% 100%' }}
              >
                {letter}
              </span>
            ))}
          </div>

          <div className="relative mt-[-2vmin] w-[min(88vw,680px)]">
            <div className="intro-parallax pointer-events-none absolute left-[8%] top-[16%] z-10 hidden rounded-full border border-bone/15 bg-ink/60 px-3 py-1.5 font-mono text-[9px] tracking-[0.18em] text-bone/70 backdrop-blur md:block">
              X-01 AERO
            </div>
            <div className="intro-parallax pointer-events-none absolute right-[2%] top-[8%] z-10 hidden rounded-full border border-volt/30 bg-volt/10 px-3 py-1.5 font-mono text-[9px] tracking-[0.18em] text-volt backdrop-blur md:block">
              LIMITED / 300
            </div>
            <div className="intro-parallax pointer-events-none absolute bottom-[16%] right-[8%] z-10 hidden font-mono text-[9px] tracking-[0.2em] text-muted md:block">
              CAIRO / 30.04° N
            </div>
            <div
              ref={shoeRef}
              className="relative z-[6] mx-auto w-full opacity-0 drop-shadow-[0_50px_80px_rgba(0,0,0,.65)]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <RealShoePhoto
                src="/images/products/x01-aero-1.jpg"
                alt="سنيكر SNEAKERX X-01 AERO"
                blend="screen"
                loading="eager"
                className="w-full"
              />
            </div>
            <div className="pointer-events-none absolute bottom-[8%] left-1/2 h-[16%] w-[62%] -translate-x-1/2 rounded-[50%] bg-volt/15 blur-3xl" />
          </div>

          <div className="relative z-10 -mt-6 flex flex-col items-center gap-4 text-center md:-mt-2">
            <p className="intro-fade font-serif text-[clamp(1.35rem,3vw,2.4rem)] italic leading-tight text-bone/90">
              Form follows <span className="text-volt">motion.</span>
            </p>
            <p className="intro-fade max-w-md text-sm leading-7 text-muted">
              لا تشتري حذاءً. ادخل عالمًا كاملًا من الحركة والتصميم.
            </p>
            <div className="intro-fade mt-1 flex items-center gap-3 text-[11px] text-muted">
              <span className="scroll-cue-line relative h-6 w-px overflow-hidden bg-bone/15" />
              <span>مرّر للأسفل لتبدأ التجربة</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6 md:px-10">
        <div className="mb-4 flex items-center justify-between">
          <span className="eyebrow intro-meta">SNEAKERX © 2026</span>
          <span className="eyebrow intro-meta">SCROLL TO ENTER</span>
        </div>
        <div className="h-px w-full overflow-hidden bg-bone/10">
          <div ref={progressRef} className="h-full w-full origin-right bg-volt" />
        </div>
      </div>
    </div>
  )
}
