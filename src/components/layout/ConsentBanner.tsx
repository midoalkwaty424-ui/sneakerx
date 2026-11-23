import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getConsent, setConsent, type ConsentValue } from '../../lib/analytics'
import { Icon } from '../ui/Icon'

export function ConsentBanner() {
  const [value, setValue] = useState<ConsentValue>(() => getConsent())
  const [visible, setVisible] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) return
    const timer = window.setTimeout(() => setVisible(true), 1400)
    return () => window.clearTimeout(timer)
  }, [value])

  /* Lift the floating controls by the banner's real height so the assistant
     stays tappable without leaving a large empty gap on short phone screens.
     The panel needs the offset at every width (the banner follows the viewport
     edge on tablets too); the dock only needs it on phones where the banner is
     full width. */
  useEffect(() => {
    const apply = () => {
      const banner = bannerRef.current
      const height = visible && !value && banner ? banner.getBoundingClientRect().height : 0
      // On phones the panel fills the space between the header and the banner,
      // so only a small seam is needed. On wider screens there is room for a
      // comfortable gap beside the card-style banner.
      const panelOffset = height
        ? Math.ceil(height) + (window.innerWidth < 640 ? 0 : 16)
        : 0
      document.documentElement.style.setProperty('--panel-offset', `${panelOffset}px`)
      document.documentElement.style.setProperty(
        '--dock-offset',
        `${height && window.innerWidth < 640 ? Math.ceil(height) + 16 : 0}px`,
      )
    }
    const frame = window.requestAnimationFrame(apply)
    const observer =
      typeof ResizeObserver !== 'undefined' && bannerRef.current
        ? new ResizeObserver(apply)
        : null
    if (bannerRef.current) observer?.observe(bannerRef.current)
    window.addEventListener('resize', apply)
    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', apply)
      document.documentElement.style.removeProperty('--dock-offset')
      document.documentElement.style.removeProperty('--panel-offset')
    }
  }, [visible, value])

  const decide = (next: 'granted' | 'denied') => {
    setConsent(next)
    setValue(next)
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && !value && (
        <motion.div
          ref={bannerRef}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-3 z-[94] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[24rem]"
          data-consent-banner
          role="dialog"
          aria-label="إعدادات الخصوصية"
        >
          <div className="rounded-2xl border border-bone/15 bg-ink/95 p-4 shadow-[0_24px_70px_rgba(0,0,0,.65)] backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2">
              <Icon name="shield" className="h-4 w-4 text-volt" />
              <span className="eyebrow !text-[9px]">PRIVACY</span>
            </div>
            <p className="text-xs leading-6 text-bone/80">
              بنستخدم تحليلات داخلية لتحسين المتجر، وبنشغّل Google Analytics وMeta Pixel
              <span className="text-bone"> فقط بعد موافقتك</span>. مفيش بيانات بتتباع لأي طرف تالت.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-volt btn-sm" onClick={() => decide('granted')}>
                أوافق على التحليلات
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => decide('denied')}
              >
                رفض
              </button>
              <Link
                to="/policies#privacy"
                className="ms-auto text-[10px] text-muted underline-offset-4 hover:text-bone hover:underline"
                onClick={() => setVisible(false)}
              >
                سياسة الخصوصية
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
