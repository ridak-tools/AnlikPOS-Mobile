import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

export function getBaseUrl(): string {
  return useStore.getState().baseUrl || '';
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any } = {}
): Promise<T> {
  const { token, baseUrl, logout } = useStore.getState();
  const url = (baseUrl || '') + path;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['X-Token'] = token;
  }

  const conf: RequestInit = {
    method: opts.method || 'GET',
    headers,
  };

  if (opts.body !== undefined) {
    conf.body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(url, conf);
  } catch {
    // Tünel / internet koptu
    if (token) {
      toast.error('Sunucu / Tünel bağlantısı koptu! Giriş ekranına yönlendiriliyorsunuz.', {
        id: 'tunnel-down-toast',
        duration: 2500,
      });
      logout();
    }
    throw new Error('Sunucuya ulaşılamıyor (Tünel kapalı)');
  }

  // Oturum geçersiz veya tünel/proxy çökmüş
  if (res.status === 401 || res.status === 502 || res.status === 503 || res.status === 504) {
    if (token) {
      const msg =
        res.status === 401
          ? 'Oturum süresi doldu'
          : 'Tünel / Sunucu bağlantısı kesildi';
      toast.error(`${msg}! Giriş ekranına yönlendiriliyorsunuz.`, {
        id: 'tunnel-down-toast',
        duration: 2500,
      });
      logout();
    }
    throw new Error('Bağlantı kesildi');
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    if (token) {
      toast.error('Sunucu yanıt vermedi! Giriş ekranına yönlendiriliyorsunuz.', {
        id: 'tunnel-down-toast',
        duration: 2500,
      });
      logout();
    }
    throw new Error(`Sunucu hatası (${res.status})`);
  }

  return data as T;
}

export function money(v: number | string | null | undefined): string {
  const n = Number(v) || 0;
  return n.toFixed(2).replace('.', ',') + ' ₺';
}