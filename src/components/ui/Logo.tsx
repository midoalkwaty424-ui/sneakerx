import { Link } from 'react-router-dom'
import { cx } from '../../lib/format'

type LogoProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  asLink?: boolean
  onClick?: () => void
}

const sizes = {
  sm: 'text-[1.05rem]',
  md: 'text-[1.35rem]',
  lg: 'text-[1.9rem]',
}

export function Logo({ className, size = 'md', asLink = true, onClick }: LogoProps) {
  const content = (
    <span
      dir="ltr"
      className={cx('inline-flex items-center gap-[0.12em] font-display font-extrabold leading-none tracking-[-0.07em] text-bone', sizes[size], className)}
    >
      <span>SNEAKER</span>
      <span className="relative inline-block translate-y-[-0.02em] text-volt" style={{ transform: 'skewX(-10deg)' }}>
        X
      </span>
      <span className="mb-[0.5em] ms-[0.15em] h-[3px] w-[3px] self-start rounded-full bg-volt" aria-hidden="true" />
    </span>
  )

  if (!asLink) return content
  return (
    <Link to="/" aria-label="SNEAKERX — الصفحة الرئيسية" onClick={onClick} className="inline-flex">
      {content}
    </Link>
  )
}
