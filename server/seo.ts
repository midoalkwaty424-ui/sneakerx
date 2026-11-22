import type { Express, Request, Response } from 'express'
import { listAllProducts, listCategories } from './catalog.js'

function siteUrl() {
  const raw = process.env.PUBLIC_URL || 'http://localhost:4000'
  return raw.replace(/\/+$/, '')
}

function xml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Crawler endpoints. Mounted before the SPA fallback so they never return HTML. */
export function registerSeoRoutes(app: Express) {
  app.get('/robots.txt', (_req: Request, res: Response) => {
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin/',
        'Disallow: /checkout',
        'Disallow: /order/',
        'Disallow: /track',
        'Disallow: /wishlist',
        'Disallow: /compare',
        '',
        `Sitemap: ${siteUrl()}/sitemap.xml`,
        '',
      ].join('\n'),
    )
  })

  app.get('/sitemap.xml', (_req: Request, res: Response) => {
    const base = siteUrl()
    const today = new Date().toISOString().slice(0, 10)

    const staticUrls = [
      { path: '/', changefreq: 'daily', priority: '1.0', lastmod: today },
      { path: '/shop', changefreq: 'daily', priority: '0.9', lastmod: today },
      { path: '/loyalty', changefreq: 'monthly', priority: '0.6', lastmod: today },
      { path: '/policies', changefreq: 'monthly', priority: '0.4', lastmod: today },
    ]

    const productUrls = listAllProducts().map((product) => ({
      path: `/product/${product.slug}`,
      changefreq: 'weekly' as const,
      priority: '0.8',
      lastmod: String(product.createdAt ?? today).slice(0, 10) || today,
    }))

    const categoryUrls = listCategories()
      .filter((category) => category.productCount > 0)
      .map((category) => ({
        path: `/shop?category=${encodeURIComponent(category.slug)}`,
        changefreq: 'weekly' as const,
        priority: '0.6',
        lastmod: today,
      }))

    const urls = [...staticUrls, ...productUrls, ...categoryUrls]
      .map(
        (item) =>
          `  <url>\n    <loc>${xml(base + item.path)}</loc>\n    <lastmod>${xml(item.lastmod)}</lastmod>\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>`,
      )
      .join('\n')

    res
      .set('Content-Type', 'application/xml; charset=utf-8')
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
  })
}
