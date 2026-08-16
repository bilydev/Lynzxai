import { useState, useEffect } from 'react';
import { AuthPage } from './components/AuthPage';
import { AdminDashboard } from './components/AdminDashboard';
import { ChatPage } from './components/ChatPage';
import { MultiAiPage } from './components/MultiAiPage';
import { NotificationModal } from './components/NotificationModal';
import { subscribeToUserStatus } from './firebase';
import { enableCodeProtection } from './utils/security';

type AppView = 'auth' | 'admin' | 'chat' | 'multiai';

const CURRENT_USER_KEY = 'lynzx_active_user_v1';
const IS_ADMIN_KEY = 'lynzx_is_admin_v1';

export function App() {
  const [view, setView] = useState<AppView>('auth');
  const [activeUsername, setActiveUsername] = useState<string>('');
  const [, setIsAdmin] = useState<boolean>(false);

  // Global Notification state
  const [notice, setNotice] = useState<{ 
    msg: string; 
    title?: string; 
    subtitle?: string; 
    buttonText?: string; 
    hideCloseX?: boolean; 
    onCloseAction?: () => void;
  } | null>(null);

  // Enable Anti-Inspect Code Protection & Restore Session
  useEffect(() => {
    const cleanupProtection = enableCodeProtection();

    const savedUser = localStorage.getItem(CURRENT_USER_KEY);
    const savedAdmin = localStorage.getItem(IS_ADMIN_KEY) === 'true';

    if (savedUser) {
      setActiveUsername(savedUser);
      setIsAdmin(savedAdmin);
      setView(savedAdmin ? 'admin' : 'chat');
    }

    return () => cleanupProtection();
  }, []);

  // Realtime Listener for Active User Ban/Delete status while in Chat / Multi AI
  useEffect(() => {
    if (!activeUsername || activeUsername.toLowerCase() === 'admin') return;

    const unsub = subscribeToUserStatus(activeUsername, (account) => {
      if (!account) return;

      if (account.isBanned) {
        setNotice({
          title: 'Status Akun Banned',
          msg: 'maaf akun anda terkena banned dari owner karena anda terdeteksi melakukan keanehan terhadap ai kami by bily developer',
          buttonText: 'Keluar Ke Halaman Login',
          hideCloseX: true,
          onCloseAction: () => {
            handleLogout();
          }
        });
      } else if (account.isDeleted) {
        setNotice({
          title: 'Pemberitahuan Akun',
          msg: 'akun anda di hapus oleh owner kami',
          subtitle: 'lynzxbily codder',
          buttonText: 'Keluar Ke Halaman Login',
          hideCloseX: true,
          onCloseAction: () => {
            handleLogout();
          }
        });
      }
    });

    return () => unsub();
  }, [activeUsername]);

  const handleLoginSuccess = (username: string, adminFlag: boolean) => {
    setActiveUsername(username);
    setIsAdmin(adminFlag);
    localStorage.setItem(CURRENT_USER_KEY, username);
    localStorage.setItem(IS_ADMIN_KEY, adminFlag ? 'true' : 'false');
    setView(adminFlag ? 'admin' : 'chat');
  };

  const handleLogout = () => {
    setActiveUsername('');
    setIsAdmin(false);
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(IS_ADMIN_KEY);
    setView('auth');
  };

  const triggerNotice = (msg: string, title?: string, subtitle?: string) => {
    setNotice({ msg, title, subtitle });
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      
      {/* 1. Auth Page (bloods multi assitan) */}
      {view === 'auth' && (
        <AuthPage
          onLoginSuccess={handleLoginSuccess}
          showNotice={triggerNotice}
        />
      )}

      {/* 2. Admin Page (lynzx database admin pro) */}
      {view === 'admin' && (
        <AdminDashboard
          onLogout={handleLogout}
          showNotice={triggerNotice}
        />
      )}

      {/* 3. Main Chat Page (LYNZX ASSISTEN) */}
      {view === 'chat' && (
        <ChatPage
          username={activeUsername}
          onLogout={handleLogout}
          onOpenMultiAi={() => setView('multiai')}
          showNotice={triggerNotice}
        />
      )}

      {/* 4. Multi AI Page */}
      {view === 'multiai' && (
        <MultiAiPage
          onBack={() => setView('chat')}
          showNotice={triggerNotice}
        />
      )}

      {/* Global Notification / Alert Modal */}
      {notice && (
        <NotificationModal
          title={notice.title}
          message={notice.msg}
          subtitle={notice.subtitle}
          buttonText={notice.buttonText}
          hideCloseX={notice.hideCloseX}
          onClose={() => {
            if (notice.onCloseAction) {
              notice.onCloseAction();
            }
            setNotice(null);
          }}
        />
      )}

    </div>
  );
}

export default App;
