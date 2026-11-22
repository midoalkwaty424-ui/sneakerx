import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../../store/cart'
import { useShop } from '../../store/shop'
import { useAssistant } from '../../store/assistant'
import { useBodyLock } from '../../hooks/useBodyLock'
import { cx } from '../../lib/format'
import { isFinePointer, prefersReducedMotion } from '../../lib/gsap'
import { supportLink } from '../../lib/whatsapp'
import { Icon, type IconName } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { Magnetic } from '../ui/Magnetic'

const NAV = [
  { label: 'الجديد', to: '/shop?collection=new' },
  { label: 'رجالي', to: '/shop?gender=men' },
  { label: 'حريمي', to: '/shop?gender=women' },
  { label: 'كل الأحذية', to: '/shop' },
  { label: 'المكافآت', to: '/loyalty' },
  { label: 'القصة', to: '/#story' },
]

const TICKER = [
  'شحن مجاني للطلبات فوق 2,500 ج.م',
  'الدفع عند الاستلام في كل محافظات مصر',
  'DROP 001 — إصدار محدود الآن',
  'استرجاع مجاني خلال 14 يوم',
]

const MOBILE_LINKS = [
  ...NAV.map((item, index) => ({ ...item, meta: String(index + 1).padStart(2, '0') })),
  { label: 'تتبع طلبك', to: '/track', meta: '07' },
]

function navActive(to: string, pathname: string, search: string, hash: string) {
  if (to.startsWith('/#')) return pathname === '/' && hash === to.slice(1)
  const [path, query] = to.split('?')
  if (query) return pathname === path && search === `?${query}`
  return pathname === path && !search
}

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const { count, openCart } = useCart()
  const { wishlistCount } = useShop()
  const { openAssistant } = useAssistant()
  const location = useLocation()

  useBodyLock(menuOpen || searchOpen)

  /* Scroll state + reading-progress line inside the island. */
  useEffect(() => {
    let frame = 0
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`
      }
      setScrolled(window.scrollY > 24)
    }
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  /* Cursor spotlight that lives inside the glass island. */
  useEffect(() => {
    const pill = pillRef.current
    if (!pill || !isFinePointer() || prefersReducedMotion()) return
    let frame = 0
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = pill.getBoundingClientRect()
        pill.style.setProperty('--mx', `${event.clientX - rect.left}px`)
        pill.style.setProperty('--my', `${event.clientY - rect.top}px`)
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(frame)
      pill.style.setProperty('--mx', '-40%')
      pill.style.setProperty('--my', '-40%')
    }
    pill.addEventListener('pointermove', onMove)
    pill.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      pill.removeEventListener('pointermove', onMove)
      pill.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
    setHovered(null)
  }, [location.pathname, location.search, location.hash])

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[100]">
        {/* Ticker — collapses as soon as the page moves. */}
        <div
          className={cx(
            'overflow-hidden bg-volt transition-[max-height,opacity] duration-500 ease-out',
            scrolled ? 'max-h-0 opacity-0' : 'max-h-8 opacity-100',
          )}
        >
          <div className="flex h-8 items-center overflow-hidden">
            <div className="marquee-track items-center">
              {[0, 1].map((group) => (
                <div key={group} className="flex shrink-0 items-center">
                  {TICKER.map((text) => (
                    <span
                      key={`${group}-${text}`}
                      className="flex items-center gap-6 px-6 font-mono text-[10px] font-medium tracking-wide text-ink"
                    >
                      {text}
                      <span className="h-1 w-1 rounded-full bg-ink/50" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container-x pt-2">
          <div
            ref={pillRef}
            data-header-pill
            className={cx(
              'group/pill relative flex items-center justify-between gap-3 rounded-full border px-2.5 backdrop-blur-2xl transition-[height,background-color,border-color,box-shadow] duration-500 ease-out sm:px-3',
              scrolled
                ? 'h-[58px] border-bone/15 bg-ink/85 shadow-[0_18px_60px_rgba(0,0,0,.55)] lg:h-[60px]'
                : 'h-[58px] border-bone/10 bg-ink/55 shadow-[0_10px_40px_rgba(0,0,0,.32)] lg:h-[62px]',
              '[--mx:-40%] [--my:-40%]',
            )}
          >
            {/* Mouse-following light + top sheen. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover/pill:opacity-100"
              style={{
                background:
                  'radial-gradient(220px circle at var(--mx) var(--my), rgba(217,255,67,.14), transparent 64%)',
              }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-bone/25 to-transparent"
            />

            {/* Logo */}
            <div className="relative z-10 flex shrink-0 items-center">
              <Magnetic strength={0.12}>
                <Logo />
              </Magnetic>
            </div>

            {/* Desktop nav — hover pill slides between links. */}
            <nav
              className="relative z-10 hidden flex-1 items-center justify-center gap-1 lg:flex"
              aria-label="التنقل الرئيسي"
              onMouseLeave={() => setHovered(null)}
            >
              {NAV.map((item) => {
                const active = navActive(item.to, location.pathname, location.search, location.hash)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onMouseEnter={() => setHovered(item.to)}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'relative rounded-full px-3.5 py-2 text-[0.8rem] font-medium transition-colors duration-300 xl:px-4',
                      active ? 'text-bone' : 'text-bone/65 hover:text-bone',
                    )}
                  >
                    {hovered === item.to && (
                      <motion.span
                        layoutId="nav-hover-pill"
                        data-nav-hover
                        className="absolute inset-0 rounded-full border border-bone/10 bg-bone/[0.06]"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                    {active && (
                      <motion.span
                        layoutId="nav-active-dot"
                        data-nav-active
                        className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-volt"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Actions */}
            <div className="relative z-10 flex shrink-0 items-center gap-0.5 sm:gap-2">
              <Magnetic strength={0.16}>
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="icon-btn h-10 w-10 border-transparent bg-transparent hover:bg-bone/[0.05] sm:h-11 sm:w-11"
                  aria-label="بحث"
                  data-cursor-label="بحث"
                >
                  <Icon name="search" size={17} />
                </button>
              </Magnetic>

              <Magnetic strength={0.16}>
                <button
                  type="button"
                  onClick={() => openAssistant()}
                  className="icon-btn relative hidden h-10 w-10 border-transparent bg-transparent hover:bg-bone/[0.05] sm:inline-flex sm:h-11 sm:w-11"
                  aria-label="دردشة SNEAKERX"
                  data-cursor-label="الدردشة"
                  data-assistant-header
                >
                  <Icon name="sparkle" size={17} className="text-volt" />
                </button>
              </Magnetic>

              <Magnetic strength={0.16}>
                <Link
                  to="/wishlist"
                  className="icon-btn relative hidden h-10 w-10 border-transparent bg-transparent hover:bg-bone/[0.05] sm:inline-flex sm:h-11 sm:w-11"
                  aria-label={`المفضلة (${wishlistCount})`}
                  data-cursor-label="المفضلة"
                  data-wishlist-link
                >
                  <Icon name="heart" size={17} />
                  <AnimatePresence>
                    {wishlistCount > 0 && (
                      <motion.span
                        key={wishlistCount}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-flare px-1 font-mono text-[9px] font-bold text-ink"
                      >
                        {wishlistCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </Magnetic>

              <Magnetic strength={0.16}>
                <button
                  type="button"
                  onClick={openCart}
                  className="icon-btn relative h-10 w-10 border-transparent bg-transparent hover:bg-bone/[0.05] sm:h-11 sm:w-11"
                  aria-label={`فتح السلة (${count})`}
                  data-cursor-label="السلة"
                >
                  <Icon name="bag" size={17} />
                  <AnimatePresence>
                    {count > 0 && (
                      <motion.span
                        key={count}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-volt px-1 font-mono text-[9px] font-bold text-ink"
                      >
                        {count}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </Magnetic>

              <Link
                to="/shop"
                className="btn btn-volt btn-sm ms-1 hidden h-10 gap-1.5 px-4 text-[11px] xl:inline-flex"
              >
                تسوق الآن
                <Icon name="arrow-left" size={12} />
              </Link>

              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="group relative grid h-10 w-10 place-items-center rounded-full border border-bone/15 bg-bone/[0.03] sm:ms-0.5 transition-[transform,background-color,border-color] duration-300 hover:border-volt/40 hover:bg-bone/[0.06] active:scale-95 sm:h-11 sm:w-11 lg:hidden"
                aria-label="فتح القائمة"
                aria-expanded={menuOpen}
                data-cursor-label="القائمة"
              >
                <span className="relative block h-3 w-[18px]" aria-hidden="true">
                  <span className="absolute inset-x-0 top-0 h-[1.5px] rounded-full bg-bone transition-transform duration-300 group-hover:translate-y-[1px]" />
                  <span className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 rounded-full bg-bone transition-colors duration-300 group-hover:bg-volt" />
                  <span className="absolute inset-x-0 bottom-0 h-[1.5px] rounded-full bg-bone transition-transform duration-300 group-hover:-translate-y-[1px]" />
                </span>
              </button>
            </div>

            {/* Scroll progress, drawn inside the island. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 bottom-0 h-px overflow-hidden rounded-full bg-bone/10"
            >
              <span
                ref={progressRef}
                data-header-progress
                className="block h-full w-full origin-right scale-x-0 bg-volt transition-transform duration-150 ease-out"
              />
            </span>
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { openCart, count } = useCart()
  const { openAssistant } = useAssistant()
  const location = useLocation()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[125] lg:hidden"
          data-mobile-menu
          role="dialog"
          aria-modal="true"
          aria-label="قائمة التنقل"
        >
          <div className="absolute inset-0 bg-ink" />
          <div className="grain" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_-5%,rgba(217,255,67,.14),transparent_45%),radial-gradient(circle_at_0%_100%,rgba(169,199,255,.06),transparent_40%)]" />
          <span
            className="display pointer-events-none absolute -left-6 bottom-24 select-none text-[42vw] leading-none text-transparent opacity-[0.035]"
            style={{ WebkitTextStroke: '1px #f1eee5' }}
            aria-hidden="true"
          >
            SX
          </span>

          <motion.div
            initial={{ y: -18 }}
            animate={{ y: 0 }}
            exit={{ y: -18 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-[100dvh] flex-col"
          >
            <div className="flex h-[4.4rem] shrink-0 items-center justify-between px-5">
              <Logo onClick={onClose} />
              <button
                type="button"
                onClick={onClose}
                className="icon-btn active:scale-95"
                aria-label="إغلاق القائمة"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-volt" />
                <span className="eyebrow">MENU / NAVIGATE</span>
              </div>

              <nav className="flex flex-col" aria-label="قائمة الموبايل">
                {MOBILE_LINKS.map((item, index) => {
                  const active = navActive(
                    item.to,
                    location.pathname,
                    location.search,
                    location.hash,
                  )
                  return (
                    <motion.div
                      key={item.to}
                      initial={{ y: 22, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        delay: 0.08 + index * 0.045,
                        duration: 0.4,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <Link
                        to={item.to}
                        onClick={onClose}
                        className={cx(
                          'group flex items-center justify-between border-b border-line/70 py-3.5 transition-colors active:bg-bone/[0.03]',
                          active ? 'text-volt' : 'text-bone',
                        )}
                      >
                        <span className="display text-[clamp(2.1rem,8.6vw,3.1rem)] leading-[1.05]">
                          {item.label}
                        </span>
                        <span className="flex items-center gap-3">
                          <span
                            className={cx(
                              'font-mono text-[9px]',
                              active ? 'text-volt' : 'text-muted',
                            )}
                          >
                            {item.meta}
                          </span>
                          <span
                            className={cx(
                              'grid h-7 w-7 place-items-center rounded-full border transition-colors',
                              active
                                ? 'border-volt/40 bg-volt/10 text-volt'
                                : 'border-line text-muted group-hover:border-bone/30 group-hover:text-bone',
                            )}
                          >
                            <Icon name="arrow-left" size={12} />
                          </span>
                        </span>
                      </Link>
                    </motion.div>
                  )
                })}
              </nav>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.42, duration: 0.4 }}
                className="mt-6 grid grid-cols-2 gap-2"
              >
                {[
                  { label: 'المفضلة', to: '/wishlist', icon: 'heart' as IconName },
                  { label: 'المقارنة', to: '/compare', icon: 'compare' as IconName },
                  { label: 'السياسات', to: '/policies', icon: 'shield' as IconName },
                  { label: 'لوحة التحكم', to: '/admin/login', icon: 'grid' as IconName },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className="flex items-center gap-2.5 rounded-xl border border-line bg-ink2/60 px-3 py-3 text-[11px] text-muted transition-colors active:bg-ink3"
                  >
                    <Icon name={item.icon} size={14} />
                    {item.label}
                  </Link>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="shrink-0 border-t border-line/60 bg-ink/80 px-5 pb-6 pt-4 backdrop-blur-xl"
            >
              <button
                type="button"
                onClick={() => {
                  onClose()
                  openCart()
                }}
                className="btn btn-volt w-full active:scale-[0.99]"
              >
                <Icon name="bag" size={16} />
                عرض السلة
                {count > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 font-mono text-[10px] font-bold text-volt">
                    {count}
                  </span>
                )}
              </button>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    openAssistant()
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  <Icon name="sparkle" size={14} className="text-volt" />
                  الدردشة
                </button>
                <a
                  href={supportLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  <Icon name="whatsapp" size={14} className="text-[#25d366]" />
                  واتساب
                </a>
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] text-muted">
                <span>الدفع عند الاستلام</span>
                <span className="font-mono">CAIRO / EGYPT</span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-2">
                  {(['instagram', 'tiktok', 'whatsapp'] as const).map((social) => (
                    <a
                      key={social}
                      href={
                        social === 'instagram'
                          ? 'https://instagram.com'
                          : social === 'tiktok'
                            ? 'https://tiktok.com'
                            : supportLink()
                      }
                      target="_blank"
                      rel="noreferrer noopener"
                      className="icon-btn h-9 w-9 active:scale-95"
                      aria-label={social}
                    >
                      <Icon name={social} size={14} />
                    </a>
                  ))}
                </div>
                <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted/60">
                  SNEAKERX — 001
                </span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [value, setValue] = useState('')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 120)
      return () => clearTimeout(timer)
    }
    setValue('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const query = value.trim()
    onClose()
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : '/shop')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[130] bg-ink/90 p-4 backdrop-blur-2xl sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="البحث في المتجر"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="mx-auto mt-[8vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-bone/12 bg-ink2/90 shadow-[0_40px_120px_rgba(0,0,0,.6)]"
          >
            <div className="flex items-center justify-between border-b border-line/70 px-5 py-3">
              <span className="eyebrow">SEARCH THE COLLECTION</span>
              <button onClick={onClose} className="icon-btn h-9 w-9" aria-label="إغلاق البحث">
                <Icon name="close" size={17} />
              </button>
            </div>

            <form onSubmit={submit} className="px-5 pb-5 pt-6 sm:px-7">
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-ink/60 px-4 py-3 transition-colors focus-within:border-volt/40">
                <Icon name="search" size={22} className="shrink-0 text-volt" />
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="ابحث عن موديل، لون، أو مجموعة..."
                  className="w-full bg-transparent text-base font-light text-bone outline-none placeholder:text-muted/60 sm:text-xl"
                  aria-label="كلمة البحث"
                />
                <button type="submit" className="btn btn-volt btn-sm shrink-0">
                  بحث
                </button>
              </div>
              <p className="mt-2.5 font-mono text-[8px] uppercase tracking-[0.18em] text-muted/60">
                PRESS ENTER TO SEARCH — ESC TO CLOSE
              </p>
            </form>

            <div className="grid gap-5 border-t border-line/60 px-5 py-5 sm:grid-cols-2 sm:px-7">
              <div>
                <p className="eyebrow mb-3">تصفح سريع</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'وصل حديثًا', to: '/shop?collection=new' },
                    { label: 'الأكثر مبيعًا', to: '/shop?collection=best' },
                    { label: 'رجالي', to: '/shop?gender=men' },
                    { label: 'حريمي', to: '/shop?gender=women' },
                    { label: 'تحت 3,500', to: '/shop?max=3500' },
                  ].map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className="chip hover:border-volt/40 active:scale-95"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="eyebrow mb-3">اختصارات</p>
                <ul className="space-y-2 text-sm text-muted">
                  <li>
                    <Link to="/shop?sort=best" onClick={onClose} className="link-line hover:text-bone">
                      الأكثر رواجًا الآن
                    </Link>
                  </li>
                  <li>
                    <Link to="/#story" onClick={onClose} className="link-line hover:text-bone">
                      قصة SneakerX
                    </Link>
                  </li>
                  <li>
                    <Link to="/track" onClick={onClose} className="link-line hover:text-bone">
                      تتبع طلبك
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
