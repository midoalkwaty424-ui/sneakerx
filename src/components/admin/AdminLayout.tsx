import { AnimatePresence, motion } from 'framer-motion'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import type { AdminUser } from '../../lib/types'
import { cx } from '../../lib/format'
import { useBodyLock } from '../../hooks/useBodyLock'
import { usePageMeta } from '../../hooks/usePageMeta'
import { Icon, type IconName } from '../ui/Icon'
import { NotificationBell } from './NotificationBell'
import { Logo } from '../ui/Logo'
import { PageError, PageLoader } from '../ui/PageLoader'

const NAV: { to: string; label: string; icon: IconName; end?: boolean; meta: string }[] = [
  { to: '/admin', label: 'نظرة عامة', icon: 'grid', end: true, meta: '01' },
  { to: '/admin/products', label: 'المنتجات', icon: 'box', meta: '02' },
  { to: '/admin/orders', label: 'الطلبات', icon: 'orders', meta: '03' },
  { to: '/admin/finance', label: 'المالية والأرباح', icon: 'chart', meta: '04' },
  { to: '/admin/customers', label: 'العملاء', icon: 'users', meta: '05' },
  { to: '/admin/categories', label: 'التصنيفات', icon: 'tag', meta: '06' },
  { to: '/admin/inventory', label: 'المخزون', icon: 'layers', meta: '07' },
  { to: '/admin/growth', label: 'النمو والولاء', icon: 'sparkle', meta: '08' },
  { to: '/admin/stock-alerts', label: 'تنبيهات التوفر', icon: 'mail', meta: '09' },
]

const TITLES: Record<string, string> = {
  '/admin': 'نظرة عامة',
  '/admin/products': 'المنتجات',
  '/admin/products/new': 'منتج جديد',
  '/admin/orders': 'الطلبات',
  '/admin/finance': 'المالية والأرباح',
  '/admin/customers': 'العملاء',
  '/admin/categories': 'التصنيفات',
  '/admin/inventory': 'المخزون',
  '/admin/growth': 'النمو والولاء',
  '/admin/stock-alerts': 'تنبيهات التوفر',
}

export function AdminLayout() {
  usePageMeta('لوحة التحكم — SNEAKERX', undefined, { noindex: true })
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  useBodyLock(menuOpen)

  const check = useCallback(() => {
    setLoading(true)
    setError('')
    api.admin
      .me()
      .then((result) => {
        setAdmin(result.admin)
        setLoading(false)
      })
      .catch((err: unknown) => {
        const status = (err as { status?: number }).status
        if (status === 401 || status === 403) {
          navigate('/admin/login', { replace: true })
          return
        }
        setError(errorMessage(err))
        setLoading(false)
      })
  }, [navigate])

  useEffect(() => {
    check()
  }, [check])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const title = useMemo(() => {
    if (TITLES[location.pathname]) return TITLES[location.pathname]
    if (location.pathname.startsWith('/admin/products/')) return 'تعديل منتج'
    return 'لوحة التحكم'
  }, [location.pathname])

  const logout = async () => {
    try {
      await api.admin.logout()
    } catch {
      /* session may already be expired */
    }
    navigate('/admin/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink">
        <PageLoader label="SECURE AREA" />
      </div>
    )
  }

  if (error || !admin) {
    return (
      <div className="min-h-screen bg-ink">
        <PageError message={error || 'تعذر التحقق من الجلسة'} onRetry={check} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink">
      <div className="grain" />

      <aside className="fixed inset-y-0 right-0 z-40 hidden w-[260px] flex-col border-e border-line bg-ink2/95 lg:flex">
        <SidebarContent admin={admin} onLogout={logout} />
      </aside>

      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[140] lg:hidden">
            <motion.button
              type="button"
              aria-label="إغلاق القائمة"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 flex w-[280px] flex-col border-s border-line bg-ink2"
            >
              <SidebarContent
                admin={admin}
                onLogout={logout}
                onNavigate={() => setMenuOpen(false)}
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:mr-[260px]">
        <header className="sticky top-0 z-30 border-b border-line bg-ink/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="icon-btn !h-10 !w-10 lg:hidden"
                aria-label="فتح القائمة"
              >
                <Icon name="menu" size={18} />
              </button>
              <div>
                <p className="eyebrow !text-[9px]">SNEAKERX / CONTROL ROOM</p>
                <h1 className="text-sm font-semibold">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-full border border-volt/25 bg-volt/[0.07] px-3 py-1.5 text-[9px] text-volt sm:flex">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-volt" />
                </span>
                LIVE
              </span>
              <NotificationBell />
              <Link
                to="/"
                className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[10px] text-muted transition hover:border-volt/40 hover:text-bone sm:flex"
              >
                <Icon name="external" size={12} />
                عرض المتجر
              </Link>
              <span className="hidden text-[10px] text-muted md:block">{admin.name}</span>
              <button
                type="button"
                onClick={logout}
                className="icon-btn !h-9 !w-9"
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
              >
                <Icon name="logout" size={15} />
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-6 md:py-8">
          <Suspense fallback={<PageLoader label="LOADING PANEL" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function SidebarContent({
  admin,
  onLogout,
  onNavigate,
}: {
  admin: AdminUser
  onLogout: () => void
  onNavigate?: () => void
}) {
  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-line px-5">
        <Logo size="sm" onClick={onNavigate} />
        <span className="rounded-full border border-volt/30 bg-volt/10 px-2 py-0.5 font-mono text-[8px] text-volt">
          ADMIN
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="قائمة لوحة التحكم">
        <p className="eyebrow mb-3 px-2 !text-[9px]">WORKSPACE</p>
        <ul className="space-y-1">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cx(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs transition',
                    isActive
                      ? 'bg-volt text-ink'
                      : 'text-bone/60 hover:bg-ink3 hover:text-bone',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={item.icon} size={16} />
                    <span className="flex-1 font-medium">{item.label}</span>
                    <span
                      className={cx(
                        'font-mono text-[8px]',
                        isActive ? 'text-ink/50' : 'text-muted/50 group-hover:text-muted',
                      )}
                    >
                      {item.meta}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <p className="eyebrow mb-3 mt-7 px-2 !text-[9px]">SHORTCUTS</p>
        <ul className="space-y-1">
          <li>
            <Link
              to="/admin/products/new"
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-bone/60 transition hover:bg-ink3 hover:text-bone"
            >
              <Icon name="plus" size={16} />
              إضافة منتج
            </Link>
          </li>
          <li>
            <Link
              to="/admin/orders?status=pending"
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-bone/60 transition hover:bg-ink3 hover:text-bone"
            >
              <Icon name="clock" size={16} />
              طلبات قيد المراجعة
            </Link>
          </li>
          <li>
            <Link
              to="/admin/finance"
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-bone/60 transition hover:bg-ink3 hover:text-bone"
            >
              <Icon name="chart" size={16} />
              التقرير المالي
            </Link>
          </li>
        </ul>
      </nav>

      <div className="border-t border-line p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-line bg-ink/50 px-3 py-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-volt/15 font-display text-sm font-bold text-volt">
            {admin.name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium">{admin.name}</p>
            <p className="truncate text-[9px] text-muted" dir="ltr">
              {admin.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-line py-2 text-[10px] text-muted transition hover:border-flare/40 hover:text-flare"
        >
          <Icon name="logout" size={13} />
          تسجيل الخروج
        </button>
        <p className="mt-3 text-center font-mono text-[8px] tracking-[0.16em] text-muted/50">
          SNEAKERX CONTROL ROOM
        </p>
      </div>
    </>
  )
}
