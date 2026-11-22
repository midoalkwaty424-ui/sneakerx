import type { NextFunction, Request, Response } from 'express'
import { ApiError } from './http.js'

const IS_PROD = process.env.NODE_ENV === 'production'

/** Origins allowed to talk to the API from a browser. */
export function allowedOrigins() {
  return new Set(
    [
      process.env.PUBLIC_URL,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4000',
      'http://127.0.0.1:4000',
    ].filter(Boolean) as string[],
  )
}

/**
 * TLS / browser hardening. A CSP is only sent in production: Vite's dev server
 * relies on inline scripts and websockets, and must not be restricted.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  // The try-on studio needs the camera on this origin only.
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()')
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none')
  if (IS_PROD) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "form-action 'self'",
        "frame-ancestors 'self'",
        // unsafe-inline is required by the deferred font stylesheet and JSON-LD.
        "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.googletagmanager.com https://connect.facebook.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://fonts.gstatic.com https://www.google-analytics.com https://analytics.google.com https://connect.facebook.net",
        "worker-src 'self' blob:",
        "media-src 'self' blob:",
      ].join('; '),
    )
  }
  next()
}

/** Reject cross-site writes even if a browser sends a cookie along. */
export function originGuard(req: Request, _res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()
  const origin = req.headers.origin
  if (!origin || allowedOrigins().has(origin)) return next()
  return next(new ApiError(403, 'الطلب قادم من مصدر غير مسموح'))
}

type Bucket = { count: number; reset: number }
const buckets = new Map<string, Bucket>()

/**
 * Small in-memory sliding-window limiter. No dependency, no persistence: it
 * stops casual abuse / credential stuffing without needing Redis for a demo.
 */
export function rateLimit(prefix: string, max: number, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const key = `${prefix}:${ip}`
    const time = Date.now()
    const current = buckets.get(key)

    if (!current || current.reset <= time) {
      buckets.set(key, { count: 1, reset: time + windowMs })
      if (buckets.size > 5000) {
        for (const [storedKey, value] of buckets) {
          if (value.reset <= time) buckets.delete(storedKey)
        }
      }
      return next()
    }

    if (current.count >= max) {
      res.setHeader('Retry-After', String(Math.ceil((current.reset - time) / 1000)))
      return next(new ApiError(429, 'طلبات كثيرة جدًا. حاول مرة أخرى بعد قليل'))
    }
    current.count += 1
    next()
  }
}

/** Admin responses contain customer data: never let a proxy cache them. */
export function noStore(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store')
  next()
}
