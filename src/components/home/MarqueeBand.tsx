import { Icon } from '../ui/Icon'

const ITEMS = ['SNEAKERX', 'MOTION', 'FORM', 'DROP 001', 'OUTRUN THE ORDINARY']

export function MarqueeBand() {
  return (
    <div className="relative overflow-hidden border-y border-ink/30 bg-volt py-3 text-ink md:py-4">
      <div className="marquee-track items-center" aria-hidden="true">
        {[0, 1].map((group) => (
          <div key={group} className="flex shrink-0 items-center">
            {ITEMS.map((item) => (
              <span key={`${group}-${item}`} className="flex items-center">
                <span className="display px-6 text-[clamp(1.7rem,4.2vw,3.9rem)] leading-none">
                  {item}
                </span>
                <Icon name="sparkle" size={18} className="opacity-70" filled />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
