# Rancangan notifikasi InfoKajian

Rancangan percakapan disetujui pengguna. Belum implementasi.

## Sasaran
Notifikasi waktu salat dan kajian baru masjid/ustaz yang diikuti masuk ke kotak notifikasi aplikasi serta perangkat yang memberi izin, termasuk ketika PWA ditutup. Tidak menjamin penerimaan atau bunyi karena jaringan, OS, mode Fokus dan pencabutan izin.

## Pengaturan
Pilihan lima waktu salat, lokasi otomatis atau kota manual, zona waktu, pengingat sebelum salat opsional, status izin dan registrasi perangkat, tes notifikasi perangkat aktif. Waktu dari sumber tervalidasi, bukan jadwal contoh. Lokasi dipakai dengan persetujuan dan disimpan privat.

## Pengiriman
Penjadwal backend memproses jadwal salat dan outbox dengan ID stabil per UID/tanggal/salat/jenis; TTL pendek mencegah azan usang ketika koneksi pulih. Kajian hanya mengirim saat publikasi approved, deduplikasi gabungan pengikut masjid/ustaz. Inbox tersimpan terpisah dari state yang dapat ditimpa klien. Token perangkat privat multi-perangkat, dilepas saat logout; token invalid dibersihkan tanpa menganggap semua invalid-argument berarti token rusak. Status FCM accepted dibedakan dari bukti tampil di perangkat. Retry terbatas dan log tanpa token/PII.

Service worker satu jalur penampilan agar tidak ganda, URL klik dibatasi origin www.infokajian.app, deep link diuji. iOS memerlukan pemasangan Home Screen dan dukungan Web Push; izin diminta lewat tindakan pengguna. Tidak menjanjikan suara azan panjang otomatis di background.

## Keamanan dan batas
Google tetap, OTP tidak kembali, kontrol admin tetap. Tidak kirim tes ke seluruh pengguna atau membuat kajian palsu di katalog publik. Tidak mengaktifkan biaya tanpa izin.

## Temuan akses terverifikasi
Service account mempunyai cloudmessaging.messages.create. Tidak memiliki cloudfunctions.functions.list/create/update, cloudscheduler.jobs.create/list/update, serviceusage.services.enable, iam.serviceAccounts.actAs menurut testIamPermissions. Cloud Scheduler API belum aktif (403 SERVICE_DISABLED). Karena itu jalur deployment Firebase native belum dapat dilakukan dengan kredensial sekarang. Jangan mencoba meningkatkan IAM sendiri.

Pilihan yang perlu diputuskan: Firebase Cloud Functions + Scheduler dengan akses/billing yang sesuai; atau worker pada server yang tersedia tanpa aktivasi billing Firebase tambahan (memerlukan pemeriksaan durabilitas server dan jadwal, serta berpotensi biaya operasi Firestore). Belum memilih diam-diam.

## Verifikasi penerimaan
Tes unit deduplikasi/waktu/zona/TTL, aturan UID inbox/token/settings, integrasi pengiriman FCM, serta satu tes HP milik pengguna saat PWA ditutup. Tidak klaim selesai hanya berdasarkan HTTP 200 FCM.
