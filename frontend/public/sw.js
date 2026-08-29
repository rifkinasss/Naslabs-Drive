const CACHE_NAME = 'cloud-nl-shell-v1'
const SHELL_ASSETS = ['/', '/drive', '/icon.svg', '/apple-icon.svg']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)

  // Never cache API responses, uploads, previews, or downloads from the private drive.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(request).then(response => {
      if (response.ok && (request.mode === 'navigate' || url.pathname.startsWith('/_next/static/'))) {
        const copy = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
      }
      return response
    }).catch(() => caches.match(request).then(cached => cached || caches.match('/')))
  )
})
