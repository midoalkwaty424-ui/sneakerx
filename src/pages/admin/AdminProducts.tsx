import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import type { Product } from '../../lib/types'
import { GENDER_LABEL } from '../../lib/constants'
import { cx, formatEGP } from '../../lib/format'
import { useToast } from '../../store/toast'
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  ConfirmDialog,
} from '../../components/admin/ui'
import { ProductVisual } from '../../components/commerce/ProductVisual'
import { Icon } from '../../components/ui/Icon'

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api.admin
      .products()
      .then((result) => {
        setProducts(result.products)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(errorMessage(err))
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products
    return products.filter((product) =>
      [product.name, product.slug, product.category?.name ?? '', product.subtitle]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [products, search])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.admin.deleteProduct(deleteTarget.id)
      setProducts((current) => current.filter((item) => item.id !== deleteTarget.id))
      toast(`تم حذف ${deleteTarget.name}`)
      setDeleteTarget(null)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <AdminLoading label="LOADING PRODUCTS" />
  if (error) return <AdminError message={error} onRetry={load} />

  return (
    <div>
      <AdminPageHeader
        eyebrow="CATALOG / PRODUCTS"
        title="المنتجات"
        description="أضف وعدّل واحذف قطع الكتالوج. كل منتج له ألوان ومقاسات ومخزون مستقل لكل متغير."
        actions={
          <>
            <div className="relative">
              <Icon
                name="search"
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="بحث في المنتجات..."
                className="field h-9 !py-1.5 w-52 ps-3 pe-9 text-xs"
                aria-label="بحث في المنتجات"
              />
            </div>
            <Link to="/admin/products/new" className="btn btn-volt btn-sm">
              <Icon name="plus" size={14} />
              منتج جديد
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-[10px] text-muted">
        <span className="rounded-full border border-line px-2.5 py-1">
          {products.length} منتج إجمالًا
        </span>
        <span className="rounded-full border border-line px-2.5 py-1">
          {products.filter((product) => product.totalStock === 0).length} نفد من المخزون
        </span>
        <span className="rounded-full border border-line px-2.5 py-1">
          {products.filter((product) => product.totalStock > 0 && product.totalStock <= 10).length} مخزون
          منخفض
        </span>
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-volt underline underline-offset-4"
          >
            مسح البحث
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty
          icon="box"
          title={search ? 'لا توجد منتجات مطابقة' : 'لا توجد منتجات بعد'}
          message={search ? 'جرّب كلمة بحث أخرى أو امسح البحث.' : 'ابدأ بإضافة أول قطعة للكتالوج.'}
          action={
            search ? (
              <button type="button" onClick={() => setSearch('')} className="btn btn-ghost btn-sm">
                مسح البحث
              </button>
            ) : (
              <Link to="/admin/products/new" className="btn btn-volt btn-sm">
                <Icon name="plus" size={13} />
                إضافة منتج
              </Link>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-ink2">
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[900px]">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الفئة</th>
                  <th>السعر</th>
                  <th>المخزون</th>
                  <th>الشعارات</th>
                  <th>المتغيرات</th>
                  <th className="text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const low = product.totalStock > 0 && product.totalStock <= 10
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-ink3">
                            <ProductVisual
                              image={product.images[0]}
                              base={product.colors[0]?.hex}
                              accent={product.colors[0]?.accent}
                              alt={product.name}
                              fit="cover"
                              sizes="56px"
                              className="h-full w-full"
                              artClassName="h-full w-full p-1"
                            />
                          </span>
                          <div className="min-w-0">
                            <Link
                              to={`/admin/products/${product.id}/edit`}
                              className="block max-w-[200px] truncate text-xs font-semibold transition hover:text-volt"
                            >
                              {product.name}
                            </Link>
                            <p className="mt-0.5 max-w-[200px] truncate font-mono text-[9px] text-muted">
                              {product.slug}
                            </p>
                            <p className="mt-1 text-[9px] text-muted">{GENDER_LABEL[product.gender]}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-[11px] text-muted">{product.category?.name ?? '—'}</td>
                      <td>
                        <span className="font-mono text-[11px]">{formatEGP(product.price)}</span>
                        {product.comparePrice && (
                          <span className="mt-0.5 block font-mono text-[9px] text-muted line-through">
                            {formatEGP(product.comparePrice)}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={cx(
                            'rounded-full px-2 py-0.5 font-mono text-[10px]',
                            product.totalStock === 0
                              ? 'bg-flare/15 text-flare'
                              : low
                                ? 'bg-amber-300/10 text-amber-200'
                                : 'bg-volt/10 text-volt',
                          )}
                        >
                          {product.totalStock}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {product.featured && (
                            <span className="rounded bg-ice/10 px-1.5 py-0.5 text-[8px] text-ice">مميز</span>
                          )}
                          {product.isNew && (
                            <span className="rounded bg-volt/10 px-1.5 py-0.5 text-[8px] text-volt">جديد</span>
                          )}
                          {product.bestSeller && (
                            <span className="rounded bg-amber-300/10 px-1.5 py-0.5 text-[8px] text-amber-200">
                              الأكثر مبيعًا
                            </span>
                          )}
                          {!product.featured && !product.isNew && !product.bestSeller && (
                            <span className="text-[9px] text-muted">—</span>
                          )}
                        </div>
                      </td>
                      <td className="font-mono text-[10px] text-muted">
                        {product.colors.length} لون / {product.sizes.length} مقاس
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/product/${product.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="icon-btn !h-8 !w-8"
                            aria-label={`عرض ${product.name} في المتجر`}
                            title="عرض في المتجر"
                          >
                            <Icon name="external" size={13} />
                          </Link>
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            className="icon-btn !h-8 !w-8"
                            aria-label={`تعديل ${product.name}`}
                            title="تعديل"
                          >
                            <Icon name="edit" size={13} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(product)}
                            className="icon-btn !h-8 !w-8 hover:!border-flare/40 hover:!text-flare"
                            aria-label={`حذف ${product.name}`}
                            title="حذف"
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف المنتج؟"
        message={`سيتم حذف ${deleteTarget?.name ?? 'المنتج'} وكل متغيراته نهائيًا. الطلبات السابقة تحتفظ ببياناتها.`}
        confirmLabel="حذف نهائي"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
