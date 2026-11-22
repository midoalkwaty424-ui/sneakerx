import { api } from './api'

/**
 * Analytics has two layers:
 *  - First-party events always go to our own API (no cookies, no third parties).
 *  - GA4 / Meta Pixel only load after the visitor accepts the consent banner.
 */
const CONSENT_KEY = 'sneakerx.consent.v1'

export type ConsentValue = 'granted' | 'denied' | null

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean }
  }
}

export function getConsent(): ConsentValue {
  try {
    const value = localStorage.getItem(CONSENT_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

const listeners = new Set<(value: ConsentValue) => void>()

export function setConsent(value: 'granted' | 'denied') {
  try {
    localStorage.setItem(CONSENT_KEY, value)
  } catch {
    /* storage may be unavailable */
  }
  listeners.forEach((listener) => listener(value))
  if (value === 'granted') initThirdParty()
}

export function onConsentChange(listener: (value: ConsentValue) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

let thirdPartyReady = false

function injectScript(id: string, src: string) {
  if (document.getElementById(id)) return
  const script = document.createElement('script')
  script.id = id
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

function initThirdParty() {
  if (thirdPartyReady || typeof window === 'undefined') return
  thirdPartyReady = true

  const ga4 = import.meta.env.VITE_GA4_ID as string | undefined
  const pixel = import.meta.env.VITE_META_PIXEL_ID as string | undefined

  if (ga4) {
    window.dataLayer = window.dataLayer || []
    window.gtag =
      window.gtag ||
      function gtag(...args: unknown[]) {
        window.dataLayer!.push(args)
      }
    injectScript('ga4-script', `https://www.googletagmanager.com/gtag/js?id=${ga4}`)
    window.gtag!('js', new Date())
    window.gtag!('config', ga4, { send_page_view: false })
  }

  if (pixel) {
    window.fbq =
      window.fbq ||
      (function fbq(...args: unknown[]) {
        if (!window.fbq) return
        window.fbq.queue = window.fbq.queue || []
        window.fbq.queue.push(args)
      } as Window['fbq'])
    injectScript('meta-pixel', 'https://connect.facebook.net/en_US/fbevents.js')
    window.fbq!('init', pixel)
  }
}

const META_EVENTS: Record<string, string> = {
  view_item: 'ViewContent',
  view_item_list: 'ViewContent',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
  search: 'Search',
  add_to_wishlist: 'AddToWishlist',
}

export type AnalyticsPayload = Record<string, unknown>

/** Fire a storefront event. Never throws and never blocks the UI. */
export function track(name: string, payload: AnalyticsPayload = {}) {
  if (typeof window === 'undefined') return
  const path = window.location.pathname + window.location.search
  api.track(name, path, payload).catch(() => {
    /* analytics must never break the storefront */
  })
  if (getConsent() !== 'granted') return
  initThirdParty()
  try {
    window.gtag?.('event', name, payload)
    const metaEvent = META_EVENTS[name]
    if (metaEvent) window.fbq?.('track', metaEvent, payload)
  } catch {
    /* third-party failures are non-fatal */
  }
}

export function trackPageView(path: string) {
  if (getConsent() !== 'granted') return
  initThirdParty()
  try {
    window.gtag?.('event', 'page_view', { page_path: path })
    window.fbq?.('track', 'PageView')
  } catch {
    /* noop */
  }
}

/** Compact GA4-style item payload used by product lists and carts. */
export function itemPayload(product: {
  slug: string
  name: string
  price: number
  category?: { name: string } | null
  colors?: { name: string }[]
}) {
  return {
    item_id: product.slug,
    item_name: product.name,
    item_category: product.category?.name ?? '',
    item_variant: product.colors?.[0]?.name ?? '',
    price: product.price,
    currency: 'EGP',
  }
}

if (typeof window !== 'undefined' && getConsent() === 'granted') {
  // Re-load pixels on a returning visit where consent was already granted.
  initThirdParty()
}
