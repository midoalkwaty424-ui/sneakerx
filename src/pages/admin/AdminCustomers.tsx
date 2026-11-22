import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import type { AdminCustomer, OrderSummary } from '../../lib/types'
import { cx, formatDate, formatDateTime, formatEGP, relativeDay } from '../../lib/format'
import {
  AdminDrawer,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from '../../components/admin/ui'
import { StatusBadge } from '../../components/commerce/OrderDetails'
import { Icon } from '../../components/ui/Icon'

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [detailId, setDetailId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AdminCustomer | null>(null)
  const [detailOrders, setDetailOrders] = useState<OrderSummary[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const load = useCallback(() => {
    let active = true
    setLoading(true)
    setError('')
    api.admin
      .customers()
      .then((result) => {
        if (!active) return
        setCustomers(result.customers)
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
  }, [])

  useEffect(() => load(), [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return customers
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email ?? '', customer.governorate ?? '', customer.city ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [customers, search])

  const summary = useMemo(() => {
    return {
      total: customers.length,
      repeat: customers.filter((customer) => customer.ordersCount > 1).length,
      revenue: customers.reduce((sum, customer) => sum + customer.totalSpent, 0),
    }
  }, [customers])

  const openDetail = async (id: number) => {
    setDetailId(id)
    setDetail(null)
    setDetailOrders([])
    setDetailError('')
    setDetailLoading(true)
    try {
      const result = await api.admin.customer(id)
      setDetail(result.customer)
      setDetailOrders(result.orders)
    } catch (err) {
      setDetailError(errorMessage(err))
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setDetailId(null)
    setDetail(null)
    setDetailOrders([])
    setDetailError('')
  }

  if (loading && customers.length === 0) return <AdminLoading label="LOADING CUSTOMERS" />
  if (error && customers.length === 0) return <AdminError message={error} onRetry={load} />

  return (
    <div>
      <AdminPageHeader
        eyebrow="CRM / CUSTOMERS"
        title="العملاء"
        description="كل من أكمل طلبًا يظهر هنا مع عدد طلباته وإجمالي مشترياته."
        actions={
          <div className="relative">
            <Icon
              name="search"
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالاسم / الهاتف / المحافظة"
              className="field h-9 w-60 !py-1.5 pe-9 ps-3 text-xs"
              aria-label="بحث في العملاء"
            />
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'إجمالي العملاء', value: String(summary.total), icon: 'users' as const },
          { label: 'عملاء متكررون', value: String(summary.repeat), icon: 'refresh' as const },
          { label: 'إجمالي المشتريات', value: formatEGP(summary.revenue), icon: 'credit-card' as const },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl border border-line bg-ink2 px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-muted">
              <Icon name={item.icon} size={15} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] text-muted">{item.label}</p>
              <p className="truncate font-mono text-base">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {search && (
        <div className="mb-3 flex items-center gap-3 text-[10px] text-muted">
          <span>{filtered.length} نتيجة لـ «{search}»</span>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-volt underline underline-offset-4"
          >
            مسح البحث
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <AdminEmpty
          icon="users"
          title={search ? 'لا يوجد عملاء مطابقون' : 'لا يوجد عملاء بعد'}
          message={
            search
              ? 'جرّب كلمة بحث أخرى أو امسح البحث.'
              : 'بمجرد إتمام أول طلب من المتجر، سيظهر العميل هنا تلقائيًا.'
          }
          action={
            search ? (
              <button type="button" onClick={() => setSearch('')} className="btn btn-ghost btn-sm">
                مسح البحث
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
            <table className="admin-table min-w-[950px]">
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>الهاتف</th>
                  <th>المحافظة</th>
                  <th>الطلبات</th>
                  <th>إجمالي المشتريات</th>
                  <th>آخر طلب</th>
                  <th>تاريخ الانضمام</th>
                  <th className="text-end">تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-volt/12 font-display text-sm font-bold text-volt">
                          {customer.name.slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => openDetail(customer.id)}
                            className="block max-w-[170px] truncate text-xs font-semibold transition hover:text-volt"
                          >
                            {customer.name}
                          </button>
                          <p className="mt-0.5 max-w-[170px] truncate text-[9px] text-muted" dir="ltr">
                            {customer.email || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-[10px]" dir="ltr">
                      {customer.phone}
                    </td>
                    <td className="text-[11px] text-muted">
                      {customer.governorate || '—'}
                      {customer.city && (
                        <span className="block text-[9px] text-muted/60">{customer.city}</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={cx(
                          'rounded-full px-2 py-0.5 font-mono text-[10px]',
                          customer.ordersCount > 0
                            ? 'bg-volt/10 text-volt'
                            : 'bg-ink3 text-muted',
                        )}
                      >
                        {customer.ordersCount}
                      </span>
                    </td>
                    <td className="whitespace-nowrap font-mono text-[11px]">
                      {formatEGP(customer.totalSpent)}
                    </td>
                    <td className="whitespace-nowrap text-[10px] text-muted">
                      {customer.lastOrder ? relativeDay(customer.lastOrder) : '—'}
                    </td>
                    <td className="whitespace-nowrap text-[10px] text-muted">
                      {formatDate(customer.createdAt)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/admin/orders?search=${encodeURIComponent(customer.phone)}`}
                          className="icon-btn !h-8 !w-8"
                          aria-label={`طلبات ${customer.name}`}
                          title="طلبات العميل"
                        >
                          <Icon name="orders" size={13} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openDetail(customer.id)}
                          className="icon-btn !h-8 !w-8"
                          aria-label={`عرض تفاصيل ${customer.name}`}
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
        title={detail?.name ?? 'تفاصيل العميل'}
        subtitle="CUSTOMER PROFILE"
        onClose={closeDetail}
        footer={
          detail ? (
            <Link
              to={`/admin/orders?search=${encodeURIComponent(detail.phone)}`}
              onClick={closeDetail}
              className="btn btn-ghost btn-sm w-full"
            >
              <Icon name="orders" size={13} />
              كل طلبات هذا العميل
            </Link>
          ) : undefined
        }
      >
        {detailLoading ? (
          <div className="grid min-h-[40vh] place-items-center">
            <div className="flex flex-col items-center gap-3">
              <span className="spinner spinner-light !h-7 !w-7" />
              <span className="eyebrow !text-[9px]">LOADING CUSTOMER</span>
            </div>
          </div>
        ) : detailError ? (
          <AdminError message={detailError} onRetry={() => detailId && openDetail(detailId)} />
        ) : detail ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-xl border border-line bg-ink/50 p-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-volt/15 font-display text-xl font-bold text-volt">
                {detail.name.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{detail.name}</p>
                <p className="mt-0.5 text-[10px] text-muted">عميل منذ {formatDate(detail.createdAt)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-volt/10 px-2 py-0.5 font-mono text-[9px] text-volt">
                    {detailOrders.length} طلب
                  </span>
                  <span className="rounded-full bg-ink3 px-2 py-0.5 font-mono text-[9px] text-muted">
                    {formatEGP(detailOrders.reduce((sum, order) => sum + order.total, 0))}
                  </span>
                </div>
              </div>
            </div>

            <section>
              <h3 className="mb-3 text-[11px] font-semibold">بيانات التواصل</h3>
              <dl className="space-y-2.5 rounded-xl border border-line bg-ink/40 p-4 text-[11px]">
                <div className="flex items-start gap-3">
                  <Icon name="phone" size={13} className="mt-0.5 shrink-0 text-muted" />
                  <div className="min-w-0">
                    <dt className="text-[9px] text-muted">الهاتف</dt>
                    <dd className="mt-0.5 font-mono" dir="ltr">
                      {detail.phone}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="mail" size={13} className="mt-0.5 shrink-0 text-muted" />
                  <div className="min-w-0">
                    <dt className="text-[9px] text-muted">البريد الإلكتروني</dt>
                    <dd className="mt-0.5 break-all" dir="ltr">
                      {detail.email || '—'}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="map-pin" size={13} className="mt-0.5 shrink-0 text-muted" />
                  <div className="min-w-0">
                    <dt className="text-[9px] text-muted">العنوان</dt>
                    <dd className="mt-0.5 leading-5">
                      {[detail.governorate, detail.city].filter(Boolean).join(' — ') || '—'}
                    </dd>
                    {detail.address && (
                      <dd className="mt-1 leading-5 text-bone/75">{detail.address}</dd>
                    )}
                  </div>
                </div>
              </dl>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold">سجل الطلبات</h3>
                <span className="font-mono text-[9px] text-muted">{detailOrders.length} TOTAL</span>
              </div>
              {detailOrders.length === 0 ? (
                <p className="rounded-xl border border-line bg-ink/40 px-4 py-6 text-center text-[11px] text-muted">
                  لا توجد طلبات مسجلة لهذا العميل.
                </p>
              ) : (
                <ul className="space-y-2">
                  {detailOrders.map((order) => (
                    <li
                      key={order.id}
                      className="rounded-xl border border-line bg-ink/40 px-3.5 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-[11px]">{order.orderNumber}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-muted">
                        <span>
                          {order.itemsCount} قطعة — {formatDateTime(order.createdAt)}
                        </span>
                        <span className="font-mono text-bone">{formatEGP(order.total)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </AdminDrawer>
    </div>
  )
}
