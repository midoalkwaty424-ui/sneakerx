import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/** A lightweight product snapshot so wishlist / compare / recent need no extra fetches. */
export type ShopItem = {
  slug: string
  name: string
  subtitle?: string
  image: string | null
  price: number
  comparePrice?: number | null
}

type ShopState = {
  wishlist: ShopItem[]
  compare: ShopItem[]
  recent: ShopItem[]
}

type CompareResult = { added: boolean; full: boolean }

type ShopContextValue = {
  wishlist: ShopItem[]
  compare: ShopItem[]
  recent: ShopItem[]
  wishlistCount: number
  compareCount: number
  isWishlisted: (slug: string) => boolean
  isCompared: (slug: string) => boolean
  toggleWishlist: (item: ShopItem) => boolean
  toggleCompare: (item: ShopItem) => CompareResult
  removeCompare: (slug: string) => void
  clearCompare: () => void
  addRecent: (item: ShopItem) => void
  clearRecent: () => void
}

export const COMPARE_LIMIT = 3
export const RECENT_LIMIT = 8
const WISHLIST_LIMIT = 24
const STORAGE_KEY = 'sneakerx.shop.v1'

const EMPTY: ShopState = { wishlist: [], compare: [], recent: [] }

const ShopContext = createContext<ShopContextValue | null>(null)

function isShopItem(value: unknown): value is ShopItem {
  if (!value || typeof value !== 'object') return false
  const item = value as ShopItem
  return (
    typeof item.slug === 'string' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    (item.image === null || typeof item.image === 'string')
  )
}

function readList(value: unknown, limit: number): ShopItem[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const list: ShopItem[] = []
  for (const entry of value) {
    if (!isShopItem(entry) || seen.has(entry.slug)) continue
    seen.add(entry.slug)
    list.push(entry)
    if (list.length >= limit) break
  }
  return list
}

function loadState(): ShopState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<ShopState> | null
    if (!parsed || typeof parsed !== 'object') return EMPTY
    return {
      wishlist: readList(parsed.wishlist, WISHLIST_LIMIT),
      compare: readList(parsed.compare, COMPARE_LIMIT),
      recent: readList(parsed.recent, RECENT_LIMIT),
    }
  } catch {
    return EMPTY
  }
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShopState>(loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }, [state])

  /* Keep multiple tabs in sync. */
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      setState(loadState())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggleWishlist = useCallback(
    (item: ShopItem) => {
      const exists = state.wishlist.some((entry) => entry.slug === item.slug)
      setState((current) => {
        const inList = current.wishlist.some((entry) => entry.slug === item.slug)
        return {
          ...current,
          wishlist: inList
            ? current.wishlist.filter((entry) => entry.slug !== item.slug)
            : [item, ...current.wishlist].slice(0, WISHLIST_LIMIT),
        }
      })
      return !exists
    },
    [state.wishlist],
  )

  const toggleCompare = useCallback(
    (item: ShopItem): CompareResult => {
      const exists = state.compare.some((entry) => entry.slug === item.slug)
      if (!exists && state.compare.length >= COMPARE_LIMIT) {
        return { added: false, full: true }
      }
      setState((current) => {
        const inList = current.compare.some((entry) => entry.slug === item.slug)
        return {
          ...current,
          compare: inList
            ? current.compare.filter((entry) => entry.slug !== item.slug)
            : [...current.compare, item].slice(0, COMPARE_LIMIT),
        }
      })
      return { added: !exists, full: false }
    },
    [state.compare],
  )

  const removeCompare = useCallback((slug: string) => {
    setState((current) => ({
      ...current,
      compare: current.compare.filter((entry) => entry.slug !== slug),
    }))
  }, [])

  const clearCompare = useCallback(() => {
    setState((current) => ({ ...current, compare: [] }))
  }, [])

  const addRecent = useCallback((item: ShopItem) => {
    setState((current) => {
      const next = [item, ...current.recent.filter((entry) => entry.slug !== item.slug)]
      return { ...current, recent: next.slice(0, RECENT_LIMIT) }
    })
  }, [])

  const clearRecent = useCallback(() => {
    setState((current) => ({ ...current, recent: [] }))
  }, [])

  const value = useMemo<ShopContextValue>(
    () => ({
      wishlist: state.wishlist,
      compare: state.compare,
      recent: state.recent,
      wishlistCount: state.wishlist.length,
      compareCount: state.compare.length,
      isWishlisted: (slug: string) => state.wishlist.some((entry) => entry.slug === slug),
      isCompared: (slug: string) => state.compare.some((entry) => entry.slug === slug),
      toggleWishlist,
      toggleCompare,
      removeCompare,
      clearCompare,
      addRecent,
      clearRecent,
    }),
    [state, toggleWishlist, toggleCompare, removeCompare, clearCompare, addRecent, clearRecent],
  )

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShop() {
  const context = useContext(ShopContext)
  if (!context) throw new Error('useShop must be used inside ShopProvider')
  return context
}

/** Convert a full product into the small snapshot the shop store keeps. */
export function toShopItem(product: {
  slug: string
  name: string
  subtitle?: string
  images: string[]
  price: number
  comparePrice?: number | null
}): ShopItem {
  return {
    slug: product.slug,
    name: product.name,
    subtitle: product.subtitle,
    image: product.images[0] ?? null,
    price: product.price,
    comparePrice: product.comparePrice ?? null,
  }
}
