export interface GeoFix {
  lat: number
  lon: number
  accuracy: number
  takenAt: number
}

export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator
}

function toFix(pos: GeolocationPosition): GeoFix {
  return {
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? 9999,
    takenAt: Date.now(),
  }
}

function geoErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Izin lokasi ditolak. Aktifkan izin lokasi untuk aplikasi ini.'
    case err.POSITION_UNAVAILABLE:
      return 'Sinyal GPS tidak tersedia. Coba ke tempat lebih terbuka.'
    case err.TIMEOUT:
      return 'GPS terlalu lama merespons. Coba lagi.'
    default:
      return 'Lokasi gagal diambil.'
  }
}

/** Satu kali ambil posisi, akurasi tinggi, tanpa cache. */
export function requestPosition(timeoutMs = 15000): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error('Perangkat tidak mendukung GPS'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(toFix(pos)),
      (err) => reject(new Error(geoErrorMessage(err))),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    )
  })
}

/** Pantau posisi terus-menerus. Return fungsi untuk menghentikan. */
export function startWatch(
  onFix: (fix: GeoFix) => void,
  onError: (message: string) => void,
): () => void {
  if (!isGeolocationSupported()) {
    onError('Perangkat tidak mendukung GPS')
    return () => {}
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onFix(toFix(pos)),
    (err) => onError(geoErrorMessage(err)),
    { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 },
  )
  return () => navigator.geolocation.clearWatch(id)
}
