import { useState, useEffect, useRef } from 'react';
import { Phone, Search, UserPlus, ShoppingCart } from 'lucide-react';
import { api } from '../../api/client';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import PosOverlay from '../ui/PosOverlay';

interface CallLog {
  id: number;
  phone: string;
  customer_name: string;
  address: string;
  customer_id: number | null;
  is_registered: boolean;
  call_date: string;
  call_time: string;
}

export default function Calls() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [newCustModal, setNewCustModal] = useState<{ phone: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const timer = useRef<any>(null);
  const { openPackage, ovOpen, setOvOpen } = useStore();

  const load = async (q: string) => {
    setLoading(true);
    try {
      const d = await api('/mobile/call-logs?q=' + encodeURIComponent(q));
      setLogs(d.logs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(''); }, []);

  // Auto refresh every 5 seconds
  useEffect(() => {
    const t = setInterval(() => load(query), 5000);
    return () => clearInterval(t);
  }, [query]);

  const handleInput = (v: string) => {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(v), 300);
  };

  const createAndOrder = async () => {
    if (!newName.trim() || !newPhone.trim()) { toast.error('Ad ve telefon zorunlu'); return; }
    const d = await api('/mobile/customers/create', {
      method: 'POST',
      body: { name: newName, phone: newPhone, address: newAddr },
    });
    if (d.ok) {
      setNewCustModal(null);
      openPackage({ id: d.customer.id, name: newName, phone: newPhone, address: newAddr });
    } else {
      toast.error(d.error || 'Hata');
    }
  };

  return (
    <div className="p-4 space-y-3 max-w-2xl mx-auto">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="İsim, telefon veya adres ara..."
          className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
          Canlı · {logs.length} çağrı
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-slate-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Phone size={48} className="mx-auto mb-3 opacity-30" />
          <div className="font-bold">Çağrı kaydı bulunamadı</div>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-bold text-slate-600 text-xs flex items-center gap-1">
                  <Phone size={12} />
                  {log.call_time} · {log.call_date}
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${log.is_registered ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                  {log.is_registered ? '🟢 Kayıtlı' : '🟠 Kayıtsız'}
                </span>
              </div>

              <div className="font-black text-slate-800 text-base">
                {log.is_registered ? log.customer_name : 'Kayıtlı Müşteri Yok'}
              </div>
              <div className="text-blue-600 font-bold text-sm mt-0.5">☎ {log.phone}</div>
              {log.address && log.address !== '-' && (
                <div className="text-slate-500 text-xs mt-1">📍 {log.address}</div>
              )}

              <div className="flex gap-2 mt-3 flex-wrap">
                {log.is_registered && log.customer_id ? (
                  <button
                    onClick={() => openPackage({ id: log.customer_id!, name: log.customer_name })}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                  >
                    <ShoppingCart size={13} /> Sipariş Aç
                  </button>
                ) : (
                  <button
                    onClick={() => { setNewPhone(log.phone); setNewName(''); setNewAddr(''); setNewCustModal({ phone: log.phone }); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
                  >
                    <UserPlus size={13} /> Yeni Müşteri
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Customer Modal */}
      {newCustModal && (
        <Modal
          title="+ Yeni Müşteri (Arama)"
          onClose={() => setNewCustModal(null)}
          onConfirm={createAndOrder}
          confirmText="Oluştur ve Sipariş Aç"
        >
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Ad Soyad *</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Telefon *</label>
            <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Adres</label>
            <textarea value={newAddr} onChange={(e) => setNewAddr(e.target.value)} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
          </div>
        </Modal>
      )}

      {ovOpen && <PosOverlay onClose={() => setOvOpen(false)} />}
    </div>
  );
}
