/* TJMG Fiscal — Service Worker v82
   Estratégia: network-first para TODOS os assets locais
   (garante que bugs corrigidos cheguem ao usuário imediatamente)
   v82-fix: paleta TJMG consistente, dark-mode removido
*/

const V = 'tjmg-v87';
const BYPASS = [
  'supabase.co',
  'googleapis.com',
  'gstatic.com',
  'firebase',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'script.google.com',
  'dns.google',
  'unpkg.com'
];

/* ── Install: pré-cache dos assets essenciais ── */
var PRECACHE_URLS = [
  './', './index.html', './design.css', './manifest.json',
  './config.js', './data.js', './state.js', './utils.js',
  './db.js', './photo-store.js', './sync.js', './auth.js',
  './router.js', './report-html.js', './report-pdf.js',
  './form.js', './extras.js', './admin.js', './imr.js',
  './map.js', './coords.js', './photo-annotate.js',
  './prontuario-edif.js', './audit.js',
  './icon-192.png', './icon-512.png', './favicon.ico'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(V).then(function(cache) {
      /* pré-cache silencioso — falhas individuais não bloqueiam */
      return Promise.allSettled(
        PRECACHE_URLS.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('[SW] pré-cache falhou:', url, err.message);
          });
        })
      );
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

/* ── Activate: limpa caches antigos ── */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== V; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* ── Mensagens (skipWaiting, BG_SYNC) ── */
self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting' || (e.data && e.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
  if (e.data && e.data.type === 'BG_SYNC') {
    /* Repassar sync para o app */
  }
});

/* ── Background Sync ── */
self.addEventListener('sync', function(e) {
  if (e.tag === 'tjmg-sync') {
    e.waitUntil(
      self.clients.matchAll().then(function(clients) {
        if (clients.length > 0) {
          clients[0].postMessage({ type: 'BG_SYNC' });
        }
      })
    );
  }
});

/* ── Push Notifications ── */
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) {
    data = { title: 'TJMG Fiscal', body: e.data ? e.data.text() : 'Nova notificação' };
  }
  e.waitUntil(
    self.registration.showNotification(data.title || 'TJMG Fiscal', {
      body:    data.body  || 'Você tem uma nova atualização.',
      icon:    './icon-192.png',
      badge:   './icon-192.png',
      tag:     data.tag   || 'tjmg-notif',
      data:    data.url   || './',
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = e.notification.data || './';
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.includes(self.location.origin) && 'focus' in list[i]) {
          return list[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

/* ── Fetch: NETWORK-FIRST para todos os assets locais ──────────────────────
   Motivo: garante que correções de bugs cheguem imediatamente sem o usuário
   precisar limpar cache manualmente. Fallback para cache se offline.
   Tempo limite de 4s: se a rede demorar, usa cache e atualiza depois.
*/
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;

  var url;
  try { url = new URL(e.request.url); } catch(err) { return; }

  /* Passa requisições externas direto para a rede */
  if (BYPASS.some(function(d) { return url.hostname.includes(d); })) return;
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    /* Tenta rede primeiro */
    fetch(e.request, { cache: 'no-store' }).then(function(response) {
      if (response && response.ok) {
        /* Atualiza cache com versão fresca */
        var copy = response.clone();
        caches.open(V).then(function(c) { c.put(e.request, copy); });
      }
      return response;
    }).catch(function() {
      /* Sem rede: usa cache ou index.html como fallback */
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
