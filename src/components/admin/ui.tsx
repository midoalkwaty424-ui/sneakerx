import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useBodyLock } from '../../hooks/useBodyLock'
import { Icon } from '../ui/Icon'

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-volt" />
          <span className="eyebrow !text-[9px]">{eyebrow}</span>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-xs leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function AdminLoading({ label = 'LOADING' }: { label?: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div className="flex flex-col items-center gap-3">
        <span className="spinner spinner-light !h-7 !w-7" />
        <span className="eyebrow !text-[9px]">{label}</span>
      </div>
    </div>
  )
}

export function AdminError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="grid min-h-[36vh] place-items-center rounded-xl border border-flare/25 bg-flare/[0.04] px-6 text-center">
      <div>
        <Icon name="cancel" size={26} className="mx-auto text-flare" />
        <p className="mt-3 text-sm text-flare">{message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn btn-ghost btn-sm mt-4">
            <Icon name="refresh" size={13} />
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  )
}

export function AdminEmpty({
  icon = 'box',
  title,
  message,
  action,
}: {
  icon?: 'box' | 'orders' | 'users' | 'tag' | 'layers' | 'search' | 'sparkle' | 'mail'
  title: string
  message?: string
  action?: ReactNode
}) {
  return (
    <div className="grid min-h-[30vh] place-items-center rounded-xl border border-line bg-ink2 px-6 text-center">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-line text-muted">
          <Icon name={icon} size={24} />
        </span>
        <p className="mt-4 font-display text-lg font-bold">{title}</p>
        {message && <p className="mt-1.5 max-w-sm text-[11px] leading-5 text-muted">{message}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useBodyLock(open)
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] grid place-items-center px-4">
          <motion.button
            type="button"
            aria-label="إغلاق"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="relative w-full max-w-sm rounded-2xl border border-line bg-ink2 p-6 shadow-[0_30px_80px_rgba(0,0,0,.6)]"
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
          >
            <span
              className={`grid h-11 w-11 place-items-center rounded-full ${
                danger ? 'bg-flare/15 text-flare' : 'bg-volt/15 text-volt'
              }`}
            >
              <Icon name={danger ? 'trash' : 'shield'} size={19} />
            </span>
            <h2 className="mt-4 font-display text-lg font-bold">{title}</h2>
            <p className="mt-2 text-xs leading-6 text-muted">{message}</p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`btn flex-1 ${danger ? 'bg-flare text-ink hover:bg-flare/90' : 'btn-volt'}`}
              >
                {loading ? <span className="spinner" /> : confirmLabel}
              </button>
              <button type="button" onClick={onCancel} className="btn btn-ghost flex-1" disabled={loading}>
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function AdminDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useBodyLock(open)
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[145]" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button
            type="button"
            aria-label="إغلاق"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 left-0 flex w-full max-w-[520px] flex-col border-e border-line bg-ink2 shadow-[30px_0_80px_rgba(0,0,0,.6)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <p className="eyebrow !text-[9px]">{subtitle || 'DETAILS'}</p>
                <h2 className="mt-1 font-display text-lg font-bold">{title}</h2>
              </div>
              <button type="button" onClick={onClose} className="icon-btn !h-9 !w-9" aria-label="إغلاق">
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
            {footer && <div className="border-t border-line px-5 py-4">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
