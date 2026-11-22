# Foto GPS

PWA kamera kurir: jepret foto, dan aplikasi otomatis memberi **watermark** berisi waktu (zona waktu perangkat), koordinat GPS, alamat lengkap, serta **kartu peta OpenStreetMap berpin** di dalam foto. Semua data tersimpan di perangkat, tanpa backend.

## Fitur

- **Kamera** live preview (`getUserMedia`) dengan fallback ke aplikasi kamera bawaan; ganti kamera depan/belakang.
- **Cermin cerdas**: webcam tunggal (laptop/PC) dan kamera depan ditampilkan serta disimpan seperti cermin sungguhan; kamera belakang HP tetap objektif.
- **GPS akurasi tinggi** (`enableHighAccuracy`) dengan indikator akurasi live; jepret saat sinyal terkunci.
- **Watermark modern**: scrim gradien, waktu WIB per perangkat, koordinat 6 desimal amber, alamat terstruktur per baris (Nominatim), kartu peta mini OSM berpin yang tingginya menyesuaikan blok alamat.
- **EXIF GPS tertanam** di setiap JPEG (lat/lon DMS, waktu, akurasi, datum WGS-84), bisa diverifikasi ulang dari detail foto.
- **Galeri** dengan thumbnail, detail lengkap (DMS, akurasi, alamat, peta, link Google Maps), unduh, hapus.
- **Cadangan ZIP**: ekspor semua foto + `metadata.json`, dan impor untuk pulihkan.
- **PWA**: install ke layar utama, jalan offline (service worker + precache), pembaruan otomatis tiap jam.
- **Penyimpanan persisten**: IndexedDB (Dexie) dengan `navigator.storage.persist()`, tampilan kuota, peta & alamat di-cache untuk penggunaan ulang offline.

## Stack

| Paket | Peran |
| --- | --- |
| Vite 8 + React 19 + TypeScript | Build & UI |
| Tailwind CSS 4 | Styling |
| vite-plugin-pwa 2 (Workbox 7.4.1) | Service worker, manifest, offline |
| Dexie 4 + dexie-react-hooks | IndexedDB (blob foto, cache alamat & peta) + live query |
| piexifjs | Menulis EXIF GPS ke JPEG |
| exifr | Membaca EXIF untuk verifikasi |
| fflate | Ekspor/impor cadangan ZIP |
| OpenStreetMap (Nominatim + tile) | Alamat & peta, tanpa API key |

## Menjalankan

```bash
npm install
npm run generate-pwa-assets   # ikon PWA dari public/icon.svg
npm run dev                   # pengembangan
npm run build && npm run preview   # build produksi
```

## Deploy

Statis, tanpa backend. Contoh Vercel:

```bash
npm i -g vercel
vercel --prod
```

Wajib HTTPS agar izin kamera & GPS aktif (otomatis di Vercel).

## Catatan

- Data tersimpan di IndexedDB perangkat dan tidak dikirim ke server. Pembersihan "site data" atau reset pabrik tetap bisa menghapusnya; buat cadangan ZIP berkala.
- Akurasi GPS meter-level butuh koneksi satelit langsung (di luar ruangan lebih akurat).
- Ikon aplikasi masih placeholder: ganti `public/icon.svg` lalu jalankan `npm run generate-pwa-assets`.
- Data alamat dan peta dari OpenStreetMap.
