/**
 * sw.js - Service Worker para PWA (Doctor2_Pro)
 * Soporta instalación nativa en PC/Android/iOS y caché offline de activos estáticos.
 */

const CACHE_NAME = 'doctor2-pro-v1.2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './css/patient-components.css',
  './css/components/login.css',
  './css/components/print.css',
  './css/components/analytics.css',
  './js/app.js',
  './js/modules/app-state.js',
  './js/modules/app-utils.js',
  './js/modules/app-auth.js',
  './js/modules/app-navigation.js',
  './js/modules/app-patients.js',
  './js/modules/app-professionals.js',
  './js/modules/app-calendar.js',
  './js/modules/app-treasury.js',
  './js/modules/app-inventory.js',
  './js/modules/app-notifications.js',
  './js/modules/app-voice-assistant.js',
  './js/modules/drug-interactions.js',
  './js/modules/historia-clinica.js',
  './js/modules/app-odontogram.js',
  './js/modules/app-budget.js'
];

// Instalación: Precargar activos estáticos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('⚡ [ServiceWorker] Precargando activos estáticos para uso offline');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('⚠️ [ServiceWorker] Fallo al precargar algunos activos:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activación: Limpieza de versiones viejas de caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🧹 [ServiceWorker] Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepción de solicitudes de red
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Peticiones de API dinámica (siempre ir a la red primero)
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ success: false, error: 'Sin conexión a internet (Modo Offline activo)' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 2. Activos estáticos (Stale-While-Revalidate: responder rápido de caché y actualizar en background)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // En background actualizar la caché
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return networkResponse;
      });
    })
  );
});
