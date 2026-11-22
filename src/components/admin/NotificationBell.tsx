import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import type { AdminNotification } from '../../lib/types'
import { useToast } from '../../store/toast'
import { Icon } from '../ui/Icon'

/** Live alert centre for new orders. Polls lightly so the owner sees orders without refreshing. */
export function NotificationBell() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const rootRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<AdminNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [whatsappConfigured, setWhatsappConfigured] = useState(false)
  const [open, setOpen] = useState(false)
  const [sendingId, setSendingId] = useState<number | null>(null)

  const load = useCallback(() => {
    void api.admin
      .notifications(40)
      .then((result) => {
        setItems(result.notifications)
        setUnread(result.unread)
        setWhatsappConfigured(result.whatsappConfigured)
      })
      .catch(() => {
        /* polling must stay silent — never interrupt the admin */
      })
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 15000)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const markRead = (item: AdminNotification) => {
    if (!item.read) {
      setUnread((value) => Math.max(value - 1, 0))
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, read: true } : row)),
      )
      void api.admin.markNotificationRead(item.id).catch(() => undefined)
    }
    setOpen(false)
    if (item.orderNumber) {
      navigate(`/admin/orders?search=${encodeURIComponent(item.orderNumber)}`)
    } else if (item.orderId) {
      navigate('/admin/orders')
    }
  }

  const markAll = () => {
    const previous = items
    setItems((current) => current.map((row) => ({ ...row, read: true })))
    setUnread(0)
    void api.admin.markAllNotificationsRead().catch(() => {
      setItems(previous)
      load()
    })
  }

  const resend = async (item: AdminNotification) => {
    setSendingId(item.id)
    try {
      const result = await api.admin.resendOrderWhatsApp(item.id)
      if (result.ok) toast('تم إرسال رسائل واتساب بنجاح')
      else toast(result.error || 'تعذر الإرسال — استخدم رابط واتساب', 'error')
      load()
    } catch (error) {
      toast(errorMessage(error), 'error')
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value)
          if (!open) load()
        }}
        className="icon-btn !h-9 !w-9 relative"
        aria-label={`التنبيهات${unread ? ` (${unread} غير مقروء)` : ''}`}
        title="التنبيهات"
        aria-expanded={open}
      >
        <Icon name="bell" size={16} />
        {unread > 0 && (
          <span className="absolute -left-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-flare px-1 font-mono text-[9px] font-bold text-ink">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-line bg-ink2 shadow-[0_24px_60px_rgba(0,0,0,.6)]"
          role="dialog"
          aria-label="تنبيهات الطلبات"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="font-display text-sm font-bold">التنبيهات</p>
              <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
                {unread > 0 ? `${unread} تحتاج مراجعة` : 'كل شيء مقروء'}
              </p>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-[10px] text-volt underline underline-offset-4"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="grid place-items-center gap-2 px-4 py-10 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-full border border-line bg-ink3 text-muted">
                  <Icon name="bell" size={17} />
                </span>
                <p className="text-[11px] text-muted">
                  لا توجد تنبيهات بعد. الطلبات الجديدة ستظهر هنا فورًا.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={`border-b border-line/60 px-4 py-3 last:border-0 ${item.read ? '' : 'bg-volt/[0.04]'}`}
                >
                  <button
                    type="button"
                    onClick={() => markRead(item)}
                    className="flex w-full items-start gap-3 text-start"
                  >
                    <span
                      className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
                        item.read
                          ? 'border-line bg-ink3 text-muted'
                          : 'border-volt/30 bg-volt/10 text-volt'
                      }`}
                    >
                      <Icon name="orders" size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[11px] font-semibold">{item.title}</span>
                        {!item.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-volt" />}
                      </span>
                      <span className="mt-1 block text-[10px] leading-5 text-muted">{item.body}</span>
                      <span className="mt-1 block font-mono text-[8px] text-muted/70">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </span>
                  </button>

                  <div className="mt-2 flex flex-wrap items-center gap-2 ps-11">
                    {item.whatsappSent ? (
                      <span className="inline-flex items-center gap-1 text-[9px] text-volt">
                        <Icon name="check" size={11} />
                        أُرسل واتساب تلقائيًا
                      </span>
                    ) : (
                      <>
                        <span className="text-[9px] text-amber-200/80">
                          {item.whatsappError || 'لم يُرسل واتساب تلقائيًا'}
                        </span>
                        {whatsappConfigured && (
                          <button
                            type="button"
                            onClick={() => void resend(item)}
                            disabled={sendingId === item.id}
                            className="inline-flex items-center gap-1 rounded-full border border-volt/30 bg-volt/[0.07] px-2 py-1 text-[9px] text-volt transition hover:border-volt/60 disabled:opacity-50"
                          >
                            {sendingId === item.id ? (
                              <span className="spinner spinner-light !h-3 !w-3" />
                            ) : (
                              <Icon name="refresh" size={10} />
                            )}
                            إرسال تلقائي
                          </button>
                        )}
                      </>
                    )}
                    {item.whatsappUrl && (
                      <a
                        href={item.whatsappUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-1 text-[9px] text-muted transition hover:border-[#25D366]/50 hover:text-[#25D366]"
                      >
                        <Icon name="whatsapp" size={10} />
                        إرسال يدوي
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
