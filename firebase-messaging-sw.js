/**
 * firebase-messaging-sw.js
 * Service Worker FCM untuk Info Kajian PWA
 *
 * PENTING: File ini harus berada di ROOT domain (bukan subfolder)
 * agar scope-nya mencakup seluruh PWA.
 *
 * Letakkan sejajar dengan index.html:
 *   public/
 *     index.html
 *     firebase-messaging-sw.js   ← di sini
 *     manifest.json
 *     icons/
 */

// ─── 1. Import Firebase via CDN (compat version untuk SW) ────────────────────
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// ─── 2. Konfigurasi Firebase ──────────────────────────────────────────────────
// Salin dari Firebase Console → Project Settings → Your Apps → Web
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD4mdITD16NaPHaaK7zs6ToxvAlyCZA5V4",
  authDomain: "infokajian-6e053.firebaseapp.com",
  projectId: "infokajian-6e053",
  storageBucket: "infokajian-6e053.firebasestorage.app",
  messagingSenderId: "175043780829",
  appId: "1:175043780829:web:fbde809754d37ba1e6fb34",
  measurementId: "G-9SLY8STB0B"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ─── 3. Background message handler ───────────────────────────────────────────
/**
 * Dipanggil saat PWA tidak aktif (background/closed) dan pesan FCM tiba.
 * Firebase menampilkan notifikasi default jika ada field `notification`
 * di payload, TAPI kita override di sini supaya kita bisa kontrol penuh.
 */
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message received:", payload);

  // Pesan kini DATA-ONLY (CF tidak mengirim notification field) —
  // hanya SW ini yang menampilkan notifikasi, jadi tidak ada duplikat.
  const d = payload.data || {};
  const n = payload.notification || {};
  const title    = d.title || n.title || "Info Kajian";
  const body     = d.body  || n.body  || "";
  const kajianId = d.kajianId || "";
  const origin   = self.location.origin;

  const notificationOptions = {
    body  : body || "Ada kajian baru yang menarik untukmu!",
    icon  : `${origin}/icons/icon-192.png`,
    badge : `${origin}/icons/badge-72.png`,
    image : d.imageUrl || undefined,
    tag   : d.id ? `notif-${d.id}` : `notif-${kajianId || Date.now()}`,   // dedup per notif, bukan per kajian
    renotify    : false,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data  : {
      kajianId,
      type: d.type || "",
    },
    actions: [
      {
        action: "open_kajian",
        title : "📖 Lihat Kajian",
        icon  : `${origin}/icons/icon-96.png`,
      },
      {
        action: "dismiss",
        title : "Tutup",
      },
    ],
  };

  return self.registration.showNotification(title, notificationOptions);
});

// ─── 4. Notifikasi click handler ──────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // "Tutup" → tidak buka apa-apa
  if (event.action === "dismiss") return;

  const kajianId = (event.notification.data || {}).kajianId || "";
  const url = kajianId
    ? `${self.location.origin}/?kajian=${encodeURIComponent(kajianId)}`  // deep link format yang dikenali klien
    : self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (new URL(c.url).origin === self.location.origin) {
          // App sudah terbuka: kirim pesan ke halaman (bukan navigate —
          // navigasi URL yang hanya beda hash tidak memicu apa pun)
          c.postMessage({ type: "NOTIF_CLICK", kajianId });
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ─── 5. Push event (fallback manual jika FCM SDK tidak handle) ───────────────
/**
 * Firebase messaging SDK biasanya handle ini secara internal,
 * tapi kita override sebagai safety net.
 */
self.addEventListener("push", (event) => {
  // Firebase messaging SDK handle ini via onBackgroundMessage.
  // Handler ini hanya aktif jika pesan dikirim tanpa Firebase SDK
  // (misal via Web Push Protocol langsung).
  if (event.data) {
    try {
      const payload = event.data.json();
      // Jika bukan payload Firebase (tidak ada field `fcmMessageId`)
      // berarti perlu kita handle manual.
      if (!payload.fcmMessageId) {
        const title   = payload.title || "Info Kajian";
        const options = {
          body  : payload.body || "",
          icon  : `${self.location.origin}/icons/icon-192.png`,
          badge : `${self.location.origin}/icons/badge-72.png`,
          data  : payload.data || {},
        };
        event.waitUntil(self.registration.showNotification(title, options));
      }
    } catch (_) {
      // bukan JSON, abaikan
    }
  }
});

// ─── 6. Service Worker lifecycle ─────────────────────────────────────────────
self.addEventListener("install", () => {
  console.log("[SW] firebase-messaging-sw.js installed.");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] firebase-messaging-sw.js activated.");
  event.waitUntil(clients.claim());
});
