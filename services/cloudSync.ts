import { UserProfile, DailyLog, SystemSettings, CloudSyncSettings, CloudProviderType } from '../types.ts';
import { storage } from './storage.ts';
import GOOGLE_APPS_SCRIPT_TEMPLATE from '../Code.gs?raw';
import SUPABASE_SCHEMA_TEMPLATE from '../schema.sql?raw';
import { createSyncKey, normalizeSyncKey } from '../utils/ids.ts';

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

export interface SyncResult {
  success: boolean;
  message: string;
  timestamp: string;
  data?: {
    user?: UserProfile;
    logs?: Record<string, DailyLog>;
    settings?: SystemSettings;
  };
}

type SyncStateListener = (status: {
  isSyncing: boolean;
  provider: CloudProviderType;
  lastStatus: 'success' | 'error' | 'idle';
  lastMessage: string;
  lastTime?: string;
}) => void;

const syncListeners: Set<SyncStateListener> = new Set();
let isCurrentlySyncing = false;
let autoSyncDebounceTimer: ReturnType<typeof setTimeout> | null = null;


const normalizeGoogleAppsScriptUrl = (value: string): string => {
  const clean = value.trim();
  if (!/^https:\/\/script\.google\.com\//i.test(clean)) return '';
  return clean;
};

const normalizeSupabaseUrl = (value: string): string => {
  try {
    const url = new URL(value.trim());
    const isLocalHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !isLocalHttp) return '';
    if (url.username || url.password) return '';
    return url.origin;
  } catch {
    return '';
  }
};

const normalizeTableName = (value?: string): string => {
  const table = (value || 'dhs_sync_data').trim();
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(table)) return '';
  return table;
};

const supabaseHeaders = (anonKey: string, syncKey?: string): Record<string, string> => ({
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  'Content-Type': 'application/json',
  ...(syncKey ? { 'x-dhs-sync-key': syncKey } : {}),
});

export const cloudSync = {
  subscribe: (listener: SyncStateListener) => {
    syncListeners.add(listener);
    return () => {
      syncListeners.delete(listener);
    };
  },

  notifyState: (provider: CloudProviderType, lastStatus: 'success' | 'error' | 'idle', lastMessage: string, lastTime?: string) => {
    syncListeners.forEach(cb => {
      try {
        cb({
          isSyncing: isCurrentlySyncing,
          provider,
          lastStatus,
          lastMessage,
          lastTime
        });
      } catch (e) {
        console.error('Error notifying sync listener', e);
      }
    });
  },

  // 1. Google Sheets (GAS Web App)
  syncToGoogleSheets: async (url: string, payload: { user: UserProfile; logs: Record<string, DailyLog>; settings: SystemSettings }): Promise<SyncResult> => {
    const cleanUrl = normalizeGoogleAppsScriptUrl(url);
    if (!cleanUrl) {
      return { success: false, message: 'URL Google Apps Script tidak valid.', timestamp: new Date().toISOString() };
    }

    try {
      const bodyData = {
        action: 'sync_all',
        syncKey: payload.user.cloudSync?.supabase?.syncKey || 'dhs_user',
        exportedAt: new Date().toISOString(),
        user: payload.user,
        logs: payload.logs,
        settings: payload.settings
      };

      // In Google Apps Script Web App, text/plain POST bypasses browser preflight CORS issues
      const res = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(bodyData)
      });

      if (!res.ok) {
        throw new Error(`Server GAS mengembalikan status HTTP ${res.status}`);
      }

      const resText = await res.text();
      let resJson: { status?: string; message?: string };
      try {
        resJson = JSON.parse(resText) as { status?: string; message?: string };
      } catch {
        throw new Error('Respons Google Apps Script bukan JSON yang valid.');
      }

      if (!['success', 'ok'].includes(String(resJson.status || '').toLowerCase())) {
        throw new Error(resJson.message || 'Google Apps Script menolak sinkronisasi.');
      }

      return {
        success: true,
        message: resJson.message || 'Data berhasil disinkronkan ke Google Spreadsheet!',
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      console.error('Google Sheets sync error:', err);
      return {
        success: false,
        message: err.message || 'Gagal terhubung ke Google Apps Script. Pastikan Web App diset ke "Anyone / Siapa Saja".',
        timestamp: new Date().toISOString()
      };
    }
  },

  pullFromGoogleSheets: async (url: string): Promise<SyncResult> => {
    const cleanUrl = normalizeGoogleAppsScriptUrl(url);
    if (!cleanUrl) {
      return { success: false, message: 'URL Google Apps Script tidak valid.', timestamp: new Date().toISOString() };
    }

    try {
      const getUrl = cleanUrl.includes('?') ? `${cleanUrl}&action=get_all` : `${cleanUrl}?action=get_all`;
      const res = await fetch(getUrl, {
        method: 'GET'
      });

      if (!res.ok) {
        throw new Error(`Server GAS mengembalikan status ${res.status}`);
      }

      const data = await res.json();
      if (!data || data.status === 'error') {
        throw new Error(data?.message || 'Google Apps Script menolak permintaan restore.');
      }
      if (!data.logs && !data.user) {
        throw new Error('Format data dari Google Spreadsheet tidak sesuai.');
      }

      return {
        success: true,
        message: 'Data berhasil ditarik dari Google Spreadsheet!',
        timestamp: new Date().toISOString(),
        data: {
          user: data.user,
          logs: data.logs,
          settings: data.settings
        }
      };
    } catch (err: any) {
      console.error('Google Sheets pull error:', err);
      return {
        success: false,
        message: err.message || 'Gagal mengambil data dari Google Apps Script.',
        timestamp: new Date().toISOString()
      };
    }
  },

  testGoogleSheets: async (url: string): Promise<SyncResult> => {
    const cleanUrl = normalizeGoogleAppsScriptUrl(url);
    if (!cleanUrl) {
      return { success: false, message: 'Masukkan URL Web App Google Apps Script yang valid.', timestamp: new Date().toISOString() };
    }

    try {
      const testPayload = {
        action: 'ping',
        timestamp: new Date().toISOString()
      };

      const res = await fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(testPayload)
      });

      if (!res.ok) {
        return {
          success: false,
          message: `Koneksi gagal (HTTP ${res.status}). Pastikan deployment disetel "Who has access: Anyone".`,
          timestamp: new Date().toISOString()
        };
      }

      const body = await res.json().catch(() => null) as { status?: string; message?: string } | null;
      const ok = body && ['success', 'ok'].includes(String(body.status || '').toLowerCase());
      return {
        success: Boolean(ok),
        message: ok
          ? (body?.message || 'Koneksi ke Google Apps Script berhasil dan siap digunakan!')
          : (body?.message || 'Respons Google Apps Script tidak valid atau access key ditolak.'),
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Tidak dapat menjangkau server GAS. Periksa URL atau koneksi internet Anda.',
        timestamp: new Date().toISOString()
      };
    }
  },

  // 2. Supabase Cloud Database (PostgREST API)
  syncToSupabase: async (config: { url: string; anonKey: string; syncKey: string; tableName?: string }, payload: { user: UserProfile; logs: Record<string, DailyLog>; settings: SystemSettings }): Promise<SyncResult> => {
    const rawUrl = normalizeSupabaseUrl(config.url);
    const anonKey = config.anonKey.trim();
    const syncKey = normalizeSyncKey(config.syncKey);
    const table = normalizeTableName(config.tableName);

    if (!rawUrl || !anonKey || !syncKey || !table) {
      return { success: false, message: 'Lengkapi Project URL Supabase yang valid, Anon Key, Sync Key, dan nama tabel yang valid.', timestamp: new Date().toISOString() };
    }

    try {
      const endpoint = `${rawUrl}/rest/v1/${table}?on_conflict=sync_key`;
      const bodyRecord = {
        sync_key: syncKey,
        user_profile: payload.user,
        daily_logs: payload.logs,
        system_settings: payload.settings,
        updated_at: new Date().toISOString()
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...supabaseHeaders(anonKey, syncKey),
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(bodyRecord)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Supabase HTTP ${res.status}: ${res.statusText}`);
      }

      return {
        success: true,
        message: 'Data tersimpan dengan aman di database Supabase!',
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      console.error('Supabase sync error:', err);
      return {
        success: false,
        message: err.message || 'Gagal menyimpan ke Supabase. Pastikan tabel & RLS sudah dibuat sesuai panduan.',
        timestamp: new Date().toISOString()
      };
    }
  },

  pullFromSupabase: async (config: { url: string; anonKey: string; syncKey: string; tableName?: string }): Promise<SyncResult> => {
    const rawUrl = normalizeSupabaseUrl(config.url);
    const anonKey = config.anonKey.trim();
    const syncKey = normalizeSyncKey(config.syncKey);
    const table = normalizeTableName(config.tableName);

    if (!rawUrl || !anonKey || !syncKey || !table) {
      return { success: false, message: 'Lengkapi Project URL Supabase yang valid, Anon Key, Sync Key, dan nama tabel yang valid.', timestamp: new Date().toISOString() };
    }

    try {
      const endpoint = `${rawUrl}/rest/v1/${table}?sync_key=eq.${encodeURIComponent(syncKey)}&select=*`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: supabaseHeaders(anonKey, syncKey)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Supabase HTTP ${res.status}`);
      }

      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error(`Data dengan Sync Key "${syncKey}" belum ditemukan di Supabase.`);
      }

      const record = rows[0];
      return {
        success: true,
        message: 'Data berhasil ditarik dari database Supabase!',
        timestamp: new Date().toISOString(),
        data: {
          user: record.user_profile,
          logs: record.daily_logs,
          settings: record.system_settings
        }
      };
    } catch (err: any) {
      console.error('Supabase pull error:', err);
      return {
        success: false,
        message: err.message || 'Gagal mengambil data dari Supabase.',
        timestamp: new Date().toISOString()
      };
    }
  },

  testSupabase: async (config: { url: string; anonKey: string; syncKey?: string; tableName?: string }): Promise<SyncResult> => {
    const rawUrl = normalizeSupabaseUrl(config.url);
    const anonKey = config.anonKey.trim();
    const table = normalizeTableName(config.tableName);

    if (!rawUrl || !anonKey || !table) {
      return { success: false, message: 'Masukkan Project URL Supabase yang valid, Anon Key, dan nama tabel yang valid.', timestamp: new Date().toISOString() };
    }

    try {
      const endpoint = `${rawUrl}/rest/v1/${table}?select=sync_key&limit=1`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: supabaseHeaders(anonKey, normalizeSyncKey(config.syncKey || '') || 'dhs_connection_test')
      });

      if (res.ok) {
        return {
          success: true,
          message: 'Koneksi ke Supabase berhasil! Endpoint tabel dapat dijangkau dan RLS aktif.',
          timestamp: new Date().toISOString()
        };
      } else {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          message: `Koneksi gagal (${errJson.message || `HTTP ${res.status}`}). Pastikan tabel "${table}" sudah dibuat dan RLS aktif.`,
          timestamp: new Date().toISOString()
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: 'Tidak dapat menjangkau host Supabase. Periksa URL proyek Anda.',
        timestamp: new Date().toISOString()
      };
    }
  },

  // 3. Unified Push Action
  pushAll: async (currentUser?: UserProfile): Promise<SyncResult> => {
    const user = currentUser || storage.getUser();
    const cloud = user.cloudSync || DEFAULT_CLOUD_SYNC_SETTINGS;
    const provider = cloud.activeProvider;

    if (provider === 'none') {
      return { success: false, message: 'Belum ada provider database cloud yang aktif.', timestamp: new Date().toISOString() };
    }

    isCurrentlySyncing = true;
    cloudSync.notifyState(provider, 'idle', 'Sedang menyinkronkan...');

    const logs = storage.getLogs();
    const settings = storage.getSystemSettings();

    let result: SyncResult;

    if (provider === 'sheets_gas') {
      result = await cloudSync.syncToGoogleSheets(cloud.googleSheets.webAppUrl, { user, logs, settings });
      const updatedUser: UserProfile = {
        ...user,
        cloudSync: {
          ...cloud,
          googleSheets: {
            ...cloud.googleSheets,
            lastSyncTime: result.timestamp,
            lastSyncStatus: result.success ? 'success' : 'error',
            lastSyncError: result.success ? undefined : result.message
          }
        }
      };
      storage.saveUser(updatedUser);
    } else if (provider === 'supabase') {
      result = await cloudSync.syncToSupabase(cloud.supabase, { user, logs, settings });
      const updatedUser: UserProfile = {
        ...user,
        cloudSync: {
          ...cloud,
          supabase: {
            ...cloud.supabase,
            lastSyncTime: result.timestamp,
            lastSyncStatus: result.success ? 'success' : 'error',
            lastSyncError: result.success ? undefined : result.message
          }
        }
      };
      storage.saveUser(updatedUser);
    } else {
      result = { success: false, message: 'Provider tidak dikenali.', timestamp: new Date().toISOString() };
    }

    isCurrentlySyncing = false;
    cloudSync.notifyState(provider, result.success ? 'success' : 'error', result.message, result.timestamp);
    return result;
  },

  // 4. Unified Pull Action
  pullAll: async (provider: CloudProviderType, configOverride?: any): Promise<SyncResult> => {
    const user = storage.getUser();
    const cloud = user.cloudSync || DEFAULT_CLOUD_SYNC_SETTINGS;

    isCurrentlySyncing = true;
    cloudSync.notifyState(provider, 'idle', 'Sedang menarik data dari cloud...');

    let result: SyncResult;

    if (provider === 'sheets_gas') {
      const url = configOverride?.webAppUrl || cloud.googleSheets.webAppUrl;
      result = await cloudSync.pullFromGoogleSheets(url);
    } else if (provider === 'supabase') {
      const cfg = configOverride || cloud.supabase;
      result = await cloudSync.pullFromSupabase(cfg);
    } else {
      result = { success: false, message: 'Pilih provider cloud terlebih dahulu.', timestamp: new Date().toISOString() };
    }

    isCurrentlySyncing = false;

    if (result.success && result.data) {
      // Merge/Restore local storage
      if (result.data.logs) {
        const currentLogs = storage.getLogs();
        const mergedLogs = { ...currentLogs, ...result.data.logs };
        storage.saveLogs(mergedLogs);
      }
      if (result.data.user) {
        const currentUser = storage.getUser();
        const mergedUser: UserProfile = {
          ...currentUser,
          ...result.data.user,
          cloudSync: {
            ...(currentUser.cloudSync || DEFAULT_CLOUD_SYNC_SETTINGS),
            ...(result.data.user.cloudSync || {})
          }
        };
        storage.saveUser(mergedUser);
      }
      if (result.data.settings) {
        storage.saveSystemSettings(result.data.settings);
      }
    }

    cloudSync.notifyState(provider, result.success ? 'success' : 'error', result.message, result.timestamp);
    return result;
  },

  // Debounced auto-sync trigger (called after log updates or profile changes)
  triggerAutoSync: (user?: UserProfile) => {
    const targetUser = user || storage.getUser();
    const cloud = targetUser.cloudSync;
    if (!cloud || cloud.activeProvider === 'none') return;

    const isAutoSyncEnabled =
      cloud.autoSyncOnSave ||
      (cloud.activeProvider === 'sheets_gas' && cloud.googleSheets.autoSync) ||
      (cloud.activeProvider === 'supabase' && cloud.supabase.autoSync);

    if (!isAutoSyncEnabled) return;

    if (autoSyncDebounceTimer) {
      clearTimeout(autoSyncDebounceTimer);
    }

    autoSyncDebounceTimer = setTimeout(() => {
      cloudSync.pushAll(targetUser).catch(e => console.warn('Auto-sync error:', e));
    }, 2500); // 2.5s debounce to batch rapid habit check clicks
  },

  // Canonical templates: source files are imported directly to avoid drift.
  getGoogleAppsScriptCode: (): string => GOOGLE_APPS_SCRIPT_TEMPLATE,

  getSupabaseSqlCode: (tableName = 'dhs_sync_data'): string => {
    const safeTable = normalizeTableName(tableName);
    if (!safeTable) {
      return '-- Nama tabel tidak valid. Gunakan huruf kecil, angka, dan underscore; harus diawali huruf.';
    }
    return SUPABASE_SCHEMA_TEMPLATE.replaceAll('dhs_sync_data', safeTable);
  }
};
