import React from 'react';
import { Code, Play, Copy, Check } from 'lucide-react';
import { parseAiMessage, CodePart } from '../utils/codeExtractor';

interface FormattedAiMessageProps {
  text: string;
  onOpenPreview: (htmlDoc: string) => void;
  onCopyCode: (codeText: string, id: string) => void;
  copiedId: string | null;
  msgId: string;
}

export const FormattedAiMessage: React.FC<FormattedAiMessageProps> = ({
  text,
  onOpenPreview,
  onCopyCode,
  copiedId,
  msgId
}) => {
  const parsed = parseAiMessage(text, msgId);

  return (
    <div className="w-full text-xs sm:text-sm font-sans leading-relaxed text-[#ffffff] space-y-3">
      
      {parsed.parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <div 
              key={index} 
              className="whitespace-pre-wrap leading-relaxed font-medium tracking-wide text-white"
            >
              {part.content}
            </div>
          );
        }

        if (part.type === 'code') {
          const codeBlock = part as CodePart;
          const lang = codeBlock.language.toLowerCase();
          const isWebLang = lang === 'html' || lang === 'htm' || lang === 'css' || lang === 'js' || lang === 'javascript';
          const canPreview = isWebLang && !!parsed.combinedPreviewHtml;
          const isCopied = copiedId === codeBlock.id;

          return (
            <div 
              key={index} 
              className="my-3 bg-[#090b14] border-2 border-red-600/70 rounded-xl overflow-hidden shadow-xl transition-all"
            >
              {/* Code Box Header */}
              <div className="bg-[#101324] px-3.5 py-2 border-b border-red-600/50 flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-red-500" />
                  {codeBlock.language.toUpperCase()} CODE
                </span>

                <div className="flex items-center gap-2">
                  {/* Live Preview Button ONLY for HTML / CSS / JS */}
                  {canPreview && (
                    <button
                      type="button"
                      onClick={() => onOpenPreview(parsed.combinedPreviewHtml!)}
                      className="px-3 py-1 bg-gradient-to-r from-red-600 via-red-700 to-blue-700 hover:from-red-500 hover:to-blue-600 text-white font-mono text-[11px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-md active:scale-95 transition-all"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Live Preview</span>
                    </button>
                  )}

                  {/* Salin Button */}
                  <button
                    type="button"
                    onClick={() => onCopyCode(codeBlock.code, codeBlock.id)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] font-bold rounded-lg flex items-center gap-1 border border-slate-700 transition-colors"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>

              {/* Code Content Body */}
              <pre className="p-3.5 text-[11px] font-mono text-emerald-300 bg-[#05060b] overflow-x-auto max-h-80 leading-relaxed select-text">
                <code>{codeBlock.code}</code>
              </pre>
            </div>
          );
        }

        return null;
      })}

    </div>
  );
};
