import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Package, CreditCard, Clock, Users, Truck } from 'lucide-react';
import { api, money } from '../../api/client';
import toast from 'react-hot-toast';

type ReportTab = 'summary' | 'categories' | 'products' | 'payments' | 'hourly' | 'staff' | 'couriers';

export default function Reports() {
  const [tab, setTab] = useState<ReportTab>('summary');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setData(null);
    try {
      const urlMap: Record<ReportTab, string> = {
        summary: '/mobile/reports/summary',
        categories: '/mobile/reports/categories',
        products: '/mobile/reports/products',
        payments: '/mobile/reports/payments',
        hourly: '/mobile/reports/hourly',
        staff: '/mobile/reports/staff',
        couriers: '/mobile/reports/couriers',
      };
      const d = await api(urlMap[tab] + '?date=' + date);
      setData(d);
    } catch { toast.error('Yüklenemedi'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab, date]);

  const tabs: { id: ReportTab; label: string; icon: any }[] = [
    { id: 'summary', label: 'Gün Sonu', icon: BarChart3 },
    { id: 'categories', label: 'Kategori', icon: Package },
    { id: 'products', label: 'Ürün', icon: TrendingUp },
    { id: 'payments', label: 'Ödeme', icon: CreditCard },
    { id: 'hourly', label: 'Saatlik', icon: Clock },
    { id: 'staff', label: 'Personel', icon: Users },
    { id: 'couriers', label: 'Kurye', icon: Truck },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Date Picker */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={() => setDate(new Date().toISOString().slice(0, 10))}
          className="px-3 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm"
        >
          Bugün
        </button>
        <button
          onClick={load}
          className="px-3 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm"
        >
          Yenile
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 px-3 py-2 flex gap-1.5 overflow-x-auto flex-shrink-0">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : data && <ReportContent tab={tab} data={data} />}
      </div>
    </div>
  );
}

function ReportContent({ tab, data }: { tab: ReportTab; data: any }) {
  if (tab === 'summary') {
    const s = data.summary || {};
    return (
      <div className="space-y-4">
        <div className="text-xs text-slate-500 font-medium">{data.start} → {data.end}</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { l: 'Net Satış', v: money(s.net_sales), cls: 'from-emerald-500/10 to-green-400/10 text-emerald-700' },
            { l: 'Sipariş', v: s.orders, cls: 'from-blue-500/10 to-indigo-400/10 text-blue-700' },
            { l: 'Ort. Adisyon', v: money(s.average_ticket), cls: 'from-orange-500/10 to-amber-400/10 text-orange-700' },
            { l: 'Tahsilat', v: money(s.payments), cls: 'from-violet-500/10 to-purple-400/10 text-violet-700' },
          ].map((item) => (
            <div key={item.l} className={`bg-gradient-to-br ${item.cls.split(' ').slice(0,2).join(' ')} border border-white rounded-2xl p-4`}>
              <div className={`text-2xl font-black ${item.cls.split(' ')[2]}`}>{item.v}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">{item.l}</div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-50 shadow-sm">
          {[
            { l: '🪑 Masa', v: s.table },
            { l: '🛍️ Gel-Al', v: s.self },
            { l: '📦 Paket', v: s.package },
            { l: '❌ İptal', v: s.cancelled, red: true },
            { l: '🎁 İkram', v: s.gift },
            { l: '💸 Gider', v: money(s.expense), red: true },
          ].map((item) => (
            <div key={item.l} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">{item.l}</span>
              <span className={`font-black text-sm ${item.red ? 'text-red-600' : 'text-slate-800'}`}>{item.v ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === 'hourly') {
    const rows: any[] = data.rows || [];
    const max = Math.max(...rows.map((r: any) => r.amount), 1);
    return (
      <div className="space-y-3">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="font-bold text-slate-800 mb-3">Saatlik Ciro</div>
          <div className="flex items-end gap-0.5 h-32">
            {Array.from({ length: 24 }, (_, h) => {
              const amt = rows.find((r: any) => r.hour === h)?.amount || 0;
              return (
                <div key={h} className="flex-1 rounded-t-sm bg-blue-400" style={{ height: `${Math.max(2, (amt / max) * 100)}%` }} title={`${h}:00`} />
              );
            })}
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-50 shadow-sm">
          {rows.filter((r: any) => r.amount > 0).map((r: any) => (
            <div key={r.hour} className="flex justify-between px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">{String(r.hour).padStart(2, '0')}:00</span>
              <span className="font-black text-emerald-600 text-sm">{money(r.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const rows: any[] = data.rows || [];
  if (!rows.length) return <div className="text-center text-slate-400 py-16">Kayıt bulunamadı</div>;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-50 shadow-sm">
      {rows.slice(0, 50).map((r: any, i: number) => (
        <div key={i} className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800 text-sm truncate">
              {r.category || r.name || r.icon + ' ' + r.name || '-'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {tab === 'categories' && `${r.quantity} adet · ikram ${r.gift}`}
              {tab === 'products' && `${r.category} · ${r.quantity} adet`}
              {tab === 'payments' && `${r.count} işlem`}
              {tab === 'staff' && `M:${r.table_orders} G:${r.self_orders} P:${r.package_orders} · ${r.total_orders} sip`}
              {tab === 'couriers' && `${r.orders} teslimat`}
            </div>
          </div>
          <div className="font-black text-emerald-600 text-sm whitespace-nowrap">
            {money(r.total ?? r.amount ?? 0)}
          </div>
        </div>
      ))}
      {rows.length > 50 && (
        <div className="px-4 py-3 text-center text-xs text-slate-400">İlk 50 kayıt gösteriliyor</div>
      )}
    </div>
  );
}
