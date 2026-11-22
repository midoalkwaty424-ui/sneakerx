import { useState, type FormEvent } from 'react'
import { api, errorMessage } from '../../lib/api'
import { Icon } from '../ui/Icon'

type StockAlertFormProps = {
  productId: number
  variantId: number
  productName: string
  size: string
  compact?: boolean
}

export function StockAlertForm({
  productId,
  variantId,
  productName,
  size,
  compact = false,
}: StockAlertFormProps) {
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await api.createStockAlert(variantId, phone)
      setMessage(result.message)
      setPhone('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`rounded-xl border border-ice/25 bg-ice/[0.05] ${compact ? 'p-3' : 'p-4'}`}
      data-stock-alert
    >
      <div className="flex items-start gap-2">
        <Icon name="clock" size={15} className="mt-0.5 shrink-0 text-ice" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-bone">
            نبّهني لما {productName} مقاس {size} يرجع
          </p>
          <p className="mt-1 text-[10px] leading-5 text-muted">
            اترك رقمك وهنسجّل طلبك. أول ما المخزون يرجع هيظهر التنبيه في لوحة التحكم عشان نتواصل معاك.
          </p>
        </div>
      </div>

      <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          dir="ltr"
          maxLength={20}
          placeholder="01xxxxxxxxx"
          aria-label="رقم الهاتف لتنبيه التوفر"
          className="field h-10 flex-1 text-left text-xs"
          data-stock-alert-input
          key={`${productId}-${variantId}`}
        />
        <button
          type="submit"
          disabled={busy || phone.trim().length < 8}
          className="btn btn-ghost h-10 shrink-0 !py-2 text-xs"
          data-stock-alert-submit
        >
          {busy ? <span className="spinner spinner-light" /> : 'سجّل التنبيه'}
        </button>
      </form>

      {message && <p className="mt-2 text-[10px] leading-5 text-volt">{message}</p>}
      {error && <p className="mt-2 text-[10px] leading-5 text-flare">{error}</p>}
    </div>
  )
}
