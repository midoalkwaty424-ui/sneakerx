import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { Icon } from '../components/ui/Icon'

const SECTIONS = [
  { id: 'shipping', label: 'الشحن والتوصيل' },
  { id: 'returns', label: 'الاستبدال والاسترجاع' },
  { id: 'sizes', label: 'دليل المقاسات' },
  { id: 'privacy', label: 'سياسة الخصوصية' },
  { id: 'terms', label: 'الشروط والأحكام' },
] as const

const SIZE_TABLE = [
  { size: '36', cm: '22.5', eu: '36', uk: '3.5', us: '4' },
  { size: '37', cm: '23.2', eu: '37', uk: '4', us: '4.5' },
  { size: '38', cm: '23.9', eu: '38', uk: '4.5', us: '5.5' },
  { size: '39', cm: '24.6', eu: '39', uk: '5.5', us: '6.5' },
  { size: '40', cm: '25.3', eu: '40', uk: '6', us: '7' },
  { size: '41', cm: '26.0', eu: '41', uk: '7', us: '8' },
  { size: '42', cm: '26.7', eu: '42', uk: '7.5', us: '8.5' },
  { size: '43', cm: '27.4', eu: '43', uk: '8.5', us: '9.5' },
  { size: '44', cm: '28.1', eu: '44', uk: '9', us: '10' },
  { size: '45', cm: '28.8', eu: '45', uk: '10', us: '11' },
]

export default function Policies() {
  usePageMeta(
    'السياسات والمساعدة — SNEAKERX',
    'الشحن والاسترجاع ودليل المقاسات والخصوصية والشروط والأحكام لمتجر SNEAKERX.',
  )
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const id = decodeURIComponent(location.hash.replace('#', ''))
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [location.hash])

  return (
    <div className="page-enter pt-[6.6rem] md:pt-[7.6rem]">
      <div className="container-x">
        <header className="border-b border-line pb-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-volt" />
            <span className="eyebrow">HELP CENTER / POLICIES</span>
          </div>
          <h1 className="display text-[clamp(2.8rem,6vw,5.8rem)]">
            THE <span className="display-italic lowercase text-volt">fine print</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
            كل اللي محتاج تعرفه عن الشحن، الاستبدال، المقاسات، والخصوصية — مكتوب بوضوح وبدون شروط
            مخفية.
          </p>
        </header>

        <div className="grid gap-10 py-10 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            <nav className="sticky top-28 space-y-1" aria-label="فهرس السياسات">
              {SECTIONS.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-muted transition hover:bg-ink2 hover:text-bone"
                >
                  <span className="font-mono text-[9px] text-muted/60 group-hover:text-volt">
                    0{index + 1}
                  </span>
                  {section.label}
                </a>
              ))}
              <div className="mt-6 rounded-xl border border-line bg-ink2 p-4">
                <p className="eyebrow mb-2">NEED HELP?</p>
                <a
                  href="mailto:care@sneakerx.store"
                  className="text-[11px] text-bone transition hover:text-volt"
                >
                  care@sneakerx.store
                </a>
                <p className="mt-2 text-[10px] leading-5 text-muted">
                  نرد من السبت للخميس، 10 صباحًا — 7 مساءً بتوقيت القاهرة.
                </p>
              </div>
            </nav>
          </aside>

          <main className="min-w-0 max-w-3xl space-y-12">
            <Section id="shipping" index="01" title="الشحن والتوصيل">
              <p>
                بنشحن لكل محافظات مصر الـ27 من مخزننا في القاهرة. مدة التوصيل المتوقعة من 2 إلى 5 أيام
                عمل، حسب المحافظة:
              </p>
              <ul>
                <li>القاهرة والجيزة والإسكندرية: 1–3 أيام عمل.</li>
                <li>الدلتا والقناة: 2–4 أيام عمل.</li>
                <li>الصعيد والمحافظات الحدودية: 3–6 أيام عمل.</li>
              </ul>
              <p>
                رسوم الشحن 75 ج.م، ومجانية للطلبات فوق 2,500 ج.م. الطلبات اللي بتتوصل قبل الساعة 2
                ظهرًا بتتجهز في نفس اليوم.
              </p>
              <p>
                بعد خروج الطلب من المخزن، هنتواصل معاك على رقم الهاتف لتأكيد العنوان. لو المندوب مش
                قدر يوصل، بيتم إعادة المحاولة مرة أخرى مجانًا.
              </p>
            </Section>

            <Section id="returns" index="02" title="الاستبدال والاسترجاع">
              <p>
                راحتك أهم من أي بيعة. تقدر تستبدل أو ترجع القطعة خلال 14 يوم من استلامها، بشرط:
              </p>
              <ul>
                <li>القطعة مش مستخدمة خارج المنزل وبحالتها الأصلية.</li>
                <li>العلبة والملحقات موجودة وسليمة.</li>
                <li>وجود رقم الطلب أو إثبات الشراء.</li>
              </ul>
              <p>
                الاستبدال في المقاس مجاني للطلب الأول. لو محتاج ترجع المبلغ، بيتم التحويل خلال 7–14
                يوم عمل من استلام القطعة وفحصها.
              </p>
              <p>
                للبدء في طلب استبدال أو استرجاع، ابعتلنا على{' '}
                <a href="mailto:care@sneakerx.store">care@sneakerx.store</a> برقم الطلب وصورة للقطعة.
              </p>
            </Section>

            <Section id="sizes" index="03" title="دليل المقاسات">
              <p>
                كل مقاسات SNEAKERX مبنية على المقاس الأوروبي القياسي (EU). قِس طول قدمك من الكعب لأطول
                صباع واختار المقاس الأقرب:
              </p>
              <div className="not-prose overflow-x-auto rounded-xl border border-line">
                <table className="admin-table min-w-[520px]">
                  <thead>
                    <tr>
                      <th>المقاس عندنا</th>
                      <th>طول القدم (سم)</th>
                      <th>EU</th>
                      <th>UK</th>
                      <th>US</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SIZE_TABLE.map((row) => (
                      <tr key={row.size}>
                        <td className="font-mono font-semibold text-volt">{row.size}</td>
                        <td className="font-mono">{row.cm}</td>
                        <td className="font-mono text-muted">{row.eu}</td>
                        <td className="font-mono text-muted">{row.uk}</td>
                        <td className="font-mono text-muted">{row.us}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                لو بين مقاسين أو تحب مساحة إضافية، اختار المقاس الأكبر. المقاسات موحدة بين الرجالي
                والحريمي.
              </p>
            </Section>

            <Section id="privacy" index="04" title="سياسة الخصوصية">
              <p>
                بنجمع بس البيانات اللازمة لإتمام طلبك: الاسم، رقم الهاتف، العنوان، والبريد الإلكتروني
                الاختياري. مش بنبيع أو نشارك بياناتك مع أي طرف غير شركة الشحن.
              </p>
              <ul>
                <li>بيانات الطلبات محفوظة في قاعدة بيانات آمنة على السيرفر.</li>
                <li>كلمات مرور لوحة التحكم مشفّرة باستخدام bcrypt.</li>
                <li>جلسة الدخول للإدارة محفوظة في كوكي httpOnly آمنة.</li>
              </ul>
              <p>
                تقدر تطلب حذف بياناتك في أي وقت عبر مراسلة{' '}
                <a href="mailto:care@sneakerx.store">care@sneakerx.store</a>.
              </p>
            </Section>

            <Section id="terms" index="05" title="الشروط والأحكام">
              <p>
                باستخدامك متجر SNEAKERX، أنت توافق على إن الأسعار المعروضة بالجنيه المصري وشاملة
                الضريبة، وإن الطلبات قابلة للتأكيد هاتفيًا قبل الشحن.
              </p>
              <ul>
                <li>الدفع المتاح حاليًا هو الدفع عند الاستلام فقط.</li>
                <li>الكميات محدودة ويمكن نفاد المقاس أثناء إتمام الطلب.</li>
                <li>الأسعار والمنتجات المعروضة هي عروض حقيقية قابلة للتغيير دون إشعار مسبق.</li>
                <li>أي استخدام غير قانوني للموقع يعرّض صاحبه للمسؤولية القانونية.</li>
              </ul>
              <p>
                بنحتفظ بحق تحديث هذه الشروط في أي وقت. آخر تحديث: يناير 2026.
              </p>
            </Section>

            <div className="rounded-2xl border border-line bg-ink2 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="eyebrow mb-2">STILL HAVE QUESTIONS?</p>
                  <h2 className="font-display text-xl font-bold">فريق SneakerX جاهز يساعدك</h2>
                </div>
                <Link to="/track" className="btn btn-volt btn-sm">
                  تتبع طلبك
                  <Icon name="arrow-left" size={14} />
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function Section({
  id,
  index,
  title,
  children,
}: {
  id: string
  index: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-5 flex items-center gap-3">
        <span className="font-mono text-[10px] text-volt">{index}</span>
        <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
      </div>
      <div className="space-y-4 text-[13px] leading-8 text-bone/65 [&_a]:text-bone [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:ps-5">
        {children}
      </div>
    </section>
  )
}
