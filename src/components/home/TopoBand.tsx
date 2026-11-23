import { Link } from 'react-router-dom'
import TopoBackground from '../kokonutui/topo-background'
import { Icon } from '../ui/Icon'
import { useCompactDevice } from '../../hooks/useCompactDevice'

/**
 * Branded usage of Kokonut UI's <TopoBackground />.
 *
 * The component paints a transparent canvas, so `bg-transparent` lets the
 * site's ink background show through. `text-bone` sets the contour colour
 * (the canvas reads its own computed `color`), and `min-h-[520px]`
 * overrides the component's 560px default to fit this band.
 */
export function TopoBand() {
  const compact = useCompactDevice()

  return (
    <TopoBackground
      className="min-h-[360px] border-t border-line/60 bg-transparent text-bone md:min-h-[520px]"
      interval={compact ? 0.12 : 0.06}
      speed={compact ? 0 : 0.55}
      seed={26}
      labels={false}
      interactive={!compact}
    >
      <div className="container-x relative z-10 flex flex-col items-center py-14 text-center md:py-28">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-volt" />
          <span className="eyebrow">EVERY STEP DRAWS A LINE — CAIRO / 30.04° N</span>
        </div>

        <h2 className="display max-w-4xl text-[clamp(2.6rem,7vw,6.5rem)] leading-[0.86]">
          EVERY STEP
          <br />
          <span className="display-italic lowercase text-volt">draws a line.</span>
        </h2>

        <p className="mt-6 max-w-lg text-sm leading-7 text-muted">
          الطريق مش خط مستقيم. حرّك المؤشر فوق الخريطة، واترك كل خطوة ترسم خطها.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/shop" className="btn btn-volt btn-sm">
            تسوق الدروب
            <Icon name="arrow-left" size={14} />
          </Link>
          <Link to="/policies" className="btn btn-ghost btn-sm">
            سياسات الشحن والاسترجاع
          </Link>
        </div>

        <span className="mt-10 font-mono text-[8px] uppercase tracking-[0.24em] text-muted/60">
          MOVE THE CURSOR — CLICK TO DROP A RIPPLE
        </span>
      </div>
    </TopoBackground>
  )
}
