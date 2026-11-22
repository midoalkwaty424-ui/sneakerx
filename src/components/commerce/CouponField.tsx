import { useState } from 'react'
import { errorMessage } from '../../lib/api'
import { track } from '../../lib/analytics'
import { cx, formatEGP } from '../../lib/format'
import { useRewards } from '../../store/rewards'
import { useToast } from '../../store/toast'
import { Icon } from '../ui/Icon'

type CouponFieldProps = {
  subtotal: number
  compact?: boolean
  className?: string
}

export function CouponField({ subtotal, compact = false, className }: CouponFieldProps) {
  const { coupon, applyCoupon, removeCoupon, couponDiscountFor } = useRewards()
  const { toast } = useToast()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const discount = couponDiscountFor(subtotal)

  if (coupon) {
    const applies = discount > 0
    return (
      <div className={cx('rounded-xl border p-3', applies ? 'border-volt/35 bg-volt/10' : 'border-flare/35 bg-flare/10', className)}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[11px] font-bold">
            <Icon name={applies ? 'check' : 'cancel'} className="h-4 w-4" />
            {coupon.code}
          </span>
          <button
            type="button"
            className="text-[10px] text-muted underline-offset-4 hover:text-bone hover:underline"
            onClick={() => {
              removeCoupon()
              setCode('')
              toast('شيلنا كود الخصم')
            }}
          >
            إزالة
          </button>
        </div>
        <p className="mt-1 text-[10px] leading-5 text-muted">
          {applies
            ? `${coupon.description} — توفير ${formatEGP(discount)}`
            : `الكود محتاج حد أدنى ${formatEGP(coupon.minSubtotal)} — كمّل السلة عشان يشتغل.`}
        </p>
      </div>
    )
  }

  const submit = async () => {
    if (!code.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const applied = await applyCoupon(code, subtotal)
      track('coupon_applied', { code: applied.code, discount: applied.discount })
      toast(`اتفعّل كود ${applied.code} — خصم ${formatEGP(applied.discount)}`)
      setCode('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cx('space-y-2', className)} role="group" aria-label="كود الخصم">
      <div className="flex gap-2">
        <input
          className={cx('field flex-1 uppercase', compact ? 'h-10 text-xs' : '')}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void submit()
            }
          }}
          placeholder="كود الخصم"
          aria-label="كود الخصم"
          maxLength={40}
          data-coupon-input
        />
        <button
          type="button"
          className={cx('btn btn-ghost shrink-0', compact ? 'h-10 px-3 text-xs' : '')}
          disabled={busy || !code.trim()}
          onClick={() => void submit()}
        >
          {busy ? <span className="spinner" /> : 'تطبيق'}
        </button>
      </div>
      {error && <p className="text-[10px] text-flare">{error}</p>}
      {!error && (
        <p className="text-[10px] text-muted">
          جرّب <button type="button" className="text-volt" onClick={() => setCode('WELCOME10')}>WELCOME10</button> أو{' '}
          <button type="button" className="text-volt" onClick={() => setCode('SX500')}>SX500</button>
        </p>
      )}
    </div>
  )
}
