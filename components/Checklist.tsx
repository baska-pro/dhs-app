import React, { useState, useMemo } from 'react';
import { DailyLog, UserLevel, PrayerQuality, SystemSettings } from '../types.ts';
import { PRAYER_NAMES, THEMES, getIcon } from '../constants.tsx';
import { storage } from '../services/storage.ts';
import {
  ChevronDown,
  Plus,
  Minus,
  CheckCircle,
  Sparkles,
  LayoutList,
  Lock,
  StickyNote,
  Droplets,
  Filter,
  RotateCcw
} from 'lucide-react';
import { audio } from '../services/audio.ts';

interface ChecklistProps {
  log: DailyLog;
  userLevel: UserLevel;
  onUpdate: (log: DailyLog) => void;
}

const Checklist: React.FC<ChecklistProps> = ({ log, userLevel, onUpdate }) => {
  const [expanded, setExpanded] = useState<string | null>('prayers');
  const [isSaving, setIsSaving] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'uncompleted' | 'prayers' | 'habits'>('all');

  const user = storage.getUser();
  const sys: SystemSettings = useMemo(() => storage.getSystemSettings(), []);
  const theme = THEMES[user.gradientTheme || 'teal'] || THEMES.teal;
  const allowedCategories = sys.levelConfig[userLevel]?.categories || ['prayers', 'water'];

  const sortedCategories = useMemo(() => {
    return [...sys.categories].sort((a, b) => {
      const aAllowed = allowedCategories.includes(a.id);
      const bAllowed = allowedCategories.includes(b.id);
      if (aAllowed && !bAllowed) return -1;
      if (!aAllowed && bAllowed) return 1;
      return (a.openAt || 0) - (b.openAt || 0);
    });
  }, [sys.categories, allowedCategories]);

  const toggleCategory = (id: string) => {
    if (!allowedCategories.includes(id) && id !== 'custom') return;
    setExpanded(expanded === id ? null : id);
  };

  const calculateAndSave = (updatedLog: DailyLog) => {
    setIsSaving(true);
    let total = 0;
    Object.values(updatedLog.prayers).forEach(q => {
      total += sys.prayerPoints[q] || 0;
    });

    // 40 pts per liter (max 80 pts for 2.0L+)
    total += Math.min(80, Math.floor(updatedLog.waterLitres * 40));

    Object.keys(sys.habitItems).forEach(cat => {
      const selected = (updatedLog as any)[cat] as string[];
      if (selected && Array.isArray(selected)) {
        const items = sys.habitItems[cat] || [];
        selected.forEach(id => {
          const item = items.find(i => i.id === id);
          if (item) total += item.points;
        });
      }
    });

    updatedLog.customHabits.forEach(id => {
      const h = user.customHabits.find(item => item.id === id);
      if (h) total += h.points;
    });

    const finalPoints = Math.max(0, total);
    onUpdate({ ...updatedLog, points: finalPoints });
    setTimeout(() => setIsSaving(false), 500);
  };

  const updatePrayer = (prayer: string, quality: PrayerQuality) => {
    const currentQuality = log.prayers[prayer];
    const newQuality = currentQuality === quality ? 'NONE' : quality;
    if (newQuality !== 'NONE') {
      audio.playCheck();
    } else {
      audio.playUncheck();
    }
    const newPrayers = { ...log.prayers, [prayer]: newQuality };
    calculateAndSave({ ...log, prayers: newPrayers });
  };

  const toggleHabit = (category: string, habitId: string) => {
    const currentList = ((log as any)[category] as string[]) || [];
    const isAdding = !currentList.includes(habitId);
    if (isAdding) {
      audio.playCheck();
    } else {
      audio.playUncheck();
    }
    const newList = isAdding
      ? [...currentList, habitId]
      : currentList.filter(id => id !== habitId);
    calculateAndSave({ ...log, [category]: newList });
  };

  const toggleCustomHabit = (id: string) => {
    const isAdding = !log.customHabits.includes(id);
    if (isAdding) {
      audio.playCheck();
    } else {
      audio.playUncheck();
    }
    const newList = isAdding
      ? [...log.customHabits, id]
      : log.customHabits.filter(i => i !== id);
    calculateAndSave({ ...log, customHabits: newList });
  };

  const updateWater = (delta: number) => {
    const newVal = Math.max(0, parseFloat((log.waterLitres + delta).toFixed(2)));
    if (delta > 0) audio.playWater();
    calculateAndSave({ ...log, waterLitres: newVal });
  };

  const resetWater = () => {
    audio.playUncheck();
    calculateAndSave({ ...log, waterLitres: 0 });
  };

  const waterInUnits = user.waterUnit === 'G' ? (log.waterLitres * 4).toFixed(1) : log.waterLitres.toFixed(1);
  const waterTarget = user.waterUnit === 'G' ? '10 Gelas' : '2.5 L';
  const waterProgress = Math.min(100, Math.round((log.waterLitres / 2.5) * 100));

  const calculateCategoryProgress = (catId: string): number => {
    if (catId === 'prayers') {
      const completed = Object.values(log.prayers).filter(v => v !== 'NONE').length;
      return Math.round((completed / 5) * 100);
    }
    if (catId === 'water') {
      return waterProgress;
    }
    if (catId === 'custom') {
      if (user.customHabits.length === 0) return 0;
      return Math.round((log.customHabits.length / user.customHabits.length) * 100);
    }
    const items = sys.habitItems[catId];
    if (!items || items.length === 0) return 0;
    const completedCount = ((log as any)[catId] as string[])?.length || 0;
    return Math.round((completedCount / items.length) * 100);
  };

  const filteredCategories = sortedCategories.filter(cat => {
    if (activeFilter === 'prayers') return cat.id === 'prayers' || cat.id === 'sunnah';
    if (activeFilter === 'habits') return cat.id !== 'prayers' && cat.id !== 'sunnah';
    if (activeFilter === 'uncompleted') {
      const prog = calculateCategoryProgress(cat.id);
      return prog < 100 && allowedCategories.includes(cat.id);
    }
    return true;
  });

  return (
    <div className="p-5 pb-32 space-y-4 animate-slide-up bg-slate-50 min-h-screen">
      {/* Sticky Header Bar */}
      <div className="sticky top-0 z-30 -mx-5 px-5 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: theme.accentHex }}
            className="p-2 rounded-2xl shadow-md text-white"
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">Amal Harian</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {isSaving ? 'Menyimpan...' : 'Data Tersinkron'}
              </span>
            </div>
          </div>
        </div>

        <div className={`px-4 py-2 ${theme.badgeBg} border ${theme.border} ${theme.text} rounded-2xl shadow-sm text-lg font-black tracking-tight flex items-baseline gap-1`}>
          {log.points} <span className="text-[9px] font-bold opacity-75 uppercase">POIN</span>
        </div>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeFilter === 'all'
              ? `${theme.buttonBg} shadow-sm`
              : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          Semua Kategori
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('uncompleted')}
          className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeFilter === 'uncompleted'
              ? `${theme.buttonBg} shadow-sm`
              : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          Belum Selesai
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('prayers')}
          className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeFilter === 'prayers'
              ? `${theme.buttonBg} shadow-sm`
              : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          Shalat Saja
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('habits')}
          className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeFilter === 'habits'
              ? `${theme.buttonBg} shadow-sm`
              : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          Kebiasaan Fisik & Lainnya
        </button>
      </div>

      {/* Reflection Note Banner */}
      {log.notes && (
        <div
          onClick={() => setShowNotes(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') setShowNotes(true); }}
          className={`p-4 bg-white border ${theme.border} rounded-[2rem] flex items-start gap-3 shadow-sm cursor-pointer active:scale-98 transition-all`}
        >
           <div className={`p-2 rounded-xl ${theme.badgeBg} ${theme.text} shrink-0`}>
             <StickyNote className="w-5 h-5" />
           </div>
           <div className="space-y-1 flex-1">
             <span className={`text-[10px] font-black ${theme.text} uppercase tracking-widest block`}>Refleksi Hari Ini:</span>
             <p className="text-xs text-slate-600 font-medium italic leading-relaxed line-clamp-2">"{log.notes}"</p>
           </div>
        </div>
      )}

      {/* Category Accordion List */}
      <div className="space-y-3">
        {filteredCategories.map(cat => {
          const isLocked = !allowedCategories.includes(cat.id);
          const dynamicColor = isLocked ? 'bg-slate-300' : cat.color;
          const levelNeeded = sys.levelConfig[cat.openAt || 1]?.name || 'Tinggi';
          const progress = calculateCategoryProgress(cat.id);

          return (
            <div
              key={cat.id}
              className={`rounded-[2rem] shadow-sm border overflow-hidden transition-all duration-300 bg-white border-slate-100 ${
                isLocked ? 'opacity-60' : ''
              } ${expanded === cat.id ? `ring-2 ring-teal-100 shadow-md` : ''}`}
            >
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`w-full flex items-center justify-between p-4.5 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-2xl text-white shadow-md ${dynamicColor}`}>
                    {getIcon(cat.icon)}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className={`font-black text-base block leading-none ${isLocked ? 'text-slate-400' : 'text-slate-800'}`}>
                        {cat.name}
                      </span>
                      {!isLocked && progress > 0 && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          progress === 100 ? 'bg-emerald-100 text-emerald-700' : `${theme.badgeBg} ${theme.badgeText}`
                        }`}>
                          {progress}%
                        </span>
                      )}
                      {isLocked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-1">
                      {isLocked ? `Buka di Level ${levelNeeded}` : `${progress === 100 ? '✅ Selesai Semua' : 'Ketuk untuk melengkapi'}`}
                    </span>
                  </div>
                </div>
                {!isLocked && (
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 text-slate-400 ${expanded === cat.id ? 'rotate-180' : ''}`} />
                )}
              </button>

              {expanded === cat.id && !isLocked && (
                <div className="p-4 pt-0 border-t border-slate-50 space-y-3.5 animate-slide-up">
                  {/* Shalat Wajib UI */}
                  {cat.id === 'prayers' && PRAYER_NAMES.map(p => (
                    <div key={p} className="space-y-2 bg-slate-50/60 p-3.5 rounded-3xl border border-slate-100">
                      <div className="flex justify-between items-center px-1">
                        <span className={`text-xs font-black text-slate-800 uppercase tracking-wider`}>{p}</span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {log.prayers[p] && log.prayers[p] !== 'NONE' ? `+${sys.prayerPoints[log.prayers[p]]} Poin` : 'Pilih Waktu'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.keys(sys.prayerPoints).filter(q => q !== 'NONE').map(q => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => updatePrayer(p, q as PrayerQuality)}
                            className={`text-[9px] p-2.5 rounded-xl font-black uppercase border-2 transition-all active:scale-95 ${
                              log.prayers[p] === q
                              ? (q === 'TERLEWAT' ? 'bg-rose-500 text-white border-rose-500 shadow-md' : `${theme.buttonBg} border-transparent shadow-md`)
                              : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            {q.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Water Tracker UI */}
                  {cat.id === 'water' && (
                    <div className="flex flex-col items-center gap-4 py-5 bg-gradient-to-b from-sky-50 to-teal-50 rounded-3xl border border-sky-100">
                      <div className="text-center space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-sky-600">
                          <Droplets className="w-5 h-5 fill-current animate-pulse" />
                          <span className="font-black text-4xl">{waterInUnits}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-sky-700">
                          {user.waterUnit === 'G' ? 'Gelas Air' : 'Liter Air'} ({waterProgress}%)
                        </span>
                      </div>

                      {/* Water Bar */}
                      <div className="w-48 h-3 bg-white rounded-full overflow-hidden border border-sky-100 p-0.5">
                        <div
                          className="h-full bg-sky-500 rounded-full transition-all duration-500"
                          style={{ width: `${waterProgress}%` }}
                        />
                      </div>

                      {/* Quick Water Action Buttons */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updateWater(-0.25)}
                          className="w-12 h-12 bg-white shadow-sm rounded-2xl font-black text-lg text-slate-700 flex items-center justify-center border border-slate-100 active:scale-90"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateWater(0.25)}
                          className="px-5 h-12 bg-sky-500 text-white shadow-lg shadow-sky-200 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-transform"
                        >
                          <Plus className="w-4 h-4" /> +1 Gelas (250ml)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateWater(0.5)}
                          className="px-4 h-12 bg-teal-500 text-white shadow-lg shadow-teal-200 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-transform"
                        >
                          <Plus className="w-4 h-4" /> +500ml
                        </button>
                        <button
                          type="button"
                          onClick={resetWater}
                          className="w-10 h-10 bg-white/80 rounded-xl text-slate-400 flex items-center justify-center active:scale-90"
                          title="Reset Air"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Target Optimal: {waterTarget} / hari
                      </span>
                    </div>
                  )}

                  {/* Standard Category Habits */}
                  {cat.id !== 'prayers' && cat.id !== 'water' && (sys.habitItems[cat.id] || []).map(item => {
                    const isChecked = (((log as any)[cat.id] || []) as string[]).includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleHabit(cat.id, item.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-98 ${
                          isChecked
                          ? `${theme.bg} ${theme.border} ${theme.text} shadow-sm`
                          : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-3 text-left">
                          <CheckCircle className={`w-5 h-5 ${isChecked ? 'text-teal-500 fill-teal-100' : 'text-slate-300'}`} />
                          <span className={`font-bold text-sm leading-snug ${isChecked ? 'text-slate-800 font-extrabold' : ''}`}>
                            {item.label}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 ${isChecked ? `${theme.badgeBg} ${theme.badgeText}` : 'bg-slate-200 text-slate-600'}`}>
                          +{item.points}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Custom Habits Section */}
        {user.customHabits.length > 0 && (
          <div className={`rounded-[2rem] bg-white border border-slate-100 overflow-hidden shadow-sm ${expanded === 'custom' ? `ring-2 ring-teal-100` : ''}`}>
            <button
              type="button"
              onClick={() => toggleCategory('custom')}
              className="w-full flex items-center justify-between p-4.5 cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-teal-500 text-white shadow-md">
                  <LayoutList className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-800 text-base block leading-none">Amal Kustom Pribadi</span>
                    {calculateCategoryProgress('custom') > 0 && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        calculateCategoryProgress('custom') === 100 ? 'bg-emerald-100 text-emerald-700' : `${theme.badgeBg} ${theme.badgeText}`
                      }`}>
                        {calculateCategoryProgress('custom')}%
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">
                    {user.customHabits.length} Item Tambahan
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform duration-300 text-slate-400 ${expanded === 'custom' ? 'rotate-180' : ''}`} />
            </button>

            {expanded === 'custom' && (
              <div className="p-4 pt-0 space-y-2.5 border-t border-slate-50 animate-slide-up">
                {user.customHabits.map(h => {
                  const isChecked = log.customHabits.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggleCustomHabit(h.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-98 ${
                        isChecked
                        ? `${theme.bg} ${theme.border} ${theme.text} shadow-sm`
                        : 'bg-slate-50 border-transparent text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <CheckCircle className={`w-5 h-5 ${isChecked ? 'text-teal-500 fill-teal-100' : 'text-slate-300'}`} />
                        <span className="font-bold text-sm">{h.label}</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${isChecked ? `${theme.badgeBg} ${theme.badgeText}` : 'bg-slate-200 text-slate-600'}`}>
                        +{h.points}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Sticky Reflection Button */}
      <div className="fixed bottom-24 right-5 z-40">
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          aria-label="Catatan Refleksi"
          className={`p-4 rounded-full shadow-2xl transition-all active:scale-90 border-4 border-white ${
            showNotes ? 'bg-slate-900 text-white' : `${theme.buttonBg} shadow-teal-200`
          }`}
        >
          <StickyNote className="w-6 h-6" />
        </button>
      </div>

      {/* Daily Reflection Modal */}
      {showNotes && (
        <div className="fixed inset-0 z-[100] p-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowNotes(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-2xl animate-slide-up space-y-4">
            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-800 uppercase tracking-wider">Refleksi & Catatan</h4>
              <p className="text-xs text-slate-400 font-medium">Tuliskan evaluasi atau rasa syukur harimu</p>
            </div>

            <textarea
              value={log.notes}
              onChange={(e) => onUpdate({ ...log, notes: e.target.value })}
              placeholder="Contoh: Alhamdulillah hari ini shalat tepat waktu, merasa lebih tenang dan produktif..."
              className="w-full h-36 bg-slate-50 rounded-3xl p-4 text-sm font-medium border border-slate-100 outline-none focus:ring-2 focus:ring-teal-500 resize-none text-slate-700"
            />

            <button
              type="button"
              onClick={() => setShowNotes(false)}
              className={`w-full p-4 ${theme.buttonBg} rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all`}
            >
              Simpan Refleksi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checklist;
