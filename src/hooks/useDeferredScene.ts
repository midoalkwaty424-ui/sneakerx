import { useEffect, useState } from 'react'

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (id: number) => void
}

/**
 * Holds optional WebGL scenes back until the first paint has settled.
 * The photographic fallback stays interactive the whole time.
 */
export function useDeferredScene(delay = 1200) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = window as IdleWindow
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      setReady(true)
    }

    const timer = window.setTimeout(done, delay)
    const idleId = host.requestIdleCallback?.(done, { timeout: delay + 800 })

    return () => {
      window.clearTimeout(timer)
      if (idleId !== undefined) host.cancelIdleCallback?.(idleId)
    }
  }, [delay])

  return ready
}
