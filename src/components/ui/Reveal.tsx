import { useEffect, useRef, type ReactNode } from 'react'
import { cx } from '../../lib/format'
import { prefersReducedMotion } from '../../lib/gsap'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (prefersReducedMotion()) {
      element.classList.add('is-visible')
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            element.style.transitionDelay = `${delay}ms`
            element.classList.add('is-visible')
            observer.disconnect()
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={cx('reveal', className)}>
      {children}
    </div>
  )
}
