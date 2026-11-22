import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import type { InventoryRow } from '../../lib/types'
import { cx } from '../../lib/format'
import { useToast } from '../../store/toast'
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from '../../components/admin/ui'
import { Icon } from '../../components/ui/Icon'

export default function AdminInventory() {
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [lowOnly, setLowOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [savingId, setSavingId] = useState<number | null>(null)
  const { toast } = useToast()

  const load = useCallback(() => {
    let active = true
    setLoading(true)
    setError('')
    api.admin
      .inventory(lowOnly)
      .then((result) => {
        if (!active) return
        setRows(result.inventory)
        setDrafts(
          Object.fromEntries(result.inventory.map((row) => [row.id, String(row.stock)])) as Record<
            number,
            string
          >,
        )
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(errorMessage(err))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [lowOnly, refreshKey])

  useEffect(() => load(), [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) =>
      [row.name, row.sku, row.color, row.size, String(row.productId)]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [rows, search])

  const summary = useMemo(
    () => ({
      variants: rows.length,
      units: rows.reduce((sum, row) => sum + row.stock, 0),
      low: rows.filter((row) => row.stock > 0 && row.stock <= 5).length,
      out: rows.filter((row) => row.stock === 0).length,
      pending: rows.filter((row) => {
        const draft = drafts[row.id]
        return draft !== undefined && Number(draft) !== row.stock
      }).length,
    }),
    [rows, drafts],
  )

  const adjust = (row: InventoryRow, delta: number) => {
    const draft = drafts[row.id]
    const current = Number(draft === undefined ? row.stock : draft)
    const base = Number.isFinite(current) ? current : row.stock
    const next = Math.max(0, Math.min(9999, base + delta))
    setDrafts((currentDrafts) => ({ ...currentDrafts, [row.id]: String(next) }))
  }

  const save = async (row: InventoryRow) => {
    const raw = drafts[row.id]
    const value = Number(raw)
    if (!Number.isInteger(value) || value < 0 || value > 9999) {
      toast('أدخل عددًا صحيحًا بين 0 و 9999', 'error')
      return
    }
    setSavingId(row.id)
    try {
      const result = await api.admin.updateStock(row.id, value)
      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, stock: result.stock } : item)),
      )
      setDrafts((current) => ({ ...current, [row.id]: String(result.stock) }))
      toast(`تم تحديث مخزون ${row.name} — مقاس ${row.size}`)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="OPERATIONS / INVENTORY"
        title="المخزون"
        description="مخزون كل متغير (لون × مقاس) هو المصدر الذي يتحقق منه السيرفر عند الطلب. أي تعديل هنا يسري فورًا."
        actions={
          <>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="btn btn-ghost btn-sm"
              disabled={loading}
            >
              {loading ? <span className="spinner spinner-light !h-3.5 !w-3.5" /> : <Icon name="refresh" size={13} />}
              تحديث
            </button>
            <button
              type="button"
              onClick={() => setLowOnly((value) => !value)}
              className={cx('chip !py-2 text-[10px]', lowOnly && 'chip-active')}
              aria-pressed={lowOnly}
            >
              <Icon name="filter" size={12} />
              مخزون منخفض فقط
            </button>
            <div className="relative">
              <Icon
                name="search"
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="منتج / SKU / لون / مقاس"
                className="field h-9 w-52 !py-1.5 pe-9 ps-3 text-xs"
                aria-label="بحث في المخزون"
              />
            </div>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'المتغيرات المعروضة', value: summary.variants, tone: 'default' },
          { label: 'إجمالي القطع', value: summary.units, tone: 'default' },
          { label: 'مخزون منخفض (1—5)', value: summary.low, tone: 'warn' },
          { label: 'نفد من المخزون', value: summary.out, tone: 'danger' },
        ].map((item) => (
          <div
            key={item.label}
            className={cx(
              'rounded-xl border px-4 py-3',
              item.tone === 'danger'
                ? 'border-flare/25 bg-flare/[0.05]'
                : item.tone === 'warn'
                  ? 'border-amber-300/25 bg-amber-300/[0.04]'
                  : 'border-line bg-ink2',
            )}
          >
            <p className="text-[10px] text-muted">{item.label}</p>
            <p className="mt-1 font-mono text-xl">{item.value}</p>
          </div>
        ))}
      </div>

      {summary.pending > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-volt/25 bg-volt/[0.05] px-3 py-2 text-[10px] text-volt">
          <span className="h-1.5 w-1.5 rounded-full bg-volt" />
          {summary.pending} تعديل غير محفوظ — اضغط «حفظ» بجانب كل متغير.
        </div>
      )}

      {loading && rows.length === 0 ? (
        <AdminLoading label="LOADING INVENTORY" />
      ) : error && rows.length === 0 ? (
        <AdminError message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <AdminEmpty
          icon="layers"
          title={lowOnly || search ? 'لا توجد متغيرات مطابقة' : 'لا يوجد مخزون بعد'}
          message={
            lowOnly || search
              ? 'جرّب مسح الفلاتر أو البحث لعرض كل المتغيرات.'
              : 'أضف منتجات من صفحة المنتجات ليظهر مخزون كل لون ومقاس هنا.'
          }
          action={
            lowOnly || search ? (
              <button
                type="button"
                onClick={() => {
                  setLowOnly(false)
                  setSearch('')
                }}
                className="btn btn-ghost btn-sm"
              >
                إعادة ضبط الفلاتر
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
            <table className="admin-table min-w-[960px]">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>المقاس</th>
                  <th>اللون</th>
                  <th>SKU</th>
                  <th>الحالة</th>
                  <th>المخزون الحالي</th>
                  <th className="text-end">تعديل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const draft = drafts[row.id] ?? String(row.stock)
                  const changed = Number(draft) !== row.stock
                  const status =
                    row.stock === 0 ? 'out' : row.stock <= 5 ? 'low' : 'ok'
                  return (
                    <tr key={row.id}>
                      <td>
                        <Link
                          to={`/admin/products/${row.productId}/edit`}
                          className="block max-w-[220px] truncate text-xs font-medium transition hover:text-volt"
                        >
                          {row.name}
                        </Link>
                        <span className="mt-0.5 block font-mono text-[9px] text-muted">
                          #{String(row.productId).padStart(3, '0')}
                        </span>
                      </td>
                      <td>
                        <span className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px]">
                          {row.size}
                        </span>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-2 text-[11px]">
                          <span className="h-2.5 w-2.5 rounded-full border border-bone/25 bg-ink3" />
                          {row.color}
                        </span>
                      </td>
                      <td className="font-mono text-[9px] text-muted" dir="ltr">
                        {row.sku}
                      </td>
                      <td>
                        <span
                          className={cx(
                            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px]',
                            status === 'out'
                              ? 'bg-flare/15 text-flare'
                              : status === 'low'
                                ? 'bg-amber-300/10 text-amber-200'
                                : 'bg-volt/10 text-volt',
                          )}
                        >
                          <span className="h-1 w-1 rounded-full bg-current" />
                          {status === 'out' ? 'نفد' : status === 'low' ? 'منخفض' : 'آمن'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjust(row, -1)}
                            className="icon-btn !h-7 !w-7"
                            aria-label={`تقليل مخزون ${row.name} مقاس ${row.size}`}
                          >
                            <Icon name="minus" size={12} />
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="9999"
                            step="1"
                            value={draft}
                            onChange={(event) =>
                              setDrafts((current) => ({ ...current, [row.id]: event.target.value }))
                            }
                            className={cx(
                              'field !h-8 !w-16 !rounded-md !px-1 text-center font-mono text-[11px]',
                              changed && '!border-volt/60',
                            )}
                            dir="ltr"
                            aria-label={`مخزون ${row.name} مقاس ${row.size} لون ${row.color}`}
                          />
                          <button
                            type="button"
                            onClick={() => adjust(row, 1)}
                            className="icon-btn !h-7 !w-7"
                            aria-label={`زيادة مخزون ${row.name} مقاس ${row.size}`}
                          >
                            <Icon name="plus" size={12} />
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => save(row)}
                            disabled={!changed || savingId === row.id}
                            className={cx(
                              'btn btn-sm !px-3 !py-1.5 text-[10px]',
                              changed ? 'btn-volt' : 'btn-ghost',
                            )}
                          >
                            {savingId === row.id ? (
                              <span className="spinner !h-3 !w-3" />
                            ) : (
                              <Icon name="check" size={12} />
                            )}
                            حفظ
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

      <div className="mt-4 rounded-xl border border-line bg-ink2/60 p-4 text-[10px] leading-5 text-muted">
        ملاحظة: عند إلغاء طلب من صفحة الطلبات، تُعاد كمياته إلى المخزون مرة واحدة فقط. لا يمكن تعديل
        مخزون متغير محذوف.
      </div>
    </div>
  )
}
