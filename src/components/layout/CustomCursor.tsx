import { useEffect, useRef, useState } from 'react'
import { gsap, isFinePointer, prefersReducedMotion } from '../../lib/gsap'

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)
  const [label, setLabel] = useState('')
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    if (!isFinePointer() || prefersReducedMotion()) return

    // The cursor nodes are always mounted, so the refs are available here.
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    setEnabled(true)
    document.documentElement.classList.add('cursor-none')

    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, x: -100, y: -100 })
    const dotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power2.out' })
    const dotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power2.out' })
    const ringX = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3.out' })
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3.out' })

    let lastLabel = ''
    let lastHover = false

    const onMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') return
      dotX(event.clientX)
      dotY(event.clientY)
      ringX(event.clientX)
      ringY(event.clientY)
      const target = (event.target as HTMLElement)?.closest?.(
        'a, button, [data-cursor], input, select, textarea, [role="button"]',
      ) as HTMLElement | null
      const nextLabel = target?.getAttribute('data-cursor-label') || ''
      const nextHover = Boolean(target)
      if (nextLabel !== lastLabel) {
        lastLabel = nextLabel
        setLabel(nextLabel)
      }
      if (nextHover !== lastHover) {
        lastHover = nextHover
        setHovering(nextHover)
      }
      gsap.to([dot, ring], { opacity: 1, duration: 0.2, overwrite: 'auto' })
    }

    const onLeave = () => {
      gsap.to([dot, ring], { opacity: 0, duration: 0.2, overwrite: 'auto' })
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      document.documentElement.classList.remove('cursor-none')
      setEnabled(false)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className={enabled ? 'cursor-dot' : 'hidden'} aria-hidden="true" />
      <div
        ref={ringRef}
        className={enabled ? `cursor-ring ${hovering ? 'is-hover' : ''}` : 'hidden'}
        aria-hidden="true"
      >
        <span className="cursor-label">{label}</span>
      </div>
    </>
  )
}
