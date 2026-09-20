import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { api } from '../api/client';
import { useStore } from '../store/useStore';

export async function initPushNotifications() {
  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Push bildirim izni verilmedi');
      return;
    }

    // Android Sesli Bildirim Kanalı
    await PushNotifications.createChannel({
      id: 'order_channel_loud_v2',
      name: 'Yeni Sipariş Uyarıları',
      description: 'Yeni sipariş geldiğinde yüksek sesle uyarır',
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: 'default'
    });

    await PushNotifications.register();

    // Firebase'den Token Alındığında Sunucuya Kaydet
    await PushNotifications.addListener('registration', async (token: Token) => {
      try {
        await api('/mobile/save-fcm-token', {
          method: 'POST',
          body: { token: token.value, platform: 'android' }
        });
      } catch (e) {
        // Sunucu 404 verse bile uygulama çökmeyecek
      }
    });

    // Bildirime Tıklanınca Sipariş Sayfasına Git
    await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      useStore.getState().setPage('pos');
      useStore.getState().setPosTab('package');
    });

  } catch (e) {
    console.error('Push bildirim başlatma hatası:', e);
  }
}