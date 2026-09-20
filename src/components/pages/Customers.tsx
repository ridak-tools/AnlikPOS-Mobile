import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, ChevronRight } from 'lucide-react';
import { api, money } from '../../api/client';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';

interface Customer { id: number; name: string; phone: string; address: string; email: string; note: string; active: boolean; }
interface Address { id: number; title: string; address: string; description: string; is_default: boolean; }
interface Order { id: number; order_no: string; sale_type: string; status: string; created_at: string; grand_total: number; }

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<{ customer: Customer; addresses: Address[]; orders: Order[] } | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', email: '', note: '' });
  const timer = useRef<any>(null);

  const load = async (q: string) => {
    setLoading(true);
    try {
      const d = await api('/mobile/customers?q=' + encodeURIComponent(q));
      setCustomers(d.customers || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(''); }, []);

  const handleInput = (v: string) => {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(v), 300);
  };

  const openDetail = async (c: Customer) => {
    const [addrRes, ordRes] = await Promise.all([
      api('/mobile/customer-addresses?customer_id=' + c.id),
      api('/mobile/customer-orders?customer_id=' + c.id),
    ]);
    setDetail({ customer: c, addresses: addrRes.addresses || [], orders: ordRes.orders || [] });
    setForm({ name: c.name, phone: c.phone, address: c.address, email: c.email || '', note: c.note || '' });
    setEditMode(false);
  };

  const saveCustomer = async () => {
    if (!detail) return;
    const d = await api('/mobile/customers/update', {
      method: 'POST',
      body: { id: detail.customer.id, ...form },
    });
    if (d.ok) { toast.success('Güncellendi'); setDetail(null); load(query); }
    else toast.error(d.error || 'Hata');
  };

  const createCustomer = async () => {
    if (!form.name.trim() || !form.phone.trim()) { toast.error('Ad ve telefon zorunlu'); return; }
    const d = await api('/mobile/customers/create', { method: 'POST', body: form });
    if (d.ok) { toast.success('Müşteri eklendi'); setShowNewForm(false); setForm({ name: '', phone: '', address: '', email: '', note: '' }); load(query); }
    else toast.error(d.error || 'Hata');
  };

  const setDefaultAddr = async (addrId: number) => {
    if (!detail) return;
    await api('/mobile/customer-addresses/set-default', { method: 'POST', body: { id: addrId } });
    openDetail(detail.customer);
  };

  return (
    <div className="p-4 space-y-3 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" value={query} onChange={(e) => handleInput(e.target.value)} placeholder="Ad veya telefon ara..." className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <button onClick={() => { setForm({ name: '', phone: '', address: '', email: '', note: '' }); setShowNewForm(true); }} className="px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl text-sm flex items-center gap-1.5 whitespace-nowrap">
          <UserPlus size={16} /> Yeni
        </button>
      </div>

      {/* List */}
      {loading && customers.length === 0 ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-200 rounded-2xl animate-pulse" />)}</div>
      ) : customers.map((c) => (
        <button key={c.id} onClick={() => openDetail(c)} className="w-full bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3 text-left hover:border-blue-200 transition-colors">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
            {(c.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800 truncate">{c.name || '-'} {!c.active && <span className="text-xs text-slate-400 font-normal">(Pasif)</span>}</div>
            <div className="text-blue-600 font-semibold text-xs mt-0.5">📱 {c.phone || '-'}</div>
            {c.address && <div className="text-slate-500 text-xs mt-0.5 truncate">📍 {c.address}</div>}
          </div>
          <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
        </button>
      ))}

      {/* Detail Modal */}
      {detail && (
        <Modal
          title={editMode ? '✏️ Düzenle' : '👤 ' + detail.customer.name}
          onClose={() => setDetail(null)}
          onConfirm={editMode ? saveCustomer : undefined}
          confirmText="Kaydet"
        >
          {!editMode ? (
            <>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5">
                <div className="text-sm"><span className="text-slate-500">Ad:</span> <strong>{detail.customer.name}</strong></div>
                <div className="text-sm"><span className="text-slate-500">Telefon:</span> <strong className="text-blue-600">{detail.customer.phone}</strong></div>
                {detail.customer.address && <div className="text-sm"><span className="text-slate-500">Adres:</span> {detail.customer.address}</div>}
                {detail.customer.note && <div className="text-sm"><span className="text-slate-500">Not:</span> {detail.customer.note}</div>}
              </div>
              <button onClick={() => setEditMode(true)} className="w-full py-3 bg-blue-50 text-blue-600 font-bold rounded-2xl text-sm">✏️ Bilgileri Düzenle</button>

              {/* Addresses */}
              {detail.addresses.length > 0 && (
                <div>
                  <div className="font-bold text-slate-700 text-sm mb-2">🏠 Kayıtlı Adresler</div>
                  {detail.addresses.map((a) => (
                    <div key={a.id} className={`rounded-xl p-3 mb-2 border ${a.is_default ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        📍 {a.title}
                        {a.is_default && <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded-lg">Varsayılan</span>}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">{a.address}</div>
                      {!a.is_default && (
                        <button onClick={() => setDefaultAddr(a.id)} className="text-xs text-blue-600 font-bold mt-1.5">⭐ Varsayılan Yap</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Orders */}
              {detail.orders.length > 0 && (
                <div>
                  <div className="font-bold text-slate-700 text-sm mb-2">📜 Son Siparişler ({detail.orders.length})</div>
                  {detail.orders.slice(0, 5).map((o) => (
                    <div key={o.id} className="flex items-center justify-between py-2.5 border-b border-slate-100">
                      <div>
                        <div className="font-bold text-sm">#{o.order_no}</div>
                        <div className="text-xs text-slate-500">{o.created_at} · {o.sale_type}</div>
                      </div>
                      <div className={`font-black text-sm ${o.status === 'CLOSED' ? 'text-emerald-600' : o.status === 'CANCELLED' ? 'text-red-600' : 'text-orange-500'}`}>
                        {money(o.grand_total)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {(['name', 'phone', 'address', 'email', 'note'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    {field === 'name' ? 'Ad Soyad' : field === 'phone' ? 'Telefon' : field === 'address' ? 'Adres' : field === 'email' ? 'E-posta' : 'Not'}
                    {(field === 'name' || field === 'phone') && ' *'}
                  </label>
                  {field === 'address' || field === 'note' ? (
                    <textarea value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  ) : (
                    <input type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  )}
                </div>
              ))}
            </>
          )}
        </Modal>
      )}

      {/* New Customer Modal */}
      {showNewForm && (
        <Modal title="+ Yeni Müşteri" onClose={() => setShowNewForm(false)} onConfirm={createCustomer} confirmText="Ekle">
          {(['name', 'phone', 'address', 'email', 'note'] as const).map((field) => (
            <div key={field}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                {field === 'name' ? 'Ad Soyad *' : field === 'phone' ? 'Telefon *' : field === 'address' ? 'Adres' : field === 'email' ? 'E-posta' : 'Not'}
              </label>
              {field === 'address' || field === 'note' ? (
                <textarea value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
              ) : (
                <input type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              )}
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
