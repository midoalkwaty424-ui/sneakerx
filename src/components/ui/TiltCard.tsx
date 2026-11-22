import { useRef, type CSSProperties, type ReactNode } from 'react'
import { cx } from '../../lib/format'
import { isFinePointer, prefersReducedMotion } from '../../lib/gsap'

type TiltCardProps = {
  children: ReactNode
  className?: string
  innerClassName?: string
  intensity?: number
  glare?: boolean
}

export function TiltCard({
  children,
  className,
  innerClassName,
  intensity = 7,
  glare = true,
}: TiltCardProps) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const frame = useRef(0)

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || !isFinePointer() || prefersReducedMotion()) return
    const element = inner.current
    const wrapper = outer.current
    if (!element || !wrapper) return
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const rect = wrapper.getBoundingClientRect()
      const px = (event.clientX - rect.left) / rect.width - 0.5
      const py = (event.clientY - rect.top) / rect.height - 0.5
      element.style.transition = 'transform .12s ease-out'
      element.style.transform = `rotateX(${(-py * intensity).toFixed(2)}deg) rotateY(${(
        px * intensity
      ).toFixed(2)}deg) translateZ(0)`
      element.style.setProperty('--mx', `${((px + 0.5) * 100).toFixed(1)}%`)
      element.style.setProperty('--my', `${((py + 0.5) * 100).toFixed(1)}%`)
    })
  }

  const onLeave = () => {
    const element = inner.current
    if (!element) return
    element.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1)'
    element.style.transform = 'rotateX(0deg) rotateY(0deg)'
  }

  const style = {
    '--mx': '50%',
    '--my': '50%',
  } as CSSProperties

  return (
    <div
      ref={outer}
      className={cx('[perspective:1200px]', className)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={style}
    >
      <div
        ref={inner}
        className={cx(
          'relative h-full [transform-style:preserve-3d] will-change-transform',
          innerClassName,
        )}
      >
        {children}
        {glare && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(420px circle at var(--mx) var(--my), rgba(255,255,255,.09), transparent 55%)',
            }}
          />
        )}
      </div>
    </div>
  )
}
