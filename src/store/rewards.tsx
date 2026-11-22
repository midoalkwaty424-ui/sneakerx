import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api'
import type { AppliedCoupon } from '../lib/types'

type StoredRewards = {
  coupon: AppliedCoupon | null
  referralCode: string
  phone: string
}

type RewardsContextValue = {
  coupon: AppliedCoupon | null
  couponCode: string
  couponDiscount: number
  couponApplies: boolean
  referralCode: string
  phone: string
  applyCoupon: (code: string, subtotal: number) => Promise<AppliedCoupon>
  removeCoupon: () => void
  captureReferral: (code: string) => void
  clearReferral: () => void
  rememberPhone: (phone: string) => void
  couponDiscountFor: (subtotal: number) => number
}

const STORAGE_KEY = 'sneakerx.rewards.v1'

const EMPTY: StoredRewards = { coupon: null, referralCode: '', phone: '' }

function load(): StoredRewards {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<StoredRewards>
    const coupon =
      parsed.coupon && typeof parsed.coupon.code === 'string'
        ? (parsed.coupon as AppliedCoupon)
        : null
    return {
      coupon,
      referralCode: typeof parsed.referralCode === 'string' ? parsed.referralCode : '',
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
    }
  } catch {
    return EMPTY
  }
}

function discountFor(coupon: AppliedCoupon | null, subtotal: number) {
  if (!coupon || subtotal <= 0) return 0
  if (subtotal < coupon.minSubtotal) return 0
  const raw = coupon.kind === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value
  const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw
  return Math.max(0, Math.round(Math.min(capped, subtotal)))
}

const RewardsContext = createContext<RewardsContextValue | null>(null)

export function RewardsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredRewards>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage may be unavailable */
    }
  }, [state])

  /* Capture ?ref= referral codes from shared links (works on first load). */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = (params.get('ref') || params.get('referral') || '').trim()
    if (ref) {
      setState((current) =>
        current.referralCode === ref ? current : { ...current, referralCode: ref.toUpperCase() },
      )
    }
  }, [])

  const applyCoupon = useCallback(async (code: string, subtotal: number) => {
    const result = await api.validateCoupon(code, subtotal)
    const applied: AppliedCoupon = {
      code: result.coupon.code,
      kind: result.coupon.kind,
      value: result.coupon.value,
      discount: result.discount,
      description: result.coupon.description,
      minSubtotal: result.coupon.minSubtotal,
      maxDiscount: result.coupon.maxDiscount,
    }
    setState((current) => ({ ...current, coupon: applied }))
    return applied
  }, [])

  const removeCoupon = useCallback(() => {
    setState((current) => ({ ...current, coupon: null }))
  }, [])

  const captureReferral = useCallback((code: string) => {
    const clean = code.trim().toUpperCase()
    if (!clean) return
    setState((current) => ({ ...current, referralCode: clean }))
  }, [])

  const clearReferral = useCallback(() => {
    setState((current) => ({ ...current, referralCode: '' }))
  }, [])

  const rememberPhone = useCallback((phone: string) => {
    setState((current) => (current.phone === phone ? current : { ...current, phone }))
  }, [])

  const value = useMemo<RewardsContextValue>(() => {
    return {
      coupon: state.coupon,
      couponCode: state.coupon?.code ?? '',
      couponDiscount: state.coupon?.discount ?? 0,
      couponApplies: state.coupon != null,
      referralCode: state.referralCode,
      phone: state.phone,
      applyCoupon,
      removeCoupon,
      captureReferral,
      clearReferral,
      rememberPhone,
      couponDiscountFor: (subtotal: number) => discountFor(state.coupon, subtotal),
    }
  }, [
    state.coupon,
    state.referralCode,
    state.phone,
    applyCoupon,
    removeCoupon,
    captureReferral,
    clearReferral,
    rememberPhone,
  ])

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>
}

export function useRewards() {
  const context = useContext(RewardsContext)
  if (!context) throw new Error('useRewards must be used inside RewardsProvider')
  return context
}
