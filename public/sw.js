// DHS App - Service Worker for PWA offline support and reminder delivery.
const CACHE_NAME = 'dhs-app-v1.0.0';
const scopeUrl = new URL('./', self.registration.scope);
const APP_SHELL = [
  scopeUrl.href,
  new URL('index.html', scopeUrl).href,
  new URL('manifest.webmanifest', scopeUrl).href,
  new URL('icon.svg', scopeUrl).href,
];
const SCHEDULE_KEY = new URL('__dhs_schedule__.json', scopeUrl).href;
let scheduledQueue = [];
let checkInterval = null;

const iconUrl = () => new URL('icon.svg', scopeUrl).href;

async function persistSchedule() {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(SCHEDULE_KEY, new Response(JSON.stringify(scheduledQueue), {
    headers: { 'Content-Type': 'application/json' },
  }));
}

async function restoreSchedule() {
  try {
    const cached = await caches.match(SCHEDULE_KEY);
    if (!cached) return;
    const value = await cached.json();
    if (Array.isArray(value)) scheduledQueue = value;
  } catch {
    scheduledQueue = [];
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => restoreSchedule())
      .then(() => self.clients.claim())
  );
});

async function showDHSNotification(title, options) {
  return self.registration.showNotification(title, {
    ...options,
    icon: options.icon || iconUrl(),
    badge: options.badge || iconUrl(),
    renotify: true,
    requireInteraction: false,
  });
}

async function runScheduledCheck() {
  if (!scheduledQueue.length) await restoreSchedule();

  const now = Date.now();
  const due = [];
  const remaining = [];

  scheduledQueue.forEach((item) => {
    if (item.timestamp <= now && now - item.timestamp < 60 * 60 * 1000) {
      due.push(item);
    } else if (item.timestamp > now) {
      remaining.push(item);
    }
  });

  scheduledQueue = remaining;
  await persistSchedule();

  await Promise.all(due.map((item) => showDHSNotification(item.title, {
    body: item.body,
    tag: item.tag || 'dhs-reminder',
    vibrate: [200, 100, 200],
    data: {
      tab: item.tab || 'checklist',
      type: item.type || 'reminder',
      timestamp: item.timestamp,
    },
    actions: [
      { action: 'open', title: 'Buka DHS App' },
      { action: 'dismiss', title: 'Nanti' },
    ],
  })));
}

function startCheckTimer() {
  if (!checkInterval) checkInterval = setInterval(() => void runScheduledCheck(), 15000);
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SCHEDULE_NOTIFICATIONS' && Array.isArray(data.payload)) {
    scheduledQueue = data.payload.filter((item) => item && Number(item.timestamp) > Date.now());
    event.waitUntil(persistSchedule());
    startCheckTimer();
  } else if (data.type === 'TEST_NOTIFICATION') {
    event.waitUntil(showDHSNotification(data.title || 'DHS App - Notifikasi Aktif', {
      body: data.body || 'Pengingat DHS App siap digunakan.',
      tag: 'dhs-test-notification',
      vibrate: [200, 100, 200],
      data: { tab: 'home', type: 'test' },
    }));
  } else if (data.type === 'CLEAR_SCHEDULE') {
    scheduledQueue = [];
    event.waitUntil(persistSchedule());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetTab = event.notification.data?.tab || 'checklist';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'NAVIGATE_TAB', tab: targetTab });
          return client.focus();
        }
      }
      return self.clients.openWindow?.(new URL(`./#tab=${encodeURIComponent(targetTab)}`, scopeUrl).href);
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'dhs-check-reminders') event.waitUntil(runScheduledCheck());
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'dhs-periodic-reminders') event.waitUntil(runScheduledCheck());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.href === SCHEDULE_KEY) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(async () =>
          (await caches.match(event.request)) ||
          (await caches.match(scopeUrl.href)) ||
          (await caches.match(new URL('index.html', scopeUrl).href))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
