export type Facing = 'environment' | 'user'

export function isMediaCameraSupported(): boolean {
  return typeof navigator.mediaDevices?.getUserMedia === 'function'
}

export async function openCamera(facing: Facing): Promise<MediaStream> {
  if (!isMediaCameraSupported()) {
    throw new Error('Kamera tidak didukung browser ini. Gunakan tombol kamera aplikasi di bawah.')
  }
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  })
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop())
}

/**
 * Deteksi apakah kamera aktif menampilkan "kita" (perlu cermin).
 * Mode kamera depan selalu cermin. Mode belakang hanya tidak cermin bila
 * perangkat benar-benar punya kamera belakang (HP); di laptop/PC yang hanya
 * punya satu webcam depan, label "environment" tetap menampilkan kita.
 */
export async function detectFrontLike(
  stream: MediaStream,
  requested: Facing,
): Promise<boolean> {
  if (requested === 'user') return true
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cams = devices.filter((d) => d.kind === 'videoinput')
    if (cams.length <= 1) return true
    const track = stream.getVideoTracks()[0]
    const fm = track?.getSettings?.().facingMode
    return fm === 'user'
  } catch {
    return false
  }
}
