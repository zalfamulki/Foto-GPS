import { unzip, zip, strFromU8, strToU8, type Unzipped, type Zippable } from 'fflate'
import { db, type PhotoRecord } from '../db'
import { makeThumb } from './watermark'

interface PhotoMeta {
  id: string
  file: string
  mapFile?: string
  lat: number | null
  lon: number | null
  accuracy: number | null
  address: string | null
  takenAt: number
  width: number
  height: number
}

/** Kemas semua foto + metadata.json menjadi satu berkas ZIP. */
export async function exportPhotosZip(photos: PhotoRecord[]): Promise<Blob> {
  const files: Zippable = {}
  const metas: PhotoMeta[] = []
  for (const p of photos) {
    const buf = new Uint8Array(await p.blob.arrayBuffer())
    const name = `${p.id}.jpg`
    files[name] = [buf, { level: 0 }]
    let mapFile: string | undefined
    if (p.mapBlob) {
      mapFile = `${p.id}.map.jpg`
      files[mapFile] = [new Uint8Array(await p.mapBlob.arrayBuffer()), { level: 0 }]
    }
    metas.push({
      id: p.id,
      file: name,
      mapFile,
      lat: p.lat,
      lon: p.lon,
      accuracy: p.accuracy,
      address: p.address,
      takenAt: p.takenAt,
      width: p.width,
      height: p.height,
    })
  }
  const manifest = {
    app: 'Foto GPS',
    format: 1,
    exportedAt: new Date().toISOString(),
    photos: metas,
  }
  files['metadata.json'] = [strToU8(JSON.stringify(manifest, null, 2)), { level: 6 }]

  return new Promise((resolve, reject) => {
    zip(files, (err, data) => {
      if (err) reject(err)
      else resolve(new Blob([data as unknown as BlobPart], { type: 'application/zip' }))
    })
  })
}

/** Pulihkan foto dari berkas ZIP cadangan. Return jumlah foto yang berhasil diimpor. */
export async function importPhotosZip(file: File): Promise<number> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const entries = await new Promise<Unzipped>((resolve, reject) => {
    unzip(buf, (err, data) => (err ? reject(err) : resolve(data)))
  })

  const raw = entries['metadata.json']
  if (!raw) throw new Error('Berkas ZIP tidak berisi metadata.json dari Foto GPS')
  let manifest: { photos?: PhotoMeta[] }
  try {
    manifest = JSON.parse(strFromU8(raw))
  } catch {
    throw new Error('metadata.json di dalam ZIP tidak valid')
  }

  const list = manifest.photos ?? []
  let count = 0
  for (const m of list) {
    const data = entries[m.file]
    if (!data) continue
    const blob = new Blob([data as unknown as BlobPart], { type: 'image/jpeg' })
    const mapData = m.mapFile ? entries[m.mapFile] : undefined
    const mapBlob = mapData
      ? new Blob([mapData as unknown as BlobPart], { type: 'image/jpeg' })
      : null
    const thumb = await makeThumb(blob).catch(() => blob)
    await db.photos.put({
      id: m.id,
      blob,
      thumb,
      mapBlob,
      width: m.width,
      height: m.height,
      lat: m.lat,
      lon: m.lon,
      accuracy: m.accuracy,
      address: m.address,
      takenAt: m.takenAt,
    })
    count += 1
  }
  if (count === 0) throw new Error('Tidak ada foto yang cocok dengan metadata')
  return count
}
