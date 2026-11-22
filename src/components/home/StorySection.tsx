import { Link } from 'react-router-dom'
import { RealShoePhoto } from '../art/RealShoePhoto'
import { Icon } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'

export function StorySection() {
  return (
    <section id="story" className="relative overflow-hidden border-t border-line/60 py-24 md:py-32">
      <span
        className="display pointer-events-none absolute -top-10 left-0 select-none text-[28vw] leading-none text-transparent opacity-[0.04]"
        style={{ WebkitTextStroke: '1px #f1eee5' }}
        aria-hidden="true"
      >
        01
      </span>
      <div className="container-x relative grid gap-16 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-6 lg:sticky lg:top-28 lg:self-start">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-volt" />
            <span className="eyebrow">OUR STORY / CAIRO — EST. 2024</span>
          </div>
          <h2 className="display text-[clamp(3rem,6vw,6rem)]">
            NOT A SHOE.
            <br />
            <span className="display-italic lowercase text-volt">a statement.</span>
          </h2>
          <div className="mt-8 max-w-lg space-y-5 text-sm leading-8 text-bone/65">
            <p>
              بدأت SNEAKERX من سؤال بسيط: لماذا تبدو معظم أحذية الشارع متشابهة؟ في القاهرة، حيث
              الإيقاع سريع والتفاصيل تصنع الفرق، قررنا أن نصنع شيئًا آخر — سنيكرز تُشبه من يرتديها،
              لا العكس.
            </p>
            <p>
              نتعامل مع كل إصدار كقطعة أرشيفية: كمية محدودة، خامات مختارة، وتجربة بصرية كاملة من أول
              نظرة حتى فتح الصندوق. لا نسبق الموسم، نحن نصنعه.
            </p>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-line pt-7">
            {[
              { value: '12', label: 'إصدار محدود' },
              { value: '4.8/5', label: 'تقييم العملاء' },
              { value: '27', label: 'محافظة نشحن لها' },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                  {stat.value}
                </dt>
                <dd className="mt-1.5 text-[10px] text-muted">{stat.label}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/shop" className="btn btn-volt group">
              اكتشف الإصدارات
              <Icon
                name="arrow-left"
                size={15}
                className="transition-transform group-hover:-translate-x-1"
              />
            </Link>
            <Link to="/policies#returns" className="btn btn-ghost">
              فلسفة الاسترجاع
            </Link>
          </div>
        </div>

        <div className="relative lg:col-span-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-[1.5rem] border border-line bg-[radial-gradient(circle_at_50%_35%,#191e26_0%,#0a0c10_72%)] p-6 pt-12 md:p-10 md:pt-16">
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="h-[72%] w-[72%] rounded-full border border-bone/[0.06]" />
                <div className="absolute h-[88%] w-[88%] rounded-full border border-bone/[0.035]" />
                <div className="absolute h-[45%] w-[45%] rounded-full bg-volt/[0.07] blur-3xl" />
              </div>
              <div className="relative z-10 flex items-center justify-between">
                <span className="rounded-full border border-line bg-ink/60 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                  ARCHIVE / 001
                </span>
                <span className="font-mono text-[9px] text-muted">30.0444° N</span>
              </div>
              <div className="relative z-10 mt-10 md:mt-14">
                <RealShoePhoto
                  src="/images/products/x01-aero-1.jpg"
                  alt="سنيكر SNEAKERX من الأرشيف"
                  blend="screen"
                  className="-rotate-3 drop-shadow-[0_40px_60px_rgba(0,0,0,.55)] transition-transform duration-700 hover:rotate-0"
                />
              </div>
              <div className="relative z-10 mt-8 flex items-end justify-between border-t border-line/70 pt-5">
                <div>
                  <p className="font-display text-lg font-bold">X-01 AERO</p>
                  <p className="mt-1 text-[11px] text-muted">BONE / VOLT — 300 PAIRS</p>
                </div>
                <span className="font-mono text-[10px] text-volt">SOLD IN 48H</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <figure className="relative z-20 mx-4 -mt-8 rounded-2xl border border-line bg-ink2/95 p-6 backdrop-blur-xl md:mx-8 md:p-7">
              <Icon name="sparkle" size={20} className="mb-4 text-volt" filled />
              <blockquote className="font-serif text-xl italic leading-relaxed text-bone/90 md:text-2xl">
                «التفاصيل هي الفرق بين شيء جيد وشيء لا يُنسى.»
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                <span className="h-px w-8 bg-volt" />
                SNEAKERX DESIGN LAB
              </figcaption>
            </figure>
          </Reveal>

          <div className="mt-6 flex items-center justify-between px-2 text-[10px] text-muted">
            <span className="eyebrow">FORM / FUNCTION / FEELING</span>
            <span className="font-mono">SCENE 04</span>
          </div>
        </div>
      </div>
    </section>
  )
}
