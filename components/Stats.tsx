import React, { useState, useMemo } from 'react';
import { DailyLog } from '../types.ts';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { BarChart3, TrendingUp, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Droplets, CheckCircle2, Award, Clock } from 'lucide-react';
import { Modal } from './Modal.tsx';
import { storage } from '../services/storage.ts';
import { THEMES } from '../constants.tsx';
import { toLocalDateKey } from '../utils/date.ts';

interface StatsProps {
  logs: Record<string, DailyLog>;
}

const Stats: React.FC<StatsProps> = ({ logs }) => {
  const [selectedEndDate, setSelectedEndDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [navDate, setNavDate] = useState(new Date());

  const user = storage.getUser();
  const theme = THEMES[user.gradientTheme || 'teal'] || THEMES.teal;

  // 7-day trend chart
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(selectedEndDate);
      d.setDate(d.getDate() - i);
      const dateStr = toLocalDateKey(d);
      const log = logs[dateStr];
      data.push({
        fullDate: dateStr,
        date: d.toLocaleDateString('id-ID', { weekday: 'narrow', day: 'numeric' }),
        poin: log?.points || 0,
        water: log?.waterLitres || 0,
      });
    }
    return data;
  }, [logs, selectedEndDate]);

  // Prayer breakdown across the 7-day period
  const prayerStats = useMemo(() => {
    let awal = 0, tengah = 0, akhir = 0, hampir = 0, terlewat = 0, totalFilled = 0;
    chartData.forEach(day => {
      const log = logs[day.fullDate];
      if (log && log.prayers) {
        Object.values(log.prayers).forEach(q => {
          if (q === 'AWAL') { awal++; totalFilled++; }
          else if (q === 'TENGAH') { tengah++; totalFilled++; }
          else if (q === 'AKHIR') { akhir++; totalFilled++; }
          else if (q === 'HAMPIR_HABIS') { hampir++; totalFilled++; }
          else if (q === 'TERLEWAT') { terlewat++; totalFilled++; }
        });
      }
    });
    return [
      { name: 'Awal', count: awal, color: '#0d9488' },
      { name: 'Tengah', count: tengah, color: '#3b82f6' },
      { name: 'Akhir', count: akhir, color: '#f59e0b' },
      { name: 'Hampir Habis', count: hampir, color: '#ea580c' },
      { name: 'Terlewat', count: terlewat, color: '#ef4444' },
    ];
  }, [logs, chartData]);

  // Habit frequency rank
  const habitsFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    chartData.forEach(day => {
      const log = logs[day.fullDate];
      if (log) {
        ['sunnah', 'physical', 'diet', 'productivity', 'social', 'digital', 'cleanliness', 'sleep'].forEach(cat => {
          const catData = (log as any)[cat];
          if (catData && Array.isArray(catData)) {
            catData.forEach((id: string) => {
              counts[id] = (counts[id] || 0) + 1;
            });
          }
        });
      }
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name: name.replace(/_/g, ' '), count }));
  }, [logs, chartData]);

  const totalPointsWeek = chartData.reduce((acc, curr) => acc + curr.poin, 0);
  const avgPointsDaily = Math.round(totalPointsWeek / 7);
  const avgWaterDaily = (chartData.reduce((acc, curr) => acc + curr.water, 0) / 7).toFixed(1);

  // Calendar render helpers
  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const startDayOfMonth = (date: Date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return d === 0 ? 6 : d - 1;
  };

  const renderCalendar = () => {
    const totalDays = daysInMonth(navDate);
    const offset = startDayOfMonth(navDate);
    const days = [];
    const dayNames = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];

    for (let i = 0; i < offset; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(navDate.getFullYear(), navDate.getMonth(), d);
      const dateStr = toLocalDateKey(dateObj);
      const hasData = logs[dateStr] !== undefined && logs[dateStr].points > 0;
      const isSelected = toLocalDateKey(selectedEndDate) === dateStr;
      const isToday = toLocalDateKey() === dateStr;

      days.push(
        <button
          key={d}
          type="button"
          onClick={() => {
            setSelectedEndDate(dateObj);
            setIsCalendarOpen(false);
          }}
          className={`h-10 w-full flex flex-col items-center justify-center rounded-2xl relative transition-all active:scale-90 ${
            isSelected
              ? `${theme.buttonBg} shadow-md`
              : 'hover:bg-slate-50'
          }`}
        >
          <span className={`text-xs font-bold ${isToday && !isSelected ? 'text-teal-600 underline font-black' : 'text-slate-700'}`}>
            {d}
          </span>
          {hasData && (
            <div className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${isSelected ? 'bg-white' : 'bg-teal-500'}`} />
          )}
        </button>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider">
            {navDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() - 1, 1))}
              className="p-2 bg-slate-100 rounded-xl active:scale-90"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() + 1, 1))}
              className="p-2 bg-slate-100 rounded-xl active:scale-90"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {dayNames.map((n, idx) => (
            <span key={`day-header-${idx}`} className="text-[10px] font-black text-slate-300 uppercase">{n}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="p-5 pb-32 space-y-5 animate-slide-up bg-slate-50 min-h-screen">
      {/* Title & Date Picker Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Statistik & Analisis</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Sampai {selectedEndDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCalendarOpen(true)}
          className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-90 transition-transform"
          aria-label="Pilih Periode Tanggal"
        >
           <CalendarIcon className={`w-5 h-5 ${theme.text}`} />
        </button>
      </div>

      {/* Main Period Banner */}
      <div className={`bg-gradient-to-br ${theme.gradient} rounded-[2.5rem] p-6 text-white shadow-xl ${theme.shadow} flex justify-between items-center relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10 space-y-1">
          <span className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em] block">Total 7 Hari Terakhir</span>
          <div className="text-4xl font-black">{totalPointsWeek.toLocaleString()} <span className="text-xs font-bold uppercase opacity-80">POIN</span></div>
          <div className="text-[10px] font-medium text-white/90">Rata-rata: {avgPointsDaily} poin/hari</div>
        </div>
        <div className="w-16 h-16 bg-white/15 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20 relative z-10 shadow-sm">
          <TrendingUp className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Quick Summary Metric Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-sky-600">
            <Droplets className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Rata-rata Air</span>
          </div>
          <div className="text-2xl font-black text-slate-800">{avgWaterDaily} <span className="text-xs font-bold text-slate-400">L/hari</span></div>
        </div>

        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-teal-600">
            <Award className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Streak Saat Ini</span>
          </div>
          <div className="text-2xl font-black text-slate-800">{user.streak} <span className="text-xs font-bold text-slate-400">Hari</span></div>
        </div>
      </div>

      {/* 7-Day Trend Area Chart */}
      <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className={`w-4 h-4 ${theme.text}`} />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Grafik Poin Harian</h3>
          </div>
          <span className="text-[9px] font-bold text-slate-400">7 Hari</span>
        </div>

        <div className="h-44 w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="themeColorPoin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.accentHex} stopOpacity={0.35}/>
                  <stop offset="95%" stopColor={theme.accentHex} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
              />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip
                cursor={{ stroke: theme.accentHex, strokeWidth: 1 }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 20px -4px rgb(0 0 0 / 0.12)', padding: '10px 14px' }}
                itemStyle={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}
                formatter={(value: any) => [`${value} Poin`, 'Poin']}
              />
              <Area
                type="monotone"
                dataKey="poin"
                stroke={theme.accentHex}
                strokeWidth={3.5}
                fillOpacity={1}
                fill="url(#themeColorPoin)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Shalat Quality Distribution */}
      <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${theme.text}`} />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Distribusi Ketepatan Waktu Shalat</h3>
        </div>

        <div className="space-y-2.5">
          {prayerStats.map(item => {
            const maxVal = Math.max(...prayerStats.map(x => x.count), 1);
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">{item.name}</span>
                  <span className="font-black text-slate-500 text-[10px]">{item.count} Waktu</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(item.count / maxVal) * 100}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Consistent Habits */}
      <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className={`w-4 h-4 ${theme.text}`} />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Amal Paling Rutin Dilakukan</h3>
        </div>

        <div className="space-y-3.5">
          {habitsFrequency.map((h) => (
            <div key={h.name} className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-slate-700 capitalize">{h.name}</span>
                <span className={`text-[10px] font-black ${theme.badgeBg} ${theme.badgeText} px-2 py-0.5 rounded-lg`}>
                  {h.count}x / 7 hari
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(h.count / 7) * 100}%`, backgroundColor: theme.accentHex }}
                />
              </div>
            </div>
          ))}

          {habitsFrequency.length === 0 && (
            <div className="text-center py-6">
              <p className="text-slate-400 text-xs font-bold">Belum ada kebiasaan yang dicatat pada rentang 7 hari ini.</p>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Modal */}
      <Modal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} title="Pilih Tanggal Riwayat">
        {renderCalendar()}
      </Modal>
    </div>
  );
};

export default Stats;
