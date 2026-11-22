import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { supportLink } from '../../lib/whatsapp'

const SOCIALS = [
  { name: 'instagram' as const, href: 'https://instagram.com', label: 'Instagram' },
  { name: 'tiktok' as const, href: 'https://tiktok.com', label: 'TikTok' },
  { name: 'x-social' as const, href: 'https://x.com', label: 'X' },
  { name: 'whatsapp' as const, href: supportLink(), label: 'WhatsApp' },
]

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-line bg-ink">
      <div className="container-x relative z-10 pb-10 pt-16 md:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo size="lg" />
            <p className="mt-5 text-sm leading-7 text-muted">
              تجربة سنيكرز مختلفة. تصميمات محدودة، حركة لا تتوقف، وتفاصيل تُصنع لتُرى. صُنع في القاهرة
              للعالم.
            </p>
            <div className="mt-6 flex gap-2">
              {SOCIALS.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="icon-btn !h-9 !w-9"
                  aria-label={`تابعنا على ${social.label}`}
                  title={`تابعنا على ${social.label}`}
                >
                  <Icon name={social.name} size={15} />
                </a>
              ))}
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-[10px] text-muted">
              <Icon name="credit-card" size={13} />
              الدفع عند الاستلام فقط حاليًا
            </div>
          </div>

          <FooterColumn
            title="تسوق"
            links={[
              { label: 'وصل حديثًا', to: '/shop?collection=new' },
              { label: 'الأكثر مبيعًا', to: '/shop?collection=best' },
              { label: 'رجالي', to: '/shop?gender=men' },
              { label: 'حريمي', to: '/shop?gender=women' },
              { label: 'كل الأحذية', to: '/shop' },
            ]}
          />

          <FooterColumn
            title="المساعدة"
            links={[
              { label: 'تتبع طلبك', to: '/track' },
              { label: 'الشحن والتوصيل', to: '/policies#shipping' },
              { label: 'الاستبدال والاسترجاع', to: '/policies#returns' },
              { label: 'دليل المقاسات', to: '/policies#sizes' },
              { label: 'تواصل معنا', to: 'mailto:care@sneakerx.store' },
            ]}
          />

          <FooterColumn
            title="SneakerX"
            links={[
              { label: 'قصة البراند', to: '/#story' },
              { label: 'برنامج المكافآت', to: '/loyalty' },
              { label: 'السياسات', to: '/policies' },
              { label: 'الخصوصية', to: '/policies#privacy' },
              { label: 'الشروط والأحكام', to: '/policies#terms' },
              { label: 'لوحة التحكم', to: '/admin' },
            ]}
          />
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-6 text-[11px] text-muted md:flex-row md:items-center md:justify-between">
          <p>© 2026 SNEAKERX. جميع الحقوق محفوظة.</p>
          <p className="max-w-xl text-muted/70">
            دفع عند الاستلام · توصيل لكل المحافظات · تحديثات طلبك على واتساب.
          </p>
          <p className="font-mono text-[10px] tracking-wider text-muted/60">CAIRO — EGYPT</p>
        </div>
      </div>

      <div
        className="display pointer-events-none select-none px-2 text-center text-[17vw] leading-[0.7] text-transparent opacity-[0.05]"
        style={{ WebkitTextStroke: '1px #f1eee5' }}
        aria-hidden="true"
      >
        SNEAKERX
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: { label: string; to: string }[]
}) {
  return (
    <div>
      <h3 className="eyebrow mb-5">{title}</h3>
      <ul className="space-y-3">
        {links.map((link) =>
          link.to.startsWith('mailto:') ? (
            <li key={link.label}>
              <a
                href={link.to}
                className="text-sm text-bone/65 transition hover:text-volt"
              >
                {link.label}
              </a>
            </li>
          ) : (
            <li key={link.label}>
              <Link
                to={link.to}
                className="text-sm text-bone/65 transition hover:text-volt"
              >
                {link.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}
