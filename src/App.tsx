import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ComponentType } from 'react'
import CameraView from './components/CameraView'
import Gallery from './components/Gallery'
import Settings from './components/Settings'
import Splash from './components/Splash'
import UpdateToast from './components/UpdateToast'
import { IconCamera, IconGallery, IconSliders } from './components/Icons'
import { ensurePersistentStorage } from './db'

type Tab = 'kamera' | 'galeri' | 'pengaturan'
type IconComponent = ComponentType<{ size?: number; className?: string }>

const TABS: { id: Tab; label: string; Icon: IconComponent }[] = [
  { id: 'kamera', label: 'Kamera', Icon: IconCamera },
  { id: 'galeri', label: 'Galeri', Icon: IconGallery },
  { id: 'pengaturan', label: 'Pengaturan', Icon: IconSliders },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('kamera')
  const [booting, setBooting] = useState(true)

  // Minta proteksi data sejak awal; splash tampil minimal 1,7 detik.
  useEffect(() => {
    void ensurePersistentStorage()
    const t = window.setTimeout(() => setBooting(false), 1700)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-md flex-col bg-canvas text-ink">
      <main className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            className="absolute inset-0"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {tab === 'kamera' && <CameraView />}
            {tab === 'galeri' && <Gallery onGoCamera={() => setTab('kamera')} />}
            {tab === 'pengaturan' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav
        aria-label="Navigasi utama"
        className="relative z-10 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-sm"
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? 'text-brand-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-x-6 top-0 h-[3px] rounded-full bg-brand"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <motion.span
                whileTap={{ scale: 0.85 }}
                className="flex flex-col items-center gap-1"
              >
                <Icon size={22} />
                {label}
              </motion.span>
            </button>
          )
        })}
      </nav>

      <UpdateToast />

      <AnimatePresence>{booting && <Splash key="splash" />}</AnimatePresence>
    </div>
  )
}
