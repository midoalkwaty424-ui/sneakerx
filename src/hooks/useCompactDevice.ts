import { useEffect, useState } from 'react'

/** Phones and tablets: coarse pointers or narrow viewports. */
const COMPACT_QUERY = '(max-width: 900px), (pointer: coarse)'

export function isCompactDevice(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(COMPACT_QUERY).matches
}

/** Reactive version for components that adjust layout or payload size. */
export function useCompactDevice(): boolean {
  const [compact, setCompact] = useState(isCompactDevice)

  useEffect(() => {
    const query = window.matchMedia(COMPACT_QUERY)
    const sync = () => setCompact(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return compact
}
