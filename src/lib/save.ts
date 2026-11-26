/**
 * Simpan/ekspor berkas dari aplikasi ke perangkat.
 *
 * Unduhan polos (`<a download>`) memiliki dua masalah di ponsel:
 * - Android: berkas berakhir mentah di folder Unduhan (file manager),
 *   bukan galeri foto.
 * - iOS: atribut `download` untuk URL blob diabaikan Safari, sehingga
 *   foto tidak bisa diunduh sama sekali.
 *
 * Solusi standar web: Web Share API dengan berkas (`navigator.share`).
 * Sheet bagikan OS menawarkan "Simpan ke Galeri" (Android) atau
 * "Simpan Gambar" (iOS) sehingga foto langsung masuk galeri perangkat.
 */

export type SaveOutcome =
  | 'shared' // sheet bagikan OS dibuka, berkas diteruskan ke pilihan pengguna
  | 'downloaded' // unduhan biasa (folder Unduhan) — jalur desktop
  | 'opened' // dibuka di tab baru (iOS tanpa Web Share berkas)
  | 'cancelled' // pengguna menutup sheet tanpa memilih apa pun

/** Perangkat sentuh: input utamanya jari (ponsel/tablet, termasuk iPad ber-UA desktop). */
function isTouchPrimary(): boolean {
  return window.matchMedia?.('(pointer: coarse)')?.matches ?? false
}

/** iPadOS menyamarkan UA menjadi Macintosh; bedakan lewat titik sentuh. */
function isAppleTouchDevice(): boolean {
  const ua = navigator.userAgent
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
  )
}

/** Ponsel/tablet yang mendukung berbagi berkas lewat Web Share API. */
export function canShareToGallery(): boolean {
  return (
    isTouchPrimary() &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  )
}

function downloadViaAnchor(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Cabut belakangan agar unduhan yang lambat tetap punya sumber.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function openInNewTab(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Ekspor berkas ke perangkat.
 * Ponsel: sheet bagikan OS → "Simpan ke Galeri"/"Simpan Gambar".
 * Desktop: unduhan biasa. iOS lama tanpa Web Share berkas: buka di tab
 * baru agar pengguna bisa "tekan lama → Tambahkan ke Foto".
 */
export async function exportFile(blob: Blob, fileName: string): Promise<SaveOutcome> {
  const file = new File([blob], fileName, {
    type: blob.type || 'application/octet-stream',
  })

  // Wajib dipanggil segera dari handler ketukan tanpa await di depannya —
  // Safari iOS hanya mengizinkan share dalam jendela aktivasi pengguna.
  if (canShareToGallery() && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName })
      return 'shared'
    } catch (e) {
      // Pengguna sengaja menutup sheet — jangan jatuh ke jalur unduh.
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // Gagal mekanisme berbagi → lanjut ke jalur unduh di bawah.
    }
  }

  if (isAppleTouchDevice()) {
    openInNewTab(blob)
    return 'opened'
  }

  downloadViaAnchor(blob, fileName)
  return 'downloaded'
}
