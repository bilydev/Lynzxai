import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  X, 
  Plus, 
  Send, 
  MoreVertical, 
  Trash2, 
  LogOut, 
  Bug, 
  Copy, 
  Check, 
  Sparkles, 
  Code
} from 'lucide-react';
import { 
  ChatSession, 
  ChatMessage, 
  getLocalChats, 
  saveLocalChats, 
  submitBugReport,
  subscribeToBugReports,
  markBugReportNotified
} from '../firebase';
import { hasBadWords, PROFANITY_WARNING } from '../utils/badWords';
import { CodePreviewModal } from './CodePreviewModal';
import { fetchAiResponseWithWait } from '../utils/aiFetcher';
import { FormattedAiMessage } from './FormattedAiMessage';
import { checkRateLimit } from '../utils/security';



interface ChatPageProps {
  username: string;
  onLogout: () => void;
  onOpenMultiAi: () => void;
  showNotice: (msg: string, title?: string, subtitle?: string) => void;
}

export type AiMode = 'claude' | 'gptpro' | 'qwen';

interface AiModeOption {
  id: AiMode;
  name: string;
  iconUrl: string;
  endpoint: string;
}

const AI_MODES: AiModeOption[] = [
  {
    id: 'claude',
    name: 'Mode Claude',
    iconUrl: 'https://g.top4top.io/p_3878kmjyx0.jpg',
    endpoint: 'https://api.azbry.com/api/ai/claude?q='
  },
  {
    id: 'gptpro',
    name: 'GPT Pro',
    iconUrl: 'https://h.top4top.io/p_3878lv9nq0.jpg',
    endpoint: 'https://api.azbry.com/api/ai/gptfree?q='
  },
  {
    id: 'qwen',
    name: 'Qwen',
    iconUrl: 'https://d.top4top.io/p_3878o7tcq0.jpg',
    endpoint: 'https://api.azbry.com/api/ai/qwen?q='
  }
];

export const ChatPage: React.FC<ChatPageProps> = ({ 
  username, 
  onLogout, 
  onOpenMultiAi, 
  showNotice 
}) => {
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Bug report modal state
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [bugText, setBugText] = useState('');
  const [bugSubmitting, setBugSubmitting] = useState(false);

  // AI Mode selection menu (Plus button popup)
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<AiModeOption>(AI_MODES[0]);

  // Chat sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // Dropdown states for history items
  const [activeHistoryMenu, setActiveHistoryMenu] = useState<string | null>(null);

  // Input text state & Textarea Ref
  const [inputText, setInputText] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Code preview state
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [previewCopied, setPreviewCopied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  // Load chat sessions from local storage or Firebase
  useEffect(() => {
    const loaded = getLocalChats(username);
    if (loaded.length === 0) {
      const newSession: ChatSession = {
        id: 'session_' + Date.now(),
        title: 'Obrolan Baru',
        createdAt: Date.now(),
        messages: []
      };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      saveLocalChats(username, [newSession]);
    } else {
      setSessions(loaded);
      setActiveSessionId(loaded[0].id);
    }
  }, [username]);

  // Listen to Firebase bug report status updates for current user (Realtime notice popup)
  useEffect(() => {
    const unsubBugs = subscribeToBugReports((bugs) => {
      Object.values(bugs).forEach((report) => {
        if (report.username?.toLowerCase() === username.toLowerCase() && !report.notified) {
          if (report.status === 'approved') {
            showNotice(
              'laporan Anda di terima oleh owner kami',
              'Pemberitahuan Laporan Bug'
            );
            markBugReportNotified(report.id);
          } else if (report.status === 'wait') {
            showNotice(
              'mohon tunggu laporan Anda saya akan mengecek nya by owner bily',
              'Pemberitahuan Laporan Bug'
            );
            markBugReportNotified(report.id);
          }
        }
      });
    });

    return () => unsubBugs();
  }, [username, showNotice]);

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isAiThinking]);

  // Save sessions helper
  const updateSessions = (newSessions: ChatSession[]) => {
    setSessions(newSessions);
    saveLocalChats(username, newSessions);
  };

  // Create new chat session
  const handleCreateNewChat = () => {
    const newSession: ChatSession = {
      id: 'session_' + Date.now(),
      title: 'Obrolan Baru',
      createdAt: Date.now(),
      messages: []
    };
    const updated = [newSession, ...sessions];
    updateSessions(updated);
    setActiveSessionId(newSession.id);
    setDrawerOpen(false);
  };

  // Delete specific chat session
  const handleDeleteChatSession = (sessionId: string) => {
    const filtered = sessions.filter((s) => s.id !== sessionId);
    if (filtered.length === 0) {
      const fresh: ChatSession = {
        id: 'session_' + Date.now(),
        title: 'Obrolan Baru',
        createdAt: Date.now(),
        messages: []
      };
      updateSessions([fresh]);
      setActiveSessionId(fresh.id);
    } else {
      updateSessions(filtered);
      if (activeSessionId === sessionId) {
        setActiveSessionId(filtered[0].id);
      }
    }
    setActiveHistoryMenu(null);
  };

  // Submit bug report
  const handleSubmitBugReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = bugText.trim();
    if (!text) return;

    if (hasBadWords(text)) {
      showNotice(PROFANITY_WARNING, 'Peringatan Keamanan');
      return;
    }

    setBugSubmitting(true);
    try {
      submitBugReport(username, text);
      showNotice(
        'Laporan bug berhasil dikirim! Terima kasih atas masukan anda.',
        'Laporan Bug Terkirim'
      );
      setBugText('');
      setBugModalOpen(false);
    } catch (err) {
      console.error(err);
      showNotice('Gagal mengirim laporan. Silahkan coba lagi.', 'Error');
    } finally {
      setBugSubmitting(false);
    }
  };

  // Send message to AI
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = inputText.trim();
    if (!messageText || isAiThinking) return;

    // Rate Limit Check (5 Minutes Window)
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      showNotice(
        `Akses dibatasi sementara (Rate Limit). Mohon tunggu ${rateCheck.waitSeconds} detik sebelum mengirim pesan berikutnya.`,
        'Peringatan Rate Limit (5 Menit)'
      );
      return;
    }

    if (hasBadWords(messageText)) {
      showNotice(PROFANITY_WARNING, 'Peringatan Keamanan');
      return;
    }

    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMsg: ChatMessage = {
      id: 'msg_u_' + Date.now(),
      sender: 'user',
      text: messageText,
      timestamp: Date.now()
    };

    const updatedMessages = [...(currentSession?.messages || []), userMsg];
    let updatedTitle = currentSession?.title || 'Obrolan Baru';
    if (currentSession?.messages.length === 0) {
      updatedTitle = messageText.slice(0, 24) + (messageText.length > 24 ? '...' : '');
    }

    const updatedSessions = sessions.map((s) => {
      if (s.id === currentSession.id) {
        return {
          ...s,
          title: updatedTitle,
          messages: updatedMessages
        };
      }
      return s;
    });

    updateSessions(updatedSessions);
    setIsAiThinking(true);

    try {
      // Call AI endpoint and wait until API finishes generating response
      const aiText = await fetchAiResponseWithWait(
        selectedMode.id,
        selectedMode.endpoint,
        messageText
      );

      const aiMsg: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        sender: 'ai',
        model: selectedMode.name,
        text: aiText,
        timestamp: Date.now()
      };

      const finalSessions = updatedSessions.map((s) => {
        if (s.id === currentSession.id) {
          return {
            ...s,
            messages: [...s.messages, aiMsg]
          };
        }
        return s;
      });

      updateSessions(finalSessions);
    } catch (err) {
      console.error("AI API Fetch Error:", err);
      const errorMsg: ChatMessage = {
        id: 'msg_ai_err_' + Date.now(),
        sender: 'ai',
        model: selectedMode.name,
        text: 'Maaf, gagal menghubungkan ke server AI. Silahkan periksa koneksi atau coba lagi nanti.',
        timestamp: Date.now()
      };

      const finalSessions = updatedSessions.map((s) => {
        if (s.id === currentSession.id) {
          return {
            ...s,
            messages: [...s.messages, errorMsg]
          };
        }
        return s;
      });

      updateSessions(finalSessions);
    } finally {
      setIsAiThinking(false);
    }
  };

  // Auto-grow textarea up to 3 compact lines (~78px max height), pinned bottom
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      const maxH = 78; // compact 3 lines max height
      const newH = Math.min(el.scrollHeight, maxH);
      el.style.height = `${Math.max(newH, 36)}px`;
    }
  };

  // Helper to copy text to clipboard
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };



  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col justify-between relative overflow-hidden font-sans">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-red-950/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-950/20 rounded-full blur-3xl pointer-events-none" />

      {/* TOPBAR */}
      <div className="bg-[#080910]/90 backdrop-blur-md border-b-2 border-red-600/70 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_25px_rgba(220,38,38,0.25)]">
        
        {/* Left: Hamburger & Version 911 (Teks panjang tanpa box border) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 bg-red-950/80 hover:bg-red-900 border border-red-600/60 rounded-xl text-red-200 hover:text-white transition-all active:scale-95 shadow-md"
            title="Menu Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Animated Version 911 Text (Tanpa Box Border) */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
            <span className="font-mono text-xs font-extrabold uppercase animate-gradient-text tracking-[0.25em] whitespace-nowrap">
              version 911 pro system
            </span>
          </div>
        </div>

        {/* Center Title HAPUS / KOSONGKAN */}
        <div className="hidden md:block" />

        {/* Right Active User Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-950/80 border border-blue-600/50 rounded-xl text-xs font-mono font-bold text-blue-200">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span>@{username}</span>
        </div>

      </div>

      {/* HAMBURGER SIDEBAR DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Left half drawer */}
          <div className="w-full sm:w-80 max-w-[85vw] bg-[#080a12] border-r-2 border-red-600/80 p-5 flex flex-col justify-between shadow-[10px_0_40px_rgba(220,38,38,0.3)] z-50 animate-slideRight relative">
            
            <div>
              {/* Header inside drawer: LYNZXBILY (Hapus LX logo) */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <span className="font-mono font-black text-base text-red-400 uppercase tracking-wider">
                  LYNZXBILY
                </span>

                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 bg-slate-900 hover:bg-red-950 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Obrolan Baru Button */}
              <button
                type="button"
                onClick={handleCreateNewChat}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-blue-900 hover:from-red-500 hover:to-blue-800 border border-red-500/60 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 mb-6"
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5 text-white" />
                </div>
                <span>Obrolan Baru</span>
              </button>

              {/* History Chat List Header */}
              <div className="text-[11px] font-mono uppercase text-slate-400 font-bold tracking-wider mb-2 px-1">
                Histori Obrolan
              </div>

              {/* History Chat List */}
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    onClick={() => {
                      setActiveSessionId(sess.id);
                      setDrawerOpen(false);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between cursor-pointer transition-all ${
                      sess.id === activeSessionId
                        ? 'bg-red-950/70 border-red-600 text-white font-bold shadow-md'
                        : 'bg-[#101322] border-slate-800/80 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="truncate max-w-[160px]">{sess.title}</span>

                    {/* 3-dot delete menu */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setActiveHistoryMenu(activeHistoryMenu === sess.id ? null : sess.id)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeHistoryMenu === sess.id && (
                        <div className="absolute right-0 top-6 w-32 bg-[#090b14] border border-red-600 rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteChatSession(sess.id)}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-950 flex items-center gap-2 font-mono"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Bottom Section in Drawer: Bug Report & Logout */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              
              {/* Bug Report Button */}
              <button
                type="button"
                onClick={() => {
                  setBugModalOpen(true);
                  setDrawerOpen(false);
                }}
                className="w-full py-2.5 px-4 bg-[#121626] hover:bg-blue-950/80 border border-blue-600/60 rounded-xl text-xs font-mono font-bold text-blue-300 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Code className="w-4 h-4 text-blue-400" />
                <span>💻 Bug Report</span>
              </button>

              {/* Logout Button (Hapus bahasa Indonesia "keluar") */}
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2.5 px-4 bg-red-950/80 hover:bg-red-900 border border-red-600/70 rounded-xl text-xs font-mono font-bold text-red-300 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Logout</span>
              </button>

            </div>

          </div>

          {/* Right half blurred backdrop */}
          <div 
            onClick={() => setDrawerOpen(false)} 
            className="flex-1 bg-black/60 backdrop-blur-sm cursor-pointer"
          />
        </div>
      )}

      {/* BUG REPORT MODAL */}
      {bugModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0a0c16] border-2 border-blue-600/80 rounded-2xl p-6 shadow-[0_0_40px_rgba(37,99,235,0.3)] relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-blue-400" />
                <h3 className="font-mono font-black text-sm uppercase text-blue-300">Laporan Bug & Masalah</h3>
              </div>
              <button
                onClick={() => setBugModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-mono mb-4 leading-relaxed bg-[#101322] p-3 rounded-xl border border-slate-800">
              silahkan anda untuk melaporkan masalah dan bug dari web kami ya
            </p>

            <form onSubmit={handleSubmitBugReport} className="space-y-4">
              <textarea
                value={bugText}
                onChange={(e) => setBugText(e.target.value)}
                placeholder="Ketik detail laporan bug di sini..."
                rows={4}
                className="w-full p-3 bg-[#121526] border border-blue-600/60 rounded-xl text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-blue-400 resize-none"
                required
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBugModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={bugSubmitting || !bugText.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider border border-blue-500/50 shadow-md active:scale-95 flex items-center gap-2"
                >
                  {bugSubmitting ? 'Mengirim...' : 'Konfirmasi Kirim'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* CHAT MESSAGES CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
        
        {/* CENTER WELCOME TEXT */}
        {(!currentSession?.messages || currentSession.messages.length === 0) && (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center p-4">
            <div className="p-4 bg-red-950/40 border-2 border-red-600/60 rounded-2xl mb-4 shadow-[0_0_30px_rgba(220,38,38,0.3)] animate-pulse">
              <Sparkles className="w-10 h-10 text-red-500" />
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-white to-blue-400 font-mono mb-3">
              LYNZX ASSITAN
            </h2>

            <p className="text-sm sm:text-base text-slate-200 font-serif italic max-w-md leading-relaxed">
              silahkan perintah yang anda mau kami siap membantu
            </p>
          </div>
        )}

        {/* MESSAGES LIST */}
        {currentSession?.messages?.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
              
              {!isUser && (
                <div className="flex items-center gap-2 mb-1.5">
                  <img
                    src="https://i.top4top.io/p_38785lhzt0.jpg"
                    alt="LYNZX AI"
                    className="w-8 h-8 rounded-full border border-red-500 object-cover shadow-md"
                  />
                  <span className="font-mono text-xs font-bold uppercase text-red-400 tracking-wider">
                    lynzx assistant
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    [{msg.model || 'AI'}]
                  </span>
                </div>
              )}

              {/* MESSAGE CONTENT */}
              {isUser ? (
                <div className="flex flex-col items-end space-y-1 max-w-[85%] sm:max-w-[75%]">
                  <div className="w-full p-4 rounded-2xl bg-gradient-to-t from-[#0d1b2a] via-[#101f38] to-[#2a085c] border border-blue-500/40 text-xs sm:text-sm font-sans leading-relaxed text-white shadow-lg whitespace-pre-wrap">
                    {msg.text}
                  </div>

                  <div className="flex justify-end pr-1">
                    <button
                      onClick={() => handleCopyText(msg.text, msg.id)}
                      className="text-slate-400 hover:text-white p-1 transition-colors flex items-center gap-1"
                      title="Salin Pesan"
                    >
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full pl-2 sm:pl-10 text-xs sm:text-sm font-sans leading-relaxed text-[#ffffff] space-y-3">
                  
                  <FormattedAiMessage
                    text={msg.text}
                    onOpenPreview={(htmlDoc) => setPreviewCode(htmlDoc)}
                    onCopyCode={(codeText, blockId) => handleCopyText(codeText, blockId)}
                    copiedId={copiedId}
                    msgId={msg.id}
                  />

                  <div className="flex items-center justify-start pt-1">
                    <button
                      onClick={() => handleCopyText(msg.text, msg.id)}
                      className="text-slate-400 hover:text-white p-1 transition-colors flex items-center gap-1"
                      title="Salin Respon AI"
                    >
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                  </div>

                </div>
              )}

            </div>
          );
        })}

        {/* AI Thinking / Loading State */}
        {isAiThinking && (
          <div className="flex items-center gap-3 pl-2 sm:pl-10 py-2">
            <img
              src="https://i.top4top.io/p_38785lhzt0.jpg"
              alt="LYNZX AI"
              className="w-7 h-7 rounded-full border border-red-500 object-cover animate-pulse"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-0.5">sedang berfikir</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* CHAT COMPOSER (Floating Bottom Bar with Auto-Resize up to 3 paragraphs) */}
      <div className="p-3 sm:p-4 sticky bottom-0 z-20 bg-[#050508]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto relative" ref={modeMenuRef}>
          
          {/* AI MODE SELECTION POPUP MENU */}
          {modeMenuOpen && (
            <div className="absolute left-0 bottom-16 w-64 bg-[#0a0c16] border-2 border-red-600/80 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.4)] z-50 p-2 space-y-1.5 animate-fadeIn">
              
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold px-2 py-1 border-b border-slate-800">
                Pilih Mode AI
              </div>

              {AI_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setSelectedMode(mode);
                    setModeMenuOpen(false);
                  }}
                  className={`w-full p-2 rounded-xl flex items-center justify-between text-xs font-mono transition-all ${
                    selectedMode.id === mode.id
                      ? 'bg-red-950/80 border border-red-600 text-white font-bold'
                      : 'hover:bg-[#121526] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={mode.iconUrl}
                      alt={mode.name}
                      className="w-6 h-6 rounded-full object-cover border border-slate-700"
                    />
                    <span>{mode.name}</span>
                  </div>

                  {selectedMode.id === mode.id && <Check className="w-4 h-4 text-red-500" />}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setModeMenuOpen(false);
                  onOpenMultiAi();
                }}
                className="w-full p-2 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 border border-blue-500/60 text-white text-xs font-mono font-bold flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span>Multi AI Mode</span>
                </div>
                <span className="text-[9px] bg-blue-950 px-1.5 py-0.5 rounded border border-blue-400 text-blue-200">
                  PRO
                </span>
              </button>

            </div>
          )}

          {/* Form Textarea Composer (items-end so bottom stays fixed and scales ONLY upwards) */}
          <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-[#0d0f1a] border-2 border-red-600/70 focus-within:border-red-500 rounded-2xl p-1.5 shadow-xl">
            
            {/* Plus Button on Left */}
            <button
              type="button"
              onClick={() => setModeMenuOpen(!modeMenuOpen)}
              className="w-9 h-9 rounded-xl bg-red-950/90 hover:bg-red-900 border border-red-600/80 text-red-200 flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-md mb-0.5"
              title="Pilih Mode AI"
            >
              <Plus className={`w-5 h-5 transition-transform ${modeMenuOpen ? 'rotate-45' : ''}`} />
            </button>

            {/* Selected Mode Indicator Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[10px] font-mono text-slate-300 shrink-0 mb-1.5">
              <img src={selectedMode.iconUrl} alt={selectedMode.name} className="w-3.5 h-3.5 rounded-full" />
              <span>{selectedMode.name}</span>
            </div>

            {/* Auto-Resizing Textarea (compact 3 lines ~78px max height, expands upwards) */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Tulis pesan..."
              rows={1}
              style={{ fontSize: '15px', lineHeight: '20px' }}
              className="flex-1 bg-transparent px-2.5 py-1.5 text-white placeholder-slate-500 outline-none resize-none max-h-[78px] overflow-y-auto font-sans min-h-[36px]"
            />

            {/* Round Send Button */}
            <button
              type="submit"
              disabled={isAiThinking || !inputText.trim()}
              className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-500 active:scale-90 flex items-center justify-center text-white shrink-0 disabled:opacity-30 transition-all shadow-md shadow-red-950/50 mb-0.5"
              title="Kirim Pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      </div>

      {/* CODE PREVIEW MODAL */}
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
