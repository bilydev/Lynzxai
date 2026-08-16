import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, UserPlus, LogIn, AlertTriangle, Check, X, Eye, EyeOff } from 'lucide-react';
import { 
  registerUserToFirebase, 
  recordUserLoginToFirebase, 
  fetchUserFromFirebase,
  subscribeToAdminCredentials,
  UserAccount,
  AdminCredentials
} from '../firebase';
import { hasBadWords, PROFANITY_WARNING } from '../utils/badWords';

interface AuthPageProps {
  onLoginSuccess: (username: string, isAdmin: boolean) => void;
  showNotice: (msg: string, title?: string, subtitle?: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, showNotice }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [adminCreds, setAdminCreds] = useState<AdminCredentials>({ username: 'admin', password: 'adminbily' });
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeToAdminCredentials((creds) => {
      if (creds && creds.username && creds.password) {
        setAdminCreds(creds);
      }
    });
    return () => unsub();
  }, []);

  // Password validation state
  const hasCapital = /[A-Z]/.test(password);
  const isMinLength = password.length >= 5;
  const isPasswordValid = hasCapital && isMinLength;

  // Strength calculation
  const getStrength = () => {
    if (password.length < 5) return { text: '', color: '', pct: '0%' };
    if (password.length >= 10) return { text: 'hard', color: 'bg-red-500', pct: '100%', textColor: 'text-red-400' };
    if (password.length >= 8) return { text: 'normal', color: 'bg-orange-500', pct: '66%', textColor: 'text-orange-400' };
    return { text: 'easy', color: 'bg-green-500', pct: '33%', textColor: 'text-green-400' };
  };

  const strength = getStrength();

  const handleTogglePassword = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPassword((prev) => !prev);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMsg('Username dan password wajib diisi!');
      return;
    }

    if (hasBadWords(trimmedUser) || hasBadWords(password)) {
      showNotice(PROFANITY_WARNING, 'Peringatan Keamanan');
      return;
    }

    // Check Admin Login
    if (trimmedUser === adminCreds.username && password === adminCreds.password) {
      onLoginSuccess('admin', true);
      return;
    }

    setLoading(true);

    try {
      // Always fetch latest state directly from Firebase Realtime Database for cross-device accuracy
      const fetchedAccount = await fetchUserFromFirebase(trimmedUser);

      if (isRegisterMode) {
        // Register Mode
        if (!isPasswordValid) {
          setErrorMsg('Password tidak memenuhi kriteria keamanan (minimal 5 karakter & 1 huruf kapital A-Z).');
          setLoading(false);
          return;
        }

        if (fetchedAccount && !fetchedAccount.isDeleted) {
          setErrorMsg('Username ini sudah terdaftar!');
          setLoading(false);
          return;
        }

        const newAccount: UserAccount = {
          username: trimmedUser,
          password: password,
          createdAt: Date.now(),
          isBanned: false,
          isDeleted: false
        };

        await registerUserToFirebase(newAccount);
        showNotice('Akun berhasil dibuat! Silahkan login sekarang.', 'Registrasi Berhasil');
        setIsRegisterMode(false);
        setPassword('');
      } else {
        // Login Mode
        if (!fetchedAccount) {
          setErrorMsg('Username atau password salah!');
          setLoading(false);
          return;
        }

        if (fetchedAccount.isDeleted) {
          showNotice(
            'akun anda di hapus oleh owner kami',
            'Pemberitahuan Akun',
            'lynzxbily codder'
          );
          setLoading(false);
          return;
        }

        if (fetchedAccount.isBanned) {
          showNotice(
            'maaf akun anda terkena banned dari owner karena anda terdeteksi melakukan keanehan terhadap ai kami by bily developer',
            'Status Akun Banned'
          );
          setLoading(false);
          return;
        }

        if (fetchedAccount.password !== password) {
          setErrorMsg('Username atau password salah!');
          setLoading(false);
          return;
        }

        await recordUserLoginToFirebase();
        onLoginSuccess(fetchedAccount.username, false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan koneksi. Silahkan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050508] text-white flex flex-col items-center justify-center p-4 relative">
      
      {/* Light-weight optimized background gradient (no heavy GPU blurs) */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-[#050508] to-blue-950/20 pointer-events-none" />

      {/* Container (Ultra lightweight for 60fps mobile performance) */}
      <div className="w-full max-w-md bg-[#0a0a0f] border-2 border-red-600/70 rounded-2xl p-6 sm:p-8 relative z-10 shadow-2xl">
        
        {/* Title Header */}
        <div className="text-center mb-8">
          <h1 className="title-purple-sweep text-2xl sm:text-3xl font-black tracking-wider uppercase">
            bloods multi assitan
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-mono tracking-widest uppercase">
            {isRegisterMode ? 'Buat Akun Baru' : 'Akses Masuk Sistem'}
          </p>
        </div>

        {/* Form Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-lg bg-red-950/90 border border-red-600 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-5">
          {/* Username Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1 font-mono">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="masukan username"
                className="w-full pl-10 pr-4 py-2.5 bg-[#10131e] border border-slate-700 focus:border-red-500 rounded-lg text-sm text-white placeholder-slate-500 outline-none"
                required
              />
            </div>
          </div>

          {/* Password Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1 font-mono">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                ref={passwordInputRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="masukan password"
                className="w-full pl-10 pr-10 py-2.5 bg-[#10131e] border border-slate-700 focus:border-red-500 rounded-lg text-sm text-white placeholder-slate-500 outline-none font-mono"
                required
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleTogglePassword}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer select-none p-1"
                tabIndex={-1}
                title={showPassword ? "Sembunyikan Password" : "Tampilkan Password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-red-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
              </button>
            </div>

            {/* Password Validation Requirements */}
            {isRegisterMode && password.length > 0 && (
              <div className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-2">
                
                {/* Rule 1: Min 5 characters */}
                <div className="flex items-center gap-2">
                  {isMinLength ? (
                    <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  )}
                  <span className={isMinLength ? 'text-green-300' : 'text-slate-400'}>
                    Minimal 5 huruf atau angka
                  </span>
                </div>

                {/* Rule 2: Must contain capital letter A-Z */}
                <div className="flex items-center gap-2">
                  {hasCapital ? (
                    <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  )}
                  <span className={hasCapital ? 'text-green-300' : 'text-slate-400'}>
                    Harus ada minimal 1 huruf kapital (A-Z)
                  </span>
                </div>

                {/* Password Strength Meter */}
                {strength.text && (
                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex justify-between items-center text-[10px] uppercase font-mono mb-1">
                      <span className="text-slate-400">Password Strength:</span>
                      <span className={`font-bold ${strength.textColor}`}>{strength.text}</span>
                    </div>
                    {/* Line strength gauge */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${strength.color} transition-all duration-300`} 
                        style={{ width: strength.pct }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || (isRegisterMode && !isPasswordValid)}
            className={`w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg transition-all ${
              isRegisterMode && !isPasswordValid
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 text-white border border-red-500/50 shadow-red-950/50 active:scale-95'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isRegisterMode ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Buat Akun Sekarang</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk Sekarang</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          {isRegisterMode ? (
            <p className="text-xs text-slate-400">
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setErrorMsg('');
                }}
                className="text-red-400 hover:text-red-300 font-semibold underline underline-offset-4 ml-1 transition-colors"
              >
                Login di sini
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(true);
                  setErrorMsg('');
                }}
                className="text-red-400 hover:text-red-300 font-semibold underline underline-offset-4 ml-1 transition-colors"
              >
                Create Account
              </button>
            </p>
          )}
        </div>

        {/* Footer Credit Tag */}
        <div className="mt-6 text-center text-[10px] font-mono text-slate-600 tracking-wider">
          LYNZXBILY CODDER &bull; BLOODS SYSTEM
        </div>

      </div>
    </div>
  );
};
