import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import type { Order, OrderSummary } from '../../lib/types'
import { STATUS_LABEL } from '../../lib/constants'
import { cx, formatDateTime, formatEGP } from '../../lib/format'
import { confirmOrderLink } from '../../lib/whatsapp'
import { useToast } from '../../store/toast'
import {
  AdminDrawer,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from '../../components/admin/ui'
import { OrderDetails, StatusBadge } from '../../components/commerce/OrderDetails'
import { Icon } from '../../components/ui/Icon'

const STATUS_KEYS = Object.keys(STATUS_LABEL)

type StatusTarget = { id: number; orderNumber: string; status: string }

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') || 'all'
  const search = searchParams.get('search') || ''

  const [searchInput, setSearchInput] = useState(search)
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { toast } = useToast()

  const [detailId, setDetailId] = useState<number | null>(null)
  const [detail, setDetail] = useState<Order | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  useEffect(() => {
    if (searchInput === search) return
    const timer = window.setTimeout(() => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          const value = searchInput.trim()
          if (value) next.set('search', value)
          else next.delete('search')
          return next
        },
        { replace: true },
      )
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput, search, setSearchParams])

  const load = useCallback(() => {
    let active = true
    setLoading(true)
    setError('')
    api.admin
      .orders({ status: status === 'all' ? undefined : status, search: search || undefined })
      .then((result) => {
        if (!active) return
        setOrders(result.orders)
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
  }, [status, search, refreshKey])

  useEffect(() => load(), [load])

  const summary = useMemo(() => {
    return {
      count: orders.length,
      items: orders.reduce((sum, order) => sum + order.itemsCount, 0),
      total: orders.reduce((sum, order) => sum + order.total, 0),
    }
  }, [orders])

  const applyStatus = (value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (!value || value === 'all') next.delete('status')
        else next.set('status', value)
        return next
      },
      { replace: true },
    )
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('search')
        return next
      },
      { replace: true },
    )
  }

  const changeStatus = async (target: StatusTarget, nextStatus: string) => {
    if (target.status === nextStatus) return
    setUpdatingId(target.id)
    try {
      const result = await api.admin.updateOrderStatus(target.id, nextStatus)
      setOrders((current) =>
        current
          .map((order) =>
            order.id === target.id ? { ...order, status: result.order.status } : order,
          )
          .filter((order) => status === 'all' || order.status === status),
      )
      setDetail((current) => (current && current.id === target.id ? result.order : current))
      toast(`تم تحديث حالة ${target.orderNumber}`)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const openDetail = async (id: number) => {
    setDetailId(id)
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    try {
      const result = await api.admin.order(id)
      setDetail(result.order)
    } catch (err) {
      setDetailError(errorMessage(err))
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setDetailId(null)
    setDetail(null)
    setDetailError('')
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="OPERATIONS / ORDERS"
        title="الطلبات"
        description="تابع كل الطلبات، غيّر حالتها، وافتح التفاصيل الكاملة لكل طلب. إلغاء الطلب يعيد الكميات للمخزون تلقائيًا."
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
            <div className="relative">
              <Icon
                name="search"
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="رقم الطلب / اسم / هاتف"
                className="field h-9 w-56 !py-1.5 pe-9 ps-3 text-xs"
                aria-label="بحث في الطلبات"
              />
            </div>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => applyStatus('all')}
          className={cx('chip !py-1.5 text-[10px]', status === 'all' && 'chip-active')}
        >
          كل الطلبات
        </button>
        {STATUS_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => applyStatus(key)}
            className={cx('chip !py-1.5 text-[10px]', status === key && 'chip-active')}
          >
            {STATUS_LABEL[key]}
          </button>
        ))}
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="ms-auto text-[10px] text-volt underline underline-offset-4"
          >
            مسح البحث ({search})
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-[10px] text-muted">
        <span className="rounded-full border border-line px-2.5 py-1">
          {summary.count} طلب معروض
        </span>
        <span className="rounded-full border border-line px-2.5 py-1">
          {summary.items} قطعة
        </span>
        <span className="rounded-full border border-line px-2.5 py-1">
          إجمالي {formatEGP(summary.total)}
        </span>
      </div>

      {loading && orders.length === 0 ? (
        <AdminLoading label="LOADING ORDERS" />
      ) : error && orders.length === 0 ? (
        <AdminError message={error} onRetry={load} />
      ) : orders.length === 0 ? (
        <AdminEmpty
          icon="orders"
          title="لا توجد طلبات مطابقة"
          message={
            search || status !== 'all'
              ? 'جرّب تغيير الفلتر أو مسح البحث لعرض كل الطلبات.'
              : 'أول طلب يتم من المتجر هيظهر هنا فورًا.'
          }
          action={
            search || status !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  clearSearch()
                  applyStatus('all')
                }}
                className="btn btn-ghost btn-sm"
              >
                إعادة ضبط الفلاتر
              </button>
            ) : (
              <Link to="/shop" className="btn btn-volt btn-sm">
                عرض المتجر
              </Link>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-ink2">
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[1000px]">
              <thead>
                <tr>
                  <th>الطلب</th>
                  <th>العميل</th>
                  <th>الهاتف</th>
                  <th>المحافظة</th>
                  <th>القطع</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th className="text-end">تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <button
                        type="button"
                        onClick={() => openDetail(order.id)}
                        className="font-mono text-[11px] text-bone transition hover:text-volt"
                      >
                        {order.orderNumber}
                      </button>
                    </td>
                    <td className="max-w-[160px] truncate text-[11px]">{order.customerName}</td>
                    <td className="font-mono text-[10px] text-muted" dir="ltr">
                      {order.phone}
                    </td>
                    <td className="text-[11px] text-muted">
                      {order.governorate}
                      <span className="block text-[9px] text-muted/60">{order.city}</span>
                    </td>
                    <td className="font-mono text-[10px] text-muted">{order.itemsCount}</td>
                    <td className="whitespace-nowrap font-mono text-[11px]">{formatEGP(order.total)}</td>
                    <td>
                      <select
                        value={order.status}
                        onChange={(event) => changeStatus(order, event.target.value)}
                        disabled={updatingId === order.id || order.status === 'cancelled'}
                        className="field !w-auto !px-2 !py-1 text-[10px]"
                        aria-label={`حالة الطلب ${order.orderNumber}`}
                      >
                        {STATUS_KEYS.map((key) => (
                          <option key={key} value={key}>
                            {STATUS_LABEL[key]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap text-[10px] text-muted">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetail(order.id)}
                          className="icon-btn !h-8 !w-8"
                          aria-label={`عرض تفاصيل ${order.orderNumber}`}
                          title="التفاصيل"
                        >
                          <Icon name="eye" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminDrawer
        open={detailId !== null}
        title={detail?.orderNumber ?? 'تفاصيل الطلب'}
        subtitle="ORDER DETAILS"
        onClose={closeDetail}
        footer={
          detail ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow !text-[9px]">UPDATE STATUS</p>
                <select
                  value={detail.status}
                  onChange={(event) => changeStatus(detail, event.target.value)}
                  disabled={updatingId === detail.id || detail.status === 'cancelled'}
                  className="field mt-2 !w-auto !py-1.5 text-[11px]"
                  aria-label={`تحديث حالة الطلب ${detail.orderNumber}`}
                >
                  {STATUS_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {STATUS_LABEL[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={confirmOrderLink(detail)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn btn-sm border border-[#25D366]/35 bg-[#25D366]/10 text-[#25D366] transition hover:border-[#25D366]/70"
                >
                  <Icon name="whatsapp" size={13} />
                  إرسال تأكيد للعميل
                </a>
                <Link
                  to={`/admin/orders?search=${encodeURIComponent(detail.orderNumber)}`}
                  onClick={closeDetail}
                  className="btn btn-ghost btn-sm"
                >
                  <Icon name="search" size={13} />
                  في القائمة
                </Link>
              </div>
            </div>
          ) : undefined
        }
      >
        {detailLoading ? (
          <div className="grid min-h-[40vh] place-items-center">
            <div className="flex flex-col items-center gap-3">
              <span className="spinner spinner-light !h-7 !w-7" />
              <span className="eyebrow !text-[9px]">LOADING ORDER</span>
            </div>
          </div>
        ) : detailError ? (
          <AdminError message={detailError} onRetry={() => detailId && openDetail(detailId)} />
        ) : detail ? (
          <div className="[&_.panel]:!rounded-xl [&_.panel]:!bg-ink/60">
            <OrderDetails order={detail} />
          </div>
        ) : null}
      </AdminDrawer>
    </div>
  )
}
