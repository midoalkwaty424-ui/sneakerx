import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import type {
  AdminAnalytics,
  AdminLoyalty,
  AdminLoyaltyAccount,
  Coupon,
} from '../../lib/types'
import { cx, formatDate, formatEGP, formatNumber } from '../../lib/format'
import { useToast } from '../../store/toast'
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from '../../components/admin/ui'
import { Icon } from '../../components/ui/Icon'

type Tab = 'coupons' | 'loyalty' | 'analytics'

const TABS: { id: Tab; label: string; icon: 'tag' | 'users' | 'sparkle' }[] = [
  { id: 'coupons', label: 'الكوبونات', icon: 'tag' },
  { id: 'loyalty', label: 'برنامج الولاء', icon: 'users' },
  { id: 'analytics', label: 'التحليلات', icon: 'sparkle' },
]

const EVENT_LABEL: Record<string, string> = {
  page_view: 'مشاهدة صفحة',
  view_item: 'مشاهدة منتج',
  view_item_list: 'استعراض قائمة',
  add_to_cart: 'إضافة للسلة',
  add_to_wishlist: 'إضافة للمفضلة',
  begin_checkout: 'بدء الدفع',
  purchase: 'إتمام طلب',
  search: 'بحث',
  coupon_applied: 'تطبيق كوبون',
  loyalty_lookup: 'استعلام نقاط',
  assistant_query: 'سؤال للمساعد',
  tryon_open: 'تجربة على الكاميرا',
}

const emptyCoupon = {
  code: '',
  kind: 'percent' as 'percent' | 'fixed',
  value: '',
  minSubtotal: '',
  maxDiscount: '',
  maxUses: '',
  expiresAt: '',
}

export default function AdminGrowth() {
  const [tab, setTab] = useState<Tab>('coupons')
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loyalty, setLoyalty] = useState<AdminLoyalty | null>(null)
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const { toast } = useToast()

  const load = useCallback(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([api.admin.coupons(), api.admin.loyalty(), api.admin.analytics(14)])
      .then(([couponResult, loyaltyResult, analyticsResult]) => {
        if (!active) return
        setCoupons(couponResult.coupons)
        setLoyalty(loyaltyResult)
        setAnalytics(analyticsResult)
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
  }, [refreshKey])

  useEffect(() => load(), [load])

  return (
    <div>
      <AdminPageHeader
        eyebrow="GROWTH / RETENTION"
        title="النمو والولاء"
        description="كوبونات الخصم، حسابات النقاط والإحالات، وأحداث المتجر الأولى — كلها من نفس لوحة التحكم."
        actions={
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
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cx('chip !py-2 text-[11px]', tab === item.id && 'chip-active')}
            aria-pressed={tab === item.id}
          >
            <Icon name={item.icon} size={13} />
            {item.label}
          </button>
        ))}
      </div>

      {loading && !analytics && !loyalty ? (
        <AdminLoading label="LOADING GROWTH DATA" />
      ) : error && !analytics ? (
        <AdminError message={error} onRetry={load} />
      ) : (
        <>
          {tab === 'coupons' && (
            <CouponsPanel
              coupons={coupons}
              onChange={() => setRefreshKey((value) => value + 1)}
            />
          )}
          {tab === 'loyalty' && (
            <LoyaltyPanel data={loyalty} onChange={() => setRefreshKey((value) => value + 1)} />
          )}
          {tab === 'analytics' && <AnalyticsPanel data={analytics} />}
        </>
      )}
    </div>
  )
}

/* ------------------------------- coupons -------------------------------- */

function CouponsPanel({ coupons, onChange }: { coupons: Coupon[]; onChange: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ ...emptyCoupon })
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = Number(form.value)
    if (!form.code.trim() || !Number.isFinite(value) || value <= 0) {
      toast('أدخل كودًا وقيمة صحيحة', 'error')
      return
    }
    setBusy(true)
    try {
      await api.admin.createCoupon({
        code: form.code.trim(),
        kind: form.kind,
        value,
        minSubtotal: form.minSubtotal ? Number(form.minSubtotal) : 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        maxUses: form.maxUses ? Number(form.maxUses) : 0,
        active: true,
        expiresAt: form.expiresAt || null,
      })
      toast('تم إنشاء الكوبون')
      setForm({ ...emptyCoupon })
      setOpen(false)
      onChange()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (coupon: Coupon) => {
    try {
      await api.admin.updateCoupon(coupon.id, { active: !coupon.active })
      toast(coupon.active ? 'تم إيقاف الكوبون' : 'تم تفعيل الكوبون')
      onChange()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const remove = async (coupon: Coupon) => {
    if (!window.confirm(`حذف الكوبون ${coupon.code}؟`)) return
    try {
      await api.admin.deleteCoupon(coupon.id)
      toast('تم حذف الكوبون')
      onChange()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'إجمالي الكوبونات', value: coupons.length },
          { label: 'مفعّلة', value: coupons.filter((item) => item.active).length },
          { label: 'مرات الاستخدام', value: coupons.reduce((sum, item) => sum + item.usedCount, 0) },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-line bg-ink2 px-4 py-3">
            <p className="text-[10px] text-muted">{item.label}</p>
            <p className="mt-1 font-mono text-xl">{formatNumber(item.value)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-ink2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between px-4 py-3 text-start"
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 text-xs font-bold">
            <Icon name="plus" size={14} className="text-volt" />
            إنشاء كوبون جديد
          </span>
          <Icon
            name="chevron-down"
            size={14}
            className={cx('text-muted transition-transform', open && 'rotate-180')}
          />
        </button>
        {open && (
          <form onSubmit={submit} className="grid gap-3 border-t border-line p-4 sm:grid-cols-2">
            <label>
              <span className="label">الكود</span>
              <input
                className="field uppercase"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                placeholder="SUMMER20"
                maxLength={40}
                required
              />
            </label>
            <label>
              <span className="label">النوع</span>
              <select
                className="field"
                value={form.kind}
                onChange={(event) =>
                  setForm({ ...form, kind: event.target.value as 'percent' | 'fixed' })
                }
              >
                <option value="percent">نسبة مئوية %</option>
                <option value="fixed">مبلغ ثابت ج.م</option>
              </select>
            </label>
            <label>
              <span className="label">القيمة</span>
              <input
                className="field"
                type="number"
                min="0.01"
                step="0.01"
                value={form.value}
                onChange={(event) => setForm({ ...form, value: event.target.value })}
                required
              />
            </label>
            <label>
              <span className="label">أقل قيمة سلة (اختياري)</span>
              <input
                className="field"
                type="number"
                min="0"
                value={form.minSubtotal}
                onChange={(event) => setForm({ ...form, minSubtotal: event.target.value })}
              />
            </label>
            <label>
              <span className="label">أقصى خصم ج.م (اختياري)</span>
              <input
                className="field"
                type="number"
                min="0"
                value={form.maxDiscount}
                onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })}
              />
            </label>
            <label>
              <span className="label">أقصى عدد استخدامات (0 = غير محدود)</span>
              <input
                className="field"
                type="number"
                min="0"
                value={form.maxUses}
                onChange={(event) => setForm({ ...form, maxUses: event.target.value })}
              />
            </label>
            <label>
              <span className="label">تاريخ الانتهاء (اختياري)</span>
              <input
                className="field"
                type="date"
                value={form.expiresAt}
                onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
              />
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn btn-volt btn-sm" disabled={busy}>
                {busy ? <span className="spinner" /> : <Icon name="check" size={13} />}
                إنشاء
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>

      {coupons.length === 0 ? (
        <AdminEmpty
          icon="tag"
          title="لا توجد كوبونات"
          message="أنشئ أول كوبون لتحفيز أول طلب أو حملة موسمية."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-ink2">
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[880px]">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الخصم</th>
                  <th>الحد الأدنى</th>
                  <th>الاستخدام</th>
                  <th>الانتهاء</th>
                  <th>الحالة</th>
                  <th className="text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <span className="font-mono text-xs font-bold text-volt">{coupon.code}</span>
                      <span className="mt-0.5 block text-[9px] text-muted">
                        {coupon.description}
                      </span>
                    </td>
                    <td className="font-mono text-xs">
                      {coupon.kind === 'percent'
                        ? `${coupon.value}%`
                        : formatEGP(coupon.value)}
                      {coupon.maxDiscount ? (
                        <span className="block text-[9px] text-muted">
                          حتى {formatEGP(coupon.maxDiscount)}
                        </span>
                      ) : null}
                    </td>
                    <td className="font-mono text-[10px] text-muted">
                      {coupon.minSubtotal > 0 ? formatEGP(coupon.minSubtotal) : '—'}
                    </td>
                    <td className="font-mono text-[10px]">
                      {formatNumber(coupon.usedCount)}
                      {coupon.maxUses > 0 ? ` / ${formatNumber(coupon.maxUses)}` : ''}
                    </td>
                    <td className="text-[10px] text-muted">
                      {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'بدون'}
                    </td>
                    <td>
                      <span
                        className={cx(
                          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px]',
                          coupon.active ? 'bg-volt/10 text-volt' : 'bg-line text-muted',
                        )}
                      >
                        <span className="h-1 w-1 rounded-full bg-current" />
                        {coupon.active ? 'مفعّل' : 'موقوف'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggle(coupon)}
                          className="btn btn-ghost btn-sm !px-2.5 !py-1.5 text-[10px]"
                        >
                          {coupon.active ? 'إيقاف' : 'تفعيل'}
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(coupon)}
                          className="icon-btn !h-7 !w-7 text-muted hover:text-flare"
                          aria-label={`حذف ${coupon.code}`}
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
    </div>
  )
}

/* ------------------------------- loyalty -------------------------------- */

function LoyaltyPanel({ data, onChange }: { data: AdminLoyalty | null; onChange: () => void }) {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState<AdminLoyaltyAccount | null>(null)
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const accounts = useMemo(() => {
    if (!data) return []
    const term = search.trim().toLowerCase()
    if (!term) return data.accounts
    return data.accounts.filter((account) =>
      [account.phone, account.referralCode, account.referredBy ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [data, search])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!target) return
    const points = Number(delta)
    if (!Number.isInteger(points) || points === 0) {
      toast('أدخل عدد نقاط صحيح غير صفر', 'error')
      return
    }
    setBusy(true)
    try {
      await api.admin.adjustPoints(target.phone, points, note.trim() || undefined)
      toast(`تم تعديل نقاط ${target.phone}`)
      setTarget(null)
      setDelta('')
      setNote('')
      onChange()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!data) {
    return <AdminEmpty icon="users" title="لا توجد بيانات ولاء" message="ستظهر الحسابات بعد أول عملية شراء." />
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'حسابات الولاء', value: formatNumber(data.summary.accounts) },
          { label: 'النقاط المتاحة', value: formatNumber(data.summary.points) },
          { label: 'إجمالي النقاط المكتسبة', value: formatNumber(data.summary.lifetimePoints) },
          { label: 'حسابات مُحالة', value: formatNumber(data.summary.referred) },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-line bg-ink2 px-4 py-3">
            <p className="text-[10px] text-muted">{item.label}</p>
            <p className="mt-1 font-mono text-xl">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-muted">
          النقطة = 1 ج.م — الاستبدال بحد أدنى 100 نقطة وبحد أقصى 30% من السلة.
        </p>
        <div className="relative">
          <Icon
            name="search"
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="رقم / كود إحالة"
            className="field h-9 w-52 !py-1.5 pe-9 ps-3 text-xs"
            aria-label="بحث في حسابات الولاء"
          />
        </div>
      </div>

      {accounts.length === 0 ? (
        <AdminEmpty icon="users" title="لا توجد حسابات مطابقة" message="جرّب رقمًا آخر أو امسح البحث." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-ink2">
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[900px]">
              <thead>
                <tr>
                  <th>الهاتف</th>
                  <th>النقاط</th>
                  <th>إجمالي مكتسب</th>
                  <th>الطلبات</th>
                  <th>إجمالي الشراء</th>
                  <th>الإحالة</th>
                  <th className="text-end">تعديل</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="font-mono text-[11px]" dir="ltr">
                      {account.phone}
                    </td>
                    <td className="font-mono text-xs text-volt">{formatNumber(account.points)}</td>
                    <td className="font-mono text-[10px] text-muted">
                      {formatNumber(account.lifetimePoints)}
                    </td>
                    <td className="font-mono text-[10px]">{formatNumber(account.ordersCount)}</td>
                    <td className="font-mono text-[10px]">{formatEGP(account.totalSpent)}</td>
                    <td className="text-[10px]">
                      <span className="font-mono text-bone/80">{account.referralCode}</span>
                      {account.referredBy && (
                        <span className="mt-0.5 block text-muted">من {account.referredBy}</span>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setTarget(account)
                            setDelta('')
                            setNote('')
                          }}
                          className="btn btn-ghost btn-sm !px-2.5 !py-1.5 text-[10px]"
                        >
                          <Icon name="edit" size={12} />
                          نقاط
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

      {target && (
        <div className="fixed inset-0 z-[150] grid place-items-center bg-ink/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={submit}
            className="w-full max-w-sm rounded-2xl border border-line bg-ink2 p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">تعديل نقاط {target.phone}</h3>
              <button
                type="button"
                className="icon-btn !h-8 !w-8"
                onClick={() => setTarget(null)}
                aria-label="إغلاق"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
            <p className="mb-3 text-[10px] text-muted">
              الرصيد الحالي {formatNumber(target.points)} نقطة. استخدم رقمًا سالبًا للخصم.
            </p>
            <label>
              <span className="label">عدد النقاط (+ / −)</span>
              <input
                className="field"
                type="number"
                step="1"
                value={delta}
                onChange={(event) => setDelta(event.target.value)}
                placeholder="مثال: 100 أو -50"
                required
              />
            </label>
            <label className="mt-3 block">
              <span className="label">ملاحظة (اختياري)</span>
              <input
                className="field"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="مكافأة خدمة عملاء"
                maxLength={160}
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button type="submit" className="btn btn-volt btn-sm flex-1" disabled={busy}>
                {busy ? <span className="spinner" /> : <Icon name="check" size={13} />}
                تطبيق
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTarget(null)}>
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

/* ------------------------------ analytics ------------------------------- */

function AnalyticsPanel({ data }: { data: AdminAnalytics | null }) {
  if (!data) {
    return <AdminEmpty icon="sparkle" title="لا توجد أحداث بعد" message="ستبدأ الأحداث في الظهور مع زيارات المتجر." />
  }

  const maxDay = Math.max(
    1,
    ...data.series.map((day) => Object.values(day.counts).reduce((sum, count) => sum + count, 0)),
  )
  const funnelMax = Math.max(1, ...data.funnel.map((step) => step.value))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.funnel.map((step) => (
          <div key={step.step} className="rounded-xl border border-line bg-ink2 px-4 py-3">
            <p className="text-[10px] text-muted">{step.label}</p>
            <p className="mt-1 font-mono text-xl">{formatNumber(step.value)}</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink">
              <div
                className="h-full rounded-full bg-volt"
                style={{ width: `${(step.value / funnelMax) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-ink2 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold">أحداث آخر {data.days} يوم</h3>
          <span className="text-[9px] text-muted">إجمالي كل الأحداث</span>
        </div>
        <div className="flex h-28 items-end gap-1">
          {data.series.map((day) => {
            const total = Object.values(day.counts).reduce((sum, count) => sum + count, 0)
            return (
              <div key={day.day} className="group relative flex-1">
                <div
                  className="w-full rounded-t bg-volt/70 transition group-hover:bg-volt"
                  style={{ height: `${Math.max((total / maxDay) * 100, 2)}%` }}
                  title={`${day.day}: ${total}`}
                />
                <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[9px] text-bone group-hover:block">
                  {total}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-muted">
          <span>{data.series[0]?.day.slice(5)}</span>
          <span>{data.series[data.series.length - 1]?.day.slice(5)}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-ink2">
        <div className="border-b border-line px-4 py-3 text-xs font-bold">ملخص الأحداث</div>
        {data.totals.length === 0 ? (
          <p className="px-4 py-6 text-xs text-muted">لا توجد أحداث مسجلة بعد.</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {data.totals.map((item) => (
              <li key={item.name} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[11px]">{EVENT_LABEL[item.name] ?? item.name}</span>
                <span className="font-mono text-[11px] text-volt">{formatNumber(item.count)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-line bg-ink2/60 p-4 text-[10px] leading-5 text-muted">
        التحليلات من طرف أول (بدون كوكيز) وتُسجَّل دائمًا. Google Analytics وMeta Pixel لا يعملان
        إلا بعد موافقة الزائر من بانر الخصوصية. أضف <code className="text-bone">VITE_GA4_ID</code> و
        <code className="text-bone">VITE_META_PIXEL_ID</code> في ملف <code className="text-bone">.env</code>.
      </div>
    </div>
  )
}
