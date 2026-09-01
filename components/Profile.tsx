import React, { useState, useRef } from 'react';
import { UserProfile, CustomHabit, UserLevel } from '../types.ts';
import { storage } from '../services/storage.ts';
import {
  Download,
  Trash2,
  Settings,
  Share2,
  Target,
  Coffee,
  Palmtree,
  Upload,
  AlertTriangle,
  Smile,
  Image as ImageIcon,
  Droplets,
  Plus,
  Trash,
  Info,
  Zap,
  Flame,
  Award,
  Clock,
  Lock,
  Volume2,
  VolumeX,
  Sparkles,
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  Send,
  Sun,
  Moon as MoonIcon,
  Check,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  Smartphone,
  Laptop,
  ChevronDown,
  ChevronUp,
  Cloud,
  Database,
  FileSpreadsheet
} from 'lucide-react';
import { Modal } from './Modal.tsx';
import { CloudDatabaseModal } from './CloudDatabaseModal.tsx';
import { THEMES, LEVEL_CONFIG, PRAYER_NAMES } from '../constants.tsx';
import { LegalInfo } from './LegalInfo.tsx';
import DeveloperMenu from './DeveloperMenu.tsx';
import { audio } from '../services/audio.ts';
import { notifications } from '../services/notifications.ts';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../services/storage.ts';

interface ProfileProps {
  user: UserProfile;
  onUpdate: (user: UserProfile) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const EMOJIS = ['✨', '🌟', '🌙', '🕌', '🤲', '💧', '🏃', '📚', '☕', '🌿', '🔥', '⚡', '😇', '🎯', '🌈', '💎', '🧠', '🛡️', '✅', '🔋', '🏆', '📈', '🧘', '🥗', '🍎'];

const Profile: React.FC<ProfileProps> = ({ user, onUpdate, showToast }) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [tempName, setTempName] = useState(user.name);
  const [tempTarget, setTempTarget] = useState(user.dailyTarget.toString());
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitPoints, setNewHabitPoints] = useState('10');
  const [pendingImportData, setPendingImportData] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [soundActive, setSoundActive] = useState(audio.isEnabled());
  const [permissionStatus, setPermissionStatus] = useState(notifications.getPermission());
  const [guideTab, setGuideTab] = useState<'chrome' | 'ios' | 'firefox'>('chrome');
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);

  const notifConfig = user.notifications || DEFAULT_NOTIFICATION_SETTINGS;

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const theme = THEMES[user.gradientTheme || 'teal'] || THEMES.teal;

  const handleExport = () => {
    storage.exportData();
    showToast('Data berhasil diekspor ke file JSON', 'success');
    setActiveModal(null);
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        try {
          const data = JSON.parse(result);
          if (data.categories && data.habitItems && !data.logs) {
            setPendingImportData(result);
            setActiveModal('import_settings_confirm');
          } else {
            setPendingImportData(result);
            setActiveModal('import_confirm');
          }
        } catch {
          showToast('File tidak valid', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImportAction = (merge: boolean) => {
    if (pendingImportData && storage.importData(pendingImportData, merge)) {
      showToast(merge ? 'Data berhasil digabung!' : 'Data berhasil diganti!', 'success');
      setPendingImportData(null);
      setActiveModal(null);
      setTimeout(() => window.location.reload(), 800);
    } else {
      showToast('Gagal memproses file cadangan', 'error');
    }
  };

  const verifyPin = () => {
    if (pinInput === '76') {
      setPinInput('');
      setActiveModal('developer_menu');
      showToast('Akses Developer dibuka', 'success');
    } else {
      showToast('PIN Salah! Akses ditolak.', 'error');
      setPinInput('');
    }
  };

  const handleAvatarPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        showToast('Foto terlalu besar (maks 1MB)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdate({ ...user, avatarType: 'image', avatarData: event.target?.result as string });
        showToast('Avatar foto diperbarui', 'success');
        setActiveModal(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMode = (mode: 'busy' | 'holiday') => {
    if (mode === 'busy') {
      const newVal = !user.isBusyMode;
      onUpdate({ ...user, isBusyMode: newVal });
      showToast(newVal ? 'Mode Sibuk diaktifkan (-40% target)' : 'Mode Sibuk dinonaktifkan', 'info');
    } else {
      const newVal = !user.isHolidayMode;
      onUpdate({ ...user, isHolidayMode: newVal });
      showToast(newVal ? 'Mode Libur aktif (Streak dibekukan)' : 'Mode Libur dinonaktifkan', 'info');
    }
  };

  const updatePrayerOffset = (prayer: string, delta: number) => {
    const currentOffsets = { ...(user.prayerOffsets || {}) };
    currentOffsets[prayer] = (currentOffsets[prayer] || 0) + delta;
    onUpdate({ ...user, prayerOffsets: currentOffsets });
  };

  const handleShare = async () => {
    const text = `🚀 *Progress DHS App (Daily Habit System)*\n\nNama: *${user.name}*\nLevel: *${LEVEL_CONFIG[user.level].name}*\nTotal Poin: *${user.totalPoints.toLocaleString()}* POIN\n🔥 Streak Konsisten: *${user.streak}* Hari!\n\n_Bangun kebiasaan baik dan istiqomah setiap hari!_`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'DHS App Progres', text, url: window.location.origin });
      } catch (err: any) {
        if (err.name !== 'AbortError') showToast('Gagal membagikan', 'error');
      }
    } else {
      await navigator.clipboard.writeText(text);
      showToast('Teks progres disalin ke clipboard', 'success');
    }
  };

  const addCustomHabit = () => {
    if (newHabitName.trim()) {
      const h: CustomHabit = {
        id: 'custom_' + Date.now(),
        label: newHabitName.trim(),
        points: parseInt(newHabitPoints) || 10
      };
      onUpdate({ ...user, customHabits: [...user.customHabits, h] });
      setNewHabitName('');
      setNewHabitPoints('10');
      showToast('Amal baru berhasil ditambahkan', 'success');
    }
  };

  const removeCustomHabit = (id: string) => {
    onUpdate({ ...user, customHabits: user.customHabits.filter(h => h.id !== id) });
    showToast('Amal kustom dihapus', 'info');
  };

  const toggleSoundState = () => {
    const state = audio.toggleSound();
    setSoundActive(state);
    showToast(state ? 'Efek suara diaktifkan' : 'Efek suara dibisukan', 'info');
  };

  const handleToggleNotification = (key: string, value: any) => {
    const currentNotif = user.notifications || DEFAULT_NOTIFICATION_SETTINGS;
    const updatedNotif = { ...currentNotif, [key]: value };
    const updatedUser = { ...user, notifications: updatedNotif };
    onUpdate(updatedUser);
    notifications.scheduleAll(updatedUser);
  };

  const handleTogglePrayerNotification = (prayer: string) => {
    const currentNotif = user.notifications || DEFAULT_NOTIFICATION_SETTINGS;
    const updatedPrayer = {
      ...currentNotif.prayerSpecific,
      [prayer]: !currentNotif.prayerSpecific?.[prayer]
    };
    const updatedNotif = { ...currentNotif, prayerSpecific: updatedPrayer };
    const updatedUser = { ...user, notifications: updatedNotif };
    onUpdate(updatedUser);
    notifications.scheduleAll(updatedUser);
  };

  const handleRequestPermission = async () => {
    const granted = await notifications.requestPermission();
    const current = notifications.getPermission();
    setPermissionStatus(current);
    if (granted || current === 'granted') {
      const currentNotif = user.notifications || DEFAULT_NOTIFICATION_SETTINGS;
      const updatedNotif = { ...currentNotif, enabled: true };
      const updatedUser = { ...user, notifications: updatedNotif };
      onUpdate(updatedUser);
      notifications.scheduleAll(updatedUser);
      showToast('Izin notifikasi aktif! Pengingat siap berjalan.', 'success');
    } else if (current === 'denied') {
      showToast('Izin diblokir browser. Buka setelan situs di URL bar untuk mengizinkan.', 'error');
    } else {
      showToast('Izin notifikasi belum diberikan.', 'info');
    }
  };

  const handleRecheckPermission = () => {
    setIsCheckingPermission(true);
    setTimeout(() => {
      const current = notifications.getPermission();
      setPermissionStatus(current);
      setIsCheckingPermission(false);
      if (current === 'granted') {
        const currentNotif = user.notifications || DEFAULT_NOTIFICATION_SETTINGS;
        const updatedNotif = { ...currentNotif, enabled: true };
        const updatedUser = { ...user, notifications: updatedNotif };
        onUpdate(updatedUser);
        notifications.scheduleAll(updatedUser);
        showToast('Alhamdulillah! Izin browser terdeteksi aktif.', 'success');
      } else if (current === 'denied') {
        showToast('Status masih diblokir browser. Pastikan sudah mengubah ke Izinkan lalu muat ulang.', 'info');
      } else {
        showToast('Status izin: Default. Klik "Izinkan Notifikasi" untuk mengaktifkan.', 'info');
      }
    }, 400);
  };

  const handleOpenInNewTab = () => {
    try {
      const currentUrl = window.location.href;
      window.open(currentUrl, '_blank', 'noopener,noreferrer');
    } catch {
      showToast('Gagal membuka tab baru. Salin URL di browser Anda.', 'error');
    }
  };

  const handleSendTestNotification = async () => {
    await notifications.showImmediate(
      '🕌 Pengingat Ibadah & Evaluasi DHS App',
      'Alhamdulillah! Sistem pengingat & audio berfungsi dengan baik. Waktunya cek checklist dan kumpulkan poinmu!',
      'checklist',
      'test'
    );
    if (permissionStatus === 'granted') {
      showToast('Notifikasi sistem browser & banner berhasil dikirim!', 'success');
    } else {
      showToast('Banner & audio pengingat dalam-aplikasi berhasil diuji!', 'success');
    }
  };

  return (
    <div className="p-5 space-y-6 animate-slide-up bg-slate-50 transition-colors min-h-full pb-8">
      {/* Header Profile Section */}
      <div className="text-center space-y-4 pt-4 pb-2">
        <div className="relative inline-block">
          <div
            style={{ backgroundColor: theme.accentHex }}
            className="w-24 h-24 rounded-[2.5rem] text-white flex items-center justify-center text-4xl font-black shadow-2xl border-4 border-white overflow-hidden transition-all"
          >
            {user.avatarType === 'image' && user.avatarData ? (
              <img src={user.avatarData} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{user.avatarData || user.name.charAt(0)}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setActiveModal('avatar')}
            aria-label="Ganti Avatar"
            className="absolute -bottom-1 -right-1 bg-white p-2.5 rounded-2xl shadow-lg border border-slate-100 active:scale-90 transition-transform cursor-pointer"
          >
             <Smile className="w-4 h-4 text-slate-700" />
          </button>
        </div>
        <div>
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-2xl font-black text-slate-800">{user.name}</h2>
            <button
              type="button"
              onClick={() => { setTempName(user.name); setActiveModal('name'); }}
              aria-label="Ubah Nama"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className={`mt-1.5 px-4 py-1.5 ${theme.badgeBg} ${theme.badgeText} rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] inline-block border ${theme.border}`}>
            Level {LEVEL_CONFIG[user.level].name} • {LEVEL_CONFIG[user.level].description}
          </div>
        </div>
      </div>

      {/* Mode Switches: No nested button markup */}
      <div className="grid grid-cols-2 gap-4">
        {/* Busy Mode Card */}
        <div
          onClick={() => toggleMode('busy')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleMode('busy'); }}
          className={`relative flex flex-col items-center gap-2 p-4 rounded-[2rem] border-2 transition-all cursor-pointer select-none ${
            user.isBusyMode ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className={`p-3 rounded-2xl ${user.isBusyMode ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
            <Coffee className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${user.isBusyMode ? 'text-amber-700' : 'text-slate-400'}`}>
            Mode Sibuk
          </span>
          <span
            onClick={(e) => { e.stopPropagation(); setActiveModal('info_busy'); }}
            role="button"
            tabIndex={0}
            aria-label="Info Mode Sibuk"
            className="absolute top-2 right-2 p-1.5 opacity-50 hover:opacity-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Holiday Mode Card */}
        <div
          onClick={() => toggleMode('holiday')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleMode('holiday'); }}
          className={`relative flex flex-col items-center gap-2 p-4 rounded-[2rem] border-2 transition-all cursor-pointer select-none ${
            user.isHolidayMode ? 'bg-sky-50 border-sky-300 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className={`p-3 rounded-2xl ${user.isHolidayMode ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
            <Palmtree className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${user.isHolidayMode ? 'text-sky-700' : 'text-slate-400'}`}>
            Mode Libur
          </span>
          <span
            onClick={(e) => { e.stopPropagation(); setActiveModal('info_holiday'); }}
            role="button"
            tabIndex={0}
            aria-label="Info Mode Libur"
            className="absolute top-2 right-2 p-1.5 opacity-50 hover:opacity-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-3">Pilihan Tema Warna</h3>
        <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          {Object.entries(THEMES).map(([key, t]) => (
            <button
              key={key}
              type="button"
              onClick={() => onUpdate({ ...user, gradientTheme: key as any })}
              className={`flex-1 min-w-[3.5rem] h-12 rounded-2xl bg-gradient-to-br ${t.gradient} border-4 transition-all relative flex items-center justify-center ${
                user.gradientTheme === key ? 'border-white ring-2 ring-slate-800 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-90'
              }`}
            >
              {user.gradientTheme === key && <Sparkles className="w-4 h-4 text-white drop-shadow" />}
            </button>
          ))}
        </div>
      </div>

      {/* Personalization Section */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-3">Personalisasi & Pengaturan</h3>
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
          <button
            type="button"
            onClick={() => {
              setPermissionStatus(notifications.getPermission());
              setActiveModal('notifications');
            }}
            className="w-full flex items-center gap-4 p-4 active:bg-slate-50 transition-colors text-left"
          >
             <div className={`p-2.5 rounded-xl ${notifConfig.enabled && permissionStatus === 'granted' ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
               {notifConfig.enabled && permissionStatus === 'granted' ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
             </div>
             <div className="flex-1">
               <div className="flex items-center gap-2">
                 <span className="font-bold text-slate-700 block text-sm">Pusat Notifikasi & Pengingat</span>
                 {notifConfig.enabled && permissionStatus === 'granted' && (
                   <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-[9px] font-black rounded-full uppercase">Aktif</span>
                 )}
               </div>
               <span className="text-[10px] text-slate-400 font-medium">Shalat, evaluasi harian, hidrasi & sunnah</span>
             </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('prayer_settings')}
            className="w-full flex items-center gap-4 p-4 active:bg-slate-50 transition-colors text-left"
          >
             <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl"><Clock className="w-5 h-5" /></div>
             <div className="flex-1">
               <span className="font-bold text-slate-700 block text-sm">Koreksi Waktu Shalat</span>
               <span className="text-[10px] text-slate-400 font-medium">Penyesuaian menit jadwal lokal (+/-)</span>
             </div>
          </button>

          <button
            type="button"
            onClick={() => { setTempTarget(user.dailyTarget.toString()); setActiveModal('target'); }}
            className="w-full flex items-center gap-4 p-4 active:bg-slate-50 transition-colors text-left"
          >
             <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Target className="w-5 h-5" /></div>
             <div className="flex-1">
               <span className="font-bold text-slate-700 block text-sm">Target Poin Harian</span>
               <span className="text-[10px] text-slate-400 font-medium">Saat ini: {user.dailyTarget} POIN</span>
             </div>
          </button>

          <button
            type="button"
            onClick={() => onUpdate({ ...user, waterUnit: user.waterUnit === 'L' ? 'G' : 'L' })}
            className="w-full flex items-center gap-4 p-4 active:bg-slate-50 transition-colors text-left"
          >
             <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl"><Droplets className="w-5 h-5" /></div>
             <div className="flex-1">
               <span className="font-bold text-slate-700 block text-sm">Satuan Air Minum</span>
               <span className="text-[10px] text-slate-400 font-medium">Satuan aktif: {user.waterUnit === 'L' ? 'Liter (L)' : 'Gelas (250 ml)'}</span>
             </div>
          </button>

          <button
            type="button"
            onClick={toggleSoundState}
            className="w-full flex items-center gap-4 p-4 active:bg-slate-50 transition-colors text-left"
          >
             <div className={`p-2.5 rounded-xl ${soundActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
               {soundActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
             </div>
             <div className="flex-1">
               <span className="font-bold text-slate-700 block text-sm">Efek Suara & Haptik</span>
               <span className="text-[10px] text-slate-400 font-medium">{soundActive ? 'Suara & getaran aktif' : 'Dibisukan'}</span>
             </div>
          </button>
        </div>
      </div>

      {/* Data & Backup Section */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-3">Database Cloud & Cadangan Data</h3>
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">

          {/* Cloud Database Setup Button */}
          <button
            type="button"
            onClick={() => setActiveModal('cloud_database')}
            className="w-full flex items-center gap-4 p-4 active:bg-slate-50 transition-colors text-left bg-gradient-to-r from-emerald-50/40 via-white to-teal-50/40 hover:from-emerald-50/70"
          >
             <div className="p-2.5 bg-teal-500 text-white rounded-xl shadow-xs">
               <Cloud className="w-5 h-5" />
             </div>
             <div className="flex-1">
               <div className="flex items-center gap-2">
                 <span className="font-bold text-slate-800 text-sm">Setup Database Cloud</span>
                 {user.cloudSync?.activeProvider === 'sheets_gas' && (
                   <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                     Google Sheets
                   </span>
                 )}
                 {user.cloudSync?.activeProvider === 'supabase' && (
                   <span className="text-[9px] font-black bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full uppercase">
                     Supabase DB
                   </span>
                 )}
               </div>
               <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                 {user.cloudSync?.activeProvider === 'sheets_gas'
                   ? 'Simpan otomatis ke Google Spreadsheet via GAS'
                   : user.cloudSync?.activeProvider === 'supabase'
                   ? 'Tersinkronisasi ke database cloud Supabase'
                   : 'Simpan data ke Google Sheets atau Supabase'}
               </span>
             </div>
             <div className="text-[10px] font-black text-teal-600 uppercase tracking-wider bg-teal-50 px-2.5 py-1 rounded-xl">
               Konfigurasi
             </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('progress_card')}
            className="w-full flex items-center gap-4 p-4 active:bg-slate-50 transition-colors text-left"
          >
             <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl"><Award className="w-5 h-5" /></div>
             <span className="font-bold text-slate-700 text-sm flex-1">Lihat & Share Progress Card</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('custom_habits')}
            className="w-full flex items-center gap-4 p-4 active:bg-slate-50 transition-colors text-left"
          >
             <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Plus className="w-5 h-5" /></div>
             <span className="font-bold text-slate-700 text-sm flex-1">Kelola Amal Kustom ({user.customHabits.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('export_confirm')}
            className="w-full flex items-center gap-4 p-4 active:bg-slate-50 transition-colors text-left"
          >
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Download className="w-5 h-5" /></div>
            <span className="font-bold text-slate-700 text-sm flex-1">Backup Data Lengkap (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => importFileRef.current?.click()}
            className="w-full flex items-center gap-4 p-4 active:bg-slate-50 transition-colors text-left"
          >
            <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl"><Upload className="w-5 h-5" /></div>
            <span className="font-bold text-slate-700 text-sm flex-1">Pulihkan / Import Data Backup</span>
            <input type="file" ref={importFileRef} className="hidden" accept=".json" onChange={onFileSelected} />
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('reset')}
            className="w-full flex items-center gap-4 p-4 text-rose-500 active:bg-rose-50 transition-colors text-left"
          >
            <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl"><Trash2 className="w-5 h-5" /></div>
            <span className="font-bold text-sm flex-1">Reset Semua Data & Histori</span>
          </button>
        </div>
      </div>

      {/* Information & Privacy */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-3">Pusat Bantuan</h3>
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
          <button
            type="button"
            onClick={() => setActiveModal('legal_info')}
            className="w-full flex items-center gap-4 p-4 active:bg-slate-50 transition-colors text-left"
          >
             <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Info className="w-5 h-5" /></div>
             <span className="font-bold text-slate-700 text-sm flex-1">Kebijakan Privasi & Ketentuan</span>
          </button>

          <div className="p-4 flex items-start gap-4">
             <div
               role="button"
               tabIndex={0}
               onClick={() => setActiveModal('pin_entry')}
               onKeyDown={(e) => { if (e.key === 'Enter') setActiveModal('pin_entry'); }}
               className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 border border-emerald-100 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
               title="Klik untuk Developer Mode (PIN 76)"
             >
                <Lock className="w-5 h-5" />
             </div>
             <div>
                <span className="font-bold text-slate-700 block leading-none mb-1 text-sm">Penyimpanan Offline-First</span>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  Data amal dan preferensi Anda aman tersimpan di browser perangkat Anda tanpa pelacakan pihak ketiga.
                </p>
             </div>
          </div>
        </div>
      </div>

      <footer className="mt-8 pb-4 text-center space-y-2">
        <div className="h-px w-12 bg-slate-200 mx-auto mb-6"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Daily Habit System™ (DHS)
        </p>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
          Versi PWA Mobile 2.0 • Standalone Ready
        </p>
      </footer>

      {/* MODALS */}
      <Modal isOpen={activeModal === 'pin_entry'} onClose={() => setActiveModal(null)} title="Developer Login">
        <div className="space-y-6 text-center">
           <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Lock className="w-8 h-8 text-slate-400" />
           </div>
           <div className="space-y-4">
             <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Masukkan PIN Akses</p>
             <input
               type="password"
               maxLength={4}
               value={pinInput}
               onChange={(e) => setPinInput(e.target.value)}
               placeholder="PIN"
               className="w-full text-center text-4xl font-black bg-slate-50 border-none rounded-3xl p-4 outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
             />
             <button
               type="button"
               onClick={verifyPin}
               className="w-full p-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-lg active:scale-95 transition-all"
             >
               Buka Menu Developer
             </button>
           </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'developer_menu'} onClose={() => setActiveModal(null)} title="Pengaturan Developer">
        <div className="max-h-[70vh] overflow-y-auto no-scrollbar">
           <DeveloperMenu
             user={user}
             onUserUpdate={onUpdate}
             onClose={() => setActiveModal(null)}
             showToast={showToast}
           />
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'import_settings_confirm'} onClose={() => setActiveModal(null)} title="Import Pengaturan">
        <div className="space-y-6 text-center">
          <div className="p-4 bg-teal-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-2">
            <Settings className="w-10 h-10 text-teal-600" />
          </div>
          <div className="space-y-2">
            <h4 className="font-black text-slate-800">Terapkan Pengaturan Sistem?</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed px-2">
              File ini akan memperbarui struktur kategori, habit, poin, dan level. Data riwayat poin Anda tetap aman.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <button
               type="button"
               onClick={() => setActiveModal(null)}
               className="p-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest"
             >
               Batal
             </button>
             <button
               type="button"
               onClick={() => handleImportAction(false)}
               className="p-4 bg-teal-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md"
             >
               Terapkan
             </button>
          </div>
        </div>
      </Modal>

      {/* Modal Pusat Notifikasi & Pengingat */}
      <Modal isOpen={activeModal === 'notifications'} onClose={() => setActiveModal(null)} title="Pusat Notifikasi & Pengingat">
        <div className="space-y-4 pb-1">
          {/* Permission Status & Unblock Banner */}
          {permissionStatus === 'granted' ? (
            <div className="p-4 bg-emerald-50 rounded-[1.8rem] border border-emerald-100 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-emerald-950 block leading-tight">Izin Browser Aktif</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium">Pengingat latar & adzan siap dikirim</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSendTestNotification}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
              >
                <Send className="w-3 h-3" /> Tes
              </button>
            </div>
          ) : permissionStatus === 'denied' ? (
            <div className="p-4 bg-rose-50/90 rounded-[2rem] border border-rose-100 space-y-3.5 shadow-sm text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-500 text-white rounded-xl shadow-sm">
                    <BellOff className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-xs text-rose-950 block">Izin Notifikasi Diblokir Browser</span>
                    <span className="text-[10px] text-rose-700 font-medium">Notifikasi sistem di luar tab tertahan</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRecheckPermission}
                  disabled={isCheckingPermission}
                  className="px-2.5 py-1 bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-[10px] font-black flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
                  title="Periksa ulang status izin"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingPermission ? 'animate-spin' : ''}`} />
                  <span>{isCheckingPermission ? 'Mengecek...' : 'Cek Status'}</span>
                </button>
              </div>

              {/* Action Buttons for quick unblock & open in new tab */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                  <span>Buka di Tab Penuh</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  className="flex-1 py-2 px-3 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 rounded-xl text-[10px] font-black tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Tes In-App Alarm</span>
                </button>
              </div>

              {/* Step-by-Step Accordion / Tabs Guide */}
              <div className="bg-white rounded-2xl p-3 border border-rose-100 space-y-2.5 text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cara Mengubah Status Izin:</span>
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setGuideTab('chrome')}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all ${guideTab === 'chrome' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
                    >
                      Chrome / Edge
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuideTab('ios')}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all ${guideTab === 'ios' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
                    >
                      iOS / Safari
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuideTab('firefox')}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all ${guideTab === 'firefox' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
                    >
                      Firefox
                    </button>
                  </div>
                </div>

                {guideTab === 'chrome' && (
                  <div className="space-y-1.5 text-[11px] font-medium text-slate-600 pl-1 leading-relaxed">
                    <p className="flex items-start gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>Klik ikon <b>Setelan Situs / Gembok 🔒</b> di sebelah kiri URL address bar atas.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>Cari menu <b>Notifikasi (Notifications)</b>, ubah dari <b>Blokir</b> menjadi <b>Izinkan (Allow)</b>.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <span>Muat ulang (Refresh) halaman atau klik tombol <b>Cek Status</b> di atas.</span>
                    </p>
                  </div>
                )}

                {guideTab === 'ios' && (
                  <div className="space-y-1.5 text-[11px] font-medium text-slate-600 pl-1 leading-relaxed">
                    <p className="flex items-start gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>Buka website ini di <b>Safari</b>, ketuk tombol <b>Bagikan (Share / ikon kotak panah ke atas)</b>.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>Pilih <b>"Tambahkan ke Layar Utama" (Add to Home Screen)</b>.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <span>Buka DHS App dari layar utama untuk mengaktifkan notifikasi Web Push penuh.</span>
                    </p>
                  </div>
                )}

                {guideTab === 'firefox' && (
                  <div className="space-y-1.5 text-[11px] font-medium text-slate-600 pl-1 leading-relaxed">
                    <p className="flex items-start gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>Klik ikon <b>Izin Situs (Ikon Perisai / Gembok)</b> di address bar.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>Hapus centang blokir pada <b>Kirim Notifikasi</b> lalu izinkan.</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Guarantees note */}
              <div className="flex items-center gap-2 px-1 text-[10px] text-slate-500 font-medium">
                <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span><b>Pengingat Dalam-Aplikasi:</b> Banner & suara alarm tetap otomatis aktif saat aplikasi sedang Anda buka.</span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 rounded-[2rem] border border-amber-100 space-y-3 text-left">
              <div className="flex items-center gap-2.5 text-amber-900 font-bold text-xs">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-xs block">Aktifkan Izin Notifikasi Perangkat</span>
                  <span className="text-[10px] text-amber-700 font-medium">Dapatkan alarm waktu shalat & pengingat amal harian</span>
                </div>
              </div>
              <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                Izinkan browser mengirimkan notifikasi agar Anda mendapatkan pengingat waktu shalat tepat waktu, alarm minum air, dan jadwal evaluasi harian.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black tracking-wider uppercase shadow-md active:scale-95 transition-transform"
                >
                  Izinkan Notifikasi Sekarang
                </button>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="py-2.5 px-3 bg-white hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
                  title="Buka di tab baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Tab Baru
                </button>
              </div>
            </div>
          )}

          {/* Master Toggle */}
          <div className="p-4 bg-slate-50 rounded-[1.8rem] border border-slate-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-black text-slate-800 text-sm block">Master Pengingat</span>
              <span className="text-[10px] text-slate-400 font-medium">Aktifkan seluruh jadwal & alarm harian</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!notifConfig.enabled && permissionStatus !== 'granted') {
                  handleRequestPermission();
                } else {
                  handleToggleNotification('enabled', !notifConfig.enabled);
                }
              }}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${
                notifConfig.enabled ? 'bg-teal-500 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Shalat Notifications Section */}
          <div className="p-4 bg-white rounded-[1.8rem] border border-slate-100 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-black text-slate-800 text-xs uppercase tracking-wider">Pengingat Waktu Shalat</h5>
                  <span className="text-[10px] text-slate-400 font-medium">Notifikasi adzan & masuk waktu</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifConfig.prayerReminder}
                onChange={(e) => handleToggleNotification('prayerReminder', e.target.checked)}
                className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
              />
            </div>

            {notifConfig.prayerReminder && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600 text-[11px]">Waktu Alarm Bunyi:</span>
                  <select
                    value={notifConfig.prayerBeforeMinutes || 0}
                    onChange={(e) => handleToggleNotification('prayerBeforeMinutes', Number(e.target.value))}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value={0}>Tepat Waktu Shalat</option>
                    <option value={5}>5 Menit Sebelum</option>
                    <option value={10}>10 Menit Sebelum</option>
                    <option value={15}>15 Menit Sebelum</option>
                  </select>
                </div>

                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {PRAYER_NAMES.map((p) => {
                    const isPActive = notifConfig.prayerSpecific?.[p] !== false;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleTogglePrayerNotification(p)}
                        className={`py-2 rounded-xl text-center flex flex-col items-center justify-center transition-all ${
                          isPActive ? 'bg-teal-50 border border-teal-200 text-teal-700' : 'bg-slate-50 border border-slate-100 text-slate-400 opacity-60'
                        }`}
                      >
                        <span className="text-[10px] font-black">{p}</span>
                        <span className="text-[8px] font-bold uppercase">{isPActive ? 'ON' : 'OFF'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Daily Evaluation & Checklist Logging Section */}
          <div className="p-4 bg-white rounded-[1.8rem] border border-slate-100 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-black text-slate-800 text-xs uppercase tracking-wider">Pengingat Catat & Evaluasi Harian</h5>
                <span className="text-[10px] text-slate-400 font-medium">Bantu menjaga konsistensi streak amal</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Evaluasi Pagi */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={notifConfig.morningReminder}
                    onChange={(e) => handleToggleNotification('morningReminder', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-700 text-xs block">Evaluasi Pagi</span>
                    <span className="text-[9px] text-slate-400">Dzikir pagi, tilawah, rencana</span>
                  </div>
                </div>
                <input
                  type="time"
                  value={notifConfig.morningTime || '06:30'}
                  onChange={(e) => handleToggleNotification('morningTime', e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700"
                />
              </div>

              {/* Pengingat Sore */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={notifConfig.afternoonReminder}
                    onChange={(e) => handleToggleNotification('afternoonReminder', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-700 text-xs block">Pengingat Sore</span>
                    <span className="text-[9px] text-slate-400">Shalat ashar & progres target</span>
                  </div>
                </div>
                <input
                  type="time"
                  value={notifConfig.afternoonTime || '16:30'}
                  onChange={(e) => handleToggleNotification('afternoonTime', e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700"
                />
              </div>

              {/* Muhasabah Malam */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={notifConfig.nightReminder}
                    onChange={(e) => handleToggleNotification('nightReminder', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-700 text-xs block">Muhasabah Malam</span>
                    <span className="text-[9px] text-slate-400">Evaluasi checklist & simpan poin</span>
                  </div>
                </div>
                <input
                  type="time"
                  value={notifConfig.nightTime || '20:30'}
                  onChange={(e) => handleToggleNotification('nightTime', e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Water Hydration Section */}
          <div className="p-4 bg-white rounded-[1.8rem] border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-black text-slate-800 text-xs uppercase tracking-wider">Pengingat Minum Air</h5>
                  <span className="text-[10px] text-slate-400 font-medium">Hidrasi berkala (09:00, 11:30, 14:00, 16:30, 19:30)</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifConfig.waterReminder}
                onChange={(e) => handleToggleNotification('waterReminder', e.target.checked)}
                className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Sunnah Reminders Section */}
          <div className="p-4 bg-white rounded-[1.8rem] border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-black text-slate-800 text-xs uppercase tracking-wider">Amal Sunnah Spesial</h5>
                  <span className="text-[10px] text-slate-400 font-medium">Puasa Senin-Kamis & Al-Kahfi Hari Jumat</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifConfig.sunnahReminder}
                onChange={(e) => handleToggleNotification('sunnahReminder', e.target.checked)}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Test & Done Actions */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={handleSendTestNotification}
              className="flex-1 p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Send className="w-3.5 h-3.5" /> Uji Notifikasi
            </button>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex-1 p-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform"
            >
              Simpan & Tutup
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'prayer_settings'} onClose={() => setActiveModal(null)} title="Koreksi Waktu Shalat">
        <div className="space-y-4">
           <p className="text-xs text-slate-500 font-medium">Tambahkan atau kurangi menit untuk menyesuaikan dengan jadwal masjid sekitar Anda:</p>
           <div className="space-y-2.5">
              {PRAYER_NAMES.map((p) => (
                <div key={p} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-black text-slate-700 text-sm">{p}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updatePrayerOffset(p, -1)}
                      className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl font-black text-slate-700 active:scale-90"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-black text-teal-600 text-sm">
                      {(user.prayerOffsets?.[p] || 0) > 0 ? `+${user.prayerOffsets?.[p]}` : user.prayerOffsets?.[p] || 0} m
                    </span>
                    <button
                      type="button"
                      onClick={() => updatePrayerOffset(p, 1)}
                      className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl font-black text-slate-700 active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
           </div>
           <button
             type="button"
             onClick={() => setActiveModal(null)}
             className="w-full p-4 mt-2 bg-teal-500 text-white font-black rounded-2xl shadow-md active:scale-95 transition-all"
           >
             Selesai
           </button>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'progress_card'} onClose={() => setActiveModal(null)} title="Progress Card">
        <div className="space-y-6">
           <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center space-y-5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>

              <div className="w-20 h-20 rounded-[2rem] bg-white/10 p-1 shadow-xl border border-white/20">
                 <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-white/5 flex items-center justify-center text-3xl">
                    {user.avatarType === 'image' && user.avatarData ? (
                      <img src={user.avatarData} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user.avatarData
                    )}
                 </div>
              </div>

              <div>
                 <h4 className="text-2xl font-black tracking-tight leading-none mb-1.5 text-white">{user.name}</h4>
                 <div className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-300 bg-white/10 px-3.5 py-1 rounded-full inline-block border border-white/10">
                   Level {LEVEL_CONFIG[user.level].name}
                 </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-3">
                 <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                    <Zap className="w-5 h-5 mx-auto mb-1.5 text-amber-400" />
                    <div className="text-xl font-black text-white">{user.totalPoints.toLocaleString()}</div>
                    <div className="text-[9px] font-bold uppercase text-white/50 tracking-widest">Total Poin</div>
                 </div>
                 <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                    <Flame className="w-5 h-5 mx-auto mb-1.5 text-orange-400" />
                    <div className="text-xl font-black text-white">{user.streak} Hari</div>
                    <div className="text-[9px] font-bold uppercase text-white/50 tracking-widest">Streak Aktif</div>
                 </div>
              </div>

              <p className="text-[10px] font-medium text-white/70 italic">"Amalan terbaik adalah yang konsisten walau sedikit."</p>
           </div>

           <button
             type="button"
             onClick={handleShare}
             className="w-full p-4 bg-teal-500 text-white rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition-all"
           >
              <Share2 className="w-4 h-4" /> Bagikan Progres
           </button>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'export_confirm'} onClose={() => setActiveModal(null)} title="Ekspor Cadangan">
        <div className="text-center space-y-5">
          <div className="p-4 bg-teal-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-2">
             <Download className="w-10 h-10 text-teal-600" />
          </div>
          <div className="space-y-2">
            <h4 className="font-black text-slate-800">Download Data Cadangan?</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed px-3">
              Seluruh riwayat amal, poin, level, dan preferensi akan diunduh ke file JSON. Anda dapat memulihkannya kapan saja di perangkat lain.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <button
               type="button"
               onClick={() => setActiveModal(null)}
               className="p-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest"
             >
               Batal
             </button>
             <button
               type="button"
               onClick={handleExport}
               className="p-4 bg-teal-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md"
             >
               Unduh File
             </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'legal_info'} onClose={() => setActiveModal(null)} title="Tentang & Kebijakan">
        <div className="max-h-[60vh] overflow-y-auto no-scrollbar pb-2">
          <LegalInfo />
        </div>
        <button
          type="button"
          onClick={() => setActiveModal(null)}
          className="w-full p-4 mt-4 bg-slate-900 text-white font-black rounded-2xl shadow-md active:scale-95 transition-all"
        >
          Tutup
        </button>
      </Modal>

      <Modal isOpen={activeModal === 'avatar'} onClose={() => setActiveModal(null)} title="Pilih Avatar">
        <div className="space-y-5">
          <div className="grid grid-cols-5 gap-2.5 max-h-48 overflow-y-auto no-scrollbar p-1">
            {EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onUpdate({ ...user, avatarType: 'emoji', avatarData: e });
                  setActiveModal(null);
                  showToast('Avatar diperbarui', 'success');
                }}
                className={`w-12 h-12 flex items-center justify-center rounded-2xl text-2xl transition-all ${
                  user.avatarData === e ? 'bg-teal-500 text-white shadow-md scale-105' : 'bg-slate-50 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="w-full p-4 bg-teal-500 text-white rounded-2xl font-black flex items-center justify-center gap-2.5 shadow-md active:scale-95 transition-all"
          >
            <ImageIcon className="w-5 h-5" /> Unggah Foto Pribadi
          </button>
          <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarPhoto} />
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'name'} onClose={() => setActiveModal(null)} title="Ubah Nama">
        <div className="space-y-4">
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            placeholder="Nama Lengkap"
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-teal-500 outline-none font-bold text-slate-800 transition-all"
          />
          <button
            type="button"
            onClick={() => {
              if (tempName.trim()) {
                onUpdate({ ...user, name: tempName.trim() });
                setActiveModal(null);
                showToast('Nama berhasil diperbarui', 'success');
              }
            }}
            className="w-full p-4 bg-teal-500 text-white rounded-2xl font-black shadow-md active:scale-95 transition-all"
          >
            Simpan Nama
          </button>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'target'} onClose={() => setActiveModal(null)} title="Target Poin Harian">
        <div className="space-y-6 text-center">
          <div className="flex items-center justify-center gap-6 py-2">
             <button
               type="button"
               onClick={() => setTempTarget((Math.max(50, parseInt(tempTarget || '0') - 25)).toString())}
               className="w-14 h-14 rounded-2xl bg-slate-100 font-black text-2xl flex items-center justify-center active:scale-90"
             >
               -
             </button>
             <div className="text-center">
               <span className="text-5xl font-black text-teal-600 block">{tempTarget}</span>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">POIN / HARI</span>
             </div>
             <button
               type="button"
               onClick={() => setTempTarget((parseInt(tempTarget || '0') + 25).toString())}
               className="w-14 h-14 rounded-2xl bg-slate-100 font-black text-2xl flex items-center justify-center active:scale-90"
             >
               +
             </button>
          </div>
          <button
            type="button"
            onClick={() => {
              onUpdate({ ...user, dailyTarget: parseInt(tempTarget) || 200 });
              setActiveModal(null);
              showToast('Target harian diperbarui', 'success');
            }}
            className="w-full p-4 bg-teal-500 text-white rounded-2xl font-black shadow-md active:scale-95 transition-all"
          >
            Simpan Target
          </button>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'custom_habits'} onClose={() => setActiveModal(null)} title="Kelola Amal Kustom">
        <div className="space-y-4">
          <div className="bg-teal-50 p-4 rounded-3xl border border-teal-100 space-y-3">
             <input
                placeholder="Nama amal baru (contoh: Membaca Al-Qur'an 1 Juz)"
                value={newHabitName}
                onChange={e => setNewHabitName(e.target.value)}
                className="w-full p-3.5 bg-white border-none rounded-xl outline-none text-sm font-bold shadow-sm"
             />
             <div className="flex gap-2.5">
               <input
                  type="number"
                  placeholder="Poin"
                  value={newHabitPoints}
                  onChange={e => setNewHabitPoints(e.target.value)}
                  className="w-1/3 p-3.5 bg-white border-none rounded-xl outline-none text-sm font-bold text-center shadow-sm"
               />
               <button
                  type="button"
                  onClick={addCustomHabit}
                  className="flex-1 bg-teal-500 text-white font-black rounded-xl py-3.5 shadow-md active:scale-95 transition-all"
               >
                 + Tambah Amal
               </button>
             </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar p-1">
            {user.customHabits.map(h => (
              <div key={h.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div>
                  <div className="font-bold text-slate-800 text-sm">{h.label}</div>
                  <div className="text-[10px] text-teal-600 font-black uppercase">+{h.points} POIN</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeCustomHabit(h.id)}
                  className="p-2 text-rose-500 bg-rose-50 rounded-xl transition-all active:scale-90"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            {user.customHabits.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-4 font-medium">Belum ada amal kustom. Tambahkan di atas!</p>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'import_confirm'} onClose={() => setActiveModal(null)} title="Pulihkan Cadangan">
        <div className="space-y-4 text-center">
          <div className="p-4 bg-teal-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-10 h-10 text-teal-600" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-slate-800">File Cadangan Terdeteksi</h4>
            <p className="text-xs text-slate-500 font-medium px-2">Pilih cara pemulihan data yang Anda inginkan:</p>
          </div>
          <div className="grid grid-cols-1 gap-2.5 pt-2">
             <button
               type="button"
               onClick={() => handleImportAction(true)}
               className="p-4 bg-teal-50 border-2 border-teal-200 rounded-2xl font-black text-xs text-teal-700 shadow-sm transition-all active:scale-95 uppercase tracking-wider"
             >
               Gabungkan dengan Data Saat Ini
             </button>
             <button
               type="button"
               onClick={() => handleImportAction(false)}
               className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl font-black text-xs text-rose-600 transition-all active:scale-95 uppercase tracking-wider"
             >
               Gantikan Seluruh Data
             </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'reset'} onClose={() => setActiveModal(null)} title="Reset Data">
        <div className="text-center space-y-5">
           <div className="p-4 bg-rose-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
           </div>
           <div className="space-y-2">
             <h4 className="font-black text-slate-800">Hapus Semua Progres?</h4>
             <p className="text-xs text-slate-500 px-3 leading-relaxed">
               Tindakan ini permanen. Semua log harian, streak, poin, dan pengaturan Anda akan dikembalikan ke kondisi awal.
             </p>
           </div>
           <div className="grid grid-cols-2 gap-3">
             <button
               type="button"
               onClick={() => setActiveModal(null)}
               className="p-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] text-slate-600 transition-all active:scale-95"
             >
               Batal
             </button>
             <button
               type="button"
               onClick={storage.resetData}
               className="p-4 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-md shadow-rose-200 transition-all active:scale-95"
             >
               Ya, Reset
             </button>
           </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'info_busy'} onClose={() => setActiveModal(null)} title="Mode Sibuk">
         <div className="p-5 bg-amber-50 rounded-3xl border border-amber-100 space-y-2">
            <h5 className="font-bold text-amber-900 text-sm">Kemudahan di Hari Padat</h5>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              Target POIN harian otomatis disesuaikan 40% lebih ringan agar Anda tetap dapat memelihara rutinitas esensial tanpa tekanan saat aktivitas sedang padat.
            </p>
         </div>
      </Modal>

      <Modal isOpen={activeModal === 'info_holiday'} onClose={() => setActiveModal(null)} title="Mode Libur">
         <div className="p-5 bg-sky-50 rounded-3xl border border-sky-100 space-y-2">
            <h5 className="font-bold text-sky-900 text-sm">Pelindung Streak (Streak Freeze)</h5>
            <p className="text-xs text-sky-800 leading-relaxed font-medium">
              Membekukan streak harian Anda agar tidak terputus (kembali ke 0) saat Anda sedang sakit, bepergian jauh, atau berhalangan mencatat checklist.
            </p>
         </div>
      </Modal>

      {/* Cloud Database Setup Modal */}
      <CloudDatabaseModal
        isOpen={activeModal === 'cloud_database'}
        onClose={() => setActiveModal(null)}
        user={user}
        onUpdateUser={onUpdate}
        onDataRestored={() => {
          showToast('Data berhasil dipulihkan dari database cloud!', 'success');
          setTimeout(() => window.location.reload(), 600);
        }}
        showToast={showToast}
      />
    </div>
  );
};

export default Profile;
