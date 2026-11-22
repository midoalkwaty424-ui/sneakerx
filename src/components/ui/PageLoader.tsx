import { Logo } from './Logo'

export function PageLoader({ label = 'LOADING' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <Logo asLink={false} size="lg" />
      <div className="h-px w-40 overflow-hidden bg-line">
        <div className="h-full w-1/2 animate-[marquee_1.1s_linear_infinite] bg-volt" />
      </div>
      <span className="eyebrow">{label}</span>
    </div>
  )
}

export function PageError({
  title = 'تعذر تحميل المحتوى',
  message = 'حدث خطأ غير متوقع. حاول تحديث الصفحة.',
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="eyebrow eyebrow-volt">SOMETHING WENT WRONG</span>
      <h1 className="display text-4xl md:text-6xl">{title}</h1>
      <p className="max-w-md text-sm text-muted">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-ghost mt-2">
          إعادة المحاولة
        </button>
      )}
    </div>
  )
}
