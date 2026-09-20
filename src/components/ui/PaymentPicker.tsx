import { useEffect, useState } from 'react';
import { X, CreditCard, Banknote, Building2, QrCode, Gift, Wallet, Utensils } from 'lucide-react';
import { api } from '../../api/client';

interface Method {
  id: number;
  name: string;
}

interface PaymentPickerProps {
  onSelect: (method: string) => void;
  onClose: () => void;
  title?: string;
}

export default function PaymentPicker({ onSelect, onClose, title = 'Ödeme Tipleri' }: PaymentPickerProps) {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/mobile/payment-methods')
      .then((d) => {
        setMethods(d.methods || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
          <h2 className="font-black text-slate-800 text-base">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-safe-lg">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onSelect(m.name)}
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 hover:bg-blue-50 border-2 border-slate-100 hover:border-blue-200 rounded-2xl transition-all active:scale-95 shadow-sm min-h-[90px]"
                >
                  <PaymentIcon name={m.name} />
                  <span className="font-bold text-slate-800 text-xs text-center leading-tight">
                    {m.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// Şık ve Asla Bozulmayan Vektörel İkonlar
function PaymentIcon({ name }: { name: string }) {
  const n = name.toLowerCase();

  if (n.includes('nakit')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
        <Banknote size={22} />
      </div>
    );
  }
  if (n.includes('kredi') || n.includes('kart') || n.includes('banka')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
        <CreditCard size={22} />
      </div>
    );
  }
  if (n.includes('cari')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
        <Building2 size={22} />
      </div>
    );
  }
  if (n.includes('qr')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
        <QrCode size={22} />
      </div>
    );
  }
  if (n.includes('hediye')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
        <Gift size={22} />
      </div>
    );
  }
  if (
    n.includes('ticket') || n.includes('sodexo') || n.includes('multinet') ||
    n.includes('setcard') || n.includes('metropol') || n.includes('edenred') || n.includes('yemek')
  ) {
    return (
      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
        <Utensils size={20} />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center">
      <Wallet size={20} />
    </div>
  );
}