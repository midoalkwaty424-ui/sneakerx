import { useState } from 'react'
import type { FinancePoint } from '../../../lib/types'
import { cx, formatEGP } from '../../../lib/format'

type Metric = 'revenue' | 'profit' | 'cash'

const METRIC_LABEL: Record<Metric, string> = {
  revenue: 'الإيرادات',
  profit: 'الربح',
  cash: 'التدفق النقدي',
}

export function MoneyChart({
  series,
  metric = 'revenue',
}: {
  series: FinancePoint[]
  metric?: Metric
}) {
  const [hover, setHover] = useState<number | null>(null)
  const width = 760
  const height = 230
  const padTop = 18
  const padBottom = 26
  const padX = 8
  const values = series.flatMap((point) => [point[metric], point.profit, 0])
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const count = Math.max(series.length, 1)
  const step = (width - padX * 2) / Math.max(count, 1)
  const barWidth = Math.max(2, Math.min(step * 0.48, 30))
  const y = (value: number) =>
    padTop + (1 - (value - min) / span) * (height - padTop - padBottom)
  const zeroY = y(0)

  const line = series
    .map((point, index) => {
      const x = padX + step * index + step / 2
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y(point.profit).toFixed(1)}`
    })
    .join(' ')

  const active = hover != null ? series[hover] : null
  const activeX = hover != null ? padX + step * hover + step / 2 : 0
  const labels = series
    .map((point, index) => ({ point, index }))
    .filter(({ index }) => index % Math.max(1, Math.ceil(count / 6)) === 0 || index === count - 1)

  if (series.length === 0) {
    return (
      <div className="grid h-[230px] place-items-center rounded-xl border border-dashed border-line text-[11px] text-muted">
        لا توجد حركة مالية في هذه الفترة.
      </div>
    )
  }

  return (
    <div>
      <div className="relative h-[230px] w-full" onPointerLeave={() => setHover(null)}>
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {[0, 25, 50, 75, 100].map((position) => (
            <span
              key={position}
              className="absolute inset-x-0 border-t border-line/35"
              style={{ top: `${position}%` }}
            />
          ))}
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`مخطط ${METRIC_LABEL[metric]} والربح`}
        >
          <defs>
            <linearGradient id="finance-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d9ff43" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#d9ff43" stopOpacity="0.18" />
            </linearGradient>
          </defs>
          <line
            x1={0}
            x2={width}
            y1={zeroY}
            y2={zeroY}
            stroke="#8f97a2"
            strokeWidth={1}
            opacity={0.45}
            vectorEffect="non-scaling-stroke"
          />
          {series.map((point, index) => {
            const x = padX + step * index + step / 2
            const value = point[metric]
            const top = Math.min(y(value), zeroY)
            const barHeight = Math.max(1, Math.abs(y(value) - zeroY))
            return (
              <rect
                key={point.day}
                x={x - barWidth / 2}
                y={top}
                width={barWidth}
                height={barHeight}
                rx={2}
                fill={value < 0 ? '#ff5a36' : 'url(#finance-bar)'}
                opacity={hover == null || hover === index ? 1 : 0.55}
              />
            )
          })}
          <path
            d={line}
            fill="none"
            stroke="#a9c7ff"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {active && (
            <line
              x1={activeX}
              x2={activeX}
              y1={0}
              y2={height}
              stroke="#f1eee5"
              strokeWidth={1}
              opacity={0.25}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {series.map((point, index) => (
            <rect
              key={`hit-${point.day}`}
              x={padX + step * index}
              y={0}
              width={step}
              height={height}
              fill="transparent"
              onPointerEnter={() => setHover(index)}
            />
          ))}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute top-1 z-10 min-w-[132px] -translate-x-1/2 rounded-lg border border-line bg-ink/95 px-2.5 py-2 text-[9px] shadow-xl backdrop-blur"
            style={{ left: `${Math.min(88, Math.max(12, (activeX / width) * 100))}%` }}
          >
            <p className="font-mono text-muted">{active.day.slice(5)}</p>
            <p className="mt-1 text-bone">إيرادات: {formatEGP(active.revenue)}</p>
            <p className={cx(active.profit >= 0 ? 'text-volt' : 'text-flare')}>
              ربح: {formatEGP(active.profit)}
            </p>
            <p className="text-muted">مصروفات: {formatEGP(active.expenses)}</p>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[9px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-volt/80" /> {METRIC_LABEL[metric]}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-ice" /> صافي الربح
          </span>
        </div>
        <div className="hidden font-mono text-[8px] text-muted/60 sm:block">
          {labels.length} نقطة زمنية
        </div>
      </div>
    </div>
  )
}

const PALETTE = ['#d9ff43', '#a9c7ff', '#c4b5fd', '#f5c451', '#7dd3fc', '#ff5a36', '#8fd6b4', '#e2a7d6']

export function DonutChart({
  data,
  total,
  label,
}: {
  data: { label: string; value: number }[]
  total: number
  label: string
}) {
  const radius = 46
  const circumference = 2 * Math.PI * radius
  let offset = 0
  const visible = data.filter((item) => item.value > 0).slice(0, 8)
  const sum = visible.reduce((acc, item) => acc + item.value, 0) || total || 1

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative h-[132px] w-[132px] shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#262b33" strokeWidth="13" />
          {visible.map((item, index) => {
            const length = (item.value / sum) * circumference
            const dash = `${Math.max(length - 2, 0)} ${circumference - Math.max(length - 2, 0)}`
            const element = (
              <circle
                key={item.label}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={PALETTE[index % PALETTE.length]}
                strokeWidth="13"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            )
            offset += length
            return element
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-sm font-bold">{formatEGP(sum)}</p>
            <p className="mt-0.5 text-[8px] text-muted">{label}</p>
          </div>
        </div>
      </div>

      <ul className="min-w-[140px] flex-1 space-y-2">
        {visible.length === 0 && <li className="text-[10px] text-muted">لا توجد بيانات كافية.</li>}
        {visible.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2 text-[10px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: PALETTE[index % PALETTE.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-muted">{item.label}</span>
            <span className="font-mono text-bone/80">{formatEGP(item.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
