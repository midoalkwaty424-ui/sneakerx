export const VAULT_COLLAGE = {
  width: 512,
  height: 592,
  main: { x: 26, y: 18, width: 460, height: 350, radius: 22 },
  details: [
    { x: 26, y: 386, width: 222, height: 140, radius: 16 },
    { x: 264, y: 386, width: 222, height: 140, radius: 16 },
  ],
} as const

export type VaultCollageSlot = {
  x: number
  y: number
  width: number
  height: number
  radius: number
}

export type VaultPhotoSet = {
  main?: HTMLImageElement | null
  details?: Array<HTMLImageElement | null | undefined>
}

function roundedPath(context: CanvasRenderingContext2D, slot: VaultCollageSlot) {
  const radius = Math.min(slot.radius, slot.width / 2, slot.height / 2)
  context.beginPath()
  context.moveTo(slot.x + radius, slot.y)
  context.arcTo(slot.x + slot.width, slot.y, slot.x + slot.width, slot.y + slot.height, radius)
  context.arcTo(slot.x + slot.width, slot.y + slot.height, slot.x, slot.y + slot.height, radius)
  context.arcTo(slot.x, slot.y + slot.height, slot.x, slot.y, radius)
  context.arcTo(slot.x, slot.y, slot.x + slot.width, slot.y, radius)
  context.closePath()
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, slot: VaultCollageSlot) {
  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height
  if (!sourceWidth || !sourceHeight) return

  const scale = Math.max(slot.width / sourceWidth, slot.height / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale

  context.drawImage(
    image,
    slot.x + (slot.width - width) / 2,
    slot.y + (slot.height - height) / 2,
    width,
    height,
  )
}

const brightnessCache = new WeakMap<HTMLImageElement, number>()

/** Downsample once to estimate exposure; brighter studio shots get a stronger wash. */
function imageBrightness(image: HTMLImageElement) {
  const cached = brightnessCache.get(image)
  if (cached !== undefined) return cached

  if (typeof document === 'undefined') return 0.5
  const probe = document.createElement('canvas')
  probe.width = 16
  probe.height = 16
  const context = probe.getContext('2d', { willReadFrequently: true })
  if (!context) return 0.5

  try {
    context.drawImage(image, 0, 0, 16, 16)
    const pixels = context.getImageData(0, 0, 16, 16).data
    let sum = 0
    for (let index = 0; index < pixels.length; index += 4) {
      sum += (0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2]) / 255
    }
    const value = sum / (pixels.length / 4)
    brightnessCache.set(image, value)
    return value
  } catch {
    return 0.5
  }
}

function paintSlot(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null | undefined,
  slot: VaultCollageSlot,
  variant: 'main' | 'detail',
) {
  context.save()
  roundedPath(context, slot)
  context.clip()
  context.fillStyle = '#0d1117'
  context.fillRect(slot.x, slot.y, slot.width, slot.height)

  if (image) {
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    drawCover(context, image, slot)

    const brightness = imageBrightness(image)
    const baseWash = Math.min(
      variant === 'main' ? 0.6 : 0.66,
      (variant === 'main' ? 0.16 : 0.22) + brightness * (variant === 'main' ? 0.4 : 0.42),
    )
    context.fillStyle = `rgba(5,8,12,${baseWash.toFixed(3)})`
    context.fillRect(slot.x, slot.y, slot.width, slot.height)

    const edgeShade = context.createLinearGradient(0, slot.y, 0, slot.y + slot.height)
    edgeShade.addColorStop(0, 'rgba(5,8,12,0)')
    edgeShade.addColorStop(0.55, 'rgba(5,8,12,0.04)')
    edgeShade.addColorStop(1, variant === 'main' ? 'rgba(5,8,12,0.2)' : 'rgba(5,8,12,0.14)')
    context.fillStyle = edgeShade
    context.fillRect(slot.x, slot.y, slot.width, slot.height)
  } else {
    context.strokeStyle = 'rgba(241,238,229,0.06)'
    context.lineWidth = 1
    for (let x = slot.x - slot.height; x < slot.x + slot.width; x += 14) {
      context.beginPath()
      context.moveTo(x, slot.y + slot.height)
      context.lineTo(x + slot.height, slot.y)
      context.stroke()
    }
  }
  context.restore()

  context.save()
  roundedPath(context, slot)
  context.strokeStyle =
    variant === 'main' ? 'rgba(241,238,229,0.2)' : 'rgba(241,238,229,0.13)'
  context.lineWidth = variant === 'main' ? 1.6 : 1.2
  context.stroke()
  context.restore()
}

/**
 * Builds one small canvas per product: a large hero shot plus two detail shots.
 * Keeping the collage in a single texture gives every Vault card the same framing
 * and costs far fewer draw calls than three separate photo planes.
 */
export function createVaultCollage(images: VaultPhotoSet): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = VAULT_COLLAGE.width
  canvas.height = VAULT_COLLAGE.height
  const context = canvas.getContext('2d')
  if (!context) return null

  /* Opaque base keeps the texture reliable under every WebGL blending path. */
  context.fillStyle = '#090c11'
  context.fillRect(0, 0, VAULT_COLLAGE.width, VAULT_COLLAGE.height)

  const panel: VaultCollageSlot = { x: 12, y: 8, width: 488, height: 576, radius: 30 }

  context.save()
  context.shadowColor = 'rgba(0,0,0,0.56)'
  context.shadowBlur = 20
  context.shadowOffsetY = 10
  context.fillStyle = 'rgba(9,12,17,0.96)'
  roundedPath(context, panel)
  context.fill()
  context.restore()

  context.save()
  roundedPath(context, panel)
  context.strokeStyle = 'rgba(241,238,229,0.09)'
  context.lineWidth = 1
  context.stroke()
  context.restore()

  paintSlot(context, images.main, VAULT_COLLAGE.main, 'main')
  VAULT_COLLAGE.details.forEach((slot, index) => {
    paintSlot(context, images.details?.[index], slot, 'detail')
  })

  context.fillStyle = 'rgba(217,255,67,0.82)'
  context.fillRect(26, 552, 52, 3)
  context.fillStyle = 'rgba(241,238,229,0.1)'
  context.fillRect(86, 553, 400, 1)

  return canvas
}
