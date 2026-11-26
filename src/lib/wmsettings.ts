export interface WmOptions {
  /** Kartu peta di kiri-bawah foto. */
  map: boolean
  /** Radius akurasi ±m pada baris koordinat. */
  accuracy: boolean
  /** Label "Lokasnap" di atas blok teks. */
  brand: boolean
  /** Pengali ukuran teks watermark (0.85 kecil, 1 sedang, 1.35 besar). */
  scale: number
}

export const WM_DEFAULTS: WmOptions = { map: true, accuracy: true, brand: true, scale: 1 }

export const WM_SCALES: { key: string; label: string; value: number }[] = [
  { key: 'kecil', label: 'Kecil', value: 0.85 },
  { key: 'sedang', label: 'Sedang', value: 1 },
  { key: 'besar', label: 'Besar', value: 1.35 },
]

const KEY = 'fotogps-wm'

/** Baca preferensi watermark dari localStorage, dengan fallback aman. */
export function loadWmOptions(): WmOptions {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...WM_DEFAULTS }
    const p = JSON.parse(raw) as Partial<WmOptions>
    // "Besar" versi lama bernilai 1,2 — petakan ke nilai baru agar
    // preferensi tersimpan tetap cocok dengan pilihan di Pengaturan.
    const rawScale = p.scale === 1.2 ? 1.35 : p.scale
    return {
      map: p.map !== false,
      accuracy: p.accuracy !== false,
      brand: p.brand !== false,
      scale:
        typeof rawScale === 'number' && rawScale >= 0.7 && rawScale <= 1.5
          ? rawScale
          : 1,
    }
  } catch {
    return { ...WM_DEFAULTS }
  }
}

export function saveWmOptions(o: WmOptions): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(o))
  } catch {
    // localStorage bisa penuh/ditolak; preferensi tetap berlaku untuk sesi ini
  }
}
