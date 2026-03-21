# Info Kajian — Changelog

---

## v1.1.0 — Fitur Baru & Design Refresh
> Diperbarui dari v1.0.0

---

### ✨ Fitur Baru

#### 1. Export Kalender (iCal / Google Calendar)
- Tombol **"Google Calendar"** dan **"Unduh .ics"** ditambahkan di halaman detail setiap kajian
- **Google Calendar**: membuka langsung URL GCal dengan semua field terisi (judul, waktu WIB, lokasi, pembicara, deskripsi). Durasi kajian otomatis 90 menit.
- **Unduh .ics**: generate file `.ics` yang kompatibel dengan Apple Calendar, Outlook, dan kalender apapun yang mendukung iCalendar format
- **Export bulk .ics** di Admin Dashboard: tombol "Export Feed .ics (GitHub Actions)" menghasilkan satu file berisi semua kajian approved — dipakai sebagai feed statis untuk deployment via GitHub Pages + GitHub Actions (`webcal://` subscribe)
- Encoding menggunakan `base64` data URI (`btoa` + `unescape(encodeURIComponent())`) agar kompatibel di semua browser tanpa error CSP

#### 2. Badge System (11 Badge)
- Screen baru: **Badge & Streak** (accessible dari menu Profil)
- 11 badge terbagi dalam 5 kategori dengan tier **Bronze / Silver / Gold**:

| Badge | Kategori | Syarat | Tier |
|---|---|---|---|
| 🌱 Langkah Pertama | Kehadiran | Hadir 1 kajian | Bronze |
| 📖 Penuntut Ilmu | Kehadiran | Hadir 5 kajian | Silver |
| 🏛️ Thaalib | Kehadiran | Hadir 10 kajian | Gold |
| 🌟 Rajin Hadir | Kehadiran | Hadir 25 kajian | Gold |
| 🔥 Api Semangat | Streak | Streak 3 minggu | Bronze |
| ⚡ Istiqomah | Streak | Streak 8 minggu | Silver |
| 🔖 Kolektor Ilmu | Bookmark | 5 kajian disimpan | Bronze |
| 🗺️ Musafir Ilmu | Kota | Kajian di 3 kota berbeda | Silver |
| ✍️ Pena Kontributor | Kontributor | Submit kajian pertama | Bronze |
| 📢 Penyebar Ilmu | Kontributor | Submit 5 kajian approved | Silver |
| 🤝 Anggota Ummah | Membership | Bergabung ke komunitas | Bronze |

- Badge yang belum earned ditampilkan greyed-out dengan syarat perolehannya
- Tap badge yang sudah earned → muncul toast nama + deskripsi badge

#### 3. Streak Mingguan
- Dihitung otomatis dari riwayat kehadiran (`state.attendances`)
- Streak = minggu berturut-turut dengan minimal 1 kehadiran
- Ditampilkan di halaman Badge dengan visual card gradient hijau + api 🔥
- Juga ditampilkan di profil header (stats mini: Hadir / Simpan / Streak / Badge)

#### 4. Papan Peringkat (Leaderboard)
- Screen baru: **Papan Peringkat** (accessible dari menu Profil, tanpa perlu login)
- **Top Kontributor**: diranking berdasarkan jumlah kajian yang sudah approved
- **Top Pengguna Aktif**: diranking berdasarkan jumlah kehadiran
- Medali 🥇🥈🥉 untuk rank 1–3
- Highlight biru untuk baris "Anda" jika user sudah login
- Stats mini user di atas leaderboard (Kehadiran, Badge, Streak)

#### 5. RSS / iCal Feed via GitHub Actions
- Fitur infrastruktur: Admin dapat export file `.ics` berisi semua kajian approved
- File ini di-commit ke GitHub Pages → user subscribe sekali via `webcal://` URL
- Setiap ada kajian baru di-approve, admin export ulang → semua subscriber kalender otomatis dapat update tanpa action tambahan

---

### 🎨 Design & UX

#### 6. Ornamen Geometri Islam
- Pattern bintang 12 sudut (girih) ditambahkan sebagai background dekoratif di:
  - Hero beranda (opacity 7%)
  - Hero detail kajian (opacity 5%)
- Menggunakan CSS `::before` pseudo-element + SVG data URI — zero performance cost

#### 7. Staggered Card Animation
- Kajian cards (`.kcard`) muncul dengan animasi fade+slide bertahap (delay 30ms per card, hingga card ke-5)
- Memberikan kesan UI yang lebih "hidup" saat pertama kali load

#### 8. Ripple Effect
- Tap effect pada `.btn-p` dan `.kcard` menampilkan ripple lingkaran transparan
- Diimplementasikan via event delegation `pointerdown` — tidak ada event listener per-elemen
- Elemen ripple dihapus otomatis setelah animasi selesai (600ms)

#### 9. Profile Hero Upgrade (logged-in)
- Header profil berubah dari flat hijau → gradient dengan ornamen Islam
- Ditambahkan **4 stats mini** langsung di hero: Hadir, Simpan, Streak 🔥, Badge
- Avatar lebih besar dengan border putih transparan

#### 10. Profile Menu — Illustrated Icons
Setiap menu item di halaman profil kini memiliki icon bergradient warna dengan ilustrasi SVG yang lebih visual:

| Menu | Icon Style |
|---|---|
| Kajian Tersimpan | Bookmark solid emas di gradient kuning |
| Pengingat Kajian | Lonceng fill biru + dot notif di gradient biru |
| Riwayat Kehadiran | Circle hijau solid + centang putih tebal |
| Langganan Notifikasi | Lonceng merah fill di gradient pink |
| Badge & Streak | Emoji 🏅 di gradient oranye hangat |
| Papan Peringkat | Emoji 🏆 di gradient kuning-oranye |
| Donasi | Hati solid merah di gradient pink |
| Waktu Sholat | Circle biru + jarum jam putih |
| Arah Kiblat | Compass needle emas di circle hijau |
| Keluar | Arrow keluar merah di gradient merah muda |

#### 11. Login Value Props (Guest Profile)
- Halaman profil untuk guest yang belum login berubah dari sekedar "Belum Login" → menampilkan **4 value prop cards** (Bookmark Sync, Badge & Streak, Notif Personal, Leaderboard) sebelum tombol login
- Tujuan: menjelaskan alasan konkret kenapa perlu login

#### 12. Contextual Login Nudge
- Tap tombol **Simpan** atau **Pengingat** tanpa login → muncul bottom sheet modal dengan 4 value prop cards + CTA login
- Lebih informatif vs sebelumnya yang hanya menampilkan toast singkat

---

### 🐛 Bug Fixes

| # | Bug | Fix |
|---|---|---|
| 1 | `TypeError: Cannot set property currentTarget` saat klik kajian card | Fungsi ripple diubah — element dikirim sebagai parameter terpisah, tidak di-assign ke read-only getter `Event.currentTarget` |
| 2 | Papan Peringkat & Badge screen kosong, nav naik ke atas | Screen `scr-leaderboard` dan `scr-badges` berada di luar `#app` div. Dipindahkan ke posisi yang benar: sebelum `#gnav`, di dalam `#app` |
| 3 | Unduh .ics: "This content is blocked" | `blob:` URL diblokir CSP. Diganti ke `data:text/calendar;base64,...` |
| 4 | Unduh .ics: `InvalidCharacterError: atob failed` | Data URI dengan `charset=utf-8` + `encodeURIComponent` diinterpretasikan sebagai base64 oleh beberapa browser. Fix: eksplisit gunakan `base64` + `btoa(unescape(encodeURIComponent()))` |

---

### 📁 File Stats

| | v1.0.0 | v1.1.0 |
|---|---|---|
| Total baris | 3.480 | ~3.980 |
| Screen baru | — | `scr-leaderboard`, `scr-badges` |
| Modal baru | — | `modal-login-nudge` |
| Fungsi JS baru | — | `exportToICal`, `exportAllICS`, `addToGCal`, `buildICSEvent`, `escapeICS`, `renderBadges`, `renderLeaderboard`, `calcStreak`, `getBadgesEarned`, `getMyKajianCount`, `getDistinctCities`, `showICSSaveModal` |
| CSS class baru | — | `.ornament-bg`, `.badge-*`, `.streak-card`, `.lb-row`, `.lb-rank`, `.cal-btn`, `.vp-grid`, `.gamif-header`, `.ripple` |
