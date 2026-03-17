importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyD4mdITD16NaPHaaK7zs6ToxvAlyCZA5V4',
  authDomain: 'infokajian-6e053.firebaseapp.com',
  projectId: 'infokajian-6e053',
  storageBucket: 'infokajian-6e053.firebasestorage.app',
  messagingSenderId: '175043780829',
  appId: '1:175043780829:web:fbde809754d37ba1e6fb34'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const n = payload.notification || {}, d = payload.data || {};
  return self.registration.showNotification(n.title || 'Info Kajian', {
    body: n.body || '', tag: d.kajianId || 'info-kajian', data: d, vibrate: [200,100,200]
  });
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  const kid = (e.notification.data && e.notification.data.kajianId) || '';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cl) {
    for (var i = 0; i < cl.length; i++) {
      if ('focus' in cl[i]) { cl[i].postMessage({type:'NOTIF_CLICK',kajianId:kid}); return cl[i].focus(); }
    }
    if (clients.openWindow) return clients.openWindow(self.location.origin + (kid ? '?kajian=' + kid : '/'));
  }));
});