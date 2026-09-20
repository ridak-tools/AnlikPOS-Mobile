import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, X, ChevronRight } from 'lucide-react';
import { api } from '../../api/client';
import toast from 'react-hot-toast';

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
}

interface CustomerPickerProps {
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}

export default function CustomerPicker({ onSelect, onClose }: CustomerPickerProps) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const timer = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = async (q: string) => {
    setLoading(true);
    try {
      const d = await api('/mobile/customers?q=' + encodeURIComponent(q));
      setCustomers(d.customers || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleInput = (v: string) => {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(v), 300);
  };

  const createCustomer = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast.error('Ad ve telefon zorunlu');
      return;
    }
    try {
      const d = await api('/mobile/customers/create', {
        method: 'POST',
        body: { name: newName, phone: newPhone, address: newAddr },
      });
      if (d.ok) {
        onSelect({ id: d.customer.id, name: newName, phone: newPhone, address: newAddr });
      } else {
        toast.error(d.error || 'Hata');
      }
    } catch (e: any) {
      toast.error(e.message || 'Hata');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-black text-slate-800">🛵 Paket · Müşteri Seç</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {!showNewForm ? (
          <>
            {/* Search */}
            <div className="px-4 py-3 flex-shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => handleInput(e.target.value)}
                  placeholder="Ad veya telefon ara..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* New Customer Button */}
            <div className="px-4 pb-2 flex-shrink-0">
              <button
                onClick={() => setShowNewForm(true)}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <UserPlus size={16} /> Yeni Müşteri Ekle
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 pb-safe-lg">
              {loading ? (
                <div className="space-y-2 py-2">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <div className="text-4xl mb-2">👤</div>
                  <div className="font-bold">Müşteri bulunamadı</div>
                  {query && <div className="text-sm mt-1">"{query}" için sonuç yok</div>}
                </div>
              ) : (
                <div className="space-y-2">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onSelect(c)}
                      className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-blue-50 rounded-2xl transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                        {(c.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">{c.name}</div>
                        <div className="text-xs text-blue-600 font-semibold mt-0.5">📞 {c.phone || 'Telefon yok'}</div>
                        {c.address && <div className="text-xs text-slate-500 truncate mt-0.5">📍 {c.address}</div>}
                      </div>
                      <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* New Customer Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-sm text-emerald-700">
                Müşteri oluşturulduktan sonra paket siparişe geçilecek.
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Ad Soyad *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Müşteri adı"
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Telefon *</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="05xxxxxxxxx"
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Adres</label>
                <textarea
                  value={newAddr}
                  onChange={(e) => setNewAddr(e.target.value)}
                  placeholder="Mahalle, sokak, bina..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
            </div>
            {/* Footer - ✅ Alt Navigasyon Tuşları Koruması (pb-safe-lg) */}
            <div className="px-5 pt-4 pb-safe-lg border-t border-slate-100 flex gap-3 flex-shrink-0 bg-white">
              <button onClick={() => setShowNewForm(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl text-sm">
                Geri
              </button>
              <button onClick={createCustomer} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-2xl text-sm">
                Oluştur
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}