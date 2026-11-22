import { Suspense, lazy, useEffect, useState } from 'react'
import { useDocumentVisible, useSceneVisibility } from '../../hooks/useSceneVisibility'
import { sceneAllowed } from '../../lib/scene'

const MonolithScene = lazy(() => import('./MonolithScene'))

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

/**
 * The brand monolith behind the hero product: a chrome X sculpted in Three.js.
 * It only boots once the main hero has painted, and it keeps a CSS X as a
 * zero-cost fallback for reduced-motion, data-saver and no-WebGL visitors.
 */
export function XMonolith() {
  const { ref, visible } = useSceneVisibility<HTMLDivElement>('120px')
  const documentVisible = useDocumentVisible()
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!sceneAllowed()) return

    const host = window as IdleWindow
    let idle = 0
    let timer = 0
    const start = () => setEnabled(true)

    if (host.requestIdleCallback) {
      idle = host.requestIdleCallback(start, { timeout: 1800 })
    } else {
      timer = window.setTimeout(start, 900)
    }

    return () => {
      if (idle && host.cancelIdleCallback) host.cancelIdleCallback(idle)
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  return (
    <div ref={ref} className="absolute inset-0" data-monolith aria-hidden="true">
      {!ready && (
        <div className="absolute inset-0 grid place-items-center">
          <span
            className="display select-none text-[clamp(11rem,34vw,28rem)] leading-none text-transparent opacity-[0.09]"
            style={{ WebkitTextStroke: '1.5px #f1eee5', transform: 'rotate(-8deg)' }}
          >
            X
          </span>
        </div>
      )}

      {enabled && (
        <Suspense fallback={null}>
          <MonolithScene
            active={visible && documentVisible}
            onReady={() => setReady(true)}
          />
        </Suspense>
      )}
    </div>
  )
}
