# Lokasnap

PWA kamera untuk **mendokumentasikan lokasi**: jepret foto, dan aplikasi otomatis memberi **watermark** berisi waktu (zona waktu perangkat), koordinat GPS, alamat lengkap, serta **kartu peta berpin** di dalam foto. Dibuat untuk khalayak umum: dokumentasi kunjungan, kondisi lapangan, pengiriman, perjalanan, atau kebutuhan pribadi. Semua data tersimpan di perangkat, tanpa backend.

## Fitur

- **Kamera** live preview (`getUserMedia`) dengan fallback ke aplikasi kamera bawaan; ganti kamera depan/belakang.
- **Senter** untuk kamera belakang yang mendukung, dan **zoom pinch** langsung dari layar pratinjau (mengikuti kemampuan perangkat).
- **Cermin cerdas**: webcam tunggal (laptop/PC) dan kamera depan ditampilkan serta disimpan seperti cermin sungguhan; kamera belakang tetap objektif.
- **GPS akurasi tinggi** (`enableHighAccuracy`) dengan indikator akurasi live; jepret saat sinyal terkunci.
- **Watermark modern**: scrim gradien, teks bergaris tepi agar tetap terbaca di foto terang, waktu per zona perangkat, koordinat 6 desimal amber, alamat terstruktur per baris (Nominatim), kartu peta mini berpin yang tingginya menyesuaikan blok alamat.
- **Pengaturan isi watermark**: aktif/nonaktifkan kartu peta, akurasi, label aplikasi, dan ukuran teks (kecil/sedang/besar).
- **EXIF GPS tertanam** di setiap JPEG (lat/lon DMS, waktu, akurasi, datum WGS-84), bisa diverifikasi ulang dari detail foto.
- **Galeri** dengan thumbnail, detail lengkap (DMS, akurasi, alamat, peta, link Google Maps), simpan ke galeri perangkat, hapus.
- **Simpan ke galeri perangkat**: ekspor foto lewat lembar bagikan OS — pilih "Simpan ke Galeri" (Android) atau "Simpan Gambar" (iPhone) — sehingga foto masuk galeri foto, bukan folder Unduhan; di desktop tetap unduh biasa, dan iOS tanpa Web Share berkas dibuka di tab baru (tekan lama → Tambahkan ke Foto).
- **Cadangan ZIP**: ekspor semua foto + `metadata.json`, dan impor untuk pulihkan.
- **Pasang mudah**: banner dan tombol pemasangan dengan panduan langkah-demi-langkah per perangkat.
- **PWA**: install ke layar utama, jalan offline (service worker + precache), pembaruan otomatis tiap jam.
- **Penyimpanan persisten**: IndexedDB (Dexie) dengan `navigator.storage.persist()`, tampilan kuota, alamat & peta di-cache untuk penggunaan ulang offline.

## Stack

| Paket | Peran |
| --- | --- |
| Vite 8 + React 19 + TypeScript | Build & UI |
| Tailwind CSS 4 | Styling |
| Motion 14 | Animasi antarmuka |
| vite-plugin-pwa 2 (Workbox 7.4.1) | Service worker, manifest, offline |
| Dexie 4 + dexie-react-hooks | IndexedDB (blob foto, cache alamat & peta) + live query |
| piexifjs | Menulis EXIF GPS ke JPEG |
| exifr | Membaca EXIF untuk verifikasi |
| fflate | Ekspor/impor cadangan ZIP |
| OpenStreetMap (Nominatim + ubin) | Alamat & peta, tanpa API key |

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
- Senter dan zoom hanya muncul bila perangkat mendukung (umumnya di HP).
- Ikon aplikasi masih placeholder: ganti `public/icon.svg` lalu jalankan `npm run generate-pwa-assets`.
- Atribusi: alamat dan peta dari OpenStreetMap.
