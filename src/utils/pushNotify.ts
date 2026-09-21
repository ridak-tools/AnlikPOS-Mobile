import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export async function initPushNotifications(): Promise<void> {
  // ✅ Sadece Android'de çalıştır (iOS Sideloading çökmesini engeller)
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return;
  }

  try {
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      await PushNotifications.requestPermissions();
    }
    await PushNotifications.register();
    await PushNotifications.removeAllListeners();
  } catch (e) {
    console.warn('PushNotification init hatası', e);
  }
}