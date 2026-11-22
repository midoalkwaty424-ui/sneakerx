import { Icon } from '../ui/Icon'
import { cx } from '../../lib/format'

type QuantityStepperProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  compact?: boolean
  label?: string
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  compact = false,
  label = 'الكمية',
}: QuantityStepperProps) {
  return (
    <div
      className={cx(
        'inline-flex items-center rounded-full border border-line bg-ink2',
        compact ? 'h-8' : 'h-11',
      )}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(Math.min(value + 1, max))}
        disabled={value >= max}
        className={cx(
          'grid place-items-center rounded-full text-bone transition hover:text-volt disabled:opacity-30',
          compact ? 'h-8 w-8' : 'h-11 w-10',
        )}
        aria-label="زيادة الكمية"
      >
        <Icon name="plus" size={compact ? 12 : 14} />
      </button>
      <span
        className={cx(
          'min-w-8 text-center font-mono tabular-nums',
          compact ? 'text-xs' : 'text-sm',
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.max(value - 1, min))}
        disabled={value <= min}
        className={cx(
          'grid place-items-center rounded-full text-bone transition hover:text-volt disabled:opacity-30',
          compact ? 'h-8 w-8' : 'h-11 w-10',
        )}
        aria-label="تقليل الكمية"
      >
        <Icon name="minus" size={compact ? 12 : 14} />
      </button>
    </div>
  )
}
