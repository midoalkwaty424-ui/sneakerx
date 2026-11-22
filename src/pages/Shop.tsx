import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import type { Category, Product, ProductList } from '../lib/types'
import { GENDER_LABEL, SHOE_SIZES } from '../lib/constants'
import { cx, formatEGP } from '../lib/format'
import { usePageMeta } from '../hooks/usePageMeta'
import { collectionJsonLd } from '../lib/seo'
import { useBodyLock } from '../hooks/useBodyLock'
import { ProductCard } from '../components/commerce/ProductCard'
import { QuickView } from '../components/commerce/QuickView'
import { Icon } from '../components/ui/Icon'
import { Reveal } from '../components/ui/Reveal'

const SORTS = [
  { value: 'newest', label: 'وصل حديثًا' },
  { value: 'best', label: 'الأكثر مبيعًا' },
  { value: 'price-asc', label: 'السعر: الأقل أولًا' },
  { value: 'price-desc', label: 'السعر: الأعلى أولًا' },
  { value: 'rating', label: 'الأعلى تقييمًا' },
]

const FILTER_COLORS = [
  { value: 'Volt', label: 'ليموني', hex: '#D9FF43' },
  { value: 'Bone', label: 'كريمي', hex: '#E9E3D3' },
  { value: 'Obsidian', label: 'أسود', hex: '#1B1F27' },
  { value: 'Ember', label: 'أحمر', hex: '#FF5A36' },
  { value: 'Ice', label: 'أزرق', hex: '#A9C7FF' },
  { value: 'Clay', label: 'طيني', hex: '#C98A6B' },
  { value: 'Moss', label: 'أخضر', hex: '#7C8B5A' },
  { value: 'Chrome', label: 'فضي', hex: '#C9CFD6' },
]

const COLLECTIONS = [
  { value: '', label: 'كل القطع' },
  { value: 'new', label: 'جديد' },
  { value: 'best', label: 'الأكثر مبيعًا' },
  { value: 'featured', label: 'مميز' },
]

export default function Shop() {
  usePageMeta(
    'المتجر — SNEAKERX',
    'تسوق كل سنيكرز SNEAKERX: رجالي، حريمي، إصدارات محدودة، فلاتر بالمقاس والسعر، دفع عند الاستلام.',
    {
      canonical: '/shop',
      jsonLd: collectionJsonLd(
        'متجر SNEAKERX',
        'كل سنيكرز SNEAKERX مع فلاتر بالمقاس واللون والسعر.',
        '/shop',
      ),
    },
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<ProductList | null>(null)
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [quickProduct, setQuickProduct] = useState<Product | null>(null)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '')
  useBodyLock(filtersOpen)

  useEffect(() => {
    if (!filtersOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtersOpen])

  const page = Math.max(Number(searchParams.get('page') ?? 1), 1)
  const filterKey = useMemo(() => {
    const clone = new URLSearchParams(searchParams)
    clone.delete('page')
    return clone.toString()
  }, [searchParams])

  const updateParams = useCallback(
    (changes: Record<string, string | null>, resetPage = true) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === '') next.delete(key)
            else next.set(key, value)
          }
          if (resetPage) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  useEffect(() => {
    api
      .categories()
      .then((result) => setCategories(result.categories))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    setSearchInput(searchParams.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams.get('q') ?? ''
      const next = searchInput.trim()
      if (next !== current) updateParams({ q: next || null })
    }, 380)
    return () => clearTimeout(timer)
  }, [searchInput, searchParams, updateParams])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setLoading(true)
    setError('')
    const params = new URLSearchParams(filterKey)
    api
      .products(
        {
          search: params.get('q') ?? undefined,
          gender: params.get('gender') ?? undefined,
          category: params.get('category') ?? undefined,
          collection: params.get('collection') ?? undefined,
          size: params.get('size') ?? undefined,
          minPrice: params.get('min') ?? undefined,
          maxPrice: params.get('max') ?? undefined,
          color: params.get('color') ?? undefined,
          onSale: params.get('sale') === '1',
          minRating: params.get('rating') ? Number(params.get('rating')) : undefined,
          sort: params.get('sort') ?? 'newest',
          inStock: params.get('inStock') === '1',
          page,
          limit: 12,
        },
        controller.signal,
      )
      .then((result) => {
        if (!active) return
        setData(result)
        setItems((previous) =>
          page === 1
            ? result.items
            : [
                ...previous,
                ...result.items.filter((item) => !previous.some((p) => p.id === item.id)),
              ],
        )
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!active || (err instanceof DOMException && err.name === 'AbortError')) return
        setError(errorMessage(err))
        setLoading(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [filterKey, page])

  const activeFilters = useMemo(() => {
    const list: { key: string; label: string }[] = []
    const q = searchParams.get('q')
    const gender = searchParams.get('gender')
    const category = searchParams.get('category')
    const collection = searchParams.get('collection')
    const size = searchParams.get('size')
    const min = searchParams.get('min')
    const max = searchParams.get('max')
    const color = searchParams.get('color')
    const sale = searchParams.get('sale') === '1'
    const rating = searchParams.get('rating')
    if (q) list.push({ key: 'q', label: `بحث: ${q}` })
    if (gender) list.push({ key: 'gender', label: GENDER_LABEL[gender] ?? gender })
    if (category)
      list.push({
        key: 'category',
        label: categories.find((item) => item.slug === category)?.name ?? category,
      })
    if (collection)
      list.push({
        key: 'collection',
        label: COLLECTIONS.find((item) => item.value === collection)?.label ?? collection,
      })
    if (size) list.push({ key: 'size', label: `مقاس ${size}` })
    if (color)
      list.push({
        key: 'color',
        label: `لون ${FILTER_COLORS.find((item) => item.value === color)?.label ?? color}`,
      })
    if (sale) list.push({ key: 'sale', label: 'العروض فقط' })
    if (rating) list.push({ key: 'rating', label: `تقييم ${rating}+` })
    if (min || max)
      list.push({
        key: 'price',
        label: `${min ? formatEGP(Number(min)) : '0'} — ${max ? formatEGP(Number(max)) : '∞'}`,
      })
    if (searchParams.get('inStock') === '1') list.push({ key: 'inStock', label: 'المتوفر فقط' })
    return list
  }, [searchParams, categories])

  const resetAll = () => {
    setSearchInput('')
    setSearchParams({}, { replace: true })
  }

  return (
    <div className="page-enter">
      <header className="border-b border-line pb-10 pt-[8rem] md:pt-[9rem]">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-volt" />
                <span className="eyebrow">COLLECTION / AW26 — ALL PIECES</span>
              </div>
              <h1 className="display text-[clamp(3.4rem,9vw,9.5rem)]">
                THE <span className="display-italic lowercase text-volt">shop</span>
              </h1>
            </div>
            <div className="max-w-sm pb-3">
              <p className="text-sm leading-7 text-muted">
                {data ? `${data.total} قطعة متاحة الآن` : 'جارٍ تحميل القطع...'} — إصدارات محدودة،
                مقاسات كاملة، وشحن لكل محافظات مصر.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {COLLECTIONS.map((collection) => {
                  const active = (searchParams.get('collection') ?? '') === collection.value
                  return (
                    <button
                      key={collection.value || 'all'}
                      onClick={() => updateParams({ collection: collection.value || null })}
                      className={cx('chip', active && 'chip-active')}
                    >
                      {collection.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container-x py-8">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <FilterPanel
                categories={categories}
                searchParams={searchParams}
                updateParams={updateParams}
                resetAll={resetAll}
              />
            </div>
          </aside>

          <main>
            <div className="sticky top-[4.4rem] z-30 -mx-1 mb-6 flex flex-wrap items-center gap-3 border-b border-line bg-ink/90 px-1 py-4 backdrop-blur-xl">
              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <Icon
                  name="search"
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="ابحث في المتجر..."
                  className="field h-10 !py-2 pe-4 ps-10 text-sm"
                  aria-label="بحث في المتجر"
                />
              </div>

              <button
                onClick={() => setFiltersOpen(true)}
                className="btn btn-ghost btn-sm h-10 lg:hidden"
              >
                <Icon name="filter" size={15} />
                الفلاتر
                {activeFilters.length > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-volt px-1 font-mono text-[9px] text-ink">
                    {activeFilters.length}
                  </span>
                )}
              </button>

              <div className="ms-auto flex items-center gap-2">
                <span className="hidden text-[10px] text-muted sm:block">ترتيب:</span>
                <div className="relative">
                  <select
                    value={searchParams.get('sort') ?? 'newest'}
                    onChange={(event) => updateParams({ sort: event.target.value })}
                    className="h-10 appearance-none rounded-full border border-line bg-ink2 pe-4 ps-9 text-[11px] text-bone outline-none transition hover:border-bone/30"
                    aria-label="ترتيب المنتجات"
                  >
                    {SORTS.map((sort) => (
                      <option key={sort.value} value={sort.value} className="bg-ink2">
                        {sort.label}
                      </option>
                    ))}
                  </select>
                  <Icon
                    name="chevron-down"
                    size={12}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  />
                </div>
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() =>
                      filter.key === 'price'
                        ? updateParams({ min: null, max: null })
                        : updateParams({ [filter.key]: null })
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-volt/30 bg-volt/[0.07] px-3 py-1.5 text-[10px] text-volt"
                  >
                    {filter.label}
                    <Icon name="close" size={10} />
                  </button>
                ))}
                <button
                  onClick={resetAll}
                  className="text-[10px] text-muted underline decoration-line underline-offset-4 hover:text-bone"
                >
                  مسح الكل
                </button>
              </div>
            )}

            {error ? (
              <div className="grid min-h-[40vh] place-items-center rounded-2xl border border-line bg-ink2 p-8 text-center">
                <div>
                  <p className="mb-3 text-sm text-flare">{error}</p>
                  <button onClick={() => updateParams({}, false)} className="btn btn-ghost btn-sm">
                    إعادة المحاولة
                  </button>
                </div>
              </div>
            ) : loading && items.length === 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-2xl border border-line bg-ink2">
                    <div className="aspect-[4/3.35] animate-pulse bg-ink3" />
                    <div className="space-y-3 p-5">
                      <div className="h-2 w-20 animate-pulse rounded-full bg-ink3" />
                      <div className="h-4 w-2/3 animate-pulse rounded-full bg-ink3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="grid min-h-[44vh] place-items-center rounded-2xl border border-line bg-ink2 px-6 text-center">
                <div>
                  <span className="display block text-7xl text-bone/10">0</span>
                  <h2 className="mt-2 text-lg font-semibold">لا توجد نتائج مطابقة</h2>
                  <p className="mt-2 text-xs text-muted">جرّب تعديل الفلاتر أو البحث بكلمة أخرى</p>
                  <button onClick={resetAll} className="btn btn-volt btn-sm mt-5">
                    عرض كل المنتجات
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((product, index) => (
                    <Reveal key={product.id} delay={(index % 3) * 60}>
                      <ProductCard
                        product={product}
                        index={index}
                        priority={index < 3}
                        onQuickView={setQuickProduct}
                      />
                    </Reveal>
                  ))}
                </div>

                <div className="mt-10 flex flex-col items-center gap-3">
                  <p className="font-mono text-[10px] text-muted">
                    SHOWING {items.length} OF {data?.total ?? 0}
                  </p>
                  {data && data.page < data.pages && (
                    <button
                      onClick={() => updateParams({ page: String(page + 1) }, false)}
                      disabled={loading}
                      className="btn btn-ghost"
                    >
                      {loading ? <span className="spinner spinner-light" /> : 'عرض المزيد'}
                      {!loading && <Icon name="chevron-down" size={14} />}
                    </button>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            className="fixed inset-0 z-[125] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setFiltersOpen(false)}
              aria-label="إغلاق الفلاتر"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 w-full max-w-[340px] overflow-y-auto border-s border-line bg-ink2 p-6"
              role="dialog"
              aria-modal="true"
              aria-label="فلاتر المتجر"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="eyebrow mb-1">FILTERS</p>
                  <h2 className="text-lg font-semibold">تصفية النتائج</h2>
                </div>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="icon-btn"
                  aria-label="إغلاق الفلاتر"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
              <FilterPanel
                categories={categories}
                searchParams={searchParams}
                updateParams={updateParams}
                resetAll={resetAll}
              />
              <button
                onClick={() => setFiltersOpen(false)}
                className="btn btn-volt mt-8 w-full"
              >
                عرض النتائج
              </button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <QuickView product={quickProduct} onClose={() => setQuickProduct(null)} />
    </div>
  )
}

type FilterPanelProps = {
  categories: Category[]
  searchParams: URLSearchParams
  updateParams: (changes: Record<string, string | null>, resetPage?: boolean) => void
  resetAll: () => void
}

function FilterPanel({ categories, searchParams, updateParams, resetAll }: FilterPanelProps) {
  const minParam = searchParams.get('min') ?? ''
  const maxParam = searchParams.get('max') ?? ''
  const [min, setMin] = useState(minParam)
  const [max, setMax] = useState(maxParam)
  const [rangeError, setRangeError] = useState('')

  useEffect(() => {
    setMin(minParam)
    setMax(maxParam)
  }, [minParam, maxParam])

  const applyPrice = () => {
    if (min && max && Number(min) > Number(max)) {
      setRangeError('الحد الأدنى أكبر من الحد الأقصى')
      return
    }
    setRangeError('')
    updateParams({ min: min || null, max: max || null })
  }

  const applyRange = (from: number | null, to: number | null) => {
    setMin(from ? String(from) : '')
    setMax(to ? String(to) : '')
    setRangeError('')
    updateParams({ min: from ? String(from) : null, max: to ? String(to) : null })
  }

  return (
    <div className="space-y-7 text-sm">
      <div>
        <h3 className="eyebrow mb-3">الفئة</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateParams({ category: null })}
            className={cx('chip !py-1.5', !searchParams.get('category') && 'chip-active')}
          >
            الكل
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() =>
                updateParams({
                  category: searchParams.get('category') === category.slug ? null : category.slug,
                })
              }
              className={cx(
                'chip !py-1.5',
                searchParams.get('category') === category.slug && 'chip-active',
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="eyebrow mb-3">النوع</h3>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { value: '', label: 'الكل' },
            { value: 'men', label: 'رجالي' },
            { value: 'women', label: 'حريمي' },
            { value: 'unisex', label: 'للجميع' },
          ].map((option) => {
            const current = searchParams.get('gender') ?? ''
            return (
              <button
                key={option.value || 'all'}
                onClick={() => updateParams({ gender: option.value || null })}
                className={cx(
                  'rounded-lg border px-2 py-2 text-[11px] transition',
                  current === option.value
                    ? 'border-volt bg-volt/10 text-volt'
                    : 'border-line text-muted hover:border-bone/30 hover:text-bone',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="eyebrow mb-3">المقاس</h3>
        <div className="grid grid-cols-5 gap-1.5">
          {SHOE_SIZES.map((size) => {
            const active = searchParams.get('size') === size
            return (
              <button
                key={size}
                onClick={() => updateParams({ size: active ? null : size })}
                className={cx(
                  'rounded-md border py-2 font-mono text-[11px] transition',
                  active
                    ? 'border-volt bg-volt text-ink'
                    : 'border-line text-bone/70 hover:border-bone/40',
                )}
                aria-pressed={active}
              >
                {size}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="eyebrow mb-3">اللون</h3>
        <div className="flex flex-wrap gap-2">
          {FILTER_COLORS.map((color) => {
            const active = searchParams.get('color') === color.value
            return (
              <button
                key={color.value}
                onClick={() => updateParams({ color: active ? null : color.value })}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] transition',
                  active
                    ? 'border-volt bg-volt/10 text-volt'
                    : 'border-line text-muted hover:border-bone/30 hover:text-bone',
                )}
                aria-pressed={active}
                data-filter-color={color.value}
              >
                <span
                  className="h-3 w-3 rounded-full border border-bone/25"
                  style={{ backgroundColor: color.hex }}
                />
                {color.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="eyebrow mb-3">السعر</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={min}
            onChange={(event) => setMin(event.target.value)}
            placeholder="من"
            className="field h-9 !py-1 text-xs"
            aria-label="أقل سعر"
          />
          <span className="text-muted">—</span>
          <input
            type="number"
            inputMode="numeric"
            value={max}
            onChange={(event) => setMax(event.target.value)}
            placeholder="إلى"
            className="field h-9 !py-1 text-xs"
            aria-label="أعلى سعر"
          />
        </div>
        {rangeError && <p className="error-text">{rangeError}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { label: 'أقل من 3,500', from: null, to: 3500 },
            { label: '3,500 — 4,500', from: 3500, to: 4500 },
            { label: 'فوق 4,500', from: 4500, to: null },
          ].map((range) => (
            <button
              key={range.label}
              onClick={() => applyRange(range.from, range.to)}
              className="rounded-full border border-line px-2.5 py-1 text-[9px] text-muted transition hover:border-volt/40 hover:text-bone"
            >
              {range.label}
            </button>
          ))}
        </div>
        <button onClick={applyPrice} className="btn btn-dark mt-3 w-full !py-2 text-xs">
          تطبيق السعر
        </button>
      </div>

      <div>
        <h3 className="eyebrow mb-3">التقييم</h3>
        <div className="relative">
          <select
            value={searchParams.get('rating') ?? ''}
            onChange={(event) => updateParams({ rating: event.target.value || null })}
            className="h-10 w-full appearance-none rounded-lg border border-line bg-ink3 px-3 pe-8 text-xs text-bone outline-none transition hover:border-bone/30"
            aria-label="الحد الأدنى للتقييم"
            data-filter-rating
          >
            <option value="">كل التقييمات</option>
            <option value="4">4 نجوم فأكثر</option>
            <option value="4.5">4.5 نجوم فأكثر</option>
          </select>
          <Icon
            name="chevron-down"
            size={12}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-4">
        <span className="text-xs text-bone/70">العروض فقط</span>
        <button
          type="button"
          role="switch"
          aria-checked={searchParams.get('sale') === '1'}
          onClick={() => updateParams({ sale: searchParams.get('sale') === '1' ? null : '1' })}
          className={cx(
            'relative h-6 w-11 rounded-full border transition',
            searchParams.get('sale') === '1' ? 'border-volt bg-volt' : 'border-line bg-ink3',
          )}
          data-filter-sale
        >
          <span
            className={cx(
              'absolute top-0.5 h-4.5 w-4.5 rounded-full transition-all',
              searchParams.get('sale') === '1' ? 'right-0.5 bg-ink' : 'right-5 bg-muted',
            )}
            style={{ height: '1.1rem', width: '1.1rem' }}
          />
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-4">
        <span className="text-xs text-bone/70">المتوفر فقط</span>
        <button
          type="button"
          role="switch"
          aria-checked={searchParams.get('inStock') === '1'}
          onClick={() =>
            updateParams({ inStock: searchParams.get('inStock') === '1' ? null : '1' })
          }
          className={cx(
            'relative h-6 w-11 rounded-full border transition',
            searchParams.get('inStock') === '1'
              ? 'border-volt bg-volt'
              : 'border-line bg-ink3',
          )}
        >
          <span
            className={cx(
              'absolute top-0.5 h-4.5 w-4.5 rounded-full transition-all',
              searchParams.get('inStock') === '1'
                ? 'right-0.5 bg-ink'
                : 'right-5 bg-muted',
            )}
            style={{ height: '1.1rem', width: '1.1rem' }}
          />
        </button>
      </div>

      <button
        onClick={resetAll}
        className="flex w-full items-center justify-center gap-2 text-[11px] text-muted transition hover:text-volt"
      >
        <Icon name="refresh" size={13} />
        إعادة تعيين الفلاتر
      </button>
    </div>
  )
}
