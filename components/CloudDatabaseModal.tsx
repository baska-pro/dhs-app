import React, { useState } from 'react';
import {
  Cloud,
  Database,
  FileSpreadsheet,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Upload,
  Download,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Key,
  Link as LinkIcon,
  ShieldCheck,
  Sparkles,
  Layers
} from 'lucide-react';
import { createSyncKey } from '../utils/ids.ts';
import { Modal } from './Modal.tsx';
import { UserProfile, CloudProviderType, CloudSyncSettings } from '../types.ts';
import { cloudSync, SyncResult } from '../services/cloudSync.ts';
import { DEFAULT_CLOUD_SYNC_SETTINGS } from '../services/storage.ts';

interface CloudDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onDataRestored?: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const CloudDatabaseModal: React.FC<CloudDatabaseModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onDataRestored,
  showToast
}) => {
  const currentSyncConfig: CloudSyncSettings = user.cloudSync || DEFAULT_CLOUD_SYNC_SETTINGS;

  const [activeTab, setActiveTab] = useState<CloudProviderType>(
    currentSyncConfig.activeProvider !== 'none' ? currentSyncConfig.activeProvider : 'sheets_gas'
  );

  // Form states
  const [sheetsUrl, setSheetsUrl] = useState(currentSyncConfig.googleSheets.webAppUrl || '');
  const [sheetsAutoSync, setSheetsAutoSync] = useState(currentSyncConfig.googleSheets.autoSync);

  const [supabaseUrl, setSupabaseUrl] = useState(currentSyncConfig.supabase.url || '');
  const [supabaseKey, setSupabaseKey] = useState(currentSyncConfig.supabase.anonKey || '');
  const [supabaseSyncKey, setSupabaseSyncKey] = useState(currentSyncConfig.supabase.syncKey || createSyncKey());
  const [supabaseTable, setSupabaseTable] = useState(currentSyncConfig.supabase.tableName || 'dhs_sync_data');
  const [supabaseAutoSync, setSupabaseAutoSync] = useState(currentSyncConfig.supabase.autoSync);

  // Operation states
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    showToast('Kode berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSaveSettings = (newProvider?: CloudProviderType) => {
    const providerToSet = newProvider !== undefined ? newProvider : activeTab;
    const updatedSync: CloudSyncSettings = {
      activeProvider: providerToSet,
      googleSheets: {
        ...currentSyncConfig.googleSheets,
        webAppUrl: sheetsUrl.trim(),
        autoSync: sheetsAutoSync
      },
      supabase: {
        ...currentSyncConfig.supabase,
        url: supabaseUrl.trim(),
        anonKey: supabaseKey.trim(),
        syncKey: supabaseSyncKey.trim(),
        tableName: supabaseTable.trim() || 'dhs_sync_data',
        autoSync: supabaseAutoSync
      },
      autoSyncOnSave: providerToSet === 'sheets_gas' ? sheetsAutoSync : providerToSet === 'supabase' ? supabaseAutoSync : false
    };

    const updatedUser: UserProfile = {
      ...user,
      cloudSync: updatedSync
    };

    onUpdateUser(updatedUser);
    return updatedUser;
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    let result: SyncResult;

    if (activeTab === 'sheets_gas') {
      result = await cloudSync.testGoogleSheets(sheetsUrl);
    } else if (activeTab === 'supabase') {
      result = await cloudSync.testSupabase({
        url: supabaseUrl,
        anonKey: supabaseKey,
        tableName: supabaseTable,
        syncKey: supabaseSyncKey
      });
    } else {
      result = { success: true, message: 'Penyimpanan lokal selalu aktif.', timestamp: new Date().toISOString() };
    }

    setIsTesting(false);
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
  };

  const handlePushNow = async () => {
    const updatedUser = handleSaveSettings(activeTab);
    setIsSyncing(true);

    const result = await cloudSync.pushAll(updatedUser);
    setIsSyncing(false);

    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
  };

  const handlePullNow = async () => {
    handleSaveSettings(activeTab);
    setIsPulling(true);

    let result: SyncResult;
    if (activeTab === 'sheets_gas') {
      result = await cloudSync.pullAll('sheets_gas', { webAppUrl: sheetsUrl });
    } else if (activeTab === 'supabase') {
      result = await cloudSync.pullAll('supabase', {
        url: supabaseUrl,
        anonKey: supabaseKey,
        syncKey: supabaseSyncKey,
        tableName: supabaseTable
      });
    } else {
      result = { success: false, message: 'Pilih provider database cloud.', timestamp: new Date().toISOString() };
    }

    setIsPulling(false);

    if (result.success) {
      showToast(result.message, 'success');
      if (onDataRestored) {
        onDataRestored();
      }
      onClose();
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleSetLocalOnly = () => {
    const updatedSync: CloudSyncSettings = {
      ...currentSyncConfig,
      activeProvider: 'none',
      autoSyncOnSave: false
    };
    onUpdateUser({
      ...user,
      cloudSync: updatedSync
    });
    showToast('Database cloud dinonaktifkan. Mode lokal aktif.', 'info');
  };

  const isCurrentActive = currentSyncConfig.activeProvider === activeTab;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Setup Database Cloud & Sinkronisasi">
      <div className="space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar pb-2 pr-1 text-slate-700">

        {/* Provider Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('sheets_gas')}
            className={`py-2.5 px-2 rounded-xl text-[11px] font-black tracking-tight flex flex-col items-center gap-1 transition-all ${
              activeTab === 'sheets_gas'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`py-2.5 px-2 rounded-xl text-[11px] font-black tracking-tight flex flex-col items-center gap-1 transition-all ${
              activeTab === 'supabase'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-teal-600" />
            <span>Supabase</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('none')}
            className={`py-2.5 px-2 rounded-xl text-[11px] font-black tracking-tight flex flex-col items-center gap-1 transition-all ${
              activeTab === 'none'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4 text-slate-500" />
            <span>Lokal Saja</span>
          </button>
        </div>

        {/* TAB 1: GOOGLE SHEETS VIA GAS */}
        {activeTab === 'sheets_gas' && (
          <div className="space-y-3.5 animate-fadeIn">
            {/* Provider Status Banner */}
            <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-100 flex items-start gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-black text-emerald-950">Google Spreadsheet (Gratis & Mandiri)</h4>
                  {isCurrentActive && (
                    <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-900 text-[9px] font-black uppercase rounded-full">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-emerald-800 font-medium leading-relaxed mt-0.5">
                  Simpan seluruh riwayat amal, poin harian, dan preferensi Anda langsung ke spreadsheet Google pribadi tanpa biaya server.
                </p>
              </div>
            </div>

            {/* Input URL Form */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                URL Google Apps Script (Web App)
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={sheetsUrl}
                  onChange={(e) => setSheetsUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                />
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium pl-1">
                URL diperoleh dari hasil Deploy Web App. Jika DHS_ACCESS_KEY diaktifkan, gunakan URL lengkap beserta ?key=... .
              </p>
            </div>

            {/* Auto Sync Toggle */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Auto-Sync Otomatis</span>
                <span className="text-[10px] text-slate-500 font-medium">Sinkronkan ke Sheet saat centang checklist & ubah profil</span>
              </div>
              <button
                type="button"
                onClick={() => setSheetsAutoSync(!sheetsAutoSync)}
                className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors ${
                  sheetsAutoSync ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="w-4.5 h-4.5 rounded-full bg-white shadow-md"></div>
              </button>
            </div>

            {/* Action Buttons: Test, Push, Pull */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !sheetsUrl}
                className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Tes...' : 'Tes Koneksi'}</span>
              </button>

              <button
                type="button"
                onClick={handlePushNow}
                disabled={isSyncing || !sheetsUrl}
                className="py-2.5 px-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all shadow-md"
              >
                <Upload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span>{isSyncing ? 'Menyimpan...' : 'Upload Data'}</span>
              </button>

              <button
                type="button"
                onClick={handlePullNow}
                disabled={isPulling || !sheetsUrl}
                className="py-2.5 px-2 bg-white hover:bg-emerald-50 border border-emerald-200 disabled:opacity-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all shadow-2xs"
              >
                <Download className={`w-3.5 h-3.5 ${isPulling ? 'animate-pulse' : ''}`} />
                <span>{isPulling ? 'Menarik...' : 'Pulihkan'}</span>
              </button>
            </div>

            {/* Step-by-Step Guide Accordion */}
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="w-full p-3 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Panduan Setup Google Apps Script (1 Menit)</span>
                </div>
                {showGuide ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showGuide && (
                <div className="p-3.5 space-y-3 text-slate-600 border-t border-slate-100 text-[11px] font-medium leading-relaxed">
                  <div className="space-y-2">
                    <p className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>Buat Spreadsheet baru di Google Drive Anda atau klik tombol di bawah.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>Klik menu <b>Ekstensi &gt; Apps Script</b>.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <span>Hapus semua kode lama, lalu klik tombol <b>Salin Kode Script</b> di bawah dan tempelkan.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">4</span>
                      <span>Klik <b>Deploy &gt; New deployment</b>, pilih <b>Web app</b>, lalu set <i>Who has access</i> ke <b>Anyone</b>. Untuk proteksi tambahan, buat Script Property <b>DHS_ACCESS_KEY</b> lalu tambahkan <b>?key=ACCESS_KEY</b> pada URL yang disimpan di DHS App.</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(cloudSync.getGoogleAppsScriptCode(), 'gas_code')}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      {copiedCode === 'gas_code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === 'gas_code' ? 'Tersalin!' : 'Salin Kode Google Apps Script'}</span>
                    </button>
                    <a
                      href="https://sheets.new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Buat Sheet
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SUPABASE CLOUD DATABASE */}
        {activeTab === 'supabase' && (
          <div className="space-y-3.5 animate-fadeIn">
            {/* Provider Status Banner */}
            <div className="p-3.5 bg-teal-50/80 rounded-2xl border border-teal-100 flex items-start gap-3">
              <div className="p-2 bg-teal-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-black text-teal-950">Supabase Cloud (PostgreSQL DB)</h4>
                  {isCurrentActive && (
                    <span className="px-2 py-0.5 bg-teal-200/80 text-teal-900 text-[9px] font-black uppercase rounded-full">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-teal-800 font-medium leading-relaxed mt-0.5">
                  Database PostgreSQL cloud untuk sinkronisasi multi-perangkat. Template DHS memakai RLS berbasis Sync Key agar row tidak dapat dibaca tanpa header Sync Key yang sesuai.
                </p>
              </div>
            </div>

            {/* Inputs: URL & Anon Key */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Supabase Public / Anon Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    ID Unik / Sync Key
                  </label>
                  <input
                    type="text"
                    value={supabaseSyncKey}
                    onChange={(e) => setSupabaseSyncKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-teal-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Nama Tabel DB
                  </label>
                  <input
                    type="text"
                    value={supabaseTable}
                    onChange={(e) => setSupabaseTable(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Auto Sync Toggle */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Auto-Sync ke Supabase</span>
                <span className="text-[10px] text-slate-500 font-medium">Cadangkan otomatis ke database cloud saat data berubah</span>
              </div>
              <button
                type="button"
                onClick={() => setSupabaseAutoSync(!supabaseAutoSync)}
                className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors ${
                  supabaseAutoSync ? 'bg-teal-500 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="w-4.5 h-4.5 rounded-full bg-white shadow-md"></div>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !supabaseUrl || !supabaseKey}
                className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Tes...' : 'Tes Koneksi'}</span>
              </button>

              <button
                type="button"
                onClick={handlePushNow}
                disabled={isSyncing || !supabaseUrl || !supabaseKey}
                className="py-2.5 px-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all shadow-md"
              >
                <Upload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span>{isSyncing ? 'Menyimpan...' : 'Upload Data'}</span>
              </button>

              <button
                type="button"
                onClick={handlePullNow}
                disabled={isPulling || !supabaseUrl || !supabaseKey}
                className="py-2.5 px-2 bg-white hover:bg-teal-50 border border-teal-200 disabled:opacity-50 text-teal-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all shadow-2xs"
              >
                <Download className={`w-3.5 h-3.5 ${isPulling ? 'animate-pulse' : ''}`} />
                <span>{isPulling ? 'Menarik...' : 'Pulihkan'}</span>
              </button>
            </div>

            {/* SQL Guide Accordion */}
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="w-full p-3 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold text-slate-800">Panduan SQL Schema Supabase (1 Menit)</span>
                </div>
                {showGuide ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showGuide && (
                <div className="p-3.5 space-y-3 text-slate-600 border-t border-slate-100 text-[11px] font-medium leading-relaxed">
                  <div className="space-y-2">
                    <p className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>Buka dashboard proyek Supabase Anda lalu masuk ke menu <b>SQL Editor</b>.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>Salin kode SQL di bawah ini, tempelkan di SQL Editor, lalu klik <b>Run</b>.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <span>Buka <b>Project Settings &gt; API</b> untuk menyalin Project URL dan anon public key. Simpan <b>Sync Key</b> Anda sebagai rahasia bersama dan jangan membagikannya.</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(cloudSync.getSupabaseSqlCode(supabaseTable || 'dhs_sync_data'), 'supabase_sql')}
                      className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      {copiedCode === 'supabase_sql' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === 'supabase_sql' ? 'Tersalin!' : 'Salin Kode SQL Supabase'}</span>
                    </button>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Dashboard
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LOCAL ONLY */}
        {activeTab === 'none' && (
          <div className="space-y-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center mx-auto mb-1">
              <HardDrive className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-800">Mode Penyimpanan Lokal Saja (Offline-First)</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                Data amal dan poin harian Anda hanya tersimpan di memori browser perangkat ini. Untuk mencadangkan berkala, gunakan fitur <b>Download Backup JSON</b>.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSetLocalOnly}
              className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-transform"
            >
              Terapkan Mode Lokal
            </button>
          </div>
        )}

        {/* Save & Close Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              handleSaveSettings();
              showToast('Pengaturan database cloud diperbarui!', 'success');
              onClose();
            }}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Simpan & Terapkan Pengaturan</span>
          </button>
        </div>

      </div>
    </Modal>
  );
};
