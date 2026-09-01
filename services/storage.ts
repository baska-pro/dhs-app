import { DailyLog, UserProfile, UserLevel, SystemSettings, NotificationSettings, CloudSyncSettings } from '../types.ts';
import { DEFAULT_LEVEL_CONFIG, DEFAULT_CATEGORIES, DEFAULT_HABIT_ITEMS, DEFAULT_PRAYER_POINTS } from '../constants.tsx';
import { toLocalDateKey } from '../utils/date.ts';
import { createSyncKey } from '../utils/ids.ts';

const KEYS = {
  LOGS: 'istiqomah_logs',
  USER: 'istiqomah_user',
  SETTINGS: 'istiqomah_system_settings'
};

export const DEFAULT_CLOUD_SYNC_SETTINGS: CloudSyncSettings = {
  activeProvider: 'none',
  googleSheets: {
    webAppUrl: '',
    autoSync: false,
    lastSyncStatus: 'idle'
  },
  supabase: {
    url: '',
    anonKey: '',
    syncKey: createSyncKey(),
    tableName: 'dhs_sync_data',
    autoSync: false,
    lastSyncStatus: 'idle'
  },
  autoSyncOnSave: false
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  prayerReminder: true,
  prayerBeforeMinutes: 0,
  prayerSpecific: {
    Subuh: true,
    Dzuhur: true,
    Ashar: true,
    Maghrib: true,
    Isya: true
  },
  morningReminder: true,
  morningTime: '06:30',
  afternoonReminder: true,
  afternoonTime: '16:30',
  nightReminder: true,
  nightTime: '20:30',
  waterReminder: true,
  waterIntervalHours: 2,
  sunnahReminder: true,
  soundEnabled: true,
};

const DEFAULT_USER: UserProfile = {
  name: 'Hamba Allah',
  avatarType: 'emoji',
  avatarData: '✨',
  level: UserLevel.MUBTADI,
  totalPoints: 0,
  dailyTarget: 200,
  streak: 0,
  lastActive: toLocalDateKey(),
  themeColor: '#0ea5e9', // Primary Teal
  gradientTheme: 'teal',
  isBusyMode: false,
  isHolidayMode: false,
  isDarkMode: false, // Default: Light Mode
  waterUnit: 'L',
  customHabits: [],
  prayerOffsets: {
    Subuh: 0,
    Dzuhur: 0,
    Ashar: 0,
    Maghrib: 0,
    Isya: 0
  },
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  cloudSync: DEFAULT_CLOUD_SYNC_SETTINGS
};

const INITIAL_SETTINGS: SystemSettings = {
  levelConfig: DEFAULT_LEVEL_CONFIG,
  categories: DEFAULT_CATEGORIES,
  habitItems: DEFAULT_HABIT_ITEMS,
  prayerPoints: DEFAULT_PRAYER_POINTS
};

export const storage = {
  getLogs: (): Record<string, DailyLog> => {
    try {
      const data = localStorage.getItem(KEYS.LOGS);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error("Failed to parse logs", e);
      return {};
    }
  },

  saveLogs: (logs: Record<string, DailyLog>) => {
    localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
  },

  saveLog: (log: DailyLog) => {
    const logs = storage.getLogs();
    logs[log.date] = log;
    localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
  },

  getUser: (): UserProfile => {
    try {
      const data = localStorage.getItem(KEYS.USER);
      if (!data) return DEFAULT_USER;
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_USER,
        ...parsed,
        notifications: {
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...(parsed.notifications || {}),
          prayerSpecific: {
            ...DEFAULT_NOTIFICATION_SETTINGS.prayerSpecific,
            ...(parsed.notifications?.prayerSpecific || {})
          }
        },
        cloudSync: {
          ...DEFAULT_CLOUD_SYNC_SETTINGS,
          ...(parsed.cloudSync || {}),
          googleSheets: {
            ...DEFAULT_CLOUD_SYNC_SETTINGS.googleSheets,
            ...(parsed.cloudSync?.googleSheets || {})
          },
          supabase: {
            ...DEFAULT_CLOUD_SYNC_SETTINGS.supabase,
            ...(parsed.cloudSync?.supabase || {})
          }
        }
      };
    } catch (e) {
      console.error("Failed to parse user", e);
      return DEFAULT_USER;
    }
  },

  saveUser: (user: UserProfile) => {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  getSystemSettings: (): SystemSettings => {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (!data) return INITIAL_SETTINGS;
      const parsed = JSON.parse(data);
      // Ensure it has the structure, if not, revert to initial
      if (!parsed.categories || !parsed.habitItems) return INITIAL_SETTINGS;
      return parsed;
    } catch (e) {
      return INITIAL_SETTINGS;
    }
  },

  saveSystemSettings: (settings: SystemSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  resetData: () => {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  },

  exportData: () => {
    try {
      const data = {
        app: 'DHS App',
        schemaVersion: 1,
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        logs: storage.getLogs(),
        user: storage.getUser(),
        settings: storage.getSystemSettings()
      };
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dhs_full_backup_${toLocalDateKey()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
      alert("Gagal mengekspor data.");
    }
  },

  exportSystemSettings: () => {
    try {
      const settings = storage.getSystemSettings();
      const jsonStr = JSON.stringify(settings, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `habit-settings.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("System Export failed", e);
    }
  },

  importData: (jsonString: string, merge: boolean = false): boolean => {
    try {
      const data = JSON.parse(jsonString);

      // Check if it's a "Settings Only" file
      if (data.categories && data.habitItems && !data.logs && !data.user) {
        storage.saveSystemSettings(data);
        return true;
      }

      if (data.logs && data.user) {
        if (merge) {
          const currentLogs = storage.getLogs();
          const mergedLogs = { ...currentLogs, ...data.logs };
          localStorage.setItem(KEYS.LOGS, JSON.stringify(mergedLogs));

          const currentUser = storage.getUser();
          const mergedUser = {
            ...currentUser,
            ...data.user,
            totalPoints: Math.max(currentUser.totalPoints, data.user.totalPoints),
            level: Math.max(currentUser.level, data.user.level),
            customHabits: [...currentUser.customHabits, ...(data.user.customHabits || [])].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
          };
          localStorage.setItem(KEYS.USER, JSON.stringify(mergedUser));

          if (data.settings) {
            storage.saveSystemSettings(data.settings);
          }
        } else {
          localStorage.setItem(KEYS.LOGS, JSON.stringify(data.logs));
          localStorage.setItem(KEYS.USER, JSON.stringify(data.user));
          if (data.settings) {
            storage.saveSystemSettings(data.settings);
          }
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
  }
};