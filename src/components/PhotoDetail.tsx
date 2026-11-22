import { motion } from 'motion/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../db'
import { fmtCoords, fmtDateTime, fmtDms, photoFileName } from '../lib/format'
import { readExifSummary, type ExifSummary } from '../lib/exif-read'
import { useObjectUrl } from '../lib/useObjectUrl'
import { IconClose, IconDownload } from './Icons'

interface Props {
  id: string
  onClose: () => void
}

export default function PhotoDetail({ id, onClose }: Props) {
  const photo = useLiveQuery(async () => await db.photos.get(id), [id])
  const url = useObjectUrl(photo?.blob)
  const mapUrl = useObjectUrl(photo?.mapBlob ?? null)
  const [exif, setExif] = useState<ExifSummary | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    setExif(null)
    setChecking(false)
  }, [id])

  const mapsUrl =
    photo && photo.lat != null && photo.lon != null
      ? `https://www.google.com/maps?q=${photo.lat},${photo.lon}`
      : null

  if (!photo) return null

  const checkExif = async () => {
    setChecking(true)
    setExif(await readExifSummary(photo.blob))
    setChecking(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Hapus foto ini secara permanen?')) return
    await db.photos.delete(photo.id)
    onClose()
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Detail foto"
      className="fixed inset-0 z-50 flex flex-col bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between p-3">
        <span className="text-sm font-medium text-white/90">{fmtDateTime(photo.takenAt)}</span>
        <motion.button
          type="button"
          autoFocus
          onClick={onClose}
          whileTap={{ scale: 0.9 }}
          aria-label="Tutup detail foto"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
        >
          <IconClose size={18} />
        </motion.button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3">
        {url && (
          <motion.img
            src={url}
            alt="Foto tersimpan"
            className="max-h-full max-w-full rounded-lg object-contain"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        )}
      </div>

      <motion.div
        className="max-h-[52%] overflow-y-auto rounded-t-3xl border-t border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
        {mapUrl && (
          <div className="mb-3">
            <img
              src={mapUrl}
              alt="Peta lokasi dengan pin"
              className="max-h-40 w-full max-w-[240px] rounded-xl border border-line object-cover"
            />
            <p className="mt-1 text-[10px] text-muted">Peta © OpenStreetMap</p>
          </div>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Koordinat</dt>
          <dd className="text-right font-semibold tabular-nums text-ink">
            {photo.lat != null && photo.lon != null
              ? fmtCoords(photo.lat, photo.lon, null)
              : 'Tidak ada'}
          </dd>
          {photo.lat != null && photo.lon != null && (
            <>
              <dt className="text-muted">DMS</dt>
              <dd className="text-right tabular-nums text-ink/80">
                {fmtDms(photo.lat, 'lat')} / {fmtDms(photo.lon, 'lon')}
              </dd>
            </>
          )}
          <dt className="text-muted">Akurasi</dt>
          <dd className="text-right text-ink/80">
            {photo.accuracy != null ? `±${Math.round(photo.accuracy)} m` : 'Tidak ada'}
          </dd>
          <dt className="text-muted">Alamat</dt>
          <dd className="text-right text-ink/80">{photo.address ?? 'Tidak ada'}</dd>
          <dt className="text-muted">Ukuran</dt>
          <dd className="text-right tabular-nums text-ink/80">
            {photo.width} × {photo.height} px
          </dd>
        </dl>

        <div className="mt-3 rounded-xl bg-raised p-3 text-xs leading-relaxed text-muted">
          {exif ? (
            exif.lat != null ? (
              <p>
                EXIF tertanam: <span className="tabular-nums">{exif.lat.toFixed(6)}, {exif.lon?.toFixed(6)}</span>{' '}
                pada {exif.takenAt ? fmtDateTime(new Date(exif.takenAt).getTime()) : 'waktu tidak diketahui'}.
              </p>
            ) : (
              <p>Tidak ada EXIF GPS di berkas ini.</p>
            )
          ) : (
            <button
              type="button"
              onClick={() => void checkExif()}
              disabled={checking}
              className="font-semibold text-brand-ink underline-offset-2 hover:underline disabled:opacity-50"
            >
              {checking ? 'Memeriksa…' : 'Periksa metadata EXIF'}
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {mapsUrl && (
            <motion.a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center rounded-xl border border-line py-3 text-sm font-semibold text-ink transition hover:bg-raised"
            >
              Buka di Maps
            </motion.a>
          )}
          {url && (
            <motion.a
              href={url}
              download={photoFileName(photo)}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-semibold text-ink transition hover:bg-raised${mapsUrl ? '' : ' col-span-2'}`}
            >
              <IconDownload size={16} />
              Unduh
            </motion.a>
          )}
          <motion.button
            type="button"
            onClick={() => void handleDelete()}
            whileTap={{ scale: 0.97 }}
            className="col-span-2 rounded-xl bg-danger-soft py-3 text-sm font-semibold text-danger transition hover:bg-danger/20"
          >
            Hapus foto
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
