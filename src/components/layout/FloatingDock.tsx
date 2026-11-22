import { useLocation } from 'react-router-dom'
import { supportLink } from '../../lib/whatsapp'
import { Icon } from '../ui/Icon'
import { SneakerAssistant } from '../assistant/SneakerAssistant'

/** Bottom-left dock: shopping assistant + WhatsApp support. */
export function FloatingDock() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/admin')) return null

  return (
    <div
      className="floating-dock fixed left-4 z-[86] flex flex-col-reverse items-start gap-2"
      data-floating-dock
    >
      <SneakerAssistant />
      <a
        href={supportLink()}
        target="_blank"
        rel="noreferrer"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-[#25d366]/50 bg-[#25d366] text-[#07130b] shadow-[0_14px_40px_rgba(37,211,102,.28)] transition hover:bg-[#4ee583]"
        aria-label="تواصل معنا على واتساب"
        data-whatsapp-fab
      >
        <Icon name="whatsapp" className="h-5 w-5" />
      </a>
    </div>
  )
}
