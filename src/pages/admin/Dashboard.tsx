import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api, errorMessage } from '../../lib/api'
import type { AdminStats, FinanceReport } from '../../lib/types'
import { STATUS_LABEL, STATUS_STEPS } from '../../lib/constants'
import { cx, formatDateTime, formatEGP, formatNumber } from '../../lib/format'
import { AdminError } from '../../components/admin/ui'
import { StatusBadge } from '../../components/commerce/OrderDetails'
import { Icon, type IconName } from '../../components/ui/Icon'

const STATUS_ORDER: string[] = [...STATUS_STEPS, 'cancelled']

const STATUS_COLOR: Record<string, string> = {
  pending: '#f5c451',
  confirmed: '#a9c7ff',
  packed: '#c4b5fd',
  shipped: '#7dd3fc',
  delivered: '#d9ff43',
  cancelled: '#ff5a36',
}

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-amber-300',
  confirmed: 'bg-sky-300',
  packed: 'bg-indigo-300',
  shipped: 'bg-ice',
  delivered: 'bg-volt',
  cancelled: 'bg-flare',
}

type KpiCard = {
  key: string
  label: string
  value: string
  caption: string
  icon: IconName
  accent?: boolean
  delta?: number | null
  spark?: number[]
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function shortDay(value: string) {
  return value ? value.slice(5).replace('-', '/') : ''
}

export default function Dashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [finance, setFinance] = useState<FinanceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    const to = new Date().toISOString().slice(0, 10)
    const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
    Promise.all([api.admin.stats(), api.admin.finance({ from, to })])
      .then(([result, money]) => {
        setStats(result)
        setFinance(money)
        setUpdatedAt(new Date())
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

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    [],
  )

  const updatedLabel = useMemo(
    () =>
      updatedAt
        ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
            hour: '2-digit',
            minute: '2-digit',
          }).format(updatedAt)
        : '—',
    [updatedAt],
  )

  const derived = useMemo(() => {
    if (!stats) return null
    const series = stats.series
    const recent7 = series.slice(-7)
    const previous7 = series.slice(0, Math.max(series.length - 7, 0))
    const recentRevenue = sum(recent7.map((item) => item.revenue))
    const previousRevenue = sum(previous7.map((item) => item.revenue))
    const recentOrders = sum(recent7.map((item) => item.orders))
    const previousOrders = sum(previous7.map((item) => item.orders))
    const total = sum(series.map((item) => item.revenue))
    const peak = series.reduce(
      (best, item) => (item.revenue > best.revenue ? item : best),
      series[0] ?? { day: '', revenue: 0, orders: 0 },
    )
    return {
      recentRevenue,
      recentOrders,
      revenueDelta: percentChange(recentRevenue, previousRevenue),
      ordersDelta: percentChange(recentOrders, previousOrders),
      total,
      average: total / Math.max(series.length, 1),
      peak,
    }
  }, [stats])

  if (loading && !stats) return <DashboardSkeleton />
  if (error && !stats) return <AdminError message={error} onRetry={load} />
  if (!stats || !derived) return null

  const kpis: KpiCard[] = [
    {
      key: 'revenue',
      label: 'إجمالي الإيرادات',
      value: formatEGP(stats.kpis.revenue),
      caption: `آخر 7 أيام: ${formatEGP(derived.recentRevenue)}`,
      icon: 'credit-card',
      accent: true,
      delta: derived.revenueDelta,
      spark: stats.series.map((item) => item.revenue),
    },
    {
      key: 'orders',
      label: 'إجمالي الطلبات',
      value: formatNumber(stats.kpis.orders),
      caption: `آخر 7 أيام: ${formatNumber(derived.recentOrders)} طلب`,
      icon: 'orders',
      delta: derived.ordersDelta,
      spark: stats.series.map((item) => item.orders),
    },
    {
      key: 'products',
      label: 'المنتجات',
      value: formatNumber(stats.kpis.products),
      caption: 'قطعة في الكتالوج',
      icon: 'box',
    },
    {
      key: 'customers',
      label: 'العملاء',
      value: formatNumber(stats.kpis.customers),
      caption: 'عميل مسجل في المتجر',
      icon: 'users',
    },
  ]

  const peakLabel = derived.peak.revenue > 0 ? shortDay(derived.peak.day) : '—'

  return (
    <div className="space-y-4 pb-4">
      {/* Command header */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-2xl border border-line bg-ink2 p-5 md:p-6"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_0%,rgba(217,255,67,.11),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(169,199,255,.05),transparent_52%)]" />
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(241,238,229,.65) 1px, transparent 1px), linear-gradient(90deg, rgba(241,238,229,.65) 1px, transparent 1px)',
              backgroundSize: '46px 46px',
              maskImage: 'radial-gradient(circle at 80% 20%, black 2%, transparent 62%)',
            }}
          />
          <span
            className="display absolute -right-3 -top-9 select-none text-[9rem] leading-none text-transparent opacity-[0.045]"
            style={{ WebkitTextStroke: '1px #f1eee5' }}
          >
            SX
          </span>
        </div>

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="flex items-center gap-2 rounded-full border border-volt/25 bg-volt/[0.07] px-2.5 py-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-volt" />
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-volt">
                  LIVE CONTROL ROOM
                </span>
              </span>
              <span className="font-mono text-[9px] text-muted">{todayLabel}</span>
            </div>

            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight md:text-[2rem]">
              نبض المتجر
            </h1>
            <p className="mt-2 max-w-xl text-xs leading-6 text-muted">
              كل ما يحدث في SNEAKERX الآن — الطلبات، الإيرادات، المخزون، وأداء القطع في شاشة واحدة.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <AttentionChip
                to="/admin/orders?status=pending"
                icon="clock"
                tone={stats.kpis.newOrders > 0 ? 'warn' : 'muted'}
                label={
                  stats.kpis.newOrders > 0
                    ? `${formatNumber(stats.kpis.newOrders)} طلب يحتاج مراجعة`
                    : 'لا طلبات معلقة'
                }
              />
              {stats.kpis.lowStock > 0 && (
                <AttentionChip
                  to="/admin/inventory"
                  icon="layers"
                  tone="warn"
                  label={`${formatNumber(stats.kpis.lowStock)} متغير مخزونه منخفض`}
                />
              )}
              {stats.kpis.outOfStock > 0 && (
                <AttentionChip
                  to="/admin/inventory"
                  icon="cancel"
                  tone="danger"
                  label={`${formatNumber(stats.kpis.outOfStock)} متغير نفد من المخزون`}
                />
              )}
              {stats.kpis.newOrders === 0 && stats.kpis.lowStock === 0 && stats.kpis.outOfStock === 0 && (
                <span className="inline-flex items-center gap-2 rounded-full border border-volt/25 bg-volt/[0.06] px-3 py-1.5 text-[10px] text-volt">
                  <Icon name="check" size={12} />
                  كل شيء تحت السيطرة
                </span>
              )}
              <AttentionChip
                to="/admin/orders"
                icon="orders"
                tone="muted"
                label={`${formatNumber(stats.kpis.subscribers)} مشترك في النشرة`}
              />
            </div>
          </div>

          <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="btn btn-ghost btn-sm"
              >
                <Icon name="refresh" size={13} className={loading ? 'animate-spin' : undefined} />
                تحديث البيانات
              </button>
              <Link to="/admin/products/new" className="btn btn-volt btn-sm">
                <Icon name="plus" size={14} />
                منتج جديد
              </Link>
            </div>
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted">
              LAST SYNC — {updatedLabel}
            </p>
          </div>
        </div>
      </motion.section>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.04 * index, ease: 'easeOut' }}
            className={cx(
              'relative overflow-hidden rounded-2xl border bg-ink2 p-4 transition-colors duration-300',
              kpi.accent
                ? 'border-volt/25 bg-[radial-gradient(circle_at_100%_0%,rgba(217,255,67,.09),transparent_62%)]'
                : 'border-line hover:border-bone/20',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className={cx(
                  'grid h-9 w-9 place-items-center rounded-xl border',
                  kpi.accent
                    ? 'border-volt/20 bg-volt/[0.09] text-volt'
                    : 'border-line bg-ink3 text-bone/55',
                )}
              >
                <Icon name={kpi.icon} size={16} />
              </span>
              {kpi.delta != null ? (
                <DeltaBadge value={kpi.delta} />
              ) : (
                <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-muted/70">
                  TOTAL
                </span>
              )}
            </div>

            <p className="mt-4 text-[10px] text-muted">{kpi.label}</p>
            <p
              className={cx(
                'mt-1 font-display text-[clamp(1.45rem,2.1vw,1.95rem)] font-bold tracking-tight',
                kpi.accent && 'text-volt',
              )}
            >
              {kpi.value}
            </p>

            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-[9px] leading-4 text-muted">{kpi.caption}</span>
              {kpi.spark && kpi.spark.length > 1 ? (
                <Sparkline
                  values={kpi.spark}
                  className={kpi.accent ? 'text-volt' : 'text-bone/55'}
                />
              ) : (
                <span className="font-mono text-[8px] text-muted/50">SNEAKERX</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Finance strip */}
      {finance && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="rounded-2xl border border-volt/20 bg-[radial-gradient(circle_at_100%_0%,rgba(217,255,67,.08),transparent_60%)] bg-ink2 p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow eyebrow-volt !text-[9px]">PROFIT & LOSS / 30 DAYS</p>
              <h2 className="mt-1 font-display text-lg font-bold">الصورة المالية</h2>
            </div>
            <Link to="/admin/finance" className="btn btn-ghost btn-sm">
              <Icon name="chart" size={13} />
              التقرير المالي الكامل
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceTile label="صافي الربح" value={finance.summary.netProfit} note={`هامش ${finance.summary.margin.toFixed(1)}%`} positive={finance.summary.netProfit >= 0} />
            <FinanceTile label="الربح الإجمالي" value={finance.summary.grossProfit} note={`بعد تكلفة البضاعة ${formatEGP(finance.summary.cogs)}`} positive={finance.summary.grossProfit >= 0} />
            <FinanceTile label="المصروفات" value={finance.summary.expenses} note="تكاليف تشغيلية" positive={false} />
            <FinanceTile label="المشتريات" value={finance.summary.purchases} note={`مخزون بقيمة ${formatEGP(finance.summary.inventoryValue)}`} positive={false} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line/70 pt-3 text-[10px] text-muted">
            <span>إيرادات: <span className="font-mono text-bone/80">{formatEGP(finance.summary.revenue)}</span></span>
            <span>داخل: <span className="font-mono text-volt">{formatEGP(finance.summary.cashIn)}</span></span>
            <span>خارج: <span className="font-mono text-flare">{formatEGP(finance.summary.cashOut)}</span></span>
            <span>التدفق النقدي: <span className={cx('font-mono', finance.summary.cashFlow >= 0 ? 'text-volt' : 'text-flare')}>{formatEGP(finance.summary.cashFlow)}</span></span>
            <span className="mr-auto">بيانات مباشرة من المتجر</span>
          </div>
        </motion.section>
      )}

      {/* Analytics row */}
      <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="rounded-2xl border border-line bg-ink2 p-5"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow !text-[9px]">REVENUE / 14 DAYS</p>
              <h2 className="mt-1 font-display text-lg font-bold">حركة الإيرادات</h2>
            </div>
            <span className="rounded-full border border-line bg-ink/40 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
              PEAK — {peakLabel}
            </span>
          </div>

          <RevenueChart
            series={stats.series}
            total={derived.total}
            average={derived.average}
            peakRevenue={derived.peak.revenue}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="rounded-2xl border border-line bg-ink2 p-5"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow !text-[9px]">ORDER PIPELINE</p>
              <h2 className="mt-1 font-display text-lg font-bold">حالات الطلبات</h2>
            </div>
            <Link
              to="/admin/orders"
              className="mt-1 text-[10px] text-muted transition hover:text-volt"
            >
              إدارة
            </Link>
          </div>

          <OrderPipeline statuses={stats.statuses} />

          <Link
            to="/admin/orders"
            className="mt-4 flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-[10px] text-muted transition hover:border-volt/30 hover:text-bone"
          >
            عرض كل الطلبات
            <Icon name="arrow-left" size={12} />
          </Link>
        </motion.section>
      </div>

      {/* Operations row */}
      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="overflow-hidden rounded-2xl border border-line bg-ink2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
            <div>
              <p className="eyebrow !text-[9px]">RECENT ORDERS</p>
              <h2 className="mt-1 font-display text-lg font-bold">آخر الطلبات</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] text-muted">
                {formatNumber(stats.kpis.orders)} TOTAL
              </span>
              <Link to="/admin/orders" className="text-[10px] text-muted transition hover:text-volt">
                عرض الكل
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="admin-table min-w-[680px]">
              <thead>
                <tr>
                  <th>الطلب</th>
                  <th>العميل</th>
                  <th>المحافظة</th>
                  <th>القطع</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        to={`/admin/orders?search=${encodeURIComponent(order.orderNumber)}`}
                        className="font-mono text-[11px] text-bone transition hover:text-volt"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="mt-0.5 whitespace-nowrap text-[9px] text-muted">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-ink3 font-display text-[11px] font-bold text-bone/75">
                          {order.customerName.trim().slice(0, 1)}
                        </span>
                        <span className="max-w-[9rem] truncate text-[11px]">
                          {order.customerName}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-[10px] text-muted">
                        <Icon name="map-pin" size={11} />
                        {order.governorate}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-[10px] text-muted">
                        {formatNumber(order.itemsCount)}
                      </span>
                    </td>
                    <td className="font-mono text-[11px]">{formatEGP(order.total)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
                {stats.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[11px] text-muted">
                      لا توجد طلبات بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.section>

        <div className="space-y-4">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="rounded-2xl border border-line bg-ink2 p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow !text-[9px]">TOP SELLERS</p>
                <h2 className="mt-1 font-display text-lg font-bold">الأكثر مبيعًا</h2>
              </div>
              <span className="grid h-8 w-8 place-items-center rounded-full border border-volt/20 bg-volt/[0.07] text-volt">
                <Icon name="sparkle" size={14} filled />
              </span>
            </div>

            <ol className="space-y-3">
              {stats.topProducts.map((product, index) => {
                const maxQty = stats.topProducts[0]?.qty || 1
                return (
                  <li key={`${product.productId}-${index}`}>
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        to={`/product/${product.slug}`}
                        className="group flex min-w-0 items-center gap-2.5"
                      >
                        <span
                          className={cx(
                            'grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[9px]',
                            index === 0
                              ? 'border-volt/40 bg-volt/15 text-volt'
                              : 'border-line bg-ink3 text-muted',
                          )}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] transition group-hover:text-volt">
                            {product.name}
                          </span>
                          <span className="mt-0.5 block font-mono text-[8px] text-muted">
                            {formatEGP(product.revenue)}
                          </span>
                        </span>
                      </Link>
                      <span className="shrink-0 font-mono text-[10px] text-bone/75">
                        {formatNumber(product.qty)}
                      </span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink3">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-volt/55 to-volt"
                        style={{ width: `${Math.max((product.qty / maxQty) * 100, 4)}%` }}
                      />
                    </div>
                  </li>
                )
              })}
              {stats.topProducts.length === 0 && (
                <li className="text-[11px] text-muted">لا توجد مبيعات بعد.</li>
              )}
            </ol>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="rounded-2xl border border-line bg-ink2 p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow !text-[9px]">LOW STOCK</p>
                <h2 className="mt-1 font-display text-lg font-bold">تنبيهات المخزون</h2>
              </div>
              <Link
                to="/admin/inventory"
                className="text-[10px] text-muted transition hover:text-volt"
              >
                إدارة
              </Link>
            </div>

            <ul className="space-y-2">
              {stats.lowStockItems.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/admin/products/${item.productId}/edit`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line/70 px-3 py-2 transition hover:border-amber-300/25 hover:bg-ink3/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[10px]">{item.name}</p>
                      <p className="mt-0.5 text-[9px] text-muted">
                        {item.color} / مقاس {item.size}
                      </p>
                    </div>
                    <span
                      className={cx(
                        'shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px]',
                        item.stock === 0
                          ? 'bg-flare/15 text-flare'
                          : 'bg-amber-300/10 text-amber-200',
                      )}
                    >
                      {item.stock === 0 ? 'نفد' : `${item.stock} قطع`}
                    </span>
                  </Link>
                </li>
              ))}
              {stats.lowStockItems.length === 0 && (
                <li className="flex items-center gap-2 rounded-xl border border-volt/20 bg-volt/[0.05] px-3 py-3 text-[10px] text-volt">
                  <Icon name="check" size={13} />
                  المخزون كله في وضع آمن.
                </li>
              )}
            </ul>
          </motion.section>
        </div>
      </div>

      <p className="px-1 text-center font-mono text-[8px] uppercase tracking-[0.18em] text-muted/50">
        SNEAKERX CONTROL ROOM — LIVE
      </p>
    </div>
  )
}

function FinanceTile({
  label,
  value,
  note,
  positive,
}: {
  label: string
  value: number
  note: string
  positive: boolean
}) {
  return (
    <div className="rounded-xl border border-line bg-ink/50 px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted">{label}</p>
        <Icon name={positive ? 'trend-up' : 'trend-down'} size={13} className={positive ? 'text-volt' : 'text-flare'} />
      </div>
      <p className={cx('mt-2 font-display text-lg font-bold', positive ? 'text-volt' : 'text-flare')}>
        {formatEGP(Math.round(value))}
      </p>
      <p className="mt-1 truncate text-[9px] text-muted">{note}</p>
    </div>
  )
}

function AttentionChip({
  to,
  icon,
  label,
  tone,
}: {
  to: string
  icon: IconName
  label: string
  tone: 'warn' | 'danger' | 'muted'
}) {
  return (
    <Link
      to={to}
      className={cx(
        'group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] transition',
        tone === 'warn' && 'border-amber-300/25 bg-amber-300/[0.07] text-amber-200 hover:border-amber-300/50',
        tone === 'danger' && 'border-flare/25 bg-flare/[0.07] text-flare hover:border-flare/50',
        tone === 'muted' && 'border-line text-muted hover:border-bone/25 hover:text-bone',
      )}
    >
      <Icon name={icon} size={12} />
      {label}
      <Icon
        name="arrow-left"
        size={11}
        className="opacity-50 transition-transform group-hover:-translate-x-0.5"
      />
    </Link>
  )
}

function DeltaBadge({ value }: { value: number }) {
  const positive = value >= 0
  const display = Math.abs(value).toFixed(Math.abs(value) % 1 === 0 ? 0 : 1)
  return (
    <span
      title="مقارنة بآخر 7 أيام"
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[9px]',
        positive
          ? 'border-volt/20 bg-volt/[0.07] text-volt'
          : 'border-flare/25 bg-flare/[0.07] text-flare',
      )}
    >
      <Icon
        name="arrow-up-right"
        size={10}
        className={positive ? undefined : 'rotate-90'}
      />
      {positive ? '+' : '−'}
      {display}%
    </span>
  )
}

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null
  const width = 104
  const height = 32
  const pad = 2
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const points = values.map((value, index) => ({
    x: pad + (index / (values.length - 1)) * (width - pad * 2),
    y: height - pad - ((value - min) / span) * (height - pad * 2),
  }))
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ')
  const last = points[points.length - 1]
  const first = points[0]
  const area = `${path} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cx('h-8 w-24 shrink-0 overflow-visible', className)}
      aria-hidden="true"
    >
      <path d={area} fill="currentColor" opacity={0.09} />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={2.1} fill="currentColor" />
    </svg>
  )
}

function RevenueChart({
  series,
  total,
  average,
  peakRevenue,
}: {
  series: AdminStats['series']
  total: number
  average: number
  peakRevenue: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const width = 720
  const height = 210
  const padX = 6
  const padTop = 16
  const padBottom = 8
  const max = Math.max(...series.map((item) => item.revenue), 1)
  const count = Math.max(series.length, 1)
  const points = series.map((item, index) => ({
    x: padX + (index / Math.max(count - 1, 1)) * (width - padX * 2),
    y: padTop + (1 - item.revenue / max) * (height - padTop - padBottom),
    item,
    index,
  }))

  const line = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`
    const previous = points[index - 1]
    const cx = (previous.x + point.x) / 2
    return `${path} C ${cx} ${previous.y}, ${cx} ${point.y}, ${point.x} ${point.y}`
  }, '')

  const last = points[points.length - 1]
  const first = points[0]
  const area = last && first ? `${line} L ${last.x} ${height} L ${first.x} ${height} Z` : ''
  const averageY = padTop + (1 - Math.min(average / max, 1)) * (height - padTop - padBottom)
  const hoverPoint = hover != null ? points[hover] : null
  const hoverX = hoverPoint ? (hoverPoint.x / width) * 100 : 0
  const hoverY = hoverPoint ? (hoverPoint.y / height) * 100 : 0
  const labels = series.filter((_, index) => index % 3 === 0 || index === series.length - 1)

  if (series.length === 0) {
    return (
      <div className="grid h-56 place-items-center rounded-xl border border-dashed border-line text-[11px] text-muted">
        لا توجد بيانات إيرادات بعد.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        <MiniStat label="إجمالي 14 يوم" value={formatEGP(total)} tone="volt" />
        <MiniStat label="متوسط يومي" value={formatEGP(Math.round(average))} />
        <MiniStat label="أعلى يوم" value={formatEGP(peakRevenue)} />
      </div>

      <div
        className="relative h-[210px] w-full"
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`مخطط إيرادات آخر 14 يوم. الإجمالي ${formatEGP(total)}`}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {[0, 25, 50, 75, 100].map((position) => (
            <span
              key={position}
              className="absolute inset-x-0 border-t border-line/40"
              style={{ top: `${position}%` }}
            />
          ))}
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 z-10 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d9ff43" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#d9ff43" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#revenue-fill)" />
          <line
            x1={0}
            x2={width}
            y1={averageY}
            y2={averageY}
            stroke="#8f97a2"
            strokeWidth={1}
            strokeDasharray="4 7"
            opacity={0.35}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={line}
            fill="none"
            stroke="#d9ff43"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="absolute inset-0 z-20 flex">
          {series.map((item, index) => (
            <div
              key={item.day}
              className="h-full flex-1"
              onPointerEnter={() => setHover(index)}
            />
          ))}
        </div>

        {hoverPoint && (
          <>
            <span
              className="pointer-events-none absolute z-30 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink bg-volt shadow-[0_0_0_4px_rgba(217,255,67,.14)]"
              style={{ left: `${hoverX}%`, top: `${hoverY}%` }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-[calc(100%+12px)] whitespace-nowrap rounded-lg border border-line bg-ink px-2.5 py-1.5 shadow-[0_16px_40px_rgba(0,0,0,.5)]"
              style={{
                left: `${Math.min(Math.max(hoverX, 11), 89)}%`,
                top: `${hoverY}%`,
              }}
            >
              <p className="font-mono text-[8px] text-muted">{hoverPoint.item.day}</p>
              <p className="mt-0.5 font-mono text-[11px] text-volt">
                {formatEGP(hoverPoint.item.revenue)}
              </p>
              <p className="font-mono text-[8px] text-muted">{hoverPoint.item.orders} طلب</p>
            </div>
          </>
        )}
      </div>

      <div className="mt-2 flex justify-between font-mono text-[8px] text-muted/70">
        {labels.map((item) => (
          <span key={item.day}>{shortDay(item.day)}</span>
        ))}
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'volt'
}) {
  return (
    <div className="rounded-xl border border-line/70 bg-ink/30 px-3 py-2.5">
      <p className="text-[9px] text-muted">{label}</p>
      <p className={cx('mt-1 font-mono text-sm', tone === 'volt' && 'text-volt')}>{value}</p>
    </div>
  )
}

function OrderPipeline({ statuses }: { statuses: AdminStats['statuses'] }) {
  const known = new Map(statuses.map((item) => [item.status, item.count]))
  const items = STATUS_ORDER.map((status) => ({
    status,
    count: known.get(status) ?? 0,
  })).filter((item) => item.count > 0)

  const total = items.reduce((sum, item) => sum + item.count, 0)

  let cursor = 0
  const stops = items
    .map((item) => {
      const start = cursor
      cursor += (item.count / Math.max(total, 1)) * 100
      return `${STATUS_COLOR[item.status] ?? '#8f97a2'} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`
    })
    .join(', ')

  if (total === 0) {
    return (
      <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-line text-[11px] text-muted">
        لا توجد طلبات بعد.
      </div>
    )
  }

  return (
    <div>
      <div className="mt-3 flex justify-center">
        <div className="relative h-40 w-40">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: `conic-gradient(${stops})`, transform: 'rotate(-90deg)' }}
            aria-hidden="true"
          />
          <div className="absolute inset-[17%] rounded-full border border-line/60 bg-ink2" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="font-display text-2xl font-bold tracking-tight">{formatNumber(total)}</p>
              <p className="mt-0.5 text-[9px] text-muted">إجمالي الطلبات</p>
            </div>
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-1.5">
        {items.map((item) => {
          const percent = total > 0 ? (item.count / total) * 100 : 0
          return (
            <li
              key={item.status}
              className="flex items-center gap-2.5 rounded-lg border border-line/60 px-2.5 py-1.5"
            >
              <span
                className={cx('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[item.status] ?? 'bg-muted')}
              />
              <span className="flex-1 text-[10px] text-bone/75">
                {STATUS_LABEL[item.status] ?? item.status}
              </span>
              <span className="font-mono text-[9px] text-muted">{percent.toFixed(0)}%</span>
              <span className="w-6 text-end font-mono text-[11px]">{formatNumber(item.count)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-44 rounded-2xl border border-line bg-ink2" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-32 rounded-2xl border border-line bg-ink2" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <div className="h-80 rounded-2xl border border-line bg-ink2" />
        <div className="h-80 rounded-2xl border border-line bg-ink2" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="h-72 rounded-2xl border border-line bg-ink2" />
        <div className="h-72 rounded-2xl border border-line bg-ink2" />
      </div>
    </div>
  )
}
