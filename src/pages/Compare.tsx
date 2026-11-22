import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Product } from '../lib/types'
import { GENDER_LABEL } from '../lib/constants'
import { formatEGP } from '../lib/format'
import { usePageMeta } from '../hooks/usePageMeta'
import { COMPARE_LIMIT, useShop, type ShopItem } from '../store/shop'
import { useToast } from '../store/toast'
import { ProductVisual } from '../components/commerce/ProductVisual'
import { PageLoader } from '../components/ui/PageLoader'
import { Icon } from '../components/ui/Icon'

export default function Compare() {
  usePageMeta('المقارنة — SNEAKERX', 'قارن بين القطع قبل ما تختار.')
  const { compare, removeCompare, clearCompare } = useShop()
  const { toast } = useToast()
  const [details, setDetails] = useState<Record<string, Product | null>>({})
  const [loading, setLoading] = useState(false)

  const slugsKey = compare.map((item) => item.slug).join('|')

  useEffect(() => {
    if (!slugsKey) {
      setDetails({})
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const slugs = slugsKey.split('|')
    Promise.allSettled(slugs.map((slug) => api.product(slug))).then((results) => {
      if (cancelled) return
      const next: Record<string, Product | null> = {}
      results.forEach((result, index) => {
        next[slugs[index]] =
          result.status === 'fulfilled' ? result.value.product : null
      })
      setDetails(next)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [slugsKey])

  const cheapest = useMemo(() => {
    if (compare.length < 2) return null
    return compare.reduce((min, item) => (item.price < min.price ? item : min), compare[0]).slug
  }, [compare])

  return (
    <div className="page-enter pt-[6.4rem] md:pt-[7.4rem]">
      <div className="container-x pb-20">
        <header className="border-b border-line pb-8 pt-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-volt" />
            <span className="eyebrow">SIDE BY SIDE — {compare.length}/{COMPARE_LIMIT}</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <h1 className="display text-[clamp(2.8rem,7vw,6.4rem)]">
              THE <span className="display-italic lowercase text-volt">compare</span>
            </h1>
            {compare.length > 0 && (
              <div className="flex items-center gap-2">
                <Link to="/shop" className="btn btn-ghost btn-sm">
                  <Icon name="plus" size={13} />
                  أضف قطعة
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    clearCompare()
                    toast('مسحنا قائمة المقارنة')
                  }}
                  className="btn btn-ghost btn-sm text-muted hover:text-flare"
                >
                  <Icon name="trash" size={13} />
                  مسح الكل
                </button>
              </div>
            )}
          </div>
        </header>

        {compare.length === 0 ? (
          <EmptyCompare />
        ) : (
          <div className="mt-8">
            {loading && (
              <div className="mb-4">
                <PageLoader label="LOADING COMPARISON" />
              </div>
            )}
            <div className="overflow-x-auto rounded-2xl border border-line bg-ink2/40">
              <table className="w-full min-w-[720px] border-collapse text-start">
                <thead>
                  <tr>
                    <th className="w-36 border-b border-line p-4 text-start align-bottom">
                      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                        PIECE
                      </span>
                    </th>
                    {compare.map((item) => (
                      <th
                        key={item.slug}
                        className="border-b border-s border-line p-4 text-start align-top"
                      >
                        <CompareHead
                          item={item}
                          detail={details[item.slug]}
                          cheapest={cheapest === item.slug}
                          onRemove={() => {
                            removeCompare(item.slug)
                            toast(`أزلنا ${item.name} من المقارنة`)
                          }}
                        />
                      </th>
                    ))}
                    {Array.from({ length: COMPARE_LIMIT - compare.length }).map((_, index) => (
                      <th
                        key={`empty-${index}`}
                        className="border-b border-s border-line p-4 text-start align-middle"
                      >
                        <Link
                          to="/shop"
                          className="flex h-full min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-bone/12 text-muted transition hover:border-volt/40 hover:text-volt"
                        >
                          <span className="grid h-10 w-10 place-items-center rounded-full border border-line">
                            <Icon name="plus" size={16} />
                          </span>
                          <span className="text-[11px]">أضف قطعة للمقارنة</span>
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Row label="السعر">
                    {compare.map((item) => (
                      <td key={item.slug} className="border-b border-s border-line p-4">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-[15px] font-medium">
                            {formatEGP(item.price)}
                          </span>
                          {item.comparePrice && (
                            <span className="font-mono text-[10px] text-muted line-through">
                              {formatEGP(item.comparePrice)}
                            </span>
                          )}
                          {cheapest === item.slug && (
                            <span className="rounded-full bg-volt px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-ink">
                              Best price
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </Row>

                  <Row label="التقييم">
                    {compare.map((item) => {
                      const detail = details[item.slug]
                      return (
                        <td key={item.slug} className="border-b border-s border-line p-4">
                          {detail ? (
                            <span className="flex items-center gap-1.5">
                              <span className="flex items-center gap-0.5 text-volt">
                                {Array.from({ length: 5 }).map((_, star) => (
                                  <Icon
                                    key={star}
                                    name="star"
                                    size={11}
                                    filled={star < Math.round(detail.rating)}
                                    className={star < Math.round(detail.rating) ? 'text-volt' : 'text-line'}
                                  />
                                ))}
                              </span>
                              <span className="font-mono text-[11px] text-bone/80">
                                {detail.rating.toFixed(1)}
                              </span>
                              <span className="text-[10px] text-muted">({detail.reviewCount})</span>
                            </span>
                          ) : (
                            <Muted />
                          )}
                        </td>
                      )
                    })}
                  </Row>

                  <Row label="الفئة">
                    {compare.map((item) => (
                      <td key={item.slug} className="border-b border-s border-line p-4 text-[12px] text-bone/80">
                        {details[item.slug]?.category?.name ?? <Muted />}
                      </td>
                    ))}
                  </Row>

                  <Row label="النوع">
                    {compare.map((item) => {
                      const detail = details[item.slug]
                      return (
                        <td key={item.slug} className="border-b border-s border-line p-4 text-[12px] text-bone/80">
                          {detail ? GENDER_LABEL[detail.gender] : <Muted />}
                        </td>
                      )
                    })}
                  </Row>

                  <Row label="المقاسات المتاحة">
                    {compare.map((item) => {
                      const detail = details[item.slug]
                      const sizes = detail?.sizes.filter((size) => size.stock > 0) ?? []
                      return (
                        <td key={item.slug} className="border-b border-s border-line p-4">
                          {detail ? (
                            <div className="flex flex-wrap gap-1">
                              {sizes.length > 0 ? (
                                sizes.map((size) => (
                                  <span
                                    key={size.size}
                                    className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-bone/75"
                                  >
                                    {size.size}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-flare">نفدت الكمية</span>
                              )}
                            </div>
                          ) : (
                            <Muted />
                          )}
                        </td>
                      )
                    })}
                  </Row>

                  <Row label="الألوان">
                    {compare.map((item) => {
                      const detail = details[item.slug]
                      return (
                        <td key={item.slug} className="border-b border-s border-line p-4">
                          {detail ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {detail.colors.map((color) => (
                                <span
                                  key={color.name}
                                  className="h-4 w-4 rounded-full border border-bone/25"
                                  style={{ backgroundColor: color.hex }}
                                  title={color.name}
                                />
                              ))}
                              <span className="ms-1 text-[10px] text-muted">
                                {detail.colors.length} ألوان
                              </span>
                            </div>
                          ) : (
                            <Muted />
                          )}
                        </td>
                      )
                    })}
                  </Row>

                  <Row label="التوفر">
                    {compare.map((item) => {
                      const detail = details[item.slug]
                      return (
                        <td key={item.slug} className="border-b border-s border-line p-4">
                          {detail ? (
                            <span
                              className={
                                detail.totalStock > 0
                                  ? 'flex items-center gap-1.5 text-[11px] text-volt'
                                  : 'flex items-center gap-1.5 text-[11px] text-flare'
                              }
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {detail.totalStock > 0
                                ? `${detail.totalStock} قطعة متاحة`
                                : 'نفدت الكمية'}
                            </span>
                          ) : (
                            <Muted />
                          )}
                        </td>
                      )
                    })}
                  </Row>

                  <Row label="الوصف" last>
                    {compare.map((item) => (
                      <td key={item.slug} className="border-s border-line p-4">
                        <p className="line-clamp-4 text-[11px] leading-6 text-muted">
                          {details[item.slug]?.description ?? item.subtitle ?? '—'}
                        </p>
                      </td>
                    ))}
                  </Row>
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted">
              <span className="flex items-center gap-2">
                <Icon name="compare" size={13} className="text-volt" />
                المقارنة بتتحمل 3 قطع. البيانات بتتحدث من المخزون الحقيقي.
              </span>
              <Link to="/shop" className="link-line text-bone/80">
                رجوع للمتجر
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  children,
  last = false,
}: {
  label: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <tr>
      <th
        className={`border-s-0 p-4 text-start align-top text-[10px] font-normal uppercase tracking-[0.12em] text-muted ${
          last ? '' : 'border-b'
        } border-line`}
      >
        {label}
      </th>
      {children}
    </tr>
  )
}

function Muted() {
  return <span className="font-mono text-[11px] text-muted/50">—</span>
}

function CompareHead({
  item,
  detail,
  cheapest,
  onRemove,
}: {
  item: ShopItem
  detail?: Product | null
  cheapest: boolean
  onRemove: () => void
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute left-1 top-1 z-10 grid h-7 w-7 place-items-center rounded-full border border-bone/20 bg-ink/80 text-bone/70 backdrop-blur transition hover:border-flare/60 hover:text-flare"
        aria-label={`إزالة ${item.name}`}
      >
        <Icon name="close" size={11} />
      </button>
      <Link to={`/product/${item.slug}`} className="block">
        <div className="relative aspect-[4/3.35] overflow-hidden rounded-xl border border-line bg-ink">
          <ProductVisual
            image={detail?.images[0] ?? item.image}
            alt={item.name}
            fit="cover"
            sizes="(min-width: 1024px) 22vw, 40vw"
            className="transition-transform duration-700 group-hover:scale-105"
          />
          {cheapest && (
            <span className="absolute bottom-2 right-2 rounded-full bg-volt px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-ink">
              VALUE
            </span>
          )}
        </div>
        <h2 className="mt-3 font-display text-[1.05rem] font-bold tracking-tight">{item.name}</h2>
        <p className="mt-0.5 text-[10px] text-muted">{detail?.subtitle ?? item.subtitle}</p>
      </Link>
      <Link to={`/product/${item.slug}`} className="btn btn-ghost btn-sm mt-3 w-full">
        اختر مقاسك
        <Icon name="arrow-left" size={12} />
      </Link>
    </div>
  )
}

function EmptyCompare() {
  return (
    <div className="mt-8 grid place-items-center rounded-3xl border border-dashed border-line bg-ink2/40 px-6 py-20 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full border border-line bg-ink text-volt">
        <Icon name="compare" size={26} />
      </span>
      <h2 className="mt-5 display text-[clamp(1.8rem,4vw,2.8rem)]">مفيش قطع للمقارنة</h2>
      <p className="mt-2 max-w-md text-[12px] leading-6 text-muted">
        أضف لحد 3 قطع من صفحة أي منتج أو من زر المقارنة على الكروت، وهنعرض لك الفروق بينهم
        جنب بعض.
      </p>
      <Link to="/shop" className="btn btn-volt btn-sm mt-6">
        تصفح الدروب
        <Icon name="arrow-left" size={13} />
      </Link>
    </div>
  )
}
