import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { api, errorMessage } from '../../lib/api'
import type {
  CostRow,
  Expense,
  FinanceOptions,
  FinanceReport,
  Purchase,
  Supplier,
} from '../../lib/types'
import { cx, formatEGP, formatNumber } from '../../lib/format'
import { AdminDrawer, AdminEmpty, AdminError, AdminLoading, AdminPageHeader, ConfirmDialog } from '../../components/admin/ui'
import { DonutChart, MoneyChart } from '../../components/admin/finance/FinanceCharts'
import { Icon, type IconName } from '../../components/ui/Icon'

type Tab = 'overview' | 'ledger' | 'expenses' | 'purchases' | 'costs' | 'suppliers'
type Preset = '7' | '30' | '90' | 'month' | 'all' | 'custom'

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'نظرة مالية', icon: 'chart' },
  { id: 'ledger', label: 'دفتر الحركات', icon: 'receipt' },
  { id: 'expenses', label: 'المصروفات', icon: 'wallet' },
  { id: 'purchases', label: 'المشتريات', icon: 'box' },
  { id: 'costs', label: 'تكاليف المنتجات', icon: 'coins' },
  { id: 'suppliers', label: 'الموردون', icon: 'users' },
]

const PRESETS: { id: Preset; label: string; days?: number }[] = [
  { id: '7', label: '7 أيام', days: 7 },
  { id: '30', label: '30 يوم', days: 30 },
  { id: '90', label: '90 يوم', days: 90 },
  { id: 'month', label: 'هذا الشهر' },
  { id: 'all', label: 'كل الوقت' },
  { id: 'custom', label: 'مخصص' },
]

const EXPENSE_LABEL: Record<string, string> = {
  marketing: 'تسويق وإعلانات',
  rent: 'إيجار',
  salaries: 'رواتب وأجور',
  shipping: 'شحن وتوصيل',
  packaging: 'تغليف',
  utilities: 'مرافق',
  software: 'برامج وأدوات',
  other: 'أخرى',
}

const LEDGER_LABEL: Record<string, string> = {
  sales: 'مبيعات',
  discount: 'خصم',
  shipping: 'شحن',
  cogs: 'تكلفة بضاعة',
  expense: 'مصروف',
  purchase: 'مشتريات',
  adjustment: 'قيد يدوي',
}

const KIND_LABEL: Record<string, string> = {
  sale: 'مبيعات',
  sale_reversal: 'عكس مبيعات',
  discount: 'خصم',
  discount_reversal: 'عكس خصم',
  shipping: 'شحن',
  shipping_reversal: 'عكس شحن',
  cogs: 'تكلفة البضاعة',
  cogs_reversal: 'عكس التكلفة',
  expense: 'مصروف',
  purchase: 'مشتريات',
  income: 'إيراد يدوي',
  expense_adjustment: 'مصروف يدوي',
}

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (days: number) =>
  new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10)
const monthStart = () => `${today().slice(0, 7)}-01`

function money(value: number, tone?: 'pos' | 'neg' | 'muted') {
  return (
    <span
      className={cx(
        'font-mono tabular-nums',
        tone === 'pos' && 'text-volt',
        tone === 'neg' && 'text-flare',
        tone === 'muted' && 'text-muted',
        !tone && 'text-bone',
      )}
    >
      {formatEGP(Math.round(value))}
    </span>
  )
}

export default function Finance() {
  const [tab, setTab] = useState<Tab>('overview')
  const [preset, setPreset] = useState<Preset>('30')
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(today())
  const [report, setReport] = useState<FinanceReport | null>(null)
  const [options, setOptions] = useState<FinanceOptions | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [costs, setCosts] = useState<CostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [metric, setMetric] = useState<'revenue' | 'profit' | 'cash'>('revenue')

  const [ledgerType, setLedgerType] = useState('all')
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [ledgerPage, setLedgerPage] = useState(0)
  const [costSearch, setCostSearch] = useState('')

  const [drawer, setDrawer] = useState<'expense' | 'purchase' | 'adjustment' | 'supplier' | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'expense' | 'purchase' | 'supplier' | 'ledger'; id: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const applyPreset = useCallback((value: Preset) => {
    setPreset(value)
    if (value === 'custom') return
    if (value === 'all') {
      setFrom('2020-01-01')
      setTo(today())
      return
    }
    if (value === 'month') {
      setFrom(monthStart())
      setTo(today())
      return
    }
    const days = Number(value)
    setFrom(daysAgo(days))
    setTo(today())
  }, [])

  const loadReport = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true)
      else setLoading(true)
      setError('')
      try {
        const result = await api.admin.finance({
          from,
          to,
          type: ledgerType,
          search: ledgerSearch,
          limit: 100,
          offset: ledgerPage * 100,
        })
        setReport(result)
      } catch (err: unknown) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [from, to, ledgerType, ledgerSearch, ledgerPage],
  )

  const loadAux = useCallback(async () => {
    try {
      const [opts, exp, pur, sup, cst] = await Promise.all([
        api.admin.financeOptions(),
        api.admin.expenses(),
        api.admin.purchases(),
        api.admin.suppliers(),
        api.admin.costs(),
      ])
      setOptions(opts)
      setExpenses(exp.expenses)
      setPurchases(pur.purchases)
      setSuppliers(sup.suppliers)
      setCosts(cst.costs)
    } catch (err: unknown) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  useEffect(() => {
    loadAux()
  }, [loadAux])

  useEffect(() => {
    setLedgerPage(0)
  }, [ledgerType, ledgerSearch, from, to])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const afterMutation = useCallback(
    async (message: string) => {
      setBusy(true)
      setNotice('')
      try {
        await loadAux()
        await loadReport(true)
        setDrawer(null)
        setConfirm(null)
        setNotice(message)
      } finally {
        setBusy(false)
      }
    },
    [loadAux, loadReport],
  )

  const remove = async () => {
    if (!confirm) return
    try {
      if (confirm.kind === 'expense') await api.admin.deleteExpense(confirm.id)
      if (confirm.kind === 'purchase') await api.admin.deletePurchase(confirm.id)
      if (confirm.kind === 'supplier') await api.admin.deleteSupplier(confirm.id)
      if (confirm.kind === 'ledger') await api.admin.deleteLedgerEntry(confirm.id)
      await afterMutation('تم حذف الحركة وتحديث الدفتر')
    } catch (err: unknown) {
      setNotice(errorMessage(err))
      setConfirm(null)
    }
  }

  const filteredCosts = useMemo(() => {
    const term = costSearch.trim().toLowerCase()
    if (!term) return costs
    return costs.filter(
      (row) =>
        row.name.toLowerCase().includes(term) ||
        row.sku.toLowerCase().includes(term) ||
        row.color.toLowerCase().includes(term),
    )
  }, [costs, costSearch])

  const csvHref = api.admin.financeCsvUrl({
    from,
    to,
    type: ledgerType === 'all' ? undefined : ledgerType,
    search: ledgerSearch || undefined,
  })

  if (loading && !report) return <AdminLoading label="LOADING FINANCE" />

  const summary = report?.summary
  const netProfit = summary?.netProfit ?? 0

  return (
    <div className="space-y-4 pb-6">
      <AdminPageHeader
        eyebrow="FINANCE / CONTROL ROOM"
        title="المالية والأرباح"
        description="نظام محاسبي متكامل: كل طلب ومصروف ومشتري في دفتر واحد، مع ربح وخسارة وتدفق نقدي محسوبين تلقائيًا."
        actions={
          <>
            <button type="button" onClick={() => loadReport(true)} className="btn btn-ghost btn-sm" disabled={refreshing}>
              <Icon name="refresh" size={13} className={refreshing ? 'animate-spin' : undefined} />
              تحديث
            </button>
            <a href={csvHref} className="btn btn-ghost btn-sm" download>
              <Icon name="receipt" size={13} />
              تصدير الدفتر CSV
            </a>
            <button type="button" onClick={() => setDrawer('adjustment')} className="btn btn-ghost btn-sm">
              <Icon name="plus" size={13} />
              قيد يدوي
            </button>
            <button type="button" onClick={() => setDrawer('expense')} className="btn btn-volt btn-sm">
              <Icon name="wallet" size={14} />
              مصروف جديد
            </button>
          </>
        }
      />

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-volt/25 bg-volt/[0.06] px-4 py-2.5 text-[11px] text-volt">
          <Icon name="check" size={13} />
          {notice}
        </div>
      )}
      {error && <AdminError message={error} onRetry={() => loadReport()} />}

      {/* Range + tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-ink2 px-3 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => applyPreset(item.id)}
              className={cx(
                'rounded-lg px-3 py-1.5 text-[10px] transition',
                preset === item.id
                  ? 'bg-volt font-semibold text-ink'
                  : 'border border-line text-muted hover:border-bone/25 hover:text-bone',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            max={to}
            onChange={(event) => {
              setFrom(event.target.value)
              setPreset('custom')
            }}
            className="input !w-[132px] !py-1.5 !text-[10px]"
            aria-label="من تاريخ"
          />
          <span className="text-[10px] text-muted">إلى</span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(event) => {
              setTo(event.target.value)
              setPreset('custom')
            }}
            className="input !w-[132px] !py-1.5 !text-[10px]"
            aria-label="إلى تاريخ"
          />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-ink2 p-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cx(
              'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[10px] transition',
              tab === item.id
                ? 'bg-ink3 text-volt shadow-sm'
                : 'text-muted hover:bg-ink3/60 hover:text-bone',
            )}
          >
            <Icon name={item.icon} size={13} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && report && summary && (
        <Overview
          report={report}
          metric={metric}
          setMetric={setMetric}
          goTo={setTab}
          netProfit={netProfit}
        />
      )}

      {tab === 'ledger' && report && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-line bg-ink2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
            <div>
              <p className="eyebrow !text-[9px]">GENERAL LEDGER</p>
              <h2 className="mt-1 font-display text-lg font-bold">كل حركة مالية</h2>
              <p className="mt-1 text-[10px] text-muted">
                {formatNumber(report.ledgerCount)} قيد في الفترة المحددة — مرتب حسب التاريخ.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={ledgerType}
                onChange={(event) => setLedgerType(event.target.value)}
                className="input !w-auto !py-2 !text-[10px]"
                aria-label="نوع الحركة"
              >
                <option value="all">كل الأنواع</option>
                {(options?.ledgerCategories ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Icon name="search" size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={ledgerSearch}
                  onChange={(event) => setLedgerSearch(event.target.value)}
                  placeholder="بحث في الوصف أو المرجع"
                  className="input !w-[190px] !py-2 !pr-8 !text-[10px]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="admin-table min-w-[780px]">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الحركة</th>
                  <th>الوصف</th>
                  <th>المرجع</th>
                  <th>نقد</th>
                  <th>القيمة</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {report.ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td className="font-mono text-[10px] text-muted">{entry.date.slice(5)}</td>
                    <td>
                      <span className={cx('rounded-full px-2 py-0.5 text-[9px]', badgeTone(entry.category))}>
                        {KIND_LABEL[entry.kind] ?? LEDGER_LABEL[entry.category] ?? entry.kind}
                      </span>
                    </td>
                    <td className="max-w-[280px] truncate text-[10px]">{entry.description}</td>
                    <td className="font-mono text-[9px] text-muted">{entry.reference || '—'}</td>
                    <td className="text-[9px] text-muted">{entry.cash ? 'نقد' : 'مخزون'}</td>
                    <td className="text-left">{money(entry.amount, entry.amount >= 0 ? 'pos' : 'neg')}</td>
                    <td>
                      {entry.sourceType === 'manual' && (
                        <button
                          type="button"
                          className="text-muted transition hover:text-flare"
                          aria-label="حذف القيد"
                          onClick={() => setConfirm({ kind: 'ledger', id: entry.id })}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      )}
                      {entry.sourceType === 'order' && entry.sourceId != null && (
                        <a
                          href={`/admin/orders?search=${encodeURIComponent(entry.reference)}`}
                          className="text-muted transition hover:text-volt"
                          title="فتح الطلب"
                        >
                          <Icon name="external" size={13} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {report.ledger.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[11px] text-muted">
                      لا توجد حركات مطابقة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {report.ledgerCount > report.ledgerLimit && (
            <div className="flex items-center justify-between border-t border-line px-5 py-3">
              <span className="text-[10px] text-muted">
                {formatNumber(report.ledgerOffset + 1)}–{formatNumber(Math.min(report.ledgerOffset + report.ledgerLimit, report.ledgerCount))} من {formatNumber(report.ledgerCount)}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={ledgerPage === 0}
                  onClick={() => setLedgerPage((page) => Math.max(0, page - 1))}
                >
                  السابق
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={(ledgerPage + 1) * report.ledgerLimit >= report.ledgerCount}
                  onClick={() => setLedgerPage((page) => page + 1)}
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </motion.section>
      )}

      {tab === 'expenses' && (
        <ListPanel
          title="المصروفات"
          eyebrow="OPERATING EXPENSES"
          count={expenses.length}
          onAdd={() => setDrawer('expense')}
          addLabel="مصروف جديد"
          total={expenses.reduce((sum, item) => sum + item.amount, 0)}
        >
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[660px]">
              <thead>
                <tr><th>التاريخ</th><th>التصنيف</th><th>الوصف</th><th>الدفع</th><th>المرجع</th><th>المبلغ</th><th /></tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="font-mono text-[10px] text-muted">{expense.date}</td>
                    <td><span className="rounded-full bg-ink3 px-2 py-0.5 text-[9px] text-bone/70">{EXPENSE_LABEL[expense.category] ?? expense.category}</span></td>
                    <td className="max-w-[260px] truncate text-[10px]">{expense.description}</td>
                    <td className="text-[10px] text-muted">{expense.paymentMethod}</td>
                    <td className="font-mono text-[9px] text-muted">{expense.reference || '—'}</td>
                    <td className="text-left">{money(expense.amount, 'neg')}</td>
                    <td>
                      <button type="button" className="text-muted transition hover:text-flare" onClick={() => setConfirm({ kind: 'expense', id: expense.id })} aria-label="حذف المصروف">
                        <Icon name="trash" size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-[11px] text-muted">لا توجد مصروفات مسجلة.</td></tr>}
              </tbody>
            </table>
          </div>
        </ListPanel>
      )}

      {tab === 'purchases' && (
        <ListPanel
          title="المشتريات"
          eyebrow="INVENTORY PURCHASES"
          count={purchases.length}
          onAdd={() => setDrawer('purchase')}
          addLabel="مشتري جديد"
          total={purchases.reduce((sum, item) => sum + item.total, 0)}
        >
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[760px]">
              <thead>
                <tr><th>التاريخ</th><th>المرجع</th><th>المورد</th><th>الأصناف</th><th>القطع</th><th>الإجمالي</th><th /></tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="font-mono text-[10px] text-muted">{purchase.date}</td>
                    <td className="font-mono text-[10px] text-bone/80">{purchase.reference || '—'}</td>
                    <td className="text-[10px]">{purchase.supplierName ?? 'بدون مورد'}</td>
                    <td className="max-w-[280px] truncate text-[10px] text-muted">{purchase.items.map((item) => `${item.name} ×${item.qty}`).join('، ')}</td>
                    <td className="font-mono text-[10px]">{formatNumber(purchase.items.reduce((sum, item) => sum + item.qty, 0))}</td>
                    <td className="text-left">{money(purchase.total, 'neg')}</td>
                    <td>
                      <button type="button" className="text-muted transition hover:text-flare" onClick={() => setConfirm({ kind: 'purchase', id: purchase.id })} aria-label="حذف المشترى">
                        <Icon name="trash" size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {purchases.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-[11px] text-muted">لا توجد مشتريات مسجلة.</td></tr>}
              </tbody>
            </table>
          </div>
        </ListPanel>
      )}

      {tab === 'costs' && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-line bg-ink2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
            <div>
              <p className="eyebrow !text-[9px]">COST BASIS</p>
              <h2 className="mt-1 font-display text-lg font-bold">تكاليف المنتجات</h2>
              <p className="mt-1 text-[10px] text-muted">التكلفة تُستخدم لحساب تكلفة البضاعة المباعة وهامش الربح تلقائيًا.</p>
            </div>
            <div className="relative">
              <Icon name="search" size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={costSearch}
                onChange={(event) => setCostSearch(event.target.value)}
                placeholder="ابحث عن منتج أو SKU"
                className="input !w-[220px] !py-2 !pr-8 !text-[10px]"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[740px]">
              <thead>
                <tr><th>المنتج</th><th>المقاس / اللون</th><th>SKU</th><th>المخزون</th><th>سعر البيع</th><th>التكلفة</th><th>الهامش</th></tr>
              </thead>
              <tbody>
                {filteredCosts.map((row) => {
                  const cost = row.variantCost || row.productCost
                  const margin = row.price > 0 ? ((row.price - cost) / row.price) * 100 : 0
                  return (
                    <tr key={row.variantId}>
                      <td className="text-[10px]">{row.name}</td>
                      <td className="text-[10px] text-muted">{row.size} / {row.color}</td>
                      <td className="font-mono text-[9px] text-muted" dir="ltr">{row.sku}</td>
                      <td className="font-mono text-[10px]">{formatNumber(row.stock)}</td>
                      <td>{money(row.price)}</td>
                      <td>
                        <CostInput
                          row={row}
                          onSave={async (value) => {
                            try {
                              await api.admin.updateCost({ variantId: row.variantId, costPrice: value })
                              await afterMutation('تم تحديث التكلفة')
                            } catch (err: unknown) {
                              setNotice(errorMessage(err))
                            }
                          }}
                        />
                      </td>
                      <td className={cx('font-mono text-[10px]', margin >= 0 ? 'text-volt' : 'text-flare')}>
                        {margin.toFixed(0)}%
                      </td>
                    </tr>
                  )
                })}
                {filteredCosts.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-[11px] text-muted">لا توجد نتائج.</td></tr>}
              </tbody>
            </table>
          </div>
        </motion.section>
      )}

      {tab === 'suppliers' && (
        <ListPanel
          title="الموردون"
          eyebrow="SUPPLIERS"
          count={suppliers.length}
          onAdd={() => setDrawer('supplier')}
          addLabel="مورد جديد"
        >
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[620px]">
              <thead><tr><th>الاسم</th><th>الهاتف</th><th>البريد</th><th>ملاحظات</th><th /></tr></thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="text-[11px]">{supplier.name}</td>
                    <td className="font-mono text-[10px] text-muted" dir="ltr">{supplier.phone || '—'}</td>
                    <td className="text-[10px] text-muted" dir="ltr">{supplier.email || '—'}</td>
                    <td className="max-w-[220px] truncate text-[10px] text-muted">{supplier.notes || '—'}</td>
                    <td>
                      <button type="button" className="text-muted transition hover:text-flare" onClick={() => setConfirm({ kind: 'supplier', id: supplier.id })} aria-label="حذف المورد">
                        <Icon name="trash" size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-[11px] text-muted">لا يوجد موردون بعد.</td></tr>}
              </tbody>
            </table>
          </div>
        </ListPanel>
      )}

      <AdminDrawer
        open={drawer === 'expense'}
        title="مصروف جديد"
        subtitle="ADD EXPENSE"
        onClose={() => setDrawer(null)}
      >
        <ExpenseForm options={options} busy={busy} onSave={afterMutation} />
      </AdminDrawer>

      <AdminDrawer
        open={drawer === 'purchase'}
        title="مشتري جديد"
        subtitle="ADD PURCHASE"
        onClose={() => setDrawer(null)}
      >
        <PurchaseForm suppliers={suppliers} costs={costs} busy={busy} onSave={afterMutation} />
      </AdminDrawer>

      <AdminDrawer
        open={drawer === 'adjustment'}
        title="قيد مالي يدوي"
        subtitle="MANUAL JOURNAL ENTRY"
        onClose={() => setDrawer(null)}
      >
        <AdjustmentForm busy={busy} onSave={afterMutation} />
      </AdminDrawer>

      <AdminDrawer
        open={drawer === 'supplier'}
        title="مورد جديد"
        subtitle="ADD SUPPLIER"
        onClose={() => setDrawer(null)}
      >
        <SupplierForm busy={busy} onSave={afterMutation} />
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="تأكيد الحذف"
        message="سيُحذف السجل ويُعدَّل الدفتر والمخزون تلقائيًا. لا يمكن التراجع."
        confirmLabel="حذف"
        danger
        loading={busy}
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

function badgeTone(category: string) {
  if (category === 'sales' || category === 'shipping') return 'bg-volt/10 text-volt'
  if (category === 'cogs' || category === 'discount') return 'bg-amber-300/10 text-amber-200'
  if (category === 'expense') return 'bg-flare/10 text-flare'
  if (category === 'purchase') return 'bg-ice/10 text-ice'
  return 'bg-ink3 text-muted'
}

function Overview({
  report,
  metric,
  setMetric,
  goTo,
  netProfit,
}: {
  report: FinanceReport
  metric: 'revenue' | 'profit' | 'cash'
  setMetric: (value: 'revenue' | 'profit' | 'cash') => void
  goTo: (tab: Tab) => void
  netProfit: number
}) {
  const s = report.summary
  const cards: { label: string; value: number; icon: IconName; tone: 'pos' | 'neg' | 'plain'; note: string }[] = [
    { label: 'إجمالي الإيرادات', value: s.revenue, icon: 'trend-up', tone: 'pos', note: `${formatNumber(s.orders)} طلب · ${formatNumber(s.unitsSold)} قطعة` },
    { label: 'الربح الإجمالي', value: s.grossProfit, icon: 'scale', tone: s.grossProfit >= 0 ? 'pos' : 'neg', note: `هامش ${(s.revenue ? (s.grossProfit / s.revenue) * 100 : 0).toFixed(1)}%` },
    { label: 'صافي الربح', value: s.netProfit, icon: 'coins', tone: netProfit >= 0 ? 'pos' : 'neg', note: `بعد المصروفات · ${s.margin.toFixed(1)}%` },
    { label: 'التدفق النقدي', value: s.cashFlow, icon: 'wallet', tone: s.cashFlow >= 0 ? 'pos' : 'neg', note: `داخل ${formatEGP(s.cashIn)} / خارج ${formatEGP(s.cashOut)}` },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="rounded-2xl border border-line bg-ink2 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-ink3 text-muted">
                <Icon name={card.icon} size={15} />
              </span>
              <span className="font-mono text-[8px] uppercase tracking-widest text-muted/60">SX</span>
            </div>
            <p className="mt-3 text-[10px] text-muted">{card.label}</p>
            <p className={cx('mt-1 font-display text-xl font-bold', card.tone === 'pos' ? 'text-volt' : card.tone === 'neg' ? 'text-flare' : 'text-bone')}>
              {formatEGP(Math.round(card.value))}
            </p>
            <p className="mt-2 text-[9px] leading-4 text-muted">{card.note}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-line bg-ink2 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow !text-[9px]">MONEY MOVEMENT</p>
              <h2 className="mt-1 font-display text-lg font-bold">حركة الأموال</h2>
            </div>
            <div className="flex gap-1 rounded-lg border border-line bg-ink/50 p-1">
              {(['revenue', 'profit', 'cash'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMetric(item)}
                  className={cx('rounded-md px-2.5 py-1 text-[9px] transition', metric === item ? 'bg-volt text-ink' : 'text-muted hover:text-bone')}
                >
                  {item === 'revenue' ? 'الإيرادات' : item === 'profit' ? 'الربح' : 'النقد'}
                </button>
              ))}
            </div>
          </div>
          <MoneyChart series={report.series} metric={metric} />
        </section>

        <section className="rounded-2xl border border-line bg-ink2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow !text-[9px]">PROFIT & LOSS</p>
              <h2 className="mt-1 font-display text-lg font-bold">قائمة الربح والخسارة</h2>
            </div>
            <Icon name="scale" size={18} className="text-volt" />
          </div>
          <div className="space-y-1.5 text-[11px]">
            <PlLine label="المبيعات" value={s.sales} />
            <PlLine label="الخصومات" value={s.discounts} />
            <PlLine label="الشحن المحصّل" value={s.shippingIncome} />
            <PlLine label="= الإيرادات الصافية" value={s.revenue} bold />
            <div className="my-2 border-t border-dashed border-line" />
            <PlLine label="تكلفة البضاعة المباعة" value={s.cogs} />
            <PlLine label="= الربح الإجمالي" value={s.grossProfit} bold />
            <PlLine label="المصروفات التشغيلية" value={-s.expenses} />
            <PlLine label="قيود أخرى" value={s.adjustments} />
            <div className="my-2 border-t border-line" />
            <div className="flex items-center justify-between rounded-lg bg-volt/[0.07] px-3 py-2.5">
              <span className="text-[11px] font-semibold text-volt">صافي الربح</span>
              {money(s.netProfit, s.netProfit >= 0 ? 'pos' : 'neg')}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-line bg-ink/50 p-3">
              <p className="text-[9px] text-muted">المشتريات</p>
              <p className="mt-1">{money(s.purchases)}</p>
            </div>
            <div className="rounded-lg border border-line bg-ink/50 p-3">
              <p className="text-[9px] text-muted">قيمة المخزون</p>
              <p className="mt-1">{money(s.inventoryValue)}</p>
            </div>
          </div>
          <p className="mt-3 text-[9px] leading-5 text-muted">
            المشتريات تزيد المخزون ولا تُحتسب مصروفًا مباشرة؛ تكلفتها تظهر في الربح عند البيع عبر تكلفة البضاعة المباعة.
          </p>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <section className="rounded-2xl border border-line bg-ink2 p-5">
          <div className="mb-4">
            <p className="eyebrow !text-[9px]">EXPENSE MIX</p>
            <h2 className="mt-1 font-display text-lg font-bold">أين تذهب المصروفات؟</h2>
          </div>
          <DonutChart
            data={report.expenseCategories.map((item) => ({
              label: EXPENSE_LABEL[item.category] ?? item.category,
              value: item.amount,
            }))}
            total={s.expenses}
            label="إجمالي المصروفات"
          />
          <button type="button" onClick={() => goTo('expenses')} className="mt-4 flex items-center gap-1.5 text-[10px] text-muted transition hover:text-volt">
            إدارة المصروفات <Icon name="arrow-left" size={12} />
          </button>
        </section>

        <section className="rounded-2xl border border-line bg-ink2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow !text-[9px]">PRODUCT PROFITABILITY</p>
              <h2 className="mt-1 font-display text-lg font-bold">المنتجات الأكثر ربحًا</h2>
            </div>
            <button type="button" onClick={() => goTo('costs')} className="text-[10px] text-muted transition hover:text-volt">التكاليف</button>
          </div>
          <div className="space-y-2.5">
            {report.topProducts.map((product, index) => (
              <div key={`${product.productId}-${index}`} className="flex items-center gap-3 rounded-xl border border-line/70 px-3 py-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line font-mono text-[9px] text-muted">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px]">{product.name}</p>
                  <p className="font-mono text-[9px] text-muted">{formatNumber(product.qty)} قطعة · تكلفة {formatEGP(product.cost)}</p>
                </div>
                <div className="text-left">
                  {money(product.profit, product.profit >= 0 ? 'pos' : 'neg')}
                  <p className="font-mono text-[8px] text-muted">{formatEGP(product.revenue)} مبيعات</p>
                </div>
              </div>
            ))}
            {report.topProducts.length === 0 && <AdminEmpty icon="box" title="لا توجد مبيعات في هذه الفترة" />}
          </div>
        </section>
      </div>
    </div>
  )
}

function PlLine({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={cx('flex items-center justify-between', bold && 'font-semibold text-bone')}>
      <span className={cx(!bold && 'text-muted')}>{label}</span>
      {money(value, value < 0 ? 'neg' : undefined)}
    </div>
  )
}

function ListPanel({
  title,
  eyebrow,
  count,
  total,
  addLabel,
  onAdd,
  children,
}: {
  title: string
  eyebrow: string
  count: number
  total?: number
  addLabel: string
  onAdd: () => void
  children: React.ReactNode
}) {
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden rounded-2xl border border-line bg-ink2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
        <div>
          <p className="eyebrow !text-[9px]">{eyebrow}</p>
          <h2 className="mt-1 font-display text-lg font-bold">{title}</h2>
          <p className="mt-1 text-[10px] text-muted">{formatNumber(count)} سجل{total != null ? ` · الإجمالي ${formatEGP(total)}` : ''}</p>
        </div>
        <button type="button" onClick={onAdd} className="btn btn-volt btn-sm">
          <Icon name="plus" size={13} />
          {addLabel}
        </button>
      </div>
      {children}
    </motion.section>
  )
}

function CostInput({ row, onSave }: { row: CostRow; onSave: (value: number) => Promise<void> }) {
  const [value, setValue] = useState(String(row.variantCost || row.productCost))
  const [saving, setSaving] = useState(false)
  useEffect(() => setValue(String(row.variantCost || row.productCost)), [row.variantCost, row.productCost])
  const changed = Number(value) !== (row.variantCost || row.productCost)
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="input !w-[92px] !py-1.5 !text-[10px]"
        aria-label={`تكلفة ${row.name}`}
      />
      <button
        type="button"
        disabled={!changed || saving || Number(value) < 0}
        onClick={async () => {
          setSaving(true)
          try {
            await onSave(Number(value))
          } finally {
            setSaving(false)
          }
        }}
        className="icon-btn !h-7 !w-7 disabled:opacity-30"
        aria-label="حفظ التكلفة"
      >
        {saving ? <Icon name="refresh" size={12} className="animate-spin" /> : <Icon name="check" size={12} />}
      </button>
    </div>
  )
}

function fieldClass() {
  return 'input !text-[11px]'
}

function ExpenseForm({
  options,
  busy,
  onSave,
}: {
  options: FinanceOptions | null
  busy: boolean
  onSave: (message: string) => Promise<void>
}) {
  const [form, setForm] = useState({
    category: options?.expenseCategories[0]?.id ?? 'marketing',
    description: '',
    amount: '',
    date: today(),
    paymentMethod: 'cash',
    reference: '',
  })
  const [error, setError] = useState('')
  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setError('')
        try {
          await api.admin.createExpense({
            category: form.category,
            description: form.description,
            amount: Number(form.amount),
            date: form.date,
            paymentMethod: form.paymentMethod,
            reference: form.reference,
          })
          await onSave('تم تسجيل المصروف في الدفتر')
        } catch (err: unknown) {
          setError(errorMessage(err))
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[10px] text-muted">التصنيف</span>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={fieldClass()}>
            {(options?.expenseCategories ?? []).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] text-muted">التاريخ</span>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={fieldClass()} required />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[10px] text-muted">الوصف</span>
        <input value={form.description} onChange={(e) => set('description', e.target.value)} className={fieldClass()} placeholder="مثال: إعلانات تيك توك" required minLength={2} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[10px] text-muted">المبلغ (ج.م)</span>
          <input type="number" min="1" value={form.amount} onChange={(e) => set('amount', e.target.value)} className={fieldClass()} placeholder="0" required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] text-muted">طريقة الدفع</span>
          <select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)} className={fieldClass()}>
            {(options?.paymentMethods ?? [{ id: 'cash', label: 'نقدًا' }]).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[10px] text-muted">المرجع (اختياري)</span>
        <input value={form.reference} onChange={(e) => set('reference', e.target.value)} className={fieldClass()} placeholder="رقم فاتورة" />
      </label>
      {error && <p className="text-[10px] text-flare">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-volt w-full">
        {busy ? <Icon name="refresh" size={14} className="animate-spin" /> : <Icon name="check" size={14} />}
        حفظ المصروف
      </button>
    </form>
  )
}

type PurchaseLine = { variantId: number; qty: string; unitCost: string }

function PurchaseForm({
  suppliers,
  costs,
  busy,
  onSave,
}: {
  suppliers: Supplier[]
  costs: CostRow[]
  busy: boolean
  onSave: (message: string) => Promise<void>
}) {
  const variants = useMemo(() => {
    const seen = new Set<number>()
    return costs.filter((row) => {
      if (seen.has(row.variantId)) return false
      seen.add(row.variantId)
      return true
    })
  }, [costs])
  const [supplierId, setSupplierId] = useState('')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(today())
  const [shipping, setShipping] = useState('0')
  const [discount, setDiscount] = useState('0')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<PurchaseLine[]>([
    { variantId: variants[0]?.variantId ?? 0, qty: '10', unitCost: String(variants[0]?.variantCost ?? 0) },
  ])
  const [error, setError] = useState('')

  const total = lines.reduce(
    (sum, line) => sum + Number(line.qty || 0) * Number(line.unitCost || 0),
    Number(shipping || 0) - Number(discount || 0),
  )

  const updateLine = (index: number, key: keyof PurchaseLine, value: string) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [key]: value } : line)))

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setError('')
        try {
          await api.admin.createPurchase({
            supplierId: supplierId ? Number(supplierId) : null,
            reference,
            date,
            shipping: Number(shipping || 0),
            discount: Number(discount || 0),
            notes,
            items: lines.map((line) => ({
              variantId: Number(line.variantId),
              qty: Number(line.qty),
              unitCost: Number(line.unitCost),
            })),
          })
          await onSave('تم تسجيل المشتريات وزيادة المخزون وتحديث الدفتر')
        } catch (err: unknown) {
          setError(errorMessage(err))
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[10px] text-muted">المورد</span>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={fieldClass()}>
            <option value="">بدون مورد</option>
            {suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] text-muted">التاريخ</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass()} required />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[10px] text-muted">رقم الفاتورة / المرجع</span>
        <input value={reference} onChange={(e) => setReference(e.target.value)} className={fieldClass()} placeholder="PO-2026-001" />
      </label>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted">الأصناف</span>
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, { variantId: variants[0]?.variantId ?? 0, qty: '5', unitCost: String(variants[0]?.variantCost ?? 0) }])}
            className="text-[10px] text-volt"
          >
            + إضافة صنف
          </button>
        </div>
        {lines.map((line, index) => (
          <div key={index} className="grid grid-cols-[1fr_60px_80px_28px] gap-1.5">
            <select
              value={line.variantId}
              onChange={(e) => {
                const variant = variants.find((item) => item.variantId === Number(e.target.value))
                setLines((prev) => prev.map((item, i) => i === index ? {
                  ...item,
                  variantId: Number(e.target.value),
                  unitCost: String(variant?.variantCost || variant?.productCost || 0),
                } : item))
              }}
              className={fieldClass()}
              aria-label="الصنف"
            >
              {variants.map((variant) => (
                <option key={variant.variantId} value={variant.variantId}>
                  {variant.name} — {variant.size}/{variant.color}
                </option>
              ))}
            </select>
            <input type="number" min="1" value={line.qty} onChange={(e) => updateLine(index, 'qty', e.target.value)} className={fieldClass()} aria-label="الكمية" />
            <input type="number" min="1" value={line.unitCost} onChange={(e) => updateLine(index, 'unitCost', e.target.value)} className={fieldClass()} aria-label="سعر الوحدة" />
            <button
              type="button"
              disabled={lines.length === 1}
              onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
              className="icon-btn !h-9 !w-7 disabled:opacity-30"
              aria-label="حذف الصنف"
            >
              <Icon name="trash" size={12} />
            </button>
          </div>
        ))}
        <p className="font-mono text-[8px] text-muted">العمودان: الصنف / الكمية / سعر الوحدة</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[10px] text-muted">الشحن</span>
          <input type="number" min="0" value={shipping} onChange={(e) => setShipping(e.target.value)} className={fieldClass()} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] text-muted">الخصم</span>
          <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className={fieldClass()} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[10px] text-muted">ملاحظات</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldClass()} />
      </label>

      <div className="flex items-center justify-between rounded-xl border border-volt/20 bg-volt/[0.06] px-4 py-3">
        <span className="text-[11px] text-muted">إجمالي المشترى</span>
        <span className="font-display text-lg font-bold text-volt">{formatEGP(total)}</span>
      </div>
      {error && <p className="text-[10px] text-flare">{error}</p>}
      <button type="submit" disabled={busy || lines.some((l) => !l.variantId || Number(l.qty) <= 0)} className="btn btn-volt w-full">
        {busy ? <Icon name="refresh" size={14} className="animate-spin" /> : <Icon name="check" size={14} />}
        حفظ المشتريات
      </button>
    </form>
  )
}

function AdjustmentForm({ busy, onSave }: { busy: boolean; onSave: (message: string) => Promise<void> }) {
  const [form, setForm] = useState({ date: today(), description: '', amount: '', reference: '' })
  const [error, setError] = useState('')
  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }))
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setError('')
        try {
          await api.admin.createAdjustment({
            date: form.date,
            description: form.description,
            amount: Number(form.amount),
            reference: form.reference,
          })
          await onSave('تم إضافة القيد اليدوي إلى الدفتر')
        } catch (err: unknown) {
          setError(errorMessage(err))
        }
      }}
    >
      <p className="rounded-lg border border-line bg-ink/50 p-3 text-[10px] leading-5 text-muted">
        استخدم القيد اليدوي لأي حركة خارج الطلبات والمصروفات والمشتريات. القيمة الموجبة إيراد، والسالبة خسارة أو دفع إضافي.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1.5 block text-[10px] text-muted">التاريخ</span><input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={fieldClass()} required /></label>
        <label className="block"><span className="mb-1.5 block text-[10px] text-muted">القيمة (موجب أو سالب)</span><input type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} className={fieldClass()} required /></label>
      </div>
      <label className="block"><span className="mb-1.5 block text-[10px] text-muted">الوصف</span><input value={form.description} onChange={(e) => set('description', e.target.value)} className={fieldClass()} required minLength={2} /></label>
      <label className="block"><span className="mb-1.5 block text-[10px] text-muted">المرجع (اختياري)</span><input value={form.reference} onChange={(e) => set('reference', e.target.value)} className={fieldClass()} /></label>
      {error && <p className="text-[10px] text-flare">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-volt w-full"><Icon name="plus" size={14} /> إضافة القيد</button>
    </form>
  )
}

function SupplierForm({ busy, onSave }: { busy: boolean; onSave: (message: string) => Promise<void> }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [error, setError] = useState('')
  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }))
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setError('')
        try {
          await api.admin.createSupplier(form)
          await onSave('تم إضافة المورد')
        } catch (err: unknown) {
          setError(errorMessage(err))
        }
      }}
    >
      <label className="block"><span className="mb-1.5 block text-[10px] text-muted">اسم المورد</span><input value={form.name} onChange={(e) => set('name', e.target.value)} className={fieldClass()} required minLength={2} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1.5 block text-[10px] text-muted">الهاتف</span><input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={fieldClass()} /></label>
        <label className="block"><span className="mb-1.5 block text-[10px] text-muted">البريد</span><input value={form.email} onChange={(e) => set('email', e.target.value)} className={fieldClass()} /></label>
      </div>
      <label className="block"><span className="mb-1.5 block text-[10px] text-muted">ملاحظات</span><input value={form.notes} onChange={(e) => set('notes', e.target.value)} className={fieldClass()} /></label>
      {error && <p className="text-[10px] text-flare">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-volt w-full"><Icon name="plus" size={14} /> إضافة المورد</button>
    </form>
  )
}
