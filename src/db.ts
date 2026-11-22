import Dexie, { type Table } from 'dexie'

export interface PhotoRecord {
  id: string
  blob: Blob
  thumb: Blob
  /** Citra peta statis dengan pin lokasi (bisa tidak ada bila offline). */
  mapBlob?: Blob | null
  width: number
  height: number
  lat: number | null
  lon: number | null
  accuracy: number | null
  address: string | null
  takenAt: number
}

export interface GeoCacheRecord {
  key: string
  address: string
  lines?: string[]
  cachedAt: number
}

export interface MapCacheRecord {
  key: string
  blob: Blob
  cachedAt: number
}

export class FotoGpsDb extends Dexie {
  photos!: Table<PhotoRecord, string>
  geocache!: Table<GeoCacheRecord, string>
  mapcache!: Table<MapCacheRecord, string>

  constructor() {
    super('fotogps')
    this.version(1).stores({
      photos: 'id, takenAt',
      geocache: 'key',
    })
    this.version(2).stores({
      photos: 'id, takenAt',
      geocache: 'key',
      mapcache: 'key',
    })
  }
}

export const db = new FotoGpsDb()

/** Minta browser melindungi data IndexedDB dari pembersihan otomatis (eviction). */
export async function ensurePersistentStorage(): Promise<boolean> {
  const storage = navigator.storage
  if (!storage?.persist) return false
  try {
    if (await storage.persisted()) return true
    return await storage.persist()
  } catch {
    return false
  }
}

export interface StorageInfo {
  usage: number
  quota: number
  persisted: boolean
  supported: boolean
}

export async function readStorageInfo(): Promise<StorageInfo> {
  const storage = navigator.storage
  const persisted = storage?.persisted
    ? await storage.persisted().catch(() => false)
    : false
  if (!storage?.estimate) {
    return { usage: 0, quota: 0, persisted, supported: false }
  }
  const est = await storage.estimate()
  return {
    usage: est.usage ?? 0,
    quota: est.quota ?? 0,
    persisted,
    supported: true,
  }
}

export function deleteAllPhotos(): Promise<void> {
  return db.photos.clear()
}
