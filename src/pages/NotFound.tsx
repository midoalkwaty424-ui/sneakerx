import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { Icon } from '../components/ui/Icon'
import { RealShoePhoto } from '../components/art/RealShoePhoto'

export default function NotFound() {
  usePageMeta('الصفحة غير موجودة — SNEAKERX', 'الصفحة المطلوبة غير موجودة في متجر SNEAKERX.', {
    noindex: true,
  })
  return (
    <div className="page-enter relative overflow-hidden pt-[6.6rem]">
      <div className="container-x">
        <div className="relative grid min-h-[70vh] place-items-center py-16 text-center">
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-[320px] w-[320px] rounded-full border border-bone/[0.05] md:h-[440px] md:w-[440px]" />
            <div className="absolute h-[220px] w-[220px] rounded-full bg-volt/[0.06] blur-3xl md:h-[300px] md:w-[300px]" />
          </div>
          <div className="relative z-10 max-w-xl">
            <p className="eyebrow eyebrow-volt mb-4">ERROR / 404 — LOST IN MOTION</p>
            <p className="display text-[clamp(6rem,20vw,14rem)] leading-none">
              4<span className="display-italic text-volt">0</span>4
            </p>
            <h1 className="mt-4 font-display text-2xl font-bold">الصفحة دي مش موجودة</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted">
              يبدو إن الرابط اتغيّر أو الصفحة اتشالت. لكن الدروب الجديد مستنيك — ارجع للمتجر وكمّل
              رحلتك.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/" className="btn btn-volt">
                الصفحة الرئيسية
                <Icon name="arrow-left" size={15} />
              </Link>
              <Link to="/shop" className="btn btn-ghost">
                تصفح المتجر
              </Link>
            </div>
            <div className="relative mx-auto mt-10 w-full max-w-xs opacity-70">
              <RealShoePhoto
                src="/images/products/x01-aero-1.jpg"
                alt="سنيكر SNEAKERX"
                blend="screen"
                className="-rotate-6"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
