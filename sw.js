// ============================================================
// sw.js — Service Worker
//
// Section 6 requirements:
//  - Cache index.html, CSS/JS, the SheetJS library, and the
//    Excel data files (the latter after their first successful
//    fetch, since we don't want to hard-fail install if a
//    dataset happens to be missing).
//  - The app must keep working offline once everything has been
//    cached at least once.
//
// Strategy: cache-first for the app shell (static, versioned by
// CACHE_NAME), network-first-with-cache-fallback for the Excel
// data files (so an updated spreadsheet is picked up when
// online, but the last good copy still works offline).
// ============================================================

const CACHE_NAME = 'karate-quiz-v1';

const APP_SHELL = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/state.js',
  'js/quiz.js',
  'js/timer.js',
  'js/excel.js',
  'js/settings.js',
  'js/storage.js',
  'js/ui.js',
  'js/utils.js',
  'vendor/xlsx.full.min.js',
  'manifest.json',
];

const DATA_FILES = ['data/qkumite.xlsx', 'data/qkata.xlsx', 'data/mini-affirmations.xlsx'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Cache what we can; a single missing optional asset (e.g. an
      // Excel file not yet present) must not fail the whole install.
      Promise.allSettled(
        [...APP_SHELL, ...DATA_FILES].map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[sw] could not pre-cache', url, err);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isDataFile(url) {
  return DATA_FILES.some((f) => url.endsWith(f));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // don't intercept cross-origin

  if (isDataFile(url.pathname) || DATA_FILES.some((f) => url.pathname.endsWith(f))) {
    // Network-first so a corrected/updated Excel file is picked up
    // when online; cache the fresh copy for the next offline run.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // App shell: cache-first for speed and full offline capability.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
