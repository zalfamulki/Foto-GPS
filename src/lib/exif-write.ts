import piexif from 'piexifjs'
import type { CaptureMeta } from './watermark'

const IFD0 = piexif.ImageIFD
const EXIF = piexif.ExifIFD
const GPS = piexif.GPSIFD

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('Gagal membaca gambar'))
    r.readAsDataURL(blob)
  })
}

function exifDate(ms: number): string {
  const d = new Date(ms)
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Sisipkan koordinat GPS dan waktu ke metadata EXIF JPEG hasil render canvas. */
export async function embedGpsExif(jpeg: Blob, meta: CaptureMeta): Promise<Blob> {
  if (jpeg.type !== 'image/jpeg') return jpeg
  try {
    const dataUrl = await blobToDataUrl(jpeg)
    const dt = exifDate(meta.takenAt)

    const zeroth: Record<number, unknown> = {
      [IFD0.DateTime]: dt,
      [IFD0.Software]: 'Lokasnap PWA',
    }
    const exifIfd: Record<number, unknown> = {
      [EXIF.DateTimeOriginal]: dt,
      [EXIF.DateTimeDigitized]: dt,
    }
    const gpsIfd: Record<number, unknown> = {}
    if (meta.lat != null && meta.lon != null) {
      gpsIfd[GPS.GPSLatitudeRef] = meta.lat >= 0 ? 'N' : 'S'
      gpsIfd[GPS.GPSLatitude] = piexif.GPSHelper.degToDmsRational(Math.abs(meta.lat))
      gpsIfd[GPS.GPSLongitudeRef] = meta.lon >= 0 ? 'E' : 'W'
      gpsIfd[GPS.GPSLongitude] = piexif.GPSHelper.degToDmsRational(Math.abs(meta.lon))
      gpsIfd[GPS.GPSMapDatum] = 'WGS-84'
      if (meta.accuracy != null) {
        gpsIfd[GPS.GPSHPositioningError] = [Math.round(meta.accuracy * 100), 100]
      }
    }

    const exifBytes = piexif.dump({ '0th': zeroth, Exif: exifIfd, GPS: gpsIfd })
    const out = piexif.insert(exifBytes, dataUrl)
    const res = await fetch(out)
    return await res.blob()
  } catch {
    // Gagal menyisipkan EXIF tidak boleh menggagalkan penyimpanan foto.
    return jpeg
  }
}
