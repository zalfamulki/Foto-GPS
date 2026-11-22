import { fmtCoords, fmtDateTime } from '../lib/format'
import { useObjectUrl } from '../lib/useObjectUrl'
import type { CaptureMeta } from '../lib/watermark'
import { IconClose } from './Icons'

interface Props {
  url: string
  meta: CaptureMeta
  onSave: () => void
  onRetake: () => void
}

export default function CapturePreview({ url, meta, onSave, onRetake }: Props) {
  const mapUrl = useObjectUrl(meta.mapBlob)
  return (
    <div className="relative h-full w-full bg-black">
      <img src={url} alt="Foto dengan watermark lokasi" className="h-full w-full object-contain" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white">
          {fmtDateTime(meta.takenAt)}
        </span>
        <button
          type="button"
          onClick={onRetake}
          aria-label="Buang foto dan ulangi"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 active:scale-95"
        >
          <IconClose size={18} />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="rounded-2xl bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            {mapUrl && (
              <img
                src={mapUrl}
                alt="Peta lokasi dengan pin"
                className="h-16 w-16 shrink-0 rounded-lg border border-white/30 object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs leading-relaxed text-white/85">
                {meta.address ?? 'Alamat belum tersedia (sedang offline)'}
              </p>
              <p className="mt-1 text-xs font-semibold text-brand">
                {meta.lat != null && meta.lon != null
                  ? fmtCoords(meta.lat, meta.lon, meta.accuracy)
                  : 'Koordinat GPS tidak tersedia'}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRetake}
              className="rounded-xl border border-white/25 py-3 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
            >
              Ulangi
            </button>
            <button
              type="button"
              onClick={onSave}
              className="rounded-xl bg-brand py-3 text-sm font-bold text-black transition hover:bg-brand-strong active:scale-[0.98]"
            >
              Simpan ke galeri
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
