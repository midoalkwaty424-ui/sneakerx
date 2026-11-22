import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import { track } from '../lib/analytics'
import type { LoyaltyLookup } from '../lib/types'
import { cx, formatDateTime, formatEGP, formatNumber, isValidPhone, normalizePhone } from '../lib/format'
import { usePageMeta } from '../hooks/usePageMeta'
import { useRewards } from '../store/rewards'
import { useToast } from '../store/toast'
import { Icon } from '../components/ui/Icon'

const KIND_LABEL: Record<string, string> = {
  earn: 'نقاط مكتسبة',
  redeem: 'نقاط مستخدمة',
  referral: 'مكافأة إحالة',
  adjust: 'تعديل',
}

export default function Loyalty() {
  usePageMeta(
    'SNEAKERX REWARDS — نقاط وإحالات',
    'اجمع نقاط من كل طلب، استبدلها بخصم فوري، وادعُ أصحابك لمكافآت متبادلة.',
  )
  const { phone: savedPhone, rememberPhone } = useRewards()
  const { toast } = useToast()
  const [phone, setPhone] = useState(savedPhone)
  const [data, setData] = useState<LoyaltyLookup | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const lookup = useCallback(
    async (value: string) => {
      const clean = normalizePhone(value)
      if (!isValidPhone(clean)) {
        setError('أدخل رقم هاتف مصري صحيح (11 رقمًا يبدأ بـ 01)')
        return
      }
      setLoading(true)
      setError('')
      try {
        const response = await api.loyaltyLookup(clean)
        setData(response)
        rememberPhone(clean)
        track('loyalty_lookup', { points: response.account.points })
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [rememberPhone],
  )

  useEffect(() => {
    if (savedPhone && isValidPhone(savedPhone)) void lookup(savedPhone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const referralLink = data
    ? `${window.location.origin}/?ref=${encodeURIComponent(data.account.referralCode)}`
    : ''

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast(`${label} اتنسخ`)
    } catch {
      toast('مش قادر أنسخ — انسخ يدويًا', 'error')
    }
  }

  const points = data?.account.points ?? 0
  const minRedeem = data?.program.minRedeem ?? 100
  const progress = Math.min((points / Math.max(minRedeem, 1)) * 100, 100)
  const remaining = Math.max(minRedeem - points, 0)

  return (
    <div className="pt-[6.5rem]">
      <section className="relative overflow-hidden border-b border-line/60 pb-12 pt-8 md:pb-16">
        <div className="pointer-events-none absolute -right-24 top-0 h-[26rem] w-[26rem] rounded-full bg-volt/10 blur-[120px]" />
        <div className="container-x relative">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-volt" />
            <span className="eyebrow">SNEAKERX REWARDS</span>
          </div>
          <h1 className="display max-w-3xl text-[clamp(2.2rem,6vw,4.6rem)]">
            كل خطوة <span className="display-italic lowercase text-volt">بتتحسب</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
            اجمع نقطة عن كل 20 ج.م من طلباتك، واستبدل النقاط بخصم فوري على أي أوردر. النقطة = 1 ج.م،
            والحد الأدنى للاستبدال 100 نقطة وبحد أقصى 30% من قيمة الطلب.
          </p>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container-x grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="panel p-5 md:p-7">
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault()
                void lookup(phone)
              }}
            >
              <label className="flex-1">
                <span className="label">رقم الموبايل</span>
                <input
                  className="field"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="01XXXXXXXXX"
                  inputMode="tel"
                  dir="ltr"
                  aria-invalid={Boolean(error)}
                  data-loyalty-phone
                />
              </label>
              <button type="submit" className="btn btn-volt" disabled={loading}>
                {loading ? <span className="spinner-light" /> : <Icon name="search" className="h-4 w-4" />}
                اعرض رصيدي
              </button>
            </form>
            {error && <p className="mt-2 text-xs text-flare">{error}</p>}
            <p className="mt-3 text-[10px] leading-5 text-muted">
              بنستخدم رقم الموبايل كمعرّف للحساب — نفس الرقم اللي بتطلب بيه. مفيش كلمة مرور.
            </p>

            {data && (
              <div className="mt-6 space-y-5" data-loyalty-account>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-volt/30 bg-volt/10 p-4">
                    <p className="text-[10px] text-muted">رصيد النقاط</p>
                    <p className="mt-1 font-display text-3xl font-bold text-volt">
                      {formatNumber(points)}
                    </p>
                    <p className="mt-1 text-[10px] text-muted">= {formatEGP(points)} خصم</p>
                  </div>
                  <div className="rounded-xl border border-line bg-ink3/60 p-4">
                    <p className="text-[10px] text-muted">إجمالي النقاط المكتسبة</p>
                    <p className="mt-1 font-display text-2xl font-bold">
                      {formatNumber(data.account.lifetimePoints)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-ink3/60 p-4">
                    <p className="text-[10px] text-muted">طلباتك / إجمالي الشراء</p>
                    <p className="mt-1 font-display text-2xl font-bold">
                      {formatNumber(data.account.ordersCount)}
                    </p>
                    <p className="mt-1 text-[10px] text-muted">{formatEGP(data.account.totalSpent)}</p>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted">
                    <span>{remaining > 0 ? `فاضل ${remaining} نقطة للاستبدال` : 'جاهز للاستبدال'}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-volt transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-ink3/40 p-4">
                  <p className="mb-2 flex items-center gap-2 text-xs font-bold">
                    <Icon name="users" className="h-4 w-4 text-ice" />
                    كود الإحالة بتاعك
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-lg border border-line bg-ink px-3 py-2 font-mono text-sm tracking-widest text-volt">
                      {data.account.referralCode}
                    </code>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => void copy(data.account.referralCode, 'كود الإحالة')}
                    >
                      نسخ الكود
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => void copy(referralLink, 'لينك الإحالة')}
                    >
                      نسخ اللينك
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-muted">
                    صاحبك ياخد 75 نقطة عند أول طلب، وإنت تاخد 150 نقطة بعد إتمام طلبه.
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold">سجل النقاط</p>
                  {data.history.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line p-4 text-xs text-muted">
                      لسه مفيش حركات. أول طلب هيكسبك نقاط تلقائيًا.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line">
                      {data.history.map((item) => (
                        <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                          <span
                            className={cx(
                              'grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[10px] font-bold',
                              item.points >= 0
                                ? 'border-volt/40 bg-volt/10 text-volt'
                                : 'border-flare/40 bg-flare/10 text-flare',
                            )}
                          >
                            {item.points >= 0 ? '+' : ''}
                            {item.points}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-medium">
                              {item.note || KIND_LABEL[item.kind] || item.kind}
                            </p>
                            <p className="text-[10px] text-muted">{formatDateTime(item.createdAt)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="panel p-5">
              <p className="eyebrow mb-3 !text-[9px]">HOW IT WORKS</p>
              <ul className="space-y-3 text-xs leading-6 text-bone/85">
                {[
                  'اطلب بأي رقم موبايل — الحساب بيتعمل تلقائيًا.',
                  'تكتسب نقطة عن كل 20 ج.م من قيمة الطلب.',
                  'استبدل من 100 نقطة وحتى 30% من قيمة السلة.',
                  'شارك كود الإحالة واكسب مع كل صديق جديد.',
                ].map((line, index) => (
                  <li key={line} className="flex gap-2.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-volt text-[10px] font-bold text-ink">
                      {index + 1}
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-ice/25 bg-ice/10 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-ice">
                <Icon name="whatsapp" className="h-4 w-4" />
                عندك سؤال عن النقاط؟
              </p>
              <p className="mt-2 text-xs leading-6 text-bone/80">
                كلّمنا على واتساب وهنساعدك في رصيدك أو استبدال النقاط.
              </p>
              <Link to="/policies#loyalty" className="link-line mt-3 inline-block text-[11px] text-bone">
                شروط برنامج الولاء
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
