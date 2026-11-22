import { db } from './db.js'

export const FREE_SHIPPING_THRESHOLD = 2500
export const SHIPPING_FEE = 75
export const LOW_STOCK_THRESHOLD = 5

export const GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'الشرقية',
  'الدقهلية',
  'الغربية',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'شمال سيناء',
  'جنوب سيناء',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'الوادي الجديد',
  'مطروح',
]

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]
export type Gender = 'men' | 'women' | 'unisex'

export type Variant = {
  id: number
  size: string
  color: string
  sku: string
  stock: number
}

export type Product = {
  id: number
  slug: string
  name: string
  subtitle: string
  description: string
  price: number
  comparePrice: number | null
  gender: Gender
  category: { id: number; name: string; slug: string } | null
  featured: boolean
  isNew: boolean
  bestSeller: boolean
  rating: number
  reviewCount: number
  colors: {
    name: string
    hex: string
    accent: string
    image?: string | null
    images?: string[]
  }[]
  images: string[]
  sizes: { size: string; stock: number }[]
  variants: Variant[]
  totalStock: number
  createdAt: string
}

type Row = Record<string, unknown>

function safeJson<T>(value: unknown, fallback: T): T {
  try {
    if (typeof value !== 'string') return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function mapProduct(row: Row, variants: Variant[]): Product {
  const sizes = [...new Set(variants.map((v) => v.size))].sort((a, b) => Number(a) - Number(b))
  return {
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    subtitle: String(row.subtitle ?? ''),
    description: String(row.description ?? ''),
    price: Number(row.price),
    comparePrice: row.compare_price == null ? null : Number(row.compare_price),
    gender: row.gender as Gender,
    category:
      row.category_id == null
        ? null
        : {
            id: Number(row.category_id),
            name: String(row.category_name ?? ''),
            slug: String(row.category_slug ?? ''),
          },
    featured: Boolean(row.featured),
    isNew: Boolean(row.is_new),
    bestSeller: Boolean(row.best_seller),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    colors: safeJson(row.colors, []),
    images: safeJson(row.images, []),
    sizes: sizes.map((size) => ({
      size,
      stock: variants.filter((v) => v.size === size).reduce((sum, v) => sum + v.stock, 0),
    })),
    variants,
    totalStock: variants.reduce((sum, v) => sum + v.stock, 0),
    createdAt: String(row.created_at),
  }
}

function variantsForProducts(ids: number[]): Map<number, Variant[]> {
  const map = new Map<number, Variant[]>()
  if (ids.length === 0) return map
  const placeholders = ids.map(() => '?').join(',')
  const rows = db
    .prepare(
      `SELECT id, product_id, size, color, sku, stock FROM variants
       WHERE product_id IN (${placeholders}) ORDER BY CAST(size AS INTEGER), color`,
    )
    .all(...ids) as Row[]
  for (const row of rows) {
    const pid = Number(row.product_id)
    const list = map.get(pid) ?? []
    list.push({
      id: Number(row.id),
      size: String(row.size),
      color: String(row.color),
      sku: String(row.sku),
      stock: Number(row.stock),
    })
    map.set(pid, list)
  }
  return map
}

const BASE_SELECT = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug
  FROM products p LEFT JOIN categories c ON c.id = p.category_id
`

export type ListOptions = {
  search?: string
  gender?: string
  category?: string
  collection?: string
  size?: string
  minPrice?: number
  maxPrice?: number
  color?: string
  onSale?: boolean
  minRating?: number
  sort?: string
  page?: number
  limit?: number
  inStock?: boolean
}

const SORTS: Record<string, string> = {
  newest: 'p.created_at DESC',
  'price-asc': 'p.price ASC',
  'price-desc': 'p.price DESC',
  best: 'p.best_seller DESC, p.rating DESC, p.review_count DESC',
  featured: 'p.featured DESC, p.created_at DESC',
  rating: 'p.rating DESC, p.review_count DESC',
}

export function listProducts(opts: ListOptions) {
  const where: string[] = []
  const params: (string | number)[] = []

  if (opts.search) {
    where.push('(p.name LIKE ? OR p.subtitle LIKE ? OR p.description LIKE ?)')
    const like = `%${opts.search}%`
    params.push(like, like, like)
  }
  if (opts.gender === 'men' || opts.gender === 'women') {
    where.push("p.gender IN (?, 'unisex')")
    params.push(opts.gender)
  } else if (opts.gender === 'unisex') {
    where.push("p.gender = 'unisex'")
  }
  if (opts.category) {
    where.push('c.slug = ?')
    params.push(opts.category)
  }
  if (opts.collection === 'new') where.push('p.is_new = 1')
  if (opts.collection === 'featured') where.push('p.featured = 1')
  if (opts.collection === 'best') where.push('p.best_seller = 1')
  if (opts.size) {
    where.push(
      'EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.size = ? AND v.stock > 0)',
    )
    params.push(opts.size)
  }
  if (Number.isFinite(opts.minPrice)) {
    where.push('p.price >= ?')
    params.push(Number(opts.minPrice))
  }
  if (Number.isFinite(opts.maxPrice)) {
    where.push('p.price <= ?')
    params.push(Number(opts.maxPrice))
  }
  if (opts.inStock) {
    where.push('EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.stock > 0)')
  }
  if (opts.color) {
    where.push(
      'EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.color = ? AND v.stock > 0)',
    )
    params.push(opts.color)
  }
  if (opts.onSale) {
    where.push('p.compare_price IS NOT NULL AND p.compare_price > p.price')
  }
  if (Number.isFinite(opts.minRating)) {
    where.push('p.rating >= ?')
    params.push(Number(opts.minRating))
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS c FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`,
    )
    .get(...params) as { c: number }

  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 48)
  const page = Math.max(opts.page ?? 1, 1)
  const order = SORTS[opts.sort ?? 'newest'] ?? SORTS.newest
  const rows = db
    .prepare(`${BASE_SELECT} ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...params, limit, (page - 1) * limit) as Row[]

  const variantMap = variantsForProducts(rows.map((r) => Number(r.id)))
  const items = rows.map((row) => mapProduct(row, variantMap.get(Number(row.id)) ?? []))

  const priceRow = db
    .prepare('SELECT MIN(price) AS min, MAX(price) AS max FROM products')
    .get() as { min: number | null; max: number | null }

  return {
    items,
    total: countRow.c,
    page,
    pages: Math.max(Math.ceil(countRow.c / limit), 1),
    priceRange: { min: priceRow.min ?? 0, max: priceRow.max ?? 0 },
  }
}

export function listAllProducts() {
  const rows = db.prepare(`${BASE_SELECT} ORDER BY p.created_at DESC`).all() as Row[]
  const variantMap = variantsForProducts(rows.map((r) => Number(r.id)))
  return rows.map((row) => mapProduct(row, variantMap.get(Number(row.id)) ?? []))
}

export function getProductBySlug(slug: string): Product | null {
  const row = db.prepare(`${BASE_SELECT} WHERE p.slug = ?`).get(slug) as Row | undefined
  if (!row) return null
  const variants = variantsForProducts([Number(row.id)]).get(Number(row.id)) ?? []
  return mapProduct(row, variants)
}

export function getProductById(id: number): Product | null {
  const row = db.prepare(`${BASE_SELECT} WHERE p.id = ?`).get(id) as Row | undefined
  if (!row) return null
  const variants = variantsForProducts([Number(row.id)]).get(Number(row.id)) ?? []
  return mapProduct(row, variants)
}

export function listCategories() {
  return db
    .prepare(
      `SELECT c.id, c.name, c.slug, c.gender, c.created_at AS createdAt,
              COUNT(p.id) AS productCount
       FROM categories c LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id ORDER BY c.id`,
    )
    .all() as { id: number; name: string; slug: string; gender: string; productCount: number }[]
}

export function shippingFor(subtotal: number) {
  return subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE
}
