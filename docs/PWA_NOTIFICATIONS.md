# PWA and Notifications

## Offline behavior

The production service worker caches the application shell and same-origin runtime assets. Navigation uses network-first behavior with cached fallback; static assets use cached responses with background refresh when possible.

DHS App no longer requires Tailwind CDN, Google Fonts, remote manifest icons, or AI runtime configuration for the main UI.

## Reminder queue

The client sends upcoming reminders to the service worker. The queue is also persisted in Cache Storage so it can be restored when the service worker wakes again.

Foreground timers provide the most reliable reminder behavior while the page is open.

## Platform limitation

A browser may suspend or terminate service workers. `setInterval` inside a service worker is not a guaranteed scheduler. Periodic Background Sync is not supported consistently across browsers and operating systems.

Therefore DHS App reminders are **best-effort** when the app is closed. Guaranteed closed-app delivery would require a real Web Push backend that sends push events at the correct time.

## Permissions

Notification and geolocation permissions remain under user/browser control. The app falls back to Jakarta coordinates for prayer scheduling if location access is unavailable.
