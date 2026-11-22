import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { MAX_QTY_PER_ITEM, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '../lib/constants'
import type { CartItem } from '../lib/types'

type AddPayload = Omit<CartItem, 'key'>

type CartContextValue = {
  items: CartItem[]
  count: number
  subtotal: number
  shipping: number
  total: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addItem: (item: AddPayload) => void
  removeItem: (key: string) => void
  setQty: (key: string, qty: number) => void
  clearCart: () => void
}

const STORAGE_KEY = 'sneakerx.cart.v1'
const CartContext = createContext<CartContextValue | null>(null)

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is CartItem =>
        item &&
        typeof item.key === 'string' &&
        typeof item.productId === 'number' &&
        typeof item.price === 'number' &&
        typeof item.qty === 'number' &&
        typeof item.size === 'string' &&
        typeof item.color === 'string',
    )
  } catch {
    return []
  }
}

const makeKey = (productId: number, size: string, color: string) =>
  `${productId}::${size}::${color}`

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }, [items])

  const addItem = useCallback((payload: AddPayload) => {
    setItems((current) => {
      const key = makeKey(payload.productId, payload.size, payload.color)
      const existing = current.find((item) => item.key === key)
      if (existing) {
        return current.map((item) =>
          item.key === key
            ? { ...item, qty: Math.min(item.qty + payload.qty, MAX_QTY_PER_ITEM) }
            : item,
        )
      }
      return [...current, { ...payload, key, qty: Math.min(payload.qty, MAX_QTY_PER_ITEM) }]
    })
  }, [])

  const removeItem = useCallback((key: string) => {
    setItems((current) => current.filter((item) => item.key !== key))
  }, [])

  const setQty = useCallback((key: string, qty: number) => {
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? { ...item, qty: Math.max(1, Math.min(qty, MAX_QTY_PER_ITEM)) }
          : item,
      ),
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])
  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const { subtotal, count } = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + item.price * item.qty,
        count: acc.count + item.qty,
      }),
      { subtotal: 0, count: 0 },
    )
  }, [items])

  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      subtotal,
      shipping,
      total: subtotal + shipping,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      setQty,
      clearCart,
    }),
    [items, count, subtotal, shipping, isOpen, openCart, closeCart, addItem, removeItem, setQty, clearCart],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside CartProvider')
  return context
}
