import { motion } from 'motion/react'
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
    <motion.div
      className="relative h-full w-full bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <motion.img
        src={url}
        alt="Foto dengan watermark lokasi"
        className="h-full w-full object-contain"
        initial={{ scale: 0.97 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white">
          {fmtDateTime(meta.takenAt)}
        </span>
        <motion.button
          type="button"
          onClick={onRetake}
          whileTap={{ scale: 0.9 }}
          aria-label="Buang foto dan ulangi"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
        >
          <IconClose size={18} />
        </motion.button>
      </div>

      <motion.div
        className="absolute inset-x-0 bottom-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        initial={{ y: 110 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.08 }}
      >
        <div className="rounded-2xl border border-line bg-surface/95 p-4 shadow-lg">
          <div className="flex items-start gap-3">
            {mapUrl && (
              <img
                src={mapUrl}
                alt="Peta lokasi dengan pin"
                className="h-16 w-16 shrink-0 rounded-lg border border-line object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs leading-relaxed text-muted">
                {meta.address ?? 'Alamat belum tersedia (sedang offline)'}
              </p>
              <p className="mt-1 text-xs font-semibold text-brand-ink">
                {meta.lat != null && meta.lon != null
                  ? fmtCoords(meta.lat, meta.lon, meta.accuracy)
                  : 'Koordinat GPS tidak tersedia'}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <motion.button
              type="button"
              onClick={onRetake}
              whileTap={{ scale: 0.97 }}
              className="rounded-xl border border-line py-3 text-sm font-semibold text-ink transition hover:bg-raised"
            >
              Ulangi
            </motion.button>
            <motion.button
              type="button"
              onClick={onSave}
              whileTap={{ scale: 0.97 }}
              className="rounded-xl bg-brand py-3 text-sm font-bold text-ink transition hover:bg-brand-strong"
            >
              Simpan ke galeri
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
