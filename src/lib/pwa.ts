type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

/** Web Install API (Chrome/Edge 158+): dialog pemasangan bawaan tanpa event. */
type WebInstallNavigator = Navigator & {
  install?: (manifestUrl?: string, options?: { id?: string }) => Promise<unknown>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

function hasWebInstall(): boolean {
  return typeof (navigator as WebInstallNavigator).install === 'function'
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

export function subscribeInstallPrompt(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** Tombol pasang bisa langsung memunculkan dialog pemasangan bawaan. */
export function getInstallPromptAvailable(): boolean {
  return deferred != null || hasWebInstall()
}

export async function runInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  // Jalur 1: prompt tertunda klasik Chromium (beforeinstallprompt).
  if (deferred) {
    const p = deferred
    await p.prompt()
    const choice = await p.userChoice
    deferred = null
    emit()
    return choice.outcome === 'accepted' ? 'accepted' : 'dismissed'
  }
  // Jalur 2: Web Install API — satu ketukan, dialog pemasangan bawaan.
  // Dipanggil segera dari handler ketukan tanpa await di depannya agar
  // jendela aktivasi pengguna masih berlaku.
  const installFn = (navigator as WebInstallNavigator).install
  if (typeof installFn === 'function') {
    try {
      await installFn.call(navigator)
      return 'accepted'
    } catch {
      // Pengguna menutup dialog, aplikasi sudah terpasang, atau
      // syarat pemasangan tidak terpenuhi.
      return 'dismissed'
    }
  }
  return 'unavailable'
}
