import { useState, useEffect } from 'react';
import { Eye, EyeOff, Wifi, Lock, User, Server } from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

const REMEMBER_KEY = 'anlikpos-login-remember';

export default function Login() {
  const [terminalUrl, setTerminalUrl] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const { setToken, setUser, setBaseUrl } = useStore();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        remember?: boolean;
        terminalUrl?: string;
        companyId?: string;
      };
      if (saved.remember) {
        setRememberMe(true);
        if (saved.terminalUrl) setTerminalUrl(saved.terminalUrl);
        if (saved.companyId) setCompanyId(saved.companyId);
      } else {
        setRememberMe(false);
      }
    } catch {}
  }, []);

  const normalizeUrl = (url: string) => {
    let u = url.trim();
    if (!u) return '';
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'https://' + u;
    }
    return u.replace(/\/$/, '');
  };

  const saveRemember = (url: string, company: string, remember: boolean) => {
    if (remember) {
      localStorage.setItem(
        REMEMBER_KEY,
        JSON.stringify({
          remember: true,
          terminalUrl: url,
          companyId: company,
        })
      );
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  };

  const handleLogin = async () => {
    if (!terminalUrl.trim()) {
      toast.error('Tunnel adresi giriniz!');
      return;
    }
    if (!companyId.trim() || !password.trim()) {
      toast.error('İşletme adı ve şifre zorunludur!');
      return;
    }

    setLoading(true);
    const base = normalizeUrl(terminalUrl);

    try {
      setBaseUrl(base);
      const data = await api('/mobile/auth', {
        method: 'POST',
        body: {
          company_id: companyId,
          password,
          terminal_password: companyId,
          user_pin: password,
        },
      });

      if (!data.ok) {
        toast.error(data.error || 'Giriş başarısız!');
        return;
      }

      saveRemember(terminalUrl.trim(), companyId.trim(), rememberMe);

      setToken(data.token);
      setUser(data.user);
      toast.success('Hoş geldiniz ' + (data.user?.name || ''));
    } catch (e: any) {
      toast.error('Bağlantı hatası: ' + (e.message || 'Sunucuya ulaşılamıyor'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1a33] via-[#0f2347] to-[#081428] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        
        {/* ✅ Giriş Ekranı Logo Kutusu - Çerçeveyi Birebir Dolduran Görünüm */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-[#0b1a33] border border-white/20 mb-4 shadow-2xl overflow-hidden">
            <img
              src="/payment-icons/logo.png"
              alt="AnlıkPOS Logo"
              className="w-full h-full object-cover scale-[1.55]"
            />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">AnlıkPOS</h1>
          <p className="text-blue-300/70 text-sm mt-1 font-medium">Restoran Pos Sistemi</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
          <div className="mb-4">
            <label className="block text-xs font-bold text-blue-300/80 uppercase tracking-wider mb-2">
              Tunnel / Sunucu Adresi
            </label>
            <div className="relative">
              <Server size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400/60" />
              <input
                type="url"
                value={terminalUrl}
                onChange={(e) => setTerminalUrl(e.target.value)}
                placeholder="Sunucu Adresini Girin"
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 text-sm transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-blue-300/80 uppercase tracking-wider mb-2">
              İşletme Adı (Kullanıcı ID)
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400/60" />
              <input
                type="text"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                placeholder="İşletme adınız"
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 text-sm transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-blue-300/80 uppercase tracking-wider mb-2">
              Yönetici Şifresi
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400/60" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-12 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 text-sm transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer mb-6 select-none">
            <div
              className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                rememberMe ? 'bg-emerald-500' : 'bg-white/20'
              }`}
              onClick={() => setRememberMe((v) => !v)}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  rememberMe ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white/90">Beni hatırla</div>
              <div className="text-[11px] text-white/40 leading-tight">
                Tunnel adresi ve işletme adı kaydedilir (şifre kaydedilmez)
              </div>
            </div>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="hidden"
            />
          </label>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Bağlanılıyor...
              </>
            ) : (
              <>
                <Wifi size={18} />
                Giriş Yap
              </>
            )}
          </button>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">AnlıkPOS Mobil v2.0</p>
      </div>
    </div>
  );
}