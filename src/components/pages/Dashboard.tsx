import { useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, Users, Truck, Star, Clock } from 'lucide-react';
import { api, money } from '../../api/client';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

interface DashData {
  sales: number;
  orders: number;
  open_tables: number;
  active_couriers: number;
  top_product: string;
  live: {
    open_tables: number;
    open_orders: number;
    package_orders: number;
    active_couriers: number;
    last_order_time: string;
  };
  performance: {
    open_tables: number;
    package_orders: number;
    active_couriers: number;
    open_orders: number;
    sales: number;
    orders: number;
  };
  hourly: { hour: number; amount: number }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const logout = useStore((s) => s.logout);

  const load = async () => {
    try {
      const d = await api('/mobile/dashboard');
      if (d.ok) {
        setData(d);
      } else {
        // Sunucu yanıt verdi ama hata döndü → girişe at
        toast.error('Oturum veya sunucu hatası. Giriş ekranına yönlendiriliyorsunuz.');
        logout();
      }
    } catch {
      // Tünel kapalı / ağ hatası → api client zaten logout tetikler,
      // yine de garantiye alıyoruz
      toast.error('Sunucu / Tünel bağlantısı koptu! Giriş ekranına yönlendiriliyorsunuz.');
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingSkeleton />;

  // data yoksa (hata + logout sırasında) boş ekran basma
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin mb-3" />
        <div className="font-bold text-sm">Giriş ekranına yönlendiriliyorsunuz...</div>
      </div>
    );
  }

  const hourly = data?.hourly || [];
  const maxH = Math.max(...hourly.map((h) => h.amount), 1);

  const statCards = [
    { label: 'Günlük Ciro', value: money(data?.sales), icon: TrendingUp, color: 'from-emerald-500 to-green-400', bg: 'from-emerald-500/10 to-green-400/10' },
    { label: 'Açık Masa', value: String(data?.open_tables || 0), icon: ShoppingBag, color: 'from-orange-500 to-amber-400', bg: 'from-orange-500/10 to-amber-400/10' },
    { label: 'Bugünkü Sipariş', value: String(data?.orders || 0), icon: Users, color: 'from-blue-500 to-indigo-400', bg: 'from-blue-500/10 to-indigo-400/10' },
    { label: 'Aktif Kurye', value: String(data?.active_couriers || 0), icon: Truck, color: 'from-violet-500 to-purple-400', bg: 'from-violet-500/10 to-purple-400/10' },
  ];

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`bg-gradient-to-br ${s.bg} border border-white rounded-2xl p-4`}>
              <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${s.color} mb-3`}>
                <Icon size={18} className="text-white" />
              </div>
              <div className="text-2xl font-black text-slate-800">{s.value}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Hourly Chart */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-blue-500" />
          <h3 className="font-bold text-slate-800">Bugünkü Satış Trendi</h3>
        </div>
        <div className="flex items-end gap-1 h-28">
          {Array.from({ length: 24 }, (_, h) => {
            const amt = hourly.find((x) => x.hour === h)?.amount || 0;
            const pct = Math.max(2, (amt / maxH) * 100);
            const now = new Date().getHours();
            return (
              <div
                key={h}
                className="flex-1 rounded-t-sm transition-all"
                style={{
                  height: `${pct}%`,
                  background: h === now
                    ? 'linear-gradient(to top, #3b82f6, #60a5fa)'
                    : 'linear-gradient(to top, #e2e8f0, #f1f5f9)',
                }}
                title={`${h}:00 - ${money(amt)}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>
      </div>

      {/* Live Status */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h3 className="font-bold text-slate-800">Canlı Durum</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Açık Masa', value: data?.live?.open_tables, color: 'text-orange-600' },
            { label: 'Açık Adisyon', value: data?.live?.open_orders, color: 'text-blue-600' },
            { label: 'Hazırlanan Paket', value: data?.live?.package_orders, color: 'text-purple-600' },
            { label: 'Aktif Kurye', value: data?.live?.active_couriers, color: 'text-emerald-600' },
          ].map((item) => (
            <div key={item.label} className="bg-slate-50 rounded-xl p-3">
              <div className={`text-2xl font-black ${item.color}`}>{item.value ?? 0}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
        {data?.live?.last_order_time && (
          <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
            <Clock size={14} />
            <span>Son Sipariş: <strong className="text-slate-700">{data.live.last_order_time}</strong></span>
          </div>
        )}
      </div>

      {/* Top Product */}
      {data?.top_product && data.top_product !== '-' && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Star size={20} className="text-amber-500 fill-amber-500" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-600 uppercase tracking-wide">En Çok Satan</div>
            <div className="font-bold text-slate-800">{data.top_product}</div>
          </div>
        </div>
      )}

      {/* Performance Grid */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-3">İşletme Performansı</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Açık Masalar', value: data?.performance?.open_tables },
            { label: 'Hazırlanan Paket', value: data?.performance?.package_orders },
            { label: 'Aktif Kurye', value: data?.performance?.active_couriers },
            { label: 'Açık Adisyon', value: data?.performance?.open_orders },
            { label: 'Bugünkü Ciro', value: money(data?.performance?.sales) },
            { label: 'Bugünkü Sipariş', value: data?.performance?.orders },
          ].map((item) => (
            <div key={item.label} className="bg-slate-50 rounded-xl p-3 text-center">
              <div className="text-lg font-black text-blue-600">{item.value ?? 0}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5 leading-tight">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
        ))}
      </div>
      <div className="h-48 bg-slate-200 rounded-2xl" />
      <div className="h-48 bg-slate-200 rounded-2xl" />
    </div>
  );
}