import fs from 'node:fs'

const file = 'server/seed-data.ts'
const src = fs.readFileSync(file, 'utf8')
const re = /images: \['(\/images\/products\/[a-z0-9-]+)-1\.jpg', '\1-2\.jpg'\],/g
let count = 0
const out = src.replace(re, (match, base) => {
  count += 1
  return `images: ['${base}-1.jpg', '${base}-2.jpg', '${base}-3.jpg', '${base}-4.jpg'],`
})
if (count !== 12) {
  console.error(`Expected 12 replacements, got ${count}`)
  process.exit(1)
}
fs.writeFileSync(file, out, 'utf8')
console.log(`Updated ${count} products to 4 images`)
