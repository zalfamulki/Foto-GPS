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
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-md flex-col gap-3 p-4 pb-8">
        <h1 className="text-lg font-bold text-white">Pengaturan</h1>

        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold text-white">Penyimpanan perangkat</h2>
          {info?.supported === false ? (
            <p className="mt-2 text-xs text-zinc-400">
              Browser ini tidak mendukung estimasi penyimpanan.
            </p>
          ) : (
            <>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-raised">
                <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-xs tabular-nums text-zinc-400">
                {fmtBytes(info?.usage ?? 0)} dari {fmtBytes(info?.quota ?? 0)} terpakai
              </p>
            </>
          )}
          {info && !info.persisted && (
            <button
              type="button"
              onClick={() => void enablePersist()}
              className="mt-3 w-full rounded-xl border border-brand/60 bg-brand/10 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand/20 active:scale-[0.98]"
            >
              Aktifkan penyimpanan persisten
            </button>
          )}
          {info?.persisted && (
            <p className="mt-3 text-xs font-medium text-emerald-400">
              Penyimpanan persisten aktif. Data dilindungi dari pembersihan otomatis browser.
            </p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Foto tersimpan langsung di perangkat (IndexedDB) dan tidak dikirim ke server mana
            pun. Pembersihan site data atau reset pabrik tetap bisa menghapusnya, jadi buat
            cadangan ZIP secara berkala.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold text-white">Install aplikasi</h2>
          {installAvailable ? (
            <button
              type="button"
              onClick={() => void runInstallPrompt()}
              className="mt-3 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-black transition hover:bg-brand-strong active:scale-[0.98]"
            >
              Install ke layar utama
            </button>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              Buka menu browser lalu pilih "Tambahkan ke layar utama" untuk memasang seperti
              aplikasi biasa.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold text-white">Cadangan &amp; pulihkan</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={!count || exporting}
              className="rounded-xl border border-brand/60 bg-brand/10 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand/20 active:scale-[0.98] disabled:opacity-40"
            >
              {exporting ? 'Menyiapkan…' : 'Ekspor ZIP'}
            </button>
            <button
              type="button"
              onClick={() => zipInputRef.current?.click()}
              disabled={importing}
              className="rounded-xl border border-white/25 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-40"
            >
              {importing ? 'Mengimpor…' : 'Impor ZIP'}
            </button>
          </div>
          {msg && (
            <p
              className={`mt-3 text-xs font-medium ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}
              role="status"
            >
              {msg.text}
            </p>
          )}
          <p className="mt-2 text-xs text-zinc-500">
            {count ?? 0} foto akan dikemas beserta koordinat, alamat, dan waktunya.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold text-white">Hapus data</h2>
          <button
            type="button"
            onClick={() => void handleWipe()}
            className={`mt-3 w-full rounded-xl py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
              confirmWipe
                ? 'bg-red-500 text-white hover:bg-red-400'
                : 'border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20'
            }`}
          >
            {confirmWipe ? 'Yakin? Ketuk lagi untuk menghapus' : 'Hapus semua foto'}
          </button>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold text-white">Tentang</h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Foto GPS v1.0.0. Kamera, GPS, dan penyimpanan berjalan sepenuhnya di perangkat.
          </p>
          <p className="mt-1 text-xs text-zinc-500">{GEOCODE_ATTRIBUTION}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Ikon aplikasi masih placeholder. Ganti berkas public/icon.svg bila ingin memakai
            logo sendiri, lalu jalankan npm run generate-pwa-assets.
          </p>
        </section>

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
      </div>
    </div>
  )
}
