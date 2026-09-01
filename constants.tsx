import React from 'react';
import { UserLevel, PrayerQuality, Category } from './types.ts';
import {
  Droplets,
  Activity,
  Utensils,
  Brain,
  Heart,
  Smartphone,
  Sparkles,
  Moon,
  Clock,
  Wind
} from 'lucide-react';

export const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Clock': return <Clock className="w-5 h-5" />;
    case 'Droplets': return <Droplets className="w-5 h-5" />;
    case 'Sparkles': return <Sparkles className="w-5 h-5" />;
    case 'Activity': return <Activity className="w-5 h-5" />;
    case 'Utensils': return <Utensils className="w-5 h-5" />;
    case 'Brain': return <Brain className="w-5 h-5" />;
    case 'Heart': return <Heart className="w-5 h-5" />;
    case 'Smartphone': return <Smartphone className="w-5 h-5" />;
    case 'Wind': return <Wind className="w-5 h-5" />;
    case 'Moon': return <Moon className="w-5 h-5" />;
    default: return <Sparkles className="w-5 h-5" />;
  }
};

export const DEFAULT_LEVEL_CONFIG = {
  [UserLevel.MUBTADI]: {
    name: 'Mubtadi',
    description: 'Pencari Awal - Membangun Fondasi Pokok',
    threshold: 0,
    categories: ['prayers', 'water'],
    minPoints: 100
  },
  [UserLevel.MUQTASID]: {
    name: 'Muqtasid',
    description: 'Konsisten - Menjaga Ibadah & Fisik Sehat',
    threshold: 1000,
    categories: ['prayers', 'water', 'sunnah', 'physical', 'diet'],
    minPoints: 250
  },
  [UserLevel.MUHSIN]: {
    name: 'Muhsin',
    description: 'Penyempurna - Produktivitas & Sosial Mulia',
    threshold: 3500,
    categories: ['prayers', 'water', 'sunnah', 'physical', 'diet', 'productivity', 'social'],
    minPoints: 500
  },
  [UserLevel.SABIQ]: {
    name: 'Sabiq',
    description: 'Terdepan - Harmoni Total & Disiplin Diri',
    threshold: 10000,
    categories: ['prayers', 'water', 'sunnah', 'physical', 'diet', 'productivity', 'social', 'digital', 'cleanliness', 'sleep'],
    minPoints: 800
  }
};

export interface ThemeConfig {
  name: string;
  primary: string;
  secondary: string;
  gradient: string;
  shadow: string;
  text: string;
  bg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  accentHex: string;
  buttonBg: string;
}

export const THEMES: Record<string, ThemeConfig> = {
  teal: {
    name: 'Teal Samudera',
    primary: 'teal-500',
    secondary: 'teal-600',
    gradient: 'from-teal-500 via-teal-600 to-cyan-700',
    shadow: 'shadow-teal-200',
    text: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-100',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    accentHex: '#0d9488',
    buttonBg: 'bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white'
  },
  gold: {
    name: 'Emas Mulia',
    primary: 'amber-500',
    secondary: 'amber-600',
    gradient: 'from-amber-500 via-amber-600 to-yellow-700',
    shadow: 'shadow-amber-200',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    accentHex: '#d97706',
    buttonBg: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white'
  },
  emerald: {
    name: 'Zamrud Firdaus',
    primary: 'emerald-500',
    secondary: 'emerald-600',
    gradient: 'from-emerald-500 via-emerald-600 to-teal-700',
    shadow: 'shadow-emerald-200',
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    accentHex: '#059669',
    buttonBg: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white'
  },
  sapphire: {
    name: 'Safir Langit',
    primary: 'blue-500',
    secondary: 'blue-600',
    gradient: 'from-blue-500 via-blue-600 to-indigo-700',
    shadow: 'shadow-blue-200',
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    accentHex: '#2563eb',
    buttonBg: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white'
  },
  ruby: {
    name: 'Delima Semangat',
    primary: 'rose-500',
    secondary: 'rose-600',
    gradient: 'from-rose-500 via-rose-600 to-red-700',
    shadow: 'shadow-rose-200',
    text: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    accentHex: '#e11d48',
    buttonBg: 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white'
  }
};

export const DEFAULT_PRAYER_POINTS: Record<PrayerQuality, number> = {
  AWAL: 50,
  TENGAH: 30,
  AKHIR: 15,
  HAMPIR_HABIS: 5,
  TERLEWAT: -5,
  NONE: 0
};

export const PRAYER_NAMES = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'prayers', name: 'Shalat Wajib', icon: 'Clock', color: 'bg-teal-600', openAt: UserLevel.MUBTADI },
  { id: 'water', name: 'Minum Air', icon: 'Droplets', color: 'bg-sky-500', openAt: UserLevel.MUBTADI },
  { id: 'sunnah', name: 'Shalat Sunnah', icon: 'Sparkles', color: 'bg-teal-500', openAt: UserLevel.MUQTASID },
  { id: 'physical', name: 'Kesehatan Fisik', icon: 'Activity', color: 'bg-rose-500', openAt: UserLevel.MUQTASID },
  { id: 'diet', name: 'Pola Makan', icon: 'Utensils', color: 'bg-orange-500', openAt: UserLevel.MUQTASID },
  { id: 'productivity', name: 'Produktivitas', icon: 'Brain', color: 'bg-emerald-500', openAt: UserLevel.MUHSIN },
  { id: 'social', name: 'Amal & Sosial', icon: 'Heart', color: 'bg-red-500', openAt: UserLevel.MUHSIN },
  { id: 'digital', name: 'Digital Wellbeing', icon: 'Smartphone', color: 'bg-slate-600', openAt: UserLevel.SABIQ },
  { id: 'cleanliness', name: 'Kebersihan', icon: 'Wind', color: 'bg-teal-400', openAt: UserLevel.SABIQ },
  { id: 'sleep', name: 'Tidur & Ritme', icon: 'Moon', color: 'bg-indigo-800', openAt: UserLevel.SABIQ },
];

export const DEFAULT_HABIT_ITEMS: Record<string, { id: string, label: string, points: number }[]> = {
  sunnah: [
    { id: 'dhuha', label: 'Shalat Dhuha', points: 30 },
    { id: 'rawatib', label: 'Shalat Rawatib (Qabliyah/Ba\'diyah)', points: 20 },
    { id: 'tahajud', label: 'Tahajud / Qiyamul Lail', points: 50 },
    { id: 'witir', label: 'Shalat Witir', points: 20 },
  ],
  physical: [
    { id: 'workout_30', label: 'Olahraga / Latihan >30 menit', points: 40 },
    { id: 'stretching', label: 'Stretching & Peregangan Pagi', points: 15 },
    { id: 'steps', label: 'Jalan Kaki 5.000 Langkah', points: 30 },
    { id: 'posture', label: 'Jaga Postur & Ergonomi Duduk', points: 10 },
  ],
  diet: [
    { id: 'breakfast', label: 'Sarapan Bergizi & Halal', points: 15 },
    { id: 'lunch', label: 'Makan Siang Tepat Waktu', points: 15 },
    { id: 'no_junkfood', label: 'Hindari Makanan Cepat Saji / Manis Berlebih', points: 25 },
    { id: 'fruits', label: 'Konsumsi Buah & Sayuran Segar', points: 20 },
  ],
  productivity: [
    { id: 'main_target', label: 'Selesaikan Target Utama (MIT)', points: 50 },
    { id: 'learning', label: 'Membaca / Belajar Ilmu 30 Menit', points: 40 },
    { id: 'evaluation', label: 'Evaluasi Diri & Muhasabah Malam', points: 20 },
    { id: 'focus_work', label: 'Sesi Deep Work Tanpa Distraksi (1 Jam)', points: 35 },
  ],
  social: [
    { id: 'charity', label: 'Sedekah / Infaq Harian', points: 40 },
    { id: 'help', label: 'Membantu Rekan / Orang Lain', points: 30 },
    { id: 'parents', label: 'Silaturahmi / Doakan Orang Tua', points: 50 },
    { id: 'smile', label: 'Tebar Salam, Senyum & Berkata Baik', points: 15 },
  ],
  digital: [
    { id: 'screen_time', label: 'Screen Time Terkendali (< 3 Jam HP)', points: 40 },
    { id: 'no_doomscrolling', label: 'Bebas Doomscrolling Medsos', points: 30 },
    { id: 'unplugged', label: 'Lepas Gadget 30 Menit Sebelum Tidur', points: 30 },
    { id: 'clean_notif', label: 'Matikan Notifikasi yang Tidak Penting', points: 15 },
  ],
  cleanliness: [
    { id: 'bed', label: 'Merapikan Tempat Tidur Bangun Pagi', points: 15 },
    { id: 'room', label: 'Meja Kerja & Ruang Pribadi Bersih', points: 20 },
    { id: 'environment', label: 'Pungut Sampah / Jaga Kebersihan', points: 20 },
    { id: 'sunnah_clean', label: 'Kebersihan Diri & Sunnah Fitrah', points: 25 },
  ],
  sleep: [
    { id: 'on_time', label: 'Tidur Sebelum Jam 23.00', points: 30 },
    { id: 'no_snooze', label: 'Bangun Sekali Alarm (No Snooze)', points: 25 },
    { id: 'morning_dhikr', label: 'Dzikir Pagi & Doa Bangun Tidur', points: 30 },
    { id: 'qailulah', label: 'Qailulah / Power Nap 15-20 Menit', points: 15 },
  ]
};

export const DAILY_QUOTES = [
  { text: "Amalan yang paling dicintai oleh Allah adalah amalan yang kontinu walaupun sedikit.", source: "HR. Muslim" },
  { text: "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lainnya.", source: "HR. Ahmad" },
  { text: "Mukmin yang kuat lebih baik dan lebih dicintai Allah daripada mukmin yang lemah.", source: "HR. Muslim" },
  { text: "Jagalah Allah, niscaya Dia akan menjagamu.", source: "HR. Tirmidzi" },
  { text: "Barangsiapa menempuh jalan mencari ilmu, Allah mudahkan baginya jalan menuju surga.", source: "HR. Muslim" },
  { text: "Sesungguhnya bersama kesulitan ada kemudahan.", source: "QS. Al-Insyirah: 6" },
  { text: "Kunci keberhasilan istiqomah adalah niat tulus dan disiplin kecil setiap hari.", source: "DHS Hikmah" }
];

export const LEVEL_CONFIG = DEFAULT_LEVEL_CONFIG;
export const CATEGORIES = DEFAULT_CATEGORIES;
export const HABIT_ITEMS = DEFAULT_HABIT_ITEMS;
export const PRAYER_POINTS = DEFAULT_PRAYER_POINTS;
