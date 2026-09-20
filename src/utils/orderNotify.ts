import { LocalNotifications } from '@capacitor/local-notifications';

// Daha önce görülmüş sipariş ID'lerini hafızada tutar
const seenOrderIds = new Set<number>();

// Uygulama ekranda açıkken çalacak dükkan içi bip sesi (Ding-Dong)
function playWebBeep() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const now = ctx.currentTime;
    
    // 1. Ton
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // 2. Ton
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.25);
    gain2.gain.setValueAtTime(0.3, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 0.5);
  } catch (e) {
    console.error('Web audio çalınamadı:', e);
  }
}

export async function initOrderNotifications() {
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  } catch (e) {
    console.warn('LocalNotifications başlatılamadı:', e);
  }
}

export function markOrdersSeen(orders: any[]) {
  orders.forEach((o) => {
    if (o?.id != null) {
      seenOrderIds.add(Number(o.id));
    }
  });
}

// Yeni siparişleri kontrol eder (Çift bildirimi önlemek için lokal bildirimi kaldırdık, sadece ses ve UI günceller)
export async function notifyNewOrders(orders: any[]) {
  const newOrders = orders.filter((o) => o?.id != null && !seenOrderIds.has(Number(o.id)));

  if (newOrders.length === 0) return;

  // Görüldü olarak işaretle
  newOrders.forEach((o) => seenOrderIds.add(Number(o.id)));

  // Uygulama ekranda açıksa anlık dükkan içi bip sesi ver
  playWebBeep();
}