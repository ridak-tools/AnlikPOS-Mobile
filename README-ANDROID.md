# AnlıkPOS Mobil → APK (GitHub Actions ile)

Bilgisayarında Android Studio kurmadan, GitHub kendi sunucusunda APK üretir.

## 1. GitHub'a yükle
Yeni bir repo oluştur (boş), sonra proje klasöründe:
```
git init
git add .
git commit -m "ilk surum"
git branch -M main
git remote add origin https://github.com/KULLANICI/REPO.git
git push -u origin main
```
> Web arayüzünden "Upload files" ile yüklüyorsan `.github` klasörünün yüklendiğinden emin ol
> (noktayla başlayan klasörler bazen atlanır). Yoksa GitHub'da **Add file → Create new file**
> ile `.github/workflows/android-apk.yml` yolunu yazıp dosyanın içeriğini yapıştır.

## 2. APK'yı indir
- Push yapınca **Actions** sekmesinde "Android APK" çalışır (ilk seferde ~5-10 dk).
- Bitince çalışmaya tıkla → en altta **Artifacts → AnlikPOS-debug-apk** → indir, zip'ten `app-debug.apk` çıkar.
- Elle başlatmak için: Actions → Android APK → **Run workflow**.
- Etiket atarsan (`git tag v1.0 && git push origin v1.0`) APK ayrıca **Releases** sayfasına
  eklenir. Telefondan direkt indirmek için en kolayı budur.

## 3. Telefona kur
APK'yı telefona at, aç. "Bilinmeyen kaynaklardan yükleme" izni isteyebilir, onay ver.
Bu **debug** APK'dır, test için uygundur. Play Store için imzalı release (AAB) gerekir,
gerektiğinde workflow'a keystore'lu release adımı ekleyebiliriz.

## Hata olursa
Actions'ta kırmızı çalışmaya tıkla, hata veren adımın logunu kopyalayıp gönder.

---

# Alternatif: Android Studio ile yerelde (isteğe bağlı)

## Gereksinimler
- **Node.js 22 LTS** veya üstü (https://nodejs.org). Kontrol: `node -v`
- **Android Studio** (kendi JDK ve SDK'sı ile gelir)
- İlk kurulumda internet (paketler ve Gradle bağımlılıkları iner)

## İlk kurulum (bir kez)
- **Windows:** `kurulum.bat` dosyasına çift tıkla
- **macOS / Linux:** `bash kurulum.sh`

Bu betik sırayla şunları yapar: `npm install` → Capacitor paketlerini kurar →
web uygulamasını derler (`dist/`) → `android/` klasörünü oluşturur → Android Studio'yu açar.

Elle yapmak istersen:
```
npm install
npm run android:setup
npm run android:open
```
Android Studio ilk açılışta Gradle senkronizasyonu yapar (birkaç dakika sürebilir).

> `android:setup` sadece **bir kez** çalıştırılır. `android/` klasörü varsa tekrar çalıştırma.

## Telefonda / emülatörde çalıştırma
Android Studio'da üstten cihazı seç (emülatör veya USB ile bağlı telefon,
telefonda "USB hata ayıklama" açık olmalı) ve ▶ **Run**'a bas.

## Kodu değiştirdikten sonra
```
npm run android:sync
```
Sonra Android Studio'da tekrar Run.

## APK / Play Store
Android Studio → **Build > Generate Signed App Bundle / APK**.
- Keystore dosyasını ve şifresini mutlaka yedekle, kaybedersen güncelleme yayınlayamazsın.
- Uygulama kimliği (`appId`) `capacitor.config.json` içinde: `com.anlikpos.mobile`.
  Play Store'a yüklendikten sonra değiştirilemez. Kendi paket adını kullanacaksan
  **`android:setup` çalıştırmadan önce** değiştir.

## Ağ notları
- `CapacitorHttp` açık: API istekleri native yapılır, sunucuda CORS ayarı gerekmez.
- Tünel (https) adresleri sorunsuz çalışır. Cloudflare quick tunnel adresi her yeniden
  başlatmada değişir, uygulamada giriş ekranından yenisini girmen gerekir.
- Yerel ağdaki `http://192.168...` adresi için `android/app/src/main/AndroidManifest.xml`
  içindeki `<application ...>` etiketine `android:usesCleartextTraffic="true"` ekle
  (sadece yerel test için öneririm).

## İlk çalıştırmada kontrol edilecekler
- Android 15+ cihazlarda üst durum çubuğu başlığın üstüne binebilir (safe-area).
- Geri tuşu, uygulamada sayfa yönlendirmesi olmadığı için doğrudan uygulamadan çıkarır.
Bunlar görülürse ekran görüntüsüyle bildir, düzeltiriz.
