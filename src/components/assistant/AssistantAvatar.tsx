import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useDeferredScene } from '../../hooks/useDeferredScene'
import { sceneAllowed } from '../../lib/scene'
import { useDocumentVisible } from '../../hooks/useSceneVisibility'
import type { AssistantPointer } from '../three/AssistantHologramScene'

const HologramScene = lazy(() => import('../three/AssistantHologramScene'))

const clamp = (value: number) => Math.max(-1, Math.min(1, value))

/** Static CSS hologram for phones and low-power devices — no WebGL, no frames. */
function FallbackIcon() {
  return (
    <span className="relative grid h-full w-full place-items-center" aria-hidden="true">
      <span className="absolute inset-[8%] rounded-full bg-gradient-to-b from-volt/45 via-volt/10 to-transparent ring-1 ring-volt/25" />
      <span className="absolute inset-[20%] overflow-hidden rounded-[42%] bg-gradient-to-b from-bone/95 to-bone/40 shadow-[0_0_18px_rgba(217,255,67,.25)]">
        <span className="absolute left-[25%] top-[38%] h-[13%] w-[13%] rounded-full bg-ink" />
        <span className="absolute right-[25%] top-[38%] h-[13%] w-[13%] rounded-full bg-ink" />
        <span className="absolute left-[13%] top-[53%] h-[9%] w-[13%] rounded-full bg-flare/30" />
        <span className="absolute right-[13%] top-[53%] h-[9%] w-[13%] rounded-full bg-flare/30" />
        <span className="absolute left-[38%] top-[63%] h-[7%] w-[24%] rounded-b-full border-b-2 border-ink" />
      </span>
    </span>
  )
}

/**
 * The assistant's floating avatar. On capable devices it upgrades from the
 * flat sparkle to a hologram that follows the cursor — or a finger dragging
 * anywhere on the screen — after the first paint has settled.
 */
export function AssistantAvatar() {
  const deferred = useDeferredScene(700)
  const documentVisible = useDocumentVisible()
  const [enabled, setEnabled] = useState(false)
  const [hovered, setHovered] = useState(false)
  const pointer = useRef<AssistantPointer>({ x: 0, y: 0 })
  const avatarRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!deferred || !sceneAllowed()) return

    const track = (clientX: number, clientY: number) => {
      pointer.current = {
        x: clamp((clientX / window.innerWidth) * 2 - 1),
        y: clamp(1 - (clientY / window.innerHeight) * 2),
      }
      avatarRef.current?.setAttribute('data-pointer-x', String(Math.round(pointer.current.x * 100)))
      avatarRef.current?.setAttribute('data-pointer-y', String(Math.round(pointer.current.y * 100)))
    }
    const onPointer = (event: PointerEvent) => track(event.clientX, event.clientY)
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (touch) track(touch.clientX, touch.clientY)
    }
    const reset = () => {
      pointer.current = { x: 0, y: 0 }
      avatarRef.current?.setAttribute('data-pointer-x', '0')
      avatarRef.current?.setAttribute('data-pointer-y', '0')
    }

    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onPointer, { passive: true })
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', reset, { passive: true })
    document.addEventListener('mouseleave', reset)
    setEnabled(true)

    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('touchstart', onTouch)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', reset)
      document.removeEventListener('mouseleave', reset)
    }
  }, [deferred])

  return (
    <span
      ref={avatarRef}
      data-assistant-avatar
      aria-hidden="true"
      className="relative block h-full w-full shrink-0"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {enabled ? (
        <Suspense fallback={<FallbackIcon />}>
          <HologramScene
            pointer={pointer}
            active={documentVisible}
            hovered={hovered}
          />
        </Suspense>
      ) : (
        <FallbackIcon />
      )}
    </span>
  )
}
