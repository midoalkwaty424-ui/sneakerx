import { useEffect, useState, type Ref } from 'react'
import { RealShoePhoto } from '../art/RealShoePhoto'
import { cx } from '../../lib/format'
import { thumbImage } from '../../lib/product-visuals'

type ProductVisualProps = {
  image?: string | null
  base?: string
  accent?: string
  alt: string
  className?: string
  /** Applied only to the fallback photo, so real shots and fallback can be framed differently. */
  artClassName?: string
  priority?: boolean
  fit?: 'contain' | 'cover'
  sizes?: string
  imgRef?: Ref<HTMLImageElement>
}

export function ProductVisual({
  image,
  alt,
  className,
  artClassName,
  priority = false,
  fit = 'contain',
  sizes,
  imgRef,
}: ProductVisualProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [image])

  const setRef = (node: HTMLImageElement | null) => {
    if (typeof imgRef === 'function') imgRef(node)
    else if (imgRef) (imgRef as { current: HTMLImageElement | null }).current = node
  }

  if (image && !failed) {
    // Local catalog shots have 480px thumb and 900px full variants. Let the
    // browser pick the smaller one on phones instead of downloading the full
    // image and downscaling it. Remote/Unsplash URLs stay as-is.
    const thumb = thumbImage(image)
    const full = image.replace('/images/products/thumbs/', '/images/products/')
    const srcSet = thumb !== full ? `${thumb} 480w, ${full} 900w` : undefined

    return (
      <img
        ref={setRef}
        src={thumb ?? image}
        srcSet={srcSet}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'low'}
        sizes={sizes}
        onError={() => setFailed(true)}
        className={cx('h-full w-full', fit === 'cover' ? 'object-cover' : 'object-contain', className)}
      />
    )
  }

  return (
    <RealShoePhoto
      src="/images/products/x01-aero-1.jpg"
      alt={alt}
      blend="screen"
      className={cx('h-full', artClassName ?? className)}
    />
  )
}
