import { fmtDateTimeTz } from './format'
import { MAP_ATTRIBUTION } from './staticmap'

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

export interface WatermarkOptions {
  map: boolean
  accuracy: boolean
  brand: boolean
  scale: number
}

export const WM_RENDER_DEFAULTS: WatermarkOptions = {
  map: true,
  accuracy: true,
  brand: true,
  scale: 1,
}

export interface BuiltPhoto {
  full: Blob
  thumb: Blob
  width: number
  height: number
}

/** Satu baris teks watermark beserta tipografinya. */
interface WmLine {
  text: string
  font: string
  fs: number
  lh: number
  fill: string
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
 * Teks dengan garis tepi gelap agar tetap terbaca di foto berlatar cerah.
 * Stroke digambar sebelum fill sehingga hanya mengelilingi huruf.
 */
function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  fontSize: number,
  fill: string,
) {
  ctx.font = font
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(1.5, Math.round(fontSize * 0.09))
  ctx.strokeStyle = 'rgba(10, 8, 3, 0.85)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = fill
  ctx.fillText(text, x, y)
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
  options: WatermarkOptions = WM_RENDER_DEFAULTS,
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

  // Tipografi mengikuti lebar foto dan preferensi ukuran agar watermark selalu terbaca.
  const m = Math.round(w * 0.032)
  const fsTime = Math.max(15, Math.round(w * 0.028 * options.scale))
  const fsCoord = Math.max(16, Math.round(w * 0.032 * options.scale))
  const fsAddr = Math.max(15, Math.round(w * 0.032 * options.scale))
  const fsBrand = Math.max(12, Math.round(w * 0.02 * options.scale))
  const fontTime = `600 ${fsTime}px Archivo, system-ui, sans-serif`
  const fontCoord = `800 ${fsCoord}px Archivo, system-ui, sans-serif`
  const fontAddr = `500 ${fsAddr}px Archivo, system-ui, sans-serif`
  const fontBrand = `800 ${fsBrand}px Archivo, system-ui, sans-serif`
  const lhTime = Math.round(fsTime * 1.35)
  const lhCoord = Math.round(fsCoord * 1.4)
  const lhAddr = Math.round(fsAddr * 1.4)
  const lhBrand = Math.round(fsBrand * 1.5)

  const timeText = fmtDateTimeTz(meta.takenAt)
  const coordText =
    meta.lat != null && meta.lon != null
      ? `${meta.lat.toFixed(6)}  ${meta.lon.toFixed(6)}${
          options.accuracy && meta.accuracy != null ? `  ±${Math.round(meta.accuracy)} m` : ''
        }`
      : 'Koordinat GPS tidak tersedia'
  const addrLines = meta.addressLines.slice(0, 5)

  // Susun baris dari bawah ke atas, persis urutan render: alamat (baris
  // terakhir paling bawah), koordinat, waktu, lalu label aplikasi.
  const lines: WmLine[] = [
    ...[...addrLines].reverse().map(
      (l): WmLine => ({
        text: l,
        font: fontAddr,
        fs: fsAddr,
        lh: lhAddr,
        fill: '#f0f3f8',
      }),
    ),
    { text: coordText, font: fontCoord, fs: fsCoord, lh: lhCoord, fill: '#f5a524' },
    { text: timeText, font: fontTime, fs: fsTime, lh: lhTime, fill: '#ffffff' },
  ]
  if (options.brand) {
    lines.push({
      text: 'Lokasnap',
      font: fontBrand,
      fs: fsBrand,
      lh: lhBrand,
      fill: 'rgba(255, 255, 255, 0.95)',
    })
  }

  // Blok teks menentukan tinggi kartu peta agar keduanya rapi satu garis.
  const blockH = lines.reduce((sum, l) => sum + l.lh, 0)
  let cardSize =
    meta.mapBlob && options.map ? Math.min(Math.round(w * 0.26), blockH) : 0

  const fullW = w - m * 2
  const gap = Math.round(m * 0.8)

  // Jarak puncak tiap baris dari dasar blok: baris yang berada di atas
  // puncak kartu peta boleh memakai lebar penuh, sisanya menyampingi kartu.
  const topDists = lines.map((l, i) => {
    const belowH = lines.slice(0, i).reduce((sum, b) => sum + b.lh, 0)
    return belowH + Math.round(l.fs * 0.85)
  })
  const maxWFor = (i: number): number =>
    cardSize > 0 && topDists[i] <= cardSize ? fullW - cardSize - gap : fullW

  // Bila baris menyamping kartu tidak muat (umumnya waktu & koordinat yang
  // panjang), susutkan kartu — ukuran teks tidak dikorbankan demi kartu.
  let widest = 0
  lines.forEach((l, i) => {
    if (cardSize > 0 && topDists[i] <= cardSize) {
      ctx.font = l.font
      const need = Math.ceil(ctx.measureText(l.text).width)
      if (need > fullW - cardSize - gap) widest = Math.max(widest, need)
    }
  })
  if (widest > 0) {
    cardSize = Math.min(cardSize, fullW - gap - widest - Math.round(m * 0.3))
    if (cardSize < Math.round(w * 0.14)) cardSize = 0
  }

  const fitted = lines.map((l, i) => {
    ctx.font = l.font
    return fitText(ctx, l.text, maxWFor(i))
  })

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
  for (let i = 0; i < lines.length; i++) {
    drawText(ctx, fitted[i], w - m, y, lines[i].font, lines[i].fs, lines[i].fill)
    y -= lines[i].lh
  }
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
      const fsAttr = Math.max(10, Math.round(w * 0.013))
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 3
      ctx.textAlign = 'left'
      drawText(
        ctx,
        MAP_ATTRIBUTION,
        cx + Math.round(cardSize * 0.06),
        cy + cardSize - Math.round(cardSize * 0.05),
        `500 ${fsAttr}px Archivo, system-ui, sans-serif`,
        fsAttr,
        'rgba(255, 255, 255, 0.95)',
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
