import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { ensureDatabase } from './db.js'
import { reconcileAll } from './finance.js'
import { publicRouter } from './routes/public.js'
import { adminRouter } from './routes/admin.js'
import { ApiError, notFound } from './http.js'
import { registerSeoRoutes } from './seo.js'
import {
  allowedOrigins,
  noStore,
  originGuard,
  rateLimit,
  securityHeaders,
} from './security.js'
import { ZodError } from 'zod'

ensureDatabase()
reconcileAll()

const app = express()
const PORT = Number(process.env.PORT || 4000)
const IS_PROD = process.env.NODE_ENV === 'production'
const origins = allowedOrigins()

app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(securityHeaders)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origins.has(origin)) return callback(null, true)
      return callback(new ApiError(403, 'الطلب قادم من مصدر غير مسموح'))
    },
    credentials: true,
  }),
)

app.use(express.json({ limit: '512kb' }))

/* API abuse protection: generous for reads, tighter for writes. */
const writeLimit = rateLimit('api-write', 120)
app.use('/api', rateLimit('api-read', 600))
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()
  return writeLimit(req, res, next)
})
app.use('/api', originGuard)

app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), 'server/uploads'), {
    maxAge: '1d',
    index: false,
    dotfiles: 'ignore',
  }),
)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'SNEAKERX API', time: new Date().toISOString() })
})

registerSeoRoutes(app)

app.use('/api/admin', noStore, adminRouter)
app.use('/api', publicRouter)
app.use('/api', notFound)

/* ------------------------- production frontend ------------------------ */

const distDir = path.resolve(process.cwd(), 'dist')
if (IS_PROD && fs.existsSync(distDir)) {
  app.use(
    express.static(distDir, {
      maxAge: '1h',
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store')
      },
    }),
  )
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
} else {
  app.get('/', (_req, res) => {
    res.json({ service: 'SNEAKERX API', hint: 'شغّل الواجهة عبر npm run dev أو ابنِ المشروع بـ npm run build' })
  })
}

/* ----------------------------- error handler ---------------------------- */

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message, details: error.details })
    }
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'بيانات غير صحيحة', details: error.flatten() })
    }
    if (error && typeof error === 'object' && (error as { name?: string }).name === 'MulterError') {
      return res.status(400).json({ error: 'الملف غير مناسب. الحد الأقصى 4 ميجابايت' })
    }
    console.error('[SNEAKERX API ERROR]', error)
    res.status(500).json({ error: 'حدث خطأ غير متوقع في السيرفر' })
  },
)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  SNEAKERX API → http://localhost:${PORT}`)
  if (!IS_PROD) console.log('  وضع التطوير: الواجهة تعمل على http://localhost:5173\n')
})
