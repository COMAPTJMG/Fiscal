/* TJMG Fiscal — Service Worker v71
   Estratégia:
   - App shell (index.html, sw.js, manifest.json, js/*.js) → network-first, fallback cache
   - Demais assets → cache-first, atualiza cache em background
   - Domínios externos (Supabase, CDN, Google) → nunca interceptados

   v71: Fase 4 da modularização — utils.js, router.js, auth.js ativados.
        index.html: 4791 → 4470 linhas (−321 / −7%).
        v68: Fase 3 — report-html.js extraído do index.html.
        Funções removidas do index: exportHTML, _gerarHTMLStr, _doExportHTML,
        exportHTMLSub, _gerarHTMLSubStr, _doExportHTMLSub, normProt,
        gerarProtocolo, gerarTipoLbl, enviarParaDrive, uploadHtmlToSupabase,
        enviarEmailRelatorio.
        Melhorias: page-break corrigido para grades de fotos; relatório de
        subestação redesenhado com identidade visual TJMG unificada.
        index.html: 5663 → 4791 linhas (−872 / −15%).
*/

const V = 'tjmg-v79c';
const CACHE = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './icon-192.png',
  './icon-512.png',
  /* ── Fase 1: módulos extraídos ── */
  './config.js',
  './data.js',
  './state.js',
  /* ── Fase 2: Sync, PhotoStore, DB ── */
  './photo-store.js',
  './sync.js',
  './db.js',
  /* ── Fase 3: geração de relatórios HTML ── */
  './report-html.js',
  './report-pdf.js',
  /* ── Fase 4: utils, router, auth ── */
  './utils.js',
  './router.js',
  './auth.js',
  './admin.js',
  './form.js',
  './coords.js',
  './map.js',
  './imr.js',
  './prontuario-edif.js',
  './photo-annotate.js',
  './audit.js',
  './design.css',
];

const BYPASS = [
  'supabase.co',
  'googleapis.com',
  'gstatic.com',
  'firebase',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'script.google.com',
  'dns.google'
];

/* ── Background Sync (v79) ── */
self.addEventListener('sync', function(e) {
  if (e.tag === 'tjmg-sync') {
    e.waitUntil(
      self.clients.matchAll().then(function(clients) {
        if (clients.length > 0) {
          clients[0].postMessage({type: 'BG_SYNC'});
        }
      })
    );
  }
});

/* ── Push Notifications (v78) ── */
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) { data = {title:'TJMG Fiscal', body: e.data ? e.data.text() : 'Nova notificação'}; }
  e.waitUntil(
    self.registration.showNotification(data.title || 'TJMG Fiscal', {
      body:    data.body    || 'Você tem uma nova atualização.',
      icon:    './icon-192.png',
      badge:   './icon-192.png',
      tag:     data.tag     || 'tjmg-notif',
      data:    data.url     || './',
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data) || './';
  e.waitUntil(clients.matchAll({type:'window'}).then(function(list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.includes(self.location.origin) && 'focus' in list[i]) {
        return list[i].focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});


self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(V).then(function(c) {
      return c.addAll(CACHE);
    }).catch(function(err) {
      console.warn('[SW] install cache falhou:', err);
    })
  );
  self.skipWaiting();
});

/* ── Activate: limpa caches antigos ── */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== V; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

/* ── Mensagens (skipWaiting) ── */
self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting' || (e.data && e.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

/* ── Fetch ── */
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;

  var url;
  try { url = new URL(e.request.url); } catch(err) { return; }

  /* Ignora domínios externos */
  if (BYPASS.some(function(d) { return url.hostname.includes(d); })) return;

  /* Ignora outras origens */
  if (url.origin !== self.location.origin) return;

  var path = url.pathname;
  var isShell = (
    path.endsWith('/index.html') ||
    path.endsWith('/sw.js')      ||
    path.endsWith('/manifest.json') ||
    path === '/' ||
    path.endsWith('/')
  );

  if (isShell) {
    /* Network-first para o app shell */
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(function(r) {
          if (r && r.ok) {
            /* Clona ANTES de retornar — body ainda não foi lido */
            var copy = r.clone();
            caches.open(V).then(function(c) { c.put(e.request, copy); });
          }
          return r;
        })
        .catch(function() {
          return caches.match(e.request)
            .then(function(hit) { return hit || caches.match('./index.html'); });
        })
    );
    return;
  }

  /* Cache-first para outros assets
     Background update: faz fetch separado para não reutilizar body */
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        /* Atualiza o cache em background com um fetch independente */
        caches.open(V).then(function(c) {
          fetch(e.request).then(function(fresh) {
            if (fresh && fresh.ok) c.put(e.request, fresh);
          }).catch(function() {});
        });
        return cached;
      }
      /* Não tem cache — busca na rede e armazena */
      return fetch(e.request).then(function(r) {
        if (r && r.ok) {
          var copy = r.clone();
          caches.open(V).then(function(c) { c.put(e.request, copy); });
        }
        return r;
      });
    })
  );
});
