import React from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface NotificationModalProps {
  title?: string;
  message: string;
  subtitle?: string;
  buttonText?: string;
  hideCloseX?: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ 
  title = "Pemberitahuan Sistem", 
  message, 
  subtitle, 
  buttonText = "Mengerti & Tutup",
  hideCloseX = false,
  onClose 
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-[#0a0c16] border-2 border-red-600 rounded-2xl p-6 shadow-[0_0_50px_rgba(220,38,38,0.4)] relative text-center flex flex-col items-center">
        
        {/* Close X button (Hidden if hideCloseX is true) */}
        {!hideCloseX && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Icon */}
        <div className="p-3 bg-red-950/80 border-2 border-red-600 rounded-full mb-4 shadow-[0_0_20px_rgba(220,38,38,0.4)] animate-bounce">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-black uppercase font-mono text-red-400 tracking-wider mb-2">
          {title}
        </h3>

        {/* Main Message Box */}
        <div className="p-4 bg-[#101322] border border-red-600/50 rounded-xl text-xs sm:text-sm font-mono text-slate-100 leading-relaxed w-full mb-3 whitespace-pre-wrap">
          {message}
        </div>

        {/* Subtitle if present */}
        {subtitle && (
          <p className="text-xs font-mono font-bold text-red-400 tracking-widest uppercase mb-4">
            {subtitle}
          </p>
        )}

        {/* Action Button (Solid Red) */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all border border-red-500/50 shadow-red-950/50"
        >
          {buttonText}
        </button>

      </div>
    </div>
  );
};
