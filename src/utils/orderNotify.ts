import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const SEEN_KEY = 'anlikpos-notified-order-ids';

function loadSeen(): Set<number> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function saveSeen(ids: Set<number>) {
  try {
    const arr = Array.from(ids).slice(-500);
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {}
}

let seen = loadSeen();
let ready = false;

function playiOSAlarmSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.8, now);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, now + 0.25);
    gain2.gain.setValueAtTime(0.8, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 0.5);
  } catch (e) {
    console.warn('iOS Ses Hatası:', e);
  }
}

export function markOrderIdNotified(orderId: number): void {
  if (!orderId) return;
  seen.add(Number(orderId));
  saveSeen(seen);
}

export async function initOrderNotifications(): Promise<void> {
  // PWA Tarayıcı Bildirim İzni İsteme (iOS PWA)
  if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    try {
      await Notification.requestPermission();
    } catch {}
  }

  if (!Capacitor.isNativePlatform()) {
    ready = true;
    return;
  }
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display === 'granted') {
      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
          id: 'orders',
          name: 'Sipariş Bildirimleri',
          description: 'Yeni paket ve online siparişler',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
        });
      }
      ready = true;
    }
  } catch (e) {
    console.warn('Bildirim izni hatası', e);
    ready = true;
  }
}

function sourceLabel(o: any): string {
  const s = (o.source_name || o.platform || o.sale_type || '').toString();
  const low = s.toLowerCase();
  if (low.includes('yemek') || low.includes('ys')) return 'Yemeksepeti';
  if (low.includes('getir')) return 'Getir';
  if (low.includes('trendyol')) return 'Trendyol GO';
  if (low.includes('migros')) return 'Migros Yemek';
  if (o.sale_type === 'PACKAGE') return 'Paket Servis';
  if (o.sale_type === 'SELF') return 'Al-Götür';
  if (o.sale_type === 'TABLE') return 'Masa';
  return s || 'Yeni Sipariş';
}

export async function notifyNewOrders(orders: any[]): Promise<void> {
  if (!orders?.length) return;

  const fresh = orders.filter((o) => o?.id != null && !seen.has(Number(o.id)));
  if (!fresh.length) return;

  for (const o of fresh) {
    seen.add(Number(o.id));
    const src = sourceLabel(o);
    const title = `🔔 ${src}'den Sipariş Var!`;
    const body = [
      o.order_no ? `#${o.order_no}` : null,
      o.customer_name || null,
      o.grand_total != null ? `${Number(o.grand_total).toFixed(2)} ₺` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    playiOSAlarmSound();

    // 1. PWA / Service Worker Kilitli Ekran Bildirimi (iOS 16.4+)
    if ("serviceWorker" in navigator && "Notification" in window && Notification.permission === "granted") {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          reg.showNotification(title, {
            body: body || 'Sipariş detayları için tıklayın.',
            icon: '/payment-icons/logo.png',
            badge: '/payment-icons/logo.png',
            vibrate: [200, 100, 200, 100, 200],
            data: { orderId: o.id },
            tag: 'order-' + o.id,
          });
        }
      } catch (e) {
        console.warn('PWA Bildirim Hatası:', e);
      }
    }

    // 2. Native Capacitor Bildirimi
    if (Capacitor.isNativePlatform() && ready) {
      try {
        const id = (Number(o.id) % 100000) + Math.floor(Math.random() * 1000);
        const notifObj: any = {
          id,
          title,
          body: body || 'Yeni sipariş detayları için tıklayın.',
          sound: 'default',
          extra: { orderId: o.id },
        };
        if (Capacitor.getPlatform() === 'android') {
          notifObj.channelId = 'orders';
        }
        await LocalNotifications.schedule({
          notifications: [notifObj],
        });
      } catch (e) {
        console.warn('LocalNotification hata', e);
      }
    }

    // 3. Ekran İçi Toast
    try {
      const { default: toast } = await import('react-hot-toast');
      toast(title + (body ? `\n${body}` : ''), {
        duration: 6000,
        position: 'top-center',
        icon: '🚨',
        style: {
          background: '#0b1a33',
          color: '#fff',
          borderRadius: '16px',
          fontWeight: 800,
          fontSize: '15px',
          padding: '14px 18px',
          maxWidth: '92vw',
          boxShadow: '0 14px 40px rgba(0,0,0,.45)',
          border: '1px solid #38bdf8',
        },
      });
    } catch {}
  }

  saveSeen(seen);
}

export function markOrdersSeen(orders: any[]): void {
  orders?.forEach((o) => {
    if (o?.id != null) seen.add(Number(o.id));
  });
  saveSeen(seen);
}