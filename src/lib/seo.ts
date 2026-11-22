import type { Product } from './types'

export function siteOrigin() {
  return typeof window === 'undefined' ? '' : window.location.origin
}

export function absolute(url: string) {
  if (/^https?:\/\//i.test(url)) return url
  return `${siteOrigin()}${url.startsWith('/') ? '' : '/'}${url}`
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteOrigin()}/#organization`,
    name: 'SNEAKERX',
    url: siteOrigin() || undefined,
    description: 'متجر سنيكرز مصري بإصدارات محدودة وشحن لكل المحافظات.',
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteOrigin()}/#website`,
    url: siteOrigin() || undefined,
    name: 'SNEAKERX',
    inLanguage: 'ar-EG',
    publisher: { '@id': `${siteOrigin()}/#organization` },
  }
}

export function collectionJsonLd(name: string, description: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: absolute(path),
    inLanguage: 'ar-EG',
    isPartOf: { '@id': `${siteOrigin()}/#website` },
  }
}

export function productJsonLd(product: Product) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.slug,
    url: absolute(`/product/${product.slug}`),
    image: product.images.map(absolute),
    brand: { '@type': 'Brand', name: 'SNEAKERX' },
    category: product.category?.name ?? 'Sneakers',
    offers: {
      '@type': 'Offer',
      url: absolute(`/product/${product.slug}`),
      priceCurrency: 'EGP',
      price: product.price,
      availability:
        product.totalStock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: { '@id': `${siteOrigin()}/#organization` },
    },
  }
  if (product.rating > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: Math.max(product.reviewCount, 1),
      bestRating: 5,
      worstRating: 1,
    }
  }
  return data
}
