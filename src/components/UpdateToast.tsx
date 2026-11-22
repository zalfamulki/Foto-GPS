import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export default function UpdateToast() {
  const swRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    swRef.current = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true)
      },
      onOfflineReady() {
        setOfflineReady(true)
      },
      onRegisteredSW(swUrl, r) {
        if (!r) return
        // Tab yang lama terbuka tetap memeriksa versi baru tiap jam.
        window.setInterval(async () => {
          if (document.hidden || !navigator.onLine) return
          try {
            const res = await fetch(swUrl, {
              cache: 'no-store',
              headers: { cache: 'no-store', 'cache-control': 'no-cache' },
            })
            if (res?.status === 200) await r.update()
          } catch {
            // sedang offline, cek lagi nanti
          }
        }, 60 * 60 * 1000)
      },
    })
  }, [])

  useEffect(() => {
    if (!offlineReady) return
    const t = window.setTimeout(() => setOfflineReady(false), 5000)
    return () => window.clearTimeout(t)
  }, [offlineReady])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center p-3">
      <AnimatePresence>
        {needRefresh ? (
          <motion.div
            key="update"
            initial={{ y: -28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -28, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg"
            role="status"
          >
            <span className="text-sm text-ink">Versi baru tersedia</span>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => void swRef.current?.(true)}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-brand-strong"
            >
              Muat ulang
            </motion.button>
          </motion.div>
        ) : offlineReady ? (
          <motion.div
            key="offline"
            initial={{ y: -28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -28, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-lg"
            role="status"
          >
            Aplikasi siap dipakai offline
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
