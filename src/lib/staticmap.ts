import { db } from '../db'
import { cacheKey } from './geocode'

const TILE = 256
const GRID = 3
const TTL = 30 * 24 * 60 * 60 * 1000
/** Carto Voyager: gaya peta terang yang cocok dengan tema aplikasi, CORS terbuka. */
const SOURCE = 'https://basemaps.cartocdn.com/rastertiles/voyager'

export const MAP_ATTRIBUTION = '© OpenStreetMap © CARTO'

function lonToTileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * 2 ** zoom
}

function latToTileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom
}

/** Pin lokasi amber mengarah tepat ke koordinat pada kartu peta. */
function drawPin(ctx: CanvasRenderingContext2D, px: number, py: number): void {
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 8
  ctx.fillStyle = '#f5a524'
  ctx.beginPath()
  ctx.arc(px, py - 26, 18, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(px - 11, py - 12)
  ctx.lineTo(px + 11, py - 12)
  ctx.lineTo(px, py)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = '#0a0d13'
  ctx.beginPath()
  ctx.arc(px, py - 26, 7, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Render peta statis 3x3 ubin OpenStreetMap dengan pin di koordinat.
 * Hasilnya disimpan di cache IndexedDB sehingga foto di lokasi yang sama
 * tidak mengunduh ulang ubin (hemat kuota, bisa dipakai ulang offline).
 */
export async function getStaticMap(lat: number, lon: number, zoom = 17): Promise<Blob | null> {
  const key = `map:${cacheKey(lat, lon)}`
  const hit = await db.mapcache.get(key)
  if (hit && Date.now() - hit.cachedAt < TTL) return hit.blob

  const size = TILE * GRID
  const xt = lonToTileX(lon, zoom)
  const yt = latToTileY(lat, zoom)
  const x0 = Math.floor(xt) - Math.floor(GRID / 2)
  const y0 = Math.floor(yt) - Math.floor(GRID / 2)
  const n = 2 ** zoom
  const px = (xt - x0) * TILE
  const py = (yt - y0) * TILE

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#141a24'
  ctx.fillRect(0, 0, size, size)

  const tiles: { dx: number; dy: number; url: string }[] = []
  for (let dx = 0; dx < GRID; dx++) {
    for (let dy = 0; dy < GRID; dy++) {
      const ty = y0 + dy
      if (ty < 0 || ty >= n) continue
      const tx = (((x0 + dx) % n) + n) % n
      tiles.push({ dx, dy, url: `${SOURCE}/${zoom}/${tx}/${ty}.png` })
    }
  }

  const results = await Promise.allSettled(
    tiles.map(async (t) => {
      const res = await fetch(t.url, { signal: AbortSignal.timeout(6000) })
      if (!res.ok) throw new Error(`tile ${res.status}`)
      const bmp = await createImageBitmap(await res.blob())
      return { ...t, bmp }
    }),
  )

  let ok = 0
  for (const r of results) {
    if (r.status === 'fulfilled') {
      ok += 1
      ctx.drawImage(r.value.bmp, r.value.dx * TILE, r.value.dy * TILE)
      r.value.bmp.close()
    }
  }
  if (ok < GRID * GRID - 2) return null // terlalu banyak ubin gagal, tanpa peta lebih jujur

  drawPin(ctx, px, py)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.82),
  )
  if (!blob) return null
  await db.mapcache.put({ key, blob, cachedAt: Date.now() }).catch(() => {})
  return blob
}
