import { Link } from 'react-router-dom'
import { RealShoePhoto } from '../art/RealShoePhoto'
import { Icon } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'

export function CollectionsSplit() {
  return (
    <section className="container-x relative overflow-hidden py-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <Link
            to="/shop?gender=men"
            className="group relative flex min-h-[540px] flex-col justify-between overflow-hidden rounded-[1.4rem] p-7 md:min-h-[640px] md:p-10"
            style={{
              background:
                'radial-gradient(circle at 70% 20%, rgba(217,255,67,.12), transparent 45%), linear-gradient(150deg,#11151b 0%,#0a0c10 60%,#141920 100%)',
            }}
            data-cursor-label="رجالي"
          >
            <div className="absolute inset-0 border border-line/80 rounded-[1.4rem]" />
            <div className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-700 group-hover:opacity-40">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(241,238,229,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(241,238,229,.08) 1px, transparent 1px)',
                  backgroundSize: '64px 64px',
                  maskImage: 'radial-gradient(circle at 60% 50%, black, transparent 70%)',
                }}
              />
            </div>

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <span className="eyebrow">COLLECTION / 01</span>
                <h3 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
                  FOR HIM
                </h3>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-full border border-bone/20 text-bone transition-all duration-300 group-hover:rotate-45 group-hover:border-volt group-hover:bg-volt group-hover:text-ink">
                <Icon name="arrow-up-right" size={18} />
              </span>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-[16%] top-[16%]">
              <div className="absolute inset-0 grid place-items-center">
                <div className="h-[72%] w-[72%] rounded-full border border-bone/[0.06]" />
                <div className="pulse-glow absolute h-[48%] w-[48%] rounded-full bg-volt/[0.08] blur-2xl" />
              </div>
              <RealShoePhoto
                src="/images/products/x01-aero-1.jpg"
                alt="سنيكر رجالي حقيقي من مجموعة SNEAKERX"
                blend="screen"
                className="absolute inset-x-0 bottom-0 mx-auto h-full w-[92%] max-w-[620px] transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-4 group-hover:-rotate-3 group-hover:scale-[1.04]"
              />
            </div>

            <div className="relative z-10 flex items-end justify-between gap-4">
              <div>
                <p className="max-w-xs text-sm leading-7 text-bone/60">
                  خطوط حادة، مواد تقنية، وطاقة المدينة. مجموعة صُممت للحركة اليومية بلا تنازلات.
                </p>
                <span className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-volt">
                  Shop men
                  <Icon name="arrow-left" size={12} />
                </span>
              </div>
              <span className="hidden font-mono text-[10px] text-muted sm:block">08 STYLES</span>
            </div>
          </Link>
        </Reveal>

        <Reveal delay={100}>
          <Link
            to="/shop?gender=women"
            className="group relative flex min-h-[540px] flex-col justify-between overflow-hidden rounded-[1.4rem] bg-bone p-7 text-ink md:min-h-[640px] md:p-10"
            data-cursor-label="حريمي"
          >
            <div className="absolute inset-0 rounded-[1.4rem] border border-ink/10" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.55]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(7,8,10,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(7,8,10,.07) 1px, transparent 1px)',
                  backgroundSize: '64px 64px',
                  maskImage: 'radial-gradient(circle at 40% 50%, black, transparent 72%)',
                }}
              />
            </div>

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
                  COLLECTION / 02
                </span>
                <h3 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
                  FOR HER
                </h3>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-full border border-ink/20 text-ink transition-all duration-300 group-hover:rotate-45 group-hover:bg-ink group-hover:text-volt">
                <Icon name="arrow-up-right" size={18} />
              </span>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-[16%] top-[16%]">
              <div className="absolute inset-0 grid place-items-center">
                <div className="h-[72%] w-[72%] rounded-full border border-ink/10" />
                <div className="absolute h-[52%] w-[52%] rounded-full bg-ice/30 blur-2xl" />
              </div>
              <RealShoePhoto
                src="/images/products/halo-knit-1.jpg"
                alt="سنيكر نسائي حقيقي من مجموعة SNEAKERX"
                blend="multiply"
                className="absolute inset-x-0 bottom-0 mx-auto h-full w-[92%] max-w-[620px] transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-4 group-hover:rotate-2 group-hover:scale-[1.04]"
              />
            </div>

            <div className="relative z-10 flex items-end justify-between gap-4">
              <div>
                <p className="max-w-xs text-sm leading-7 text-ink/60">
                  نعومة في الشكل، قوة في التفاصيل. مجموعات نسائية بتوازن دقيق بين الأناقة والراحة.
                </p>
                <span className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink">
                  Shop women
                  <Icon name="arrow-left" size={12} />
                </span>
              </div>
              <span className="hidden font-mono text-[10px] text-ink/40 sm:block">06 STYLES</span>
            </div>
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
