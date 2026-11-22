/**
 * Dependency-free capability checks for the optional 3D scenes.
 *
 * Every scene in the storefront has a photographic fallback, so these checks
 * only decide whether we *upgrade* to WebGL — never whether the section works.
 */

type WebGlContext = WebGLRenderingContext | WebGL2RenderingContext

export function webGlAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const context =
      (canvas.getContext('webgl2') as WebGlContext | null) ??
      (canvas.getContext('webgl') as WebGlContext | null) ??
      (canvas.getContext('experimental-webgl') as WebGlContext | null)
    return Boolean(context)
  } catch {
    return false
  }
}

export function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * True when it is safe and useful to boot a Three.js canvas:
 * WebGL is available, the visitor has not asked for reduced motion and the
 * browser is not in data-saver mode.
 */
export function sceneAllowed(): boolean {
  if (typeof window === 'undefined') return false
  if (reducedMotion()) return false
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
    .connection
  if (connection?.saveData) return false
  return webGlAvailable()
}
