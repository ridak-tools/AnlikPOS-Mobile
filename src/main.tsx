import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// PWA Service Worker Kaydı (iOS Kilitli Ekran Bildirimi İçin)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(
      (reg) => console.log("ServiceWorker Aktif:", reg.scope),
      (err) => console.log("ServiceWorker Hatası:", err)
    );
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);