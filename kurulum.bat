@echo off
echo [1/3] Paketler yukleniyor...
call npm install
if errorlevel 1 goto hata
echo [2/3] Android projesi olusturuluyor (birkac dakika surebilir)...
call npm run android:setup
if errorlevel 1 goto hata
echo [3/3] Android Studio aciliyor...
call npx cap open android
goto son
:hata
echo.
echo HATA olustu. Yukaridaki mesaji kontrol edin (Node.js kurulu mu? Internet var mi?)
:son
pause
