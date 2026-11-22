/**
 * Real product photos grouped by the colour they actually show.
 *
 * The catalogue used to reuse the same four shots for every colourway, which
 * made the colour picker feel decorative. Each colour now owns a small set of
 * local photographs, and the selected colour's shots lead the product gallery.
 */

const shot = (name: string) => `/images/products/${name}.jpg`

export const COLOR_PHOTOS: Record<string, string[]> = {
  Volt: [shot('nova-high-1'), shot('nova-high-3'), shot('nova-high-4')],
  Bone: [
    shot('court-900-1'),
    shot('court-900-2'),
    shot('halo-knit-1'),
    shot('phase-02-2'),
  ],
  Obsidian: [
    shot('vanta-runner-2'),
    shot('vector-elite-2'),
    shot('halo-knit-2'),
    shot('phase-02-1'),
  ],
  Ember: [
    shot('x01-aero-1'),
    shot('static-x-1'),
    shot('element-90-1'),
    shot('x01-aero-3'),
  ],
  Ice: [
    shot('apex-trail-2'),
    shot('apex-trail-4'),
    shot('nova-high-2'),
    shot('lumen-flow-1'),
  ],
  Clay: [
    shot('vanta-runner-1'),
    shot('orbit-low-2'),
    shot('lumen-flow-2'),
    shot('static-x-2'),
  ],
  Moss: [shot('apex-trail-1'), shot('apex-trail-3'), shot('orbit-low-4')],
  Chrome: [
    shot('halo-knit-4'),
    shot('vector-elite-1'),
    shot('vector-elite-3'),
    shot('orbit-low-1'),
  ],
}

type ColorLike = { name: string; image?: string | null; images?: string[] }

/** Attach colour-matched photographs without dropping any custom colour data. */
export function withColorPhotos<T extends ColorLike>(colors: T[]): T[] {
  return colors.map((color) => {
    const images = COLOR_PHOTOS[color.name]
    if (!images?.length) return color
    return {
      ...color,
      image: color.image ?? images[0],
      images: color.images?.length ? color.images : images,
    }
  })
}

/** Backfill existing SQLite rows created before colour photos were introduced. */
export function hydrateColorPhotos(value: string): string {
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return value
    const colors = parsed as ColorLike[]
    const next = withColorPhotos(colors)
    return JSON.stringify(next)
  } catch {
    return value
  }
}
