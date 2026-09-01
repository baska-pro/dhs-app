
import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[85vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-slide-up z-10 my-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 active:scale-90 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: { icon: <CheckCircle className="w-5 h-5" />, color: 'bg-emerald-500', bg: 'bg-emerald-50' },
    error: { icon: <AlertCircle className="w-5 h-5" />, color: 'bg-rose-500', bg: 'bg-rose-50' },
    info: { icon: <Info className="w-5 h-5" />, color: 'bg-teal-500', bg: 'bg-teal-50' },
  };

  return (
    <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm pointer-events-none">
      <div className={`${config[type].bg} border border-${type === 'success' ? 'emerald' : type === 'error' ? 'rose' : 'teal'}-100 rounded-3xl p-4 shadow-2xl flex items-center gap-3 animate-slide-up pointer-events-auto`}>
        <div className={`p-2 rounded-2xl ${config[type].color} text-white`}>
          {config[type].icon}
        </div>
        <p className="text-sm font-bold text-slate-700">{message}</p>
      </div>
    </div>
  );
};

interface InAppBannerProps {
  title: string;
  body: string;
  tab?: 'home' | 'checklist' | 'stats' | 'profile';
  type?: 'prayer' | 'evaluation' | 'water' | 'sunnah' | 'test';
  onAction?: () => void;
  onClose: () => void;
}

export const InAppBanner: React.FC<InAppBannerProps> = ({
  title,
  body,
  onAction,
  onClose
}) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[250] w-[92%] max-w-md">
      <div className="bg-white/95 backdrop-blur-md border border-teal-200/80 rounded-[2rem] p-4 shadow-2xl shadow-teal-900/15 flex items-start gap-3.5 animate-slide-up">
        <div className="p-3 bg-teal-500 text-white rounded-2xl shadow-md shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black text-slate-900 tracking-tight line-clamp-1">{title}</h4>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-600 font-medium leading-snug mt-0.5 line-clamp-2">{body}</p>
          {onAction && (
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onAction();
                  onClose();
                }}
                className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm active:scale-95 transition-transform"
              >
                Buka Checklist
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
