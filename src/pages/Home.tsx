import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, errorMessage } from '../lib/api'
import type { Product } from '../lib/types'
import { usePageMeta } from '../hooks/usePageMeta'
import { useCompactDevice } from '../hooks/useCompactDevice'
import { organizationJsonLd, websiteJsonLd } from '../lib/seo'
import { Hero } from '../components/home/Hero'
import { MarqueeBand } from '../components/home/MarqueeBand'
import { SneakerVault } from '../components/home/SneakerVault'
import { DropPortal } from '../components/home/DropPortal'
import { NewArrivals } from '../components/home/NewArrivals'
import { Lookbook } from '../components/home/Lookbook'
import { CollectionsSplit } from '../components/home/CollectionsSplit'
import { StorySection } from '../components/home/StorySection'
import { TopoBand } from '../components/home/TopoBand'
import { BestSellers } from '../components/home/BestSellers'
import { ForYou } from '../components/home/ForYou'
import { RecentlyViewed } from '../components/home/RecentlyViewed'
import { WhySection } from '../components/home/WhySection'
import { SocialStrip } from '../components/home/SocialStrip'
import { Icon } from '../components/ui/Icon'

export default function Home() {
  usePageMeta(
    'SNEAKERX — Motion. Form. Sneakers.',
    'تجربة سنيكرز سينمائية من القاهرة: إصدارات محدودة، تصاميم أصلية، شحن لكل محافظات مصر والدفع عند الاستلام.',
    {
      canonical: '/',
      image: '/images/products/x01-aero-1.jpg',
      jsonLd: [organizationJsonLd(), websiteJsonLd()],
    },
  )

  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const compact = useCompactDevice()

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    const controller = new AbortController()
    api
      .products({ limit: compact ? 12 : 24, sort: 'newest' }, controller.signal)
      .then((result) => {
        setProducts(result.items)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(errorMessage(err))
        setLoading(false)
      })
    return controller
  }, [compact])

  useEffect(() => {
    const controller = load()
    return () => controller.abort()
  }, [load])

  const { featured, newArrivals, bestSellers } = useMemo(() => {
    const featuredList = products.filter((product) => product.featured)
    const rail = [...featuredList, ...products.filter((product) => !product.featured)].slice(0, 6)
    const fresh = products.filter((product) => product.isNew)
    const newList = [...fresh, ...products.filter((product) => !product.isNew)].slice(0, 4)
    const best = products.filter((product) => product.bestSeller)
    const bestList = [...best, ...products.filter((product) => !product.bestSeller)].slice(0, 6)
    return {
      featured: rail,
      newArrivals: newList,
      bestSellers: bestList,
    }
  }, [products])

  return (
    <div className="page-enter">
      <Hero featured={featured[0]} />
      <MarqueeBand />
      <DropPortal products={products} />

      {error && (
        <div className="container-x pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-flare/30 bg-flare/[0.06] px-5 py-4">
            <p className="text-sm text-flare">
              تعذر تحميل بعض القطع الآن — {error}
            </p>
            <button type="button" onClick={() => load()} className="btn btn-ghost btn-sm">
              <Icon name="refresh" size={13} />
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {loading && products.length === 0 ? (
        <div className="container-x py-6">
          <div className="flex items-center gap-3 text-[10px] text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-volt" />
            <span className="font-mono tracking-[0.2em]">LOADING COLLECTION...</span>
          </div>
        </div>
      ) : null}

      <SneakerVault products={products} />
      <NewArrivals products={newArrivals} />
      <Lookbook products={products} />
      <CollectionsSplit />
      <StorySection />
      <TopoBand />
      <BestSellers products={bestSellers} />
      <ForYou />
      <RecentlyViewed />
      <WhySection />
      <SocialStrip />
    </div>
  )
}
