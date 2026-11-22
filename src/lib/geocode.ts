import { db } from '../db'
import type { GeoFix } from './geo'

const ENDPOINT = 'https://nominatim.openstreetmap.org/reverse'
const TTL = 90 * 24 * 60 * 60 * 1000

export const GEOCODE_ATTRIBUTION = 'Data alamat dan peta dari OpenStreetMap'

export function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`
}

export interface AddressResult {
  /** Alamat satu baris untuk tampilan dan penyimpanan. */
  full: string
  /** Baris alamat terstruktur (jalan, desa, kecamatan/kabupaten, provinsi) untuk watermark. */
  lines: string[]
}

interface NominatimResponse {
  display_name?: string
  address?: Record<string, string | undefined>
}

function composeAddress(data: NominatimResponse): AddressResult | null {
  const a = data.address ?? {}
  const raw = [
    a.road,
    a.neighbourhood ?? a.suburb ?? a.village ?? a.hamlet,
    a.city ?? a.town,
    a.county,
    a.state,
  ]
  const lines: string[] = []
  const seen = new Set<string>()
  for (const p of raw) {
    if (!p) continue
    const k = p.trim().toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    lines.push(p.trim())
  }
  if (lines.length === 0) {
    const dn = data.display_name
    if (!dn) return null
    return { full: dn, lines: dn.split(',').map((s) => s.trim()).slice(0, 5) }
  }
  return { full: lines.join(', '), lines }
}

/** Ambil alamat dari koordinat, dengan cache IndexedDB agar hemat kuota dan jalan offline. */
export async function reverseGeocode(fix: GeoFix): Promise<AddressResult | null> {
  const key = cacheKey(fix.lat, fix.lon)
  const hit = await db.geocache.get(key)
  if (hit && Date.now() - hit.cachedAt < TTL) {
    return { full: hit.address, lines: hit.lines ?? hit.address.split(', ') }
  }
  try {
    const url = `${ENDPOINT}?lat=${fix.lat}&lon=${fix.lon}&format=jsonv2&zoom=18&addressdetails=1&accept-language=id`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as NominatimResponse
    const result = composeAddress(data)
    if (result) {
      await db.geocache.put({
        key,
        address: result.full,
        lines: result.lines,
        cachedAt: Date.now(),
      })
    }
    return result
  } catch {
    return null
  }
}
