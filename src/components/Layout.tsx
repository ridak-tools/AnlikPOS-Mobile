import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, ShoppingCart, Phone, Users, Link2,
  Package, BookOpen, Tag, Table2, UserCog, Printer,
  BarChart3, LogOut, RefreshCw, Bell, ChevronRight, Menu, Truck, Clock, X, Timer
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api, money, getBaseUrl } from '../api/client';
import { notifyNewOrders, markOrdersSeen, initOrderNotifications } from '../utils/orderNotify';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';

export const NAV_ITEMS = [
  { id: 'dash', label: 'Genel Bakış', icon: LayoutDashboard },
  { id: 'pos', label: 'POS', icon: ShoppingCart },
  { id: 'calls', label: 'Çağrılar', icon: Phone },
  { id: 'customers', label: 'Müşteriler', icon: Users },
  { id: 'integrations', label: 'Entegrasyonlar', icon: Link2 },
  { id: 'products', label: 'Ürünler', icon: Package },
  { id: 'menus', label: 'Menüler', icon: BookOpen },
  { id: 'categories', label: 'Kategoriler', icon: Tag },
  { id: 'tablesDef', label: 'Masalar', icon: Table2 },
  { id: 'users', label: 'Kullanıcılar', icon: UserCog },
  { id: 'printers', label: 'Yazıcılar', icon: Printer },
  { id: 'reports', label: 'Raporlar', icon: BarChart3 },
];

const PERSONEL_ALLOWED_PAGES = ['pos', 'calls', 'customers', 'integrations'];

interface LayoutProps {
  children: React.ReactNode;
  onRefresh: () => void;
}

export default function Layout({ children, onRefresh }: LayoutProps) {
  const { currentPage, setPage, user, logout } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Bildirim State'leri
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [packageOrders, setPackageOrders] = useState<any[]>([]);
  const [seenOrderIds, setSeenOrderIds] = useState<Set<number>>(new Set());
  const bootstrappedRef = useRef(false);
  
  const [fcmToken, setFcmToken] = useState<string>('IOS_TUNNEL_ACTIVE');

  // Entegrasyon State'leri
  const [showIntegModal, setShowIntegModal] = useState(false);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [countdown, setCountdown] = useState(30);
  const [pollInterval, setPollInterval] = useState(30);

  // Rol Kontrolü
  const roleUpper = (user?.role || '').toString().toUpperCase();
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'YÖNETİCİ' || roleUpper === 'YONETICI';

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    isAdmin ? true : PERSONEL_ALLOWED_PAGES.includes(item.id)
  );

  const currentNav = NAV_ITEMS.find((n) => n.id === currentPage);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin && !PERSONEL_ALLOWED_PAGES.includes(currentPage)) {
      setPage('pos');
    }
  }, [user, isAdmin, currentPage, setPage]);

  // PAKET SİPARİŞ BİLDİRİMİ
  const fetchPackageNotifications = useCallback(async () => {
    try {
      const [pkg, active] = await Promise.all([
        api('/mobile/orders/package').catch(() => ({ orders: [] })),
        api('/mobile/orders/active').catch(() => ({ orders: [] })),
      ]);

      const openPkg = (pkg.orders || []).filter((o: any) => o.status === 'OPEN');
      setPackageOrders(openPkg);

      const map = new Map<number, any>();
      openPkg.forEach((o: any) => map.set(Number(o.id), o));

      (active.orders || []).forEach((o: any) => {
        if (o.status !== 'OPEN') return;
        const sn = `${o.source_name || ''} ${o.platform || ''}`.toLowerCase();
        if (
          o.sale_type === 'PACKAGE' ||
          sn.includes('yemek') ||
          sn.includes('getir') ||
          sn.includes('trendyol') ||
          sn.includes('migros')
        ) {
          map.set(Number(o.id), o);
        }
      });

      const list = Array.from(map.values());

      if (!bootstrappedRef.current) {
        markOrdersSeen(list);
        bootstrappedRef.current = true;
      } else {
        await notifyNewOrders(list);
      }
    } catch {}
  }, []);

  useEffect(() => {
    initOrderNotifications();
    fetchPackageNotifications();

    const timer = setInterval(fetchPackageNotifications, 8000);
    return () => clearInterval(timer);
  }, [fetchPackageNotifications]);

  const handleOpenNotifModal = () => {
    setShowNotifModal(true);
    setSeenOrderIds((prev) => {
      const next = new Set(prev);
      packageOrders.forEach((o) => next.add(o.id));
      return next;
    });
  };

  // ENTEGRASYON KISA YOLU
  const loadIntegrations = async () => {
    try {
      const d = await api('/mobile/integrations');
      setPlatforms(d.platforms || []);
      const pi = parseInt(d.poll_interval || 30);
      setPollInterval(pi);
      setCountdown(pi);
    } catch {}
  };

  useEffect(() => {
    if (!showIntegModal) return;
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { loadIntegrations(); return pollInterval; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [showIntegModal, pollInterval]);

  const toggleIntegration = async (key: string, currentOpenStatus: boolean) => {
    const targetStatus = !currentOpenStatus;
    const toastId = toast.loading(targetStatus ? 'Restoran açılıyor...' : 'Restoran kapatılıyor...');

    const payload = {
      platform: key,
      platform_key: key,
      key: key,
      open: targetStatus,
      is_open: targetStatus,
      is_active: targetStatus,
      active: targetStatus,
      enabled: targetStatus,
      status: targetStatus ? 'OPEN' : 'CLOSED',
      state: targetStatus ? 'OPEN' : 'CLOSED',
      action: targetStatus ? 'open' : 'close',
      store_action: targetStatus ? 'open' : 'close',
    };

    try {
      let d = await api('/mobile/integrations/toggle', {
        method: 'POST',
        body: payload,
      });

      if (!d || !d.ok) {
        try {
          d = await api('/mobile/integrations/store-status', { method: 'POST', body: payload });
        } catch {}
      }

      toast.dismiss(toastId);

      if (d && (d.ok || d.success)) {
        toast.success(targetStatus ? 'Restoran siparişe AÇILDI' : 'Restoran siparişe KAPATILDI');
        if (d.warning) toast(d.warning, { icon: '⚠️' });
      } else {
        toast.success(targetStatus ? 'Açma emri gönderildi' : 'Kapatma emri gönderildi');
      }
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e.message || 'İşlem gönderildi');
    }

    loadIntegrations();
    setTimeout(loadIntegrations, 1500);
  };

  const toggleAllIntegrations = async (targetStatus: boolean) => {
    const toastId = toast.loading(targetStatus ? 'Tüm restoranlar açılıyor...' : 'Tüm restoranlar kapatılıyor...');

    const payload = {
      open: targetStatus,
      is_open: targetStatus,
      is_active: targetStatus,
      active: targetStatus,
      enabled: targetStatus,
      status: targetStatus ? 'OPEN' : 'CLOSED',
      action: targetStatus ? 'open' : 'close',
    };

    try {
      const d = await api('/mobile/integrations/toggle-all', {
        method: 'POST',
        body: payload,
      });

      toast.dismiss(toastId);
      toast.success(targetStatus ? 'Tüm restoranlar AÇILDI' : 'Tüm restoranlar KAPATILDI');
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error('İşlem gönderildi');
    }

    loadIntegrations();
    setTimeout(loadIntegrations, 1500);
  };

  const anyIntegOn = platforms.some((p) => (p.is_open !== undefined ? p.is_open : p.is_active));

  const handleLogout = () => {
    logout();
    toast('Çıkış yapıldı', { icon: '👋' });
  };

  const navigate = (id: string) => {
    if (!isAdmin && !PERSONEL_ALLOWED_PAGES.includes(id)) {
      toast.error('Bu sayfaya erişim yetkiniz yok');
      return;
    }
    setPage(id);
    setSidebarOpen(false);
  };

  const showUserInfo = async () => {
    toast(
      (t) => (
        <div className="flex flex-col gap-1">
          <div><b>Yetkili:</b> {userName}</div>
          <div className="text-sm"><b>Rol:</b> {userRole || 'Kullanıcı'}</div>
          <div className="mt-2 text-[11px] bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 p-2 rounded-xl text-center font-bold">
            🍏 Canlı Tünel Modu Aktif<br/>
            <span className="text-[9.5px] font-normal opacity-80">(Masaüstüne token yapıştırmanız gerekmez)</span>
          </div>
        </div>
      ),
      {
        icon: '👤',
        duration: 4000,
        style: { background: '#0b1a33', color: '#fff' },
      }
    );
  };

  const userInitial = (user?.name || 'U').charAt(0).toUpperCase();
  const userName = user?.name || 'Kullanıcı';
  const userRole = user?.role || '';
  const unreadCount = packageOrders.filter((o) => !seenOrderIds.has(o.id)).length;

  return (
    <div className="flex h-screen bg-[#f0f4f9] overflow-hidden">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#0b1a33] flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Sidebar Header */}
        <div className="px-6 pb-6 pt-safe border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0f2347] border border-white/10 flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
              <img
                src="/payment-icons/logo.png"
                alt="AnlıkPOS Logo"
                className="w-full h-full object-cover scale-[1.55]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="text-white font-black text-lg">AnlıkPOS</div>
              <div className="text-blue-300/60 text-xs">Mobil Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-blue-200/60 hover:bg-white/5 hover:text-white'}`}
              >
                <Icon size={18} />
                <span className="font-semibold text-sm">{item.label}</span>
                {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </button>
            );
          })}
        </nav>

        <div className="p-3 pb-safe border-t border-white/10 space-y-1">
          <button onClick={onRefresh} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-blue-200/60 hover:bg-white/5 hover:text-white transition-all">
            <RefreshCw size={18} />
            <span className="font-semibold text-sm">Yenile</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all">
            <LogOut size={18} />
            <span className="font-semibold text-sm">Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white border-b border-slate-100 px-4 pb-3 pt-safe flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0">
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="font-black text-[#0b1a33] text-base truncate">
                {currentNav?.label || 'AnlıkPOS'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { loadIntegrations(); setShowIntegModal(true); }}
              className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              title="Entegrasyonlar"
            >
              <Link2 size={16} />
            </button>

            <button
              onClick={() => { fetchPackageNotifications(); onRefresh(); }}
              className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              title="Yenile"
            >
              <RefreshCw size={16} />
            </button>

            <button
              onClick={handleOpenNotifModal}
              className="relative w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              title="Paket Sipariş Bildirimleri"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={showUserInfo}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-black text-sm shadow-md active:scale-95 transition-transform"
            >
              {userInitial}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-safe">
          {children}
        </main>
      </div>

      {/* ENTEGRASYON KISA YOL MODALI */}
      {showIntegModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-5 flex-shrink-0">
              <h2 className="font-black text-slate-800 text-xl mb-4">Entegrasyonlar</h2>
              <div className="font-bold text-slate-800 text-sm mb-2 text-center">Entegrasyon Yenilenme Süresi</div>
              <div className="bg-red-50 rounded-2xl p-4 flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-red-500">
                  <Timer size={20} />
                  <span className="text-2xl font-black">{countdown}</span>
                  <span className="font-bold text-sm mt-1">sn</span>
                </div>
                <button onClick={loadIntegrations} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-slate-600 active:scale-95">
                  <RefreshCw size={16} />
                </button>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-slate-800 text-sm">Tüm Restoranlar</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Tümünü Değiştir</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={anyIntegOn}
                      onChange={(e) => toggleAllIntegrations(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-checked:bg-emerald-500 rounded-full transition-colors relative">
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${anyIntegOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-2">
              <div className="grid grid-cols-2 gap-3">
                {platforms.map((p) => {
                  const isOn = p.is_open !== undefined ? p.is_open : (p.is_active || p.is_running);

                  return (
                    <div key={p.key} className="border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm relative bg-white">
                      <div className="w-12 h-12 rounded-full border border-slate-100 flex items-center justify-center overflow-hidden mb-2 shadow-sm p-1.5 bg-white">
                        <PlatformLogo platformKey={p.key} name={p.name} />
                      </div>
                      <div className="font-bold text-slate-800 text-sm leading-tight mb-1">{p.name}</div>
                      
                      <div className={`text-[10px] font-black uppercase mb-3 ${isOn ? 'text-emerald-600' : 'text-red-500'}`}>
                        ● {isOn ? 'RESTORAN AÇIK' : 'RESTORAN KAPALI'}
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer mb-2">
                        <input
                          type="checkbox"
                          checked={isOn}
                          disabled={!p.is_configured}
                          onChange={() => toggleIntegration(p.key, isOn)}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors relative ${p.is_configured ? 'peer-checked:bg-emerald-500 bg-slate-200' : 'bg-slate-100'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                      </label>

                      {!p.is_configured && (
                        <div className="text-[9px] text-slate-400 mt-1">Yapılandırılmamış</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 pb-safe-lg space-y-2 bg-white flex-shrink-0 border-t border-slate-50">
              <button
                onClick={() => { setShowIntegModal(false); navigate('integrations'); }}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
              >
                Tüm Entegrasyon Sayfası
              </button>
              <button
                onClick={() => setShowIntegModal(false)}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAKET SİPARİŞ BİLDİRİM MODALI */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Truck size={18} /></div>
                <div>
                  <h2 className="font-black text-slate-800 text-base">Paket Sipariş Bildirimleri</h2>
                  <p className="text-xs text-slate-400 font-medium">Toplam {packageOrders.length} aktif paket var</p>
                </div>
              </div>
              <button onClick={() => setShowNotifModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-safe-lg space-y-2.5">
              {packageOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Bell size={40} className="mx-auto mb-2 opacity-30" />
                  <div className="font-bold text-sm">Aktif Paket Siparişi Yok</div>
                </div>
              ) : (
                packageOrders.map((o) => {
                  const onWay = ['ON_THE_WAY', 'ON_WAY', 'DELIVERY'].includes((o.delivery_status || '').toUpperCase());
                  return (
                    <div key={o.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-800 text-sm">#{o.order_no} · {o.source_name || 'Paket Servis'}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${onWay ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{onWay ? '🔵 Yolda' : '🟡 Hazırlanıyor'}</span>
                      </div>
                      <div className="text-xs text-slate-600 font-semibold space-y-0.5">
                        {o.customer_name && <div>👤 {o.customer_name}</div>}
                        {o.customer_phone && <div className="text-blue-600">📞 {o.customer_phone}</div>}
                        {o.address && <div className="text-slate-500 truncate">📍 {o.address}</div>}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <div className="font-black text-emerald-600 text-sm">{money(o.grand_total)}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Clock size={12} /> {o.waiting_minutes || 0} dk</span>
                          <button
                            onClick={() => {
                              setShowNotifModal(false);
                              navigate('pos');
                            }}
                            className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl active:scale-95 transition-transform"
                          >
                            Siparişe Git
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformLogo({ platformKey, name }: { platformKey: string; name: string }) {
  const [attempt, setAttempt] = useState(0);
  const base = getBaseUrl().replace(/\/$/, '');
  const key = (platformKey || '').toLowerCase();
  const cleanKey = key.replace(/[^a-z0-9]/g, '');

  const candidates: string[] = [
    `/platform-logos/${key}.png`,
    `/platform-logos/${cleanKey}.png`,
    `/platform-logos/${key}.jpg`,
    `/platform-logos/${key}.svg`,
    `/platform-logos/${key}.webp`,
  ];

  if (key.includes('yemek')) candidates.push('/platform-logos/yemeksepeti.png');
  if (key.includes('getir')) candidates.push('/platform-logos/getir.png');
  if (key.includes('trendyol')) candidates.push('/platform-logos/trendyol.png', '/platform-logos/trendyolgo.png');
  if (key.includes('migros')) candidates.push('/platform-logos/migros.png', '/platform-logos/migrosyemek.png');

  if (base) {
    candidates.push(`${base}/mobile/platform-logo/${encodeURIComponent(platformKey)}`);
    candidates.push(`${base}/mobile/platform-logo/${encodeURIComponent(key)}`);
    candidates.push(`${base}/_internal/assets/images/platforms/${key}.png`);
    candidates.push(`${base}/assets/images/platforms/${key}.png`);
  }

  const currentSrc = candidates[attempt];

  if (!currentSrc || attempt >= candidates.length) {
    const colors: Record<string, string> = {
      yemeksepeti: 'bg-pink-500 text-white',
      getir: 'bg-purple-600 text-amber-300',
      trendyol: 'bg-orange-500 text-white',
      migros: 'bg-orange-400 text-white',
    };
    const colorClass = Object.entries(colors).find(([k]) => key.includes(k))?.[1] || 'bg-slate-700 text-white';

    return (
      <div className={`w-full h-full rounded-full ${colorClass} flex items-center justify-center font-black text-base shadow-inner`}>
        {(name || '?').charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={name}
      className="w-full h-full object-contain rounded-full"
      onError={() => setAttempt((prev) => prev + 1)}
    />
  );
}