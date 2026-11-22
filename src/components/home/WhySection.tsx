import { Icon, type IconName } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'

const FEATURES: { title: string; copy: string; icon: IconName; meta: string }[] = [
  {
    title: 'شحن لكل مصر',
    copy: 'من القاهرة للإسكندرية وأسوان. تغليف مزدوج يحمي الحذاء، وتتبع واضح حتى باب البيت.',
    icon: 'truck',
    meta: '27 GOVERNORATES',
  },
  {
    title: 'دفع عند الاستلام',
    copy: 'افتح، جرّب، وبعدين ادفع. لا تحتاج بطاقة بنكية ولا محفظة إلكترونية لتبدأ.',
    icon: 'shield',
    meta: 'CASH ON DELIVERY',
  },
  {
    title: 'استرجاع 14 يوم',
    copy: 'المقاس مش مريح؟ استبدله أو استرجع المبلغ خلال 14 يوم بشرط عدم الاستخدام خارج البيت.',
    icon: 'refresh',
    meta: '14-DAY RETURNS',
  },
  {
    title: 'إصدارات محدودة',
    copy: 'كل لون يُنتج بكمية محدودة. لا إعادة إنتاج، لا تكرار. القطعة التي ترتديها لن تراها في كل مكان.',
    icon: 'sparkle',
    meta: 'LIMITED RUNS',
  },
]

export function WhySection() {
  return (
    <section className="section-pad border-t border-line/60 bg-[linear-gradient(180deg,rgba(241,238,229,.018),transparent)]">
      <div className="container-x">
        <div className="mb-12 grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-volt" />
              <span className="eyebrow">WHY SNEAKERX — THE DIFFERENCE</span>
            </div>
            <h2 className="display text-[clamp(2.8rem,6.4vw,6.4rem)]">
              BUILT <span className="display-italic lowercase text-volt">different.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pb-2">
            <p className="max-w-md text-sm leading-7 text-muted">
              التجربة مش بس في شكل الحذاء. من لحظة الاختيار لحد أول مشوار، كل نقطة تم تصميمها عشان
              تكون أسهل، أسرع، وأكثر وضوحًا.
            </p>
          </div>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 80}>
              <article className="group relative flex h-full min-h-[290px] flex-col justify-between bg-ink2 p-6 transition-colors duration-500 hover:bg-ink3">
                <div className="flex items-start justify-between">
                  <span className="font-display text-3xl font-bold text-bone/15 transition-colors duration-500 group-hover:text-volt/30">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-line text-bone/60 transition-all duration-500 group-hover:border-volt/40 group-hover:text-volt">
                    <Icon name={feature.icon} size={19} />
                  </span>
                </div>
                <div className="mt-10">
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2.5 text-[12px] leading-6 text-muted">{feature.copy}</p>
                  <span className="mt-5 block font-mono text-[8px] uppercase tracking-[0.18em] text-bone/25 transition-colors group-hover:text-volt/60">
                    {feature.meta}
                  </span>
                </div>
                <span className="absolute bottom-0 inset-x-0 h-px scale-x-0 bg-volt transition-transform duration-500 group-hover:scale-x-100" />
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
