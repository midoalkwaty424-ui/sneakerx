export function formatEGP(value: number) {
  return `${new Intl.NumberFormat('en-EG', { maximumFractionDigits: 0 }).format(value)} ج.م`
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-EG').format(value)
}

export function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function relativeDay(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (diff <= 0) return 'اليوم'
  if (diff === 1) return 'أمس'
  if (diff < 30) return `منذ ${diff} يوم`
  return formatDate(value)
}

export function normalizePhone(value: string) {
  return value
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s\-()]/g, '')
}

export function isValidPhone(value: string) {
  return /^01[0125][0-9]{8}$/.test(normalizePhone(value))
}

export function discountPercent(price: number, comparePrice: number | null) {
  if (!comparePrice || comparePrice <= price) return 0
  return Math.round(((comparePrice - price) / comparePrice) * 100)
}

export function cx(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(' ')
}
