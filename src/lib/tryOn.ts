export type TryOnBlend = 'multiply' | 'screen' | 'normal'

export type TryOnVisual = {
  src: string
  blend: TryOnBlend
}

type ProductLike = {
  slug: string
  images: string[]
}

/**
 * Picks the best real product photo for the 2D try-on preview.
 *
 * The index/mode pairs are based on the actual studio background of each
 * photo: light seamless backgrounds blend with `multiply`, dark seamless
 * backgrounds blend with `screen`. Photos without a clean background fall
 * back to a soft radial mask (`normal`).
 */
const TRYON_PRESETS: Record<string, { index: number; blend: TryOnBlend }> = {
  'court-900': { index: 0, blend: 'multiply' },
  'element-90': { index: 1, blend: 'multiply' },
  'halo-knit': { index: 0, blend: 'multiply' },
  'nova-high': { index: 0, blend: 'multiply' },
  'phase-02': { index: 1, blend: 'multiply' },
  'vanta-runner': { index: 1, blend: 'screen' },
  'vector-elite': { index: 1, blend: 'screen' },
  'x01-aero': { index: 0, blend: 'screen' },
}

export function tryOnVisual(product: ProductLike): TryOnVisual {
  const preset = TRYON_PRESETS[product.slug]
  if (!preset) {
    return { src: product.images[0] ?? '', blend: 'normal' }
  }
  return {
    src: product.images[preset.index] ?? product.images[0] ?? '',
    blend: preset.blend,
  }
}
