import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useBodyLock } from '../../hooks/useBodyLock'
import { Icon } from '../ui/Icon'

type SizeGuideProps = {
  open: boolean
  onClose: () => void
  sizes?: string[]
}

/** EU size → US equivalents and foot length, used by the in-store size chart. */
const CHART: Record<string, { men: string; women: string; cm: string }> = {
  '36': { men: '—', women: '5', cm: '23.0' },
  '37': { men: '—', women: '6', cm: '23.5' },
  '38': { men: '6', women: '7', cm: '24.0' },
  '39': { men: '6.5', women: '8', cm: '24.5' },
  '40': { men: '7', women: '9', cm: '25.0' },
  '41': { men: '8', women: '10', cm: '26.0' },
  '42': { men: '9', women: '—', cm: '26.5' },
  '43': { men: '10', women: '—', cm: '27.0' },
  '44': { men: '11', women: '—', cm: '27.5' },
  '45': { men: '12', women: '—', cm: '28.0' },
}

export function SizeGuide({ open, onClose, sizes = [] }: SizeGuideProps) {
  useBodyLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const available = new Set(sizes.map((size) => String(size).trim()))
  const rows = [...new Set([...available, ...Object.keys(CHART)])].sort(
    (a, b) => Number(a) - Number(b),
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-center justify-center bg-ink/90 p-3 backdrop-blur-md sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="دليل المقاسات"
          data-size-guide
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-bone/15 bg-ink2 shadow-[0_40px_120px_rgba(0,0,0,.8)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-line/70 px-5 py-4">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-volt text-ink">
                <Icon name="scale" size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">دليل المقاسات</p>
                <p className="mt-0.5 text-[10px] text-muted">قِس طول قدمك من الكعب لأطول أصبع</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق دليل المقاسات"
                className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition hover:border-bone/40 hover:text-bone"
              >
                <Icon name="close" size={15} />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full text-center text-[11px]">
                  <thead className="bg-ink text-muted">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">المقاس (EU)</th>
                      <th className="px-3 py-2.5 font-medium">US رجالي</th>
                      <th className="px-3 py-2.5 font-medium">US حريمي</th>
                      <th className="px-3 py-2.5 font-medium">طول القدم (سم)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((size) => (
                      <tr
                        key={size}
                        className="border-t border-line/70 text-bone/80 odd:bg-bone/[0.02]"
                      >
                        <td className="px-3 py-2 font-mono">
                          <span className="inline-flex items-center gap-1.5">
                            {size}
                            {available.has(size) && (
                              <span className="h-1.5 w-1.5 rounded-full bg-volt" title="متوفر في هذه القطعة" />
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-muted">{CHART[size]?.men ?? '—'}</td>
                        <td className="px-3 py-2 font-mono text-muted">{CHART[size]?.women ?? '—'}</td>
                        <td className="px-3 py-2 font-mono text-muted">{CHART[size]?.cm ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 flex items-center gap-2 text-[10px] leading-5 text-muted">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-volt" />
                النقطة الخضراء تعني أن المقاس متوفر في القطعة اللي بتتصفحها. لو بين مقاسين، اختر
                الأكبر.
              </p>
              <Link
                to="/policies#sizes"
                onClick={onClose}
                className="link-line mt-3 inline-block text-[11px] text-bone/80"
              >
                اقرأ دليل المقاسات الكامل
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
