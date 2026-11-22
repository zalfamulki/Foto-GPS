import { useEffect, useState, type ComponentType } from 'react'
import CameraView from './components/CameraView'
import Gallery from './components/Gallery'
import Settings from './components/Settings'
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

  // Minta proteksi data sejak awal agar IndexedDB tidak dibersihkan browser otomatis.
  useEffect(() => {
    void ensurePersistentStorage()
  }, [])

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col bg-canvas">
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {tab === 'kamera' && <CameraView />}
        {tab === 'galeri' && <Gallery onGoCamera={() => setTab('kamera')} />}
        {tab === 'pengaturan' && <Settings />}
      </main>
      <nav
        aria-label="Navigasi utama"
        className="flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
              tab === id ? 'text-brand' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon size={22} />
            {label}
          </button>
        ))}
      </nav>
      <UpdateToast />
    </div>
  )
}
