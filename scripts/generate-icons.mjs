// Generates all PWA / store icon PNGs from the inline SVG below into public/.
// Run: node scripts/generate-icons.mjs
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const out = path.join(root, 'public')
mkdirSync(out, { recursive: true })

// pad: extra safe-zone padding for maskable icons (content must fit inner 60%)
function iconSvg({ rounded = true, pad = 0 } = {}) {
  const s = 512
  const r = rounded ? 116 : 0
  const scale = 1 - pad
  const cx = s / 2
  const tx = cx - cx * scale
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8b5cf6"/>
      <stop offset="1" stop-color="#c026d3"/>
    </linearGradient>
    <linearGradient id="star" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fde68a"/>
      <stop offset="1" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${r}" fill="url(#bg)"/>
  <g transform="translate(${tx} ${tx}) scale(${scale})">
    <path d="M256 96 C266 176 286 226 336 246 C286 266 266 316 256 396 C246 316 226 266 176 246 C226 226 246 176 256 96 Z" fill="url(#star)"/>
    <path d="M366 118 C370 148 378 166 396 174 C378 182 370 200 366 230 C362 200 354 182 336 174 C354 166 362 148 366 118 Z" fill="#fef3c7"/>
    <path d="M150 300 C153 322 159 336 173 342 C159 348 153 362 150 384 C147 362 141 348 127 342 C141 336 147 322 150 300 Z" fill="#fef3c7"/>
  </g>
</svg>`
}

const jobs = [
  { file: 'pwa-192.png', size: 192, opts: {} },
  { file: 'pwa-512.png', size: 512, opts: {} },
  { file: 'pwa-maskable-512.png', size: 512, opts: { rounded: false, pad: 0.18 } },
  { file: 'apple-touch-icon.png', size: 180, opts: { rounded: false } },
  { file: 'favicon.png', size: 64, opts: {} },
]

for (const { file, size, opts } of jobs) {
  await sharp(Buffer.from(iconSvg(opts))).resize(size, size).png().toFile(path.join(out, file))
  console.log('wrote', file)
}
