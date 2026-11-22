import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import type { StockAlert, StockAlertStatus } from '../../lib/types'
import { cx, formatDate } from '../../lib/format'
import { useToast } from '../../store/toast'
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  ConfirmDialog,
} from '../../components/admin/ui'
import { Icon } from '../../components/ui/Icon'

type StatusFilter = 'all' | StockAlertStatus

const STATUS_LABEL: Record<StockAlertStatus, string> = {
  pending: 'بانتظار التوفر',
  ready: 'جاهز للتواصل',
  notified: 'تم التواصل',
}

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'pending', label: 'بانتظار التوفر' },
  { value: 'ready', label: 'جاهز للتواصل' },
  { value: 'notified', label: 'تم التواصل' },
]

export default function AdminStockAlerts() {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const load = useCallback(() => {
    let active = true
    setLoading(true)
    setError('')
    api.admin
      .stockAlerts(filter === 'all' ? undefined : filter)
      .then((result) => {
        if (!active) return
        setAlerts(result.alerts)
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
  }, [filter, refreshKey])

  useEffect(() => load(), [load])

  const counts = useMemo(
    () => ({
      all: alerts.length,
      pending: alerts.filter((item) => item.status === 'pending').length,
      ready: alerts.filter((item) => item.status === 'ready').length,
      notified: alerts.filter((item) => item.status === 'notified').length,
    }),
    [alerts],
  )

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return alerts
    return alerts.filter((item) =>
      [item.productName, item.phone, item.size, item.color, item.productSlug]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [alerts, search])

  const markNotified = async (alert: StockAlert) => {
    setBusyId(alert.id)
    try {
      await api.admin.markStockAlertNotified(alert.id)
      setAlerts((current) =>
        current.map((item) =>
          item.id === alert.id
            ? { ...item, status: 'notified' as const, notifiedAt: new Date().toISOString() }
            : item,
        ),
      )
      toast(`تم تسجيل التواصل بخصوص ${alert.productName}`)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const removeAlert = async () => {
    if (deleteId == null) return
    setDeleting(true)
    try {
      await api.admin.deleteStockAlert(deleteId)
      setAlerts((current) => current.filter((item) => item.id !== deleteId))
      toast('تم حذف التنبيه')
      setDeleteId(null)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="OPERATIONS / STOCK ALERTS"
        title="تنبيهات التوفر"
        description="طلبات العملاء للمقاسات النافدة. أول ما المخزون يرجع، التنبيه بيتحرك ل«جاهز للتواصل» — تواصل مع العميل عبر واتساب ثم سجّل أنه تم."
        actions={
          <>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="btn btn-ghost btn-sm"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner spinner-light !h-3.5 !w-3.5" />
              ) : (
                <Icon name="refresh" size={13} />
              )}
              تحديث
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
                placeholder="منتج / رقم / مقاس"
                className="field h-9 w-52 !py-1.5 pe-9 ps-3 text-xs"
                aria-label="بحث في التنبيهات"
              />
            </div>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'كل التنبيهات', value: counts.all, tone: 'default' },
          { label: 'بانتظار التوفر', value: counts.pending, tone: 'warn' },
          { label: 'جاهز للتواصل', value: counts.ready, tone: 'volt' },
          { label: 'تم التواصل', value: counts.notified, tone: 'default' },
        ].map((item) => (
          <div
            key={item.label}
            className={cx(
              'rounded-xl border px-4 py-3',
              item.tone === 'volt'
                ? 'border-volt/25 bg-volt/[0.05]'
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

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={cx('chip !py-2 text-[10px]', filter === item.value && 'chip-active')}
            aria-pressed={filter === item.value}
          >
            {item.label} ({counts[item.value]})
          </button>
        ))}
      </div>

      {loading && alerts.length === 0 ? (
        <AdminLoading label="LOADING ALERTS" />
      ) : error && alerts.length === 0 ? (
        <AdminError message={error} onRetry={load} />
      ) : visible.length === 0 ? (
        <AdminEmpty
          icon="mail"
          title={search ? 'لا توجد تنبيهات مطابقة' : 'لا توجد تنبيهات هنا'}
          message={
            search
              ? 'جرّب كلمة بحث أخرى أو غيّر حالة العرض.'
              : 'طلبات «نبّهني لما يتوفر» من صفحة المنتج ستظهر هنا تلقائيًا.'
          }
          action={
            search ? (
              <button type="button" onClick={() => setSearch('')} className="btn btn-ghost btn-sm">
                مسح البحث
              </button>
            ) : (
              <Link to="/admin/inventory" className="btn btn-ghost btn-sm">
                <Icon name="layers" size={13} />
                اذهب للمخزون
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
                  <th>المقاس / اللون</th>
                  <th>العميل</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th className="text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((alert) => (
                  <tr key={alert.id} data-stock-alert-row={alert.id}>
                    <td>
                      <Link
                        to={`/product/${alert.productSlug}`}
                        className="block max-w-[240px] truncate text-xs font-medium transition hover:text-volt"
                      >
                        {alert.productName}
                      </Link>
                      <span className="mt-0.5 block font-mono text-[9px] text-muted">
                        #{String(alert.productId).padStart(3, '0')}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px]">
                          {alert.size}
                        </span>
                        <span className="text-[10px] text-muted">{alert.color || '—'}</span>
                      </div>
                      <span className="mt-0.5 block font-mono text-[9px] text-muted">
                        مخزون الآن: {alert.stock}
                      </span>
                    </td>
                    <td>
                      <a
                        href={`tel:${alert.phone}`}
                        dir="ltr"
                        className="inline-flex items-center gap-1.5 font-mono text-[11px] transition hover:text-volt"
                      >
                        <Icon name="phone" size={12} />
                        {alert.phone}
                      </a>
                    </td>
                    <td>
                      <span
                        className={cx(
                          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px]',
                          alert.status === 'ready'
                            ? 'bg-volt/15 text-volt'
                            : alert.status === 'pending'
                              ? 'bg-amber-300/10 text-amber-200'
                              : 'bg-bone/10 text-muted',
                        )}
                      >
                        <span className="h-1 w-1 rounded-full bg-current" />
                        {STATUS_LABEL[alert.status]}
                      </span>
                    </td>
                    <td className="text-[10px] text-muted">{formatDate(alert.createdAt)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {alert.status === 'ready' && (
                          <>
                            <a
                              href={alert.whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-volt btn-sm !px-2.5 !py-1.5 text-[10px]"
                              data-alert-whatsapp={alert.id}
                            >
                              <Icon name="whatsapp" size={12} />
                              تواصل
                            </a>
                            <button
                              type="button"
                              onClick={() => markNotified(alert)}
                              disabled={busyId === alert.id}
                              className="btn btn-ghost btn-sm !px-2.5 !py-1.5 text-[10px]"
                              data-alert-notify={alert.id}
                            >
                              {busyId === alert.id ? (
                                <span className="spinner !h-3 !w-3" />
                              ) : (
                                <Icon name="check" size={12} />
                              )}
                              تم التواصل
                            </button>
                          </>
                        )}
                        {alert.status === 'notified' && alert.notifiedAt && (
                          <span className="text-[9px] text-muted">
                            {formatDate(alert.notifiedAt)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteId(alert.id)}
                          className="icon-btn !h-7 !w-7 hover:!border-flare/40 hover:!text-flare"
                          aria-label={`حذف تنبيه ${alert.productName}`}
                          data-alert-delete={alert.id}
                        >
                          <Icon name="trash" size={12} />
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

      <div className="mt-4 rounded-xl border border-line bg-ink2/60 p-4 text-[10px] leading-5 text-muted">
        التنبيه بيتم تسجيله برقم العميل فقط، من غير تخزين بيانات دفع. عند تعديل المخزون من صفحة
        «المخزون» أو إلغاء طلب، التنبيهات المرتبطة بالمتغير نفسه بتتحرك تلقائيًا لحالة «جاهز للتواصل».
      </div>

      <ConfirmDialog
        open={deleteId != null}
        title="حذف التنبيه؟"
        message="سيتم حذف طلب التنبيه نهائيًا ولن يظهر في قائمة التواصل."
        confirmLabel="حذف"
        danger
        loading={deleting}
        onConfirm={removeAlert}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
