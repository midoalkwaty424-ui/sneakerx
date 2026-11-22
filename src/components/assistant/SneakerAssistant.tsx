import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { track } from '../../lib/analytics'
import { formatEGP } from '../../lib/format'
import type { AssistantResult } from '../../lib/types'
import { useAssistant } from '../../store/assistant'
import { ProductVisual } from '../commerce/ProductVisual'
import { Icon } from '../ui/Icon'
import { AssistantAvatar } from './AssistantAvatar'

const QUICK_PROMPTS = [
  'سنيكر للجري تحت 4000',
  'حاجة بيضاء للاستخدام اليومي',
  'أفضل موديل حريمي',
  'مقاس 43 متوفر؟',
]

export function SneakerAssistant() {
  const { isOpen, seed, openAssistant, closeAssistant } = useAssistant()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AssistantResult | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setQuery(seed)
    setError('')
    const timer = window.setTimeout(() => inputRef.current?.focus(), 260)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAssistant()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, seed, closeAssistant])

  const ask = async (text: string) => {
    const value = text.trim()
    if (!value || loading) return
    setLoading(true)
    setError('')
    try {
      const response = await api.assistant({ query: value })
      setResult(response)
      track('assistant_query', { query: value, picks: response.picks.length, source: response.source ?? 'rules' })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (isOpen ? closeAssistant() : openAssistant())}
        className="assistant-fab relative block h-28 w-28 shrink-0 rounded-full transition-transform duration-300 hover:scale-105 active:scale-95 sm:h-32 sm:w-32"
        aria-label="دردشة SNEAKERX"
        aria-expanded={isOpen}
        title="دردشة SNEAKERX"
        data-assistant-fab
      >
        <AssistantAvatar />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="assistant-panel fixed inset-x-3 z-[93] flex max-h-[78vh] flex-col overflow-hidden rounded-2xl border border-bone/15 bg-ink/97 shadow-[0_30px_90px_rgba(0,0,0,.7)] backdrop-blur-xl sm:inset-x-auto sm:right-5 sm:w-[25rem]"
            role="dialog"
            aria-label="مساعد التسوق"
            data-assistant-panel
          >
            <div className="flex items-center gap-3 border-b border-line/70 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-volt text-ink">
                <Icon name="sparkle" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">مساعد SNEAKERX</p>
                <p className="text-[10px] text-muted">ردود فورية من كتالوج المتجر</p>
              </div>
              <button
                type="button"
                className="icon-btn h-8 w-8"
                onClick={closeAssistant}
                aria-label="إغلاق المساعد"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!result && !loading && (
                <div className="rounded-xl border border-line/70 bg-ink2/60 p-3 text-xs leading-6 text-bone/80">
                  قولّي بتدور على إيه: استخدام، ميزانية، لون، مقاس — وأنا أرشح لك من المتجر.
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-full border border-line px-2.5 py-1 text-[10px] text-muted transition hover:border-volt/50 hover:text-bone"
                    onClick={() => {
                      setQuery(prompt)
                      void ask(prompt)
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {loading && (
                <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                  <span className="spinner" /> بندوّر على الأنسب…
                </div>
              )}

              {error && <p className="mt-3 text-xs text-flare">{error}</p>}

              {result && !loading && (
                <div className="mt-4 space-y-3" data-assistant-result>
                  <div className="rounded-xl border border-volt/25 bg-volt/10 px-3 py-2">
                    <p className="text-xs leading-6 text-bone">{result.message}</p>
                    {result.source && (
                      <p className="mt-1.5 font-mono text-[8px] tracking-wider text-volt/70">
                        {result.source === 'ai' ? 'POWERED BY AI · بيانات المتجر' : 'ENGINE · قواعد محلية'}
                      </p>
                    )}
                  </div>
                  {result.picks.map((pick) => (
                    <Link
                      key={pick.product.id}
                      to={`/product/${pick.product.slug}`}
                      onClick={closeAssistant}
                      className="group flex gap-3 rounded-xl border border-line/70 bg-ink2/50 p-2.5 transition hover:border-volt/40"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-ink3">
                        <ProductVisual
                          image={pick.product.images[0]}
                          base={pick.product.colors[0]?.hex}
                          accent={pick.product.colors[0]?.accent}
                          alt={pick.product.name}
                          className="h-full w-full"
                          fit="cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold">{pick.product.name}</p>
                        <p className="mt-0.5 text-[11px] text-volt">{formatEGP(pick.product.price)}</p>
                        {pick.reasons.length > 0 && (
                          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted">
                            {pick.reasons.join(' • ')}
                          </p>
                        )}
                      </div>
                      <Icon
                        name="arrow-left"
                        className="mt-1 h-4 w-4 shrink-0 text-muted transition group-hover:text-volt"
                      />
                    </Link>
                  ))}
                  {result.picks.length === 0 && (
                    <p className="text-xs text-muted">جرّب ميزانية أعلى أو وصف مختلف.</p>
                  )}
                </div>
              )}
            </div>

            <form
              className="flex items-center gap-2 border-t border-line/70 p-3"
              onSubmit={(event) => {
                event.preventDefault()
                void ask(query)
              }}
            >
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="field h-10 flex-1 text-xs"
                placeholder="اكتب: سنيكر أسود للجري تحت 3500"
                aria-label="سؤال للمساعد"
                maxLength={200}
              />
              <button
                type="submit"
                className="btn btn-volt h-10 px-3"
                disabled={loading || !query.trim()}
                aria-label="إرسال"
              >
                <Icon name="arrow-left" className="h-4 w-4" />
              </button>
            </form>
            <p className="border-t border-line/50 px-3 py-2 text-center text-[9px] text-muted/70">
              {result?.source === 'ai'
                ? 'مساعد AI اختياري — الترشيحات من كتالوج المتجر فقط. فشل الاتصال يرجّع للتوصيات المحلية.'
                : 'توصيات محلية من بيانات المتجر — فعّل OPENAI_API_KEY على السيرفر للحصول على مساعد AI.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
