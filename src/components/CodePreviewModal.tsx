import React from 'react';
import { X, Play, Copy, Check } from 'lucide-react';

interface CodePreviewModalProps {
  code: string;
  onClose: () => void;
  onCopy: () => void;
  copied: boolean;
}

export const CodePreviewModal: React.FC<CodePreviewModalProps> = ({ code, onClose, onCopy, copied }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-start animate-fadeIn">
      {/* Top half preview modal window */}
      <div className="w-full max-w-5xl mx-auto h-[70vh] my-4 bg-[#0a0c12] border-2 border-red-600 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.4)] flex flex-col overflow-hidden relative">
        
        {/* Preview Header */}
        <div className="bg-[#101320] border-b border-red-600/60 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-2 font-mono text-xs font-bold uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-red-500" />
              Live Preview Result
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCopy}
              className="px-3 py-1 bg-blue-950 hover:bg-blue-900 border border-blue-500/50 text-blue-200 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Code'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 bg-red-950/80 hover:bg-red-900 border border-red-600/60 rounded-lg text-red-300 hover:text-white transition-colors"
              title="Tutup Preview (X)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Preview Frame Container */}
        <div className="flex-1 w-full bg-white relative overflow-hidden">
          <iframe
            title="Code Preview"
            srcDoc={code}
            className="w-full h-full border-0"
            sandbox="allow-scripts"
          />
        </div>

        {/* Footer info bar */}
        <div className="bg-[#0b0d16] border-t border-slate-800 px-4 py-1.5 text-[10px] font-mono text-slate-400 flex items-center justify-between shrink-0">
          <span>HTML / CSS / JS Live Sandbox</span>
          <span>Klik [X] di pojok kanan atas untuk kembali</span>
        </div>

      </div>
    </div>
  );
};
