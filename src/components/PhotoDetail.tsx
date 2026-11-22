import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../db'
import { fmtCoords, fmtDateTime, fmtDms, photoFileName } from '../lib/format'
import { readExifSummary, type ExifSummary } from '../lib/exif-read'
import { useObjectUrl } from '../lib/useObjectUrl'
import { IconClose, IconDownload } from './Icons'

interface Props {
  id: string | null
  onClose: () => void
}

export default function PhotoDetail({ id, onClose }: Props) {
  const photo = useLiveQuery(async () => (id ? await db.photos.get(id) : undefined), [id])
  const url = useObjectUrl(photo?.blob)
  const mapUrl = useObjectUrl(photo?.mapBlob ?? null)
  const [exif, setExif] = useState<ExifSummary | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, onClose])

  useEffect(() => {
    setExif(null)
    setChecking(false)
  }, [id])

  if (!id || !photo) return null

  const mapsUrl =
    photo.lat != null && photo.lon != null
      ? `https://www.google.com/maps?q=${photo.lat},${photo.lon}`
      : null

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detail foto"
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
    >
      <div className="flex items-center justify-between p-3">
        <span className="text-sm font-medium text-zinc-300">{fmtDateTime(photo.takenAt)}</span>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          aria-label="Tutup detail foto"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
        >
          <IconClose size={18} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3">
        {url && (
          <img
            src={url}
            alt="Foto tersimpan"
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        )}
      </div>

      <div className="max-h-[45%] overflow-y-auto border-t border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        {mapUrl && (
          <div className="mb-3">
            <img
              src={mapUrl}
              alt="Peta lokasi dengan pin"
              className="max-h-44 w-full max-w-[260px] rounded-xl border border-line object-cover"
            />
            <p className="mt-1 text-[10px] text-zinc-500">Peta © OpenStreetMap</p>
          </div>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-zinc-500">Koordinat</dt>
          <dd className="text-right font-semibold tabular-nums text-white">
            {photo.lat != null && photo.lon != null
              ? fmtCoords(photo.lat, photo.lon, null)
              : 'Tidak ada'}
          </dd>
          {photo.lat != null && photo.lon != null && (
            <>
              <dt className="text-zinc-500">DMS</dt>
              <dd className="text-right tabular-nums text-zinc-300">
                {fmtDms(photo.lat, 'lat')} / {fmtDms(photo.lon, 'lon')}
              </dd>
            </>
          )}
          <dt className="text-zinc-500">Akurasi</dt>
          <dd className="text-right text-zinc-300">
            {photo.accuracy != null ? `±${Math.round(photo.accuracy)} m` : 'Tidak ada'}
          </dd>
          <dt className="text-zinc-500">Alamat</dt>
          <dd className="text-right text-zinc-300">{photo.address ?? 'Tidak ada'}</dd>
          <dt className="text-zinc-500">Ukuran</dt>
          <dd className="text-right tabular-nums text-zinc-300">
            {photo.width} × {photo.height} px
          </dd>
        </dl>

        <div className="mt-3 rounded-xl bg-canvas p-3 text-xs leading-relaxed text-zinc-400">
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
              className="font-semibold text-brand underline-offset-2 hover:underline disabled:opacity-50"
            >
              {checking ? 'Memeriksa…' : 'Periksa metadata EXIF'}
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center rounded-xl border border-white/25 py-3 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
            >
              Buka di Maps
            </a>
          )}
          {url && (
            <a
              href={url}
              download={photoFileName(photo)}
              className={`flex items-center justify-center gap-2 rounded-xl border border-white/25 py-3 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]${mapsUrl ? '' : ' col-span-2'}`}
            >
              <IconDownload size={16} />
              Unduh
            </a>
          )}
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="col-span-2 rounded-xl bg-red-500/15 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/25 active:scale-[0.98]"
          >
            Hapus foto
          </button>
        </div>
      </div>
    </div>
  )
}
