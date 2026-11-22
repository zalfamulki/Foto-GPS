import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  getInstallPromptAvailable,
  runInstallPrompt,
  subscribeInstallPrompt,
} from '../lib/pwa'
import { IconClose } from './Icons'

const DISMISS_KEY = 'fotogps-install-dismissed'

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/**
 * Pita saran pemasangan dengan bahasa awam:
 * sekali ketuk bila browser mendukung, atau langkah manual per platform.
 * Bisa ditutup; aplikasi yang sudah terpasang tidak menampilkannya lagi.
 */
export default function InstallBanner() {
  const available = useSyncExternalStore(subscribeInstallPrompt, getInstallPromptAvailable)
  const [closed, setClosed] = useState(true)
  const [standalone, setStandalone] = useState(true)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    setStandalone(isStandalone())
    try {
      setClosed(localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setClosed(false)
    }
  }, [])

  const dismiss = () => {
    setClosed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // penyimpanan ditolak; pita tetap tertutup untuk sesi ini
    }
  }

  const install = async () => {
    setInstalling(true)
    const outcome = await runInstallPrompt()
    setInstalling(false)
    if (outcome === 'accepted') dismiss()
  }

  const show = !standalone && !closed

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="install-banner"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="mx-3 mb-2 rounded-2xl border border-brand bg-brand-soft p-3.5 shadow-sm"
          role="status"
        >
          <div className="flex items-start gap-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                Pasang aplikasi di layar utama
              </p>
              {available ? (
                <>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    Sekali ketuk, langsung terpasang seperti aplikasi biasa. Tanpa buka
                    browser lagi.
                  </p>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => void install()}
                    disabled={installing}
                    className="mt-2.5 w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-ink shadow-sm transition hover:bg-brand-strong disabled:opacity-50"
                  >
                    {installing ? 'Menyiapkan…' : 'Pasang sekarang'}
                  </motion.button>
                </>
              ) : isIos() ? (
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Ketuk ikon{' '}
                  <span className="font-semibold text-ink">Bagikan</span> (kotak dengan
                  panah ke atas), lalu pilih{' '}
                  <span className="font-semibold text-ink">Tambahkan ke Layar Utama</span>.
                </p>
              ) : (
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Buka menu browser (ikon titik tiga di pojok kanan atas), lalu pilih{' '}
                  <span className="font-semibold text-ink">Instal aplikasi</span> atau{' '}
                  <span className="font-semibold text-ink">Tambahkan ke layar utama</span>.
                </p>
              )}
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={dismiss}
              aria-label="Tutup saran pemasangan"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-muted transition hover:bg-white hover:text-ink"
            >
              <IconClose size={14} />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
