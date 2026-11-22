import { useEffect } from 'react'

type JsonLd = Record<string, unknown> | Record<string, unknown>[]

type PageMetaOptions = {
  /** Path or absolute URL. Added as <link rel="canonical"> and og:url. */
  canonical?: string
  noindex?: boolean
  image?: string
  jsonLd?: JsonLd | null
}

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function absoluteUrl(value: string) {
  return new URL(value, window.location.origin).toString()
}

/**
 * Sets title/description plus the SEO tags shared by every page:
 * canonical, robots, OpenGraph/Twitter and an optional JSON-LD block.
 * Existing 2-argument call sites keep working unchanged.
 */
export function usePageMeta(title: string, description?: string, options: PageMetaOptions = {}) {
  const { canonical, noindex = false, image, jsonLd } = options
  const jsonKey = JSON.stringify(jsonLd ?? null)

  useEffect(() => {
    document.title = title
    if (description) setMeta('name', 'description', description)

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (canonical) {
      if (!link) {
        link = document.createElement('link')
        link.rel = 'canonical'
        document.head.appendChild(link)
      }
      link.href = absoluteUrl(canonical)
    } else {
      link?.remove()
    }

    setMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow')
    setMeta('property', 'og:title', title)
    if (description) setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:site_name', 'SNEAKERX')
    if (canonical) setMeta('property', 'og:url', absoluteUrl(canonical))
    // Every page gets a share image; product pages override it with their own photo.
    setMeta('property', 'og:image', absoluteUrl(image || '/images/products/court-900-1.jpg'))
    setMeta('property', 'og:image:alt', 'SNEAKERX')
    setMeta('name', 'twitter:card', 'summary_large_image')
  }, [title, description, canonical, noindex, image])

  useEffect(() => {
    const id = 'sx-jsonld'
    document.getElementById(id)?.remove()
    if (!jsonLd) return
    const script = document.createElement('script')
    script.id = id
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(script)
    return () => {
      document.getElementById(id)?.remove()
    }
  }, [jsonKey])
}
