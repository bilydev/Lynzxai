import React, { useState } from 'react';
import { ArrowLeft, Send, Sparkles, Copy, Check, Loader2 } from 'lucide-react';
import { hasBadWords, PROFANITY_WARNING } from '../utils/badWords';
import { fetchAiResponseWithWait } from '../utils/aiFetcher';
import { FormattedAiMessage } from './FormattedAiMessage';
import { CodePreviewModal } from './CodePreviewModal';
import { checkRateLimit } from '../utils/security';

interface MultiAiPageProps {
  onBack: () => void;
  showNotice: (msg: string, title?: string) => void;
}

interface ModelResponse {
  loading: boolean;
  text: string;
  error?: string;
}

export const MultiAiPage: React.FC<MultiAiPageProps> = ({ onBack, showNotice }) => {
  const [prompt, setPrompt] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [previewCopied, setPreviewCopied] = useState(false);

  const [claudeState, setClaudeState] = useState<ModelResponse>({ loading: false, text: '' });
  const [gptState, setGptState] = useState<ModelResponse>({ loading: false, text: '' });
  const [qwenState, setQwenState] = useState<ModelResponse>({ loading: false, text: '' });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(key);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSendAll = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = prompt.trim();
    if (!query) return;

    // Rate Limit Check (5 Minutes Window)
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      showNotice(
        `Akses dibatasi sementara (Rate Limit). Mohon tunggu ${rateCheck.waitSeconds} detik sebelum mengirim pesan berikutnya.`,
        'Peringatan Rate Limit (5 Menit)'
      );
      return;
    }

    // Check bad words
    if (hasBadWords(query)) {
      showNotice(PROFANITY_WARNING, 'Peringatan Keamanan');
      return;
    }

    setPrompt('');
    setClaudeState({ loading: true, text: '' });
    setGptState({ loading: true, text: '' });
    setQwenState({ loading: true, text: '' });

    // Call 1: Claude API
    fetchAiResponseWithWait('claude', 'https://api.azbry.com/api/ai/claude?q=', query)
      .then(text => setClaudeState({ loading: false, text }))
      .catch(() => setClaudeState({ loading: false, text: 'Maaf, gagal mendapatkan respon dari Claude API.' }));

    // Call 2: GPT Pro API
    fetchAiResponseWithWait('gptpro', 'https://api.azbry.com/api/ai/gptfree?q=', query)
      .then(text => setGptState({ loading: false, text }))
      .catch(() => setGptState({ loading: false, text: 'Maaf, gagal mendapatkan respon dari GPT Pro API.' }));

    // Call 3: Qwen API
    fetchAiResponseWithWait('qwen', 'https://api.azbry.com/api/ai/qwen?q=', query)
      .then(text => setQwenState({ loading: false, text }))
      .catch(() => setQwenState({ loading: false, text: 'Maaf, gagal mendapatkan respon dari Qwen API.' }));
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col justify-between p-3 sm:p-6 relative overflow-hidden">
      
      {/* Background Lighting */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <div className="flex items-center justify-between pb-4 border-b border-red-900/40 relative z-10">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-red-950/80 hover:bg-red-900 border border-red-600/70 text-red-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <div className="text-center">
          <h1 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-white to-blue-400">
            Multi AI LYNZX Assistant
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-400 font-mono">
            Mode Paralel: 3 Model AI Sekaligus
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-xs text-red-400 font-mono font-bold bg-red-950/40 px-3 py-1.5 border border-red-600/40 rounded-lg">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span>TRIO AI SYNC</span>
        </div>
      </div>

      {/* Floating SVG Connection Lines (Dashed Lines Interconnecting the boxes) */}
      <div className="hidden md:block absolute inset-0 pointer-events-none z-0 opacity-40">
        <svg className="w-full h-full">
          {/* Top Left to Top Right */}
          <line x1="33%" y1="30%" x2="66%" y2="30%" stroke="#ef4444" strokeWidth="2" className="animated-dash" />
          {/* Top Left to Bottom Center */}
          <line x1="33%" y1="30%" x2="50%" y2="65%" stroke="#3b82f6" strokeWidth="2" className="animated-dash" />
          {/* Top Right to Bottom Center */}
          <line x1="66%" y1="30%" x2="50%" y2="65%" stroke="#a855f7" strokeWidth="2" className="animated-dash" />
        </svg>
      </div>

      {/* Main Grid of 3 AI Response Cards */}
      <div className="flex-1 my-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 max-w-7xl mx-auto w-full overflow-y-auto">
        
        {/* Card 1: Mode Claude (Top Left) */}
        <div className="bg-[#0a0c14] border-2 border-red-600/80 rounded-2xl p-4 flex flex-col justify-between shadow-[0_0_25px_rgba(220,38,38,0.2)] hover:shadow-[0_0_35px_rgba(220,38,38,0.35)] transition-all">
          <div>
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-red-900/50 mb-3">
              <div className="flex items-center gap-2.5">
                <img 
                  src="https://g.top4top.io/p_3878kmjyx0.jpg" 
                  alt="Claude" 
                  className="w-8 h-8 rounded-full border border-red-500 object-cover" 
                />
                <div>
                  <h2 className="text-sm font-black font-mono uppercase text-red-400">Mode Claude</h2>
                  <p className="text-[10px] text-slate-500 font-mono">AZBRY API &bull; Claude Engine</p>
                </div>
              </div>

              {claudeState.text && (
                <button
                  onClick={() => handleCopy(claudeState.text, 'claude')}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                  title="Salin Respon"
                >
                  {copiedIndex === 'claude' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Response Content */}
            <div className="min-h-[180px] text-xs font-mono leading-relaxed text-slate-200 whitespace-pre-wrap max-h-72 overflow-y-auto pr-1">
              {claudeState.loading ? (
                <div className="flex flex-col items-center justify-center h-40 text-red-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs font-mono animate-pulse">Claude sedang berfikir...</span>
                </div>
              ) : claudeState.text ? (
                <FormattedAiMessage
                  text={claudeState.text}
                  onOpenPreview={(htmlDoc) => setPreviewCode(htmlDoc)}
                  onCopyCode={(codeText, blockId) => handleCopy(codeText, blockId)}
                  copiedId={copiedIndex}
                  msgId="claude"
                />
              ) : (
                <span className="text-slate-600 italic">Kirim pertanyaan untuk mendapatkan jawaban dari Mode Claude...</span>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex justify-between">
            <span>Model 1/3</span>
            <span className="text-red-400 font-bold">ACTIVE</span>
          </div>
        </div>

        {/* Card 2: GPT Pro (Top Right) */}
        <div className="bg-[#0a0c14] border-2 border-blue-600/80 rounded-2xl p-4 flex flex-col justify-between shadow-[0_0_25px_rgba(37,99,235,0.2)] hover:shadow-[0_0_35px_rgba(37,99,235,0.35)] transition-all">
          <div>
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/50 mb-3">
              <div className="flex items-center gap-2.5">
                <img 
                  src="https://h.top4top.io/p_3878lv9nq0.jpg" 
                  alt="GPT Pro" 
                  className="w-8 h-8 rounded-full border border-blue-500 object-cover" 
                />
                <div>
                  <h2 className="text-sm font-black font-mono uppercase text-blue-400">GPT Pro</h2>
                  <p className="text-[10px] text-slate-500 font-mono">AZBRY API &bull; GPT-Free Engine</p>
                </div>
              </div>

              {gptState.text && (
                <button
                  onClick={() => handleCopy(gptState.text, 'gpt')}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                  title="Salin Respon"
                >
                  {copiedIndex === 'gpt' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Response Content */}
            <div className="min-h-[180px] text-xs font-mono leading-relaxed text-slate-200 whitespace-pre-wrap max-h-72 overflow-y-auto pr-1">
              {gptState.loading ? (
                <div className="flex flex-col items-center justify-center h-40 text-blue-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs font-mono animate-pulse">GPT Pro sedang berfikir...</span>
                </div>
              ) : gptState.text ? (
                <FormattedAiMessage
                  text={gptState.text}
                  onOpenPreview={(htmlDoc) => setPreviewCode(htmlDoc)}
                  onCopyCode={(codeText, blockId) => handleCopy(codeText, blockId)}
                  copiedId={copiedIndex}
                  msgId="gptpro"
                />
              ) : (
                <span className="text-slate-600 italic">Kirim pertanyaan untuk mendapatkan jawaban dari GPT Pro...</span>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex justify-between">
            <span>Model 2/3</span>
            <span className="text-blue-400 font-bold">ACTIVE</span>
          </div>
        </div>

        {/* Card 3: Qwen (Bottom Center) */}
        <div className="bg-[#0a0c14] border-2 border-purple-600/80 rounded-2xl p-4 flex flex-col justify-between shadow-[0_0_25px_rgba(168,85,247,0.2)] hover:shadow-[0_0_35px_rgba(168,85,247,0.35)] transition-all md:col-span-2 lg:col-span-1">
          <div>
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-purple-900/50 mb-3">
              <div className="flex items-center gap-2.5">
                <img 
                  src="https://d.top4top.io/p_3878o7tcq0.jpg" 
                  alt="Qwen" 
                  className="w-8 h-8 rounded-full border border-purple-500 object-cover" 
                />
                <div>
                  <h2 className="text-sm font-black font-mono uppercase text-purple-400">Qwen</h2>
                  <p className="text-[10px] text-slate-500 font-mono">AZBRY API &bull; Qwen 3 80B Engine</p>
                </div>
              </div>

              {qwenState.text && (
                <button
                  onClick={() => handleCopy(qwenState.text, 'qwen')}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                  title="Salin Respon"
                >
                  {copiedIndex === 'qwen' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Response Content */}
            <div className="min-h-[180px] text-xs font-mono leading-relaxed text-slate-200 whitespace-pre-wrap max-h-72 overflow-y-auto pr-1">
              {qwenState.loading ? (
                <div className="flex flex-col items-center justify-center h-40 text-purple-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs font-mono animate-pulse">Qwen sedang berfikir...</span>
                </div>
              ) : qwenState.text ? (
                <FormattedAiMessage
                  text={qwenState.text}
                  onOpenPreview={(htmlDoc) => setPreviewCode(htmlDoc)}
                  onCopyCode={(codeText, blockId) => handleCopy(codeText, blockId)}
                  copiedId={copiedIndex}
                  msgId="qwen"
                />
              ) : (
                <span className="text-slate-600 italic">Kirim pertanyaan untuk mendapatkan jawaban dari Qwen...</span>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex justify-between">
            <span>Model 3/3</span>
            <span className="text-purple-400 font-bold">ACTIVE</span>
          </div>
        </div>

      </div>

      {/* Unified Prompt Input Form at Bottom */}
      <form 
        onSubmit={handleSendAll}
        className="max-w-4xl mx-auto w-full relative z-10 pt-2"
      >
        <div className="relative bg-[#0d0f1a] border-2 border-red-600/70 rounded-2xl p-1.5 flex items-end shadow-[0_0_20px_rgba(220,38,38,0.25)] focus-within:border-red-500">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendAll(e);
              }
            }}
            placeholder="Ketik perintah untuk dikirim ke 3 Model AI sekaligus..."
            rows={1}
            style={{ fontSize: '15px', lineHeight: '20px' }}
            className="w-full bg-transparent px-3 py-1.5 text-white placeholder-slate-500 outline-none resize-none font-sans max-h-[78px] min-h-[36px]"
          />

          <button
            type="submit"
            disabled={claudeState.loading || gptState.loading || qwenState.loading || !prompt.trim()}
            className="w-9 h-9 rounded-xl bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shrink-0 disabled:opacity-40 transition-all active:scale-90 shadow-md shadow-red-950/50 mb-0.5"
            title="Kirim Ke Semua Model AI"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* CODE PREVIEW MODAL FOR MULTI AI */}
      {previewCode && (
        <CodePreviewModal
          code={previewCode}
          onClose={() => setPreviewCode(null)}
          onCopy={() => {
            navigator.clipboard.writeText(previewCode);
            setPreviewCopied(true);
            setTimeout(() => setPreviewCopied(false), 2000);
          }}
          copied={previewCopied}
        />
      )}

    </div>
  );
};
