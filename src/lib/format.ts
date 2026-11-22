const dtf = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'medium',
})
const dtfShort = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function fmtDateTime(ms: number): string {
  return dtf.format(new Date(ms))
}

export function fmtDateShort(ms: number): string {
  return dtfShort.format(new Date(ms))
}

const dtfDateLong = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const dtfTimeTz = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'short',
})

/** Contoh: "Minggu, 23 November 2026 00.13.23 WIB" (zona waktu perangkat). */
export function fmtDateTimeTz(ms: number): string {
  return `${dtfDateLong.format(new Date(ms))} ${dtfTimeTz.format(new Date(ms))}`
}

export function fmtCoords(lat: number, lon: number, accuracy: number | null): string {
  const acc = accuracy != null ? ` (±${Math.round(accuracy)} m)` : ''
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}${acc}`
}

export function fmtDms(deg: number, axis: 'lat' | 'lon'): string {
  const hemi = axis === 'lat' ? (deg >= 0 ? 'N' : 'S') : deg >= 0 ? 'E' : 'W'
  const abs = Math.abs(deg)
  const d = Math.floor(abs)
  const mFloat = (abs - d) * 60
  const m = Math.floor(mFloat)
  const s = ((mFloat - m) * 60).toFixed(1)
  return `${hemi} ${d}° ${m}' ${s}"`
}

export function fmtBytes(n: number): string {
  if (!n) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function photoFileName(p: { id: string; takenAt: number }): string {
  const d = new Date(p.takenAt)
  const pad = (v: number) => String(v).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return `fotogps-${stamp}-${p.id.slice(0, 6)}.jpg`
}
