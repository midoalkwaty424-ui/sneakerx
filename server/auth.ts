import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { ApiError } from './http.js'

const COOKIE_NAME = 'sx_admin'
const SECRET = process.env.JWT_SECRET || 'sneakerx-development-secret-do-not-use-in-production'
const IS_PROD = process.env.NODE_ENV === 'production'

if (IS_PROD && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be set to at least 32 characters in production')
}

export type AdminPayload = {
  sub: string
  email: string
  name: string
  role: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminPayload
    }
  }
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return undefined
}

export function signToken(payload: AdminPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' })
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  })
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined
  const token = readCookie(req, COOKIE_NAME) || bearer
  if (!token) return next(new ApiError(401, 'يجب تسجيل الدخول للمتابعة'))
  try {
    const payload = jwt.verify(token, SECRET) as AdminPayload
    if (payload.role !== 'admin') return next(new ApiError(403, 'صلاحيات غير كافية'))
    req.admin = payload
    next()
  } catch {
    next(new ApiError(401, 'انتهت الجلسة، سجّل الدخول من جديد'))
  }
}

const attempts = new Map<string, { count: number; reset: number }>()

export function loginRateLimit(req: Request, _res: Response, next: NextFunction) {
  const key = req.ip || 'unknown'
  const current = attempts.get(key)
  const time = Date.now()
  // Drop expired buckets so a long-running server does not leak memory.
  if (attempts.size > 5000) {
    for (const [storedKey, value] of attempts) {
      if (value.reset <= time) attempts.delete(storedKey)
    }
  }
  if (current && current.reset > time) {
    if (current.count >= 8) {
      return next(new ApiError(429, 'محاولات كثيرة. حاول مرة أخرى بعد 10 دقائق'))
    }
    current.count += 1
  } else {
    attempts.set(key, { count: 1, reset: time + 10 * 60 * 1000 })
  }
  next()
}
