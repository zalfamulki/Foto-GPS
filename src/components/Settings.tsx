import { AnimatePresence, motion, type Variants } from 'motion/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import pkg from '../../package.json'
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
  loadWmOptions,
  saveWmOptions,
  WM_SCALES,
  type WmOptions,
} from '../lib/wmsettings'
import {
  getInstallPromptAvailable,
  runInstallPrompt,
  subscribeInstallPrompt,
} from '../lib/pwa'
import { exportPhotosZip, importPhotosZip } from '../lib/zip'

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** Langkah pemasangan manual per platform, untuk browser tanpa pemicu otomatis. */
function InstallSteps() {
  const ios = isIos()
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink/80">
      {ios ? (
        <>
          <li>
            Ketuk ikon <span className="font-semibold text-ink">Bagikan</span> (kotak
            dengan panah ke atas) di bilah bawah Safari.
          </li>
          <li>
            Gulir lalu pilih{' '}
            <span className="font-semibold text-ink">Tambahkan ke Layar Utama</span>.
          </li>
          <li>
            Ketuk <span className="font-semibold text-ink">Tambah</span>. Selesai.
          </li>
        </>
      ) : (
        <>
          <li>
            Ketuk menu <span className="font-semibold text-ink">titik tiga</span> di pojok
            kanan atas browser.
          </li>
          <li>
            Pilih <span className="font-semibold text-ink">Instal aplikasi</span> atau{' '}
            <span className="font-semibold text-ink">Tambahkan ke layar utama</span>.
          </li>
          <li>
            Konfirmasi <span className="font-semibold text-ink">Instal</span>. Selesai.
          </li>
        </>
      )}
    </ol>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-2.5 text-left"
    >
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-brand' : 'border border-line bg-raised'
        }`}
      >
        <motion.span
          className="h-5 w-5 rounded-full bg-white shadow"
          animate={{ x: checked ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </span>
    </button>
  )
}

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
  const [wm, setWm] = useState<WmOptions>(() => loadWmOptions())
  const [installing, setInstalling] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false)
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

  // Escape menutup dialog langkah pemasangan.
  useEffect(() => {
    if (!stepsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStepsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stepsOpen])

  const enablePersist = async () => {
    await ensurePersistentStorage()
    refreshInfo()
  }

  const updateWm = (patch: Partial<WmOptions>) => {
    const next = { ...wm, ...patch }
    setWm(next)
    saveWmOptions(next)
  }

  const handleInstallClick = async () => {
    if (installAvailable) {
      setInstalling(true)
      await runInstallPrompt()
      setInstalling(false)
      return
    }
    setStepsOpen(true)
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
      a.download = `lokasnap-backup-${new Date().toISOString().slice(0, 10)}.zip`
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
          <h2 className="text-sm font-semibold text-ink">Pasang aplikasi</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Ikon di layar utama, buka instan, dan tetap berfungsi tanpa internet.
          </p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => void handleInstallClick()}
            disabled={installing}
            className="mt-3 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-brand-strong disabled:opacity-50"
          >
            {installAvailable
              ? installing
                ? 'Menyiapkan…'
                : 'Pasang sekarang'
              : 'Pasang aplikasi'}
          </motion.button>
          {!installAvailable && (
            <p className="mt-2 text-xs text-muted">
              Browser ini belum menawarkan pemasangan langsung. Tombol akan membuka
              langkah pemasangan manual.
            </p>
          )}
        </motion.section>

        <AnimatePresence>
          {stepsOpen && (
            <motion.div
              key="install-steps"
              role="dialog"
              aria-modal="true"
              aria-label="Langkah pemasangan aplikasi"
              className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setStepsOpen(false)}
            >
              <motion.div
                className="rounded-t-3xl border-t border-line bg-surface px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
                <h3 className="text-base font-bold text-ink">Pasang ke layar utama</h3>
                <p className="mt-1 text-xs text-muted">
                  Ikuti langkah sesuai perangkat Anda, kurang dari 10 detik.
                </p>
                <div className="mt-4">
                  <InstallSteps />
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStepsOpen(false)}
                  className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-bold text-ink shadow-sm transition hover:bg-brand-strong"
                >
                  Mengerti, tutup
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.section
          variants={cardVariants}
          className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-ink">Isi watermark</h2>
          <p className="mt-1 text-xs text-muted">
            Atur komponen yang dicetak pada setiap foto.
          </p>
          <div className="mt-1 divide-y divide-line">
            <Toggle
              label="Kartu peta"
              hint="Peta mini dengan pin lokasi di kiri-bawah"
              checked={wm.map}
              onChange={(v) => updateWm({ map: v })}
            />
            <Toggle
              label="Akurasi GPS"
              hint="Teks ±meter di samping koordinat"
              checked={wm.accuracy}
              onChange={(v) => updateWm({ accuracy: v })}
            />
            <Toggle
              label="Label aplikasi"
              hint="Tulisan Lokasnap di blok watermark"
              checked={wm.brand}
              onChange={(v) => updateWm({ brand: v })}
            />
          </div>
          <p className="mb-1.5 mt-2 text-xs font-medium text-muted">Ukuran teks</p>
          <div className="flex rounded-xl border border-line bg-raised p-1">
            {WM_SCALES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => updateWm({ scale: s.value })}
                aria-pressed={wm.scale === s.value}
                className="relative flex-1 rounded-lg py-1.5 text-xs font-semibold"
              >
                {wm.scale === s.value && (
                  <motion.span
                    layoutId="wm-scale-pill"
                    className="absolute inset-0 rounded-lg bg-brand"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <span
                  className={`relative ${wm.scale === s.value ? 'text-ink' : 'text-muted'}`}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>
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
            Lokasnap v{pkg.version}. Kamera, GPS, dan penyimpanan berjalan sepenuhnya di
            perangkat.
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
