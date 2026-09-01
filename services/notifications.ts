// DHS App - Notification & Background Reminder Service
import { UserProfile, NotificationSettings } from '../types.ts';
import { calculatePrayerTimes } from './prayer.ts';

export interface ScheduledReminder {
  id: string;
  title: string;
  body: string;
  timestamp: number; // Unix epoch ms
  tag: string;
  type: 'prayer' | 'evaluation' | 'water' | 'sunnah' | 'test';
  tab: 'home' | 'checklist' | 'stats' | 'profile';
}

export interface InAppNotificationEvent {
  id: string;
  title: string;
  body: string;
  type: 'prayer' | 'evaluation' | 'water' | 'sunnah' | 'test';
  tab: 'home' | 'checklist' | 'stats' | 'profile';
  timestamp: number;
}

type NotificationListener = (event: InAppNotificationEvent) => void;

let activeTimers: NodeJS.Timeout[] = [];
let swRegistration: ServiceWorkerRegistration | null = null;
const listeners: Set<NotificationListener> = new Set();

const getPublicAssetUrl = (path: string): string =>
  new URL(`${import.meta.env.BASE_URL}${path}`, window.location.href).href;

export const notifications = {
  subscribe: (listener: NotificationListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  notifyListeners: (event: InAppNotificationEvent) => {
    listeners.forEach((cb) => {
      try {
        cb(event);
      } catch (e) {
        console.error('Error dispatching notification listener', e);
      }
    });
  },

  isSupported: (): boolean => {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  isServiceWorkerSupported: (): boolean => {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  },

  getPermission: (): NotificationPermission | 'unsupported' => {
    if (!notifications.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  requestPermission: async (): Promise<boolean> => {
    if (!notifications.isSupported()) return false;
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        await notifications.initServiceWorker();
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Error requesting notification permission (e.g. iframe policy):', e);
      return false;
    }
  },

  initServiceWorker: async (): Promise<ServiceWorkerRegistration | null> => {
    if (!notifications.isServiceWorkerSupported()) return null;
    try {
      if (!swRegistration) {
        await navigator.serviceWorker.register(getPublicAssetUrl('sw.js'));
        swRegistration = await navigator.serviceWorker.ready;
      }
      return swRegistration;
    } catch (e) {
      console.warn('Service worker registration failed:', e);
      return null;
    }
  },

  // Play pleasant chime on alert if sound is allowed
  playChime: () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Soft melodic arpeggio (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.45);
      });
    } catch {
      // Audio context might be restricted
    }
  },

  // Send an immediate notification (with In-App banner fallback + System notification)
  showImmediate: async (
    title: string,
    body: string,
    tab: 'home' | 'checklist' | 'stats' | 'profile' = 'checklist',
    type: 'prayer' | 'evaluation' | 'water' | 'sunnah' | 'test' = 'test'
  ) => {
    // 1. Always play melodious chime
    notifications.playChime();

    // 2. Always trigger in-app banner for visible user feedback
    notifications.notifyListeners({
      id: 'notif_' + Date.now(),
      title,
      body,
      tab,
      type,
      timestamp: Date.now()
    });

    // 3. Attempt native browser system notification if granted
    if (notifications.getPermission() === 'granted') {
      try {
        const reg = await notifications.initServiceWorker();
        if (reg) {
          reg.showNotification(title, {
            body,
            icon: getPublicAssetUrl('icon.svg'),
            badge: getPublicAssetUrl('icon.svg'),
            vibrate: [200, 100, 200],
            tag: 'dhs-instant-' + Date.now(),
            data: { url: '/', tab }
          } as any);
          return;
        }
      } catch {
        // Fallback
      }

      try {
        new Notification(title, {
          body,
          icon: getPublicAssetUrl('icon.svg'),
          tag: 'dhs-instant-' + Date.now()
        });
      } catch (e) {
        console.warn("Failed to display native notification", e);
      }
    }
  },

  // Generate scheduled reminder list for today & tomorrow
  buildSchedule: (
    user: UserProfile,
    coords: { lat: number; lng: number } = { lat: -6.2088, lng: 106.8456 }
  ): ScheduledReminder[] => {
    const config = user.notifications;
    if (!config || !config.enabled) return [];

    const reminders: ScheduledReminder[] = [];
    const now = new Date();

    const parseTimeToDate = (baseDate: Date, timeStr: string, offsetMinutes: number = 0): Date => {
      const [h, m] = timeStr.split(':').map(Number);
      const d = new Date(baseDate);
      d.setHours(h, m + offsetMinutes, 0, 0);
      return d;
    };

    // Helper for today and tomorrow
    [0, 1].forEach((dayOffset) => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const dayOfWeek = targetDate.getDay(); // 0: Sunday, 1: Monday, 4: Thursday, 5: Friday

      // 1. Shalat Reminders
      if (config.prayerReminder) {
        const timezoneHours = -targetDate.getTimezoneOffset() / 60;
        const schedule = calculatePrayerTimes(targetDate, coords.lat, coords.lng, timezoneHours, user.prayerOffsets || {});
        const prayerKeys = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'] as const;

        prayerKeys.forEach((pName) => {
          if (config.prayerSpecific?.[pName] !== false) {
            const prayerTimeStr = schedule[pName];
            if (prayerTimeStr) {
              const exactTime = parseTimeToDate(targetDate, prayerTimeStr, 0);

              // Exact time reminder
              if (exactTime.getTime() > now.getTime()) {
                reminders.push({
                  id: `prayer_${pName}_${targetDate.toDateString()}`,
                  title: `🕌 Waktunya Shalat ${pName} (${prayerTimeStr})`,
                  body: `Telah masuk waktu ${pName}. Mari raih keutamaan shalat di awal waktu & catat kualitas shalatmu!`,
                  timestamp: exactTime.getTime(),
                  tag: `prayer-${pName}`,
                  type: 'prayer',
                  tab: 'checklist'
                });
              }

              // Optional: X minutes before reminder
              if (config.prayerBeforeMinutes && config.prayerBeforeMinutes > 0) {
                const beforeTime = parseTimeToDate(targetDate, prayerTimeStr, -config.prayerBeforeMinutes);
                if (beforeTime.getTime() > now.getTime()) {
                  reminders.push({
                    id: `prayer_before_${pName}_${targetDate.toDateString()}`,
                    title: `🕌 ${pName} ${config.prayerBeforeMinutes} Menit Lagi`,
                    body: `Waktu shalat ${pName} akan tiba pukul ${prayerTimeStr}. Bersiaplah untuk mengambil air wudhu.`,
                    timestamp: beforeTime.getTime(),
                    tag: `prayer-before-${pName}`,
                    type: 'prayer',
                    tab: 'checklist'
                  });
                }
              }
            }
          }
        });
      }

      // 2. Evaluasi Harian & Muhasabah Reminders
      if (config.morningReminder && config.morningTime) {
        const mTime = parseTimeToDate(targetDate, config.morningTime);
        if (mTime.getTime() > now.getTime()) {
          reminders.push({
            id: `eval_morning_${targetDate.toDateString()}`,
            title: `☀️ Evaluasi Pagi DHS`,
            body: `Awali pagimu dengan dzikir pagi, tilawah, dan catat target kebaikan hari ini!`,
            timestamp: mTime.getTime(),
            tag: `eval-morning`,
            type: 'evaluation',
            tab: 'checklist'
          });
        }
      }

      if (config.afternoonReminder && config.afternoonTime) {
        const aTime = parseTimeToDate(targetDate, config.afternoonTime);
        if (aTime.getTime() > now.getTime()) {
          reminders.push({
            id: `eval_afternoon_${targetDate.toDateString()}`,
            title: `🌤️ Pengingat Sore & Target Harian`,
            body: `Sudah shalat Ashar & cek progres amal hari ini? Jaga streak istiqomah Anda tetap menyala!`,
            timestamp: aTime.getTime(),
            tag: `eval-afternoon`,
            type: 'evaluation',
            tab: 'checklist'
          });
        }
      }

      if (config.nightReminder && config.nightTime) {
        const nTime = parseTimeToDate(targetDate, config.nightTime);
        if (nTime.getTime() > now.getTime()) {
          reminders.push({
            id: `eval_night_${targetDate.toDateString()}`,
            title: `🌙 Waktu Muhasabah & Catat Harian`,
            body: `Hari hampir berakhir. Yuk evaluasi amalan harian, periksa checklist, dan kumpulkan poinmu!`,
            timestamp: nTime.getTime(),
            tag: `eval-night`,
            type: 'evaluation',
            tab: 'checklist'
          });
        }
      }

      // 3. Water Hydration Reminders
      if (config.waterReminder) {
        const waterTimes = ['09:00', '11:30', '14:00', '16:30', '19:30'];
        waterTimes.forEach((wStr, idx) => {
          const wDate = parseTimeToDate(targetDate, wStr);
          if (wDate.getTime() > now.getTime()) {
            reminders.push({
              id: `water_${idx}_${targetDate.toDateString()}`,
              title: `💧 Pengingat Hidrasi Sehat`,
              body: `Waktunya minum segelas air putih untuk menjaga kesehatan tubuh dan fokus ibadah.`,
              timestamp: wDate.getTime(),
              tag: `water-reminder-${idx}`,
              type: 'water',
              tab: 'checklist'
            });
          }
        });
      }

      // 4. Sunnah Reminders (Monday/Thursday fasting & Friday Kahfi)
      if (config.sunnahReminder) {
        // Sunday night (day 0) or Wednesday night (day 3) for tomorrow's fast
        if (dayOfWeek === 0 || dayOfWeek === 3) {
          const nightPrep = parseTimeToDate(targetDate, '20:00');
          if (nightPrep.getTime() > now.getTime()) {
            const nextDayName = dayOfWeek === 0 ? 'Senin' : 'Kamis';
            reminders.push({
              id: `sunnah_fast_prep_${targetDate.toDateString()}`,
              title: `🌙 Persiapan Puasa Sunnah ${nextDayName}`,
              body: `Besok puasa sunnah ${nextDayName}. Siapkan niat dan bangun sahur untuk meraih pahala sunnah.`,
              timestamp: nightPrep.getTime(),
              tag: `sunnah-fast-prep`,
              type: 'sunnah',
              tab: 'checklist'
            });
          }
        }

        // Monday (day 1) or Thursday (day 4) Sahur
        if (dayOfWeek === 1 || dayOfWeek === 4) {
          const sahurTime = parseTimeToDate(targetDate, '03:45');
          if (sahurTime.getTime() > now.getTime()) {
            reminders.push({
              id: `sunnah_sahur_${targetDate.toDateString()}`,
              title: `🤲 Waktu Sahur Berkah`,
              body: `Sahur puasa sunnah hari ini. Semoga ibadahmu lancar dan penuh berkah!`,
              timestamp: sahurTime.getTime(),
              tag: `sunnah-sahur`,
              type: 'sunnah',
              tab: 'checklist'
            });
          }
        }

        // Thursday night (day 4) or Friday (day 5) Al-Kahfi
        if (dayOfWeek === 4) {
          const malamJumat = parseTimeToDate(targetDate, '19:45');
          if (malamJumat.getTime() > now.getTime()) {
            reminders.push({
              id: `kahfi_night_${targetDate.toDateString()}`,
              title: `📖 Malam Jumat Berkah`,
              body: `Disunnahkan membaca Surat Al-Kahfi dan memperbanyak shalawat atas Nabi ﷺ.`,
              timestamp: malamJumat.getTime(),
              tag: `sunnah-kahfi`,
              type: 'sunnah',
              tab: 'checklist'
            });
          }
        }

        if (dayOfWeek === 5) {
          const jumatPagi = parseTimeToDate(targetDate, '07:30');
          if (jumatPagi.getTime() > now.getTime()) {
            reminders.push({
              id: `kahfi_morning_${targetDate.toDateString()}`,
              title: `✨ Hari Jumat Berkah - Al-Kahfi`,
              body: `Sempatkan membaca Surat Al-Kahfi dan persiapkan shalat Jumat dengan mandi & wewangian sunnah.`,
              timestamp: jumatPagi.getTime(),
              tag: `sunnah-kahfi-morning`,
              type: 'sunnah',
              tab: 'checklist'
            });
          }
        }
      }
    });

    // Sort by timestamp
    return reminders.sort((a, b) => a.timestamp - b.timestamp);
  },

  // Sync scheduled reminders to Service Worker & in-app timers
  scheduleAll: async (
    user: UserProfile,
    coords: { lat: number; lng: number } = { lat: -6.2088, lng: 106.8456 }
  ) => {
    // Clear old in-app timers
    activeTimers.forEach(t => clearTimeout(t));
    activeTimers = [];

    if (!user.notifications?.enabled) {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_SCHEDULE' });
      }
      return;
    }

    const schedule = notifications.buildSchedule(user, coords);

    // 1. Send schedule to Service Worker for background execution
    const reg = await notifications.initServiceWorker();
    if (reg) {
      const activeWorker = reg.active || navigator.serviceWorker.controller;
      if (activeWorker) {
        activeWorker.postMessage({
          type: 'SCHEDULE_NOTIFICATIONS',
          payload: schedule
        });
      }
    }

    // 2. Set foreground window timers for items due in next 24 hours
    const now = Date.now();
    schedule.forEach((item) => {
      const delay = item.timestamp - now;
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        const timer = setTimeout(() => {
          notifications.showImmediate(item.title, item.body, item.tab);
        }, delay);
        activeTimers.push(timer);
      }
    });
  }
};
