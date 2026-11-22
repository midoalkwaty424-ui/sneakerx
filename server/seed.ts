import 'dotenv/config'
import { ensureDatabase, seedDemoData, seedFinanceDemoData, db } from './db.js'

ensureDatabase()
seedDemoData()
seedFinanceDemoData()

const counts = {
  products: (db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c,
  variants: (db.prepare('SELECT COUNT(*) AS c FROM variants').get() as { c: number }).c,
  orders: (db.prepare('SELECT COUNT(*) AS c FROM orders').get() as { c: number }).c,
}

console.log('تمت إعادة تهيئة بيانات SNEAKERX التجريبية:', counts)
console.log('بيانات الدخول موجودة في README / .env (ADMIN_EMAIL و ADMIN_PASSWORD).')
