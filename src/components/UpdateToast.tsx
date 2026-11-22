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

  if (!needRefresh && !offlineReady) return null

  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[60] flex justify-center p-3">
      {needRefresh ? (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg">
          <span className="text-sm text-zinc-200">Versi baru tersedia</span>
          <button
            type="button"
            onClick={() => void swRef.current?.(true)}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-brand-strong active:scale-95"
          >
            Muat ulang
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-zinc-300 shadow-lg">
          Aplikasi siap dipakai offline
        </div>
      )}
    </div>
  )
}
