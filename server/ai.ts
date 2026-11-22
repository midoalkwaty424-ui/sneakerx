import type { Product } from './catalog.js'

export type AssistantRequest = {
  query?: string
  budget?: number
  useCase?: string
  gender?: string
  color?: string
  colorNames?: string[] | null
  size?: string
}

export type AiPick = {
  product: Product
  score: number
  reasons: string[]
}

export type AiAnswer = {
  message: string
  picks: AiPick[]
}

export function isAiEnabled() {
  return Boolean(process.env.OPENAI_API_KEY)
}

type AiPayload = {
  message?: unknown
  picks?: unknown
}

function cleanJson(content: string) {
  return content
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
}

function compactCatalog(catalog: Product[]) {
  return catalog
    .filter((product) => product.totalStock > 0)
    .map((product) => ({
      slug: product.slug,
      name: product.name,
      price: product.price,
      gender: product.gender,
      category: product.category?.slug ?? null,
      colors: product.colors.map((color) => color.name),
      rating: product.rating,
      bestSeller: product.bestSeller,
      subtitle: product.subtitle,
    }))
}

/**
 * Optional OpenAI-compatible assistant. Any failure (missing key, offline,
 * invalid JSON, hallucinated slug) returns null so the caller can use the
 * built-in rule engine. The API key never leaves the server.
 */
export async function askAiAssistant(input: AssistantRequest, catalog: Product[]): Promise<AiAnswer | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null

  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 9000)
  const bySlug = new Map(catalog.map((product) => [product.slug, product]))

  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        messages: [
          {
            role: 'system',
            content:
              'أنت مساعد تسوق في متجر سنيكرز مصري اسمه SNEAKERX. تختار من الكتالوج المرفق فقط، ولا تخترع منتجات أو أسعارًا. ترد بالعربية المصرية بجمل قصيرة وودودة. أرجع JSON فقط بالصيغة: {"message":"...","picks":[{"slug":"...","reason":"..."}]}. اختر من 1 إلى 3 منتجات متاحة، واكتب لكل منتج سببًا واحدًا قصيرًا.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              request: {
                query: input.query ?? '',
                budget: input.budget ?? null,
                useCase: input.useCase ?? null,
                gender: input.gender ?? null,
                color: input.color ?? null,
                colorNames: input.colorNames ?? [],
                size: input.size ?? null,
              },
              catalog: compactCatalog(catalog),
            }),
          },
        ],
      }),
    })

    if (!response.ok) throw new Error(`provider status ${response.status}`)
    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = body.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') return null

    const parsed = JSON.parse(cleanJson(content)) as AiPayload
    const picks: AiPick[] = []
    const seen = new Set<string>()
    const rawPicks = Array.isArray(parsed.picks) ? parsed.picks : []

    for (const raw of rawPicks) {
      if (!raw || typeof raw !== 'object') continue
      const slug = String((raw as { slug?: unknown }).slug ?? '')
      const product = bySlug.get(slug)
      if (!product || product.totalStock <= 0 || seen.has(slug)) continue
      seen.add(slug)
      const reason = String((raw as { reason?: unknown }).reason ?? '').trim().slice(0, 90)
      picks.push({
        product,
        score: 100 - picks.length,
        reasons: reason ? [reason] : ['اختيار مناسب لطلبك'],
      })
      if (picks.length === 3) break
    }

    if (picks.length === 0) return null
    const message = String(parsed.message ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 320)

    return {
      message: message || `اخترت لك ${picks.length} مناسب${picks.length === 1 ? '' : 'ات'} من الموجود دلوقتي.`,
      picks,
    }
  } catch (error) {
    const name = error instanceof Error ? error.name : 'unknown'
    console.warn(`[SNEAKERX AI] fallback to rules (${name})`)
    return null
  } finally {
    clearTimeout(timer)
  }
}
