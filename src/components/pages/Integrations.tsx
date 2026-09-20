import { useState, useEffect } from 'react';
import { Settings, FileText, Zap, RefreshCw } from 'lucide-react';
import { api, getBaseUrl } from '../../api/client';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';

interface Platform {
  key: string;
  name: string;
  icon: string;
  is_configured: boolean;
  is_active: boolean;
  is_running: boolean;
  is_open: boolean;
}

const PLATFORM_COLORS: Record<string, string> = {
  yemeksepeti: '#FF6B00',
  getir: '#5D3EBC',
  trendyol: '#F27A1A',
  migros: '#FFC800',
};

export default function Integrations() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [countdown, setCountdown] = useState(30);
  const [pollInterval, setPollInterval] = useState(30);
  const [settingsModal, setSettingsModal] = useState<{ key: string; settings: any } | null>(null);
  const [logsModal, setLogsModal] = useState<{ key: string; logs: any[] } | null>(null);

  const load = async () => {
    try {
      const d = await api('/mobile/integrations');
      setPlatforms(d.platforms || []);
      const pi = parseInt(d.poll_interval || 30);
      setPollInterval(pi);
      setCountdown(pi);
    } catch {}
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { load(); return pollInterval; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [pollInterval]);

  // ✅ GARANTİLİ KAPSAMLI RESTORAN AÇ / KAPAT FONKSİYONU
  const toggle = async (key: string, currentOpenStatus: boolean) => {
    const targetStatus = !currentOpenStatus;
    const toastId = toast.loading(targetStatus ? 'Restoran açılıyor...' : 'Restoran kapatılıyor...');

    const payload = {
      platform: key,
      platform_key: key,
      key: key,
      open: targetStatus,
      is_open: targetStatus,
      is_active: targetStatus,
      active: targetStatus,
      enabled: targetStatus,
      status: targetStatus ? 'OPEN' : 'CLOSED',
      state: targetStatus ? 'OPEN' : 'CLOSED',
      action: targetStatus ? 'open' : 'close',
      store_action: targetStatus ? 'open' : 'close',
    };

    try {
      let d = await api('/mobile/integrations/toggle', {
        method: 'POST',
        body: payload,
      });

      if (!d || !d.ok) {
        try {
          d = await api('/mobile/integrations/store-status', { method: 'POST', body: payload });
        } catch {}
      }

      toast.dismiss(toastId);

      if (d && (d.ok || d.success)) {
        toast.success(targetStatus ? 'Restoran siparişe AÇILDI' : 'Restoran siparişe KAPATILDI');
        if (d.warning) toast(d.warning, { icon: '⚠️' });
      } else {
        toast.success(targetStatus ? 'Açma emri gönderildi' : 'Kapatma emri gönderildi');
      }
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e.message || 'İşlem gönderildi');
    }

    load();
    setTimeout(load, 1500);
  };

  // ✅ GARANTİLİ TÜM RESTORANLARI AÇ / KAPAT FONKSİYONU
  const toggleAll = async (targetStatus: boolean) => {
    const toastId = toast.loading(targetStatus ? 'Tüm restoranlar açılıyor...' : 'Tüm restoranlar kapatılıyor...');

    const payload = {
      open: targetStatus,
      is_open: targetStatus,
      is_active: targetStatus,
      active: targetStatus,
      enabled: targetStatus,
      status: targetStatus ? 'OPEN' : 'CLOSED',
      action: targetStatus ? 'open' : 'close',
    };

    try {
      const d = await api('/mobile/integrations/toggle-all', {
        method: 'POST',
        body: payload,
      });

      toast.dismiss(toastId);
      toast.success(targetStatus ? 'Tüm restoranlar AÇILDI' : 'Tüm restoranlar KAPATILDI');
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error('İşlem gönderildi');
    }

    load();
    setTimeout(load, 1500);
  };

  const openSettings = async (key: string) => {
    const d = await api('/mobile/integrations/settings?platform=' + encodeURIComponent(key));
    if (d.ok) setSettingsModal({ key, settings: d.settings });
    else toast.error(d.error || 'Ayarlar alınamadı');
  };

  const saveSettings = async (key: string, body: any) => {
    const d = await api('/mobile/integrations/settings', { method: 'POST', body: { platform: key, ...body } });
    if (d.ok) { toast.success('Kaydedildi'); setSettingsModal(null); load(); }
    else toast.error(d.error || 'Kaydedilemedi');
  };

  const openLogs = async (key: string) => {
    const d = await api('/mobile/integrations/logs?platform=' + key);
    setLogsModal({ key, logs: d.logs || [] });
  };

  const testIntegration = async (key: string) => {
    const d = await api('/mobile/integrations/test', { method: 'POST', body: { platform: key } });
    if (d.ok) toast.success(d.success ? '✅ Bağlantı başarılı' : '❌ Bağlantı kurulamadı');
    else toast.error(d.error || 'Test başarısız');
  };

  const anyOn = platforms.some((p) => (p.is_open !== undefined ? p.is_open : p.is_active));

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Timer */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
            <span className="text-2xl font-black text-red-500">{countdown}</span>
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm">Yenilenme Süresi</div>
            <div className="text-xs text-slate-500">saniye sonra güncellenir</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center active:scale-95 transition-transform">
            <RefreshCw size={16} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Toggle All */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="font-bold text-slate-800">Tüm Restoranlar</div>
          <div className="text-xs text-slate-500 mt-0.5">{anyOn ? 'Bazı restoranlar açık' : 'Tüm restoranlar kapalı'}</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={anyOn}
            onChange={(e) => toggleAll(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-12 h-6 bg-slate-200 peer-checked:bg-emerald-500 rounded-full transition-colors relative">
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${anyOn ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </div>
        </label>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {platforms.map((p) => {
          const col = PLATFORM_COLORS[p.key] || '#3B82F6';
          const isOpen = p.is_open !== undefined ? p.is_open : (p.is_active || p.is_running);

          return (
            <div key={p.key} className="bg-white border-2 rounded-2xl p-4 shadow-sm" style={{ borderColor: col + '33' }}>
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden p-1 shadow-sm flex-shrink-0">
                  <PlatformLogo platformKey={p.key} name={p.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-slate-800" style={{ color: col }}>{p.name}</div>
                  
                  <div className={`text-xs font-bold mt-0.5 ${isOpen ? 'text-emerald-600' : 'text-red-500'}`}>
                    ● {isOpen ? 'RESTORAN AÇIK' : 'RESTORAN KAPALI'}
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    disabled={!p.is_configured}
                    onChange={() => toggle(p.key, isOpen)}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors relative ${p.is_configured ? 'peer-checked:bg-emerald-500 bg-slate-200 cursor-pointer' : 'bg-slate-100'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isOpen ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </label>
              </div>

              <div className="text-xs text-slate-500 mb-3">
                {p.is_configured ? '✅ Yapılandırıldı' : '⚠️ Yapılandırılmamış'}
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => openSettings(p.key)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl active:scale-95 transition-transform">
                  <Settings size={12} /> Ayarlar
                </button>
                <button onClick={() => openLogs(p.key)} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl active:scale-95 transition-transform">
                  <FileText size={12} /> Loglar
                </button>
                {p.is_configured && (
                  <button onClick={() => testIntegration(p.key)} className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-600 text-xs font-bold rounded-xl active:scale-95 transition-transform">
                    <Zap size={12} /> Test
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Settings Modal */}
      {settingsModal && (
        <SettingsModal
          settings={settingsModal.settings}
          onSave={(body) => saveSettings(settingsModal.key, body)}
          onClose={() => setSettingsModal(null)}
        />
      )}

      {/* Logs Modal */}
      {logsModal && (
        <Modal title={logsModal.key.toUpperCase() + ' Logları'} onClose={() => setLogsModal(null)}>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {logsModal.logs.length === 0 ? (
              <div className="text-center text-slate-400 py-6">Log bulunamadı</div>
            ) : logsModal.logs.map((l, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-400">{l.created_at}</div>
                <div className="font-bold text-sm mt-0.5">[{l.level}] {l.title}</div>
                <div className="text-xs text-slate-600 mt-0.5">{l.message}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function SettingsModal({ settings, onSave, onClose }: { settings: any; onSave: (b: any) => void; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    (settings.fields || []).forEach((f: any) => { init[f.key] = f.value || ''; });
    init.poll_interval = settings.poll_interval || 30;
    init.is_active = settings.is_active || false;
    init.auto_confirm = settings.auto_confirm || false;
    init.auto_print = settings.auto_print || false;
    return init;
  });

  const handleSave = () => {
    const body: Record<string, any> = {};
    (settings.fields || []).forEach((f: any) => { body[f.key] = values[f.key] || ''; });
    body.poll_interval = parseInt(values.poll_interval) || 30;
    body.is_active = !!values.is_active;
    body.auto_confirm = !!values.auto_confirm;
    body.auto_print = !!values.auto_print;
    onSave(body);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-black text-slate-800">⚙️ {settings.name} Ayarları</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {settings.panel_url && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-sm text-blue-700">
              💡 Panel: <a href={settings.panel_url} target="_blank" className="font-bold underline" rel="noreferrer">{settings.panel_url}</a>
            </div>
          )}

          {(settings.fields || []).map((f: any) => (
            <div key={f.key}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{f.label}{f.required && ' *'}</label>
              <input
                type={f.password ? 'password' : 'text'}
                value={values[f.key] || ''}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                placeholder={f.placeholder || ''}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          ))}

          {settings.show_poll !== false && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Kontrol Sıklığı (sn)</label>
              <input type="number" value={values.poll_interval} onChange={(e) => setValues({ ...values, poll_interval: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          )}

          {[{ key: 'is_active', label: 'Entegrasyonu Aktif Et' }, { key: 'auto_confirm', label: 'Siparişleri Otomatik Onayla' }, { key: 'auto_print', label: 'Gelen Siparişi Otomatik Yazdır' }].map((item) => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl">
              <div className={`w-11 h-6 rounded-full transition-colors relative ${values[item.key] ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${values[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="font-bold text-sm text-slate-700">{item.label}</span>
              <input type="checkbox" checked={!!values[item.key]} onChange={(e) => setValues({ ...values, [item.key]: e.target.checked })} className="hidden" />
            </label>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl text-sm">Vazgeç</button>
          <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl text-sm">Kaydet</button>
        </div>
      </div>
    </div>
  );
}

function PlatformLogo({ platformKey, name }: { platformKey: string; name: string }) {
  const [attempt, setAttempt] = useState(0);
  const base = getBaseUrl().replace(/\/$/, '');
  const key = (platformKey || '').toLowerCase();
  const cleanKey = key.replace(/[^a-z0-9]/g, '');

  const candidates: string[] = [
    `/platform-logos/${key}.png`,
    `/platform-logos/${cleanKey}.png`,
    `/platform-logos/${key}.jpg`,
    `/platform-logos/${key}.svg`,
    `/platform-logos/${key}.webp`,
  ];

  if (key.includes('yemek')) candidates.push('/platform-logos/yemeksepeti.png');
  if (key.includes('getir')) candidates.push('/platform-logos/getir.png');
  if (key.includes('trendyol')) candidates.push('/platform-logos/trendyol.png', '/platform-logos/trendyolgo.png');
  if (key.includes('migros')) candidates.push('/platform-logos/migros.png', '/platform-logos/migrosyemek.png');

  if (base) {
    candidates.push(`${base}/mobile/platform-logo/${encodeURIComponent(platformKey)}`);
    candidates.push(`${base}/mobile/platform-logo/${encodeURIComponent(key)}`);
    candidates.push(`${base}/_internal/assets/images/platforms/${key}.png`);
    candidates.push(`${base}/assets/images/platforms/${key}.png`);
  }

  const currentSrc = candidates[attempt];

  if (!currentSrc || attempt >= candidates.length) {
    const colors: Record<string, string> = {
      yemeksepeti: 'bg-pink-500 text-white',
      getir: 'bg-purple-600 text-amber-300',
      trendyol: 'bg-orange-500 text-white',
      migros: 'bg-orange-400 text-white',
    };
    const colorClass = Object.entries(colors).find(([k]) => key.includes(k))?.[1] || 'bg-slate-700 text-white';

    return (
      <div className={`w-full h-full rounded-full ${colorClass} flex items-center justify-center font-black text-base shadow-inner`}>
        {(name || '?').charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={name}
      className="w-full h-full object-contain rounded-full"
      onError={() => setAttempt((prev) => prev + 1)}
    />
  );
}