import { useState, useEffect, useCallback } from 'react';
import { Plus, ShoppingCart, CheckCircle, XCircle, Truck, CreditCard, Edit2, Printer, Package, UtensilsCrossed, Eye } from 'lucide-react';
import { api, money } from '../../api/client';
import { useStore, CartItem } from '../../store/useStore';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import CustomerPicker from '../ui/CustomerPicker';
import PaymentPicker from '../ui/PaymentPicker';
import PosOverlay from '../ui/PosOverlay';

type PosTabType = 'active' | 'tables' | 'self' | 'package' | 'done';

interface Order {
  id: number;
  order_no: string;
  sale_type: string;
  status: string;
  delivery_status: string;
  grand_total: number;
  items_count: number;
  created_at: string;
  created_time: string;
  waiting_minutes: number;
  customer_name: string;
  customer_phone: string;
  address: string;
  table_code: string;
  table_id?: number;
  customer_id?: number;
  salon_name: string;
  courier_name: string;
  source_name: string;
  payment_method: string;
  note: string;
  cancel_reason: string;
  items?: any[];
  products?: any[];
}

interface Table {
  id: number;
  code: string;
  salon_name: string;
  status: string;
  open_order?: { order_id: number; grand_total: number };
}

export default function POS() {
  const { posTab, setPosTab, openTable, openSelf, openPackage, ovOpen, setOvOpen } = useStore();
  
  // ✅ Sekme Durumu useStore İle Senkronize Edildi
  const activeTab = (posTab as PosTabType) || 'active';
  const setActiveTab = (tab: PosTabType) => setPosTab(tab);

  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<{ orderId: number } | null>(null);
  const [cancelModal, setCancelModal] = useState<{ orderId: number } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [courierModal, setCourierModal] = useState<{ orderId: number } | null>(null);
  const [couriers, setCouriers] = useState<{ id: number; name: string }[]>([]);

  // isBackground: true ise ekranı titreten loading skeleton ve hata toast'ları kapatılır
  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      if (activeTab === 'tables') {
        const d = await api('/mobile/tables');
        setTables(d.tables || []);
      } else {
        const urlMap: Record<string, string> = {
          active: '/mobile/orders/active',
          self: '/mobile/orders/self',
          package: '/mobile/orders/package',
          done: '/mobile/orders/completed',
        };
        const d = await api(urlMap[activeTab]);
        setOrders(d.orders || []);
      }
    } catch {
      if (!isBackground) {
        toast.error('Yüklenemedi');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [activeTab]);

  // Sekme değiştiğinde ilk yükleme ve 5 saniyede bir otomatik yenileme (Polling)
  useEffect(() => {
    loadData(false); // Sekme değiştiğinde normal yükle

    const interval = setInterval(() => {
      // Eğer sipariş girme ekranı (overlay) açık değilse sessizce verileri güncelle
      if (!ovOpen) {
        loadData(true);
      }
    }, 5000); // 5000 ms = 5 saniye

    return () => clearInterval(interval); // Sayfadan çıkıldığında interval'i temizle
  }, [loadData, ovOpen]);

  const doAction = async (orderId: number, action: string, extra: Record<string, any> = {}) => {
    try {
      const d = await api('/mobile/order/action', {
        method: 'POST',
        body: { order_id: orderId, action, ...extra },
      });
      if (!d.ok) {
        if (d.need_courier) {
          const cr = await api('/mobile/couriers');
          setCouriers(cr.couriers || []);
          setCourierModal({ orderId });
          return;
        }
        toast.error(d.error || 'Hata');
        return;
      }
      toast.success(d.message || 'Tamam');
      loadData(true);
    } catch (e: any) {
      toast.error(e.message || 'Hata');
    }
  };

  const handleViewOrEditOrder = async (o: Order) => {
    const isOrderOpen = o.status === 'OPEN';
    const toastId = toast.loading(isOrderOpen ? 'Adisyon yükleniyor...' : 'Sipariş detayları yükleniyor...');

    let rawItems: any[] = o.items || o.products || [];
    let orderId = o.id;

    if (rawItems.length === 0) {
      const endpoints = [
        `/mobile/table-order?table_id=${o.table_id}`,
        `/mobile/order-detail?id=${o.id}`,
        `/mobile/order-detail?order_id=${o.id}`,
        `/mobile/order/detail?order_id=${o.id}`,
        `/mobile/order/detail?id=${o.id}`,
        `/mobile/order?id=${o.id}`,
        `/mobile/order?order_id=${o.id}`,
        `/mobile/order-items?order_id=${o.id}`,
      ];

      for (const ep of endpoints) {
        if (ep.includes('undefined')) continue;
        try {
          const data = await api(ep);
          const orderObj = data?.order || data;
          const fetchedItems = orderObj?.items || orderObj?.products || data?.items || data?.products || data?.order_items;

          if (fetchedItems && Array.isArray(fetchedItems) && fetchedItems.length > 0) {
            rawItems = fetchedItems;
            if (orderObj?.id) orderId = orderObj.id;
            break;
          }
        } catch {
          // Sonraki adresi dene
        }
      }
    }

    const newCart: Record<string, CartItem> = {};
    rawItems.forEach((it: any, idx: number) => {
      const pid = it.product_id || it.id || (idx + 1);
      newCart[String(pid)] = {
        id: pid,
        name: it.name || it.product_name || it.title || 'Ürün',
        price: parseFloat(it.unit_price) || parseFloat(it.price) || 0,
        qty: parseInt(it.quantity) || parseInt(it.qty) || parseInt(it.count) || 1,
        note: it.note || it.product_note || '',
        is_gift: !!(it.is_gift || it.gift),
        discount_type: it.discount_type || '',
        discount_value: parseFloat(it.discount_value) || 0,
      };
    });

    toast.dismiss(toastId);

    useStore.setState({
      cart: newCart,
      currentOrderId: orderId,
      isReadOnly: !isOrderOpen,
      saleMode: o.sale_type === 'TABLE' ? 'table' : o.sale_type === 'PACKAGE' ? 'package' : 'self',
      table: o.table_id ? { id: o.table_id, code: o.table_code || '' } : null,
      pkgCust: o.customer_id ? { id: o.customer_id, name: o.customer_name || 'Müşteri', phone: o.customer_phone, address: o.address } : null,
      ovOpen: true,
    });
  };

  const tabs: { id: PosTabType; label: string; icon: any }[] = [
    { id: 'active', label: 'Aktif', icon: ShoppingCart },
    { id: 'tables', label: 'Masalar', icon: UtensilsCrossed },
    { id: 'self', label: 'Al-Götür', icon: Package },
    { id: 'package', label: 'Paket', icon: Truck },
    { id: 'done', label: 'Tamamlanan', icon: CheckCircle },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 px-3 py-2 flex gap-1.5 overflow-x-auto flex-shrink-0">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'self' && (
          <button
            onClick={() => {
              useStore.setState({ cart: {}, currentOrderId: null, isReadOnly: false });
              openSelf();
            }}
            className="w-full mb-3 py-3 bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Plus size={18} /> Yeni Al-Götür
          </button>
        )}
        {activeTab === 'package' && (
          <button
            onClick={() => {
              useStore.setState({ cart: {}, currentOrderId: null, isReadOnly: false });
              setShowCustomerPicker(true);
            }}
            className="w-full mb-3 py-3 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Plus size={18} /> Yeni Paket Sipariş
          </button>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-36 bg-slate-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : activeTab === 'tables' ? (
          <TablesGrid tables={tables} onSelect={(t) => {
            useStore.setState({ cart: {}, currentOrderId: null, isReadOnly: false });
            openTable(t);
          }} />
        ) : orders.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onPay={() => setShowPaymentModal({ orderId: o.id })}
                onCancel={() => { setCancelReason(''); setCancelModal({ orderId: o.id }); }}
                onDelivery={() => doAction(o.id, 'delivery')}
                onDelivered={() => doAction(o.id, 'delivered')}
                onPrint={() => doAction(o.id, 'print')}
                onEdit={() => handleViewOrEditOrder(o)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCustomerPicker && (
        <CustomerPicker
          onSelect={(c) => {
            setShowCustomerPicker(false);
            openPackage(c);
          }}
          onClose={() => setShowCustomerPicker(false)}
        />
      )}

      {showPaymentModal && (
        <PaymentPicker
          onSelect={async (method) => {
            setShowPaymentModal(null);
            await doAction(showPaymentModal.orderId, 'pay', { method });
          }}
          onClose={() => setShowPaymentModal(null)}
        />
      )}

      {cancelModal && (
        <Modal title="İptal Sebebi" onClose={() => setCancelModal(null)}
          onConfirm={async () => {
            await doAction(cancelModal.orderId, 'cancel', { reason: cancelReason || 'Mobil iptal' });
            setCancelModal(null);
          }}
        >
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="İptal sebebini girin..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </Modal>
      )}

      {courierModal && (
        <Modal title="Kurye Seç" onClose={() => setCourierModal(null)}>
          <div className="space-y-2">
            {couriers.map((c) => (
              <button
                key={c.id}
                onClick={async () => {
                  await doAction(courierModal.orderId, 'delivery', { courier_id: c.id });
                  setCourierModal(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <Truck size={16} className="text-blue-500" />
                <span className="font-semibold">{c.name}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* POS Overlay */}
      {ovOpen && <PosOverlay onClose={() => { useStore.setState({ currentOrderId: null, isReadOnly: false }); setOvOpen(false); loadData(false); }} />}
    </div>
  );
}

function OrderCard({ order: o, onPay, onCancel, onDelivery, onDelivered, onPrint, onEdit }: any) {
  const isOpen = o.status === 'OPEN';
  const isClosed = o.status === 'CLOSED';
  const isCancelled = o.status === 'CANCELLED';
  const ds = (o.delivery_status || '').toUpperCase();
  const onWay = ds === 'ON_THE_WAY' || ds === 'ON_WAY' || ds === 'DELIVERY';
  const delivered = ds === 'DELIVERED';

  const wait = parseInt(o.waiting_minutes || 0);
  const waitColor = wait >= 15 ? 'text-red-600' : wait >= 5 ? 'text-orange-500' : 'text-emerald-600';

  const sourceLabel = o.source_name || (o.sale_type === 'TABLE' ? 'Masa' : o.sale_type === 'SELF' ? 'Al-Götür' : 'Paket Servis');

  let statusBadge = { text: '🟢 Yeni', cls: 'bg-emerald-100 text-emerald-700' };
  if (isClosed) statusBadge = { text: '✅ Tamamlandı', cls: 'bg-emerald-100 text-emerald-700' };
  else if (isCancelled) statusBadge = { text: '❌ İptal', cls: 'bg-red-100 text-red-700' };
  else if (o.sale_type === 'PACKAGE') {
    if (onWay) statusBadge = { text: '🔵 Yolda', cls: 'bg-blue-100 text-blue-700' };
    else if (delivered) statusBadge = { text: '✅ Teslim', cls: 'bg-emerald-100 text-emerald-700' };
    else statusBadge = { text: '🟡 Hazırlanıyor', cls: 'bg-amber-100 text-amber-700' };
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-blue-200 transition-all">
      <div onClick={onEdit} className="cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="font-black text-slate-800 text-sm">#{o.order_no} · {sourceLabel}</div>
            {o.sale_type === 'TABLE' && o.table_code && (
              <div className="text-xs text-slate-500 mt-0.5">🪑 {o.table_code}{o.salon_name ? ` · ${o.salon_name}` : ''}</div>
            )}
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap ${statusBadge.cls}`}>{statusBadge.text}</span>
        </div>

        <div className="space-y-1 mb-3">
          {o.sale_type === 'PACKAGE' && o.customer_name && (
            <div className="text-sm text-slate-600">👤 <strong>{o.customer_name}</strong>{o.customer_phone && ` · ${o.customer_phone}`}</div>
          )}
          {o.address && <div className="text-xs text-slate-500 truncate">📍 {o.address}</div>}
          {o.courier_name && <div className="text-xs text-blue-600 font-bold">🛵 {o.courier_name}</div>}
          
          {o.payment_method && (o.sale_type === 'PACKAGE' || isClosed) && (
            <div className="text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg inline-flex items-center gap-1 mt-0.5">
              💳 Ödeme: <span className="text-emerald-900 font-black">{o.payment_method}</span>
            </div>
          )}

          {o.note && <div className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg mt-1">📝 {o.note}</div>}
          {isCancelled && o.cancel_reason && (
            <div className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg mt-1">❌ {o.cancel_reason}</div>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-black text-emerald-600">{money(o.grand_total)}</div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>🍔 {o.items_count} ürün</span>
            <span>🕒 {o.created_time || '-'}</span>
            {isOpen && <span className={`font-bold ${waitColor}`}>⏱ {wait}dk</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-50">
        {isOpen && o.sale_type !== 'PACKAGE' && (
          <button onClick={onPay} className="flex-1 min-w-0 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-transform">
            <CreditCard size={13} /> Ödeme
          </button>
        )}
        {isOpen && o.sale_type === 'PACKAGE' && !onWay && !delivered && (
          <button onClick={onDelivery} className="flex-1 min-w-0 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-transform">
            <Truck size={13} /> Yola Çıktı
          </button>
        )}
        {isOpen && o.sale_type === 'PACKAGE' && onWay && (
          <button onClick={onDelivered} className="flex-1 min-w-0 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-transform">
            <CheckCircle size={13} /> Teslim
          </button>
        )}
        {isOpen ? (
          <button onClick={onEdit} className="py-2 px-3 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl flex items-center gap-1 active:scale-95 transition-transform">
            <Edit2 size={13} /> Düzenle
          </button>
        ) : (
          <button onClick={onEdit} className="py-2 px-3 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl flex items-center gap-1 active:scale-95 transition-transform">
            <Eye size={13} /> İncele
          </button>
        )}
        {isOpen && (
          <button onClick={onCancel} className="py-2 px-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl flex items-center gap-1 active:scale-95 transition-transform">
            <XCircle size={13} />
          </button>
        )}
        <button onClick={onPrint} className="py-2 px-3 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl flex items-center gap-1 active:scale-95 transition-transform">
          <Printer size={13} />
        </button>
      </div>
    </div>
  );
}

function TablesGrid({ tables, onSelect }: { tables: Table[]; onSelect: (t: any) => void }) {
  const bySalon: Record<string, Table[]> = {};
  tables.forEach((t) => {
    const k = t.salon_name || 'Diğer';
    if (!bySalon[k]) bySalon[k] = [];
    bySalon[k].push(t);
  });

  return (
    <div className="space-y-4">
      {Object.entries(bySalon).map(([salon, ts]) => (
        <div key={salon}>
          <div className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">{salon}</div>
          <div className="grid grid-cols-3 gap-2">
            {ts.map((t) => {
              const isOpen = t.status === 'OPEN';
              return (
                <button
                  key={t.id}
                  onClick={() => onSelect({ id: t.id, code: t.code })}
                  className={`rounded-2xl p-3 text-center border-2 transition-all active:scale-95 ${
                    isOpen
                      ? 'border-red-300 bg-red-50'
                      : 'border-emerald-300 bg-emerald-50'
                  }`}
                >
                  <div className="font-black text-slate-800 text-sm">{t.code}</div>
                  <div className={`text-xs font-bold mt-1 ${isOpen ? 'text-red-600' : 'text-emerald-600'}`}>
                    {isOpen ? 'AÇIK' : 'BOŞ'}
                  </div>
                  {t.open_order && (
                    <div className="text-xs text-emerald-700 font-bold mt-1">{money(t.open_order.grand_total)}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <ShoppingCart size={48} className="mb-3 opacity-30" />
      <div className="font-bold">Kayıt bulunamadı</div>
      <div className="text-sm mt-1">
        {tab === 'done' ? 'Bu iş gününde tamamlanan sipariş yok' : 'Aktif sipariş yok'}
      </div>
    </div>
  );
}