import { cx } from '../../lib/format'

/**
 * Soft, elliptical edge fade that lets a real studio product photo sit on any
 * dark/light surface without a visible rectangular border.
 */
const EDGE_MASK = 'radial-gradient(ellipse 74% 66% at 50% 52%, #000 68%, transparent 100%)'

type RealShoePhotoProps = {
  src: string
  alt: string
  className?: string
  /** Light seamless backgrounds use multiply, dark ones use screen. */
  blend?: 'screen' | 'multiply' | 'normal'
  mask?: boolean
  loading?: 'eager' | 'lazy'
}

export function RealShoePhoto({
  src,
  alt,
  className,
  blend = 'screen',
  mask = true,
  loading = 'lazy',
}: RealShoePhotoProps) {
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      loading={loading}
      decoding="async"
      className={cx(
        'block w-full object-contain',
        blend === 'screen' && 'mix-blend-screen',
        blend === 'multiply' && 'mix-blend-multiply',
        className,
      )}
      style={mask ? { maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK } : undefined}
    />
  )
}
