import { useState } from 'react'
import { api } from '../../lib/api'
import { useToast } from '../../store/toast'
import { Icon } from '../ui/Icon'
import { Magnetic } from '../ui/Magnetic'

const PERKS = [
  'معرفة مبكرة قبل نزول أي DROP',
  'محتوى خاص بالتصميم والتصوير',
  'تذكير قبل نفاد المقاسات',
]

export function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const { toast } = useToast()

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('أدخل بريدًا إلكترونيًا صحيحًا')
      return
    }
    setStatus('loading')
    try {
      const result = await api.subscribe(value)
      setStatus('done')
      toast(
        result.alreadySubscribed ? 'أنت مسجّل بالفعل في القائمة' : 'تم تسجيلك في قائمة SNEAKERX',
        'success',
      )
    } catch {
      setStatus('idle')
      setError('تعذر التسجيل الآن، حاول مرة أخرى')
    }
  }

  return (
    <section className="section-pad border-t border-line/60">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-volt px-6 py-14 text-ink md:px-12 md:py-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.13]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(7,8,10,.8) 0 1px, transparent 1px 22px)',
            }}
          />
          <span
            className="display pointer-events-none absolute -bottom-[20%] left-[-4%] select-none text-[38vw] leading-none text-transparent opacity-20"
            style={{ WebkitTextStroke: '2px #07080a' }}
            aria-hidden="true"
          >
            X
          </span>

          <div className="relative grid gap-12 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <div className="mb-4 flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/60">
                  NEWSLETTER / JOIN THE X
                </span>
              </div>
              <h2 className="display text-[clamp(2.8rem,6.6vw,6.6rem)] text-ink">
                STAY IN
                <br />
                THE <span className="display-italic lowercase">loop.</span>
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-ink/65">
                رسالة واحدة كل أسبوعين. نكتب فيها عن الدروب القادم، المواد، والتصميم — بدون إزعاج.
              </p>

              {status === 'done' ? (
                <div className="mt-8 flex max-w-lg items-center gap-4 rounded-2xl border border-ink/15 bg-ink/5 p-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-volt">
                    <Icon name="check" size={19} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">أنت الآن جزء من القائمة.</p>
                    <p className="mt-0.5 text-[11px] text-ink/55">
                      وصلنا بريدك — هتبعت لك آخر الأخبار والإصدارات الجديدة.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className="mt-8 max-w-lg" noValidate>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="بريدك الإلكتروني"
                      aria-label="البريد الإلكتروني"
                      aria-invalid={Boolean(error)}
                      className="h-[3.2rem] w-full rounded-full border border-ink/20 bg-ink px-5 text-sm text-bone outline-none transition placeholder:text-bone/35 focus:border-ink focus:ring-4 focus:ring-ink/10"
                    />
                    <Magnetic strength={0.15}>
                      <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="btn h-[3.2rem] w-full shrink-0 bg-ink px-7 text-volt transition hover:bg-ink2 disabled:opacity-60 sm:w-auto"
                      >
                        {status === 'loading' ? (
                          <span className="spinner spinner-light" />
                        ) : (
                          <>
                            اشترك
                            <Icon name="arrow-left" size={15} />
                          </>
                        )}
                      </button>
                    </Magnetic>
                  </div>
                  {error && <p className="mt-3 text-xs font-medium text-ink/70">{error}</p>}
                  <p className="mt-3 text-[10px] leading-5 text-ink/45">
                    بالاشتراك أنت توافق على سياسة الخصوصية. لا نشارك بريدك مع أي طرف.
                  </p>
                </form>
              )}
            </div>

            <div className="lg:col-span-5">
              <ul className="space-y-4 border-t border-ink/15 pt-7 lg:border-0 lg:pt-0">
                {PERKS.map((perk, index) => (
                  <li
                    key={perk}
                    className="flex items-center gap-4 border-b border-ink/10 pb-4 text-sm text-ink/75"
                  >
                    <span className="font-mono text-[9px] text-ink/40">0{index + 1}</span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center gap-3 text-ink/45">
                <Icon name="mail" size={15} />
                <span className="text-[11px]">care@sneakerx.store</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
