
import React, { useState, useRef } from 'react';
import { SystemSettings, Category, HabitItem, LevelInfo, UserLevel, UserProfile } from '../types';
import { storage } from '../services/storage';
import {
  ArrowLeft,
  ChevronRight,
  FileJson,
  Edit3,
  Plus,
  Trash2,
  Download,
  Upload,
  Zap,
  LayoutList,
  Layers,
  Award,
  Users,
  Target,
  Check,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import { Modal } from './Modal';
import { getIcon, THEMES } from '../constants';

interface DeveloperMenuProps {
  user: UserProfile;
  onUserUpdate: (user: UserProfile) => void;
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const DeveloperMenu: React.FC<DeveloperMenuProps> = ({ user, onUserUpdate, onClose, showToast }) => {
  const [settings, setSettings] = useState<SystemSettings>(storage.getSystemSettings());
  const [activeSection, setActiveSection] = useState<'root' | 'points' | 'checklist' | 'categories' | 'levels' | 'user_prog'>('root');

  // Interaction States
  const [editingHabit, setEditingHabit] = useState<{ catId: string, habit: HabitItem } | null>(null);
  const [isAddingHabitToCat, setIsAddingHabitToCat] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingLevel, setEditingLevel] = useState<{ id: string, level: LevelInfo } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: string, id: string, parentId?: string } | null>(null);

  const [userPointsInput, setUserPointsInput] = useState(user.totalPoints.toString());
  const [selectedLevel, setSelectedLevel] = useState<UserLevel>(user.level);
  const [importPreview, setImportPreview] = useState<SystemSettings | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const saveSettings = (newSettings: SystemSettings) => {
    storage.saveSystemSettings(newSettings);
    setSettings(newSettings);
  };

  const handleExport = () => {
    storage.exportSystemSettings();
    showToast('File setting berhasil diunduh', 'success');
  };

  const onImportSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.categories && data.habitItems) {
            setImportPreview(data);
          } else {
            showToast('Format file tidak valid', 'error');
          }
        } catch (err) {
          showToast('Gagal membaca file', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  const applyImport = () => {
    if (importPreview) {
      saveSettings(importPreview);
      setImportPreview(null);
      showToast('Setting sistem diperbarui!', 'success');
    }
  };

  // Habit Management
  const upsertHabit = (catId: string, habit: HabitItem) => {
    const newHabitItems = { ...settings.habitItems };
    const items = [...(newHabitItems[catId] || [])];
    const index = items.findIndex(i => i.id === habit.id);

    if (index > -1) {
      items[index] = habit;
    } else {
      items.push(habit);
    }

    newHabitItems[catId] = items;
    saveSettings({ ...settings, habitItems: newHabitItems });
    setEditingHabit(null);
    setIsAddingHabitToCat(null);
    showToast('Habit disimpan', 'success');
  };

  const deleteHabit = (catId: string, habitId: string) => {
    const newHabitItems = { ...settings.habitItems };
    newHabitItems[catId] = (newHabitItems[catId] || []).filter(i => i.id !== habitId);
    saveSettings({ ...settings, habitItems: newHabitItems });
    setConfirmDelete(null);
    showToast('Habit dihapus', 'info');
  };

  // Category Management
  const upsertCategory = (cat: Category) => {
    const newCategories = [...settings.categories];
    const index = newCategories.findIndex(c => c.id === cat.id);
    if (index > -1) {
      newCategories[index] = cat;
    } else {
      newCategories.push(cat);
    }
    saveSettings({ ...settings, categories: newCategories });
    setEditingCategory(null);
    showToast('Kategori disimpan', 'success');
  };

  // Level Management
  const updateLevel = (id: string, info: LevelInfo) => {
    const newLevelConfig = { ...settings.levelConfig };
    newLevelConfig[parseInt(id)] = info;
    saveSettings({ ...settings, levelConfig: newLevelConfig });
    setEditingLevel(null);
    showToast('Struktur level diperbarui', 'success');
  };

  const updateUserProgManually = () => {
    const pts = parseInt(userPointsInput);
    if (!isNaN(pts)) {
      onUserUpdate({ ...user, totalPoints: pts, level: selectedLevel });
      showToast(`Progres user diperbarui!`, 'success');
      setActiveSection('root');
    }
  };

  const renderSectionHeader = (title: string) => (
    <div className="flex items-center gap-4 mb-6">
      <button onClick={() => setActiveSection('root')} className="p-2 bg-slate-100 rounded-xl active:scale-90 transition-transform">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h3>
    </div>
  );

  const levelOptions = [
    { value: UserLevel.MUBTADI, label: 'Mubtadi' },
    { value: UserLevel.MUQTASID, label: 'Muqtasid' },
    { value: UserLevel.MUHSIN, label: 'Muhsin' },
    { value: UserLevel.SABIQ, label: 'Sabiq' },
  ];

  return (
    <div className="flex flex-col h-full space-y-4 animate-slide-up pb-8">
      {activeSection === 'root' && (
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-2 mb-2">Advanced Config</p>
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            {[
              { id: 'points', label: 'Pengaturan Poin Shalat', icon: <Zap className="w-5 h-5 text-amber-500" /> },
              { id: 'checklist', label: 'Manajemen Checklist', icon: <LayoutList className="w-5 h-5 text-teal-500" /> },
              { id: 'categories', label: 'Manajemen Kategori', icon: <Layers className="w-5 h-5 text-blue-500" /> },
              { id: 'levels', label: 'Manajemen Level', icon: <Award className="w-5 h-5 text-purple-500" /> },
              { id: 'user_prog', label: 'Edit Progres User (Instan)', icon: <Users className="w-5 h-5 text-emerald-500" /> },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                className="w-full flex items-center justify-between p-5 border-b border-slate-50 active:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-slate-50 rounded-2xl">{item.icon}</div>
                  <span className="font-bold text-slate-700">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            ))}
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-6 text-white space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Sistem Data</h4>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleExport} className="flex items-center justify-center gap-2 p-4 bg-white/10 rounded-2xl font-bold text-xs uppercase tracking-wider active:bg-white/20 transition-all">
                <Download className="w-4 h-4" /> Export
              </button>
              <button onClick={() => importInputRef.current?.click()} className="flex items-center justify-center gap-2 p-4 bg-teal-500 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 active:scale-95 transition-all">
                <Upload className="w-4 h-4" /> Import
              </button>
              <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={onImportSelected} />
            </div>
          </div>
        </div>
      )}

      {/* Manual Progres & Level Editing Section */}
      {activeSection === 'user_prog' && (
        <div className="space-y-6">
          {renderSectionHeader('Progres User')}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
             <div className="text-center space-y-2">
                <div className="p-4 bg-emerald-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-2">
                   <Target className="w-10 h-10 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 font-medium">Ubah poin dan level secara instan.</p>
             </div>

             <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Poin</label>
                  <input
                    type="number"
                    value={userPointsInput}
                    onChange={(e) => setUserPointsInput(e.target.value)}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-2xl font-black text-emerald-600 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Set Level (Instan Unlock)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {levelOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedLevel(opt.value)}
                        className={`p-3 rounded-2xl font-black text-[10px] uppercase tracking-wider border-2 transition-all ${
                          selectedLevel === opt.value
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                          : 'bg-white text-slate-400 border-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button onClick={updateUserProgManually} className="w-full p-5 bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-100 active:scale-95 transition-all">
                     Simpan Progres & Level
                  </button>
                </div>
             </div>
          </div>

          <div className="p-5 bg-amber-50 rounded-[2rem] border border-amber-100 flex gap-4">
            <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0" />
            <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
              Catatan: Mengubah level secara manual akan langsung membuka kategori checklist yang terkunci sesuai level yang dipilih.
            </p>
          </div>
        </div>
      )}

      {activeSection === 'points' && (
        <div className="space-y-4">
          {renderSectionHeader('Poin Shalat')}
          <div className="bg-white rounded-3xl border border-slate-100 p-2 shadow-sm space-y-1">
            {Object.entries(settings.prayerPoints).map(([quality, value]) => (
              <div key={quality} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all">
                <span className="text-xs font-black text-slate-500 uppercase">{quality.replace('_', ' ')}</span>
                <input
                  type="number"
                  value={value as number}
                  onChange={(e) => {
                    const newPoints = { ...settings.prayerPoints, [quality]: parseInt(e.target.value) || 0 };
                    saveSettings({ ...settings, prayerPoints: newPoints });
                  }}
                  className="w-16 bg-slate-100 p-2 rounded-xl text-center font-black text-teal-600 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'categories' && (
        <div className="space-y-4">
          {renderSectionHeader('Manajemen Kategori')}
          <div className="space-y-3">
            {settings.categories.map((cat) => (
              <div key={cat.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl text-white ${cat.color}`}>
                    {getIcon(cat.icon)}
                  </div>
                  <span className="font-bold text-slate-700">{cat.name}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingCategory(cat)} className="p-2 text-slate-400 bg-slate-50 rounded-xl active:bg-slate-100"><Edit3 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'checklist' && (
        <div className="space-y-4">
          {renderSectionHeader('Manajemen Habit')}
          <div className="space-y-4">
            {settings.categories.map(cat => (
              <div key={cat.id} className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{cat.name}</h4>
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                  {(settings.habitItems[cat.id] || []).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                        <span className="text-sm font-bold text-slate-700">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">+{item.points}</span>
                        <button onClick={() => setEditingHabit({ catId: cat.id, habit: item })} className="p-1.5 text-slate-300 hover:text-slate-500"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => setConfirmDelete({ type: 'habit', id: item.id, parentId: cat.id })} className="p-1.5 text-rose-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setIsAddingHabitToCat(cat.id)} className="w-full p-4 bg-slate-50 text-slate-400 font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-slate-100 active:bg-slate-200 transition-colors">
                    <Plus className="w-4 h-4" /> Habit Baru
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'levels' && (
        <div className="space-y-4">
          {renderSectionHeader('Manajemen Level')}
          <div className="space-y-3">
            {(Object.entries(settings.levelConfig) as [string, LevelInfo][]).map(([id, lv]) => (
              <div key={id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-slate-800 text-lg">{lv.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">{lv.description}</p>
                  </div>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                   <div className="space-y-1">
                      <span className="text-[8px] font-black text-slate-300 uppercase">Threshold</span>
                      <div className="font-black text-slate-700">{lv.threshold.toLocaleString()} Poin</div>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[8px] font-black text-slate-300 uppercase">Min Daily</span>
                      <div className="font-black text-slate-700">{lv.minPoints} Poin</div>
                   </div>
                </div>
                <button onClick={() => setEditingLevel({ id, level: lv })} className="w-full mt-2 p-3 bg-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 active:bg-slate-200">Edit Syarat Level</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Habit Edit/Add Modal */}
      {(editingHabit || isAddingHabitToCat) && (
        <Modal
          isOpen={true}
          onClose={() => { setEditingHabit(null); setIsAddingHabitToCat(null); }}
          title={editingHabit ? "Edit Habit" : "Tambah Habit Baru"}
        >
          <div className="space-y-6">
            <div className="space-y-4">
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nama Habit</label>
                 <input
                   type="text"
                   className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-teal-500"
                   defaultValue={editingHabit?.habit.label || ""}
                   onChange={(e) => {
                     const val = e.target.value;
                     if (editingHabit) setEditingHabit({ ...editingHabit, habit: { ...editingHabit.habit, label: val } });
                     else if (isAddingHabitToCat) {
                       // Temporary state for new habit creation
                       (window as any)._newHabitLabel = val;
                     }
                   }}
                 />
               </div>
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Poin</label>
                 <input
                   type="number"
                   className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-teal-500"
                   defaultValue={editingHabit?.habit.points || 10}
                   onChange={(e) => {
                     const val = parseInt(e.target.value);
                     if (editingHabit) setEditingHabit({ ...editingHabit, habit: { ...editingHabit.habit, points: val } });
                     else if (isAddingHabitToCat) {
                       (window as any)._newHabitPoints = val;
                     }
                   }}
                 />
               </div>
            </div>
            <button
              onClick={() => {
                if (editingHabit) upsertHabit(editingHabit.catId, editingHabit.habit);
                else if (isAddingHabitToCat) {
                  const label = (window as any)._newHabitLabel || "";
                  const points = (window as any)._newHabitPoints || 10;
                  if (label.trim()) {
                    upsertHabit(isAddingHabitToCat, { id: 'h_' + Date.now(), label, points });
                  }
                }
              }}
              className="w-full p-5 bg-teal-500 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all"
            >
              Simpan Habit
            </button>
          </div>
        </Modal>
      )}

      {/* Category Edit Modal */}
      {editingCategory && (
        <Modal isOpen={true} onClose={() => setEditingCategory(null)} title="Edit Kategori">
          <div className="space-y-6">
            <div className="space-y-4">
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nama Kategori</label>
                 <input
                   type="text"
                   className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-teal-500"
                   defaultValue={editingCategory.name}
                   onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                 />
               </div>
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Warna CSS Class (Tailwind)</label>
                 <input
                   type="text"
                   className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-teal-500"
                   defaultValue={editingCategory.color}
                   placeholder="bg-teal-600"
                   onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                 />
               </div>
            </div>
            <button
              onClick={() => upsertCategory(editingCategory)}
              className="w-full p-5 bg-teal-500 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all"
            >
              Simpan Kategori
            </button>
          </div>
        </Modal>
      )}

      {/* Level Edit Modal */}
      {editingLevel && (
        <Modal isOpen={true} onClose={() => setEditingLevel(null)} title="Edit Struktur Level">
          <div className="space-y-6">
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Threshold</label>
                   <input
                     type="number"
                     className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none"
                     defaultValue={editingLevel.level.threshold}
                     onChange={(e) => setEditingLevel({ ...editingLevel, level: { ...editingLevel.level, threshold: parseInt(e.target.value) } })}
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Min Target</label>
                   <input
                     type="number"
                     className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none"
                     defaultValue={editingLevel.level.minPoints}
                     onChange={(e) => setEditingLevel({ ...editingLevel, level: { ...editingLevel.level, minPoints: parseInt(e.target.value) } })}
                   />
                 </div>
               </div>
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Deskripsi</label>
                 <textarea
                   className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none h-24"
                   defaultValue={editingLevel.level.description}
                   onChange={(e) => setEditingLevel({ ...editingLevel, level: { ...editingLevel.level, description: e.target.value } })}
                 />
               </div>
            </div>
            <button
              onClick={() => updateLevel(editingLevel.id, editingLevel.level)}
              className="w-full p-5 bg-teal-500 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all"
            >
              Simpan Level
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl animate-slide-up text-center space-y-6">
            <div className="p-4 bg-rose-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            <div className="space-y-2">
               <h4 className="font-black text-slate-800">Hapus Data Ini?</h4>
               <p className="text-xs text-slate-500 font-medium">Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setConfirmDelete(null)} className="p-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-wider">Batal</button>
              <button
                onClick={() => {
                  if (confirmDelete.type === 'habit') deleteHabit(confirmDelete.parentId!, confirmDelete.id);
                }}
                className="p-4 bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {importPreview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl animate-slide-up space-y-6">
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto">
               <FileJson className="w-10 h-10 text-teal-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-800">Preview Setting</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                File ini berisi <b>{importPreview.categories.length} kategori</b> dan <b>{Object.keys(importPreview.habitItems).length} grup habit</b>.
              </p>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-[10px] text-amber-700 font-black uppercase leading-relaxed text-left">
                Peringatan: File ini hanya mengubah pengaturan sistem dan tidak menghapus data progres Anda.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setImportPreview(null)} className="p-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-wider">Batal</button>
              <button onClick={applyImport} className="p-4 bg-teal-500 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg shadow-teal-500/20">Terapkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperMenu;
