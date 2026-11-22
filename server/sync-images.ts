import 'dotenv/config'
import { ensureDatabase, db } from './db.js'
import { seedProducts } from './seed-data.js'

/**
 * Non-destructive image sync.
 * Updates the `images` JSON for the demo catalogue without touching orders,
 * customers, variants or stock — safe to run on an existing database.
 */
ensureDatabase()

const update = db.prepare('UPDATE products SET images = ?, updated_at = ? WHERE slug = ?')
const now = new Date().toISOString()

let updated = 0
for (const product of seedProducts) {
  const result = update.run(JSON.stringify(product.images), now, product.slug)
  updated += Number(result.changes)
}

console.log(`تمت مزامنة صور ${updated} منتج مع ملفات /public/images/products.`)
