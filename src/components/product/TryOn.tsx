import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useBodyLock } from '../../hooks/useBodyLock'
import type { TryOnBlend } from '../../lib/tryOn'
import { RealShoePhoto } from '../art/RealShoePhoto'
import { Icon } from '../ui/Icon'

type TryOnProps = {
  open: boolean
  onClose: () => void
  productName: string
  image: string
  blend: TryOnBlend
  colorName?: string
  colorHex?: string
}

type Mode = 'camera' | 'upload' | 'stage'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function TryOn({
  open,
  onClose,
  productName,
  image,
  blend,
  colorName,
  colorHex,
}: TryOnProps) {
  useBodyLock(open)
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [mode, setMode] = useState<Mode>('camera')
  const [cameraError, setCameraError] = useState('')
  const [uploadUrl, setUploadUrl] = useState('')
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(-8)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState('')
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('الكاميرا غير مدعومة على هذا الجهاز — ارفع صورة بدلًا منها.')
      setMode('upload')
      return
    }
    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
    } catch {
      setCameraError('مش قادرين نوصل للكاميرا. ارفع صورة أو جرّب الخلفية الجاهزة.')
      setMode('upload')
    }
  }, [stopCamera])

  useEffect(() => {
    if (!open) {
      stopCamera()
      return
    }
    setOffset({ x: 0, y: 0 })
    setScale(1)
    setRotation(-8)
    setFlash('')
    if (mode === 'camera') void startCamera()
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    if (mode === 'camera') void startCamera()
    else stopCamera()
  }, [mode, open, startCamera, stopCamera])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    setOffset({
      x: drag.ox + (event.clientX - drag.x),
      y: drag.oy + (event.clientY - drag.y),
    })
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  const reset = () => {
    setOffset({ x: 0, y: 0 })
    setScale(1)
    setRotation(-8)
  }

  const snapshot = async () => {
    const stage = stageRef.current
    const overlay = overlayRef.current
    if (!stage || !overlay) return
    setBusy(true)
    try {
      const rect = stage.getBoundingClientRect()
      const canvas = document.createElement('canvas')
      const ratio = window.devicePixelRatio > 1 ? 2 : 1
      canvas.width = Math.round(rect.width * ratio)
      canvas.height = Math.round(rect.height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(ratio, ratio)

      const video = videoRef.current
      if (mode === 'camera' && video && video.readyState >= 2) {
        const vw = video.videoWidth || rect.width
        const vh = video.videoHeight || rect.height
        const cover = Math.max(rect.width / vw, rect.height / vh)
        const dw = vw * cover
        const dh = vh * cover
        ctx.save()
        ctx.translate(rect.width / 2, rect.height / 2)
        ctx.scale(-1, 1)
        ctx.drawImage(video, -dw / 2, -dh / 2, dw, dh)
        ctx.restore()
      } else if (mode === 'upload' && uploadUrl) {
        const img = await loadImage(uploadUrl)
        const cover = Math.max(rect.width / img.width, rect.height / img.height)
        const dw = img.width * cover
        const dh = img.height * cover
        ctx.drawImage(img, (rect.width - dw) / 2, (rect.height - dh) / 2, dw, dh)
      } else {
        const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
        gradient.addColorStop(0, '#12161d')
        gradient.addColorStop(1, '#1c2430')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, rect.width, rect.height)
      }

      const photo = overlay.querySelector('img')
      if (photo && photo.complete && photo.naturalWidth > 0) {
        await photo.decode().catch(() => undefined)
        const oRect = overlay.getBoundingClientRect()
        const centerX = oRect.left - rect.left + oRect.width / 2
        const centerY = oRect.top - rect.top + oRect.height / 2
        const w = oRect.width
        const h = oRect.height

        // Reproduce the soft radial edge mask on an offscreen canvas so the
        // saved PNG matches what the visitor sees on screen.
        const offscreen = document.createElement('canvas')
        offscreen.width = Math.max(1, Math.round(w * ratio))
        offscreen.height = Math.max(1, Math.round(h * ratio))
        const octx = offscreen.getContext('2d')
        if (octx) {
          octx.scale(ratio, ratio)
          octx.drawImage(photo, 0, 0, w, h)
          octx.globalCompositeOperation = 'destination-in'
          const mask = octx.createRadialGradient(
            w / 2,
            h * 0.52,
            Math.min(w, h) * 0.16,
            w / 2,
            h * 0.52,
            Math.max(w, h) * 0.62,
          )
          mask.addColorStop(0, 'rgba(0,0,0,1)')
          mask.addColorStop(0.72, 'rgba(0,0,0,1)')
          mask.addColorStop(1, 'rgba(0,0,0,0)')
          octx.fillStyle = mask
          octx.fillRect(0, 0, w, h)
          octx.globalCompositeOperation = 'source-over'

          ctx.save()
          ctx.translate(centerX, centerY)
          ctx.rotate((rotation * Math.PI) / 180)
          if (blend !== 'normal') ctx.globalCompositeOperation = blend
          ctx.drawImage(offscreen, -w / 2, -h / 2, w, h)
          ctx.restore()
        }
      }

      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `sneakerx-tryon-${productName.replace(/\s+/g, '-').toLowerCase()}.png`
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 2000)
        setFlash('اتحفظت الصورة ✓')
        window.setTimeout(() => setFlash(''), 2200)
      }, 'image/png')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-ink/90 p-3 backdrop-blur-md sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="تجربة الحذاء على الكاميرا"
          data-tryon
        >
          <motion.div
            initial={{ y: 30, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-bone/15 bg-ink2 shadow-[0_40px_120px_rgba(0,0,0,.8)]"
          >
            <div className="flex items-center gap-3 border-b border-line/70 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-volt text-ink">
                <Icon name="eye" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold">جرّب {productName}</p>
                  {colorHex && (
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-ink px-2 py-0.5 text-[9px] text-muted">
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-bone/30"
                        style={{ background: colorHex }}
                      />
                      {colorName ?? 'اللون المختار'}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted">
                  معاينة 2D بصورة المنتج الحقيقية — حرّك الحذاء واضبط الحجم والدوران.
                </p>
              </div>
              <button
                type="button"
                className="icon-btn h-8 w-8"
                onClick={onClose}
                aria-label="إغلاق المعاينة"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            <div
              ref={stageRef}
              className="relative aspect-[4/5] w-full overflow-hidden bg-ink3 sm:aspect-[16/10]"
              data-tryon-stage
            >
              {mode === 'camera' && (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="h-full w-full scale-x-[-1] object-cover"
                />
              )}
              {mode === 'upload' && uploadUrl && (
                <img src={uploadUrl} alt="صورة مرفوعة" className="h-full w-full object-cover" />
              )}
              {mode === 'stage' && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#232b38,#0b0d11_70%)]">
                  <div className="absolute inset-0 opacity-[0.15] [background-image:linear-gradient(#8f97a2_1px,transparent_1px),linear-gradient(90deg,#8f97a2_1px,transparent_1px)] [background-size:42px_42px]" />
                </div>
              )}
              {mode === 'upload' && !uploadUrl && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted transition hover:text-bone"
                >
                  <Icon name="upload" className="h-8 w-8" />
                  <span className="text-xs">ارفع صورة لقدمك أو المكان</span>
                </button>
              )}

              <div
                ref={overlayRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="absolute left-1/2 top-[58%] h-[38%] w-[72%] max-w-[420px] cursor-grab touch-none select-none active:cursor-grabbing"
                style={{
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale})`,
                }}
                data-tryon-overlay
              >
                {image ? (
                  <RealShoePhoto
                    src={image}
                    alt={`صورة ${productName} الحقيقية`}
                    blend={blend}
                    loading="eager"
                    className="h-full w-full will-change-transform"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center rounded-xl border border-dashed border-bone/20 text-[10px] text-muted">
                    صورة المنتج غير متاحة
                  </div>
                )}
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-2">
                <span className="rounded-full bg-ink/70 px-2.5 py-1 text-[9px] tracking-wide text-bone/80 backdrop-blur">
                  صورة المنتج الحقيقية · معاينة 2D · اسحب الحذاء · {mode === 'camera' ? 'كاميرا مباشرة' : mode === 'upload' ? 'صورة' : 'خلفية'}
                </span>
              </div>
              {flash && (
                <div className="absolute inset-x-0 bottom-3 flex justify-center">
                  <span className="rounded-full bg-volt px-3 py-1 text-[10px] font-bold text-ink">
                    {flash}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-line/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`chip ${mode === 'camera' ? 'chip-active' : ''}`}
                  onClick={() => setMode('camera')}
                >
                  كاميرا
                </button>
                <button
                  type="button"
                  className={`chip ${mode === 'upload' ? 'chip-active' : ''}`}
                  onClick={() => {
                    setMode('upload')
                    if (!uploadUrl) fileRef.current?.click()
                  }}
                >
                  صورة
                </button>
                <button
                  type="button"
                  className={`chip ${mode === 'stage' ? 'chip-active' : ''}`}
                  onClick={() => setMode('stage')}
                >
                  خلفية
                </button>
                <button type="button" className="chip ms-auto" onClick={reset}>
                  إعادة ضبط
                </button>
              </div>

              {cameraError && <p className="text-[11px] text-flare">{cameraError}</p>}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 flex items-center justify-between text-[10px] text-muted">
                    <span>الحجم</span>
                    <span>{Math.round(scale * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min={0.4}
                    max={2}
                    step={0.05}
                    value={scale}
                    onChange={(event) => setScale(clamp(Number(event.target.value), 0.4, 2))}
                    className="w-full accent-volt"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 flex items-center justify-between text-[10px] text-muted">
                    <span>الدوران</span>
                    <span>{rotation}°</span>
                  </span>
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    step={1}
                    value={rotation}
                    onChange={(event) => setRotation(Number(event.target.value))}
                    className="w-full accent-volt"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn btn-volt flex-1"
                  onClick={() => void snapshot()}
                  disabled={busy}
                >
                  <Icon name="upload" className="h-4 w-4 rotate-180" />
                  حفظ الصورة
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => fileRef.current?.click()}
                >
                  رفع صورة
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      setUploadUrl(String(reader.result || ''))
                      setMode('upload')
                    }
                    reader.readAsDataURL(file)
                  }}
                />
              </div>
              <p className="text-[9px] leading-4 text-muted/70">
                المعاينة تستخدم صورة المنتج الحقيقية، بتتولد على جهازك ومش بتترفع للسيرفر. التقريب
                بصري وليس قياسًا حقيقيًا للمقاس.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}
