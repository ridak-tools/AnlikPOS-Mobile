import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Printer, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { api, money } from '../../api/client';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';

// ==================== PRODUCTS ====================
export function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [query, setQuery] = useState(''); // ✅ ARAMA STATE'İ EKLENDİ
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ name: '', category_id: 0, price: 0 });

  const load = async () => {
    const [p, c] = await Promise.all([api('/mobile/products'), api('/mobile/categories')]);
    setProducts(p.products || []);
    setCategories(c.categories || []);
  };

  useEffect(() => { load(); }, []);

  const catName = (id: number) => categories.find((c) => c.id === id)?.name || 'Kategorisiz';

  // ✅ ARAMA FİLTRESİ EKLENDİ (Ürün Adı ve Kategoriye Göre)
  const q = query.trim().toLowerCase();
  const filtered = !q
    ? products
    : products.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const cat = catName(p.category_id).toLowerCase();
        return name.includes(q) || cat.includes(q);
      });

  const openNew = () => {
    setForm({ name: '', category_id: categories[0]?.id || 0, price: 0 });
    setModal('new');
  };
  const openEdit = (p: any) => {
    setForm({ name: p.name, category_id: p.category_id, price: p.price });
    setModal(p);
  };

  const save = async () => {
    if (modal === 'new') {
      const d = await api('/mobile/products/create', { method: 'POST', body: form });
      if (d.ok) { toast.success('Eklendi'); setModal(null); load(); } else toast.error(d.error || 'Hata');
    } else {
      const d = await api('/mobile/products/update', { method: 'POST', body: { id: modal.id, ...form } });
      if (d.ok) { toast.success('Güncellendi'); setModal(null); load(); } else toast.error(d.error || 'Hata');
    }
  };

  const del = async () => {
    if (!modal || modal === 'new') return;
    if (!confirm('Silinsin/pasife alınsın mı?')) return;
    const d = await api('/mobile/products/delete', { method: 'POST', body: { id: modal.id } });
    if (d.ok) { toast.success('İşlem yapıldı'); setModal(null); load(); } else toast.error(d.error || 'Hata');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-3">
      
      {/* ✅ ARAMA VE YENİ ÜRÜN BUTONU */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ürün veya kategori ara..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={openNew}
          className="px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl text-sm flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-transform"
        >
          <Plus size={16} /> Yeni
        </button>
      </div>

      {/* ✅ SONUÇ SAYISI */}
      <div className="text-xs font-bold text-slate-400 px-1">
        {q ? `${filtered.length} sonuç · "${query}"` : `${products.length} ürün`}
      </div>

      {/* ✅ LİSTE VEYA BOŞ DURUM EKRANI */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <div className="font-bold">Ürün bulunamadı</div>
          {q && <div className="text-sm mt-1">"{query}" için sonuç yok</div>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="min-w-0 flex-1 pr-2">
                <div className="font-bold text-slate-800 truncate">{p.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{catName(p.category_id)}</div>
                <div className="text-emerald-600 font-black text-sm mt-1">{money(p.price)}</div>
              </div>
              <button
                onClick={() => openEdit(p)}
                className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 flex-shrink-0 active:scale-95 transition-transform"
              >
                <Edit2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'new' ? '+ Yeni Ürün' : '✏️ Ürün Düzenle'} onClose={() => setModal(null)} onConfirm={save} confirmText="Kaydet">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Ürün Adı *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Kategori</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: parseInt(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Fiyat (₺)</label>
            <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          {modal !== 'new' && (
            <button onClick={del} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-2xl text-sm">🗑️ Sil / Pasife Al</button>
          )}
        </Modal>
      )}
    </div>
  );
}

// ==================== CATEGORIES ====================
export function Categories() {
  const [cats, setCats] = useState<any[]>([]);
  const [modal, setModal] = useState<any>(null);
  const [name, setName] = useState('');

  const load = async () => { const d = await api('/mobile/categories'); setCats(d.categories || []); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (modal === 'new') {
      const d = await api('/mobile/categories/create', { method: 'POST', body: { name } });
      if (d.ok) { toast.success('Eklendi'); setModal(null); load(); } else toast.error(d.error || 'Hata');
    } else {
      const d = await api('/mobile/categories/update', { method: 'POST', body: { id: modal.id, name } });
      if (d.ok) { toast.success('Güncellendi'); setModal(null); load(); } else toast.error(d.error || 'Hata');
    }
  };

  const del = async () => {
    if (!modal || modal === 'new') return;
    if (!confirm('Silinsin mi?')) return;
    const d = await api('/mobile/categories/delete', { method: 'POST', body: { id: modal.id } });
    if (d.ok) { setModal(null); load(); } else toast.error(d.error || 'Hata');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex justify-end mb-3">
        <button onClick={() => { setName(''); setModal('new'); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-2xl text-sm">
          <Plus size={16} /> Yeni Kategori
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {cats.map((c) => (
          <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="font-bold text-slate-800">🏷️ {c.name}</div>
            <button onClick={() => { setName(c.name); setModal(c); }} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
              <Edit2 size={15} />
            </button>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title={modal === 'new' ? '+ Yeni Kategori' : '✏️ Düzenle'} onClose={() => setModal(null)} onConfirm={save} confirmText="Kaydet">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Kategori Adı *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          {modal !== 'new' && (
            <button onClick={del} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-2xl text-sm">🗑️ Sil</button>
          )}
        </Modal>
      )}
    </div>
  );
}

// ==================== USERS ====================
export function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ full_name: '', username: '', password: '', password_repeat: '', role: 'PERSONEL', active: true });
  const timer = useRef<any>(null);

  const load = async (q: string) => {
    const d = await api('/mobile/users?q=' + encodeURIComponent(q));
    setUsers(d.users || []);
  };
  useEffect(() => { load(''); }, []);

  const handleInput = (v: string) => {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(v), 300);
  };

  const save = async () => {
    if (modal === 'new') {
      if (!form.password.trim()) { toast.error('Şifre zorunlu'); return; }
      const d = await api('/mobile/users/create', { method: 'POST', body: form });
      if (d.ok) { toast.success('Eklendi'); setModal(null); load(query); } else toast.error(d.error || 'Hata');
    } else {
      const d = await api('/mobile/users/update', { method: 'POST', body: { id: modal.id, ...form } });
      if (d.ok) { toast.success('Güncellendi'); setModal(null); load(query); } else toast.error(d.error || 'Hata');
    }
  };

  const toggle = async (id: number) => {
    await api('/mobile/users/toggle', { method: 'POST', body: { id } });
    load(query);
  };

  const del = async () => {
    if (!modal || modal === 'new') return;
    if (!confirm('"' + modal.full_name + '" silinsin mi?')) return;
    const d = await api('/mobile/users/delete', { method: 'POST', body: { id: modal.id } });
    if (d.ok) { setModal(null); load(query); } else toast.error(d.error || 'Hata');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" value={query} onChange={(e) => handleInput(e.target.value)} placeholder="Ad veya kullanıcı adı..." className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <button onClick={() => { setForm({ full_name: '', username: '', password: '', password_repeat: '', role: 'PERSONEL', active: true }); setModal('new'); }} className="px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl text-sm flex items-center gap-1.5">
          <Plus size={16} /> Yeni
        </button>
      </div>
      {users.map((u) => (
        <div key={u.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold text-slate-800">{u.full_name || '-'}</div>
              <div className="text-xs text-slate-500 mt-0.5">@{u.username} · Son: {u.last_login || '-'}</div>
              <div className="flex gap-1.5 mt-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${u.role === 'ADMIN' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                  {u.role === 'ADMIN' ? '👑 Yönetici' : '👤 Personel'}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {u.active ? '🟢 Aktif' : '🔴 Pasif'}
                </span>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => toggle(u.id)} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                {u.active ? <ToggleRight size={15} className="text-emerald-500" /> : <ToggleLeft size={15} />}
              </button>
              <button onClick={() => { setForm({ full_name: u.full_name, username: u.username, password: '', password_repeat: '', role: u.role, active: u.active }); setModal(u); }} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                <Edit2 size={15} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {modal && (
        <Modal title={modal === 'new' ? '+ Yeni Kullanıcı' : '✏️ Düzenle'} onClose={() => setModal(null)} onConfirm={save} confirmText="Kaydet">
          {['full_name', 'username', 'password', 'password_repeat'].map((field) => (
            <div key={field}>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">{field === 'full_name' ? 'Ad Soyad *' : field === 'username' ? 'Kullanıcı Adı *' : field === 'password' ? 'Şifre' + (modal !== 'new' ? ' (boş=değişmez)' : ' *') : 'Şifre Tekrar'}</label>
              <input type={field.includes('password') ? 'password' : 'text'} value={(form as any)[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Rol</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              <option value="PERSONEL">👤 Personel</option>
              <option value="ADMIN">👑 Yönetici</option>
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-11 h-6 rounded-full transition-colors relative ${form.active ? 'bg-emerald-500' : 'bg-slate-200'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="font-bold text-sm">Aktif</span>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="hidden" />
          </label>
          {modal !== 'new' && (
            <button onClick={del} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-2xl text-sm">🗑️ Sil</button>
          )}
        </Modal>
      )}
    </div>
  );
}

// ==================== PRINTERS ====================
export function Printers() {
  const [printers, setPrinters] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [winPrinters, setWinPrinters] = useState<string[]>([]);
  const [form, setForm] = useState({ name: '', printer_name: '', is_default: false, is_active: true });
  const timer = useRef<any>(null);

  const load = async (q: string) => {
    const d = await api('/mobile/printers?q=' + encodeURIComponent(q));
    setPrinters(d.printers || []);
  };
  useEffect(() => { load(''); }, []);

  const openForm = async (p: any) => {
    const wd = await api('/mobile/printers/windows');
    setWinPrinters(wd.printers || []);
    if (p === 'new') {
      setForm({ name: '', printer_name: '', is_default: false, is_active: true });
    } else {
      setForm({ name: p.name, printer_name: p.printer_name, is_default: p.is_default, is_active: p.is_active });
    }
    setModal(p);
  };

  const save = async () => {
    const body = form;
    if (modal === 'new') {
      const d = await api('/mobile/printers/create', { method: 'POST', body });
      if (d.ok) { toast.success('Eklendi'); setModal(null); load(query); } else toast.error(d.error || 'Hata');
    } else {
      const d = await api('/mobile/printers/update', { method: 'POST', body: { id: modal.id, ...body } });
      if (d.ok) { toast.success('Güncellendi'); setModal(null); load(query); } else toast.error(d.error || 'Hata');
    }
  };

  const setDefault = async (id: number) => {
    await api('/mobile/printers/set-default', { method: 'POST', body: { id } });
    load(query);
  };

  const testPrint = async (id: number, pname: string) => {
    const d = await api('/mobile/printers/test', { method: 'POST', body: { id, printer_name: pname } });
    toast[d.ok ? 'success' : 'error'](d.message || d.error || 'Hata');
  };

  const del = async () => {
    if (!modal || modal === 'new') return;
    if (!confirm('"' + modal.name + '" silinsin mi?')) return;
    const d = await api('/mobile/printers/delete', { method: 'POST', body: { id: modal.id } });
    if (d.ok) { setModal(null); load(query); } else toast.error(d.error || 'Hata');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => load(e.target.value), 300); }} placeholder="Yazıcı ara..." className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <button onClick={() => openForm('new')} className="px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl text-sm flex items-center gap-1.5">
          <Plus size={16} /> Yeni
        </button>
      </div>
      {printers.map((p) => (
        <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold text-slate-800">🖨️ {p.name} {p.is_default && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-lg ml-1">Varsayılan</span>}</div>
              <div className="text-xs text-slate-500 mt-0.5 break-all">{p.printer_name}</div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg mt-1.5 inline-block ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {p.is_active ? '🟢 Aktif' : '🔴 Pasif'}
              </span>
            </div>
            <div className="flex gap-1.5">
              {!p.is_default && (
                <button onClick={() => setDefault(p.id)} className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600" title="Varsayılan Yap">⭐</button>
              )}
              <button onClick={() => testPrint(p.id, p.printer_name)} className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <Printer size={15} />
              </button>
              <button onClick={() => openForm(p)} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                <Edit2 size={15} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {modal && (
        <Modal title={modal === 'new' ? '+ Yeni Yazıcı' : '✏️ Düzenle'} onClose={() => setModal(null)} onConfirm={save} confirmText="Kaydet">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Görünen Ad *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Adisyon Yazıcısı" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Windows Yazıcı *</label>
            {winPrinters.length > 0 ? (
              <select value={form.printer_name} onChange={(e) => setForm({ ...form, printer_name: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                <option value="">— Seçin —</option>
                {winPrinters.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <input value={form.printer_name} onChange={(e) => setForm({ ...form, printer_name: e.target.value })} placeholder="Yazıcı adı" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            )}
          </div>
          {[{ k: 'is_default', l: 'Varsayılan Yap' }, { k: 'is_active', l: 'Aktif' }].map((item) => (
            <label key={item.k} className="flex items-center gap-3 cursor-pointer">
              <div className={`w-11 h-6 rounded-full transition-colors relative ${(form as any)[item.k] ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(form as any)[item.k] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="font-bold text-sm">{item.l}</span>
              <input type="checkbox" checked={!!(form as any)[item.k]} onChange={(e) => setForm({ ...form, [item.k]: e.target.checked })} className="hidden" />
            </label>
          ))}
          {modal !== 'new' && (
            <button onClick={del} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-2xl text-sm">🗑️ Sil</button>
          )}
        </Modal>
      )}
    </div>
  );
}

// ==================== TABLES DEF ====================
export function TablesDef() {
  const [salons, setSalons] = useState<any[]>([]);
  const [salonModal, setSalonModal] = useState<any>(null);
  const [tableModal, setTableModal] = useState<any>(null);
  const [salonName, setSalonName] = useState('');
  const [tableForm, setTableForm] = useState({ salon_id: 0, code: '' });

  const load = async () => {
    const d = await api('/mobile/salons');
    setSalons(d.salons || []);
  };
  useEffect(() => { load(); }, []);

  const saveSalon = async () => {
    if (salonModal === 'new') {
      const d = await api('/mobile/salons/create', { method: 'POST', body: { name: salonName } });
      if (d.ok) { setSalonModal(null); load(); } else toast.error(d.error || 'Hata');
    } else {
      const d = await api('/mobile/salons/update', { method: 'POST', body: { id: salonModal.id, name: salonName } });
      if (d.ok) { setSalonModal(null); load(); } else toast.error(d.error || 'Hata');
    }
  };

  const delSalon = async () => {
    if (!salonModal || salonModal === 'new') return;
    if (!confirm('Salon silinsin mi?')) return;
    const d = await api('/mobile/salons/delete', { method: 'POST', body: { id: salonModal.id } });
    if (d.ok) { setSalonModal(null); load(); } else toast.error(d.error || 'Hata');
  };

  const saveTable = async () => {
    if (tableModal === 'new') {
      const d = await api('/mobile/tables/create', { method: 'POST', body: tableForm });
      if (d.ok) { setTableModal(null); load(); } else toast.error(d.error || 'Hata');
    } else {
      const d = await api('/mobile/tables/update', { method: 'POST', body: { id: tableModal.id, ...tableForm } });
      if (d.ok) { setTableModal(null); load(); } else toast.error(d.error || 'Hata');
    }
  };

  const delTable = async () => {
    if (!tableModal || tableModal === 'new') return;
    if (!confirm('Masa silinsin mi?')) return;
    const d = await api('/mobile/tables/delete', { method: 'POST', body: { id: tableModal.id } });
    if (d.ok) { setTableModal(null); load(); } else toast.error(d.error || 'Hata');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex justify-end gap-2">
        <button onClick={() => { setSalonName(''); setSalonModal('new'); }} className="px-3 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm flex items-center gap-1.5">
          <Plus size={14} /> Salon
        </button>
        <button onClick={() => {
          const firstSalon = salons.find((s) => s.id > 0);
          if (!firstSalon) { toast.error('Önce salon ekleyin'); return; }
          setTableForm({ salon_id: firstSalon.id, code: '' });
          setTableModal('new');
        }} className="px-3 py-2.5 bg-blue-600 text-white font-bold rounded-2xl text-sm flex items-center gap-1.5">
          <Plus size={14} /> Masa
        </button>
      </div>

      {salons.map((salon) => (
        <div key={salon.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="font-black text-slate-800">🏛️ {salon.name} <span className="text-slate-500 font-normal text-sm">({salon.table_count} masa)</span></div>
            {salon.id > 0 && (
              <button onClick={() => { setSalonName(salon.name); setSalonModal(salon); }} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                <Edit2 size={13} />
              </button>
            )}
          </div>
          {salon.tables?.length === 0 ? (
            <div className="text-xs text-slate-400">Bu salonda masa yok</div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {salon.tables?.map((t: any) => (
                <button key={t.id} onClick={() => { setTableForm({ salon_id: t.salon_id || salon.id, code: t.code }); setTableModal(t); }} className={`rounded-xl p-2.5 text-center border-2 ${t.status === 'OPEN' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <div className="font-black text-slate-800 text-xs">{t.code}</div>
                  <div className={`text-xs font-bold mt-0.5 ${t.status === 'OPEN' ? 'text-red-500' : 'text-emerald-500'}`}>{t.status === 'OPEN' ? 'AÇK' : 'BOŞ'}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {salonModal && (
        <Modal title={salonModal === 'new' ? '+ Yeni Salon' : '✏️ Salon Düzenle'} onClose={() => setSalonModal(null)} onConfirm={saveSalon} confirmText="Kaydet">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Salon Adı *</label>
            <input value={salonName} onChange={(e) => setSalonName(e.target.value)} placeholder="İç Salon, Bahçe..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          {salonModal !== 'new' && (
            <button onClick={delSalon} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-2xl text-sm">🗑️ Salonu Sil</button>
          )}
        </Modal>
      )}

      {tableModal && (
        <Modal title={tableModal === 'new' ? '+ Yeni Masa' : '✏️ Masa Düzenle'} onClose={() => setTableModal(null)} onConfirm={saveTable} confirmText="Kaydet">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Salon *</label>
            <select value={tableForm.salon_id} onChange={(e) => setTableForm({ ...tableForm, salon_id: parseInt(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              {salons.filter((s) => s.id > 0).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Masa Kodu *</label>
            <input value={tableForm.code} onChange={(e) => setTableForm({ ...tableForm, code: e.target.value })} placeholder="M1, A-12..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          {tableModal !== 'new' && (
            <button onClick={delTable} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-2xl text-sm">🗑️ Masayı Sil</button>
          )}
        </Modal>
      )}
    </div>
  );
}

// ==================== MENUS ====================
export function Menus() {
  const [menus, setMenus] = useState<any[]>([]);

  const load = async () => {
    const d = await api('/mobile/menus');
    setMenus(d.menus || []);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-3">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-sm text-blue-700">
        💡 Menüler masaüstü uygulamasından yönetilir. Buradan mevcut menüleri görüntüleyebilirsiniz.
      </div>
      {menus.length === 0 ? (
        <div className="text-center text-slate-400 py-16">
          <div className="text-4xl mb-3">🍽️</div>
          <div className="font-bold">Menü bulunamadı</div>
        </div>
      ) : menus.map((m) => (
        <div key={m.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="font-black text-slate-800">🍽️ {m.name}</div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${m.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {m.active ? 'Aktif' : 'Pasif'}
            </span>
          </div>
          <div className="text-xs text-slate-500">{m.category_name || 'Kategorisiz'}</div>
          <div className="text-emerald-600 font-black mt-1">{money(m.discounted_price > 0 ? m.discounted_price : m.price)}</div>
          {m.components?.length > 0 && (
            <div className="mt-2 bg-slate-50 rounded-xl p-2">
              {m.components.map((c: any, i: number) => (
                <div key={i} className="text-xs text-slate-600">📦 {c.name} x{c.quantity}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}