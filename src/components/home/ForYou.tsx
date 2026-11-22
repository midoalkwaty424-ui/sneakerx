import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { track, itemPayload } from '../../lib/analytics'
import type { Product } from '../../lib/types'
import { useShop } from '../../store/shop'
import { ProductCard } from '../commerce/ProductCard'
import { Icon } from '../ui/Icon'

export function ForYou() {
  const { wishlist, recent, compare } = useShop()
  const [items, setItems] = useState<Product[]>([])
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [basis, setBasis] = useState('')
  const [loading, setLoading] = useState(true)

  const slugs = useMemo(() => {
    const seen = new Set<string>()
    const ordered = [...wishlist, ...recent, ...compare].map((item) => item.slug)
    return ordered.filter((slug) => {
      if (seen.has(slug)) return false
      seen.add(slug)
      return true
    })
  }, [wishlist, recent, compare])

  const key = slugs.slice(0, 8).join(',')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    api
      .recommendations(slugs.slice(0, 8), 4, controller.signal)
      .then((response) => {
        setItems(response.items)
        setReasons(response.reasons ?? {})
        setBasis(response.basis)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    if (!loading && items.length > 0) {
      track('view_item_list', {
        list_name: 'for_you',
        items: items.map((product) => itemPayload(product)),
      })
    }
  }, [loading, items])

  if (!loading && items.length === 0) return null

  return (
    <section className="border-t border-line/60 py-12 md:py-16" data-for-you>
      <div className="container-x">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-volt" />
              <span className="eyebrow">CURATED FOR YOU</span>
            </div>
            <h2 className="display text-[clamp(1.8rem,4.2vw,3.2rem)]">
              FOR <span className="display-italic lowercase text-volt">you</span>
            </h2>
            {basis && <p className="mt-2 text-xs text-muted">{basis}</p>}
          </div>
          <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[10px] text-muted">
            <Icon name="sparkle" className="h-3.5 w-3.5 text-volt" />
            ترشيحات ذكية من المتجر
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="h-[320px] animate-pulse rounded-2xl border border-line/60 bg-ink2"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {items.map((product, index) => (
              <div key={product.slug} className="flex flex-col gap-2">
                {reasons[product.slug] && (
                  <p className="flex items-center gap-1.5 px-1 text-[10px] text-muted">
                    <Icon name="sparkle" className="h-3 w-3 shrink-0 text-volt" />
                    <span className="truncate">{reasons[product.slug]}</span>
                  </p>
                )}
                <ProductCard product={product} index={index} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
