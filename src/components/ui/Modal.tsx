import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  confirmClass?: string;
}

export default function Modal({
  title,
  children,
  onClose,
  onConfirm,
  confirmText = 'Tamam',
  confirmClass = 'bg-blue-600'
}: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-black text-slate-800 text-base">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-y-auto p-5 space-y-3 ${!onConfirm ? 'pb-safe-lg' : ''}`}>
          {children}
        </div>

        {/* Footer - ✅ Alt Navigasyon Tuşları Koruması (pb-safe-lg) */}
        {onConfirm && (
          <div className="px-5 pt-4 pb-safe-lg border-t border-slate-100 flex gap-3 flex-shrink-0 bg-white">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl text-sm active:scale-95 transition-transform"
            >
              Vazgeç
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3 text-white font-bold rounded-2xl text-sm active:scale-95 transition-transform ${confirmClass}`}
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}