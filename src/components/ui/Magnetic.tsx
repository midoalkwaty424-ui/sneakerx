import { useEffect, useRef, type ReactNode } from 'react'
import { cx } from '../../lib/format'
import { isFinePointer, prefersReducedMotion } from '../../lib/gsap'

type MagneticProps = {
  children: ReactNode
  className?: string
  strength?: number
}

export function Magnetic({ children, className, strength = 0.28 }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || !isFinePointer() || prefersReducedMotion()) return

    let frame = 0
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect()
        const x = (event.clientX - rect.left - rect.width / 2) * strength
        const y = (event.clientY - rect.top - rect.height / 2) * strength
        element.style.transition = 'transform .12s linear'
        element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(frame)
      element.style.transition = 'transform .55s cubic-bezier(.22,1,.36,1)'
      element.style.transform = 'translate3d(0,0,0)'
    }

    element.addEventListener('pointermove', onMove)
    element.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerleave', onLeave)
    }
  }, [strength])

  return (
    <span ref={ref} className={cx('inline-block will-change-transform', className)}>
      {children}
    </span>
  )
}
