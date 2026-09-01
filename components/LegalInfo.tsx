
import React from 'react';
import { Info, ShieldCheck, FileText, AlertCircle } from 'lucide-react';

export const LegalInfo: React.FC = () => {
  const sections = [
    {
      id: 'about',
      title: 'Tentang Aplikasi',
      icon: <Info className="w-5 h-5 text-teal-500" />,
      content: 'DHS App (Daily Habit System) adalah aplikasi manajemen amal harian yang dirancang untuk membantu pengguna membangun konsistensi dalam ibadah dan kebiasaan baik melalui sistem poin dan level spiritual.'
    },
    {
      id: 'privacy',
      title: 'Kebijakan Privasi',
      icon: <ShieldCheck className="w-5 h-5 text-teal-500" />,
      content: 'Privasi Anda adalah prioritas kami. Aplikasi ini tidak mengumpulkan, menyimpan di server, atau membagikan data pribadi Anda kepada pihak ketiga. Semua data tersimpan secara lokal di browser perangkat Anda.'
    },
    {
      id: 'terms',
      title: 'Syarat & Ketentuan',
      icon: <FileText className="w-5 h-5 text-teal-500" />,
      content: 'Aplikasi ini disediakan "sebagaimana adanya". Pengguna bertanggung jawab penuh atas data yang dimasukkan. Kami tidak bertanggung jawab atas kehilangan data akibat pembersihan cache browser atau kerusakan perangkat.'
    },
    {
      id: 'disclaimer',
      title: 'Disclaimer',
      icon: <AlertCircle className="w-5 h-5 text-teal-500" />,
      content: 'Sistem poin dan level dalam aplikasi ini hanyalah alat motivasi visual dan tidak merepresentasikan nilai ibadah yang sesungguhnya di hadapan Sang Pencipta. Jadwal shalat bersifat estimasi.'
    }
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.id} className="bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-teal-50 rounded-xl">
              {section.icon}
            </div>
            <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider">{section.title}</h4>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            {section.content}
          </p>
        </div>
      ))}
    </div>
  );
};
