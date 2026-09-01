
export type PrayerQuality = 'AWAL' | 'TENGAH' | 'AKHIR' | 'HAMPIR_HABIS' | 'TERLEWAT' | 'NONE';

export interface CustomHabit {
  id: string;
  label: string;
  points: number;
}

export interface HabitItem {
  id: string;
  label: string;
  points: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Icon name string
  color: string;
  openAt: UserLevel;
}

export interface LevelInfo {
  name: string;
  description: string;
  threshold: number;
  categories: string[];
  minPoints: number;
}

export interface SystemSettings {
  levelConfig: Record<number, LevelInfo>;
  categories: Category[];
  habitItems: Record<string, HabitItem[]>;
  prayerPoints: Record<PrayerQuality, number>;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  prayers: Record<string, PrayerQuality>;
  sunnah: string[];
  waterLitres: number;
  physical: string[];
  diet: string[];
  productivity: string[];
  social: string[];
  digital: string[];
  cleanliness: string[];
  sleep: string[];
  customHabits: string[]; // List of custom habit IDs completed
  points: number;
  notes: string;
}

export enum UserLevel {
  MUBTADI = 1,
  MUQTASID = 2,
  MUHSIN = 3,
  SABIQ = 4
}

export interface NotificationSettings {
  enabled: boolean;
  prayerReminder: boolean;
  prayerBeforeMinutes: number; // 0 = tepat waktu, 5, 10, 15
  prayerSpecific: Record<string, boolean>; // Subuh, Dzuhur, Ashar, Maghrib, Isya
  morningReminder: boolean;
  morningTime: string; // "06:30"
  afternoonReminder: boolean;
  afternoonTime: string; // "16:30"
  nightReminder: boolean;
  nightTime: string; // "20:30"
  waterReminder: boolean;
  waterIntervalHours: number; // e.g. 2
  sunnahReminder: boolean; // Puasa Senin-Kamis & Kahfi
  soundEnabled: boolean;
}

export interface UserProfile {
  name: string;
  avatarType: 'emoji' | 'image';
  avatarData: string; // emoji character or base64 image
  level: UserLevel;
  totalPoints: number;
  dailyTarget: number;
  streak: number;
  lastActive: string;
  themeColor: string; // Base color hex
  gradientTheme: 'teal' | 'gold' | 'emerald' | 'sapphire' | 'ruby';
  isBusyMode: boolean;
  isHolidayMode: boolean;
  isDarkMode: boolean;
  waterUnit: 'L' | 'G'; // L for Liters, G for Glasses
  customHabits: CustomHabit[];
  prayerOffsets: Record<string, number>; // Minutes to add/subtract from mock prayer times
  notifications?: NotificationSettings;
  cloudSync?: CloudSyncSettings;
}

export type CloudProviderType = 'none' | 'sheets_gas' | 'supabase';

export interface GoogleSheetsConfig {
  webAppUrl: string;
  autoSync: boolean;
  lastSyncTime?: string;
  lastSyncStatus?: 'success' | 'error' | 'idle';
  lastSyncError?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  syncKey: string;
  tableName: string;
  autoSync: boolean;
  lastSyncTime?: string;
  lastSyncStatus?: 'success' | 'error' | 'idle';
  lastSyncError?: string;
}

export interface CloudSyncSettings {
  activeProvider: CloudProviderType;
  googleSheets: GoogleSheetsConfig;
  supabase: SupabaseConfig;
  autoSyncOnSave: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}
