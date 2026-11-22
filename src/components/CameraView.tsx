import { motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { db, type PhotoRecord } from '../db'
import {
  openCamera,
  stopStream,
  detectFrontLike,
  supportsTorch,
  setTorch,
  getZoomCapabilities,
  setZoom,
  type Facing,
} from '../lib/camera'
import { isGeolocationSupported, requestPosition, startWatch, type GeoFix } from '../lib/geo'
import { reverseGeocode } from '../lib/geocode'
import { getStaticMap } from '../lib/staticmap'
import {
  buildWatermarkedPhoto,
  type BuiltPhoto,
  type CaptureMeta,
} from '../lib/watermark'
import { loadWmOptions } from '../lib/wmsettings'
import { embedGpsExif } from '../lib/exif-write'
import CapturePreview from './CapturePreview'
import { IconFlip, IconPin, IconUpload, IconFlash } from './Icons'

/** Akurasi dianggap bagus bila error radius tidak lebih dari nilai ini (meter). */
const GOOD_ACCURACY_M = 15

interface PendingShot {
  built: BuiltPhoto
  finalBlob: Blob
  meta: CaptureMeta
  url: string
}

export default function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const bestFixRef = useRef<GeoFix | null>(null)
  const lastAddrKeyRef = useRef('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [facing, setFacing] = useState<Facing>('environment')
  const [frontLike, setFrontLike] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [fix, setFix] = useState<GeoFix | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [addressPreview, setAddressPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(false)
  const [savedNote, setSavedNote] = useState(false)
  const [shot, setShot] = useState<PendingShot | null>(null)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [zoomCap, setZoomCap] = useState<{ min: number; max: number; step: number } | null>(
    null,
  )
  const [zoomValue, setZoomValue] = useState(1)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null)
  const zoomRafRef = useRef<number | null>(null)
  const pendingZoomRef = useRef<number | null>(null)

  // Buka kamera sesuai arah; stream dihentikan saat layar preview terbuka.
  useEffect(() => {
    if (shot) return
    let cancelled = false
    setCameraReady(false)
    setCameraError(null)
    setFrontLike(facing === 'user')
    openCamera(facing)
      .then(async (stream) => {
        if (cancelled) {
          stopStream(stream)
          return
        }
        streamRef.current = stream
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          v.play().catch(() => {})
        }
        setCameraReady(true)
        // Webcam tunggal (laptop/PC) berlabel apa pun tetap perilaku cermin.
        const fl = await detectFrontLike(stream, facing)
        if (!cancelled) setFrontLike(fl)
        // Kapabilitas kamera: senter dan zoom opsional per perangkat.
        setTorchSupported(supportsTorch(stream))
        setTorchOn(false)
        const zc = getZoomCapabilities(stream)
        setZoomCap(zc)
        setZoomValue(zc?.min ?? 1)
      })
      .catch((e: Error) => {
        if (!cancelled) setCameraError(e.message)
      })
    return () => {
      cancelled = true
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [facing, shot])

  // Pantau GPS akurasi tinggi; simpan fix terbaik dalam 20 detik terakhir.
  useEffect(() => {
    const stop = startWatch(
      (f) => {
        setFix(f)
        setGpsError(null)
        const best = bestFixRef.current
        if (!best || Date.now() - best.takenAt > 20000 || f.accuracy < best.accuracy) {
          bestFixRef.current = f
        }
      },
      (msg) => setGpsError(msg),
    )
    return stop
  }, [])

  // Pratinjau alamat realtime (non-blocking, memakai cache IndexedDB).
  useEffect(() => {
    if (!fix) return
    const key = `${fix.lat.toFixed(4)},${fix.lon.toFixed(4)}`
    if (key === lastAddrKeyRef.current) return
    lastAddrKeyRef.current = key
    let alive = true
    reverseGeocode(fix).then((addr) => {
      if (alive) setAddressPreview(addr?.full ?? null)
    })
    return () => {
      alive = false
    }
  }, [fix])

  const pickFix = useCallback((): GeoFix | null => {
    const best = bestFixRef.current
    if (best && Date.now() - best.takenAt < 30000) return best
    return fix
  }, [fix])

  /** Susun metadata lokasi dari fix: alamat terstruktur + peta statis berpin. */
  const buildMeta = useCallback(async (fixNow: GeoFix | null): Promise<CaptureMeta> => {
    const wm = loadWmOptions()
    const meta: CaptureMeta = {
      lat: fixNow?.lat ?? null,
      lon: fixNow?.lon ?? null,
      accuracy: fixNow?.accuracy ?? null,
      address: null,
      addressLines: [],
      mapBlob: null,
      takenAt: Date.now(),
    }
    if (fixNow) {
      const addr = await reverseGeocode(fixNow)
      meta.address = addr?.full ?? null
      meta.addressLines = addr?.lines ?? []
      if (wm.map) {
        meta.mapBlob = await getStaticMap(fixNow.lat, fixNow.lon).catch(() => null)
      }
    }
    return meta
  }, [])

  const toggleTorch = useCallback(async () => {
    const stream = streamRef.current
    if (!stream) return
    try {
      const next = !torchOn
      await setTorch(stream, next)
      setTorchOn(next)
    } catch {
      setTorchSupported(false)
    }
  }, [torchOn])

  const applyZoom = useCallback((value: number) => {
    pendingZoomRef.current = value
    if (zoomRafRef.current != null) return
    zoomRafRef.current = requestAnimationFrame(async () => {
      zoomRafRef.current = null
      const v = pendingZoomRef.current
      const stream = streamRef.current
      if (v == null || !stream) return
      try {
        await setZoom(stream, v)
        setZoomValue(v)
      } catch {
        // zoom tidak diterapkan, abaikan
      }
    })
  }, [])

  const pinchDistance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (cameraError) return
    const target = e.target as HTMLElement
    if (target.closest('button, a, input')) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2 && zoomCap) {
      const [a, b] = [...pointersRef.current.values()]
      pinchRef.current = { startDist: pinchDistance(a, b), startZoom: zoomValue }
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pinch = pinchRef.current
    if (pinch && zoomCap && pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      const ratio = pinchDistance(a, b) / pinch.startDist
      const target = Math.min(
        zoomCap.max,
        Math.max(zoomCap.min, pinch.startZoom * ratio),
      )
      applyZoom(target)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
  }

  const captureFromFile = useCallback(
    async (file: File | undefined) => {
      if (!file || busy) return
      setBusy(true)
      try {
        const bmp = await createImageBitmap(file)
        try {
          let fixNow = pickFix()
          if (!fixNow && isGeolocationSupported()) {
            fixNow = await requestPosition(10000).catch(() => null)
          }
          const meta = await buildMeta(fixNow)
          const built = await buildWatermarkedPhoto(
            bmp,
            bmp.width,
            bmp.height,
            meta,
            false,
            loadWmOptions(),
          )
          const finalBlob = await embedGpsExif(built.full, meta)
          setShot({ built, finalBlob, meta, url: URL.createObjectURL(finalBlob) })
        } finally {
          bmp.close()
        }
      } catch (e) {
        setCameraError(e instanceof Error ? e.message : 'Gagal memproses foto')
      } finally {
        setBusy(false)
      }
    },
    [busy, pickFix, buildMeta],
  )

  const captureFromVideo = useCallback(async () => {
    const v = videoRef.current
    if (!v || !v.videoWidth || busy) return
    setBusy(true)
    try {
      let fixNow = pickFix()
      if (!fixNow && isGeolocationSupported()) {
        fixNow = await requestPosition(10000).catch(() => null)
      }
      const meta = await buildMeta(fixNow)
      const built = await buildWatermarkedPhoto(
        v,
        v.videoWidth,
        v.videoHeight,
        meta,
        frontLike,
        loadWmOptions(),
      )
      const finalBlob = await embedGpsExif(built.full, meta)
      setFlash(true)
      window.setTimeout(() => setFlash(false), 180)
      setShot({ built, finalBlob, meta, url: URL.createObjectURL(finalBlob) })
    } catch (e) {
      setCameraError(e instanceof Error ? e.message : 'Gagal mengambil foto')
    } finally {
      setBusy(false)
    }
  }, [busy, pickFix, buildMeta, frontLike])

  const handleSave = useCallback(async () => {
    if (!shot) return
    const rec: PhotoRecord = {
      id: crypto.randomUUID(),
      blob: shot.finalBlob,
      thumb: shot.built.thumb,
      mapBlob: shot.meta.mapBlob,
      width: shot.built.width,
      height: shot.built.height,
      lat: shot.meta.lat,
      lon: shot.meta.lon,
      accuracy: shot.meta.accuracy,
      address: shot.meta.address,
      takenAt: shot.meta.takenAt,
    }
    try {
      await db.photos.put(rec)
    } catch {
      setCameraError('Penyimpanan penuh atau ditolak. Hapus foto lama lewat Pengaturan.')
      return
    }
    URL.revokeObjectURL(shot.url)
    setShot(null)
    setSavedNote(true)
    window.setTimeout(() => setSavedNote(false), 2600)
  }, [shot])

  const handleRetake = useCallback(() => {
    if (shot) URL.revokeObjectURL(shot.url)
    setShot(null)
  }, [shot])

  if (shot) {
    return (
      <CapturePreview url={shot.url} meta={shot.meta} onSave={handleSave} onRetake={handleRetake} />
    )
  }

  const gpsLabel = fix
    ? fix.accuracy <= GOOD_ACCURACY_M
      ? `GPS terkunci (±${Math.round(fix.accuracy)} m)`
      : `Akurasi ±${Math.round(fix.accuracy)} m, menyempurnakan…`
    : (gpsError ?? 'Mencari sinyal GPS…')

  return (
    <div
      className={`relative h-full w-full touch-none overflow-hidden ${
        cameraError ? 'bg-canvas' : 'bg-black'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {!cameraError && (
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="absolute inset-0 h-full w-full object-cover"
          style={frontLike ? { transform: 'scaleX(-1)' } : undefined}
        />
      )}

      {!cameraError && !cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-brand"
            aria-hidden="true"
          />
          <span className="sr-only">Menyiapkan kamera</span>
        </div>
      )}

      {flash && <div className="absolute inset-0 bg-white/80" aria-hidden="true" />}

      <motion.div
        className="absolute inset-x-0 top-0 flex flex-col items-start gap-1.5 p-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white">
          <IconPin size={13} className={fix && fix.accuracy <= GOOD_ACCURACY_M ? 'text-brand-strong' : 'text-brand'} />
          {gpsLabel}
        </span>
        {addressPreview && (
          <span className="inline-flex max-w-[88%] rounded-2xl bg-black/55 px-3 py-1.5 text-xs text-white/90">
            <span className="truncate">{addressPreview}</span>
          </span>
        )}
        {savedNote && (
          <motion.span
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-ink"
          >
            Foto tersimpan
          </motion.span>
        )}
      </motion.div>

      {(torchSupported || zoomCap) && !cameraError && (
        <motion.div
          className="absolute right-3 top-3 flex flex-col items-end gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {torchSupported && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => void toggleTorch()}
              aria-label={torchOn ? 'Matikan lampu senter' : 'Nyalakan lampu senter'}
              aria-pressed={torchOn}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                torchOn ? 'bg-brand text-ink' : 'bg-black/55 text-white hover:bg-black/75'
              }`}
            >
              <IconFlash size={18} />
            </motion.button>
          )}
          {zoomCap && zoomValue > zoomCap.min && (
            <span
              className="rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold tabular-nums text-white"
              role="status"
            >
              {(zoomValue / zoomCap.min).toFixed(1)}x
            </span>
          )}
        </motion.div>
      )}

      {cameraError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <IconUpload size={36} className="text-line" />
          <p className="text-sm leading-relaxed text-muted">{cameraError}</p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-ink shadow-sm"
          >
            Ambil foto dengan aplikasi kamera
          </motion.button>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-10 pb-6 pt-10">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Pilih foto dari berkas"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
          >
            <IconUpload size={20} />
          </motion.button>
          <motion.button
            type="button"
            onClick={captureFromVideo}
            disabled={!cameraReady || busy}
            whileTap={cameraReady && !busy ? { scale: 0.88 } : undefined}
            aria-label="Jepret foto"
            className="group relative flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white disabled:opacity-40"
          >
            {busy ? (
              <span
                className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden="true"
              />
            ) : (
              <span
                className="h-[60px] w-[60px] rounded-full bg-brand shadow-inner transition group-active:scale-90"
                aria-hidden="true"
              />
            )}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            aria-label="Ganti kamera depan atau belakang"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
          >
            <IconFlip size={20} />
          </motion.button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={facing === 'user' ? 'user' : 'environment'}
        className="hidden"
        onChange={(e) => {
          void captureFromFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
