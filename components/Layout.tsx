
import React from 'react';
import { Home, ClipboardList, BarChart2, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: <Home className="w-6 h-6" />, label: 'Beranda' },
    { id: 'checklist', icon: <ClipboardList className="w-6 h-6" />, label: 'Harian' },
    { id: 'stats', icon: <BarChart2 className="w-6 h-6" />, label: 'Progres' },
    { id: 'profile', icon: <User className="w-6 h-6" />, label: 'Profil' },
  ];

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-slate-50 shadow-2xl overflow-hidden border-x border-slate-200 transition-colors relative">
      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        <div className="pb-32">
          {children}
        </div>
      </main>

      <nav className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 px-6 py-3 pb-8 flex justify-between items-center z-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
              activeTab === tab.id ? 'text-teal-600' : 'text-slate-400'
            }`}
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${activeTab === tab.id ? 'bg-teal-50 scale-110' : 'hover:bg-slate-50'}`}>
              {React.cloneElement(tab.icon as React.ReactElement<{ strokeWidth?: number }>, { strokeWidth: activeTab === tab.id ? 2.5 : 2 })}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
