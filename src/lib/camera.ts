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

interface ZoomCaps {
  min: number
  max: number
  step: number
}

/** Lampu senter tersedia hanya pada kamera belakang yang mendukung (sebagian besar HP). */
export function supportsTorch(stream: MediaStream): boolean {
  const track = stream.getVideoTracks()[0]
  const caps = track?.getCapabilities?.() as
    | (MediaTrackCapabilities & { torch?: boolean })
    | undefined
  return Boolean(caps?.torch)
}

export async function setTorch(stream: MediaStream, on: boolean): Promise<void> {
  const track = stream.getVideoTracks()[0]
  await track?.applyConstraints({
    advanced: [{ torch: on }],
  } as unknown as MediaTrackConstraints)
}

export function getZoomCapabilities(stream: MediaStream): ZoomCaps | null {
  const track = stream.getVideoTracks()[0]
  const caps = track?.getCapabilities?.() as
    | (MediaTrackCapabilities & { zoom?: ZoomCaps })
    | undefined
  return caps?.zoom ?? null
}

export async function setZoom(stream: MediaStream, value: number): Promise<void> {
  const track = stream.getVideoTracks()[0]
  await track?.applyConstraints({
    advanced: [{ zoom: value }],
  } as unknown as MediaTrackConstraints)
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
