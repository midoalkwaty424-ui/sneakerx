import { AnimatePresence, motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { COMPARE_LIMIT, useShop } from '../../store/shop'
import { cx } from '../../lib/format'
import { ProductVisual } from '../commerce/ProductVisual'
import { Icon } from '../ui/Icon'

export function CompareBar() {
  const { compare, removeCompare, clearCompare } = useShop()
  const location = useLocation()
  const visible = compare.length > 0 && location.pathname !== '/compare'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] px-3 sm:px-5"
          data-compare-bar
        >
          <div className="pointer-events-auto mx-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-bone/15 bg-ink/90 p-2.5 shadow-[0_24px_70px_rgba(0,0,0,.6)] backdrop-blur-2xl sm:gap-4 sm:rounded-full sm:p-2 sm:ps-4">
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <Icon name="compare" size={15} className="text-volt" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-bone/70">
                COMPARE {compare.length}/{COMPARE_LIMIT}
              </span>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {compare.map((item) => (
                <div key={item.slug} className="relative shrink-0">
                  <Link
                    to={`/product/${item.slug}`}
                    className="block h-10 w-10 overflow-hidden rounded-lg border border-bone/15 bg-ink2 transition hover:border-volt/50 sm:h-11 sm:w-11"
                    aria-label={item.name}
                  >
                    <ProductVisual
                      image={item.image}
                      alt={item.name}
                      fit="cover"
                      className="h-full w-full"
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeCompare(item.slug)}
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-bone/20 bg-ink text-bone/70 transition hover:border-flare/60 hover:text-flare"
                    aria-label={`إزالة ${item.name} من المقارنة`}
                  >
                    <Icon name="close" size={9} />
                  </button>
                </div>
              ))}
              {Array.from({ length: COMPARE_LIMIT - compare.length }).map((_, index) => (
                <span
                  key={`slot-${index}`}
                  className={cx(
                    'hidden h-10 w-10 shrink-0 rounded-lg border border-dashed border-bone/12 sm:block sm:h-11 sm:w-11',
                  )}
                  aria-hidden="true"
                />
              ))}
            </div>

            <Link to="/compare" className="btn btn-volt btn-sm h-10 shrink-0 px-4">
              قارن
              <Icon name="arrow-left" size={12} />
            </Link>

            <button
              type="button"
              onClick={clearCompare}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-bone/[0.06] hover:text-bone"
              aria-label="مسح المقارنة"
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
