import { AnimatePresence, motion, type Variants } from 'motion/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type PhotoRecord } from '../db'
import { fmtDateShort } from '../lib/format'
import { useObjectUrl } from '../lib/useObjectUrl'
import PhotoDetail from './PhotoDetail'
import { IconPin } from './Icons'

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
}

function GalleryItem({ photo, onOpen }: { photo: PhotoRecord; onOpen: () => void }) {
  const url = useObjectUrl(photo.thumb)
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="relative aspect-square w-full overflow-hidden rounded-xl border border-line bg-raised"
      aria-label={`Lihat detail foto ${photo.address ?? fmtDateShort(photo.takenAt)}`}
    >
      {url && (
        <img
          src={url}
          alt={photo.address ?? `Foto ${fmtDateShort(photo.takenAt)}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      )}
    </motion.button>
  )
}

export default function Gallery({ onGoCamera }: { onGoCamera: () => void }) {
  const photos = useLiveQuery(() => db.photos.orderBy('takenAt').reverse().toArray())
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="h-full overflow-y-auto bg-canvas">
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
          <IconPin size={44} className="text-brand" />
          <h1 className="text-base font-semibold text-ink">Belum ada foto tersimpan</h1>
          <p className="text-sm leading-relaxed text-muted">
            Foto yang kamu jepret beserta lokasinya akan muncul di sini.
          </p>
          <motion.button
            type="button"
            onClick={onGoCamera}
            whileTap={{ scale: 0.96 }}
            className="mt-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-ink shadow-sm"
          >
            Buka kamera
          </motion.button>
        </div>
      ) : (
        <>
          <h1 className="px-4 pb-2.5 pt-4 text-sm font-medium text-muted">
            {photos.length} foto tersimpan
          </h1>
          <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-3 gap-1.5 px-1.5 pb-4"
          >
            {photos.map((p) => (
              <motion.div key={p.id} variants={itemVariants}>
                <GalleryItem photo={p} onOpen={() => setOpenId(p.id)} />
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
      <AnimatePresence>
        {openId && <PhotoDetail id={openId} onClose={() => setOpenId(null)} />}
      </AnimatePresence>
    </div>
  )
}
