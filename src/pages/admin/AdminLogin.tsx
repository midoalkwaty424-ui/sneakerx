import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { usePageMeta } from '../../hooks/usePageMeta'
import { Logo } from '../../components/ui/Logo'
import { Icon } from '../../components/ui/Icon'
import { RealShoePhoto } from '../../components/art/RealShoePhoto'

export default function AdminLogin() {
  usePageMeta('دخول لوحة التحكم — SNEAKERX', undefined, { noindex: true })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!api.admin.hasAdminSession()) return
    api.admin
      .me()
      .then(() => navigate('/admin', { replace: true }))
      .catch(() => api.admin.clearAdminSession())
  }, [navigate])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('أدخل البريد الإلكتروني وكلمة المرور')
      return
    }
    setLoading(true)
    try {
      await api.admin.login(email.trim(), password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setLoading(false)
    }
  }

  return (
    <div className="relative grid min-h-screen bg-ink lg:grid-cols-2">
      <div className="relative hidden overflow-hidden border-e border-line lg:block">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(217,255,67,.12), transparent 50%), radial-gradient(circle at 75% 70%, rgba(169,199,255,.07), transparent 55%), linear-gradient(160deg,#0c0f14,#07080a)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(241,238,229,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(241,238,229,.8) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 75%)',
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Logo size="lg" />

          <div className="relative">
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="h-[340px] w-[340px] rounded-full border border-bone/[0.06]" />
              <div className="absolute h-[260px] w-[260px] rounded-full bg-volt/[0.06] blur-3xl" />
            </div>
            <RealShoePhoto
              src="/images/products/x01-aero-1.jpg"
              alt="SNEAKERX X-01 AERO"
              blend="screen"
              className="relative z-10 -rotate-6 drop-shadow-[0_40px_60px_rgba(0,0,0,.6)]"
            />
          </div>

          <div>
            <p className="eyebrow eyebrow-volt mb-3">CONTROL ROOM / 001</p>
            <h1 className="display text-[clamp(2.4rem,4vw,4rem)]">
              RUN THE <span className="display-italic lowercase text-volt">drop.</span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-7 text-muted">
              مساحة الإدارة الكاملة لـ SNEAKERX: منتجات، مخزون، طلبات، وعملاء — في مكان واحد.
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center px-5 py-12">
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 lg:hidden">
          <Logo size="sm" />
          <Link to="/" className="text-[10px] text-muted transition hover:text-bone">
            العودة للمتجر
          </Link>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <span className="eyebrow eyebrow-volt mb-3 block">ADMIN ACCESS</span>
            <h2 className="font-display text-3xl font-bold tracking-tight">تسجيل الدخول</h2>
            <p className="mt-2 text-xs leading-6 text-muted">
              الدخول مخصص لفريق SneakerX فقط. الجلسة آمنة وتنتهي تلقائيًا بعد 8 ساعات.
            </p>
          </div>

          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="label">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Icon
                  name="mail"
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@sneakerx.store"
                  className="field pe-10"
                  dir="ltr"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="label">
                كلمة المرور
              </label>
              <div className="relative">
                <Icon
                  name="shield"
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••"
                  className="field px-10"
                  dir="ltr"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-bone"
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  <Icon name="eye" size={15} />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-flare/30 bg-flare/[0.07] px-3 py-2.5 text-[11px] leading-5 text-flare">
                <Icon name="cancel" size={13} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-volt w-full">
              {loading ? (
                <>
                  <span className="spinner" />
                  جارٍ التحقق...
                </>
              ) : (
                <>
                  دخول لوحة التحكم
                  <Icon name="arrow-left" size={15} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-line bg-ink3/40 p-4">
            <p className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-volt">
              <span className="h-1.5 w-1.5 rounded-full bg-volt" />
              SECURE ACCESS
            </p>
            <p className="text-[10px] leading-6 text-muted">
              بيانات الدخول محدّدة في إعدادات السيرفر (ADMIN_EMAIL و ADMIN_PASSWORD). استخدم بيانات
              حسابك للدخول.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between text-[10px] text-muted">
            <Link to="/" className="transition hover:text-bone">
              ← العودة للمتجر
            </Link>
            <span className="font-mono">SECURE / HTTPONLY</span>
          </div>
        </div>
      </div>
    </div>
  )
}
