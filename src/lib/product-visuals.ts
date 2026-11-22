import type { ColorOption, Product } from './types'

/** Small local versions used by cards and collages to keep the first paint light. */
export function thumbImage(src: string | null | undefined): string | null {
  if (!src) return null
  if (src.startsWith('/images/products/') && !src.startsWith('/images/products/thumbs/')) {
    return src.replace('/images/products/', '/images/products/thumbs/')
  }
  return src
}

/** Colour-matched photos first, then the model's remaining angles. */
export function colorImages(product: Product, color?: ColorOption | null): string[] {
  const own = (color?.images ?? []).filter(Boolean)
  if (!own.length && color?.image) own.push(color.image)
  const gallery = product.images.filter(Boolean)
  if (!own.length) return gallery.slice(0, 4)
  const extra = gallery.filter((image) => !own.includes(image))
  return [...own, ...extra].slice(0, 4)
}

export function colorPrimaryImage(product: Product, color?: ColorOption | null): string | null {
  return color?.image ?? color?.images?.[0] ?? product.images[0] ?? null
}
