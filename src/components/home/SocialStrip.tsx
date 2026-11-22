import { ProductVisual } from '../commerce/ProductVisual'
import { Icon, type IconName } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'

type Tile = {
  name: string
  handle: string
  icon: IconName
  href: string
  bg: string
  fg: string
  base: string
  accent: string
  label: string
}

const TILES: Tile[] = [
  {
    name: 'Instagram',
    handle: '@sneakerx',
    icon: 'instagram',
    href: 'https://instagram.com',
    bg: '#0b0d11',
    fg: '#f1eee5',
    base: '#D9FF43',
    accent: '#0b0d10',
    label: 'VISUAL DIARY',
  },
  {
    name: 'TikTok',
    handle: '@sneakerx',
    icon: 'tiktok',
    href: 'https://tiktok.com',
    bg: '#e9e3d3',
    fg: '#07080a',
    base: '#1B1F27',
    accent: '#D9FF43',
    label: 'MOTION CUTS',
  },
  {
    name: 'X',
    handle: '@sneakerx',
    icon: 'x-social',
    href: 'https://x.com',
    bg: '#d9ff43',
    fg: '#07080a',
    base: '#E9E3D3',
    accent: '#07080a',
    label: 'DAILY NOTES',
  },
  {
    name: 'WhatsApp',
    handle: 'SneakerX Care',
    icon: 'whatsapp',
    href: 'https://wa.me/',
    bg: '#a9c7ff',
    fg: '#07080a',
    base: '#FF5A36',
    accent: '#07080a',
    label: 'SUPPORT LINE',
  },
]

export function SocialStrip() {
  return (
    <section className="pb-20 pt-4 md:pb-28">
      <div className="container-x">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-volt" />
              <span className="eyebrow">SOCIAL / FOLLOW THE X</span>
            </div>
            <h2 className="display text-[clamp(2rem,4.4vw,4rem)]">
              OUT <span className="display-italic lowercase text-volt">there.</span>
            </h2>
          </div>
          <p className="max-w-xs text-[11px] leading-6 text-muted">
            تابعنا لمعرفة الإصدارات الجديدة والعروض قبل الجميع.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map((tile, index) => (
            <Reveal key={tile.name} delay={index * 60}>
              <a
                href={tile.href}
                target="_blank"
                rel="noreferrer noopener"
                title={`تابعنا على ${tile.name}`}
                className="group relative flex h-[250px] flex-col justify-between overflow-hidden rounded-2xl border border-line/50 p-5 transition-transform duration-500 hover:-translate-y-1"
                style={{ backgroundColor: tile.bg, color: tile.fg }}
                data-cursor-label={tile.name}
              >
                <div className="relative z-10 flex items-start justify-between">
                  <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] opacity-60">
                    <Icon name={tile.icon} size={14} />
                    FOLLOW / 0{index + 1}
                  </span>
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-current/25 opacity-70 transition-all duration-300 group-hover:rotate-45 group-hover:opacity-100">
                    <Icon name="arrow-up-right" size={14} />
                  </span>
                </div>

                <ProductVisual
                  base={tile.base}
                  accent={tile.accent}
                  alt={`${tile.name} — SneakerX`}
                  className="pointer-events-none absolute -right-[18%] top-[18%] w-[95%] rotate-[-14deg] transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-rotate-6 group-hover:scale-110"
                />

                <div className="relative z-10 flex items-end justify-between">
                  <div>
                    <p className="font-display text-2xl font-bold tracking-tight">{tile.name}</p>
                    <p className="mt-0.5 font-mono text-[9px] opacity-60">{tile.handle}</p>
                  </div>
                  <span className="font-mono text-[8px] uppercase tracking-[0.16em] opacity-50">
                    {tile.label}
                  </span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
