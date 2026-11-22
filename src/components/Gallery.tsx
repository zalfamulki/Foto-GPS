import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type PhotoRecord } from '../db'
import { fmtDateShort } from '../lib/format'
import { useObjectUrl } from '../lib/useObjectUrl'
import PhotoDetail from './PhotoDetail'
import { IconPin } from './Icons'

function GalleryItem({ photo, onOpen }: { photo: PhotoRecord; onOpen: () => void }) {
  const url = useObjectUrl(photo.thumb)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-square overflow-hidden rounded-lg bg-raised"
      aria-label={`Lihat detail foto ${photo.address ?? fmtDateShort(photo.takenAt)}`}
    >
      {url && (
        <img
          src={url}
          alt={photo.address ?? `Foto ${fmtDateShort(photo.takenAt)}`}
          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          loading="lazy"
        />
      )}
    </button>
  )
}

export default function Gallery({ onGoCamera }: { onGoCamera: () => void }) {
  const photos = useLiveQuery(() => db.photos.orderBy('takenAt').reverse().toArray())
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="h-full overflow-y-auto">
      {photos === undefined ? (
        <div className="flex h-full items-center justify-center">
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand"
            aria-hidden="true"
          />
          <span className="sr-only">Memuat galeri</span>
        </div>
      ) : photos.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
          <IconPin size={40} className="text-zinc-700" />
          <h1 className="text-base font-semibold text-zinc-200">Belum ada foto tersimpan</h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            Foto yang kamu jepret beserta lokasinya akan muncul di sini.
          </p>
          <button
            type="button"
            onClick={onGoCamera}
            className="mt-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-black transition hover:bg-brand-strong active:scale-[0.98]"
          >
            Buka kamera
          </button>
        </div>
      ) : (
        <>
          <h1 className="px-4 pb-2 pt-4 text-sm font-medium text-zinc-400">
            {photos.length} foto tersimpan
          </h1>
          <div className="grid grid-cols-3 gap-1 px-1 pb-4">
            {photos.map((p) => (
              <GalleryItem key={p.id} photo={p} onOpen={() => setOpenId(p.id)} />
            ))}
          </div>
        </>
      )}
      <PhotoDetail id={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
