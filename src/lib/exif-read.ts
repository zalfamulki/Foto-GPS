import exifr from 'exifr'

export interface ExifSummary {
  lat: number | null
  lon: number | null
  takenAt: string | null
}

/** Baca EXIF yang tertanam di berkas JPEG untuk verifikasi metadata. */
export async function readExifSummary(blob: Blob): Promise<ExifSummary> {
  try {
    const data = await exifr.parse(blob, { tiff: true, exif: true, gps: true })
    if (!data) return { lat: null, lon: null, takenAt: null }
    return {
      lat: typeof data.latitude === 'number' ? data.latitude : null,
      lon: typeof data.longitude === 'number' ? data.longitude : null,
      takenAt: data.DateTimeOriginal
        ? new Date(data.DateTimeOriginal).toISOString()
        : null,
    }
  } catch {
    return { lat: null, lon: null, takenAt: null }
  }
}
