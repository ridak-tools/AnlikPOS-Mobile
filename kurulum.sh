#!/usr/bin/env bash
set -e
echo "[1/3] Paketler yukleniyor..."
npm install
echo "[2/3] Android projesi olusturuluyor (birkac dakika surebilir)..."
npm run android:setup
echo "[3/3] Android Studio aciliyor..."
npx cap open android
