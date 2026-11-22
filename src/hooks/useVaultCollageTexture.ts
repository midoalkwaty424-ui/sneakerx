import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { createVaultCollage } from '../lib/vault-photos'
import { colorImages, thumbImage } from '../lib/product-visuals'
import type { Product } from '../lib/types'

/**
 * Loads a product's three photos once and bakes them into one small canvas
 * texture. Both the Vault ring and the Drop Portal reuse the same output.
 */
export function useVaultCollageTexture(product: Product) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null)
  const current = useRef<THREE.CanvasTexture | null>(null)
  const urls = useMemo(
    () =>
      colorImages(product, product.colors[0])
        .slice(0, 3)
        .map((url) => thumbImage(url))
        .filter((url): url is string => Boolean(url)),
    [product],
  )

  useEffect(() => {
    let alive = true
    const images: Array<HTMLImageElement | undefined> = [undefined, undefined, undefined]
    let pending = urls.length
    setTexture(null)

    const finish = () => {
      if (!alive || pending > 0) return
      const canvas = createVaultCollage({ main: images[0], details: [images[1], images[2]] })
      if (!canvas) return

      const map = new THREE.CanvasTexture(canvas)
      map.colorSpace = THREE.SRGBColorSpace
      map.anisotropy = 4
      if (!alive) {
        map.dispose()
        return
      }
      current.current?.dispose()
      current.current = map
      setTexture(map)
    }

    if (pending === 0) return () => { alive = false }

    const loaders = urls.map((url, index) => {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.decoding = 'async'
      const done = () => {
        if (!alive) return
        if (image.complete && image.naturalWidth > 0) images[index] = image
        pending -= 1
        finish()
      }
      image.onload = done
      image.onerror = done
      image.src = url
      return image
    })

    return () => {
      alive = false
      loaders.forEach((image) => {
        image.onload = null
        image.onerror = null
      })
      current.current?.dispose()
      current.current = null
    }
  }, [urls])

  return texture
}
