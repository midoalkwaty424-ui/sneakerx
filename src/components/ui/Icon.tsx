import type { SVGProps } from 'react'

export type IconName =
  | 'search'
  | 'bag'
  | 'menu'
  | 'close'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'check'
  | 'filter'
  | 'chevron-down'
  | 'chevron-left'
  | 'instagram'
  | 'tiktok'
  | 'x-social'
  | 'whatsapp'
  | 'truck'
  | 'shield'
  | 'sparkle'
  | 'play'
  | 'upload'
  | 'edit'
  | 'external'
  | 'grid'
  | 'box'
  | 'orders'
  | 'users'
  | 'tag'
  | 'layers'
  | 'logout'
  | 'star'
  | 'refresh'
  | 'eye'
  | 'mail'
  | 'bell'
  | 'map-pin'
  | 'phone'
  | 'credit-card'
  | 'clock'
  | 'cancel'
  | 'dribbble'
  | 'heart'
  | 'compare'
  | 'zoom-in'
  | 'zoom-out'
  | 'fullscreen'
  | 'motion'
  | 'wallet'
  | 'chart'
  | 'receipt'
  | 'coins'
  | 'scale'
  | 'trend-up'
  | 'trend-down'

const paths: Record<IconName, React.ReactNode> = {
  search: <path d="M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-4.35-4.35" />,
  bag: (
    <>
      <path d="M6 7h12l1 14H5L6 7z" />
      <path d="M9 7V5.8A3 3 0 0112 3a3 3 0 013 2.8V7" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M5 5l14 14M19 5L5 19" />,
  'arrow-left': <path d="M19 12H5m6-6l-6 6 6 6" />,
  'arrow-right': <path d="M5 12h14m-6-6l6 6-6 6" />,
  'arrow-up-right': <path d="M7 17L17 7M8 7h9v9" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  check: <path d="M4 12.5l5 5L20 6" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'chevron-left': <path d="M15 5l-7 7 7 7" />,
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </>
  ),
  tiktok: <path d="M14 3v11.5a4.5 4.5 0 11-4.5-4.5M14 3c.4 3 2.4 5 5 5.2" />,
  'x-social': <path d="M4 4l16 16M20 4L4 20" />,
  whatsapp: (
    <>
      <path d="M21 11.5a8.5 8.5 0 01-12.3 7.6L4 20.5l1.4-4.6A8.5 8.5 0 1121 11.5z" />
      <path d="M8.5 8.7c0 4 2.8 6.8 6.8 6.8l.8-1.9-2.2-1-1.1 1c-1.2-.5-2.2-1.5-2.7-2.7l1-1.1-1-2.2-1.6.1z" />
    </>
  ),
  truck: (
    <>
      <path d="M2 6h11v11H2zM13 10h5l4 4v3h-9" />
      <circle cx="6.5" cy="18.5" r="1.8" />
      <circle cx="17.5" cy="18.5" r="1.8" />
    </>
  ),
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />,
  sparkle: <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />,
  play: <path d="M8 5l11 7-11 7V5z" />,
  upload: <path d="M12 16V4m-5 5l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />,
  edit: <path d="M4 20h4L20 8l-4-4L4 16v4zM14 6l4 4" />,
  external: <path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" />,
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  box: <path d="M12 3l9 5v8l-9 5-9-5V8l9-5zM3 8l9 5 9-5M12 13v8" />,
  orders: <path d="M6 3h9l4 4v14H6V3zM15 3v4h4M9 12h6M9 16h6M9 8h2" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 5.2a3.2 3.2 0 010 5.6M18 14.7c2 .6 3 2.2 3 4.3" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V4h8l9 9-8 8-9-9z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </>
  ),
  layers: <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />,
  logout: <path d="M14 4H5v16h9M18 8l4 4-4 4M10 12h12" />,
  star: <path d="M12 3l2.8 6.1 6.7.8-5 4.6 1.4 6.5L12 17.6 6.1 21l1.4-6.5-5-4.6 6.7-.8L12 3z" />,
  refresh: <path d="M20 11a8 8 0 10-2 6.5M20 4v7h-7" />,
  eye: (
    <>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.7 21a2 2 0 01-3.4 0" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  phone: <path d="M6 3h3l2 5-2.5 1.5a12 12 0 006 6L16 13l5 2v3a2 2 0 01-2.2 2A17 17 0 014 5.2 2 2 0 016 3z" />,
  'credit-card': (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19M6 15h4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  cancel: <path d="M12 3a9 9 0 100 18 9 9 0 000-18zM6 6l12 12" />,
  dribbble: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5 8c5 1 10 4 12 9M8 4c3 4 5 9 5 16M20 10c-5-1-10 0-14 4" />
    </>
  ),
  heart: <path d="M12 20.5s-7.5-4.6-7.5-9.6A4.4 4.4 0 0112 8.2a4.4 4.4 0 017.5 2.7c0 5-7.5 9.6-7.5 9.6z" />,
  compare: (
    <>
      <path d="M4 5h6v14H4zM14 5h6v14h-6z" />
      <path d="M10 12h4" />
    </>
  ),
  'zoom-in': (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4.2-4.2M11 8.5v5M8.5 11h5" />
    </>
  ),
  'zoom-out': (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4.2-4.2M8.5 11h5" />
    </>
  ),
  fullscreen: <path d="M9 4H4v5M15 4h5v5M20 15v5h-5M4 15v5h5" />,
  motion: (
    <>
      <path d="M3 8h11M3 12h15M3 16h9" />
      <path d="M17 5l4 7-4 7" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7a2 2 0 012-2h13a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      <path d="M3 9h15a2 2 0 010 4h-4a2 2 0 000 4" />
      <circle cx="16" cy="11" r="0.9" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="9" cy="7" rx="6" ry="3" />
      <path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" />
      <path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.2-1.4-2.2-3.5-2.7" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v16M5 20h14M4 8h16l-3 6H7L4 8z" />
      <circle cx="12" cy="5" r="1.4" />
    </>
  ),
  'trend-up': <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  'trend-down': <path d="M3 7l6 6 4-4 8 8M15 17h6v-6" />,
}

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
  size?: number
  filled?: boolean
}

export function Icon({ name, size = 18, filled = false, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}
