# Rencana implementasi notifikasi Firebase

**Tujuan:** notifikasi waktu salat dan kajian approved ke inbox privat dan perangkat berizin.
**Arsitektur:** Cloud Functions menangani event publikasi serta outbox; Cloud Scheduler memicu pengolahan jadwal salat. FCM mengirim ke token privat perangkat. Service worker menampilkan satu notifikasi dan membuka URL origin resmi.
**Teknologi:** Firebase Auth, Firestore, Cloud Functions, Scheduler, FCM, PWA.
**Spesifikasi:** ../specs/notifications-design.md

## Batas global
Google dipertahankan, OTP tidak kembali. Admin tetap satu-satunya pengelola katalog penuh. Jangan aktivasi billing atau layanan berbayar sebelum persetujuan. Jangan menggunakan grant IAM mandiri. Uji hanya data dan perangkat yang disetujui.

## Fokus peninjauan
- Duplikasi penerima masjid+ustaz dan retry trigger.
- Zona waktu, tanggal berganti, lokasi berubah, TTL azan.
- Logout/login akun lain pada perangkat yang sama.
- Pengguna menolak izin atau iOS belum terpasang ke layar utama.
- Balapan penyimpanan inbox, respons FCM parsial dan token kedaluwarsa.

## 1. Prasyarat infrastruktur
- [x] Periksa izin akun layanan: hanya cloudmessaging.messages.create tersedia untuk kebutuhan yang diuji.
- [x] Periksa Scheduler: API belum aktif; Functions list ditolak.
- [ ] Administrator project memeriksa billing aktif/tidak dan menyetujui perkiraan biaya berdasarkan wilayah, pengguna, operasi, serta frekuensi jadwal. Tidak ada angka biaya ditebak.
- [ ] Administrator memberikan izin deployment terbatas: pengelolaan Cloud Functions, Scheduler, serta actAs hanya pada service account runtime terpilih; konfigurasi Cloud Build/Artifact Registry/Eventarc/Run sesuai proses Functions generasi kedua. Service Usage Admin hanya jika perlu mengaktifkan API; jangan beri Owner/Editor sebagai jalan pintas.
- [ ] Verifikasi API Functions, Run, Build, Artifact Registry, Eventarc, Pub/Sub, Scheduler dan FCM tersedia; aktifkan hanya setelah biaya disetujui.

## 2. Registrasi perangkat dan inbox
Berkas: index.html, firestore.rules; tests/notifications-client.cjs dan tes rules.
- [ ] Tes gagal izin/registrasi gagal tidak menampilkan status aktif; token terikat UID/perangkat, logout melepas token, akun lain tidak bisa membaca.
- [ ] Buat pengaturan privat, registrasi perangkat, inbox event ber-ID stabil, status pending/sent/failed yang jujur; jangan menimpa inbox dengan array state klien.
- [ ] Tes lulus termasuk simpan bersamaan, lalu commit.

## 3. Pengiriman kajian dan service worker
Berkas: functions/index.js, functions/notifications.js, firebase-messaging-sw.js.
- [ ] Tes gagal published-only, deduplikasi pengikut/event, retry, token invalid, URL asing, klik deep link, pesan foreground/background.
- [ ] Implementasi outbox dan satu jalur penampilan notifikasi, origin https://www.infokajian.app; tidak menyamakan FCM accepted dengan delivered.
- [ ] Jalankan tes lalu commit; deploy hanya setelah tahap 1 siap.

## 4. Jadwal salat
Berkas: functions/prayer-notifications.js; pengaturan di index.html.
- [ ] Tes gagal lima pilihan salat, kota/GPS, zona waktu, pergantian hari, pengingat opsional, TTL, duplikasi, sumber jadwal gagal.
- [ ] Implementasikan cache jadwal tervalidasi, pencarian tugas jatuh tempo terindeks (bukan scan semua user setiap menit), outbox dan retry terbatas.
- [ ] Uji gagal/lulus dan commit.

## 5. Verifikasi dan peluncuran
- [ ] Emulator rules + backend tests + UI tanpa mengirim ke pengguna umum.
- [ ] Review terpisah dan deployment rules/functions/index/SW dengan readback versi serta hash.
- [ ] Tes notifikasi ke satu perangkat pengguna yang setuju: saat aplikasi dibuka, ditutup, lalu ketuk menuju detail; cek inbox tanpa duplikat.
- [ ] Laporkan batas iOS/Android dan hasil perangkat nyata; jangan klaim suara azan penuh otomatis tersedia.

Status: rancangan disetujui dalam percakapan; pengguna memilih Firebase dan meminta konfirmasi biaya sebelum aktivasi. Implementasi produk belum dimulai, menunggu kesiapan akses dan persetujuan dokumen ini.
