import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  LogIn, 
  Trash2, 
  Ban, 
  CheckCircle, 
  Clock, 
  MoreVertical, 
  LogOut, 
  Bug,
  Search,
  Check,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { 
  subscribeToStats, 
  subscribeToUsers, 
  subscribeToBugReports, 
  subscribeToAdminCredentials,
  deleteUserInFirebase, 
  banUserInFirebase, 
  unbanUserInFirebase, 
  deleteBugReport, 
  updateBugReportStatus, 
  updateAdminCredentialsInFirebase,
  Stats, 
  UserAccount, 
  BugReport,
  AdminCredentials
} from '../firebase';

interface AdminDashboardProps {
  onLogout: () => void;
  showNotice: (msg: string, title?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, showNotice }) => {
  const [stats, setStats] = useState<Stats>({ totalCreated: 0, totalLogins: 0, totalDeleted: 0, totalBanned: 0 });
  const [users, setUsers] = useState<Record<string, UserAccount>>({});
  const [bugReports, setBugReports] = useState<Record<string, BugReport>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Admin credentials state
  const [currentAdmin, setCurrentAdmin] = useState<AdminCredentials>({ username: 'admin', password: 'adminbily' });
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');

  // Dropdown state for users
  const [activeUserMenu, setActiveUserMenu] = useState<string | null>(null);
  // Dropdown state for bug reports
  const [activeBugMenu, setActiveBugMenu] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubStats = subscribeToStats((newStats) => setStats(newStats));
    const unsubUsers = subscribeToUsers((newUsers) => setUsers(newUsers));
    const unsubBugs = subscribeToBugReports((newBugs) => setBugReports(newBugs));
    const unsubAdmin = subscribeToAdminCredentials((creds) => {
      setCurrentAdmin(creds);
      if (!newAdminUser) setNewAdminUser(creds.username);
    });

    return () => {
      unsubStats();
      unsubUsers();
      unsubBugs();
      unsubAdmin();
    };
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveUserMenu(null);
        setActiveBugMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteUser = (username: string) => {
    deleteUserInFirebase(username);
    showNotice(`Akun ${username} telah berhasil dihapus dari Firebase dan daftar.`, 'Sukses Hapus Akun');
    setActiveUserMenu(null);
  };

  const handleBanUser = (username: string) => {
    banUserInFirebase(username);
    showNotice(`Akun ${username} telah berhasil di-Banned.`, 'Sukses Ban Akun');
    setActiveUserMenu(null);
  };

  const handleUnbanUser = (username: string) => {
    unbanUserInFirebase(username);
    showNotice(`Akun ${username} telah berhasil di-Unban. Pengguna dapat login kembali secara normal.`, 'Sukses Unban Akun');
    setActiveUserMenu(null);
  };

  const handleDeleteBug = (reportId: string) => {
    deleteBugReport(reportId);
    showNotice('Laporan bug berhasil dihapus.', 'Hapus Laporan');
    setActiveBugMenu(null);
  };

  const handleApproveBug = (reportId: string) => {
    updateBugReportStatus(reportId, 'approved');
    showNotice('Status laporan diubah menjadi: Approved. Notifikasi telah dikirim ke user secara Realtime.', 'Laporan Disetujui');
  };

  const handleWaitBug = (reportId: string) => {
    updateBugReportStatus(reportId, 'wait');
    showNotice('Status laporan diubah menjadi: Wait. Notifikasi telah dikirim ke user secara Realtime.', 'Laporan Ditunda');
  };

  const handleSaveAdminCreds = (e: React.FormEvent) => {
    e.preventDefault();
    const u = newAdminUser.trim();
    const p = newAdminPass.trim();
    if (!u || !p) {
      showNotice('Username dan password admin baru tidak boleh kosong!', 'Error');
      return;
    }

    updateAdminCredentialsInFirebase(u, p);
    showNotice(`Kredensial Admin berhasil diperbarui ke Firebase! Username: ${u}`, 'Sukses Ubah Admin');
    setNewAdminPass('');
  };

  const filteredUsers = Object.values(users).filter((u) => {
    if (!u || !u.username || u.isDeleted) return false;
    return u.username.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const reportsList = Object.values(bugReports).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 sm:p-8 font-sans relative" ref={menuRef}>
      
      {/* Clean Top Bar (Hapus logo database & Teks lama) */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-red-900/40">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-white to-blue-400 font-mono">
            DATABASE ADMIN PRO
          </h1>
          <p className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            Admin Aktif: <strong className="text-red-400">@{currentAdmin.username}</strong>
          </p>
        </div>

        <button
          onClick={onLogout}
          className="self-start md:self-auto px-4 py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-600/60 hover:border-red-500 text-red-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      <div className="max-w-6xl mx-auto mt-8 space-y-8">

        {/* 4 Stat Boxes (Top Left, Top Right, Bottom Left, Bottom Right) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Box 1: Top Left - Jumlah User Creat Account */}
          <div className="bg-[#0b0c13] border-2 border-red-600/80 rounded-xl p-5 shadow-[0_0_20px_rgba(220,38,38,0.2)] flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Jumlah User Creat Account
              </span>
              <Users className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {Math.max(stats.totalCreated || 0, Object.keys(users).length)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-2">
              Otomatis sinkron dengan Firebase
            </div>
          </div>

          {/* Box 2: Top Right - Jumlah Login */}
          <div className="bg-[#0b0c13] border-2 border-blue-600/80 rounded-xl p-5 shadow-[0_0_20px_rgba(37,99,235,0.2)] flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Jumlah Login
              </span>
              <LogIn className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {stats.totalLogins || 0}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-2">
              Kecuali Akun Admin
            </div>
          </div>

          {/* Box 3: Bottom Left - Jumlah Delete Akun */}
          <div className="bg-[#0b0c13] border-2 border-yellow-600/80 rounded-xl p-5 shadow-[0_0_20px_rgba(202,138,4,0.2)] flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Jumlah Delete Akun
              </span>
              <Trash2 className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {stats.totalDeleted || 0}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-2">
              Akun terhapus permanen
            </div>
          </div>

          {/* Box 4: Bottom Right - Jumlah Ban Akun */}
          <div className="bg-[#0b0c13] border-2 border-red-700/80 rounded-xl p-5 shadow-[0_0_20px_rgba(185,28,28,0.2)] flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Jumlah Ban Akun
              </span>
              <Ban className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {stats.totalBanned || 0}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-2">
              User Banned tidak dapat login
            </div>
          </div>

        </div>

        {/* User Account List Section */}
        <div className="bg-[#0a0b10] border-2 border-red-600/60 rounded-2xl p-5 sm:p-6 shadow-[0_0_25px_rgba(220,38,38,0.15)] relative">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-extrabold uppercase tracking-wide text-red-400 flex items-center gap-2 font-mono">
                <Users className="w-5 h-5" />
                List Username & Password
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Kelola akun pengguna (delet, ban, unban)
              </p>
            </div>

            {/* Search filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari username..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#121522] border border-slate-700 focus:border-red-500 rounded-lg text-xs text-white placeholder-slate-500 outline-none font-mono"
              />
            </div>
          </div>

          {/* User List Scroll Box */}
          <div className="max-h-80 overflow-y-auto pr-1 space-y-2.5">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-mono">
                Belum ada data akun terdaftar.
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.username}
                  className={`p-3.5 bg-[#101320] border rounded-xl flex items-center justify-between transition-all relative ${
                    user.isBanned
                      ? 'border-red-600/80 bg-red-950/20'
                      : 'border-slate-800 hover:border-red-500/50'
                  }`}
                >
                  {/* Left user info */}
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold font-mono text-sm uppercase shrink-0 ${
                      user.isBanned 
                        ? 'bg-red-900/60 text-red-300 border border-red-600' 
                        : 'bg-blue-950/80 text-blue-300 border border-blue-600/50'
                    }`}>
                      {user.username.slice(0, 2)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-100">
                          {user.username}
                        </span>
                        {user.isBanned && (
                          <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-600 rounded text-[10px] font-mono uppercase font-bold">
                            BANNED
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>Password: <strong className="text-slate-200">{user.password || '******'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right side 3-dot dropdown menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveUserMenu(activeUserMenu === user.username ? null : user.username);
                      }}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title="Opsi Akun"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* Dropdown Menu (Outside box) */}
                    {activeUserMenu === user.username && (
                      <div className="absolute right-0 top-10 w-40 bg-[#0c0e18] border-2 border-red-600/80 rounded-xl shadow-2xl z-50 overflow-hidden py-1 animate-fadeIn">
                        
                        {/* Option 1: delet */}
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.username)}
                          className="w-full text-left px-3.5 py-2.5 text-xs text-yellow-400 hover:bg-yellow-950/50 flex items-center gap-2 font-mono uppercase font-bold transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-yellow-500" />
                          <span>delet</span>
                        </button>

                        {/* Option 2: ban */}
                        <button
                          type="button"
                          onClick={() => handleBanUser(user.username)}
                          className="w-full text-left px-3.5 py-2.5 text-xs text-red-400 hover:bg-red-950/50 flex items-center gap-2 font-mono uppercase font-bold transition-colors"
                        >
                          <Ban className="w-4 h-4 text-red-500" />
                          <span>ban</span>
                        </button>

                        {/* Option 3: unban */}
                        <button
                          type="button"
                          onClick={() => handleUnbanUser(user.username)}
                          className="w-full text-left px-3.5 py-2.5 text-xs text-green-400 hover:bg-green-950/50 flex items-center gap-2 font-mono uppercase font-bold transition-colors"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>unban</span>
                        </button>

                      </div>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>

        </div>

        {/* Bug Reports Section */}
        <div className="bg-[#0a0b10] border-2 border-blue-600/60 rounded-2xl p-5 sm:p-6 shadow-[0_0_25px_rgba(37,99,235,0.15)]">
          
          <div className="mb-5 pb-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold uppercase tracking-wide text-blue-400 flex items-center gap-2 font-mono">
                <Bug className="w-5 h-5" />
                Laporan Bug Dari User
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Laporan dikirim langsung oleh pengguna web
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-950 border border-blue-600/60 rounded-full text-xs font-mono font-bold text-blue-300">
              {reportsList.length} Laporan
            </span>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {reportsList.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-mono">
                Belum ada laporan bug dari pengguna.
              </div>
            ) : (
              reportsList.map((report) => (
                <div
                  key={report.id}
                  className="bg-[#101322] border border-slate-800 hover:border-blue-500/50 rounded-xl p-4 space-y-3 relative transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-blue-900/60 border border-blue-500/50 rounded text-xs font-mono font-bold text-blue-200">
                        @{report.username}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(report.createdAt).toLocaleString('id-ID')}
                      </span>
                    </div>

                    {/* Right 3-dot dropdown for report delete */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveBugMenu(activeBugMenu === report.id ? null : report.id);
                        }}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeBugMenu === report.id && (
                        <div className="absolute right-0 top-8 w-36 bg-[#0d0f1a] border border-red-600 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteBug(report.id)}
                            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-950 flex items-center gap-2 font-mono font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bug description box */}
                  <div className="p-3 bg-[#08090e] border border-slate-800 rounded-lg text-xs font-mono text-slate-200 whitespace-pre-wrap">
                    {report.reportText}
                  </div>

                  {/* Status & Action Buttons (Approve & Wait) */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-slate-400">Status:</span>
                      {report.status === 'approved' && (
                        <span className="px-2 py-0.5 bg-green-950 text-green-400 border border-green-600 rounded uppercase font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {report.status === 'wait' && (
                        <span className="px-2 py-0.5 bg-yellow-950 text-yellow-400 border border-yellow-600 rounded uppercase font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Wait
                        </span>
                      )}
                      {report.status === 'pending' && (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded uppercase font-bold">
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveBug(report.id)}
                        className="px-3 py-1.5 bg-green-950 hover:bg-green-900 border border-green-600/70 text-green-200 rounded-lg text-xs font-bold font-mono uppercase transition-colors"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() => handleWaitBug(report.id)}
                        className="px-3 py-1.5 bg-yellow-950 hover:bg-yellow-900 border border-yellow-600/70 text-yellow-200 rounded-lg text-xs font-bold font-mono uppercase transition-colors"
                      >
                        Wait
                      </button>
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>

        {/* Change Admin Username & Password Form */}
        <div className="bg-[#0a0b10] border-2 border-purple-600/60 rounded-2xl p-5 sm:p-6 shadow-[0_0_25px_rgba(168,85,247,0.15)]">
          <div className="mb-4 pb-3 border-b border-slate-800">
            <h2 className="text-lg font-extrabold uppercase tracking-wide text-purple-400 flex items-center gap-2 font-mono">
              <KeyRound className="w-5 h-5 text-purple-400" />
              Ubah Username & Password Admin
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Kredensial tersimpan secara Realtime di Firebase
            </p>
          </div>

          <form onSubmit={handleSaveAdminCreds} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-300 font-mono mb-1">
                Username Admin Baru
              </label>
              <input
                type="text"
                value={newAdminUser}
                onChange={(e) => setNewAdminUser(e.target.value)}
                placeholder="Masukkan username admin baru..."
                className="w-full p-2.5 bg-[#121526] border border-slate-700 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 font-mono mb-1">
                Password Admin Baru
              </label>
              <input
                type="password"
                value={newAdminPass}
                onChange={(e) => setNewAdminPass(e.target.value)}
                placeholder="Masukkan password admin baru..."
                className="w-full p-2.5 bg-[#121526] border border-slate-700 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-mono"
                required
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Simpan Kredensial Admin</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
