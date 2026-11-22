import { fmtDateTimeTz } from './format'

export interface CaptureMeta {
  lat: number | null
  lon: number | null
  accuracy: number | null
  /** Alamat satu baris (untuk tampilan & database). */
  address: string | null
  /** Baris alamat terstruktur (untuk watermark). */
  addressLines: string[]
  /** Citra peta statis berpin (kartu kiri-bawah), null bila offline. */
  mapBlob: Blob | null
  takenAt: number
}

export interface BuiltPhoto {
  full: Blob
  thumb: Blob
  width: number
  height: number
}

const MAX_SIDE = 1600
const THUMB_SIDE = 480

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Gagal mengolah gambar'))),
      'image/jpeg',
      quality,
    )
  })
}

function rrPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Pendekkan teks agar muat lebar maksimum. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1)
  return `${t}…`
}

/**
 * Render foto dengan watermark modern ala aplikasi kurir:
 * scrim gradien di bawah, waktu + koordinat + alamat bertingkat rata-kanan,
 * dan kartu peta mini berpin di kiri-bawah.
 */
export async function buildWatermarkedPhoto(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  meta: CaptureMeta,
  mirror = false,
): Promise<BuiltPhoto> {
  const scale = Math.min(1, MAX_SIDE / Math.max(srcW, srcH))
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak didukung browser ini')
  if (mirror) {
    // Kamera depan: simpan seperti cermin, sama dengan pratinjau di layar.
    ctx.save()
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(source, 0, 0, w, h)
    ctx.restore()
  } else {
    ctx.drawImage(source, 0, 0, w, h)
  }

  // Tipografi mengikuti lebar foto agar watermark selalu terbaca.
  const m = Math.round(w * 0.032)
  const fsTime = Math.max(15, Math.round(w * 0.026))
  const fsCoord = Math.max(15, Math.round(w * 0.028))
  const fsAddr = Math.max(14, Math.round(w * 0.025))
  const fontTime = `600 ${fsTime}px Archivo, system-ui, sans-serif`
  const fontCoord = `800 ${fsCoord}px Archivo, system-ui, sans-serif`
  const fontAddr = `500 ${fsAddr}px Archivo, system-ui, sans-serif`
  const lhTime = Math.round(fsTime * 1.35)
  const lhCoord = Math.round(fsCoord * 1.4)
  const lhAddr = Math.round(fsAddr * 1.4)

  const timeText = fmtDateTimeTz(meta.takenAt)
  const coordText =
    meta.lat != null && meta.lon != null
      ? `${meta.lat.toFixed(6)}  ${meta.lon.toFixed(6)}`
      : 'Koordinat GPS tidak tersedia'
  const addrLines = meta.addressLines.slice(0, 5)

  // Blok teks menentukan tinggi kartu peta agar keduanya rapi satu garis.
  const blockH = lhTime + lhCoord + addrLines.length * lhAddr
  const cardSize = meta.mapBlob ? Math.min(Math.round(w * 0.26), blockH) : 0

  const maxTextW =
    cardSize > 0 ? w - m * 2 - cardSize - Math.round(m * 0.8) : w - m * 2
  ctx.font = fontAddr
  const fittedAddr = addrLines.map((l) => fitText(ctx, l, maxTextW))
  ctx.font = fontTime
  const fittedTime = fitText(ctx, timeText, maxTextW)
  ctx.font = fontCoord
  const fittedCoord = fitText(ctx, coordText, maxTextW)

  const scrimH = blockH + m * 2
  const y0 = h - scrimH
  const grad = ctx.createLinearGradient(0, y0, 0, h)
  grad.addColorStop(0, 'rgba(5, 8, 14, 0)')
  grad.addColorStop(0.55, 'rgba(5, 8, 14, 0.45)')
  grad.addColorStop(1, 'rgba(5, 8, 14, 0.8)')
  ctx.fillStyle = grad
  ctx.fillRect(0, y0, w, scrimH)

  // Blok teks rata-kanan, ditumpuk dari bawah: alamat, koordinat, waktu.
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
  ctx.shadowBlur = Math.max(3, Math.round(w * 0.005))
  ctx.shadowOffsetY = 1
  let y = h - m
  for (let i = fittedAddr.length - 1; i >= 0; i--) {
    ctx.font = fontAddr
    ctx.fillStyle = '#f0f3f8'
    ctx.fillText(fittedAddr[i], w - m, y)
    y -= lhAddr
  }
  ctx.font = fontCoord
  ctx.fillStyle = '#f5a524'
  ctx.fillText(fittedCoord, w - m, y)
  y -= lhCoord
  ctx.font = fontTime
  ctx.fillStyle = '#ffffff'
  ctx.fillText(fittedTime, w - m, y)
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Kartu peta kiri-bawah dengan atribusi layanan ubin.
  if (meta.mapBlob) {
    try {
      const bmp = await createImageBitmap(meta.mapBlob)
      const cx = m
      const cy = h - m - cardSize
      const radius = Math.round(cardSize * 0.08)
      ctx.save()
      rrPath(ctx, cx, cy, cardSize, cardSize, radius)
      ctx.clip()
      ctx.drawImage(bmp, cx, cy, cardSize, cardSize)
      bmp.close()
      ctx.restore()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)'
      ctx.lineWidth = Math.max(2, Math.round(w * 0.003))
      rrPath(ctx, cx, cy, cardSize, cardSize, radius)
      ctx.stroke()
      ctx.font = `500 ${Math.max(10, Math.round(w * 0.013))}px Archivo, system-ui, sans-serif`
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 3
      ctx.textAlign = 'left'
      ctx.fillText(
        '© OpenStreetMap',
        cx + Math.round(cardSize * 0.06),
        cy + cardSize - Math.round(cardSize * 0.05),
      )
      ctx.shadowBlur = 0
    } catch {
      // Peta gagal dirender, lanjutkan tanpa kartu peta.
    }
  }

  ctx.textAlign = 'left'
  const full = await canvasToBlob(canvas, 0.85)

  const ts = THUMB_SIDE / Math.max(w, h)
  const tw = Math.max(1, Math.round(w * ts))
  const th = Math.max(1, Math.round(h * ts))
  const tc = document.createElement('canvas')
  tc.width = tw
  tc.height = th
  const tctx = tc.getContext('2d')
  if (!tctx) throw new Error('Canvas tidak didukung browser ini')
  tctx.drawImage(canvas, 0, 0, tw, th)
  const thumb = await canvasToBlob(tc, 0.72)

  return { full, thumb, width: w, height: h }
}

/** Buat thumbnail kecil dari berkas JPEG (dipakai saat impor cadangan). */
export async function makeThumb(blob: Blob, side = THUMB_SIDE): Promise<Blob> {
  const bmp = await createImageBitmap(blob)
  try {
    const scale = Math.min(1, side / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * scale))
    const h = Math.max(1, Math.round(bmp.height * scale))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('Canvas tidak didukung browser ini')
    ctx.drawImage(bmp, 0, 0, w, h)
    return await canvasToBlob(c, 0.72)
  } finally {
    bmp.close()
  }
}
