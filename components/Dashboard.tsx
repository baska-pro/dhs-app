import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, UserLevel, DailyLog } from '../types.ts';
import { LEVEL_CONFIG, THEMES, DAILY_QUOTES } from '../constants.tsx';
import {
  TrendingUp,
  Award,
  Zap,
  ChevronRight,
  ClipboardList,
  Flame,
  Coffee,
  Palmtree,
  Clock,
  MapPin,
  Sparkles,
  Quote,
  Bell,
  BellRing,
  Cloud,
  FileSpreadsheet,
  Database
} from 'lucide-react';
import Header from './Header.tsx';
import { calculatePrayerTimes, getPrayerCountdown, PrayerSchedule } from '../services/prayer.ts';

interface DashboardProps {
  user: UserProfile;
  todayLog: DailyLog;
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, todayLog, onNavigate }) => {
  const [locationName, setLocationName] = useState<string>('Jakarta (Otomatis)');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: -6.2088, lng: 106.8456 });
  const [currentTime, setCurrentTime] = useState(new Date());

  const theme = THEMES[user.gradientTheme || 'teal'] || THEMES.teal;
  const currentLevelInfo = LEVEL_CONFIG[user.level] || LEVEL_CONFIG[UserLevel.MUBTADI];
  const nextLevel = user.level < UserLevel.SABIQ ? ((user.level + 1) as UserLevel) : null;
  const nextLevelThreshold = nextLevel ? LEVEL_CONFIG[nextLevel].threshold : currentLevelInfo.threshold;

  const progressToNextLevel = nextLevel
    ? Math.min(100, Math.max(0, (user.totalPoints / nextLevelThreshold) * 100))
    : 100;

  const effectiveDailyTarget = user.isBusyMode ? Math.round(user.dailyTarget * 0.6) : user.dailyTarget;
  const dailyProgress = Math.min(100, Math.round((todayLog.points / (effectiveDailyTarget || 1)) * 100));

  // Geolocation detection
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setCoords({ lat: latitude, lng: longitude });
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.regency || data.address?.state_district || data.address?.state || 'Indonesia';
            setLocationName(city);
          } catch {
            setLocationName('Lokasi Terdeteksi');
          }
        },
        () => {
          setLocationName('Jakarta (WIB)');
        },
        { enableHighAccuracy: false, timeout: 6000 }
      );
    }
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate prayer times
  const prayerSchedule: PrayerSchedule = useMemo(() => {
    return calculatePrayerTimes(currentTime, coords.lat, coords.lng, 7, user.prayerOffsets || {});
  }, [currentTime, coords, user.prayerOffsets]);

  const countdown = useMemo(() => {
    return getPrayerCountdown(prayerSchedule, currentTime);
  }, [prayerSchedule, currentTime]);

  // Daily Quote based on day of month
  const todayQuote = useMemo(() => {
    const day = new Date().getDate();
    return DAILY_QUOTES[day % DAILY_QUOTES.length];
  }, []);

  const prayerList = [
    { name: 'Subuh', time: prayerSchedule.Subuh },
    { name: 'Dzuhur', time: prayerSchedule.Dzuhur },
    { name: 'Ashar', time: prayerSchedule.Ashar },
    { name: 'Maghrib', time: prayerSchedule.Maghrib },
    { name: 'Isya', time: prayerSchedule.Isya },
  ];

  return (
    <div className="pb-8 space-y-4 animate-slide-up bg-slate-50 min-h-screen">
      <Header />

      <div className="px-5 space-y-5">
        {/* User Greeting & Status Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: theme.accentHex }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md text-white overflow-hidden border-2 border-white text-xl font-bold"
            >
              {user.avatarType === 'image' && user.avatarData ? (
                <img src={user.avatarData} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{user.avatarData || user.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Assalamu'alaikum,</p>
              <h3 className="text-lg font-black text-slate-800 leading-none">{user.name}</h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {user.cloudSync?.activeProvider === 'sheets_gas' && (
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-800 rounded-xl text-[10px] font-bold active:scale-95 transition-all shadow-2xs"
                title="Tersinkronisasi ke Google Spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Google Sheets</span>
              </button>
            )}
            {user.cloudSync?.activeProvider === 'supabase' && (
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 text-teal-800 rounded-xl text-[10px] font-bold active:scale-95 transition-all shadow-2xs"
                title="Tersinkronisasi ke Supabase DB"
              >
                <Database className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden sm:inline">Supabase</span>
              </button>
            )}
            {user.isBusyMode && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-xl text-[10px] font-bold">
                <Coffee className="w-3.5 h-3.5" />
                <span>Sibuk</span>
              </div>
            )}
            {user.isHolidayMode && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-sky-100 text-sky-700 rounded-xl text-[10px] font-bold">
                <Palmtree className="w-3.5 h-3.5" />
                <span>Libur</span>
              </div>
            )}
          </div>
        </div>

        {/* Level Progression Hero Card */}
        <div className={`bg-gradient-to-br ${theme.gradient} rounded-[2.5rem] p-6 text-white shadow-xl ${theme.shadow} relative overflow-hidden`}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

          <div className="flex justify-between items-start mb-5 relative z-10">
            <div>
              <span className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em] mb-1 block">Level Spiritual</span>
              <h3 className="text-3xl font-black tracking-tight leading-tight">{currentLevelInfo.name}</h3>
              <p className="text-[11px] font-medium text-white/90 mt-0.5">{currentLevelInfo.description}</p>
            </div>
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20">
              <Award className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="space-y-2.5 relative z-10">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-white/95">
              <span>{user.totalPoints.toLocaleString()} / {nextLevelThreshold.toLocaleString()} POIN</span>
              {nextLevel && <span>Menuju {LEVEL_CONFIG[nextLevel].name}</span>}
            </div>
            <div className="h-2.5 w-full bg-black/20 rounded-full overflow-hidden border border-white/20">
              <div
                className="h-full bg-white rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${progressToNextLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* Prayer Time & Countdown Widget */}
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 ${theme.badgeBg} ${theme.badgeText} rounded-xl`}>
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs tracking-tight">{locationName}</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Jadwal Shalat Akurat</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black text-slate-600">
                  {countdown.nextPrayer} dlm {countdown.timeRemaining}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                title="Pengaturan Notifikasi & Pengingat"
                className={`p-1.5 rounded-full border transition-all active:scale-90 ${
                  user.notifications?.enabled
                    ? 'bg-teal-50 border-teal-200 text-teal-600'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                {user.notifications?.enabled ? (
                  <BellRing className="w-3.5 h-3.5" />
                ) : (
                  <Bell className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {prayerList.map((p) => {
              const isNext = countdown.nextPrayer === p.name;
              return (
                <div
                  key={p.name}
                  className={`flex flex-col items-center p-2 rounded-2xl border transition-all ${
                    isNext
                      ? `${theme.bg} ${theme.border} ring-2 ring-teal-400 shadow-sm`
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <span className={`text-[8px] font-black uppercase tracking-tighter mb-0.5 ${isNext ? theme.text : 'text-slate-400'}`}>
                    {p.name}
                  </span>
                  <span className={`text-xs font-black ${isNext ? theme.text : 'text-slate-700'}`}>
                    {p.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Target Progress Card */}
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 ${theme.badgeBg} ${theme.badgeText} rounded-2xl`}>
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Target Hari Ini</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {todayLog.points} / {effectiveDailyTarget} POIN
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-black ${theme.text}`}>{dailyProgress}%</span>
            </div>
          </div>

          <div className="h-3.5 w-full bg-slate-100 rounded-2xl overflow-hidden p-0.5">
            <div
              className="h-full rounded-xl transition-all duration-700 shadow-sm"
              style={{ width: `${dailyProgress}%`, backgroundColor: theme.accentHex }}
            />
          </div>
        </div>

        {/* Main CTA: Go to Daily Checklist */}
        <button
          type="button"
          onClick={() => onNavigate('checklist')}
          className={`w-full flex items-center justify-between ${theme.buttonBg} p-4 rounded-[2rem] font-bold shadow-lg active:scale-95 transition-all group`}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-white/20 rounded-xl group-hover:bg-white/30 transition-all">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-base font-extrabold block leading-tight">Catat Amal Hari Ini</span>
              <span className="text-[10px] font-semibold text-white/80">Perbarui ibadah & kebiasaan harian</span>
            </div>
          </div>
          <div className="p-2 bg-white/20 rounded-full transition-all">
            <ChevronRight className="w-5 h-5" />
          </div>
        </button>

        {/* Quick Stats Summary Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 text-center">
            <div className="flex justify-center mb-1">
              <Flame className={`w-6 h-6 ${user.streak > 0 ? 'text-orange-500 fill-current animate-bounce' : 'text-slate-300'}`} />
            </div>
            <div className="text-3xl font-black text-slate-900 leading-tight">{user.streak}</div>
            <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Hari Konsisten</div>
          </div>

          <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 text-center">
            <div className={`flex justify-center mb-1 ${theme.text}`}>
               <TrendingUp className="w-6 h-6" />
            </div>
            <div className="text-3xl font-black text-slate-900 leading-tight">
              {user.totalPoints > 9999 ? (user.totalPoints / 1000).toFixed(1) + 'k' : user.totalPoints.toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Total Akumulasi Poin</div>
          </div>
        </div>

        {/* Daily Motivation & Hikmah Card */}
        <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex items-start gap-3.5">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-2xl shrink-0 mt-0.5">
            <Quote className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hikmah Hari Ini</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed italic">
              "{todayQuote.text}"
            </p>
            <span className="text-[9px] font-bold text-slate-400 block">— {todayQuote.source}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
