import { motion, type Variants } from 'motion/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  db,
  deleteAllPhotos,
  ensurePersistentStorage,
  readStorageInfo,
  type StorageInfo,
} from '../db'
import { fmtBytes } from '../lib/format'
import { GEOCODE_ATTRIBUTION } from '../lib/geocode'
import {
  getInstallPromptAvailable,
  runInstallPrompt,
  subscribeInstallPrompt,
} from '../lib/pwa'
import { exportPhotosZip, importPhotosZip } from '../lib/zip'

const stackVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } },
}

export default function Settings() {
  const [info, setInfo] = useState<StorageInfo | null>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const zipInputRef = useRef<HTMLInputElement>(null)
  const count = useLiveQuery(() => db.photos.count())
  const installAvailable = useSyncExternalStore(
    subscribeInstallPrompt,
    getInstallPromptAvailable,
  )

  const refreshInfo = useCallback(() => {
    void readStorageInfo().then(setInfo)
  }, [])

  useEffect(() => {
    refreshInfo()
  }, [refreshInfo])

  const enablePersist = async () => {
    await ensurePersistentStorage()
    refreshInfo()
  }

  const handleExport = async () => {
    if (!count || exporting) return
    setExporting(true)
    setMsg(null)
    try {
      const photos = await db.photos.orderBy('takenAt').toArray()
      const zipBlob = await exportPhotosZip(photos)
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fotogps-backup-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
      setMsg({ ok: true, text: `Cadangan berisi ${photos.length} foto berhasil dibuat.` })
    } catch {
      setMsg({ ok: false, text: 'Ekspor gagal. Penyimpanan mungkin penuh.' })
    } finally {
      setExporting(false)
    }
  }

  const handleImportFile = async (file: File | undefined) => {
    if (!file || importing) return
    setImporting(true)
    setMsg(null)
    try {
      const n = await importPhotosZip(file)
      setMsg({ ok: true, text: `${n} foto berhasil diimpor.` })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Impor gagal.' })
    } finally {
      setImporting(false)
      refreshInfo()
    }
  }

  const handleWipe = async () => {
    if (!confirmWipe) {
      setConfirmWipe(true)
      window.setTimeout(() => setConfirmWipe(false), 4000)
      return
    }
    await deleteAllPhotos()
    setConfirmWipe(false)
    setMsg({ ok: true, text: 'Semua foto dihapus.' })
    refreshInfo()
  }

  const pct =
    info && info.quota > 0 ? Math.min(100, Math.round((info.usage / info.quota) * 100)) : 0

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <motion.div
        variants={stackVariants}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-md flex-col gap-3 p-4 pb-8"
      >
        <motion.h1 variants={cardVariants} className="text-2xl font-extrabold tracking-tight text-ink">
          Pengaturan
        </motion.h1>

        <motion.section
          variants={cardVariants}
          className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-ink">Penyimpanan perangkat</h2>
          {info?.supported === false ? (
            <p className="mt-2 text-xs text-muted">
              Browser ini tidak mendukung estimasi penyimpanan.
            </p>
          ) : (
            <>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-raised">
                <motion.div
                  className="h-full rounded-full bg-brand"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <p className="mt-2 text-xs tabular-nums text-muted">
                {fmtBytes(info?.usage ?? 0)} dari {fmtBytes(info?.quota ?? 0)} terpakai
              </p>
            </>
          )}
          {info && !info.persisted && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => void enablePersist()}
              className="mt-3 w-full rounded-xl border border-brand bg-brand-soft py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand/25"
            >
              Aktifkan penyimpanan persisten
            </motion.button>
          )}
          {info?.persisted && (
            <p className="mt-3 rounded-xl bg-ok-soft px-3 py-2 text-xs font-medium text-ok">
              Penyimpanan persisten aktif. Data dilindungi dari pembersihan otomatis browser.
            </p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Foto tersimpan langsung di perangkat (IndexedDB) dan tidak dikirim ke server mana
            pun. Pembersihan site data atau reset pabrik tetap bisa menghapusnya, jadi buat
            cadangan ZIP secara berkala.
          </p>
        </motion.section>

        <motion.section
          variants={cardVariants}
          className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-ink">Install aplikasi</h2>
          {installAvailable ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => void runInstallPrompt()}
              className="mt-3 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-brand-strong"
            >
              Install ke layar utama
            </motion.button>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Buka menu browser lalu pilih "Tambahkan ke layar utama" untuk memasang seperti
              aplikasi biasa.
            </p>
          )}
        </motion.section>

        <motion.section
          variants={cardVariants}
          className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-ink">Cadangan &amp; pulihkan</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => void handleExport()}
              disabled={!count || exporting}
              className="rounded-xl border border-brand bg-brand-soft py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand/25 disabled:opacity-40"
            >
              {exporting ? 'Menyiapkan…' : 'Ekspor ZIP'}
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => zipInputRef.current?.click()}
              disabled={importing}
              className="rounded-xl border border-line py-2.5 text-sm font-semibold text-ink transition hover:bg-raised disabled:opacity-40"
            >
              {importing ? 'Mengimpor…' : 'Impor ZIP'}
            </motion.button>
          </div>
          {msg && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-3 text-xs font-medium ${msg.ok ? 'text-ok' : 'text-danger'}`}
              role="status"
            >
              {msg.text}
            </motion.p>
          )}
          <p className="mt-2 text-xs text-muted">
            {count ?? 0} foto akan dikemas beserta koordinat, alamat, dan waktunya.
          </p>
        </motion.section>

        <motion.section
          variants={cardVariants}
          className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-ink">Hapus data</h2>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => void handleWipe()}
            className={`mt-3 w-full rounded-xl py-2.5 text-sm font-semibold transition ${
              confirmWipe
                ? 'bg-danger text-white hover:bg-danger/85'
                : 'border border-danger/40 bg-danger-soft text-danger hover:bg-danger/25'
            }`}
          >
            {confirmWipe ? 'Yakin? Ketuk lagi untuk menghapus' : 'Hapus semua foto'}
          </motion.button>
        </motion.section>

        <motion.section
          variants={cardVariants}
          className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-ink">Tentang</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Foto GPS v1.1.0. Kamera, GPS, dan penyimpanan berjalan sepenuhnya di perangkat.
          </p>
          <p className="mt-1 text-xs text-muted">{GEOCODE_ATTRIBUTION}</p>
          <p className="mt-1 text-xs text-muted">
            Ikon aplikasi masih placeholder. Ganti berkas public/icon.svg bila ingin memakai
            logo sendiri, lalu jalankan npm run generate-pwa-assets.
          </p>
        </motion.section>

        <input
          ref={zipInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            void handleImportFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </motion.div>
    </div>
  )
}
