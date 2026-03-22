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
const firebaseConfig = {
  apiKey           : "YOUR_API_KEY",
  authDomain       : "YOUR_PROJECT_ID.firebaseapp.com",
  projectId        : "YOUR_PROJECT_ID",
  storageBucket    : "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId            : "YOUR_APP_ID",
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

  const { title, body } = payload.notification || {};
  const data            = payload.data          || {};

  const kajianId    = data.kajianId    || "";
  const kajianTitle = data.kajianTitle || title || "Kajian Baru";
  const pwaUrl      = self.location.origin;

  const notificationOptions = {
    body  : body || "Ada kajian baru yang menarik untukmu!",
    icon  : `${pwaUrl}/icons/icon-192.png`,
    badge : `${pwaUrl}/icons/badge-72.png`,
    image : data.imageUrl || undefined,
    tag   : `kajian-${kajianId}`,            // Ganti notif lama dengan kajianId sama
    renotify    : false,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data  : {
      kajianId,
      url: kajianId
        ? `${pwaUrl}/#/kajian/${kajianId}`
        : `${pwaUrl}/`,
    },
    actions: [
      {
        action: "open_kajian",
        title : "📖 Lihat Kajian",
        icon  : `${pwaUrl}/icons/icon-96.png`,
      },
      {
        action: "dismiss",
        title : "Tutup",
      },
    ],
  };

  return self.registration.showNotification(
    title || kajianTitle,
    notificationOptions
  );
});

// ─── 4. Notifikasi click handler ──────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data     = event.notification.data || {};
  const action   = event.action;
  const targetUrl = data.url || self.location.origin;

  // Jika user klik "Tutup" → tidak buka apa-apa
  if (action === "dismiss") return;

  // Untuk "open_kajian" atau klik notif langsung → buka PWA
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Cek apakah PWA sudah terbuka di tab manapun
        for (const client of windowClients) {
          const clientUrl = new URL(client.url);
          const swOrigin  = new URL(self.location.origin);

          if (clientUrl.origin === swOrigin.origin) {
            // PWA sudah terbuka → navigasi ke kajian + focus
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // PWA belum terbuka → buka tab baru
        return clients.openWindow(targetUrl);
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
