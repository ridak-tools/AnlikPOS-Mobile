import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Trash2, Tag, ChevronLeft, Plus, Lock } from 'lucide-react';
import { api, money } from '../../api/client';
import { useStore, CartItem } from '../../store/useStore';
import toast from 'react-hot-toast';
import PaymentPicker from './PaymentPicker';

interface Category { id: number; name: string; }
interface Product { id: number; name: string; price: number; category_id: number; }

interface PosOverlayProps {
  onClose: () => void;
}

export default function PosOverlay({ onClose }: PosOverlayProps) {
  const { saleMode, table, pkgCust, cart, addToCart, updateCartItem, removeFromCart, clearCart, currentOrderId, isReadOnly } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  
  // Tamamlanan siparişlerde veya var olan siparişte doğrudan Adisyon görünümü açılır
  const [showCart, setShowCart] = useState<boolean>(true);
  
  const [editItem, setEditItem] = useState<{ id: string; item: CartItem } | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const loadCats = useCallback(async () => {
    const d = await api('/mobile/categories');
    const cats = d.categories || [];
    setCategories(cats);
    if (cats.length > 0) {
      setActiveCat(cats[0].id);
    }
  }, []);

  const loadProds = useCallback(async (catId: number) => {
    const d = await api('/mobile/products?category_id=' + catId);
    setProducts(d.products || []);
  }, []);

  useEffect(() => {
    loadCats();
  }, [loadCats]);

  useEffect(() => {
    if (activeCat) loadProds(activeCat);
  }, [activeCat, loadProds]);

  const calcTotal = () => {
    return Object.values(cart).reduce((sum, it) => {
      if (it.is_gift) return sum;
      let tot = it.price * it.qty;
      if (it.discount_type === 'percent') tot -= tot * (it.discount_value / 100);
      else if (it.discount_type === 'amount') tot -= it.discount_value;
      return sum + Math.max(0, tot);
    }, 0);
  };

  const cartCount = Object.values(cart).reduce((s, it) => s + it.qty, 0);

  const getTitle = () => {
    let prefix = '';
    if (saleMode === 'table' && table) prefix = 'Masa ' + table.code;
    else if (saleMode === 'self') prefix = 'Al-Götür';
    else if (saleMode === 'package' && pkgCust) prefix = 'Paket · ' + pkgCust.name;
    else prefix = 'POS';

    return isReadOnly ? `${prefix} (İnceleme)` : prefix;
  };

  const buildItems = () =>
    Object.entries(cart).map(([, it]) => ({
      product_id: it.id,
      quantity: it.qty,
      note: it.note || '',
      is_gift: !!it.is_gift,
      discount_type: it.discount_type || '',
      discount_value: parseFloat(String(it.discount_value)) || 0,
    }));

  const saveOrder = async (paymentMethodName?: string) => {
    if (isReadOnly) return;

    const items = buildItems();
    if (!items.length) { toast.error('Sepet boş'); return; }

    try {
      let d: any;
      if (saleMode === 'table') {
        d = await api('/mobile/order', {
          method: 'POST',
          body: { table_id: table?.id, items, order_id: currentOrderId },
        });
      } else if (saleMode === 'self') {
        d = await api('/mobile/order/self', {
          method: 'POST',
          body: { items, order_id: currentOrderId },
        });
      } else {
        d = await api('/mobile/order/package', {
          method: 'POST',
          body: { customer_id: pkgCust?.id, items, order_id: currentOrderId, payment_method_name: paymentMethodName },
        });
        if (d.ok && paymentMethodName && d.order) {
          await api('/mobile/order/action', {
            method: 'POST',
            body: { order_id: d.order.id, action: 'pay', method: paymentMethodName },
          });
        }
      }
      if (!d.ok) { toast.error(d.error || 'Hata'); return; }
      toast.success(currentOrderId ? 'Sipariş güncellendi!' : 'Sipariş kaydedildi!');
      clearCart();
      useStore.setState({ currentOrderId: null, isReadOnly: false });
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Hata');
    }
  };

  const handleSave = () => {
    if (isReadOnly) {
      clearCart();
      useStore.setState({ currentOrderId: null, isReadOnly: false });
      onClose();
      return;
    }

    if (saleMode === 'package' && !currentOrderId) {
      setShowPayment(true);
    } else {
      saveOrder();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f0f4f9] flex flex-col">
      {/* Header */}
      <div className="bg-[#0b1a33] text-white flex items-center justify-between px-4 pb-3 pt-safe flex-shrink-0">
        <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
          <ChevronLeft size={20} className="text-white" />
        </button>
        <div className="font-bold text-base flex items-center gap-2">
          {getTitle()}
          {isReadOnly && <Lock size={14} className="text-amber-400" />}
        </div>
        <button
          onClick={() => setShowCart(!showCart)}
          className="relative w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"
        >
          <ShoppingCart size={18} className="text-white" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs font-black flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Menü / Ürünler (Eğer Salt Okunur Değilse) */}
        {!showCart && !isReadOnly && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-white border-b border-slate-100 flex gap-2 px-3 py-2.5 overflow-x-auto flex-shrink-0">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                    activeCat === c.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div
              className="flex-1 overflow-y-auto p-3 grid grid-cols-3 sm:grid-cols-4 gap-2"
              style={{ paddingBottom: cartCount > 0 ? 'calc(env(safe-area-inset-bottom, 0px) + 90px)' : 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
            >
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart({ id: p.id, name: p.name, price: p.price })}
                  className="bg-white border border-slate-100 rounded-2xl p-3 text-center shadow-sm active:scale-95 transition-all"
                >
                  <div className="font-bold text-slate-800 text-xs leading-tight">{p.name}</div>
                  <div className="text-emerald-600 font-black text-sm mt-1.5">{money(p.price)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Adisyon / Sepet Görünümü */}
        {(showCart || isReadOnly) && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-blue-500" />
                <span className="font-black text-slate-800">Adisyon Ürünleri</span>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-lg font-bold text-slate-600">{cartCount} ürün</span>
              </div>
              
              {/* Salt Okunur Değilse Ürün Ekle Butonu Göster */}
              {!isReadOnly && (
                <button
                  onClick={() => setShowCart(false)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs active:scale-95 transition-transform"
                >
                  <Plus size={14} /> Yeni Ürün Ekle
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {Object.entries(cart).length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
                  <div className="font-bold">Adisyonda ürün bulunamadı</div>
                </div>
              ) : (
                Object.entries(cart).map(([id, it]) => (
                  <div
                    key={id}
                    className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-3"
                  >
                    <div className="flex-1 min-w-0" onClick={() => !isReadOnly && setEditItem({ id, item: it })}>
                      <div className="font-bold text-slate-800 text-sm truncate">{it.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {it.is_gift && <span className="text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-lg font-bold">🎁 İkram</span>}
                        {it.discount_value > 0 && <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-lg font-bold">🏷️ İndirim</span>}
                        {it.note && <span className="text-xs text-red-500 font-semibold truncate">📝 {it.note}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-600 text-sm">
                        {it.is_gift ? '0,00 ₺' : money(it.price * it.qty)}
                      </div>
                      <div className="text-xs text-slate-400">{it.qty}x {money(it.price)}</div>
                    </div>

                    {/* Salt okunur değilse düzenleme/silme ikonları */}
                    {!isReadOnly && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => setEditItem({ id, item: it })}
                          className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                        >
                          <Tag size={13} />
                        </button>
                        <button
                          onClick={() => removeFromCart(id)}
                          className="w-8 h-8 bg-red-100 text-red-600 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Total & Save/Close Bar */}
            <div className="px-4 pt-4 pb-safe-lg border-t border-slate-100 flex-shrink-0 bg-white">
              <div className="flex items-center justify-between mb-3">
                <span className="font-black text-slate-800 text-base">TOPLAM</span>
                <span className="font-black text-emerald-600 text-xl">{money(calcTotal())}</span>
              </div>
              
              {isReadOnly ? (
                <button
                  onClick={handleSave}
                  className="w-full py-4 bg-slate-800 text-white font-bold rounded-2xl text-base active:scale-95 transition-transform"
                >
                  Geriye Dön
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-2xl text-base shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
                >
                  {currentOrderId ? 'Siparişi Güncelle' : saleMode === 'package' ? 'Kaydet ve Ödeme Al' : 'Siparişi Kaydet'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {editItem && !isReadOnly && (
        <EditItemModal
          item={editItem.item}
          onSave={(updates) => {
            updateCartItem(editItem.id, updates);
            setEditItem(null);
          }}
          onDelete={() => {
            removeFromCart(editItem.id);
            setEditItem(null);
          }}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* Payment Picker */}
      {showPayment && (
        <PaymentPicker
          title="Kaydet ve Ödeme Al"
          onSelect={(method) => {
            setShowPayment(false);
            saveOrder(method);
          }}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}

function EditItemModal({ item, onSave, onDelete, onClose }: {
  item: CartItem;
  onSave: (u: Partial<CartItem>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(item.qty);
  const [note, setNote] = useState(item.note || '');
  const [isGift, setIsGift] = useState(item.is_gift);
  const [discType, setDiscType] = useState(item.discount_type || '');
  const [discVal, setDiscVal] = useState(item.discount_value || 0);

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-black text-slate-800">✏️ {item.name}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Miktar</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-10 bg-slate-100 rounded-xl font-black text-slate-700 flex items-center justify-center"
              >−</button>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center border border-slate-200 rounded-xl py-2 font-bold text-sm"
              />
              <button
                onClick={() => setQty(qty + 1)}
                className="w-10 h-10 bg-slate-100 rounded-xl font-black text-slate-700 flex items-center justify-center"
              >+</button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Ürün Notu</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Az acılı, buzsuz..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-12 h-6 rounded-full transition-colors ${isGift ? 'bg-emerald-500' : 'bg-slate-200'} relative`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isGift ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </div>
            <span className="font-bold text-sm">🎁 İkram Olarak İşaretle</span>
            <input type="checkbox" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} className="hidden" />
          </label>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">İndirim</label>
            <div className="flex gap-2">
              <select
                value={discType}
                onChange={(e) => setDiscType(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              >
                <option value="">Yok</option>
                <option value="percent">% Yüzde</option>
                <option value="amount">₺ Tutar</option>
              </select>
              {discType && (
                <input
                  type="number"
                  value={discVal}
                  onChange={(e) => setDiscVal(parseFloat(e.target.value) || 0)}
                  className="w-24 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  placeholder="0"
                />
              )}
            </div>
          </div>
        </div>

        <div className="px-5 pt-4 pb-safe border-t border-slate-100 flex gap-2">
          <button
            onClick={onDelete}
            className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center flex-shrink-0"
            title="Ürünü Adisyondan Sil"
          >
            <Trash2 size={16} />
          </button>
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl text-sm">
            Vazgeç
          </button>
          <button
            onClick={() => onSave({ qty, note, is_gift: isGift, discount_type: discType, discount_value: discVal })}
            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl text-sm"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}