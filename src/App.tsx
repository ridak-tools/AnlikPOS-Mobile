import { useCallback, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import { api } from './api/client';
import { initOrderNotifications } from './utils/orderNotify';
import { initPushNotifications } from './utils/pushNotify';

import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/pages/Dashboard';
import POS from './components/pages/POS';
import Calls from './components/pages/Calls';
import Customers from './components/pages/Customers';
import Integrations from './components/pages/Integrations';
import Reports from './components/pages/Reports';
import { Products, Categories, Users, Printers, TablesDef, Menus } from './components/pages/SimplePages';

export default function App() {
  const { token, user, currentPage, setUser, logout } = useStore();
  const [refreshKey, setRefreshKey] = useState(0);

  // Lokal Bildirim sistemini başlat
  useEffect(() => {
    initOrderNotifications();
  }, []);

  // Auto-verify token on mount
  const verifyToken = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api('/mobile/me');
      if (d.ok) {
        setUser(d.user);
      } else {
        logout();
      }
    } catch {
      // Tünel kapalıysa api client otomatik logout yaptırır
    }
  }, [token, setUser, logout]);

  useEffect(() => {
    if (token && !user) {
      verifyToken();
    }
  }, [token, user, verifyToken]);

  const isLoggedIn = !!(token && user);

  // Firebase Push Notification sistemini başlat
  useEffect(() => {
    if (isLoggedIn) {
      initPushNotifications();
    }
  }, [isLoggedIn]);

  // Periyodik Tünel Kontrolü (Ekrandayken tünel koptuğunda 10sn içinde otomatik çıkış yapar)
  useEffect(() => {
    if (!isLoggedIn) return;

    const checkTunnelHealth = async () => {
      try {
        const d = await api('/mobile/ping');
        if (!d || !d.ok) {
          logout();
        }
      } catch {
        // api() fonsiyonu tünel kapalıysa otomatik logout() tetiği verir
      }
    };

    const interval = setInterval(checkTunnelHealth, 10000); // 10 saniyede bir denetle
    return () => clearInterval(interval);
  }, [isLoggedIn, logout]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '16px',
            fontWeight: 600,
            fontSize: '14px',
          },
          duration: 3000,
        }}
      />

      {!isLoggedIn ? (
        <Login />
      ) : (
        <Layout onRefresh={handleRefresh}>
          <PageRenderer key={refreshKey} page={currentPage} />
        </Layout>
      )}
    </>
  );
}

function PageRenderer({ page }: { page: string }) {
  switch (page) {
    case 'dash': return <Dashboard />;
    case 'pos': return <POS />;
    case 'calls': return <Calls />;
    case 'customers': return <Customers />;
    case 'integrations': return <Integrations />;
    case 'products': return <Products />;
    case 'menus': return <Menus />;
    case 'categories': return <Categories />;
    case 'tablesDef': return <TablesDef />;
    case 'users': return <Users />;
    case 'printers': return <Printers />;
    case 'reports': return <Reports />;
    default: return <Dashboard />;
  }
}